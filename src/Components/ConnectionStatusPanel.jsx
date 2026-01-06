import React from 'react';
import { Moon, Sun, Settings, LayoutDashboard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Compact status bar with icons and color codes for WebSocket, MQTT, and System status.
 * @param {object} props
 * @param {boolean} props.isConnected - Whether the system is connected (real-time)
 */

const ConnectionStatusPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Dark mode state (local only)
  const [darkMode, setDarkMode] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  


  return (
    
    <div className="w-full flex items-center justify-between py-1 px-2 sm:px-4 bg-white border-b border-gray-200 shadow-sm mb-2 sm:mb-4 sticky top-0 z-30 rounded-xl" style={{borderRadius: '1.25rem'}}>
      
    
      {/* Left-side icons */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => navigate('/dashboard')}
          className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition border-none focus:outline-none ${
            location.pathname === '/dashboard' 
              ? 'bg-blue-50 text-blue-600 shadow-sm'    // Active Style
              : 'bg-transparent text-gray-500 hover:bg-gray-100' // Inactive Style
          }`}
          title="Go to Dashboard"
          aria-label="Dashboard"
        >
          {/* Removed specific color class from icon so it inherits from button */}
          <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" /> 
        </button>

        <button
          onClick={() => navigate('/settings')}
          className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition border-none focus:outline-none ${
            location.pathname === '/settings' 
              ? 'bg-blue-50 text-blue-600 shadow-sm'    // Active Style
              : 'bg-transparent text-gray-500 hover:bg-gray-100' // Inactive Style
          }`}
          title="Device Settings"
          aria-label="Device Settings"
        >
          {/* Removed specific color class from icon so it inherits from button */}
          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Right-side controls (dark mode toggle, etc.) */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* (Connection status icons moved to Header) */}
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="ml-2 sm:ml-4 flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded transition bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />}
        </button>
      </div>
    </div>
  );
};

export default ConnectionStatusPanel;
