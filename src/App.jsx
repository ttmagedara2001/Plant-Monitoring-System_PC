import React, { useEffect, useState, useRef, useCallback } from 'react';
import ErrorBoundary from './Components/ErrorBoundary';
import Header from './Components/Header';
import StatusBar from './Components/StatusBar';
import Dashboard from './Components/Dashboard';
import DeviceSettingsPage from './Components/DeviceSettingsPage';
import { useAuth } from './Context/AuthContext';
import { webSocketClient } from './Service/webSocketClient';
import { updatePumpStatus } from './Service/deviceService';
import { useNotifications } from './Context/NotificationContext';

function App() {
  // Use isAuthenticated instead of jwtToken for cookie-based auth
  const { isAuthenticated, isLoading } = useAuth();
  const { addNotification } = useNotifications();

  // SPA navigation state
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });

  // Use VITE_DEVICE_ID from .env or fallback to hardcoded default
  // IMPORTANT: Device IDs are case-sensitive in WebSocket topics, so normalize to lowercase
  const defaultDevice = (import.meta.env.VITE_DEVICE_ID);

  // Clear localStorage cache if stored device differs from env
  const storedDevice = localStorage.getItem('selectedDevice');
  if (storedDevice && defaultDevice && storedDevice !== defaultDevice) {
    console.log(`🔄 Device ID changed: ${storedDevice} → ${defaultDevice}, clearing cache`);
    localStorage.removeItem('selectedDevice');
  }

  const [selectedDevice, setSelectedDevice] = useState(() => {
    const stored = localStorage.getItem('selectedDevice');
    return stored || defaultDevice;
  });

  // Live data and connection state lifted to App so monitoring continues while navigating
  const [liveData, setLiveData] = useState({
    moisture: 0,
    temperature: 0,
    humidity: 0,
    light: 0,
    battery: 0,
    pumpStatus: 'OFF',
    pumpMode: 'manual',
  });
  const [isConnected, setIsConnected] = useState(false);

  const [settings, setSettings] = useState(() => {
    // load settings for initial selected device
    try {
      const raw = localStorage.getItem(`settings_${selectedDevice}`);
      return raw
        ? JSON.parse(raw)
        : {
          moistureMin: '20',
          moistureMax: '70',
          tempMin: '10',
          tempMax: '35',
          humidityMin: '30',
          humidityMax: '80',
          lightMin: '200',
          lightMax: '1000',
          batteryMin: '20',
          autoMode: false,
        };
    } catch (e) {
      return {
        moistureMin: '20',
        moistureMax: '70',
        tempMin: '10',
        tempMax: '35',
        humidityMin: '30',
        humidityMax: '80',
        lightMin: '200',
        lightMax: '1000',
        batteryMin: '20',
        autoMode: false,
      };
    }
  });

  useEffect(() => {
    // Broadcast latest live data globally so other components can subscribe
    try {
      window.__latestLiveData = liveData;
      window.dispatchEvent(new CustomEvent('live:update', { detail: liveData }));
    } catch (e) {
      // ignore
    }
  }, [liveData]);

  // Watch for critical sensor transitions to emit notifications
  // Only critical sensor states trigger notifications (pump status changes are not notified)
  const _prevLive = React.useRef(null);
  React.useEffect(() => {
    try {
      const prev = _prevLive.current || {};
      const curr = liveData || {};

      // load thresholds from persisted settings for selected device if present
      let persisted = null;
      try {
        const raw = localStorage.getItem(`settings_${selectedDevice}`);
        if (raw) persisted = JSON.parse(raw).thresholds || null;
      } catch (e) { }

      const sensors = ['moisture', 'temperature', 'humidity', 'light', 'battery'];
      const isCritical = (key, value) => {
        if (value === undefined || value === null || String(value) === 'unknown') return false; // Don't treat missing as critical for notifications
        const num = Number(value);
        if (Number.isNaN(num)) return false;
        const group = (persisted && persisted[key]) || null;
        const min = group && typeof group.min !== 'undefined' ? Number(group.min) : undefined;
        const max = group && typeof group.max !== 'undefined' ? Number(group.max) : undefined;
        if (typeof min !== 'undefined' && !Number.isNaN(min) && num < min) return true;
        if (typeof max !== 'undefined' && !Number.isNaN(max) && num > max) return true;
        return false;
      };

      sensors.forEach((s) => {
        const prevCritical = isCritical(s, prev[s]);
        const currCritical = isCritical(s, curr[s]);
        // Only notify when transitioning INTO critical state (not during first load)
        if (!prevCritical && currCritical && _prevLive.current !== null) {
          try {
            addNotification({
              type: 'critical',
              message: `⚠️ Critical: ${s.charAt(0).toUpperCase() + s.slice(1)} = ${curr[s]}`,
              timestamp: new Date().toISOString(),
              meta: { deviceId: selectedDevice, sensor: s, value: curr[s] }
            });
          } catch (e) { }
        }
      });

      // Pump status changes are NOT notified (removed per user request)
    } catch (e) {
      // ignore
    } finally {
      _prevLive.current = liveData;
    }
  }, [liveData, selectedDevice, addNotification, settings]);


  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);



  // Reload settings when selected device changes or on external update
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`settings_${selectedDevice}`);
      if (raw) setSettings(JSON.parse(raw));
      else
        setSettings({
          moistureMin: '20',
          moistureMax: '70',
          tempMin: '10',
          tempMax: '35',
          humidityMin: '30',
          humidityMax: '80',
          lightMin: '200',
          lightMax: '1000',
          batteryMin: '20',
          autoMode: false,
        });
    } catch (e) {
      console.warn('[App] Failed to load settings', e);
    }
  }, [selectedDevice]);

  // Listen for settings saved from DeviceSettingsPage
  useEffect(() => {
    const onSettingsUpdated = (e) => {
      try {
        const updatedDevice = e?.detail?.deviceId;
        if (!updatedDevice) return;
        if (updatedDevice !== selectedDevice) return;
        const raw = localStorage.getItem(`settings_${selectedDevice}`);
        if (raw) setSettings(JSON.parse(raw));
      } catch (err) {
        console.error('[App] onSettingsUpdated', err);
      }
    };
    window.addEventListener('settings:updated', onSettingsUpdated);
    return () => window.removeEventListener('settings:updated', onSettingsUpdated);
  }, [selectedDevice]);

  // Automation: when autoMode is enabled in settings, control pump based on moisture
  const _lastAuto = useRef({ cmd: null, ts: 0 });
  useEffect(() => {
    try {
      if (!settings || !settings.autoMode) return;
      const raw = liveData?.moisture;
      if (raw === undefined || raw === null) return;
      const val = Number(raw);
      if (!isFinite(val)) return;

      // derive min from settings with fallback
      let min = parseFloat(settings.moistureMin);
      if (isNaN(min)) min = 20;

      // Decide desired pump state: ON when moisture <= min (warning/critical), OFF otherwise
      const desired = val <= min ? 'ON' : 'OFF';

      // Avoid sending duplicate commands too often
      const now = Date.now();
      const last = _lastAuto.current;
      const sameAsLast = last.cmd === desired && now - last.ts < 5000;
      if (sameAsLast) return;

      // Only act for the currently selected device
      if (!selectedDevice) return;

      // If pump already in desired state, skip
      if ((liveData?.pumpStatus || '').toUpperCase() === desired) return;

      console.log('[App] AUTO MODE: sending pump command', { device: selectedDevice, desired, moisture: val, min });
      // Pass moisture value to include in the payload
      updatePumpStatus(selectedDevice, desired, 'pump', 'auto', val)
        .then((res) => {
          _lastAuto.current = { cmd: desired, ts: Date.now() };
          console.log('[App] AUTO MODE: pump command response', res);
        })
        .catch((err) => {
          console.error('[App] AUTO MODE: pump command failed', err);
        });
    } catch (e) {
      console.warn('[App] auto control failed', e);
    }
  }, [settings?.autoMode, liveData?.moisture, selectedDevice, liveData?.pumpStatus]);

  // Store data handler in ref to ensure compatibility with webSocketClient
  const handleDataRef = useRef(null);

  // Stable data handler
  const handleData = useCallback((data) => {
    setLiveData((prev) => {
      const updated = { ...prev };
      if (data.sensorType === 'batchUpdate') {
        const v = data.value || {};
        if (v.temp !== undefined) updated.temperature = parseFloat(v.temp);
        if (v.humidity !== undefined) updated.humidity = parseFloat(v.humidity);
        if (v.battery !== undefined) updated.battery = parseFloat(v.battery);
        if (v.light !== undefined) updated.light = parseFloat(v.light);
        if (v.moisture !== undefined) updated.moisture = parseFloat(v.moisture);
      } else {
        switch (data.sensorType) {
          case 'temp':
            updated.temperature = parseFloat(data.value);
            break;
          case 'humidity':
            updated.humidity = parseFloat(data.value);
            break;
          case 'battery':
            updated.battery = parseFloat(data.value);
            break;
          case 'light':
            updated.light = parseFloat(data.value);
            break;
          case 'moisture':
            updated.moisture = parseFloat(data.value);
            break;
          case 'pumpStatus':
            updated.pumpStatus = data.value;
            break;
          case 'pumpMode':
            updated.pumpMode = data.value;
            break;
          default:
            break;
        }
      }
      return updated;
    });
  }, []);

  // Update ref when handler changes (stable, so runs once)
  useEffect(() => {
    handleDataRef.current = handleData;
  }, [handleData]);

  // 1. Connection Effect - Connects when authenticated
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    console.log('[App] Authenticated - Connecting WebSocket');
    webSocketClient.connect()
      .then(() => setIsConnected(true))
      .catch(e => console.warn('[App] WS Connect failed', e));

    const onDisconnect = () => setIsConnected(false);
    const onConnect = () => setIsConnected(true);

    webSocketClient.onDisconnect(onDisconnect);
    webSocketClient.onConnect(onConnect);

    return () => {
      webSocketClient.offDisconnect(onDisconnect);
      webSocketClient.offConnect(onConnect);
    };
  }, [isAuthenticated, isLoading]);

  // 2. Subscription & Device Change Effect
  // Handles switching devices and resetting data
  useEffect(() => {
    if (!selectedDevice) return;

    // Persist selection
    localStorage.setItem('selectedDevice', selectedDevice);

    // Reset UI state for new device
    console.log(`[App] 🔄 Device changed to: ${selectedDevice} - Resetting live data`);
    setLiveData({
      moisture: undefined,
      temperature: undefined,
      humidity: undefined,
      light: undefined,
      battery: undefined,
      pumpStatus: 'OFF',
      pumpMode: 'manual',
    });

    // Valid handler required
    if (!handleDataRef.current) return;

    // Subscribe (webSocketClient handles unsubscribing from old device automatically)
    try {
      console.log(`[App] 📡 Subscribing to device: ${selectedDevice}`);
      webSocketClient.subscribeToDevice(selectedDevice, handleDataRef.current);
    } catch (e) {
      console.warn('[App] Subscription failed', e);
    }

  }, [selectedDevice, handleData]);

  // Show loading state while auth is initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="App">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
          isConnected={isConnected}
        />

        <StatusBar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main content area rendered by state (SPA) */}
        {/* Padding top accounts for fixed Header + Navigation Bar - responsive for all screen sizes */}
        <main className="w-full pt-[100px] landscape:pt-[104px] sm:pt-[116px] md:pt-[128px]">
          {activeTab === 'dashboard' ? (
            <Dashboard deviceId={selectedDevice} liveData={liveData} settings={settings} isConnected={isConnected} />
          ) : (
            <DeviceSettingsPage deviceId={selectedDevice} />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
