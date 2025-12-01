import React from 'react';
import { Loader2 } from 'lucide-react';

//Reusable action button with loading state
const ActionButton = ({ 
  onClick, 
  disabled, 
  loading, 
  loadingText = 'Processing...', 
  icon: Icon,
  children,
  className = ''
}) => {
  const baseStyles = "flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> 
          {loadingText}
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />} 
          {children}
        </>
      )}
    </button>
  );
};

export default ActionButton;
