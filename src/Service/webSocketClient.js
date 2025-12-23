import { Client } from "@stomp/stompjs";
import { login as envLogin } from "./authService.js";

// Get JWT token from localStorage (set by login process)
const getJwtToken = () => {
  const token = localStorage.getItem("jwtToken");
  if (!token) {
    console.warn("⚠️ No JWT token found in localStorage. Please login first.");
  }
  return token;
};

// Build WebSocket URL with JWT token
const buildWebSocketUrl = (jwtToken) => {
  if (!jwtToken) {
    console.error("❌ Cannot build WebSocket URL: No JWT token available");
    return null;
  }

  // ✅ Encode the token for safe URL usage
  const encodedToken = encodeURIComponent(jwtToken);

  // Prefer runtime-configurable WebSocket URL via VITE_WS_URL.
  // Fallback to the known production endpoint if not provided.
  const envWs = import.meta.env.VITE_WS_URL;
  //const defaultWs = "wss://api.protonestconnect.co/ws";
  const baseWs = envWs;

  // If baseWs already contains query params, append with & otherwise ?
  const separator = baseWs.includes("?") ? "&" : "?";
  const wsUrl = `${baseWs}${separator}token=${encodedToken}`;

  console.log(
    "🔌 WebSocket URL built:",
    wsUrl.replace(encodedToken, "***TOKEN***")
  );

  return wsUrl;
};

// Create STOMP client (will be configured when connect() is called)
let client = null;

/**
 * WebSocket Client Wrapper Class for Dashboard Integration
 * Provides methods to work with the existing STOMP client
 */
class WebSocketClient {
  constructor() {
    this.client = null;
    this.currentDeviceId = null;
    this.subscriptions = new Map();
    this.dataCallback = null;
    // Support multiple listeners
    this.connectCallbacks = [];
    this.disconnectCallbacks = [];
    this.isReady = false;
    this.jwtToken = null;
  }

