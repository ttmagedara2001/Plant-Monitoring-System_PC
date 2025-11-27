// Browser-compatible MQTT service with fallback to simulation for development

// ProtoNest WebSocket URL
const WS_BASE_URL = "wss://api.protonestconnect.co/ws";

class MQTTWebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
    this.connectionCallbacks = [];
    this.disconnectionCallbacks = [];
    this.deviceId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.simulationMode = false;
    this.mockDataInterval = null;
    this.jwtToken = null;
    this.keepAliveInterval = null;
  }

  // Connect to MQTT via WebSocket with comprehensive fallback
  connect(forceSimulation = false, jwtToken = null) {
    return new Promise((resolve, reject) => {
      if (forceSimulation) {
        this.startSimulationMode();
        resolve();
        return;
      }

      if (!jwtToken) {
        console.warn("⚠️ No JWT token provided, switching to simulation mode");
        this.startSimulationMode();
        resolve();
        return;
      }

      this.jwtToken = jwtToken;
      console.log("🔄 Connecting to Protonest WebSocket...");

      try {
        // Connect to Protonest WebSocket with JWT token
        const url = `${WS_BASE_URL}?token=${encodeURIComponent(jwtToken)}`;
        console.log(`🌐 Connecting to: ${WS_BASE_URL}`);

        const ws = new WebSocket(url);
        const connectionTimeout = setTimeout(() => {
          console.log(`⏰ Connection timeout (100s)`);
          ws.close();
          console.log("🎲 Falling back to simulation mode...");
          this.startSimulationMode();
          resolve();
        }, 100000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log(`✅ WebSocket Connected successfully to Protonest`);
          this.ws = ws;
          this.isConnected = true;
          this.simulationMode = false;
          this.reconnectAttempts = 0;

          // Start keepalive ping every 30 seconds to prevent timeout
          this.startKeepAlive();

          this.connectionCallbacks.forEach((callback) => callback());
          resolve();
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error(`❌ WebSocket connection failed:`, error);
          console.log("🎲 Falling back to simulation mode...");
          this.startSimulationMode();
          resolve();
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log(`🔴 WebSocket closed. Code: ${event.code}`);

          if (this.isConnected) {
            // This was an unexpected close of a working connection
            this.isConnected = false;
            this.disconnectionCallbacks.forEach((callback) => callback());
            this.handleReconnection();
          } else {
            // Initial connection failed
            console.log("🎲 Switching to simulation mode...");
            this.startSimulationMode();
            resolve();
          }
        };

        ws.onmessage = (event) => {
          console.log("[MQTT-WS] 📨 Raw WebSocket data received:", event.data);
          this.handleMQTTMessage(event.data);
        };
      } catch (error) {
        console.error(`❌ Failed to create WebSocket:`, error);
        this.startSimulationMode();
        resolve();
      }
    });
  }

  // Try multiple connection URLs sequentially
  tryConnectionUrls(urls, index, resolve, reject) {
    if (index >= urls.length) {
      console.warn("🔄 All MQTT WebSocket connection attempts failed.");
      console.log("💡 The MQTT broker may not support WebSocket connections.");
      console.log("🎲 Switching to simulation mode for development...");
      this.startSimulationMode();
      resolve();
      return;
    }

    const url = urls[index];
    console.log(
      `🌐 Attempting MQTT connection ${index + 1}/${urls.length}: ${url}`
    );

    try {
      const ws = new WebSocket(url, ["mqtt"]);
      const connectionTimeout = setTimeout(() => {
        console.log(`⏰ Connection timeout for ${url} (5s)`);
        ws.close();
        // Move to next URL without excessive logging
        setTimeout(() => {
          this.tryConnectionUrls(urls, index + 1, resolve, reject);
        }, 100);
      }, 5000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(`✅ MQTT WebSocket Connected successfully to: ${url}`);
        this.ws = ws;
        this.isConnected = true;
        this.simulationMode = false;
        this.reconnectAttempts = 0;
        this.connectionCallbacks.forEach((callback) => callback());
        this.sendMQTTConnect();
        resolve();
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        // Only log first few errors to reduce spam
        if (index < 2) {
          console.log(`❌ Connection failed for ${url}`);
        }
        // Move to next URL
        setTimeout(() => {
          this.tryConnectionUrls(urls, index + 1, resolve, reject);
        }, 100);
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);

        if (index < 2) {
          console.log(`🔴 WebSocket closed for ${url}. Code: ${event.code}`);
        }

        if (this.isConnected) {
          // This was an unexpected close of a working connection
          this.isConnected = false;
          this.disconnectionCallbacks.forEach((callback) => callback());
          this.handleReconnection();
        } else {
          // This was a failed connection attempt, try next
          setTimeout(() => {
            this.tryConnectionUrls(urls, index + 1, resolve, reject);
          }, 100);
        }
      };

      ws.onmessage = (event) => {
        this.handleMQTTMessage(event.data);
      };
    } catch (error) {
      console.error(`❌ Failed to create WebSocket for ${url}:`, error);
      setTimeout(() => {
        this.tryConnectionUrls(urls, index + 1, resolve, reject);
      }, 100);
    }
  }

  // Start simulation mode as fallback
  startSimulationMode() {
    console.log("🎲 MQTT Simulation Mode Active");
    console.log("📡 Ready to receive sensor data from:");
    console.log("   • Your MQTTX client");
    console.log("   • Or any MQTT publisher");
    console.log("📋 Publish to these topics to see live data:");
    console.log("   • protonest/device200300/stream/temp");
    console.log("   • protonest/device200300/stream/humidity");
    console.log("   • protonest/device200300/stream/moisture");
    console.log("   • protonest/device200300/stream/light");
    console.log("   • protonest/device200300/stream/battery");
    console.log("🎲 For now, generating realistic simulation data...");

    this.isConnected = true;
    this.simulationMode = true;
    this.connectionCallbacks.forEach((callback) => callback());
  }

  // Handle reconnection after unexpected disconnect
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(
        "🔄 Max reconnection attempts reached. Using simulation mode."
      );
      this.startSimulationMode();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    console.log(
      `🔄 Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      this.connect(false, this.jwtToken);
    }, delay);
  }

  // Subscribe to device topics via WebSocket
  subscribeToDevice(deviceId, onDataReceived) {
    if (!this.isConnected) {
      console.warn("⚠️ WebSocket not connected, cannot subscribe");
      return false;
    }

    this.deviceId = deviceId;

    console.log(`🔄 Subscribing to device topics for: ${deviceId}`);

    // Store message handler for this device
    this.messageHandlers.set(deviceId, onDataReceived);

    if (this.simulationMode) {
      console.log("🎲 Simulation mode - ready to receive MQTT data");
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Subscribe to MQTT device topics via WebSocket
      const subscriptions = [
        // Try wildcard subscription first
        { action: "subscribe", topic: `protonest/${deviceId}/#` },
        // Also subscribe to specific topics as backup
        { action: "subscribe", topic: `protonest/${deviceId}/stream/temp` },
        { action: "subscribe", topic: `protonest/${deviceId}/stream/humidity` },
        { action: "subscribe", topic: `protonest/${deviceId}/stream/battery` },
        { action: "subscribe", topic: `protonest/${deviceId}/stream/light` },
        { action: "subscribe", topic: `protonest/${deviceId}/stream/moisture` },
        {
          action: "subscribe",
          topic: `protonest/${deviceId}/state/pump`,
        },
      ];

      subscriptions.forEach((sub) => {
        try {
          this.ws.send(JSON.stringify(sub));
          console.log(`✅ Subscribed to: ${sub.topic}`);
          this.subscriptions.set(sub.topic, deviceId);
        } catch (error) {
          console.error(`❌ Failed to subscribe to ${sub.topic}:`, error);
        }
      });
    }

    return true;
  }
  startKeepAlive() {
    // Clear any existing interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    // Send ping every 30 seconds
    this.keepAliveInterval = setInterval(() => {
      if (
        this.ws &&
        this.ws.readyState === WebSocket.OPEN &&
        !this.simulationMode
      ) {
        try {
          // Send a ping message - format depends on server requirements
          this.ws.send(JSON.stringify({ action: "ping" }));
          console.log("🏓 Sent keepalive ping");
        } catch (error) {
          console.error("❌ Failed to send keepalive:", error);
        }
      }
    }, 30000); // 30 seconds
  }

  // Stop keepalive ping
  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  // Handle incoming MQTT messages
  handleMQTTMessage(data) {
    try {
      const message = typeof data === "string" ? JSON.parse(data) : data;

      // Log message type for debugging
      if (message.type === "pong" || message.action === "pong") {
        console.log("🏓 Received keepalive pong");
        return; // Don't process pong messages further
      }

      console.log("📥 MQTT Message received:", message);

      if (message.topic && message.payload !== undefined) {
        const topicParts = message.topic.split("/");
        // ["protonest", "device200300", "stream","temp"] - correct

        if (topicParts.length >= 4 && topicParts[0] === "protonest") {
          const deviceId = topicParts[1];
          const messageType = topicParts[2]; // 'stream' or 'state'
          const sensorType = topicParts[3]; // 'temp', 'humidity', etc.

          const handler = this.messageHandlers.get(deviceId);
          if (handler) {
            if (messageType === "stream") {
              // Parse payload - it could be JSON object like {"temp":"30"} or plain value
              let sensorValue;

              try {
                // Try parsing as JSON first (for your MQTTX format)
                const payloadObj = JSON.parse(message.payload);

                // Extract value based on sensor type
                if (sensorType === "temp" && payloadObj.temp !== undefined) {
                  sensorValue = parseFloat(payloadObj.temp);
                } else if (
                  sensorType === "moisture" &&
                  payloadObj.moisture !== undefined
                ) {
                  sensorValue = parseFloat(payloadObj.moisture);
                } else if (
                  sensorType === "humidity" &&
                  payloadObj.humidity !== undefined
                ) {
                  sensorValue = parseFloat(payloadObj.humidity);
                } else if (
                  sensorType === "light" &&
                  payloadObj.light !== undefined
                ) {
                  sensorValue = parseFloat(payloadObj.light);
                } else if (
                  sensorType === "battery" &&
                  payloadObj.battery !== undefined
                ) {
                  sensorValue = parseFloat(payloadObj.battery);
                } else {
                  // Fallback: try to get value directly from the object
                  sensorValue = parseFloat(Object.values(payloadObj)[0]);
                }

                console.log(`📊 Parsed JSON payload for ${sensorType}:`, {
                  original: message.payload,
                  parsed: payloadObj,
                  extractedValue: sensorValue,
                });
              } catch (parseError) {
                // Fallback to plain value parsing (original format)
                sensorValue = parseFloat(message.payload);
                console.log(
                  `📊 Parsed plain payload for ${sensorType}:`,
                  sensorValue
                );
              }

              // Only proceed if we got a valid number
              if (!isNaN(sensorValue)) {
                handler({
                  deviceId,
                  sensorType,
                  value: sensorValue,
                  timestamp: new Date().toISOString(),
                  topic: message.topic,
                });
                console.log(`✅ Processed ${sensorType} data: ${sensorValue}`);
              } else {
                console.warn(
                  `⚠️ Invalid sensor value for ${sensorType}:`,
                  message.payload
                );
              }
            } else if (messageType === "state" && sensorType === "pump") {
              // Handle pump control messages - topic: protonest/device200300/state/pump
              // Expected payload format: {"power": "on"} or {"power": "off"}
              // Optional: {"power": "on", "mode": "manual"}
              let pumpValue;
              let pumpMode;

              try {
                const payloadObj = JSON.parse(message.payload);
                // Extract power status and convert to ON/OFF
                if (payloadObj.power !== undefined) {
                  pumpValue = payloadObj.power.toUpperCase(); // "on" -> "ON", "off" -> "OFF"
                } else {
                  // Fallback to other possible field names
                  pumpValue = (
                    payloadObj.status ||
                    payloadObj.state ||
                    Object.values(payloadObj)[0]
                  ).toUpperCase();
                }

                // Extract pump mode if present
                if (payloadObj.mode !== undefined) {
                  pumpMode =
                    payloadObj.mode.charAt(0).toUpperCase() +
                    payloadObj.mode.slice(1).toLowerCase();
                }
              } catch {
                // If not JSON, treat as plain value
                pumpValue = message.payload.toString().toUpperCase();
              }

              // Send pump status update
              handler({
                deviceId,
                sensorType: "pumpStatus",
                value: pumpValue,
                timestamp: new Date().toISOString(),
                topic: message.topic,
              });
              console.log(
                `💧 Processed pump status from ${message.topic}: ${pumpValue}`
              );

              // Send pump mode update if present
              if (pumpMode) {
                handler({
                  deviceId,
                  sensorType: "pumpMode",
                  value: pumpMode,
                  timestamp: new Date().toISOString(),
                  topic: message.topic,
                });
                console.log(
                  `⚙️ Processed pump mode from ${message.topic}: ${pumpMode}`
                );
              }
            }
          } else {
            console.warn(`⚠️ No handler found for device: ${deviceId}`);
          }
        } else {
          console.warn(`⚠️ Invalid topic structure:`, message.topic);
        }
      } else {
        console.warn(`⚠️ Invalid message format:`, message);
      }
    } catch (error) {
      console.error("❌ Error handling MQTT message:", error);
      console.error("Raw message data:", data);
    }
  }

  // Publish pump control command
  publishPumpControl(deviceId, status) {
    const topic = `protonest/${deviceId}/state/pump`;
    // Convert ON/OFF to lowercase for payload: {"power": "on"} or {"power": "off"}
    const payload = { power: status.toLowerCase() };
    console.log(`💧 Publishing pump control to ${topic}:`, payload);
    return this.publish(topic, payload, { qos: 1 });
  }

  // Publish message
  publish(topic, message, options = { qos: 1 }) {
    if (!this.isConnected) {
      console.warn("⚠️ WebSocket not connected, cannot publish");
      return false;
    }

    const messageStr =
      typeof message === "string" ? message : JSON.stringify(message);

    if (this.simulationMode) {
      console.log(`🎲 Simulated publish to ${topic}:`, messageStr);
      // Simulate MQTT feedback for pump control
      setTimeout(() => {
        const handler = this.messageHandlers.get(this.deviceId);
        if (handler && topic.includes("/state/pump")) {
          // Parse the published payload to extract the power status
          try {
            const payloadObj =
              typeof message === "object" ? message : JSON.parse(messageStr);
            const powerStatus = payloadObj.power
              ? payloadObj.power.toUpperCase()
              : messageStr.toUpperCase();

            console.log(`🎲 Simulating pump feedback: ${powerStatus}`);

            handler({
              deviceId: this.deviceId,
              sensorType: "pumpStatus",
              value: powerStatus,
              timestamp: new Date().toISOString(),
              topic: topic,
            });

            // Also simulate pump mode feedback
            handler({
              deviceId: this.deviceId,
              sensorType: "pumpMode",
              value: "Manual",
              timestamp: new Date().toISOString(),
              topic: topic,
            });
          } catch (e) {
            console.error("Failed to simulate pump feedback:", e);
          }
        }
      }, 100);
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Publish via WebSocket - format for ProtoNest backend
      const publishMessage = {
        action: "publish",
        topic: topic,
        payload: messageStr,
      };
      try {
        this.ws.send(JSON.stringify(publishMessage));
        console.log(`📤 Published to ${topic}:`, messageStr);
      } catch (error) {
        console.error(`❌ Failed to publish to ${topic}:`, error);
        return false;
      }
    }

    return true;
  }

  // Unsubscribe from device topics
  unsubscribeFromDevice(deviceId) {
    console.log(`🔄 Unsubscribing from topics for device: ${deviceId}`);

    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }

    const topicsToRemove = [];
    this.subscriptions.forEach((value, topic) => {
      if (value === deviceId) {
        if (
          !this.simulationMode &&
          this.ws &&
          this.ws.readyState === WebSocket.OPEN
        ) {
          const unsubscribeMessage = {
            action: "unsubscribe",
            topic: topic,
          };
          try {
            this.ws.send(JSON.stringify(unsubscribeMessage));
          } catch (error) {
            console.error(`❌ Failed to unsubscribe from ${topic}:`, error);
          }
        }
        topicsToRemove.push(topic);
        console.log(`❌ Unsubscribed from: ${topic}`);
      }
    });

    topicsToRemove.forEach((topic) => this.subscriptions.delete(topic));
    this.messageHandlers.delete(deviceId);
  }

  // Connection event listeners
  onConnect(callback) {
    this.connectionCallbacks.push(callback);
  }

  onDisconnect(callback) {
    this.disconnectionCallbacks.push(callback);
  }

  // Disconnect
  disconnect() {
    console.log("🔌 Disconnecting MQTT service");

    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }

    // Stop keepalive ping
    this.stopKeepAlive();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.isConnected = false;
    this.simulationMode = false;
    this.subscriptions.clear();
    this.messageHandlers.clear();
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      subscriptionCount: this.subscriptions.size,
      activeDevices: Array.from(new Set(this.subscriptions.values())),
      mode: this.simulationMode
        ? "simulation"
        : this.ws
        ? "websocket"
        : "disconnected",
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Export singleton instance
export const mqttWebSocketService = new MQTTWebSocketService();
export default mqttWebSocketService;
