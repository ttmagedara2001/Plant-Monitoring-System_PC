import { useState, useEffect, useRef } from "react";

// Use the correct WebSocket URL
const WS_BASE_URL =
  "wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io";

const DEFAULT_MOCK = {
  moisture: 0,
  temperature: 0,
  humidity: 0,
  light: 0,
  pumpStatus: "OFF",
  pumpMode: "Optimal",
};

export const useWebSocket = (deviceId, jwtToken) => {
  const [liveData, setLiveData] = useState(DEFAULT_MOCK);
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    // Enhanced validation before connecting
    if (!deviceId || !jwtToken) {
      console.warn("[WS] Missing deviceId or JWT token");
      return;
    }

    // Skip connection for test tokens
    if (jwtToken.includes("your-real-jwt-here")) {
      console.log("[WS] Test token detected - please replace with real JWT");
      return;
    }

    let socket;
    let isComponentMounted = true;

    const connectWebSocket = async () => {
      try {
        // Close existing connection
        if (ws.current) {
          ws.current.close();
        }

        const url = `${WS_BASE_URL}?token=${encodeURIComponent(jwtToken)}`;
        console.log("[WS] Connecting to:", WS_BASE_URL);

        socket = new WebSocket(url);
        ws.current = socket;

        socket.onopen = () => {
          if (!isComponentMounted) {
            socket.close();
            return;
          }

          console.log("[WS] Connected successfully");
          setIsConnected(true);

          // Subscribe to device topics
          const subscriptions = [
            { action: "subscribe", topic: `/topic/state/${deviceId}` },
            { action: "subscribe", topic: `/topic/stream/${deviceId}` },
          ];

          subscriptions.forEach((sub) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify(sub));
              console.log("[WS] Subscribed to:", sub.topic);
            }
          });
        };

        socket.onmessage = (event) => {
          if (!isComponentMounted) return;

          try {
            const payload = JSON.parse(event.data);
            console.log("[WS] Received data:", payload);

            // Handle real-time sensor updates
            if (
              payload.messageType === "sensor_update" ||
              payload.type === "sensor_data"
            ) {
              const cleanData = { ...payload.data };
              [
                "moisture",
                "temperature",
                "humidity",
                "light",
                "battery",
              ].forEach((key) => {
                if (cleanData[key] !== undefined) {
                  cleanData[key] = Number(cleanData[key]);
                }
              });

              if (payload.data.pumpStatus)
                cleanData.pumpStatus = payload.data.pumpStatus;
              if (payload.data.pumpMode)
                cleanData.pumpMode = payload.data.pumpMode;

              setLiveData((prev) => ({ ...prev, ...cleanData }));
              console.log("[WS] Updated live data");
            }
            // Handle historical data
            else if (
              payload.messageType === "history_batch" ||
              payload.type === "historical_data"
            ) {
              if (Array.isArray(payload.data)) {
                const formattedHistory = payload.data.map((item) => ({
                  time: item.timestamp
                    ? new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                  timestamp: item.timestamp || new Date().toISOString(),
                  moisture: Number(item.moisture) || 0,
                  temperature: Number(item.temperature) || 0,
                  humidity: Number(item.humidity) || 0,
                  light: Number(item.light) || 0,
                  battery: Number(item.battery) || 0,
                }));
                setChartData(formattedHistory);
                console.log("[WS] Updated historical data");
              }
            }
            // Handle alerts
            else if (
              payload.messageType === "alerts" ||
              payload.type === "alerts"
            ) {
              setAlerts(payload.data || []);
            }
            // Handle direct data payload
            else if (payload.data && !payload.messageType && !payload.type) {
              const cleanData = { ...payload.data };
              [
                "moisture",
                "temperature",
                "humidity",
                "light",
                "battery",
              ].forEach((key) => {
                if (cleanData[key] !== undefined) {
                  cleanData[key] = Number(cleanData[key]);
                }
              });
              setLiveData((prev) => ({ ...prev, ...cleanData }));
            }
          } catch (err) {
            console.error("[WS] Parse error:", err);
          }
        };

        socket.onclose = (event) => {
          if (isComponentMounted) {
            setIsConnected(false);
            console.log(`[WS] Connection closed - Code: ${event.code}`);

            // Attempt reconnect for abnormal closures
            if (event.code !== 1000) {
              console.log("[WS] Attempting reconnection in 5 seconds...");
              setTimeout(() => {
                if (isComponentMounted) connectWebSocket();
              }, 5000);
            }
          }
        };

        socket.onerror = (err) => {
          console.error("[WS] Error:", err);
          if (isComponentMounted) {
            setIsConnected(false);
          }
        };
      } catch (err) {
        console.error("[WS] Init failed:", err);
        if (isComponentMounted) {
          setIsConnected(false);
        }
      }
    };

    connectWebSocket();

    return () => {
      isComponentMounted = false;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close(1000, "Component unmounting");
      }
    };
  }, [deviceId, jwtToken]);

  return { liveData, chartData, alerts, isConnected };
};