  /**
   * Initialize STOMP client with JWT token
   * @param {string} token - JWT token
   */
  _initializeClient(token) {
    if (this.client) {
      console.log("[WebSocketClient] Client already initialized");
      return;
    }

    const wsUrl = buildWebSocketUrl(token);
    if (!wsUrl) {
      throw new Error("Failed to build WebSocket URL - invalid token");
    }

    this.client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: (frame) => {
        console.log("✅ WebSocket Connected:", frame);
        this.isReady = true;

        // If we have a device already set, subscribe to it
        if (this.currentDeviceId) {
          this._subscribeToDeviceTopics(this.currentDeviceId);
        }

        // Call user's connect callback
        if (
          Array.isArray(this.connectCallbacks) &&
          this.connectCallbacks.length > 0
        ) {
          this.connectCallbacks.forEach((cb) => {
            try {
              cb();
            } catch (e) {
              console.warn("[WebSocketClient] connect callback failed", e);
            }
          });
        }
      },

      onStompError: (frame) => {
        console.error("❌ Broker reported error:", frame.headers["message"]);
        console.error("Details:", frame.body);
      },

      onWebSocketError: (event) => {
        console.error("🚫 WebSocket error", event);
      },

      onWebSocketClose: (event) => {
        console.warn("🔻 WebSocket closed", event);
        this.isReady = false;
        if (
          Array.isArray(this.disconnectCallbacks) &&
          this.disconnectCallbacks.length > 0
        ) {
          this.disconnectCallbacks.forEach((cb) => {
            try {
              cb();
            } catch (e) {
              console.warn("[WebSocketClient] disconnect callback failed", e);
            }
          });
        }
      },

      debug: (msg) => console.log("🪵 Debug:", msg),
    });

    // Activate the client
    this.client.activate();
    console.log("[WebSocketClient] STOMP client activated");
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

        // Check if this is a batch state update (all sensors in one message)
        const sensorKeys = Object.keys(sensorMap);
        const foundSensors = sensorKeys.filter(
          (key) => payload[key] !== undefined
        );

        if (foundSensors.length > 2) {
          // This is a complete state update - send all at once
          console.log(
            `🎯 [${deviceId}] Received BATCH state update with ${foundSensors.length} sensors`
          );

          const stateUpdate = {};
          foundSensors.forEach((key) => {
            const sensorType = sensorMap[key];
            stateUpdate[sensorType] = payload[key];
            console.log(`   - ${sensorType}: ${payload[key]}`);
          });

          self.dataCallback({
            sensorType: "batchUpdate",
            value: stateUpdate,
            timestamp: data.timestamp || new Date().toISOString(),
          });
        } else {
          // Single sensor update (original logic)
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
   * Public wrapper to unsubscribe from a device's topics without disconnecting
   * @param {string} deviceId
   */
  unsubscribeFromDevice(deviceId) {
    try {
      this._unsubscribeFromDeviceTopics(deviceId);
    } catch (e) {
      console.warn(
        "[WebSocketClient] Failed to unsubscribe from device",
        deviceId,
        e
      );
    }
  }

  /**
   * Connect to WebSocket (initializes client with token)
   * @param {string} token - JWT token
   */
  async connect(token) {
    // Prefer passed token, then localStorage, then try env-based login
    let jwt = token || localStorage.getItem("jwtToken");

    if (!jwt) {
      const envEmail = import.meta.env.VITE_USER_EMAIL;
      const envPass = import.meta.env.VITE_USER_PASSWORD;

      if (envEmail && envPass) {
        try {
          console.log(
            "🔐 No JWT found — attempting login for WebSocket using VITE_USER_EMAIL"
          );
          const resp = await envLogin(envEmail, envPass);
          jwt = resp?.jwtToken;
          const refreshToken = resp?.refreshToken;
          if (jwt) {
            localStorage.setItem("jwtToken", jwt);
            if (refreshToken)
              localStorage.setItem("refreshToken", refreshToken);
            console.log("✅ Obtained JWT for WebSocket via env credentials");
          }
        } catch (e) {
          console.error("❌ Env login for WebSocket failed:", e.message || e);
        }
      }
    }

    if (!jwt) {
      console.error(
        "[WebSocketClient] ❌ Cannot connect: No JWT token available"
      );
      throw new Error("JWT token required for WebSocket connection");
    }

    this.jwtToken = jwt;

    // Initialize client if not already done
    if (!this.client) {
      console.log("[WebSocketClient] 🔄 Initializing STOMP client...");
      this._initializeClient(jwt);
    } else if (!this.isConnected) {
      // Client exists but disconnected - try to reconnect
      console.log("[WebSocketClient] 🔄 Reconnecting...");
      this.client.activate();
    } else {
      console.log("[WebSocketClient] ✅ Already connected");
    }

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
    if (typeof callback === "function") {
      this.connectCallbacks.push(callback);
      if (this.isConnected) {
        try {
          callback();
        } catch (e) {
          console.warn("[WebSocketClient] onConnect immediate call failed", e);
        }
      }
    }
  }

  // Remove a previously registered connect callback
  offConnect(callback) {
    if (!callback) return;
    this.connectCallbacks = this.connectCallbacks.filter(
      (cb) => cb !== callback
    );
  }

  /**
   * Register disconnect callback
   */
  onDisconnect(callback) {
    if (typeof callback === "function") {
      this.disconnectCallbacks.push(callback);
    }
  }

  // Remove a previously registered disconnect callback
  offDisconnect(callback) {
    if (!callback) return;
    this.disconnectCallbacks = this.disconnectCallbacks.filter(
      (cb) => cb !== callback
    );
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
    if (this.client && this.isConnected) {
      console.log("[WebSocketClient] 🔌 Disconnecting...");

      // Unsubscribe from all topics
      if (this.currentDeviceId) {
        this._unsubscribeFromDeviceTopics(this.currentDeviceId);
      }

      // Deactivate client
      this.client.deactivate();
      this.isReady = false;
    } else {
      console.log("[WebSocketClient] Already disconnected");
    }
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
