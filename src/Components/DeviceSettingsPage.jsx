import React, { useEffect, useState } from 'react';
import ThresholdSection from './ThresholdSection';
import { Droplet, Thermometer, Cloud, Sun, Battery, Power, Settings, Gauge } from 'lucide-react';
import ActionButton from './ActionButton';
import AutoModeToggle from './AutoModeToggle';
import PageHeader from './PageHeader';
import ValidationModal from './ValidationModal';

const DEFAULT_THRESHOLDS = {
  moisture: { min: 20, max: 60 },
  temperature: { min: 10, max: 35 },
  humidity: { min: 30, max: 70 },
  light: { min: 100, max: 1000 },
  battery: { min: 20 },
};

const DeviceSettingsPage = ({ deviceId: propDeviceId }) => {
  const deviceId = propDeviceId;
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [autoMode, setAutoMode] = useState(false);
  const [pumpOn, setPumpOn] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalErrors, setModalErrors] = useState([]);

  useEffect(() => {
    if (!deviceId) return;
    const key = `settings_${deviceId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.thresholds) {
          const merged = Object.keys(DEFAULT_THRESHOLDS).reduce((acc, k) => {
            acc[k] = { ...DEFAULT_THRESHOLDS[k], ...(parsed.thresholds[k] || {}) };
            return acc;
          }, {});
          setThresholds(merged);
        }
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
    setThresholds(prev => {
      const parsed = Number(value);
      const safe = Number.isNaN(parsed)
        ? (prev && prev[group] && typeof prev[group][key] !== 'undefined' ? prev[group][key] : parsed)
        : parsed;
      return {
        ...prev,
        [group]: { ...prev[group], [key]: safe },
      };
    });
  };

  const handleAutoModeToggle = () => {
    // Toggle local UI state only; persist on Save so user can review changes before applying
    setAutoMode(prev => !prev);
  };

  const handlePumpToggle = () => {
    setPumpOn(prev => {
      const next = !prev;
      // persist immediately so dashboard or other tabs can react
      persistSettings({ pumpOn: next });
      return next;
    });
  };

  // Live status values (listen to global snapshot or dispatched events)
  const [statusValues, setStatusValues] = useState({
    moisture: 'unknown',
    temperature: 'unknown',
    humidity: 'unknown',
    light: 'unknown',
    battery: 'unknown',
  });

  useEffect(() => {
    // initialize from global snapshot if present
    try {
      const snap = window.__latestLiveData || null;
      if (snap && typeof snap === 'object') {
        setStatusValues(prev => ({
          moisture: typeof snap.moisture !== 'undefined' ? snap.moisture : prev.moisture,
          temperature: typeof snap.temperature !== 'undefined' ? snap.temperature : prev.temperature,
          humidity: typeof snap.humidity !== 'undefined' ? snap.humidity : prev.humidity,
          light: typeof snap.light !== 'undefined' ? snap.light : prev.light,
          battery: typeof snap.battery !== 'undefined' ? snap.battery : prev.battery,
        }));
      }
    } catch (e) {}

    const handler = (e) => {
      const d = e && e.detail ? e.detail : e;
      if (!d) return;
      setStatusValues(prev => ({
        moisture: typeof d.moisture !== 'undefined' ? d.moisture : prev.moisture,
        temperature: typeof d.temperature !== 'undefined' ? d.temperature : prev.temperature,
        humidity: typeof d.humidity !== 'undefined' ? d.humidity : prev.humidity,
        light: typeof d.light !== 'undefined' ? d.light : prev.light,
        battery: typeof d.battery !== 'undefined' ? d.battery : prev.battery,
      }));
    };

    window.addEventListener('live:update', handler);
    return () => window.removeEventListener('live:update', handler);
  }, []);

  // Determine per-sensor status: 'warning' when equal to min or max, 'critical' when outside bounds, 'normal' otherwise.
  // Missing/invalid values are considered critical for visibility.
  const getSensorState = (key) => {
    const val = statusValues[key];
    if (val === undefined || val === null || String(val) === 'unknown') return 'critical';
    const num = Number(val);
    if (Number.isNaN(num)) return 'critical';
    const group = (thresholds && thresholds[key]) || DEFAULT_THRESHOLDS[key] || {};
    const min = typeof group.min !== 'undefined' ? Number(group.min) : undefined;
    const max = typeof group.max !== 'undefined' ? Number(group.max) : undefined;
    if (typeof min !== 'undefined' && !Number.isNaN(min) && num === min) return 'warning';
    if (typeof max !== 'undefined' && !Number.isNaN(max) && num === max) return 'warning';
    if (typeof min !== 'undefined' && !Number.isNaN(min) && num < min) return 'critical';
    if (typeof max !== 'undefined' && !Number.isNaN(max) && num > max) return 'critical';
    return 'normal';
  };

  const classesFor = (key) => {
    const state = getSensorState(key);
    if (state === 'critical') return { container: 'bg-red-50 rounded p-2', icon: 'text-red-600', value: 'text-red-600' };
    if (state === 'warning') return { container: 'bg-yellow-50 rounded p-2', icon: 'text-yellow-600', value: 'text-yellow-600' };
    // neutral/normal -> indicate green
    return { container: 'bg-green-50 rounded p-2', icon: 'text-green-600', value: 'text-green-600' };
  };

  const handleSave = () => {
    validateAndSave();
  };

  // Validation limits for each sensor
  const LIMITS = {
    moisture: { min: 0, max: 100 },
    temperature: { min: -10, max: 60 },
    humidity: { min: 0, max: 100 },
    light: { min: 0, max: 2000 },
    battery: { min: 0, max: 100 },
  };

  const validateAndSave = () => {
    const errors = [];

    // Validate each threshold group
    Object.keys(LIMITS).forEach((key) => {
      const limits = LIMITS[key];
      const group = thresholds[key] || {};

      // Check min
      if (typeof group.min === 'undefined' || group.min === null || group.min === '') {
        errors.push(`${capitalize(key)} Min is required.`);
      } else if (Number.isNaN(Number(group.min))) {
        errors.push(`${capitalize(key)} Min must be a number.`);
      } else if (Number(group.min) < limits.min || Number(group.min) > limits.max) {
        errors.push(`${capitalize(key)} Min must be between ${limits.min} and ${limits.max}.`);
      }

      // Check max if applicable
      if (typeof group.max !== 'undefined') {
        if (group.max === null || group.max === '') {
          errors.push(`${capitalize(key)} Max is required.`);
        } else if (Number.isNaN(Number(group.max))) {
          errors.push(`${capitalize(key)} Max must be a number.`);
        } else if (Number(group.max) < limits.min || Number(group.max) > limits.max) {
          errors.push(`${capitalize(key)} Max must be between ${limits.min} and ${limits.max}.`);
        }
      }

      // Check min <= max when both present
      if (typeof group.min !== 'undefined' && typeof group.max !== 'undefined' && group.min !== '' && group.max !== '') {
        if (Number(group.min) > Number(group.max)) {
          errors.push(`${capitalize(key)} Min cannot be greater than Max.`);
        }
      }
    });

    if (errors.length > 0) {
      setModalErrors(errors);
      setShowModal(true);
      return;
    }

    // All good — persist
    persistSettings({ thresholds });
    setSaveStatus('Settings saved');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <>
    <div className="min-h-screen bg-[#f0f4f8] p-4 font-sans text-gray-800 overflow-x-hidden">
    <div>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Device Settings"
          subtitle="Configure thresholds and pump"
          deviceId={deviceId}
          showDate
          icon={<Settings className="w-6 h-6" />}
        />

        <div className=" p-8 mx-auto mt-6 bg-blue-100 rounded-lg shadow-md border-blue-50">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: form grid 2x3 */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 w-full lg:col-span-8">
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 grid-rows-3 gap-6">
              <div>
                <ThresholdSection
                  title="Soil Moisture Thresholds"
                  icon={Droplet}
                  minConfig={{
                    label: 'Min',
                    unit: '%',
                    value: (thresholds && thresholds.moisture && typeof thresholds.moisture.min !== 'undefined') ? thresholds.moisture.min : DEFAULT_THRESHOLDS.moisture.min,
                    onChange: (e) => handleChange('moisture', 'min', e.target.value),
                    min: 0,
                    max: 100,
                    step: 1,
                  }}
                  maxConfig={{
                    label: 'Max',
                    unit: '%',
                    value: (thresholds && thresholds.moisture && typeof thresholds.moisture.max !== 'undefined') ? thresholds.moisture.max : DEFAULT_THRESHOLDS.moisture.max,
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
                  icon={Thermometer}
                  minConfig={{
                    label: 'Min',
                    unit: '°C',
                    value: (thresholds && thresholds.temperature && typeof thresholds.temperature.min !== 'undefined') ? thresholds.temperature.min : DEFAULT_THRESHOLDS.temperature.min,
                    onChange: (e) => handleChange('temperature', 'min', e.target.value),
                    min: -10,
                    max: 50,
                    step: 0.5,
                  }}
                  maxConfig={{
                    label: 'Max',
                    unit: '°C',
                    value: (thresholds && thresholds.temperature && typeof thresholds.temperature.max !== 'undefined') ? thresholds.temperature.max : DEFAULT_THRESHOLDS.temperature.max,
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
                  icon={Cloud}
                  minConfig={{
                    label: 'Min',
                    unit: '%',
                    value: (thresholds && thresholds.humidity && typeof thresholds.humidity.min !== 'undefined') ? thresholds.humidity.min : DEFAULT_THRESHOLDS.humidity.min,
                    onChange: (e) => handleChange('humidity', 'min', e.target.value),
                    min: 0,
                    max: 100,
                    step: 1,
                  }}
                  maxConfig={{
                    label: 'Max',
                    unit: '%',
                    value: (thresholds && thresholds.humidity && typeof thresholds.humidity.max !== 'undefined') ? thresholds.humidity.max : DEFAULT_THRESHOLDS.humidity.max,
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
                  icon={Sun}
                  minConfig={{
                    label: 'Min',
                    unit: 'lux',
                    value: (thresholds && thresholds.light && typeof thresholds.light.min !== 'undefined') ? thresholds.light.min : DEFAULT_THRESHOLDS.light.min,
                    onChange: (e) => handleChange('light', 'min', e.target.value),
                    min: 0,
                    max: 2000,
                    step: 10,
                  }}
                  maxConfig={{
                    label: 'Max',
                    unit: 'lux',
                    value: (thresholds && thresholds.light && typeof thresholds.light.max !== 'undefined') ? thresholds.light.max : DEFAULT_THRESHOLDS.light.max,
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
                  icon={Battery}
                  minConfig={{
                    label: 'Min',
                    unit: '%',
                    value: (thresholds && thresholds.battery && typeof thresholds.battery.min !== 'undefined') ? thresholds.battery.min : DEFAULT_THRESHOLDS.battery.min,
                    onChange: (e) => handleChange('battery', 'min', e.target.value),
                    min: 0,
                    max: 100,
                    step: 1,
                  }}
                />
              </div>
              </div>
            </div>

            {/* Right column: status card above Pump Control */}
            <div className="self-start lg:pl-4 lg:col-span-4 flex flex-col justify-between h-full space-y-4">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 ">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className=" ml-8 text-lg font-semibold text-gray-800">Current Status</span>
                  </div>
                </div>

                <div className="px-4 grid grid-cols-2 gap-3 text-sm text-gray-700">
                  {(() => {
                    const c = classesFor('moisture');
                    return (
                      <div className={`flex items-center gap-2 ${c.container}`}>
                        <Droplet className={`w-4 h-4 ${c.icon}`} />
                        <div>
                          <div className="text-xs text-gray-500">Moisture</div>
                          <div className={`font-medium ${c.value}`}>{String(statusValues.moisture)}%</div>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const c = classesFor('temperature');
                    return (
                      <div className={`flex items-center gap-2 ${c.container}`}>
                        <Thermometer className={`w-4 h-4 ${c.icon}`} />
                        <div>
                          <div className="text-xs text-gray-500">Temperature</div>
                          <div className={`font-medium ${c.value}`}>{String(statusValues.temperature)}°C</div>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const c = classesFor('humidity');
                    return (
                      <div className={`flex items-center gap-2 ${c.container}`}>
                        <Cloud className={`w-4 h-4 ${c.icon}`} />
                        <div>
                          <div className="text-xs text-gray-500">Humidity</div>
                          <div className={`font-medium ${c.value}`}>{String(statusValues.humidity)}%</div>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const c = classesFor('light');
                    return (
                      <div className={`flex items-center gap-2 ${c.container}`}>
                        <Sun className={`w-4 h-4 ${c.icon}`} />
                        <div>
                          <div className="text-xs text-gray-500">Light</div>
                          <div className={`font-medium ${c.value}`}>{String(statusValues.light)} lux</div>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    const c = classesFor('battery');
                    return (
                      <div className={`flex items-center gap-2 ${c.container}`}>
                        <Battery className={`w-4 h-4 ${c.icon}`} />
                        <div>
                          <div className="text-xs text-gray-500">Battery</div>
                          <div className={`font-medium ${c.value}`}>{String(statusValues.battery)}%</div>
                        </div>
                      </div>
                    );
                  })()}

                  {(() => {
                    // pump status: show green when ON, gray when OFF
                    const pIcon = pumpOn ? 'text-green-600' : 'text-gray-600';
                    const pValue = pumpOn ? 'text-green-600' : 'text-gray-700';
                    return (
                      <div className={`flex items-center gap-2 ${pumpOn ? 'bg-green-50 rounded p-2' : ''}`}>
                        <Power className={`w-4 h-4 ${pIcon}`} />
                        <div>
                          <div className="text-xs text-gray-500">Pump</div>
                          <div className={`font-medium ${pValue}`}>{pumpOn ? 'ON' : 'OFF'}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Pump Control card */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 h-full w-full lg:w-auto">
                <div className="flex items-center gap-2 mb-4">
                  <Gauge className="w-6 h-6 text-gray-600" />
                  <span className="text-lg font-semibold text-gray-800">Pump Control</span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-2">
                    <AutoModeToggle enabled={autoMode} onToggle={handleAutoModeToggle} />
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col items-start">
                      <div className="font-semibold text-gray-700">Manual Control</div>
                      <div className="flex flex-col items-start gap-1 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Status:</span>
                          <span className={`font-bold ${pumpOn ? 'text-green-600' : 'text-gray-700'}`}>{pumpOn ? 'ON' : 'OFF'}</span>
                        </div>
                        <div>
                          <span className={`${autoMode ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'} text-xs px-2 py-0.5 rounded`}>{autoMode ? 'auto' : 'manual'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handlePumpToggle}
                      aria-pressed={pumpOn}
                      disabled={autoMode}
                      className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold text-white shadow-md transition-all focus:outline-none ${pumpOn ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} ${autoMode ? 'opacity-50 cursor-not-allowed' : ''}`}
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
               {/* Centered Save Button and Status */}
        <div className="flex flex-col items-center mt-6">
          <ActionButton onClick={handleSave} className="w-full">
            Save Settings
          </ActionButton>
          {saveStatus && (
            <div className="text-center text-sm text-green-600 mt-4">{saveStatus}</div>
          )}
            </div>
            </div>
          </div>

      
      </div>
    </div>
    </div>

    <ValidationModal open={showModal} errors={modalErrors} onClose={() => setShowModal(false)} />
  </div>
  </>
  );
};

export default DeviceSettingsPage;