import { useState, useEffect, useRef } from 'react';

// Public demo PieSocket URL for quick UI testing; replace with your WS server in production
const WS_URL = 'wss://demo.piesocket.com/v3/channel_123?api_key=VCXCEuvhGcBDP7XhiJJUDvR1e1D3eiVjgZ9VRiaV&notify_self';

const DEFAULT_MOCK = {
  moisture: 45,
  temperature: 24,
  humidity: 60,
  light: 800,
  pumpStatus: 'OFF',
  pumpMode: 'Optimal'
};

export const useWebSocket = (deviceId, jwtToken) => {
  const [liveData, setLiveData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    // If no deviceId provided, return mock data and avoid opening sockets
    if (!deviceId) {
      setLiveData(DEFAULT_MOCK);
      setIsConnected(false);
      return;
    }

    let mounted = true;
    let socket;

    try {
      socket = new WebSocket(WS_URL);
      ws.current = socket;

      socket.onopen = () => {
        if (!mounted) return;
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        if (!mounted) return;
        try {
          const parsed = JSON.parse(event.data);
          // merge incoming fields into state (some messages may be partial)
          setLiveData(prev => ({ ...(prev || DEFAULT_MOCK), ...parsed }));
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };

      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        if (!mounted) return;
        setIsConnected(false);
      };

      socket.onclose = () => {
        if (!mounted) return;
        setIsConnected(false);
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setLiveData(DEFAULT_MOCK);
      setIsConnected(false);
    }

    return () => {
      mounted = false;
      if (socket && socket.readyState === WebSocket.OPEN) socket.close();
    };
  }, [deviceId]);

  return { liveData, isConnected };
};
