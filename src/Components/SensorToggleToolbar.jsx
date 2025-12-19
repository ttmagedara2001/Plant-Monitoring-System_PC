import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Sensor toggle button definitions
const SENSOR_DEFS = [
  { key: 'moisture', label: 'Moisture', color: 'bg-cyan-500' },
  { key: 'temperature', label: 'Temp', color: 'bg-green-500' },
  { key: 'humidity', label: 'Humidity', color: 'bg-blue-500' },
  { key: 'light', label: 'Light', color: 'bg-yellow-500' },
  { key: 'battery', label: 'Battery', color: 'bg-purple-500' },
];

const SensorToggleToolbar = ({ visibleSeries, toggleSeries, getButtonClass, className = '' }) => (
  <div className={`flex flex-wrap gap-2 mb-6 justify-center md:justify-start p-3 bg-gray-50 rounded-xl border border-gray-100 ${className}`}>
    {SENSOR_DEFS.map(({ key, label, color }) => (
      <button
        key={key}
        onClick={() => toggleSeries(key)}
        className={getButtonClass(visibleSeries[key], color)}
      >
        {visibleSeries[key] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} {label}
      </button>
    ))}
  </div>
);

export default SensorToggleToolbar;
