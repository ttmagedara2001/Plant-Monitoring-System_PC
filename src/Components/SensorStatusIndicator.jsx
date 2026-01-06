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
  // Responsive value sizing - smaller on mobile portrait, larger on landscape/tablet/desktop
  const valueSizeClass = 'text-xl xs:text-2xl sm:text-3xl landscape:text-2xl md:text-3xl lg:text-4xl';
  const valueColorClass = text || 'text-gray-800';

  return (
    <div className={`flex flex-col items-center p-2 sm:p-3 bg-white rounded-lg shadow-sm w-full ${accent}`}>
      <div className="flex flex-col items-center justify-center w-full">
        <div className="text-[9px] xs:text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider mb-1 landscape:mb-0.5 sm:mb-2 truncate max-w-full">{label}</div>
          <div className={`${valueSizeClass} font-semibold ${valueColorClass} text-center whitespace-nowrap`}>
            {formatValue(value)}<span className="text-xs sm:text-sm md:text-base">{unit}</span>
          </div>
      </div>

      {short ? (
        <div className="mt-2 sm:mt-3 w-full flex items-center justify-center">
          <div className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${bg} ${text} text-[10px] sm:text-xs font-semibold shadow-sm`}>
            {Icon ? <Icon className="w-3 h-3 sm:w-4 sm:h-4" /> : null}
            <span>{short}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SensorStatusIndicator;
