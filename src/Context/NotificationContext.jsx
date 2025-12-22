import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NotificationContext = createContext(null);

let _id = 1;

const STORAGE_KEY = 'app_notifications_v1';

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // restore _id to avoid collisions
        if (Array.isArray(parsed) && parsed.length > 0) {
          const max = parsed.reduce((m, n) => Math.max(m, n.id || 0), 0);
          _id = Math.max(_id, max + 1);
        }
        return parsed;
      }
    } catch (e) {}
    return [];
  });

  // persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  const addNotification = useCallback((payload) => {
    const note = {
      id: _id++,
      type: payload?.type || 'info',
      message: payload?.message || '',
      meta: payload?.meta || {},
      timestamp: payload?.timestamp || new Date().toISOString(),
      read: false,
    };
    setNotifications((s) => [note, ...s].slice(0, 1000));
    return note.id;
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((s) => s.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  // clear notifications for a specific deviceId (optional) or all if no arg
  const clearAll = useCallback((deviceId) => {
    if (!deviceId) {
      setNotifications([]);
      return;
    }
    setNotifications((s) => s.filter(n => (n.meta && n.meta.deviceId) !== deviceId));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export default NotificationContext;
