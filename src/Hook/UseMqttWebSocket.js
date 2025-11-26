import { useState, useEffect, useRef } from "react";
import { mqttWebSocketService } from "../Service/mqttWebSocketService";

// WebSocket configuration
const WS_BASE_URL = "wss://api.protonestconnect.co/ws";

const DEFAULT_MOCK = {
  moisture: 0,
  temperature: 0,
  humidity: 0,
  light: 0,
  battery: 0,
  pumpStatus: "OFF",
  pumpMode: "Optimal",
};

export const useMqttWebSocket = (deviceId, jwtToken) => {
  const [liveData, setLiveData] = useState(DEFAULT_MOCK);
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isMqttConnected, setIsMqttConnected] = useState(false);
  const [connectionType, setConnectionType] = useState("none"); // 'websocket', 'mqtt', 'both', 'none'

  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const mqttConnectedRef = useRef(false);

  // MQTT Data Handler
  const handleMqttData = (data) => {
    console.log(`[MQTT] Received ${data.sensorType} data:`, data.value);

    setLiveData((prev) => {
      const updated = { ...prev };

      // Map MQTT sensor types to our data structure
      switch (data.sensorType) {
        case "temp":
          updated.temperature = parseFloat(data.value);
          break;
        case "humidity":
          updated.humidity = parseFloat(data.value);
          break;
        case "battery":
          updated.battery = parseFloat(data.value);
          break;
        case "light":
          updated.light = parseFloat(data.value);
          break;
        case "moisture":
          updated.moisture = parseFloat(data.value);
          break;
        case "pumpStatus":
          updated.pumpStatus = data.value; // 'ON' or 'OFF'
          console.log(`[MQTT] Pump status updated to: ${data.value}`);
          break;
        case "pumpMode":
          updated.pumpMode = data.value; // 'Optimal', 'Manual', etc.
          console.log(`[MQTT] Pump mode updated to: ${data.value}`);
          break;
      }

      console.log(`[MQTT] Updated liveData:`, updated);
      return updated;
    });

    // Add to chart data for sensor readings (not for pump status or pump mode)
    if (data.sensorType !== "pumpStatus" && data.sensorType !== "pumpMode") {
      setChartData((prev) => {
        const currentTime = new Date(data.timestamp);
        const timeStr = currentTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        // Find if we have a recent entry (within last 30 seconds)
        const recentIndex = prev.findIndex((point) => {
          const pointTime = new Date(point.timestamp);
          return currentTime - pointTime < 30000; // 30 seconds
        });

        if (recentIndex >= 0) {
          // Update existing point
          const updated = [...prev];
          updated[recentIndex] = {
            ...updated[recentIndex],
            time: timeStr,
            timestamp: data.timestamp,
            [data.sensorType === "temp" ? "temperature" : data.sensorType]:
              parseFloat(data.value),
          };
          return updated;
        } else {
          // Create new point
          const newPoint = {
            time: timeStr,
            timestamp: data.timestamp,
            moisture: prev[prev.length - 1]?.moisture || 0,
            temperature: prev[prev.length - 1]?.temperature || 0,
            humidity: prev[prev.length - 1]?.humidity || 0,
            light: prev[prev.length - 1]?.light || 0,
            battery: prev[prev.length - 1]?.battery || 0,
            [data.sensorType === "temp" ? "temperature" : data.sensorType]:
              parseFloat(data.value),
          };

          const updated = [...prev, newPoint];
          return updated.slice(-50); // Keep only last 50 points
        }
      });
    }
  };

  // Pump control function
  const controlPump = (deviceId, status) => {
    console.log(`[MQTT] Controlling pump for ${deviceId}: ${status}`);
    return mqttWebSocketService.publishPumpControl(deviceId, status);
  };

  // Initialize MQTT Connection
  useEffect(() => {
    let isMounted = true;

    const initMqtt = async () => {
      try {
        console.log("[MQTT] 🔄 Initializing connection to ProtoNest WebSocket");
        console.log("[MQTT] 📡 Attempting WebSocket connection...");

        // Use real MQTT connection with JWT token
        await mqttWebSocketService.connect(false, jwtToken);

        if (isMounted) {
          setIsMqttConnected(true);
          mqttConnectedRef.current = true;

          const status = mqttWebSocketService.getConnectionStatus();
          console.log(`[MQTT] ✅ Service ready in ${status.mode} mode`);

          if (status.mode === "simulation") {
            console.log("[MQTT] 💡 Running in simulation mode");
            console.log(
              "[MQTT]    • Publish to MQTT topics via MQTTX to see live data"
            );
          }
        }
      } catch (error) {
        console.error("[MQTT] ❌ Service initialization failed:", error);
        if (isMounted) {
          setIsMqttConnected(false);
          mqttConnectedRef.current = false;
        }
      }
    };

    // Set up MQTT event listeners
    mqttWebSocketService.onConnect(() => {
      if (isMounted) {
        setIsMqttConnected(true);
        mqttConnectedRef.current = true;
      }
    });

    mqttWebSocketService.onDisconnect(() => {
      if (isMounted) {
        setIsMqttConnected(false);
        mqttConnectedRef.current = false;
      }
    });

    initMqtt();

    return () => {
      isMounted = false;
      mqttWebSocketService.disconnect();
    };
  }, [jwtToken]);

  // Subscribe to MQTT topics when device changes
  useEffect(() => {
    if (!deviceId || !mqttConnectedRef.current) return;

    console.log(`[MQTT] Setting up subscriptions for device: ${deviceId}`);

    const success = mqttWebSocketService.subscribeToDevice(
      deviceId,
      handleMqttData
    );

    if (success) {
      console.log(`[MQTT] Successfully subscribed to ${deviceId} topics`);
    }

    return () => {
      console.log(`[MQTT] Cleaning up subscriptions for device: ${deviceId}`);
      mqttWebSocketService.unsubscribeFromDevice(deviceId);
    };
  }, [deviceId, isMqttConnected]);

  // WebSocket Connection (existing logic for API connection)
  useEffect(() => {
    if (!deviceId || !jwtToken) {
      console.warn("[WS] Missing deviceId or JWT token");
      return;
    }

    if (jwtToken.includes("MOCK_TOKEN_FOR_TESTING")) {
      console.log(
        "[WS] Mock token detected - skipping real WebSocket connection"
      );
      return;
    }

    let isComponentMounted = true;

    const connectWebSocket = async () => {
      try {
        if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
          ws.current.close();
        }

        const url = `${WS_BASE_URL}?token=${encodeURIComponent(jwtToken)}`;
        console.log("[WS] Connecting to:", WS_BASE_URL);

        const socket = new WebSocket(url);
        ws.current = socket;

        socket.onopen = () => {
          if (!isComponentMounted) {
            socket.close();
            return;
          }

          console.log("[WS] Connected successfully");
          setIsWebSocketConnected(true);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }

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

            // Handle WebSocket data (existing logic)
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
            } else if (
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
            } else if (
              payload.messageType === "alerts" ||
              payload.type === "alerts"
            ) {
              setAlerts(payload.data || []);
            }
          } catch (err) {
            console.error("[WS] Parse error:", err);
          }
        };

        socket.onclose = (event) => {
          if (isComponentMounted) {
            setIsWebSocketConnected(false);
            console.log(`[WS] Connection closed - Code: ${event.code}`);

            if (event.code !== 1000 && isComponentMounted) {
              console.log("[WS] Attempting reconnection in 5 seconds...");
              reconnectTimeoutRef.current = setTimeout(() => {
                if (isComponentMounted) {
                  connectWebSocket();
                }
              }, 5000);
            }
          }
        };

        socket.onerror = (err) => {
          console.error("[WS] Error:", err);
          if (isComponentMounted) {
            setIsWebSocketConnected(false);
          }
        };
      } catch (err) {
        console.error("[WS] Init failed:", err);
        if (isComponentMounted) {
          setIsWebSocketConnected(false);
        }
      }
    };

    connectWebSocket();

    return () => {
      isComponentMounted = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.close(1000, "Component unmounting");
      }
    };
  }, [deviceId, jwtToken]);

  // Update connection type based on active connections
  useEffect(() => {
    if (isWebSocketConnected && isMqttConnected) {
      setConnectionType("both");
    } else if (isWebSocketConnected) {
      setConnectionType("websocket");
    } else if (isMqttConnected) {
      setConnectionType("mqtt");
    } else {
      setConnectionType("none");
    }
  }, [isWebSocketConnected, isMqttConnected]);

  return {
    liveData,
    chartData,
    alerts,
    isConnected: isWebSocketConnected || isMqttConnected,
    connectionStatus: {
      websocket: isWebSocketConnected,
      mqtt: isMqttConnected,
      type: connectionType,
    },
    // Export pump control function
    controlPump,
  };
};
