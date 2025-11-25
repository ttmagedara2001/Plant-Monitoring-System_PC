import mqtt from "mqtt";

// MQTT Configuration
const MQTT_CONFIG = {
  host: "mqtts://mqtt.protonest.co",
  port: 8883,
  protocol: "mqtts",
  options: {
    keepalive: 1000,
    clientId: `device200300`,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    will: {
      topic: "WillMsg",
      payload: "Connection Closed abnormally..!",
      qos: 0,
      retain: false,
    },
    rejectUnauthorized: false, // For development, adjust for production
  },
};

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
    this.connectionCallbacks = [];
    this.disconnectionCallbacks = [];
  }

  // Connect to MQTT broker
  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log("🔄 Connecting to MQTT broker:", MQTT_CONFIG.host);

        this.client = mqtt.connect(MQTT_CONFIG.host, {
          port: MQTT_CONFIG.port,
          ...MQTT_CONFIG.options,
        });

        this.client.on("connect", () => {
          console.log("✅ MQTT Connected successfully");
          this.isConnected = true;
          this.connectionCallbacks.forEach((callback) => callback());
          resolve();
        });

        this.client.on("error", (error) => {
          console.error("❌ MQTT Connection error:", error);
          this.isConnected = false;
          reject(error);
        });

        this.client.on("close", () => {
          console.log("🔴 MQTT Connection closed");
          this.isConnected = false;
          this.disconnectionCallbacks.forEach((callback) => callback());
        });

        this.client.on("offline", () => {
          console.log("📴 MQTT Client offline");
          this.isConnected = false;
        });

        this.client.on("reconnect", () => {
          console.log("🔄 MQTT Reconnecting...");
        });

        this.client.on("message", (topic, message) => {
          this.handleMessage(topic, message);
        });

        // Timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error("MQTT connection timeout"));
          }
        }, 30000);
      } catch (error) {
        console.error("❌ MQTT Connection setup error:", error);
        reject(error);
      }
    });
  }

  // Subscribe to device topics
  subscribeToDevice(deviceId, onDataReceived) {
    if (!this.isConnected || !this.client) {
      console.warn("⚠️ MQTT not connected, cannot subscribe");
      return false;
    }

    const topics = [
      `protonest/${deviceId}/stream/temp`,
      `protonest/${deviceId}/stream/humidity`,
      `protonest/${deviceId}/stream/battery`,
      `protonest/${deviceId}/stream/light`,
      `protonest/${deviceId}/stream/moisture`,
    ];

    console.log(`🔄 Subscribing to MQTT topics for device: ${deviceId}`);

    topics.forEach((topic) => {
      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          console.error(`❌ Failed to subscribe to ${topic}:`, error);
        } else {
          console.log(`✅ Subscribed to: ${topic}`);
          this.subscriptions.set(topic, deviceId);
        }
      });
    });

    // Store message handler for this device
    this.messageHandlers.set(deviceId, onDataReceived);
    return true;
  }

  // Unsubscribe from device topics
  unsubscribeFromDevice(deviceId) {
    if (!this.client) return;

    console.log(`🔄 Unsubscribing from MQTT topics for device: ${deviceId}`);

    const topicsToRemove = [];
    this.subscriptions.forEach((value, topic) => {
      if (value === deviceId) {
        this.client.unsubscribe(topic);
        topicsToRemove.push(topic);
        console.log(`❌ Unsubscribed from: ${topic}`);
      }
    });

    topicsToRemove.forEach((topic) => this.subscriptions.delete(topic));
    this.messageHandlers.delete(deviceId);
  }

  // Handle incoming messages
  handleMessage(topic, message) {
    try {
      const messageStr = message.toString();
      console.log(`📥 MQTT Message received on ${topic}:`, messageStr);

      // Extract device ID from topic
      const topicParts = topic.split("/");
      if (topicParts.length >= 3 && topicParts[0] === "protonest") {
        const deviceId = topicParts[1];
        const sensorType = topicParts[3]; // temp, humidity, battery, light, moisture

        // Get the message handler for this device
        const handler = this.messageHandlers.get(deviceId);
        if (handler) {
          // Parse message (could be JSON or plain value)
          let value;
          try {
            const parsed = JSON.parse(messageStr);
            value = parsed.value || parsed.data || parsed;
          } catch (e) {
            value = parseFloat(messageStr);
            if (Number.isNaN(value)) {
              value = messageStr;
            }
          }

          // Call the registered handler with sensor type and value
          try {
            handler(sensorType, value, topic);
          } catch (handlerError) {
            console.error("❌ Error in message handler:", handlerError);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error handling MQTT message:", error);
    }
  }

  // Publish message (for device control)
  publish(topic, message, options = { qos: 1 }) {
    if (!this.isConnected || !this.client) {
      console.warn("⚠️ MQTT not connected, cannot publish");
      return false;
    }

    const messageStr =
      typeof message === "string" ? message : JSON.stringify(message);

    this.client.publish(topic, messageStr, options, (error) => {
      if (error) {
        console.error(`❌ Failed to publish to ${topic}:`, error);
      } else {
        console.log(`📤 Published to ${topic}:`, messageStr);
      }
    });

    return true;
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
    if (this.client) {
      console.log("🔌 Disconnecting MQTT client");
      this.client.end();
      this.isConnected = false;
      this.subscriptions.clear();
      this.messageHandlers.clear();
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      subscriptionCount: this.subscriptions.size,
      activeDevices: Array.from(new Set(this.subscriptions.values())),
    };
  }
}

// Export singleton instance
export const mqttService = new MQTTService();
export default mqttService;
