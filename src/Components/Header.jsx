import React from 'react';
import { useAuth } from '../Context/AuthContext';
import { Sprout, LogOut, ChevronDown, Bell, Wifi, Radio, Server, LayoutDashboard, Settings, AlertTriangle, AlertCircle } from 'lucide-react';
import { useNotifications } from '../Context/NotificationContext';
import { useRef } from 'react';
import { webSocketClient } from '../Service/webSocketClient';
import { useEffect, useState } from 'react';

const Header = ({ deviceId, deviceList, activeTab, setActiveTab, selectedDevice, setSelectedDevice, isConnected: propIsConnected, alertMessage }) => {
  // Prefer connection state from App when provided; otherwise poll the shared client
  const [connected, setConnected] = useState(() => {
    if (typeof propIsConnected !== 'undefined') return !!propIsConnected;
    try {
      return !!webSocketClient.getConnectionStatus();
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    if (typeof propIsConnected !== 'undefined') {
      setConnected(!!propIsConnected);
      return;
    }

    // Poll connection status periodically to avoid overwriting single-listener API
    const id = setInterval(() => {
      try {
        const s = !!webSocketClient.getConnectionStatus();
        setConnected(s);
      } catch (e) {
        setConnected(false);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [propIsConnected]);

  // Status logic: green = connected, yellow = limited, red = disconnected
  const wsStatus = connected ? 'green' : 'red';
  const mqttStatus = connected ? 'green' : 'red';
  const sysStatus = connected ? 'green' : 'yellow';

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
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity duration-200">
            {label}: {statusText[status]}
          </div>
        </div>
      );
    };
  const { userId, logout } = useAuth();

  // default device list (could be moved to a shared service)
  const deviceListLocal = deviceList || ['device9988', 'device0011233', 'device0000', 'device0001'];

  // Use controlled selection via props if provided
  const currentDevice = selectedDevice || localStorage.getItem('selectedDevice') || deviceListLocal[0];

  const handleDeviceSelect = (e) => {
    const newDevice = e.target.value;
    // persist selection
    localStorage.setItem('selectedDevice', newDevice);
    if (typeof setSelectedDevice === 'function') setSelectedDevice(newDevice);
  };

  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileRef = useRef();

  React.useEffect(() => {
    const onDoc = (e) => {
      if (!mobileRef.current) return;
      if (!mobileRef.current.contains(e.target)) setMobileOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (

    <header className="fixed inset-x-0 top-4 flex justify-center z-50">
      <div className="w-[calc(100%-2rem)] max-w-7xl px-7 bg-white border-2 rounded-lg py-2 flex flex-col sm:flex-row justify-between items-center shadow-sm">
      {/* Mobile bar (visible on small screens) */}
      <div className="w-full flex items-center justify-between sm:hidden mb-2">
        <div className="flex items-center gap-2">
          <button aria-label="Open menu" onClick={() => setMobileOpen(v => !v)} className="p-2 rounded-md hover:bg-gray-100">
            <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <Sprout className="h-6 w-6 text-green-600" />
            <span className="text-lg font-bold tracking-wide font-mono">Agri<span className="text-yellow-400">Cop</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsBell selectedDevice={currentDevice} />
        </div>
      </div>

      {/* Mobile menu content */}
      {mobileOpen && (
        <div ref={mobileRef} className="sm:hidden absolute left-4 right-4 top-20 bg-white border rounded shadow-lg z-50 px-4 py-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-600" />
                <div className="font-semibold">AgriCop</div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-gray-500">Close</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setMobileOpen(false); typeof setActiveTab === 'function' ? setActiveTab('dashboard') : null; }} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100"> <LayoutDashboard className="w-4 h-4"/> Dashboard</button>
              <button onClick={() => { setMobileOpen(false); typeof setActiveTab === 'function' ? setActiveTab('settings') : null; }} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100"> <Settings className="w-4 h-4"/> Settings</button>
            </div>
            <div className="mt-2">
              <label className="text-sm font-medium text-gray-700">Select Device</label>
              <select value={currentDevice || ''} onChange={handleDeviceSelect} className="w-full mt-1 bg-white border border-green-300 text-gray-700 py-2 px-3 rounded focus:ring-2 focus:ring-green-500 outline-none">
                {deviceListLocal.map(dev => (<option key={dev} value={dev}>{dev}</option>))}
              </select>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-xs text-gray-600">User: {userId}</div>
              <button onClick={logout} className="text-red-500 text-sm">Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Left: Logo + Auth (desktop) */}
      <div className="hidden sm:flex items-center gap-4 mb-4 sm:mb-0">
        <div className="flex items-center gap-2">
          <Sprout className="h-6 w-6 text-green-600" />
          <span className="text-2xl font-bold tracking-wide font-mono">
            Agri<span className="text-yellow-400">Cop</span>
          </span>
        </div>
        <div className="text-left text-xs ml-4">
          <div className="text-green-600 font-bold">Authentication: Successful</div>
          <div className="text-gray-600 font-mono">User: {userId}</div>
          <button onClick={logout} className="text-red-500 mt-1 flex items-center gap-1">
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

      {/* Connection Status Icons (hidden on mobile) */}
      <div className="hidden sm:flex items-center gap-4 ml-6">
        {statusIcon(wsStatus, Wifi, 'WebSocket')}
        {statusIcon(mqttStatus, Radio, 'MQTT')}
        {statusIcon(sysStatus, Server, 'System')}
      </div>

      {/* Bell Icon for Alerts - rightmost */}
          <div className="flex items-center gap-4 ml-8">
            <div className="hidden sm:block"><NotificationsBell selectedDevice={currentDevice} /></div>
            <div className="sm:hidden"><NotificationsBell selectedDevice={currentDevice} /></div>
          </div>
      </div>
    </header>
  );
};

export default Header;

const NotificationsBell = ({ selectedDevice }) => {
  const { notifications, markRead, clearAll } = useNotifications();
  const [open, setOpen] = React.useState(false);
  const ref = useRef();

  React.useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // show only notifications for the selected device (or those without deviceId)
  const visible = notifications.filter(n => {
    const did = n.meta && n.meta.deviceId ? n.meta.deviceId : null;
    return did === null || did === selectedDevice;
  });

  const unread = visible.filter(n => !n.read).length;

  const iconFor = (type) => {
    if (type === 'critical') return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (type && type.startsWith('pump')) return <AlertCircle className="w-4 h-4 text-blue-600" />;
    return <Bell className="w-4 h-4 text-gray-600" />;
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="relative group" title="View Alerts" aria-haspopup="true">
        <Bell className="w-6 h-6 text-gray-500 hover:text-yellow-500 transition" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">{unread}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-white border rounded shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="font-semibold">Notifications</div>
            <div className="flex items-center gap-2">
              <button onClick={() => { clearAll(selectedDevice); }} className="text-xs text-gray-500 hover:underline">Clear</button>
            </div>
          </div>
          <ul className="divide-y">
            {visible.length === 0 && (
              <li className="p-3 text-sm text-gray-500">No notifications</li>
            )}
            {visible.map((n) => (
              <li key={n.id} className={`p-3 text-sm ${n.read ? 'bg-white' : 'bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-shrink-0 mt-0.5">{iconFor(n.type)}</div>
                  <div className="truncate">
                    <div className={`font-medium ${n.type === 'critical' ? 'text-red-700' : 'text-gray-800'}`}>{n.message}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(n.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="ml-2">
                    {!n.read && <button onClick={() => markRead(n.id)} className="text-xs text-blue-600">Mark</button>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};