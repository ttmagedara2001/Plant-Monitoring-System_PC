import React, { useEffect, useState, useRef, useCallback } from 'react';
import ErrorBoundary from './Components/ErrorBoundary';
import Header from './Components/Header';
import StatusBar from './Components/StatusBar';
import Dashboard from './Components/Dashboard';
import DeviceSettingsPage from './Components/DeviceSettingsPage';
import { useAuth } from './Context/AuthContext';
import { webSocketClient } from './Service/webSocketClient';
import { updatePumpStatus, updateDeviceMode } from './Service/deviceService';
import { useNotifications } from './Context/NotificationContext';

// ─── Sensor notification helpers ─────────────────────────────────────────────
const SENSOR_META_MAP = {
  moisture:    { label: 'Moisture',    unit: '%',    direction_low: 'dry',  direction_high: 'saturated' },
  temperature: { label: 'Temperature', unit: '°C',   direction_low: 'cold', direction_high: 'hot'       },
  humidity:    { label: 'Humidity',    unit: '%',    direction_low: 'dry',  direction_high: 'humid'     },
  light:       { label: 'Light',       unit: ' lux', direction_low: 'dark', direction_high: 'bright'    },
  battery:     { label: 'Battery',     unit: '%',    direction_low: 'low',  direction_high: 'overcharged' },
};

