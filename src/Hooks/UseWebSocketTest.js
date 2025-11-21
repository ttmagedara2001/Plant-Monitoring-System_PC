// import { useState, useEffect, useRef, useCallback } from "react";
// import api from "../Services/api";

// const WS_BASE_URL =
//   import.meta.env.VITE_WS_BASE_URL || 
//   "wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws";

// const DEFAULT_MOCK = {
//   moisture: 45,
//   temperature: 24,
//   humidity: 60,
//   light: 800,
//   pumpStatus: "OFF",
//   pumpMode: "Optimal",
// };

// export const useWebSocket = (deviceId) => {
//   const [liveData, setLiveData] = useState(DEFAULT_MOCK);
//   const [isConnected, setIsConnected] = useState(false);
//   const [connectionError, setConnectionError] = useState(null);
//   const ws = useRef(null);
//   const reconnectTimeout = useRef(null);
//   const reconnectAttempts = useRef(0);
//   const MAX_RECONNECT_ATTEMPTS = 5;

//   // --- Logic to get token ---
//   const fetchJWTToken = useCallback(async () => {
//     try {
//       // 1. Try LocalStorage
//       let token = localStorage.getItem("jwtToken");
//       if (token) {
//         console.log("[WS] Using cached token from localStorage");
//         return token;
//       }

//       console.log("[WS] No local token, fetching from API...");
      
//       // 2. Use Environment Variables for Credentials
//       const email = import.meta.env.VITE_USER_EMAIL;
//       const password = import.meta.env.VITE_USER_PASSWORD;

//       if (!email || !password) {
//         throw new Error("Missing credentials in environment variables");
//       }

//       const response = await api.post("/get-token", { email, password });

//       if (response.data?.status === "Success") {
//         const { jwtToken, refreshToken } = response.data.data;
//         localStorage.setItem("jwtToken", jwtToken);
//         localStorage.setItem("refreshToken", refreshToken);
//         console.log("[WS] ✅ Token fetched and stored successfully");
//         return jwtToken;
//       }
//       throw new Error("Auto-login failed: Invalid response");
//     } catch (err) {
//       console.error("[WS] ❌ Token fetch error:", err.message);
//       setConnectionError(`Authentication failed: ${err.message}`);
//       return null;
//     }
//   }, []);

//   // --- Connect WebSocket ---
//   useEffect(() => {
//     let isMounted = true;

//     const connect = async () => {
//       if (!deviceId) {
//         console.warn("[WS] No deviceId provided");
//         return;
//       }

//       // Check if we've exceeded max reconnect attempts
//       if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
//         console.error("[WS] Max reconnection attempts reached");
//         setConnectionError("Failed to connect after multiple attempts");
//         return;
//       }

//       const token = await fetchJWTToken();

//       if (!token) {
//         console.warn("[WS] No token available. Retrying in 5s...");
//         reconnectAttempts.current += 1;
//         reconnectTimeout.current = setTimeout(connect, 5000);
//         return;
//       }

//       // Close existing connection if any
//       if (ws.current) {
//         ws.current.close();
//       }

//       // Encode token to handle special characters safely
//       const wsUrl = `${WS_BASE_URL}?token=${encodeURIComponent(token)}`;
//       console.log("[WS] 🔌 Connecting to WebSocket...");

//       const socket = new WebSocket(wsUrl);
//       ws.current = socket;

//       socket.onopen = () => {
//         if (isMounted) {
//           console.log("[WS] ✅ Connected successfully!");
//           setIsConnected(true);
//           setConnectionError(null);
//           reconnectAttempts.current = 0; // Reset on successful connection
//         }
//       };

//       socket.onmessage = (event) => {
//         if (!isMounted) return;
//         try {
//           const data = JSON.parse(event.data);
          
//           if (import.meta.env.VITE_DEBUG_LOGS === 'true') {
//             console.log("[WS] 📨 Received data:", data);
//           }
          
//           // Handle nested payload structure
//           if (data.payload) {
//             const payload = typeof data.payload === 'string' 
//               ? JSON.parse(data.payload) 
//               : data.payload;
//             setLiveData(prev => ({ ...prev, ...payload }));
//           } else {
//             setLiveData(prev => ({ ...prev, ...data }));
//           }
//         } catch (e) {
//           console.error("[WS] ❌ Parse error:", e);
//         }
//       };

