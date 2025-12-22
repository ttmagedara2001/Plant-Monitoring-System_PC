import React from 'react';
import { XCircle } from 'lucide-react';

const ValidationModal = ({ open, title = 'Cannot Save Settings', errors = [], onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10 border-2 border-red-200">
        <div className="p-4 border-b flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-700">{title}</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-700 mb-3">There are errors in the form. Please correct the highlighted fields before saving.</p>
          {errors && errors.length > 0 && (
            <ul className="list-disc list-inside text-sm text-red-600 space-y-1 mb-4">
              {errors.map((err, idx) => <li key={idx}>{err}</li>)}
            </ul>
          )}
          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationModal;
