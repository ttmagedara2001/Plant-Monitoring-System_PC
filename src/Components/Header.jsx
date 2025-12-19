import React from 'react';
import logo from '../assets/images/logo_title.png';
import imageIcon from '../assets/images/logo_plant.png';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { Sprout, LogOut, ChevronDown, Bell, Wifi, Radio, Server, LayoutDashboard, Settings } from 'lucide-react';

const Header = ({ deviceId, deviceList, isConnected }) => {
    // Status logic: green = connected, yellow = limited, red = disconnected
    const wsStatus = isConnected ? 'green' : 'red';
    const mqttStatus = isConnected ? 'green' : 'red';
    const sysStatus = isConnected ? 'green' : 'yellow';

    // Tooltip text for each status
    const statusText = {
      green: 'Online',
      yellow: 'Limited',
      red: 'Offline',
    };

    // Icon and color helpers with tooltip
    const statusIcon = (status, Icon, label) => {
      const color = status === 'green' ? 'text-green-500' : status === 'yellow' ? 'text-yellow-500' : 'text-red-500';
      return (
        <div className="relative group flex items-center">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="sr-only">{label}</span>
          {/* Tooltip */}
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity duration-200">
            {label}: {statusText[status]}
          </div>
        </div>
      );
    };
  const { userId, logout } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();

  // default device list (could be moved to a shared service)
  const deviceListLocal = deviceList || ['device9988', 'device0011233', 'device0000', 'device0001'];

  // derive current deviceId from pathname (/dashboard/:id or /settings/:id)
  const getDeviceFromPath = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    // parts[0] === 'dashboard' or 'settings'
    if (parts[0] === 'dashboard' && parts[1]) return parts[1];
    if (parts[0] === 'settings' && parts[1]) return parts[1];
    // fallback to saved selection or first device
    return localStorage.getItem('selectedDevice') || deviceListLocal[0];
  };

  const currentDevice = getDeviceFromPath();

  const handleDeviceSelect = (e) => {
    const newDevice = e.target.value;
    // persist selection
    localStorage.setItem('selectedDevice', newDevice);
    // navigate depending on current section
    if (location.pathname.startsWith('/settings')) {
      navigate(`/settings/${newDevice}`);
    } else {
      navigate(`/dashboard/${newDevice}`);
    }
  };

  return (

    <header className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl bg-white border-2 rounded-lg px-4 py-2 flex flex-col sm:flex-row justify-between items-center shadow-sm z-50">
      {/* Left: Navigation Icons + Logo + Auth */}
      <div className="flex items-center gap-4 mb-4 sm:mb-0">
        {/* Navigation icons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition border-none focus:outline-none ${window.location.pathname.startsWith('/dashboard') ? 'bg-blue-50 text-blue-600 shadow-sm' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}
            title="Dashboard"
            aria-label="Dashboard"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="sr-only">Dashboard</span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition border-none focus:outline-none ${window.location.pathname.startsWith('/settings') ? 'bg-blue-50 text-blue-600 shadow-sm' : 'bg-transparent text-gray-500 hover:bg-gray-100'}`}
            title="Device Settings"
            aria-label="Device Settings"
          >
            <Settings className="w-4 h-4" />
            <span className="sr-only">Device Settings</span>
          </button>
        </div>
        {/* Logo and title */}
        <div className="flex items-center gap-2 ml-2">
          <Sprout className="h-6 w-6 text-green-600" />
          <span className="text-2xl font-bold tracking-wide font-mono">
            Agri<span className="text-yellow-400">Cop</span>
          </span>
        </div>
        {/* Auth details */}
        <div className="text-left text-xs ml-4">
          <div className="text-green-600 font-bold">Authentication: Successful</div>
          <div className="text-gray-600 font-mono">User: {userId}</div>
          <button onClick={logout} className="text-red-500 hover:underline mt-1 flex items-center gap-1">
            Logout <LogOut className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Device Selector Dropdown - center aligned */}
      <div className="flex-1 flex justify-center items-center mb-4 sm:mb-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Select Device:</span>
          <select 
            value={currentDevice || ''} 
            onChange={handleDeviceSelect}
            className="bg-white border border-green-300 text-gray-700 py-1 px-2 rounded focus:ring-2 focus:ring-green-500 outline-none font-medium"
          >
            {deviceListLocal.map(dev => (
              <option key={dev} value={dev}>{dev}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Connection Status Icons */}
      <div className="flex items-center gap-4 ml-6">
        {statusIcon(wsStatus, Wifi, 'WebSocket')}
        {statusIcon(mqttStatus, Radio, 'MQTT')}
        {statusIcon(sysStatus, Server, 'System')}
      </div>

      {/* Bell Icon for Alerts - rightmost */}
      <div className="flex items-center gap-4 ml-8">
        <button className="relative group" title="View Alerts">
          <Bell className="w-6 h-6 text-gray-500 hover:text-yellow-500 transition" />
        </button>
      </div>
    </header>
  );
};

export default Header;