const buildCriticalMessage = (key, value, persisted) => {
  const meta = SENSOR_META_MAP[key] || { label: key, unit: '' };
  const num = Number(value);
  const group = persisted?.[key];
  const min = group?.min != null ? Number(group.min) : undefined;
  const max = group?.max != null ? Number(group.max) : undefined;
  if (min != null && !Number.isNaN(min) && num < min) {
    return {
      message: `${meta.label} critically low — reading ${num}${meta.unit}, minimum is ${min}${meta.unit}`,
      direction: 'low',
      threshold: min,
    };
  }
  if (max != null && !Number.isNaN(max) && num > max) {
    return {
      message: `${meta.label} critically high — reading ${num}${meta.unit}, maximum is ${max}${meta.unit}`,
      direction: 'high',
      threshold: max,
    };
  }
  return { message: `${meta.label} alert: ${num}${meta.unit}`, direction: null, threshold: null };
};

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const { addNotification } = useNotifications();

  // --- Navigation ---
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');

  // --- Device selection (persisted across page refreshes) ---
  const defaultDevice = import.meta.env.VITE_DEVICE_ID;
  const [selectedDevice, setSelectedDevice] = useState(() => localStorage.getItem('selectedDevice') || defaultDevice);

  // --- Live sensor data + connection state ---
  // Sensor values start as undefined so notification guards (raw == null, isCritical)
  // stay silent until the first real WebSocket message arrives.
  const [liveData, setLiveData] = useState({
    moisture: undefined, temperature: undefined, humidity: undefined,
    light: undefined, battery: undefined,
    pumpStatus: 'OFF',
    pumpMode: undefined,
  });
  const [isConnected, setIsConnected] = useState(false);

  // --- Device settings (from localStorage) ---
  const defaultSettings = () => ({
    moistureMin: '20', moistureMax: '70',
    tempMin: '10', tempMax: '35',
    humidityMin: '30', humidityMax: '80',
    lightMin: '200', lightMax: '1000',
    batteryMin: '20', autoMode: false,
  });

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(`settings_${selectedDevice}`);
      return raw ? JSON.parse(raw) : defaultSettings();
    } catch {
      return defaultSettings();
    }
  });

  // Broadcast live data globally for components outside the React tree
  useEffect(() => {
    try {
      window.__latestLiveData = liveData;
      window.dispatchEvent(new CustomEvent('live:update', { detail: liveData }));
    } catch (_) { /* ignored */ }
  }, [liveData]);

  // Notify on critical sensor transitions (value enters critical range).
  // Initialise _prevLive to the undefined-filled shape so the first real WS
  // update is always compared against "no data", never against stale zeros.
  const _prevLive = React.useRef({
    moisture: undefined, temperature: undefined, humidity: undefined,
    light: undefined, battery: undefined,
  });
  React.useEffect(() => {
    try {
      const prev = _prevLive.current || {};
      const curr = liveData || {};

      let persisted = null;
      try {
        const raw = localStorage.getItem(`settings_${selectedDevice}`);
        if (raw) persisted = JSON.parse(raw).thresholds || null;
      } catch (_) { /* ignored */ }

      const isCritical = (key, value) => {
        if (value == null || String(value) === 'unknown') return false;
        const num = Number(value);
        if (Number.isNaN(num)) return false;
        const group = persisted?.[key];
        const min = group?.min != null ? Number(group.min) : undefined;
        const max = group?.max != null ? Number(group.max) : undefined;
        if (min != null && !Number.isNaN(min) && num < min) return true;
        if (max != null && !Number.isNaN(max) && num > max) return true;
        return false;
      };

      ['moisture', 'temperature', 'humidity', 'light', 'battery'].forEach((s) => {
        // Only fire when crossing INTO critical territory (not on initial undefined → value)
        // isCritical(undefined/null) returns false, so the first WS reading that is already
        // critical WILL trigger a notification — which is the desired behaviour.
        if (!isCritical(s, prev[s]) && isCritical(s, curr[s])) {
          try {
            const { message, direction, threshold } = buildCriticalMessage(s, curr[s], persisted);
            addNotification({
              type: 'critical',
              message,
              timestamp: new Date().toISOString(),
              meta: { deviceId: selectedDevice, sensor: s, value: curr[s], direction, threshold },
            });
          } catch (_) { /* ignored */ }
        }
      });
    } catch (_) { /* ignored */ }
    finally { _prevLive.current = liveData; }
  }, [liveData, selectedDevice, addNotification, settings]);


  useEffect(() => { localStorage.setItem('activeTab', activeTab); }, [activeTab]);

  // Reload settings when selected device changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`settings_${selectedDevice}`);
      setSettings(raw ? JSON.parse(raw) : defaultSettings());
    } catch (_) { /* ignored */ }
  }, [selectedDevice]);

  // Listen for settings saved from DeviceSettingsPage
  useEffect(() => {
    const onSettingsUpdated = (e) => {
      if (e?.detail?.deviceId !== selectedDevice) return;
      try {
        const raw = localStorage.getItem(`settings_${selectedDevice}`);
        if (raw) setSettings(JSON.parse(raw));
      } catch (_) { /* ignored */ }
    };
    window.addEventListener('settings:updated', onSettingsUpdated);
    return () => window.removeEventListener('settings:updated', onSettingsUpdated);
  }, [selectedDevice]);

  // --- Automation: pump control based on moisture level ---
  const _lastAuto = useRef({ cmd: null, ts: 0 });
  const _lastManualNotify = useRef(0);

  useEffect(() => {
    // Do not fire any API calls until the user is authenticated and
    // we have real live data (not the default initialised zeros).
    if (!isAuthenticated || !settings || !selectedDevice) return;
    const raw = liveData?.moisture;
    if (raw == null) return;
    const val = Number(raw);
    if (!isFinite(val)) return;

    let min = parseFloat(settings.moistureMin);
    if (isNaN(min)) min = 20;
    const moistureLow = val < min;

    // AUTO MODE — send HTTP pump ON/OFF command
    if (settings.autoMode) {
      const desired = moistureLow ? 'ON' : 'OFF';
      const now = Date.now();
      if (_lastAuto.current.cmd === desired && now - _lastAuto.current.ts < 5000) return;
      if ((liveData?.pumpStatus || '').toUpperCase() === desired) return;

      updateDeviceMode(selectedDevice, 'auto').catch(() => {});
      updatePumpStatus(selectedDevice, desired, 'pmc/pump', 'auto', val)
        .then(() => { _lastAuto.current = { cmd: desired, ts: Date.now() }; })
        .catch((err) => console.error('[App] Auto pump command failed', err));
      return;
    }

    // MANUAL MODE — notify user when moisture is low
    if (moistureLow) {
      const now = Date.now();
      if (now - _lastManualNotify.current < 60_000) return;
      if ((liveData?.pumpStatus || '').toUpperCase() === 'ON') return;
      _lastManualNotify.current = now;
      addNotification({
        type: 'warning',
        message: `Moisture is low — ${val.toFixed(1)}% (minimum: ${min}%). Pump is off; consider turning it on manually.`,
        timestamp: new Date().toISOString(),
        meta: { deviceId: selectedDevice, sensor: 'moisture', value: val, threshold: min, direction: 'low' },
      });
    }
  }, [isAuthenticated, settings?.autoMode, settings?.moistureMin, liveData?.moisture, selectedDevice, liveData?.pumpStatus, addNotification]);

  // --- Data handler (stable ref for webSocketClient) ---
  const handleDataRef = useRef(null);

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
        const map = { temp: 'temperature', humidity: 'humidity', battery: 'battery', light: 'light', moisture: 'moisture', pumpStatus: 'pumpStatus', pumpMode: 'pumpMode' };
        const key = map[data.sensorType];
        if (key) updated[key] = key === 'pumpStatus' || key === 'pumpMode' ? data.value : parseFloat(data.value);
      }
      return updated;
    });
  }, []);

  useEffect(() => { handleDataRef.current = handleData; }, [handleData]);

  // --- Effect 1: Connect WebSocket when authenticated ---
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    webSocketClient.connect().catch((e) => console.warn('[App] WS connect failed', e));

    const onDisconnect = () => setIsConnected(false);
    const onConnect = () => setIsConnected(true);
    webSocketClient.onDisconnect(onDisconnect);
    webSocketClient.onConnect(onConnect);

    return () => {
      webSocketClient.offDisconnect(onDisconnect);
      webSocketClient.offConnect(onConnect);
    };
  }, [isAuthenticated, isLoading]);

  // Persist device selection
  useEffect(() => { if (selectedDevice) localStorage.setItem('selectedDevice', selectedDevice); }, [selectedDevice]);

  // --- Effect 2: Switch STOMP subscriptions when device changes ---
  useEffect(() => {
    if (!selectedDevice || !isConnected || !handleDataRef.current) return;

    // Reset live data for the new device
    setLiveData({
      moisture: undefined, temperature: undefined, humidity: undefined,
      light: undefined, battery: undefined, pumpStatus: 'OFF', pumpMode: undefined,
    });

    try {
      webSocketClient.subscribeToDevice(selectedDevice, handleDataRef.current);
    } catch (e) {
      console.warn('[App] Subscription failed', e);
    }
  }, [selectedDevice, isConnected, handleData]);

  // --- Loading spinner ---
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

        {/* Main content — padding accounts for fixed Header + Nav */}
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
