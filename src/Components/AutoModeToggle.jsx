import React from 'react';

// Reusable toggle switch component for auto mode : Used in the Device Settings Panel for the pump control.
const AutoModeToggle = ({ 
  enabled,
  onToggle,
  title = "Automatic Mode",
  description = "Auto control pump based on moisture thresholds"
}) => {
  return (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
      <div>
        <div className="font-medium text-gray-700">{title}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export default AutoModeToggle;
