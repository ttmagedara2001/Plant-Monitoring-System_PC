import { Client } from "@stomp/stompjs";

// Get JWT token from localStorage (set by login process)
const getJwtToken = () => {
  const token = localStorage.getItem("jwtToken");
  if (!token) {
    console.warn("⚠️ No JWT token found in localStorage. Please login first.");
  }
  return token;
};

// Initialize WebSocket connection
const initializeWebSocket = () => {
  const jwtToken = getJwtToken();
  if (!jwtToken) {
    console.error("❌ Cannot initialize WebSocket: No JWT token available");
    return null;
  }

  // ✅ Encode the token for safe URL usage
  const encodedToken = encodeURIComponent(jwtToken);

  // ✅ Pass the JWT as a query parameter
  // const wsUrl = `ws://localhost:8091/ws?token=${encodedToken}`;
  const wsUrl = `wss://api.protonestconnect.co/ws?token=${encodedToken}`;
  // const wsUrl = `wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token=${encodedToken}`;

  console.log("🔌 Connecting to:", wsUrl.replace(encodedToken, "***TOKEN***"));

  return wsUrl;
};

const wsUrl = initializeWebSocket();

const client = new Client({
  brokerURL: wsUrl, // 👈 JWT now passed in the URL
  reconnectDelay: 5000,
  heartbeatIncoming: 4000,
  heartbeatOutgoing: 4000,

  // ✅ Called when connection succeeds
  // NOTE: This is overridden by WebSocketClient wrapper class below
  onConnect: (frame) => {
    // Wrapper class will handle subscriptions and callbacks
    console.log("✅ Connected (will be replaced by wrapper):", frame);
  },

  // ✅ Called when server sends a STOMP error frame
  onStompError: (frame) => {
    console.error("❌ Broker reported error:", frame.headers["message"]);
    console.error("Details:", frame.body);
  },

  // ✅ Called if the WebSocket fails before STOMP connects
  onWebSocketError: (event) => {
    console.error("🚫 WebSocket error", event);
  },

  // ✅ Called when the socket closes
  onWebSocketClose: (event) => {
    console.warn("🔻 WebSocket closed", event);
  },

  // Optional: verbose debug logs
  debug: (msg) => console.log("🪵 Debug:", msg),
});

// 🚀 Activate the client
client.activate();

/**
 * WebSocket Client Wrapper Class for Dashboard Integration
 * Provides methods to work with the existing STOMP client
 */
class WebSocketClient {
  constructor() {
    this.client = client;
    this.currentDeviceId = null;
    this.subscriptions = new Map();
    this.dataCallback = null;
    this.connectCallback = null;
    this.disconnectCallback = null;
    this.isReady = false;

    // Setup the wrapper to intercept STOMP client's onConnect
    this._setupConnectionHandlers();
  }

  /**
   * Setup connection handlers to intercept STOMP events
   * This replaces the original onConnect to add callback support
   */
  _setupConnectionHandlers() {
    const self = this;

    client.onConnect = (frame) => {
      console.log("✅ WebSocket Connected:", frame);
      self.isReady = true;

      // If we have a device already set, subscribe to it
      if (self.currentDeviceId) {
        self._subscribeToDeviceTopics(self.currentDeviceId);
      }

      // Call user's connect callback
      if (self.connectCallback) {
        self.connectCallback();
      }
    };

    // Setup disconnect handler
    client.onWebSocketClose = (event) => {
      console.warn("🔻 WebSocket closed", event);
      if (self.disconnectCallback) {
        self.disconnectCallback();
      }
    };
  }

