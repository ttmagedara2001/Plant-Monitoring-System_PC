import React from 'react';
import { AlertTriangle } from 'lucide-react';

const StatusCard = ({ value, label, borderColor, alert }) => {
  const hasAlert = !!alert;
  const valueColor = hasAlert ? 'text-red-600' : 'text-gray-800';

  return (
    <div className={`bg-white rounded-xl p-3 sm:p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 border-t-4 ${borderColor}`}>
      <div className={`text-lg sm:text-2xl font-bold ${valueColor} mt-1 sm:mt-2`}>{value}</div>
      <div className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5 sm:mt-1">{label}</div>
    </div>
  );
};

export default StatusCard;