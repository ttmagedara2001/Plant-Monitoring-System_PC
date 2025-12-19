import React, { useState, useEffect } from 'react';
import { Settings, Power, Loader2, AlertTriangle, Info, Save } from 'lucide-react';

import SensorStatusIndicator from './SensorStatusIndicator';
import ThresholdSection from './ThresholdSection';
import CommandStatusMessage from './CommandStatusMessage';
import ActionButton from './ActionButton';
import PumpControlToggle from './PumpControlToggle';
import AutoModeToggle from './AutoModeToggle';

const SettingsPanel = ({ 
  settings, 
  setSettings, 
  handleSaveSettings, 
  commandInProgress,
  commandStatus,
  liveData, 
  togglePump, 
  pumpStatus 
}) => {
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Sync local settings with props
  useEffect(() => {
    setLocalSettings(settings);
    setHasUnsavedChanges(false);
  }, [settings]);

  // Validation logic
  const validateSettings = (newSettings) => {
    const errors = {};
    
    const moistureMin = parseFloat(newSettings.moistureMin);
    const moistureMax = parseFloat(newSettings.moistureMax);
    const tempMin = parseFloat(newSettings.tempMin);
    const tempMax = parseFloat(newSettings.tempMax);
    const humidityMin = parseFloat(newSettings.humidityMin);
    const humidityMax = parseFloat(newSettings.humidityMax);
    const lightMin = parseFloat(newSettings.lightMin);
    const lightMax = parseFloat(newSettings.lightMax);
    const batteryMin = parseFloat(newSettings.batteryMin);

    // Moisture validation
    if (isNaN(moistureMin) || moistureMin < 0 || moistureMin > 100) {
      errors.moistureMin = "Must be between 0-100%";
    }
    if (isNaN(moistureMax) || moistureMax < 0 || moistureMax > 100) {
      errors.moistureMax = "Must be between 0-100%";
    }
    if (moistureMin >= moistureMax) {
      errors.moistureRange = "Min must be less than max";
    }

    // Temperature validation
    if (isNaN(tempMin) || tempMin < -10 || tempMin > 50) {
      errors.tempMin = "Must be between -10 to 50°C";
    }
    if (isNaN(tempMax) || tempMax < 0 || tempMax > 60) {
      errors.tempMax = "Must be between 0-60°C";
    }
    if (tempMin >= tempMax) {
      errors.tempRange = "Min must be less than max";
    }

    // Humidity validation
    if (isNaN(humidityMin) || humidityMin < 0 || humidityMin > 100) {
      errors.humidityMin = "Must be between 0-100%";
    }
    if (isNaN(humidityMax) || humidityMax < 0 || humidityMax > 100) {
      errors.humidityMax = "Must be between 0-100%";
    }
    if (humidityMin >= humidityMax) {
      errors.humidityRange = "Min must be less than max";
    }

    // Light validation
    if (isNaN(lightMin) || lightMin < 0 || lightMin > 2000) {
      errors.lightMin = "Must be between 0-2000 lux";
    }
    if (isNaN(lightMax) || lightMax < 0 || lightMax > 2000) {
      errors.lightMax = "Must be between 0-2000 lux";
    }
    if (lightMin >= lightMax) {
      errors.lightRange = "Min must be less than max";
    }

    // Battery validation
    if (isNaN(batteryMin) || batteryMin < 0 || batteryMin > 100) {
      errors.batteryMin = "Must be between 0-100%";
    }

    return errors;
  };

  const handleInputChange = (field, value) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
    
    // Real-time validation
    const errors = validateSettings(newSettings);
    setValidationErrors(errors);
  };

  const handleSave = async () => {
    const errors = validateSettings(localSettings);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSettings(localSettings);
    await handleSaveSettings();
    setHasUnsavedChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasUnsavedChanges(false);
    setValidationErrors({});
  };

  // Current status indicators
  const getCurrentStatus = (value, min, max) => {
    if (!value) return 'unknown';
    if (value < min) return 'critical';
    if (value > max) return 'warning';
    return 'optimal';
  };

  const moistureStatus = getCurrentStatus(
    liveData?.moisture, 
    parseFloat(localSettings.moistureMin), 
    parseFloat(localSettings.moistureMax)
  );

  const tempStatus = getCurrentStatus(
    liveData?.temperature, 
    parseFloat(localSettings.tempMin), 
    parseFloat(localSettings.tempMax)
  );

  const humidityStatus = getCurrentStatus(
    liveData?.humidity, 
    parseFloat(localSettings.humidityMin), 
    parseFloat(localSettings.humidityMax)
  );

  const lightStatus = getCurrentStatus(
    liveData?.light, 
    parseFloat(localSettings.lightMin), 
    parseFloat(localSettings.lightMax)
  );

  const batteryStatus = getCurrentStatus(
    liveData?.battery, 
    parseFloat(localSettings.batteryMin), 
    100
  );

    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-[#f0f4f8]">
        <div className="w-full max-w-6xl p-6 bg-white rounded-3xl shadow-md border border-gray-100 flex flex-col gap-4" style={{ height: "90vh" }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-gray-600" />
              <h3 className="text-xl font-bold text-gray-800">Device Settings</h3>
            </div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Unsaved changes</span>
              </div>
            )}
          </div>

          {/* Compact Status Banner */}
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col mb-2">
            <div className="font-semibold text-gray-700 flex items-center gap-2 mb-2">
              <Info className="w-4 h-4" /> Current Status
            </div>
            <div className="flex flex-row flex-wrap justify-between gap-4">
              <SensorStatusIndicator 
                label="Moisture"
                value={liveData?.moisture}
                unit="%"
                status={moistureStatus}
                decimals={1}
              />
              <SensorStatusIndicator 
                label="Temperature"
                value={liveData?.temperature}
                unit="°C"
                status={tempStatus}
                decimals={1}
              />
              <SensorStatusIndicator 
                label="Humidity"
                value={liveData?.humidity}
                unit="%"
                status={humidityStatus}
                decimals={1}
              />
              <SensorStatusIndicator 
                label="Light"
                value={liveData?.light}
                unit=" lux"
                status={lightStatus}
                decimals={0}
              />
              <SensorStatusIndicator 
                label="Battery"
                value={liveData?.battery}
                unit="%"
                status={batteryStatus}
                decimals={1}
              />
            </div>
          </div>

          {/* 2x2 Grid for Thresholds */}
          <div className="grid grid-cols-2 grid-rows-2 gap-4 flex-grow">
            <ThresholdSection 
              title="Soil Moisture Thresholds"
              rangeError={validationErrors.moistureRange}
              minConfig={{
                label: "Minimum Threshold",
                unit: "%",
                value: localSettings.moistureMin,
                onChange: (e) => handleInputChange('moistureMin', e.target.value),
                min: "0",
                max: "100",
                step: "1",
                error: validationErrors.moistureMin
              }}
              maxConfig={{
                label: "Maximum Threshold",
                unit: "%",
                value: localSettings.moistureMax,
                onChange: (e) => handleInputChange('moistureMax', e.target.value),
                min: "0",
                max: "100",
                step: "1",
                error: validationErrors.moistureMax
              }}
            />
            <ThresholdSection 
              title="Temperature Thresholds"
              rangeError={validationErrors.tempRange}
              minConfig={{
                label: "Minimum Temperature",
                unit: "°C",
                value: localSettings.tempMin,
                onChange: (e) => handleInputChange('tempMin', e.target.value),
                min: "-10",
                max: "50",
                step: "0.5",
                error: validationErrors.tempMin
              }}
              maxConfig={{
                label: "Maximum Temperature",
                unit: "°C",
                value: localSettings.tempMax,
                onChange: (e) => handleInputChange('tempMax', e.target.value),
                min: "0",
                max: "60",
                step: "0.5",
                error: validationErrors.tempMax
              }}
            />
            <ThresholdSection 
              title="Humidity Thresholds"
              rangeError={validationErrors.humidityRange}
              minConfig={{
                label: "Minimum Humidity",
                unit: "%",
                value: localSettings.humidityMin,
                onChange: (e) => handleInputChange('humidityMin', e.target.value),
                min: "0",
                max: "100",
                step: "1",
                error: validationErrors.humidityMin
              }}
              maxConfig={{
                label: "Maximum Humidity",
                unit: "%",
                value: localSettings.humidityMax,
                onChange: (e) => handleInputChange('humidityMax', e.target.value),
                min: "0",
                max: "100",
                step: "1",
                error: validationErrors.humidityMax
              }}
            />
            <ThresholdSection 
              title="Light Intensity Thresholds"
              rangeError={validationErrors.lightRange}
              minConfig={{
                label: "Minimum Light",
                unit: "lux",
                value: localSettings.lightMin,
                onChange: (e) => handleInputChange('lightMin', e.target.value),
                min: "0",
                max: "2000",
                step: "10",
                error: validationErrors.lightMin
              }}
              maxConfig={{
                label: "Maximum Light",
                unit: "lux",
                value: localSettings.lightMax,
                onChange: (e) => handleInputChange('lightMax', e.target.value),
                min: "0",
                max: "2000",
                step: "10",
                error: validationErrors.lightMax
              }}
            />
          </div>

          {/* Battery Min (single field, below grid) */}
          <div className="flex flex-row items-center gap-4 mt-2">
            <ThresholdSection 
              title="Battery Protection"
              minConfig={{
                label: "Minimum Battery Level",
                unit: "%",
                value: localSettings.batteryMin,
                onChange: (e) => handleInputChange('batteryMin', e.target.value),
                min: "0",
                max: "100",
                step: "1",
                error: validationErrors.batteryMin
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2">
            <ActionButton
              onClick={handleSave}
              disabled={Object.keys(validationErrors).length > 0 || !hasUnsavedChanges}
              loading={commandInProgress === 'settings'}
              loadingText="Saving..."
              icon={Save}
            >
              Save Changes
            </ActionButton>
          </div>

          {/* Auto Mode Activation Warning */}
          {hasUnsavedChanges && localSettings.autoMode !== settings.autoMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm">
              <div className="flex items-center gap-2 text-blue-800 font-medium mb-1">
                <Info className="w-4 h-4" />
                {localSettings.autoMode ? 'Auto Mode Will Activate' : 'Auto Mode Will Deactivate'}
              </div>
              <p className="text-blue-700">
                {localSettings.autoMode 
                  ? 'Click "Save Changes" to activate automatic pump control. The system will monitor soil moisture and control the pump automatically.'
                  : 'Click "Save Changes" to switch to manual control mode.'}
              </p>
            </div>
          )}

          {/* Command Status */}
          <CommandStatusMessage status={commandStatus} />

          {/* Pump Control Section */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Power className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold text-gray-700">Pump Control</h4>
            </div>

            <div className="bg-gray-50 rounded-xl p-2 space-y-2">
              {/* Auto Mode Toggle */}
              <AutoModeToggle
                enabled={localSettings.autoMode}
                onToggle={() => handleInputChange('autoMode', !localSettings.autoMode)}
                title="Automatic Mode"
                description="Auto control pump based on moisture thresholds"
              />

              {/* Manual Control - Disabled when Auto Mode is ON */}
              <PumpControlToggle
                pumpStatus={pumpStatus}
                pumpMode={liveData?.pumpMode}
                isAutoMode={localSettings.autoMode}
                isLoading={commandInProgress === 'pump'}
                onToggle={togglePump}
              />
            </div>
          </div>
        </div>
      </div>
    );
};

export default SettingsPanel;
