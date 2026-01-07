import React from 'react';
import { LayoutDashboard, Settings } from 'lucide-react';

const StatusBar = ({ activeTab, setActiveTab }) => {
  return (
    // Navigation Bar - positioned below the fixed Header with a small gap
    // Header height: ~52px (mobile) / ~56px (sm) / ~60px (md) + top padding + gap
    <div className="hidden landscape:flex  sm:flex w-full fixed top-[140px] landscape:top-[90px] sm:top-[68px] md:top-[106px] left-0 justify-center z-40 px-1 sm:px-2 md:px-4" >
      <div className="w-full sm:w-[calc(100%-1rem)] md:w-[calc(100%-2rem)] max-w-7xl bg-white border-2 rounded-lg px-1 sm:px-2 py-0.5 sm:py-1 grid grid-cols-2 shadow-sm">
        <button
          onClick={() => typeof setActiveTab === 'function' ? setActiveTab('dashboard') : null}
          className={`col-span-1 flex items-center justify-center gap-1 sm:gap-2 h-7 sm:h-8 border-0 rounded-l-lg font-medium text-center transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 bg-transparent hover:bg-gray-50'}`}
          aria-current={activeTab === 'dashboard' ? 'page' : undefined}
        >
          <div className="flex items-center justify-center gap-1 sm:gap-2 w-full">
            <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs">Dashboard</span>
          </div>
        </button>

        <button
          onClick={() => typeof setActiveTab === 'function' ? setActiveTab('settings') : null}
          className={`col-span-1 flex items-center justify-center gap-1 sm:gap-2 h-7 sm:h-8 border-0 rounded-r-lg font-medium text-center transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 bg-transparent hover:bg-gray-50'}`}
          aria-current={activeTab === 'settings' ? 'page' : undefined}
        >
          <div className="flex items-center justify-center gap-1 sm:gap-2 w-full">
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-xs">Settings</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
