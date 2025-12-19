import React from 'react';
import { AlertTriangle } from 'lucide-react';

const StatusCard = ({ value, label, borderColor, alert }) => (
  <div className={`bg-white rounded-xl p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 border-t-4 ${borderColor}`}>
    <div className="text-2xl font-bold text-gray-800 mt-2">{value}</div>
    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">{label}</div>
    {alert && (
      <div className="flex items-center justify-center mt-2">
        <AlertTriangle className="w-3 h-3 text-red-500 mr-1" />
        <span className="text-xs text-red-600 font-semibold">{alert}</span>
      </div>
    )}
  </div>
);

export default StatusCard;