  /**
   * Subscribe to device topics dynamically
   * @param {string} deviceId - Device ID to subscribe to
   */
  _subscribeToDeviceTopics(deviceId) {
    const self = this;

    // Subscribe to stream topic - all sensor data comes through this topic
    const streamTopic = `/topic/stream/${deviceId}`;
    const streamSub = this.client.subscribe(streamTopic, (message) => {
      const data = JSON.parse(message.body);
      console.log(`📡 [${deviceId}] Received stream data:`, data);

      // Detect sensor type from message payload and call Dashboard callback
      if (self.dataCallback) {
        // Message structure: {payload: {temp: "55"}, topic: "temp", timestamp: "..."}
        const payload = data.payload || data;
        const topic = data.topic;

        const sensorMap = {
          temp: "temp",
          temperature: "temp",
          humidity: "humidity",
          moisture: "moisture",
          light: "light",
          battery: "battery",
        };

        let found = false;

        // First, try to use the topic field if it exists and matches a sensor type
        if (topic && payload[topic] !== undefined) {
          const sensorType = sensorMap[topic] || topic;
          console.log(
            `🎯 [${deviceId}] Calling Dashboard callback: ${sensorType} = ${payload[topic]}`
          );
          self.dataCallback({
            sensorType: sensorType,
            value: payload[topic],
            timestamp: data.timestamp || new Date().toISOString(),
          });
          found = true;
        } else {
          // Fallback: Check all possible sensor fields in payload
          for (const [key, sensorType] of Object.entries(sensorMap)) {
            if (payload[key] !== undefined) {
              console.log(
                `🎯 [${deviceId}] Calling Dashboard callback: ${sensorType} = ${payload[key]}`
              );
              self.dataCallback({
                sensorType: sensorType,
                value: payload[key],
                timestamp: data.timestamp || new Date().toISOString(),
              });
              found = true;
            }
          }
        }

        if (!found) {
          console.warn(
            `⚠️ [${deviceId}] No recognized sensor field in message:`,
            data
          );
        }
      } else {
        console.warn(
          `⚠️ [${deviceId}] No callback registered yet - data will be lost:`,
          data
        );
      }
    });
    this.subscriptions.set(`stream-${deviceId}`, streamSub);
    console.log(`🔔 Subscribed to ${streamTopic}`);

    // Subscribe to pump state topic
    const stateTopic = `/topic/state/${deviceId}`;
    const stateSub = this.client.subscribe(stateTopic, (message) => {
      const data = JSON.parse(message.body);
      console.log(`🔧 [${deviceId}] Pump state received:`, data);

      // Extract payload (handle nested structure like sensor data)
      const payload = data.payload || data;

      // Call Dashboard callback for pump status
      if (self.dataCallback) {
        // Check for power/status in payload
        const powerValue =
          payload.power || payload.status || payload.pumpStatus;
        if (powerValue !== undefined) {
          // Normalize to uppercase: "on" -> "ON", "off" -> "OFF"
          const normalizedPower = String(powerValue).toUpperCase();
          console.log(
            `🎯 [${deviceId}] Calling Dashboard callback: pumpStatus = ${normalizedPower}`
          );
          self.dataCallback({
            sensorType: "pumpStatus",
            value: normalizedPower,
            timestamp: data.timestamp || new Date().toISOString(),
          });
        }

        // Check for mode in payload
        const modeValue = payload.mode || payload.pumpMode;
        if (modeValue !== undefined) {
          // Normalize mode to lowercase: "MANUAL" -> "manual"
          const normalizedMode = String(modeValue).toLowerCase();
          console.log(
            `🎯 [${deviceId}] Calling Dashboard callback: pumpMode = ${normalizedMode}`
          );
          self.dataCallback({
            sensorType: "pumpMode",
            value: normalizedMode,
            timestamp: data.timestamp || new Date().toISOString(),
          });
        }
      }
    });
    this.subscriptions.set(`state-${deviceId}`, stateSub);
    console.log(`🔔 Subscribed to ${stateTopic}`);
  }

  /**
   * Unsubscribe from device topics
   * @param {string} deviceId - Device ID to unsubscribe from
   */
  _unsubscribeFromDeviceTopics(deviceId) {
    const streamKey = `stream-${deviceId}`;
    const stateKey = `state-${deviceId}`;

    if (this.subscriptions.has(streamKey)) {
      this.subscriptions.get(streamKey).unsubscribe();
      this.subscriptions.delete(streamKey);
      console.log(`🔕 Unsubscribed from /topic/stream/${deviceId}`);
    }

    if (this.subscriptions.has(stateKey)) {
      this.subscriptions.get(stateKey).unsubscribe();
      this.subscriptions.delete(stateKey);
      console.log(`🔕 Unsubscribed from /topic/state/${deviceId}`);
    }
  }

  /**
   * Connect to WebSocket (already connected above, but provides interface compatibility)
   * @param {string} token - JWT token (uses constant token above)
   */
  async connect(token) {
    console.log("[WebSocketClient] Using pre-configured connection");
    return Promise.resolve();
  }

