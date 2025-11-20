import React, { useState } from 'react';
import { Save, Loader2, Power, Settings } from 'lucide-react';

const InputGroup = ({ label, name, value, onChange, disabled }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    <input 
      type="number" 
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full bg-gray-100 border border-gray-200 rounded-lg py-2 px-3 text-gray-700 focus:ring-2 focus:ring-green-500 outline-none text-sm disabled:opacity-50"
    />
  </div>
);

const SettingsPanel = ({ settings, setSettings, handleSaveSettings, commandInProgress, commandStatus, liveData, togglePump, pumpStatus }) => {
  const [isManualMode, setIsManualMode] = useState(false);

  const handleSettingChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const onSave = async () => {
    await handleSaveSettings();
  };
  
  const isSaving = commandInProgress === 'settings';
  
  return (
    <div className="bg-white rounded-3xl p-6 shadow-md flex flex-col">
      <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Control Panel</h3>
      
      {/* Manual Control Toggle */}
      <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-200">
        <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-sm text-gray-700">Operation Mode</span>
            <button 
                onClick={() => setIsManualMode(!isManualMode)}
                className={`text-xs font-bold px-2 py-1 rounded ${isManualMode ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}
            >
                {isManualMode ? 'MANUAL' : 'AUTO'}
            </button>
        </div>
        {isManualMode && (
            <button 
                onClick={togglePump}
                className={`w-full py-2 rounded-lg font-bold text-white transition-colors shadow-sm flex items-center justify-center gap-2 mt-3 ${pumpStatus === 'ON' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
            >
                <Power className="w-4 h-4" />
                Turn Pump {pumpStatus === 'ON' ? 'OFF' : 'ON'}
            </button>
        )}
      </div>

      {/*Optimal Settings Form */}
      <div className="space-y-4 flex-grow">
        <h4 className="font-semibold text-gray-600 text-sm flex items-center gap-2">
            <Settings className="w-4 h-4" /> Optimal Thresholds
        </h4>
        <InputGroup label="Moisture Min (%)" name="moistureMin" value={settings.moistureMin} onChange={handleSettingChange} disabled={isManualMode} />
        <InputGroup label="Moisture Max (%)" name="moistureMax" value={settings.moistureMax} onChange={handleSettingChange} disabled={isManualMode} />
        <InputGroup label="Max Temp (°C)" name="tempMax" value={settings.tempMax} onChange={handleSettingChange} disabled={isManualMode} />
      </div>

      <div className="mt-6 text-center">
        <button 
          onClick={onSave}
          disabled={isSaving || isManualMode}
          className="bg-green-400 hover:bg-green-500 text-gray-800 font-bold py-3 px-8 rounded-lg shadow-md transition w-full flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        {commandStatus && (
          <p className={`text-xs mt-3 font-medium ${commandStatus.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
            {commandStatus.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;