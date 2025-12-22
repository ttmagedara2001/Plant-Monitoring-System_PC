import React from 'react';
import { AlertTriangle } from 'lucide-react';

const StatusCard = ({ value, label, borderColor, alert }) => {
  const hasAlert = !!alert;
  const valueColor = hasAlert ? 'text-red-600' : 'text-gray-800';

  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 border-t-4 ${borderColor}`}>
      <div className={`text-2xl font-bold ${valueColor} mt-2`}>{value}</div>
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
};

export default StatusCard;