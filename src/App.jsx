import React, { useEffect, useState, useRef } from 'react';
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
  const { jwtToken } = useAuth();
  const { addNotification } = useNotifications();

  // SPA navigation state
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });

  const defaultDevice = 'device0011233';
  const [selectedDevice, setSelectedDevice] = useState(() => {
    return localStorage.getItem('selectedDevice') || defaultDevice;
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

  // Watch for critical sensor transitions and pump status changes to emit notifications
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
      } catch (e) {}

      const sensors = ['moisture','temperature','humidity','light','battery'];
      const isCritical = (key, value) => {
        if (value === undefined || value === null || String(value) === 'unknown') return true;
        const num = Number(value);
        if (Number.isNaN(num)) return true;
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
        // if previously unknown (first run) treat as non-critical so we produce notifications for current criticals
        if (!prevCritical && currCritical) {
          try {
            addNotification({ type: 'critical', message: `Critical: ${s}=${curr[s]}`, timestamp: new Date().toISOString(), meta: { deviceId: selectedDevice, sensor: s, value: curr[s] } });
          } catch (e) {}
        }
      });

      // pump status changed
      if ((prev.pumpStatus || '') !== (curr.pumpStatus || '')) {
        const mode = curr.pumpMode || (settings && settings.autoMode ? 'auto' : 'manual') || 'manual';
        try {
          addNotification({ type: 'pump:status', message: `Pump ${curr.pumpStatus} (${mode})`, timestamp: new Date().toISOString(), meta: { deviceId: selectedDevice, mode } });
        } catch (e) {}
      }
    } catch (e) {
      // ignore
    } finally {
      _prevLive.current = liveData;
    }
  }, [liveData, selectedDevice, addNotification, settings]);

  
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('selectedDevice', selectedDevice);
  }, [selectedDevice]);

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
      updatePumpStatus(selectedDevice, desired, 'pump', 'auto')
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

  useEffect(() => {
    if (!jwtToken) return;

    webSocketClient
      .connect(jwtToken)
      .then(() => console.log('[App] WebSocket connected (global)'))
      .catch((e) => console.warn('[App] WebSocket connect failed', e));

    // Register connect/disconnect callbacks and keep references so we can remove them later
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    webSocketClient.onConnect(onConnect);
    webSocketClient.onDisconnect(onDisconnect);

    // Data handler updates liveData
    const handleData = (data) => {
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
    };

    // Subscribe to selected device topics
    const subscribeToDevice = () => {
      try {
        webSocketClient.subscribeToDevice(selectedDevice, handleData);
      } catch (e) {
        console.warn('[App] subscribeToDevice failed', e);
      }
    };

    try {
      if (webSocketClient.getConnectionStatus()) subscribeToDevice();
    } catch (e) {}

    webSocketClient.onConnect(() => subscribeToDevice());

    return () => {
      // Clean up: remove connect/disconnect listeners and unsubscribe from device topics
      try {
        webSocketClient.offConnect(onConnect);
        webSocketClient.offDisconnect(onDisconnect);
        webSocketClient.unsubscribeFromDevice(selectedDevice);
      } catch (e) {
        console.warn('[App] cleanup failed', e);
      }
    };
  }, [jwtToken, selectedDevice]);

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

        {/* space for fixed header and status bar */}
        <div className="pt-32" />

        {/* Main content area rendered by state (SPA) */}
        {activeTab === 'dashboard' ? (
          <Dashboard deviceId={selectedDevice} liveData={liveData} settings={settings} isConnected={isConnected} />
        ) : (
          <DeviceSettingsPage deviceId={selectedDevice} />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;

