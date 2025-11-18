import { useState, useEffect, useRef } from 'react';

// Mock WebSocket URL - replace with your actual backend
const WS_URL = 'wss://protonest connect backend-api.com/ws'; 

export const useWebSocket = (deviceId) => {
  const [liveData, setLiveData] = useState({
    moisture: 45,
    temperature: 24,
    humidity: 60,
    light: 800,
    pumpStatus: 'OFF',
    pumpMode: 'Optimal'
  });
  const [isConnected, setIsConnected] = useState(true); // Assume connected for UI testing
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  useEffect(() => {
    if (!deviceId) return;

    // Try to connect to WebSocket, but don't crash if it fails
    const connectWebSocket = () => {
      try {
        const socket = new WebSocket(`${WS_URL}?deviceId=${deviceId}`);
        ws.current = socket;

        socket.onopen = () => {
          console.log('WebSocket Connected');
          setIsConnected(true);
          reconnectAttempts.current = 0;
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLiveData(prev => ({ ...prev, ...data }));
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

        socket.onclose = () => {
          console.log('WebSocket Disconnected');
          setIsConnected(false);
          
          // Attempt to reconnect with backoff
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.pow(2, reconnectAttempts.current) * 1000;
            setTimeout(connectWebSocket, delay);
          }
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setIsConnected(false);
        // Use mock data on connection failure
        setLiveData({
          moisture: 45,
          temperature: 24,
          humidity: 60,
          light: 800,
          pumpStatus: 'OFF',
          pumpMode: 'Optimal'
        });
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [deviceId]);

  return { liveData, isConnected };
};