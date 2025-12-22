import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

const SensorStatusIndicator = ({ label, value, unit = '', status, decimals = 1 }) => {
  const formatValue = (val) => {
    if (val === undefined || val === null) return '--';
    return typeof val === 'number' ? Number(val).toFixed(decimals) : val;
  };

  // Visual states: 'critical' (red), 'warning' (yellow), and 'normal' (green top border).
  // For 'normal' we show only the green top border (no badge or symbol).
  const getStatusProps = (s) => {
    if (s === 'critical') {
      return { accent: 'border-t-4 border-red-500', bg: 'bg-red-500', text: 'text-red-500'};
    }
    if (s === 'warning') {
      return { accent: 'border-t-4 border-amber-400', bg: 'bg-amber-400', text: 'text-amber-500' };
    }
    // normal: show green top border and a subtle green badge indicating OK
    return { accent: 'border-t-4 border-green-500', bg: 'bg-green-50', text: 'text-green-700' };
  };

  const { accent, bg, text, Icon, short } = getStatusProps(status);
  const valueSizeClass = 'text-3xl lg:text-4xl';
  const valueColorClass = text || 'text-gray-800';

  return (
    <div className={`flex flex-col items-center p-3 bg-white rounded-lg shadow-sm w-full ${accent}`}>
      <div className="flex flex-col items-center justify-center w-full">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</div>
          <div className={`${valueSizeClass} font-semibold ${valueColorClass} text-center`}>{formatValue(value)}{unit}</div>
      </div>

      {short ? (
        <div className="mt-3 w-full flex items-center justify-center">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${bg} ${text} text-xs font-semibold shadow-sm`}>
            {Icon ? <Icon className="w-4 h-4" /> : null}
            <span>{short}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SensorStatusIndicator;
