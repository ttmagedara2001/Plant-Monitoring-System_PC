import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

//Reusable status message component for displaying command results : Success and error messages after user actions
const CommandStatusMessage = ({ status }) => {
  if (!status) return null;

  return (
    <div className={`p-3 rounded-lg flex items-center gap-2 ${
      status.type === 'success' 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      {status.type === 'success' ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">{status.message}</span>
    </div>
  );
};

export default CommandStatusMessage;
