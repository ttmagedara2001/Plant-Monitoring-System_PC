import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Sensor toggle button definitions
const SENSOR_DEFS = [
  { key: 'moisture', label: 'Moisture', shortLabel: 'Moist', color: 'bg-cyan-500' },
  { key: 'temperature', label: 'Temp', shortLabel: 'Temp', color: 'bg-green-500' },
  { key: 'humidity', label: 'Humidity', shortLabel: 'Humid', color: 'bg-blue-500' },
  { key: 'light', label: 'Light', shortLabel: 'Light', color: 'bg-yellow-500' },
  { key: 'battery', label: 'Battery', shortLabel: 'Batt', color: 'bg-purple-500' },
];

const SensorToggleToolbar = ({ visibleSeries, toggleSeries, getButtonClass, className = '' }) => (
  <div className={`flex items-center gap-1.5 sm:gap-2 justify-start ${className}`}>
    {SENSOR_DEFS.map(({ key, label, shortLabel, color }) => (
      <button
        key={key}
        onClick={() => toggleSeries(key)}
        className={`${getButtonClass(visibleSeries[key], color)} !px-2 sm:!px-3 !py-1 sm:!py-1.5 whitespace-nowrap`}
      >
        {visibleSeries[key] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        <span className="hidden xs:inline">{label}</span>
        <span className="xs:hidden">{shortLabel}</span>
      </button>
    ))}
  </div>
);

export default SensorToggleToolbar;
