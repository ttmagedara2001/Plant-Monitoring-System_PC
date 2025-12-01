import React from 'react';
import { Power, Loader2 } from 'lucide-react';

// Reusable pump control component with auto/manual mode support : Manual control button is disabled in auto mode.
const PumpControlToggle = ({ 
  pumpStatus,
  pumpMode,
  isAutoMode,
  isLoading,
  onToggle
}) => {
  return (
    <div className={`${isAutoMode ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-700">
            Manual Control {isAutoMode && '(Disabled)'}
          </div>
          <div className="text-sm text-gray-500">
            Status: <span className={`font-bold ml-1 ${pumpStatus === 'ON' ? 'text-green-600' : 'text-gray-600'}`}>
              {pumpStatus}
            </span>
            {pumpMode && (
              <span className="text-xs ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                {pumpMode}
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={onToggle}
          disabled={isLoading || isAutoMode}
          className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all duration-300 min-w-[140px] justify-center ${
            pumpStatus === 'ON' 
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200' 
              : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> 
              Processing...
            </>
          ) : (
            <>
              <Power className="w-5 h-5" /> 
              {pumpStatus === 'ON' ? 'Turn OFF' : 'Turn ON'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PumpControlToggle;
