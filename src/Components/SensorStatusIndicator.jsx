import React from 'react';

const SensorStatusIndicator = ({ label, value, unit, status, decimals = 1 }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'optimal': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatValue = (val) => {
    if (val === undefined || val === null) return '0.0';
    return typeof val === 'number' ? val.toFixed(decimals) : val;
  };

  return (
    <div className={`p-2 rounded-lg ${getStatusColor(status)}`}>
      <div className="font-medium">{label}</div>
      <div>
        {formatValue(value)}{unit} - {status}
      </div>
    </div>
  );
};

export default SensorStatusIndicator;
