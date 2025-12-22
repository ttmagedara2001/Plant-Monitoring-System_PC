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
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-700 border-b pb-2">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-gray-600" />}
          <span>{title}</span>
        </div>
      </h4>
      
      {rangeError && (
        <div className="text-red-600 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          {rangeError}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <ThresholdInput {...minConfig} />
        {maxConfig && <ThresholdInput {...maxConfig} />}
      </div>
    </div>
  );
};

export default ThresholdSection;
