import React from 'react';

// Reusable toggle switch component for auto mode : Used in the Device Settings Panel for the pump control.
const AutoModeToggle = ({ 
  enabled,
  onToggle,
  title = "Automatic Mode",
  description = "Auto pump control"
}) => {
  return (
    <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg border border-gray-200 w-full">
      <div className="flex-1 min-w-0 mr-2">
        <div className="font-medium text-gray-700 text-sm sm:text-base">{title}</div>
        <div className="text-[10px] sm:text-xs text-gray-500 truncate">{description}</div>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-4 sm:translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export default AutoModeToggle;
