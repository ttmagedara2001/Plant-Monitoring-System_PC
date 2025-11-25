import React, { useState, useEffect } from 'react';
import { Settings, Power, Loader2, CheckCircle, XCircle, AlertTriangle, Info, Save } from 'lucide-react';

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
    const tempMax = parseFloat(newSettings.tempMax);

    // Moisture validation
    if (isNaN(moistureMin) || moistureMin < 0 || moistureMin > 100) {
      errors.moistureMin = "Must be between 0-100%";
    }
    if (isNaN(moistureMax) || moistureMax < 0 || moistureMax > 100) {
      errors.moistureMax = "Must be between 0-100%";
    }
    if (moistureMin >= moistureMax) {
      errors.moistureRange = "Minimum must be less than maximum";
    }

    // Temperature validation
    if (isNaN(tempMax) || tempMax < 0 || tempMax > 60) {
      errors.tempMax = "Must be between 0-60°C";
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'optimal': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const moistureStatus = getCurrentStatus(
    liveData?.moisture, 
    parseFloat(localSettings.moistureMin), 
    parseFloat(localSettings.moistureMax)
  );

  const tempStatus = getCurrentStatus(
    liveData?.temperature, 
    0, 
    parseFloat(localSettings.tempMax)
  );

  return (
    <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* Current Device Status */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Current Status
        </h4>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 rounded-lg bg-cyan-50 text-cyan-800">
            <div className="font-medium">Moisture</div>
            <div>{liveData?.moisture?.toFixed(1) || '0.0'}% - Normal</div>
          </div>
          <div className="p-2 rounded-lg bg-green-50 text-green-800">
            <div className="font-medium">Temperature</div>
            <div>{liveData?.temperature?.toFixed(1) || '0.0'}°C - Normal</div>
          </div>
        </div>
      </div>

      {/* Moisture Settings */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700 border-b pb-2">
          Soil Moisture Thresholds
        </h4>
        
        {validationErrors.moistureRange && (
          <div className="text-red-600 text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            {validationErrors.moistureRange}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Minimum Threshold (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={localSettings.moistureMin}
              onChange={(e) => handleInputChange('moistureMin', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                validationErrors.moistureMin ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {validationErrors.moistureMin && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.moistureMin}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Maximum Threshold (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={localSettings.moistureMax}
              onChange={(e) => handleInputChange('moistureMax', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                validationErrors.moistureMax ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {validationErrors.moistureMax && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.moistureMax}</p>
            )}
          </div>
        </div>
      </div>

      {/* Temperature Settings */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-700 border-b pb-2">
          Temperature Protection
        </h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Maximum Temperature (°C)
          </label>
          <input
            type="number"
            min="0"
            max="60"
            step="0.5"
            value={localSettings.tempMax}
            onChange={(e) => handleInputChange('tempMax', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
              validationErrors.tempMax ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {validationErrors.tempMax && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.tempMax}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={commandInProgress === 'settings' || Object.keys(validationErrors).length > 0 || !hasUnsavedChanges}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
        >
          {commandInProgress === 'settings' ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Changes</>
          )}
        </button>
      </div>

      {/* Command Status */}
      {commandStatus && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          commandStatus.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {commandStatus.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{commandStatus.message}</span>
        </div>
      )}

      {/* Pump Control Section */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Power className="w-5 h-5 text-gray-600" />
          <h4 className="font-semibold text-gray-700">Manual Pump Control</h4>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-700">Current Status</div>
              <div className="text-sm text-gray-500">
                Status: <span className={`font-bold ml-1 ${pumpStatus === 'ON' ? 'text-green-600' : 'text-blue-600'}`}>
                  {pumpStatus}
                </span>
              </div>
            </div>
            
            <button
              onClick={togglePump}
              disabled={commandInProgress === 'pump'}
              className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition min-w-[120px] justify-center ${
                pumpStatus === 'ON' 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } disabled:opacity-50`}
            >
              {commandInProgress === 'pump' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Wait...</>
              ) : (
                <><Power className="w-4 h-4" /> {pumpStatus === 'ON' ? 'Turn OFF' : 'Turn ON'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
