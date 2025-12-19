
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SensorStatusIndicator from './SensorStatusIndicator';
import ThresholdSection from './ThresholdSection';
import ActionButton from './ActionButton';
import AutoModeToggle from './AutoModeToggle';
import PageHeader from './PageHeader';

const DEFAULT_THRESHOLDS = {
  moisture: { min: 20, max: 60 },
  temperature: { min: 10, max: 35 },
  humidity: { min: 30, max: 70 },
  light: { min: 100, max: 1000 },
  battery: { min: 20 },
};

const DeviceSettingsPage = () => {
  const { deviceId } = useParams();
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [autoMode, setAutoMode] = useState(false);
  const [pumpOn, setPumpOn] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (!deviceId) return;
    const key = `settings_${deviceId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.thresholds) setThresholds(parsed.thresholds);
        if (typeof parsed.autoMode === 'boolean') setAutoMode(parsed.autoMode);
        if (typeof parsed.pumpOn === 'boolean') setPumpOn(parsed.pumpOn);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, [deviceId]);

  const persistSettings = (partial = {}) => {
    if (!deviceId) return;
    const key = `settings_${deviceId}`;
    const payload = {
      thresholds: { ...thresholds, ...(partial.thresholds || {}) },
      autoMode: typeof partial.autoMode === 'boolean' ? partial.autoMode : autoMode,
      pumpOn: typeof partial.pumpOn === 'boolean' ? partial.pumpOn : pumpOn,
    };
    localStorage.setItem(key, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('settings:updated', { detail: { deviceId } }));
  };

  const handleChange = (group, key, value) => {
    setThresholds(prev => ({
      ...prev,
      [group]: { ...prev[group], [key]: Number(value) },
    }));
  };

  const handleAutoModeToggle = () => {
    setAutoMode(prev => {
      const next = !prev;
      // persist immediately
      persistSettings({ autoMode: next });
      return next;
    });
  };

  const handlePumpToggle = () => {
    setPumpOn(prev => {
      const next = !prev;
      // persist immediately so dashboard or other tabs can react
      persistSettings({ pumpOn: next });
      return next;
    });
  };

  const handleSave = () => {
    persistSettings({ thresholds });
    setSaveStatus('Settings saved');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  return (
    <div className="p-6">
      <PageHeader title="Device Settings" subtitle="Configure thresholds and pump" deviceId={deviceId} showDate />

      <div className="mt-6">
        <div className="grid grid-cols-2 gap-8 items-start">
          {/* Left: form grid 2x3 */}
          <div className="grid grid-cols-2 grid-rows-3 gap-6 w-full">
            <div>
              <ThresholdSection
                title="Soil Moisture Thresholds"
                minConfig={{
                  label: 'Min',
                  unit: '%',
                  value: thresholds.moisture.min,
                  onChange: (e) => handleChange('moisture', 'min', e.target.value),
                  min: 0,
                  max: 100,
                  step: 1,
                }}
                maxConfig={{
                  label: 'Max',
                  unit: '%',
                  value: thresholds.moisture.max,
                  onChange: (e) => handleChange('moisture', 'max', e.target.value),
                  min: 0,
                  max: 100,
                  step: 1,
                }}
              />
            </div>

            <div>
              <ThresholdSection
                title="Temperature Thresholds"
                minConfig={{
                  label: 'Min',
                  unit: '°C',
                  value: thresholds.temperature.min,
                  onChange: (e) => handleChange('temperature', 'min', e.target.value),
                  min: -10,
                  max: 50,
                  step: 0.5,
                }}
                maxConfig={{
                  label: 'Max',
                  unit: '°C',
                  value: thresholds.temperature.max,
                  onChange: (e) => handleChange('temperature', 'max', e.target.value),
                  min: 0,
                  max: 60,
                  step: 0.5,
                }}
              />
            </div>

            <div>
              <ThresholdSection
                title="Humidity Thresholds"
                minConfig={{
                  label: 'Min',
                  unit: '%',
                  value: thresholds.humidity.min,
                  onChange: (e) => handleChange('humidity', 'min', e.target.value),
                  min: 0,
                  max: 100,
                  step: 1,
                }}
                maxConfig={{
                  label: 'Max',
                  unit: '%',
                  value: thresholds.humidity.max,
                  onChange: (e) => handleChange('humidity', 'max', e.target.value),
                  min: 0,
                  max: 100,
                  step: 1,
                }}
              />
            </div>

            <div>
              <ThresholdSection
                title="Light Intensity Thresholds"
                minConfig={{
                  label: 'Min',
                  unit: 'lux',
                  value: thresholds.light.min,
                  onChange: (e) => handleChange('light', 'min', e.target.value),
                  min: 0,
                  max: 2000,
                  step: 10,
                }}
                maxConfig={{
                  label: 'Max',
                  unit: 'lux',
                  value: thresholds.light.max,
                  onChange: (e) => handleChange('light', 'max', e.target.value),
                  min: 0,
                  max: 2000,
                  step: 10,
                }}
              />
            </div>

            <div className="col-span-2">
              <ThresholdSection
                title="Battery Protection"
                minConfig={{
                  label: 'Min',
                  unit: '%',
                  value: thresholds.battery.min,
                  onChange: (e) => handleChange('battery', 'min', e.target.value),
                  min: 0,
                  max: 100,
                  step: 1,
                }}
              />
            </div>
          </div>

          {/* Pump Control (right) */}
          <div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c0 .7-.2 1.4-.6 2-1.4 2-4.4 5.8-4.4 8 0 3.3 2.7 6 6 6s6-2.7 6-6c0-2.2-3-6-4.4-8-.4-.6-.6-1.3-.6-2z" />
                    <circle cx="12" cy="15" r="1.5" />
                  </svg>
                </span>
                <span className="text-lg font-semibold text-gray-800">Pump Control</span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <AutoModeToggle enabled={autoMode} onToggle={handleAutoModeToggle} />
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col items-start">
                    <div className="font-semibold text-gray-700">Manual Control</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`font-bold ${pumpOn ? 'text-green-600' : 'text-gray-700'}`}>{pumpOn ? 'ON' : 'OFF'}</span>
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">manual</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePumpToggle}
                    aria-pressed={pumpOn}
                    className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold text-white shadow-md transition-all focus:outline-none ${pumpOn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 7.5a8.5 8.5 0 1013 0" />
                    </svg>
                    {pumpOn ? 'Turn OFF' : 'Turn ON'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Centered Save Button and Status */}
        <div className="flex flex-col items-center mt-6">
          <ActionButton onClick={handleSave} className="w-56">
            Save Settings
          </ActionButton>
          {saveStatus && (
            <div className="text-center text-sm text-green-600 mt-4">{saveStatus}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceSettingsPage;
