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
  // Responsive value sizing - compact for 5-column layout
  const valueSizeClass = 'text-lg sm:text-xl md:text-2xl lg:text-3xl';
  const valueColorClass = text || 'text-gray-800';

  return (
    <div className={`flex flex-col items-center p-1.5 sm:p-2 md:p-3 bg-white rounded-lg shadow-sm w-full ${accent}`}>
      <div className="flex flex-col items-center justify-center w-full">
        <div className="text-[8px] sm:text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-0.5 sm:mb-1 md:mb-2 truncate max-w-full text-center">{label}</div>
          <div className={`${valueSizeClass} font-semibold ${valueColorClass} text-center whitespace-nowrap`}>
            {formatValue(value)}<span className="text-[10px] sm:text-xs md:text-sm">{unit}</span>
          </div>
      </div>

      {short ? (
        <div className="mt-1 sm:mt-2 md:mt-3 w-full flex items-center justify-center">
          <div className={`inline-flex items-center gap-1 sm:gap-1.5 md:gap-2 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full ${bg} ${text} text-[9px] sm:text-[10px] md:text-xs font-semibold shadow-sm`}>
            {Icon ? <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" /> : null}
            <span>{short}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SensorStatusIndicator;
