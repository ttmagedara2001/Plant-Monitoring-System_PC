import React from 'react';
import { XCircle } from 'lucide-react';
import ThresholdInput from './ThresholdInput';

//Reusable section component for min/max threshold settings

const ThresholdSection = ({ 
  title,
  minConfig,
  maxConfig,
  rangeError,
  icon: Icon,
}) => {
  return (
    <div className="space-y-2 sm:space-y-4">
      <h4 className="font-semibold text-gray-700 border-b pb-1 sm:pb-2 text-sm sm:text-base">
        <div className="flex items-center gap-2 sm:gap-3">
          {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />}
          <span className="truncate">{title}</span>
        </div>
      </h4>
      
      {rangeError && (
        <div className="text-red-600 text-xs sm:text-sm flex items-center gap-2">
          <XCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
          {rangeError}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <ThresholdInput {...minConfig} />
        {maxConfig && <ThresholdInput {...maxConfig} />}
      </div>
    </div>
  );
};

export default ThresholdSection;