//       socket.onclose = (event) => {
//         if (isMounted) {
//           console.log(`[WS] ⚠️ Disconnected (code: ${event.code})`);
//           setIsConnected(false);
          
//           // Don't reconnect if it was a normal closure
//           if (event.code !== 1000) {
//             reconnectAttempts.current += 1;
//             const delay = Math.min(5000 * reconnectAttempts.current, 30000);
//             console.log(`[WS] Reconnecting in ${delay/1000}s...`);
//             reconnectTimeout.current = setTimeout(connect, delay);
//           }
//         }
//       };

//       socket.onerror = (err) => {
//         console.error("[WS] ❌ WebSocket error:", err);
//         setConnectionError("WebSocket connection error");
//         if (ws.current) ws.current.close();
//       };
//     };

//     connect();

//     return () => {
//       isMounted = false;
//       if (ws.current) {
//         ws.current.close();
//       }
//       clearTimeout(reconnectTimeout.current);
//     };
//   }, [deviceId, fetchJWTToken]);

//   // Function to manually send messages through WebSocket
//   const send = useCallback((message) => {
//     if (ws.current && ws.current.readyState === WebSocket.OPEN) {
//       ws.current.send(JSON.stringify(message));
//       console.log("[WS] 📤 Sent message:", message);
//     } else {
//       console.warn("[WS] Cannot send message - WebSocket not connected");
//     }
//   }, []);

//   return { 
//     liveData, 
//     isConnected, 
//     connectionError,
//     send 
//   };
// };

// export default useWebSocket;

import { useState, useEffect, useRef } from 'react';

// Use the real Azure WebSocket URL
const WS_BASE_URL = 'wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws';

const DEFAULT_MOCK = {
  moisture: 0,
  temperature: 0,
  humidity: 0,
  light: 0,
  pumpStatus: 'OFF',
  pumpMode: 'Optimal'
};

export const useWebSocket = (deviceId, jwtToken) => {
  const [liveData, setLiveData] = useState(DEFAULT_MOCK);
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const ws = useRef(null);

  useEffect(() => {
    // Task 3.4.2: Validating JWT existence before connecting
    if (!deviceId || !jwtToken) return;

    let socket;
    try {
      const url = `${WS_BASE_URL}?token=${encodeURIComponent(jwtToken)}`;
      console.log('[WS] Connecting...');
      
      socket = new WebSocket(url);
      ws.current = socket;

      socket.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        
        // Task 3.1.2: Subscribe to the specific device
        const subscribeMsg = {
          messageType: "subscribe",
          deviceId: deviceId
        };
        socket.send(JSON.stringify(subscribeMsg));
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          // Task 3.1.1: Process incoming stream data
          if (payload.messageType === 'sensor_update') {
            // Safety: Convert strings to numbers to prevent toFixed() crashes
            const cleanData = { ...payload.data };
            ['moisture', 'temperature', 'humidity', 'light'].forEach(key => {
                if (cleanData[key] !== undefined) cleanData[key] = Number(cleanData[key]);
            });
            setLiveData(prev => ({ ...prev, ...cleanData }));
          } 
          // Task 3.3.1: Map historical data
          else if (payload.messageType === 'history_batch') {
            if (Array.isArray(payload.data)) {
              setChartData(payload.data);
            }
          }
          // Task 3.2.2: Handle server-side alerts if provided
          else if (payload.messageType === 'alerts') {
            setAlerts(payload.data || []);
          }
          // Fallback for direct payload updates
          else if (payload.data && !payload.messageType) {
             setLiveData(prev => ({ ...prev, ...payload.data }));
          }

        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
      };

      socket.onerror = (err) => {
        console.error('[WS] Error:', err);
        setIsConnected(false);
      };

    } catch (err) {
      console.error('[WS] Init failed:', err);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [deviceId, jwtToken]); // Re-run when deviceId changes (Task 3.1.2)

  return { liveData, chartData, alerts, isConnected };
};