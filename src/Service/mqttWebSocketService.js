// Browser-compatible MQTT service with fallback to simulation for development

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
  }

  // Connect to MQTT via WebSocket with comprehensive fallback
  connect(forceSimulation = false) {
    return new Promise((resolve, reject) => {
      if (forceSimulation) {
        this.startSimulationMode();
        resolve();
        return;
      }

      console.log("🔄 Attempting MQTT connection via WebSocket...");

      // Fixed connection URLs - WebSocket only supports ws:// and wss:// protocols
      const connectionUrls = [
        "wss://mqtt.protonest.co:8883/mqtt", // MQTT over WebSocket with SSL
        "wss://mqtt.protonest.co:9001/mqtt", // Alternative WebSocket port
        "wss://mqtt.protonest.co:8083", // Without /mqtt path
        "wss://mqtt.protonest.co:9001", // Alternative port without path
        "ws://mqtt.protonest.co:8883/mqtt", // Non-secure fallback (if SSL fails)
      ];

      this.tryConnectionUrls(connectionUrls, 0, resolve, reject);
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
      this.connect(false);
    }, delay);
  }

  // Send MQTT CONNECT packet
  sendMQTTConnect() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const connectPacket = {
      type: "connect",
      clientId: `plant_dashboard_${Math.random().toString(16).substr(2, 8)}`,
      keepAlive: 60,
      clean: true,
    };

    try {
      this.ws.send(JSON.stringify(connectPacket));
      console.log("📤 Sent MQTT CONNECT packet");
    } catch (error) {
      console.error("❌ Failed to send CONNECT packet:", error);
    }
  }

  // Subscribe to device topics
  subscribeToDevice(deviceId, onDataReceived) {
    if (!this.isConnected) {
      console.warn("⚠️ MQTT not connected, cannot subscribe");
      return false;
    }

    this.deviceId = deviceId;
    const topics = [
      `protonest/${deviceId}/stream/temp`,
      `protonest/${deviceId}/stream/humidity`,
      `protonest/${deviceId}/stream/battery`,
      `protonest/${deviceId}/stream/light`,
      `protonest/${deviceId}/stream/moisture`,
      `protonest/${deviceId}/state/motor/paddy`,
    ];

    console.log(`🔄 Subscribing to MQTT topics for device: ${deviceId}`);

    // Store message handler for this device
    this.messageHandlers.set(deviceId, onDataReceived);

    if (this.simulationMode) {
      // Simulate subscription in simulation mode
      topics.forEach((topic) => {
        console.log(`🎲 Simulated subscription to: ${topic}`);
        this.subscriptions.set(topic, deviceId);
      });
      // MOCK DATA GENERATION DISABLED - Waiting for real MQTT data only
      // this.startMockDataGeneration(deviceId, onDataReceived);
      console.log("📡 Ready to receive real MQTT data - no simulation running");
    } else {
      // Real WebSocket subscription
      topics.forEach((topic) => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const subscribePacket = {
            type: "subscribe",
            topic: topic,
            qos: 1,
          };
          try {
            this.ws.send(JSON.stringify(subscribePacket));
            console.log(`✅ Subscribed to: ${topic}`);
            this.subscriptions.set(topic, deviceId);
          } catch (error) {
            console.error(`❌ Failed to subscribe to ${topic}:`, error);
          }
        }
      });
    }

    return true;
  }

  // MOCK DATA GENERATION - COMMENTED OUT
  // Generate realistic mock sensor data with better variation
  // startMockDataGeneration(deviceId, onDataReceived) {
  //   if (this.mockDataInterval) {
  //     clearInterval(this.mockDataInterval);
  //   }

  //   console.log(`🎲 Starting realistic sensor simulation for device: ${deviceId}`);

  //   // More realistic initial values based on typical agricultural sensors
  //   let sensorState = {
  //     moisture: 45 + Math.random() * 20, // 45-65% (good range)
  //     temperature: 22 + Math.random() * 8, // 22-30°C (optimal range)
  //     humidity: 55 + Math.random() * 25, // 55-80% (typical range)
  //     light: 400 + Math.random() * 600, // 400-1000 lux (variable daylight)
  //     battery: 75 + Math.random() * 20, // 75-95% (good battery health)
  //     pumpStatus: 'OFF'
  //   };

  //   // Simulate daily cycles and realistic sensor patterns
  //   let timeOfDay = 0; // Simulated hour counter

  //   this.mockDataInterval = setInterval(() => {
  //     timeOfDay += 0.1; // Increment time slowly

  //     // Daily cycle influences (more realistic)
  //     const dayFactor = Math.sin((timeOfDay / 24) * 2 * Math.PI); // Day/night cycle
  //     const noiseFactor = (Math.random() - 0.5) * 2; // Random variation

  //     // Natural sensor evolution with daily patterns
  //     sensorState.temperature += dayFactor * 0.5 + noiseFactor * 0.3;
  //     sensorState.humidity -= dayFactor * 2 + noiseFactor * 1;
  //     sensorState.light += dayFactor * 100 + noiseFactor * 50;
  //     sensorState.moisture -= Math.random() * 0.2; // Gradual evaporation
  //     sensorState.battery -= Math.random() * 0.05; // Slow discharge

  //     // Keep realistic bounds
  //     sensorState.moisture = Math.max(15, Math.min(85, sensorState.moisture));
  //     sensorState.temperature = Math.max(18, Math.min(35, sensorState.temperature));
  //     sensorState.humidity = Math.max(30, Math.min(90, sensorState.humidity));
  //     sensorState.light = Math.max(100, Math.min(1200, sensorState.light));
  //     sensorState.battery = Math.max(20, Math.min(100, sensorState.battery));

  //     // Smart irrigation simulation
  //     if (sensorState.moisture < 25 && Math.random() < 0.3) {
  //       sensorState.pumpStatus = 'ON';
  //       console.log("💧 Auto irrigation activated (low moisture)");
  //     } else if (sensorState.moisture > 65 && sensorState.pumpStatus === 'ON') {
  //       sensorState.pumpStatus = 'OFF';
  //       console.log("💧 Auto irrigation stopped (sufficient moisture)");
  //     }

  //     // Solar recharge simulation
  //     if (sensorState.battery < 30 && sensorState.light > 800) {
  //       sensorState.battery += Math.random() * 2;
  //       console.log("🔋 Solar charging active");
  //     }

  //     // Update pump status if changed
  //     if (Math.random() < 0.1) { // 10% chance to send pump status
  //       onDataReceived({
  //         deviceId,
  //         sensorType: 'pumpStatus',
  //         value: sensorState.pumpStatus,
  //         timestamp: new Date().toISOString(),
  //         topic: `protonest/${deviceId}/state/motor/paddy`
  //       });
  //     }

  //     // Send random sensor update
  //     const sensors = ['moisture', 'temp', 'humidity', 'light', 'battery'];
  //     const randomSensor = sensors[Math.floor(Math.random() * sensors.length)];

  //     let value = sensorState[randomSensor === 'temp' ? 'temperature' : randomSensor];
  //     value = Math.round(value * 10) / 10; // Round to 1 decimal

  //     onDataReceived({
  //       deviceId,
  //       sensorType: randomSensor,
  //       value,
  //       timestamp: new Date().toISOString(),
  //       topic: `protonest/${deviceId}/stream/${randomSensor}`
  //     });

  //   }, 3000 + Math.random() * 4000); // 3-7 second intervals (more realistic)
  // }

  // Handle incoming MQTT messages
  handleMQTTMessage(data) {
    try {
      const message = typeof data === "string" ? JSON.parse(data) : data;
      console.log("📥 MQTT Message received:", message);

      if (message.topic && message.payload !== undefined) {
        const topicParts = message.topic.split("/");

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
            } else if (messageType === "state" && sensorType === "motor") {
              // Handle pump control messages
              let pumpValue;

              try {
                const payloadObj = JSON.parse(message.payload);
                pumpValue =
                  payloadObj.status ||
                  payloadObj.state ||
                  Object.values(payloadObj)[0];
              } catch {
                pumpValue = message.payload;
              }

              handler({
                deviceId,
                sensorType: "pumpStatus",
                value: pumpValue,
                timestamp: new Date().toISOString(),
                topic: message.topic,
              });
              console.log(`✅ Processed pump status: ${pumpValue}`);
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
    const topic = `protonest/${deviceId}/state/motor/paddy`;
    return this.publish(topic, status, { qos: 1 });
  }

  // Publish message
  publish(topic, message, options = { qos: 1 }) {
    if (!this.isConnected) {
      console.warn("⚠️ MQTT not connected, cannot publish");
      return false;
    }

    const messageStr =
      typeof message === "string" ? message : JSON.stringify(message);

    if (this.simulationMode) {
      console.log(`🎲 Simulated publish to ${topic}:`, messageStr);
      // PUMP SIMULATION DISABLED - Only real MQTT feedback will update pump status
      // setTimeout(() => {
      //   const handler = this.messageHandlers.get(this.deviceId);
      //   if (handler && topic.includes("/state/motor/paddy")) {
      //     handler({
      //       deviceId: this.deviceId,
      //       sensorType: "pumpStatus",
      //       value: messageStr,
      //       timestamp: new Date().toISOString(),
      //       topic: topic,
      //     });
      //   }
      // }, 100);
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const publishPacket = {
        type: "publish",
        topic: topic,
        payload: messageStr,
        qos: options.qos || 1,
      };
      try {
        this.ws.send(JSON.stringify(publishPacket));
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
          const unsubscribePacket = {
            type: "unsubscribe",
            topic: topic,
          };
          try {
            this.ws.send(JSON.stringify(unsubscribePacket));
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
