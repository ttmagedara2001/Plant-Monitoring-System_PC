import React from 'react';
import { LayoutDashboard, Settings } from 'lucide-react';

const StatusBar = ({ activeTab, setActiveTab }) => {
  return (
    // Visible on small screens: hidden; show on sm+ to preserve desktop UI
    <div className="hidden sm:flex w-full fixed top-[95px] left-0 justify-center z-40">
      <div className="w-[calc(100%-2rem)] max-w-7xl bg-white border-2 rounded-lg px-2 py-1 grid grid-cols-2">
        <button
          onClick={() => typeof setActiveTab === 'function' ? setActiveTab('dashboard') : null}
          className={`col-span-1 flex items-center justify-center gap-2 h-8 border-0 rounded-l-lg font-medium text-center ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 bg-transparent'}`}
          aria-current={activeTab === 'dashboard' ? 'page' : undefined}
        >
          <div className="flex items-center justify-center gap-2 w-full">
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-xs">Dashboard</span>
          </div>
        </button>

        <button
          onClick={() => typeof setActiveTab === 'function' ? setActiveTab('settings') : null}
          className={`col-span-1 flex items-center justify-center gap-2 h-8 border-0 rounded-r-lg font-medium text-center ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 bg-transparent'}`}
          aria-current={activeTab === 'settings' ? 'page' : undefined}
        >
          <div className="flex items-center justify-center gap-2 w-full">
            <Settings className="w-4 h-4" />
            <span className="text-xs">Device Settings</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default StatusBar;
