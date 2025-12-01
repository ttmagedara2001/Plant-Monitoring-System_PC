import React from 'react';

//Reusable input component for threshold values with validation (9 times for the sensor thresholds in the Settings Panel)

const ThresholdInput = ({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step = '1',
  error,
  unit = ''
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label} {unit && `(${unit})`}
      </label>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
};

export default ThresholdInput;
