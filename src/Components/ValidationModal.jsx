import React from 'react';
import { XCircle } from 'lucide-react';

const ValidationModal = ({ open, title = 'Cannot Save Settings', errors = [], onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md z-10 border-2 border-red-200">
        <div className="p-3 sm:p-4 border-b flex items-center gap-2 sm:gap-3">
          <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold text-red-700">{title}</h3>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3">Please correct the following errors before saving:</p>
          {errors && errors.length > 0 && (
            <ul className="list-disc list-inside text-xs sm:text-sm text-red-600 space-y-1 mb-3 sm:mb-4 max-h-48 overflow-y-auto">
              {errors.map((err, idx) => <li key={idx}>{err}</li>)}
            </ul>
          )}
          <div className="flex justify-end">
            <button onClick={onClose} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white text-sm sm:text-base rounded hover:bg-red-700 font-semibold">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationModal;
