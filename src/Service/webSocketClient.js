import { Client } from "@stomp/stompjs";

// ✅ Replace with your valid JWT token
const jwtToken =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJyYXRuYWFiaW5heWFuc25AZ21haWwuY29tIiwiZW1haWwiOiJyYXRuYWFiaW5heWFuc25AZ21haWwuY29tIiwiaWF0IjoxNzY0MzIwMTk1LCJleHAiOjE3NjQ0MTAxOTV9.LK5nZrAn2y3fzmVNFomm373NQKKa4FHB5c8Z51x27M8";

// ✅ Replace with your deviceId
const deviceId = "device9988";

// ✅ Encode the token for safe URL usage
const encodedToken = encodeURIComponent(jwtToken);

// ✅ Pass the JWT as a query parameter
// const wsUrl = `ws://localhost:8091/ws?token=${encodedToken}`;
const wsUrl = `wss://api.protonestconnect.co/ws?token=${encodedToken}`;
// const wsUrl = `wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token=${encodedToken}`;
//
console.log("🔌 Connecting to:", wsUrl);

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
    this.currentDeviceId = deviceId;
    this.subscriptions = new Map();
    this.dataCallback = null;
    this.connectCallback = null;
    this.disconnectCallback = null;

    // Setup the wrapper to intercept STOMP client's onConnect
    this._setupConnectionHandlers();
  }

  /**
   * Setup connection handlers to intercept STOMP events
   * This replaces the original onConnect to add callback support
   */
  _setupConnectionHandlers() {
    const originalOnConnect = client.onConnect;
    const self = this;

    client.onConnect = (frame) => {
      console.log("✅ Connected:", frame);

      // Subscribe to stream topic ONCE - all sensor data comes through this topic
      const streamTopic = `/topic/stream/${deviceId}`;
      client.subscribe(streamTopic, (message) => {
        const data = JSON.parse(message.body);
        console.log(`📡 Received stream data:`, data);

        // Detect sensor type from message payload and call Dashboard callback
        if (self.dataCallback) {
          // Message structure: {payload: {temp: "55"}, topic: "temp", timestamp: "..."}
          // Extract the actual sensor data from the nested payload
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
              `🎯 Calling Dashboard callback: ${sensorType} = ${payload[topic]}`
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
                  `🎯 Calling Dashboard callback: ${sensorType} = ${payload[key]}`
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
            console.warn(`⚠️ No recognized sensor field in message:`, data);
          }
        } else {
          console.warn(
            `⚠️ No callback registered yet - data will be lost:`,
            data
          );
        }
      });
      console.log(`🔔 Subscribed to ${streamTopic}`);

      // Subscribe to pump state topic
      const stateTopic = `/topic/state/${deviceId}`;
      client.subscribe(stateTopic, (message) => {
        const data = JSON.parse(message.body);
        console.log("🔧 Pump state:", data);

        // Call Dashboard callback for pump status
        if (self.dataCallback) {
          if (data.power !== undefined) {
            self.dataCallback({
              sensorType: "pumpStatus",
              value: data.power,
              timestamp: data.timestamp || new Date().toISOString(),
            });
          }
          if (data.mode !== undefined) {
            self.dataCallback({
              sensorType: "pumpMode",
              value: data.mode,
              timestamp: data.timestamp || new Date().toISOString(),
            });
          }
        }
      });
      console.log(`🔔 Subscribed to ${stateTopic}`);

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
   * Connect to WebSocket (already connected above, but provides interface compatibility)
   * @param {string} token - JWT token (uses constant token above)
   */
  async connect(token) {
    console.log("[WebSocketClient] Using pre-configured connection");
    return Promise.resolve();
  }

  /**
   * Subscribe to device topics with callback
   * @param {string} deviceIdParam - Device ID (uses constant deviceId above)
   * @param {Function} callback - Data handler callback
   */
  subscribeToDevice(deviceIdParam, callback) {
    this.dataCallback = callback;
    console.log(`[WebSocketClient] Callback registered for data handling`);
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
      return this.sendPumpCommand(deviceId, power, mode);
    };

    window.simulateSensorData = (sensorType, value) => {
      if (!this.isConnected) {
        console.error("❌ Not connected");
        return false;
      }

      const destination = `protonest/${deviceId}/stream/${sensorType}`;
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
      console.log("   Device ID:", deviceId);
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