  /**
   * Subscribe to device topics with callback
   * @param {string} deviceIdParam - Device ID to subscribe to
   * @param {Function} callback - Data handler callback
   */
  subscribeToDevice(deviceIdParam, callback) {
    // If switching to a different device, unsubscribe from old one
    if (this.currentDeviceId && this.currentDeviceId !== deviceIdParam) {
      console.log(
        `[WebSocketClient] 🔄 Switching from ${this.currentDeviceId} to ${deviceIdParam}`
      );
      this._unsubscribeFromDeviceTopics(this.currentDeviceId);
    }

    // Update current device and callback
    this.currentDeviceId = deviceIdParam;
    this.dataCallback = callback;
    console.log(
      `[WebSocketClient] Callback registered for device: ${deviceIdParam}`
    );

    // Subscribe to new device if connection is ready
    if (this.isReady && this.isConnected) {
      this._subscribeToDeviceTopics(deviceIdParam);
    } else {
      console.log(
        `[WebSocketClient] Will subscribe to ${deviceIdParam} when connection is ready`
      );
    }

    return true;
  }

  /**
   * Check if connected
   */
  get isConnected() {
    return this.client?.connected || false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Register connect callback
   */
  onConnect(callback) {
    this.connectCallback = callback;
    // If already connected, call immediately
    if (this.isConnected) {
      callback();
    }
  }

  /**
   * Register disconnect callback
   */
  onDisconnect(callback) {
    this.disconnectCallback = callback;
  }

  /**
   * Send pump command
   */
  sendPumpCommand(deviceIdParam, power, mode = null) {
    if (!this.isConnected) {
      console.warn("[WebSocketClient] Cannot send command - not connected");
      return false;
    }

    const destination = `protonest/${deviceIdParam}/state/motor/paddy`;
    const payload = { power: power.toLowerCase() };

    if (mode) {
      payload.mode = mode.toLowerCase();
    }

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(payload),
      });
      console.log(`[WebSocketClient] 📤 Sent pump command:`, payload);
      return true;
    } catch (error) {
      console.error("[WebSocketClient] ❌ Failed to send pump command:", error);
      return false;
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    console.log("[WebSocketClient] Disconnect called (client persists)");
  }

  /**
   * Enable testing mode
   */
  enableTestingMode() {
    if (typeof window === "undefined") return;

    window.sendPumpCommand = (power, mode = null) => {
      if (!this.currentDeviceId) {
        console.error("❌ No device selected. Subscribe to a device first.");
        return false;
      }
      return this.sendPumpCommand(this.currentDeviceId, power, mode);
    };

    window.simulateSensorData = (sensorType, value) => {
      if (!this.isConnected) {
        console.error("❌ Not connected");
        return false;
      }

      if (!this.currentDeviceId) {
        console.error("❌ No device selected. Subscribe to a device first.");
        return false;
      }

      const destination = `protonest/${this.currentDeviceId}/stream/${sensorType}`;
      const payload = { [sensorType]: String(value) };

      try {
        this.client.publish({
          destination,
          body: JSON.stringify(payload),
        });
        console.log("📤 Simulated:", payload);
        return true;
      } catch (error) {
        console.error("❌ Failed:", error);
        return false;
      }
    };

    window.wsInfo = () => {
      console.log("📊 WebSocket Info:");
      console.log("   Connected:", this.isConnected);
      console.log("   Current Device:", this.currentDeviceId || "None");
      console.log(
        "   Active Subscriptions:",
        Array.from(this.subscriptions.keys())
      );
    };

    console.log("");
    console.log("🧪 Testing Mode Enabled!");
    console.log('   sendPumpCommand("on")');
    console.log('   sendPumpCommand("off")');
    console.log('   simulateSensorData("temp", 25.5)');
    console.log("   wsInfo()");
    console.log("");
  }
}

// Export singleton instance
export const webSocketClient = new WebSocketClient();

// Auto-enable testing mode in development
if (typeof window !== "undefined" && import.meta.env?.DEV) {
  window.webSocketClient = webSocketClient;
  console.log("🔧 Dev Mode: webSocketClient.enableTestingMode()");
}
