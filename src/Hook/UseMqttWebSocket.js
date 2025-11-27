import { useState, useEffect, useRef } from "react";
import { mqttWebSocketService } from "../Service/mqttWebSocketService";

// WebSocket configuration
const WS_BASE_URL = "wss://api.protonestconnect.co/ws";

// Use WebSocket-based MQTT (the bridge needs to be configured on ProtoNest side)
const USE_DIRECT_MQTT = false;

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
  const [alerts, setAlerts] = useState([]);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isMqttConnected, setIsMqttConnected] = useState(false);
  const [connectionType, setConnectionType] = useState("none"); // 'websocket', 'mqtt', 'both', 'none'

  const ws = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const mqttConnectedRef = useRef(false);

  // MQTT Data Handler - Real-time display only
  const handleMqttData = (data) => {
    console.log(`[MQTT] 📡 Real-time ${data.sensorType}:`, data.value);

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
          console.log(`[MQTT] 🚨 Pump status updated to: ${data.value}`);
          break;
        case "pumpMode":
          updated.pumpMode = data.value; // 'Optimal', 'Manual', etc.
          console.log(`[MQTT] ⚙️ Pump mode updated to: ${data.value}`);
          break;
      }

      return updated;
    });
  };

  // Initialize MQTT Connection
  useEffect(() => {
    let isMounted = true;

    const initMqtt = async () => {
      try {
        // Use WebSocket-based MQTT
        console.log("[MQTT] 🔄 Initializing MQTT WebSocket Service");
        console.log(
          "[MQTT] 📡 This will connect to: wss://api.protonestconnect.co/ws"
        );
        console.log(
          "[MQTT] 📝 Your MQTTX should publish to: mqtt.protonest.co:8883"
        );

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

          console.log("[WS] ✅ Connected successfully to ProtoNest WebSocket");
          console.log("[WS] 🔌 Connection URL:", WS_BASE_URL);
          setIsWebSocketConnected(true);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }

          const subscriptions = [
            // Try wildcard subscription to catch all device topics
            { action: "subscribe", topic: `protonest/${deviceId}/#` },
            // Also subscribe to specific topics
            { action: "subscribe", topic: `protonest/${deviceId}/stream/temp` },
            {
              action: "subscribe",
              topic: `protonest/${deviceId}/stream/moisture`,
            },
            {
              action: "subscribe",
              topic: `protonest/${deviceId}/stream/humidity`,
            },
            {
              action: "subscribe",
              topic: `protonest/${deviceId}/stream/light`,
            },
            {
              action: "subscribe",
              topic: `protonest/${deviceId}/stream/battery`,
            },
            {
              action: "subscribe",
              topic: `protonest/${deviceId}/state/pump`,
            },
          ];

          console.log(
            `[WS] 📡 Subscribing to ${subscriptions.length} MQTT topics for device: ${deviceId}`
          );
          subscriptions.forEach((sub) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify(sub));
              console.log("[WS] ✅ Subscribed to:", sub.topic);
            }
          });

          console.log(
            "[WS] 🎯 WebSocket is now ready to receive MQTT messages"
          );
          console.log("[WS] 📝 Publish to these topics in MQTTX:");
          console.log(`     • protonest/${deviceId}/stream/temp`);
          console.log(`     • protonest/${deviceId}/stream/moisture`);
          console.log(`     • protonest/${deviceId}/stream/humidity`);
          console.log(`     • protonest/${deviceId}/stream/light`);
          console.log(`     • protonest/${deviceId}/stream/battery`);
          console.log(
            `     • protonest/${deviceId}/state/pump (for pump control)`
          );
        };

        socket.onmessage = (event) => {
          if (!isComponentMounted) return;

          // Log ALL WebSocket messages (including non-JSON)
          console.log("[WS] 📥 RAW MESSAGE RECEIVED:", event.data);

          try {
            const payload = JSON.parse(event.data);
            console.log("[WS] 📦 PARSED PAYLOAD:", payload);

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
              console.log("[WS] ✅ Real-time data updated");
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
    alerts,
    isConnected: isWebSocketConnected || isMqttConnected,
    connectionStatus: {
      websocket: isWebSocketConnected,
      mqtt: isMqttConnected,
      type: connectionType,
    },
  };
};
