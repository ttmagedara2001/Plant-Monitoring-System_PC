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
  const deviceListLocal = deviceList || ['device9988', 'device0011233', 'device0000', 'device0001','deviceTestUC','devicetestuc','device123'];

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

    <header className="fixed inset-x-0 top-0 flex justify-center z-50 px-1 sm:px-2 md:px-4 pt-1 sm:pt-2 md:pt-3">
      <div className="w-full sm:w-[calc(100%-1rem)] md:w-[calc(100%-2rem)] max-w-7xl px-2 sm:px-4 md:px-7 bg-white border-2 rounded-lg py-1.5 sm:py-2 flex flex-col sm:flex-row justify-between items-center shadow-md">
      {/* Mobile bar (visible on small screens) */}
      <div className="w-full flex items-center justify-between sm:hidden">
        <div className="flex items-center gap-1.5">
          <button aria-label="Open menu" onClick={() => setMobileOpen(v => !v)} className="p-1 rounded-md hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-1">
            <Sprout className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            <span className="text-sm sm:text-base font-bold tracking-wide font-mono">Agri<span className="text-yellow-400">Cop</span></span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Connection status mini indicators for mobile */}
          <div className="flex items-center gap-0.5">
            <Wifi className={`w-3.5 h-3.5 ${connected ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <NotificationsBell selectedDevice={currentDevice} />
        </div>
      </div>

      {/* Mobile menu content */}
      {mobileOpen && (
        <div ref={mobileRef} className="sm:hidden absolute left-2 right-2 top-14 bg-white border rounded-lg shadow-lg z-50 px-3 py-3 max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-600" />
                <div className="font-semibold text-sm">AgriCop Menu</div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-gray-500 text-sm px-2 py-1 hover:bg-gray-100 rounded">✕</button>
            </div>
            
            {/* Navigation buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setMobileOpen(false); typeof setActiveTab === 'function' && setActiveTab('dashboard'); }} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-green-100 text-green-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <LayoutDashboard className="w-4 h-4"/> Dashboard
              </button>
              <button onClick={() => { setMobileOpen(false); typeof setActiveTab === 'function' && setActiveTab('settings'); }} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'settings' ? 'bg-green-100 text-green-700' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <Settings className="w-4 h-4"/> Settings
              </button>
            </div>
            
            {/* Device selector */}
            <div className="pt-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Select Device</label>
              <select value={currentDevice || ''} onChange={handleDeviceSelect} className="w-full mt-1 bg-white border border-green-300 text-gray-700 py-2.5 px-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm">
                {deviceListLocal.map(dev => (<option key={dev} value={dev}>{dev}</option>))}
              </select>
            </div>
            
            {/* Connection status */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-600">{connected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
            
            {/* User info and logout */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-gray-600 truncate max-w-[60%]">User: {userId}</div>
              <button onClick={logout} className="text-red-500 text-sm flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded">
                <LogOut className="w-3 h-3" /> Logout
              </button>
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

      {/* Device Selector Dropdown - center aligned (hidden on mobile) */}
      <div className="hidden sm:flex flex-1 justify-center items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Select Device:</span>
          <select 
            value={currentDevice || ''} 
            onChange={handleDeviceSelect}
            className="bg-white border border-green-300 text-gray-700 py-1 px-2 rounded focus:ring-2 focus:ring-green-500 outline-none font-medium text-sm"
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

      {/* Bell Icon for Alerts - rightmost (hidden on mobile, shown in mobile bar instead) */}
      <div className="hidden sm:flex items-center gap-4 ml-8">
        <NotificationsBell selectedDevice={currentDevice} />
      </div>
      </div>
    </header>
  );
};

export default Header;

// ─── Helpers ────────────────────────────────────────────────────────────────

const relativeTime = (isoString) => {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const SENSOR_META_MAP = {
  moisture:    { label: 'Moisture',    unit: '%'    },
  temperature: { label: 'Temperature', unit: '°C'   },
  humidity:    { label: 'Humidity',    unit: '%'    },
  light:       { label: 'Light',       unit: ' lux' },
  battery:     { label: 'Battery',     unit: '%'    },
};

const TYPE_CONFIG = {
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-50',
    pill: 'bg-red-100 text-red-700',
    Icon: AlertTriangle,
    label: 'Critical',
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50',
    pill: 'bg-amber-100 text-amber-700',
    Icon: AlertCircle,
    label: 'Warning',
  },
};

const getTypeConfig = (type) => {
  if (type === 'critical') return TYPE_CONFIG.critical;
  if (type === 'warning') return TYPE_CONFIG.warning;
  return {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    pill: 'bg-blue-100 text-blue-700',
    Icon: Bell,
    label: 'Info',
  };
};

// ─── NotificationsBell ──────────────────────────────────────────────────────

const NotificationsBell = ({ selectedDevice }) => {
  const { notifications, markRead, markAllRead, clearAll } = useNotifications();
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

  // Show only notifications for the selected device (or those without a deviceId)
  const visible = notifications.filter((n) => {
    const did = n.meta && n.meta.deviceId ? n.meta.deviceId : null;
    return did === null || did === selectedDevice;
  });

  const unread = visible.filter((n) => !n.read).length;
  const badgeCount = unread > 99 ? '99+' : unread;

  return (
    <div className="relative" ref={ref}>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="View Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
          open ? 'bg-yellow-50 ring-2 ring-yellow-400' : 'hover:bg-gray-100'
        }`}
      >
        <Bell className={`w-5 h-5 transition-colors ${open ? 'text-yellow-500' : 'text-gray-500'}`} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full ring-2 ring-white">
            {badgeCount}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div
          className="absolute right-0 mt-2 rounded-2xl border border-gray-100 bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{ minWidth: 320, maxWidth: 380, maxHeight: 480 }}
        >
          {/* Header strip */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-800 text-sm">Notifications</span>
              {unread > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold leading-none">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={() => markAllRead(selectedDevice)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => clearAll(selectedDevice)}
                className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Notification list */}
          <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {visible.length === 0 ? (
              <li className="flex flex-col items-center justify-center py-10 gap-2 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                  <Bell className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">All caught up!</p>
                <p className="text-xs text-gray-400">No notifications for this device right now.</p>
              </li>
            ) : (
              visible.map((n) => {
                const cfg = getTypeConfig(n.type);
                const TypeIcon = cfg.Icon;
                return (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-l-4 transition-colors ${
                      n.read ? 'bg-white border-l-gray-200' : `${cfg.bg} ${cfg.border}`
                    }`}
                  >
                    {/* Type pill badge */}
                    <span
                      className={`inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        n.read ? 'bg-gray-100 text-gray-500' : cfg.pill
                      }`}
                    >
                      <TypeIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>

                    {/* Message + timestamp */}
                    <div className="flex-1 min-w-0">
                      <p
                        title={n.message}
                        className={`text-sm leading-snug break-words ${
                          n.read ? 'text-gray-500 font-normal' : 'text-gray-900 font-medium'
                        }`}
                      >
                        {n.message}
                      </p>

                      {/* Sensor value / threshold chips */}
                      {n.meta?.sensor && n.meta?.value != null && (() => {
                        const sm = SENSOR_META_MAP[n.meta.sensor];
                        if (!sm) return null;
                        const reading = `${Number(n.meta.value).toFixed(1)}${sm.unit}`;
                        const thresholdStr = n.meta.threshold != null
                          ? `${n.meta.direction === 'low' ? 'min' : n.meta.direction === 'high' ? 'max' : 'limit'}: ${n.meta.threshold}${sm.unit}`
                          : null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-[11px] font-mono text-gray-700 border border-gray-200">
                              <span className="text-gray-400 text-[10px] font-sans">{sm.label}</span>
                              <span className="font-semibold">{reading}</span>
                            </span>
                            {thresholdStr && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono border ${
                                n.meta.direction === 'low'
                                  ? 'bg-red-50 text-red-600 border-red-200'
                                  : n.meta.direction === 'high'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-blue-50 text-blue-600 border-blue-200'
                              }`}>
                                {thresholdStr}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      <p className="text-[11px] text-gray-400 mt-1">{relativeTime(n.timestamp)}</p>
                    </div>

                    {/* Mark-as-read checkmark button */}
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        title="Mark as read"
                        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="2 7 6 11 12 3" />
                        </svg>
                      </button>
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">
              {visible.length} notification{visible.length !== 1 ? 's' : ''}
            </span>
            {unread > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {unread} unread
              </span>
            ) : (
              <span className="text-[11px] text-green-600 font-medium">All read ✓</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};