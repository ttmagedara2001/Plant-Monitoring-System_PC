import { Client } from "@stomp/stompjs";
import { getJwtToken, login as authServiceLogin } from "./authService";

// --- Environment config ---
const WS_BASE = import.meta.env.VITE_WS_URL;
const EMAIL = import.meta.env.VITE_USER_EMAIL;
const PASSWORD = import.meta.env.VITE_USER_SECRET;

/**
 * Build WebSocket broker URL with JWT token as query parameter.
 * @returns {string} Broker URL (with ?token=<jwt> when authenticated)
 */
function buildBrokerURL() {
  const token = getJwtToken();
  if (token) {
    const separator = WS_BASE.includes("?") ? "&" : "?";
    return `${WS_BASE}${separator}token=${encodeURIComponent(token)}`;
  }
  return WS_BASE;
}

/**
 * STOMP WebSocket client for real-time sensor data and device state.
 *
 * - Authenticates via ?token=<jwt> query parameter on the WS URL
 * - Subscribes to /topic/stream/<deviceId> (sensor readings)
 *   and /topic/state/<deviceId> (pump status / mode)
 * - Handles reconnection with progressive backoff and token refresh
 */
class WebSocketClient {
  constructor() {
    this.client = null;
    this.currentDeviceId = null;
    this.subscriptions = new Map();
    this.dataCallback = null;
    this.connectCallbacks = [];
    this.disconnectCallbacks = [];
    this.isReady = false;
    this._lastConnectTs = 0;
    this._wsFailures = 0;
    this._maxWsFailures = 10;
    this._tokenRefreshAttempted = false;
  }

  /** Initialise the STOMP client and activate the connection. */
  _initializeClient() {
    if (this.client) return;

    this.client = new Client({
      brokerURL: buildBrokerURL(),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      // Refresh the broker URL before every (re)connect so
      // reconnects always use a fresh JWT.
      beforeConnect: () => {
        const freshURL = buildBrokerURL();
        if (this.client && this.client.brokerURL !== freshURL) {
          this.client.brokerURL = freshURL;
        }
      },

      onConnect: () => {
        console.log("[WS] Connected");
        this.isReady = true;
        this._lastConnectTs = Date.now();
        this._wsFailures = 0;
        this._tokenRefreshAttempted = false;

        // Server-side subscriptions are gone after reconnect
        this.subscriptions.clear();

        if (this._pendingSubRetry) {
          clearTimeout(this._pendingSubRetry);
          this._pendingSubRetry = null;
        }

        // Re-subscribe to current device topics
        if (this.currentDeviceId) {
          this._subscribeToDeviceTopics(this.currentDeviceId);
        }

        this.connectCallbacks.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            console.error("[WS] Connect callback error:", e);
          }
        });
      },

      onStompError: (frame) => {
        const errorMsg = frame.headers["message"] || "";
        console.error("[WS] STOMP error:", errorMsg);

        if (errorMsg.includes("Unauthorized") || errorMsg.includes("401")) {
          console.error("[WS] Auth failed — token may have expired");
          window.dispatchEvent(new CustomEvent("auth:logout"));
        }
      },

      onWebSocketError: () => {
        this._wsFailures++;
      },

      onWebSocketClose: (event) => {
        this.isReady = false;

        if (this._pendingSubRetry) {
          clearTimeout(this._pendingSubRetry);
          this._pendingSubRetry = null;
        }

        // Progressive backoff on repeated connection failures (code 1006 = abnormal close)
        if (event && event.code === 1006 && this._wsFailures > 0) {
          const backoff = Math.min(
            5000 * Math.pow(1.5, this._wsFailures - 1),
            60000,
          );
          if (this.client) this.client.reconnectDelay = backoff;

          // Auto-refresh token after 3 consecutive failures
          if (this._wsFailures >= 3 && !this._tokenRefreshAttempted) {
            this._tokenRefreshAttempted = true;
            this._refreshTokenForWs();
          }

          // Circuit breaker — stop retrying after too many failures
          if (this._wsFailures >= this._maxWsFailures) {
            console.error(
              `[WS] Failed ${this._wsFailures} times — auto-reconnect stopped. Call connect() to retry.`,
            );
            try {
              this.client.deactivate();
            } catch (_) {
              /* ignored */
            }
          }
        }

        this.disconnectCallbacks.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            console.error("[WS] Disconnect callback error:", e);
          }
        });
      },

      // Only log meaningful STOMP frames (skip heartbeats)
      debug: (msg) => {
        if (
          msg.startsWith(">>>") ||
          msg.startsWith("<<<") ||
          msg === "Received data"
        )
          return;
        console.debug("[STOMP]", msg);
      },
    });

    this.client.activate();
  }

  /**
   * Re-authenticate using env credentials when WS connections keep failing.
   * The beforeConnect hook will automatically pick up the fresh token.
   * @private
   */
  async _refreshTokenForWs() {
    if (!EMAIL || !PASSWORD) return;
    try {
      await authServiceLogin(EMAIL, PASSWORD);
      console.log("[WS] Token refreshed — next reconnect will use new token");
    } catch (e) {
      console.error("[WS] Token refresh failed:", e.message);
    }
  }

  /**
   * Subscribe to stream and state topics for the given device.
   * Skips topics that are already subscribed.
   * @param {string} deviceId
   * @private
   */
  _subscribeToDeviceTopics(deviceId) {
    if (!this.client || !this.isReady || !this.client.connected) return;

    const topics = [
      {
        key: `stream-${deviceId}`,
        path: `/topic/stream/${deviceId}`,
        handler: "_processStreamMessage",
      },
      {
        key: `state-${deviceId}`,
        path: `/topic/state/${deviceId}`,
        handler: "_processStateMessage",
      },
    ];

    for (const { key, path, handler } of topics) {
      if (this.subscriptions.has(key)) continue;
      try {
        const sub = this.client.subscribe(path, (message) => {
          try {
            this[handler](JSON.parse(message.body));
          } catch (e) {
            console.error(`[WS] Failed to parse message on ${path}:`, e);
          }
        });
        this.subscriptions.set(key, sub);
        console.log(`[WS] Subscribed: ${path}`);
      } catch (e) {
        console.error(`[WS] Failed to subscribe to ${path}:`, e);
      }
    }
  }

  /** Route incoming stream data to the registered callback. @private */
  _processStreamMessage(data) {
    if (!this.dataCallback) return;

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

    // Map pmc/ prefixed topic names to internal sensor types
    const topicToSensor = {
      "pmc/temperature": "temp",
      "pmc/humidity": "humidity",
      "pmc/moisture": "moisture",
      "pmc/light": "light",
      "pmc/battery": "battery",
    };

    // Check if this is a batch state update
    const sensorKeys = Object.keys(sensorMap);
    const foundSensors = sensorKeys.filter((key) => payload[key] !== undefined);

    if (foundSensors.length > 2) {
      // This is a complete state update
      const stateUpdate = {};
      foundSensors.forEach((key) => {
        const sensorType = sensorMap[key];
        stateUpdate[sensorType] = payload[key];
      });

      this.dataCallback({
        sensorType: "batchUpdate",
        value: stateUpdate,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    } else {
      // Single sensor update - check pmc/ prefixed topic first, then payload keys
      if (topic && topicToSensor[topic]) {
        // Resolve sensor type from pmc/ topic name
        const sensorType = topicToSensor[topic];
        // Find value in payload by checking common key names
        const value =
          payload[sensorType] ??
          payload[topic] ??
          payload[topic.split("/").pop()];
        if (value !== undefined) {
          this.dataCallback({
            sensorType: sensorType,
            value: value,
            timestamp: data.timestamp || new Date().toISOString(),
          });
        }
      } else if (topic && payload[topic] !== undefined) {
        const sensorType = sensorMap[topic] || topic;
        this.dataCallback({
          sensorType: sensorType,
          value: payload[topic],
          timestamp: data.timestamp || new Date().toISOString(),
        });
      } else {
        for (const [key, sensorType] of Object.entries(sensorMap)) {
          if (payload[key] !== undefined) {
            this.dataCallback({
              sensorType: sensorType,
              value: payload[key],
              timestamp: data.timestamp || new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  /** Route incoming state data (pump status / mode) to the callback. @private */
  _processStateMessage(data) {
    if (!this.dataCallback) return;

    const payload = data.payload || data;

    const powerValue =
      payload.power || payload.status || payload.pumpStatus || payload.pump;
    if (powerValue !== undefined) {
      const normalizedPower = String(powerValue).toUpperCase();
      this.dataCallback({
        sensorType: "pumpStatus",
        value: normalizedPower,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    }

    const modeValue = payload.mode || payload.pumpMode;
    if (modeValue !== undefined) {
      const normalizedMode = String(modeValue).toLowerCase();
      this.dataCallback({
        sensorType: "pumpMode",
        value: normalizedMode,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    }
  }

  /**
   * Unsubscribe from a device's stream and state topics.
   * @param {string} deviceId
   * @private
   */
  _unsubscribeFromDeviceTopics(deviceId) {
    for (const prefix of ["stream", "state"]) {
      const key = `${prefix}-${deviceId}`;
      if (this.subscriptions.has(key)) {
        try {
          this.subscriptions.get(key).unsubscribe();
        } catch (_) {
          /* connection may be lost */
        }
        this.subscriptions.delete(key);
      }
    }
  }

  /** Public wrapper — unsubscribe from a device's topics. */
  unsubscribeFromDevice(deviceId) {
    try {
      this._unsubscribeFromDeviceTopics(deviceId);
    } catch (_) {
      /* ignored */
    }
  }

  /**
   * Connect to the WebSocket broker.
   * Must be called AFTER authentication (get-token) so the JWT is available.
   */
  async connect() {
    // Reset failure tracking on explicit connect
    this._wsFailures = 0;
    this._tokenRefreshAttempted = false;

    if (!this.client) {
      this._initializeClient();
    } else if (!this.isConnected) {
      this.client.brokerURL = buildBrokerURL();
      this.client.reconnectDelay = 5000;
      this.client.activate();
    }

    return Promise.resolve();
  }

  /** Auto-login from env vars, then connect. */
  async connectWithAutoLogin() {
    if (EMAIL && PASSWORD) {
      try {
        await authServiceLogin(EMAIL, PASSWORD);
      } catch (e) {
        throw new Error("Authentication required for WebSocket connection");
      }
    }
    return this.connect();
  }

  /**
   * Subscribe to a device's topics. Handles unsubscribing from the
   * previous device and retries if the connection isn't ready yet.
   * @param {string} deviceIdParam - Device ID to subscribe to
   * @param {Function} callback     - Receives parsed sensor/state data
   */
  subscribeToDevice(deviceIdParam, callback) {
    if (this.currentDeviceId && this.currentDeviceId !== deviceIdParam) {
      this._unsubscribeFromDeviceTopics(this.currentDeviceId);
    }

    this.currentDeviceId = deviceIdParam;
    this.dataCallback = callback;

    if (this._pendingSubRetry) {
      clearTimeout(this._pendingSubRetry);
      this._pendingSubRetry = null;
    }

    if (this.isReady && this.isConnected) {
      this._subscribeToDeviceTopics(deviceIdParam);
    } else {
      this._retrySubscription(deviceIdParam, 0);
    }

    return true;
  }

  /**
   * Retry subscription with exponential back-off (500 ms → 5 s, max 10 attempts).
   * @private
   */
  _retrySubscription(deviceId, attempt) {
    const MAX_ATTEMPTS = 10;
    if (attempt >= MAX_ATTEMPTS) return;

    const delay = Math.min(500 * Math.pow(1.5, attempt), 5000);
    this._pendingSubRetry = setTimeout(() => {
      this._pendingSubRetry = null;
      if (this.currentDeviceId !== deviceId) return;
      if (this.isReady && this.isConnected) {
        this._subscribeToDeviceTopics(deviceId);
      } else {
        this._retrySubscription(deviceId, attempt + 1);
      }
    }, delay);
  }

  /** Whether the STOMP client is currently connected. */
  get isConnected() {
    return this.client?.connected || false;
  }

  /** Alias for isConnected (used by status components). */
  getConnectionStatus() {
    return this.isConnected;
  }

  /** Register a callback invoked on successful connection. */
  onConnect(callback) {
    if (typeof callback !== "function") return;
    this.connectCallbacks.push(callback);
    if (this.isConnected) {
      try {
        callback();
      } catch (_) {
        /* ignored */
      }
    }
  }

  /** Remove a previously registered connect callback. */
  offConnect(callback) {
    if (!callback) return;
    this.connectCallbacks = this.connectCallbacks.filter(
      (cb) => cb !== callback,
    );
  }

  /** Register a callback invoked on disconnection. */
  onDisconnect(callback) {
    if (typeof callback === "function") this.disconnectCallbacks.push(callback);
  }

  /** Remove a previously registered disconnect callback. */
  offDisconnect(callback) {
    if (!callback) return;
    this.disconnectCallbacks = this.disconnectCallbacks.filter(
      (cb) => cb !== callback,
    );
  }

  /**
   * Publish a pump command to the device.
   * @param {string} deviceIdParam - Target device
   * @param {string} power         - "on" or "off"
   * @param {string|null} mode     - "auto" or "manual" (optional)
   * @returns {boolean} true if sent successfully
   */
  sendPumpCommand(deviceIdParam, power, mode = null) {
    if (!this.isConnected) {
      console.warn("[WS] Cannot send pump command — not connected");
      return false;
    }

    const destination = `protonest/${deviceIdParam}/state/pmc/pump`;
    const payload = { power: power.toLowerCase() };
    if (mode) payload.mode = mode.toLowerCase();

    try {
      this.client.publish({ destination, body: JSON.stringify(payload) });
      return true;
    } catch (error) {
      console.error("[WS] Failed to send pump command:", error);
      return false;
    }
  }

  /** Cleanly disconnect from the WebSocket broker. */
  disconnect() {
    if (this.client && this.isConnected) {
      if (this.currentDeviceId)
        this._unsubscribeFromDeviceTopics(this.currentDeviceId);
      this.client.deactivate();
      this.isReady = false;
      console.log("[WS] Disconnected");
    }
  }

  /** Expose dev helpers on window (development builds only). */
  enableTestingMode() {
    if (typeof window === "undefined") return;

    window.sendPumpCommand = (power, mode = null) => {
      if (!this.currentDeviceId) {
        console.error("No device selected");
        return false;
      }
      return this.sendPumpCommand(this.currentDeviceId, power, mode);
    };

    window.simulateSensorData = (sensorType, value) => {
      if (!this.isConnected || !this.currentDeviceId) {
        console.error("Not connected or no device");
        return false;
      }
      const destination = `protonest/${this.currentDeviceId}/stream/${sensorType}`;
      try {
        this.client.publish({
          destination,
          body: JSON.stringify({ [sensorType]: String(value) }),
        });
        return true;
      } catch (e) {
        console.error("[WS] Simulate failed:", e);
        return false;
      }
    };

    window.wsInfo = () => ({
      connected: this.isConnected,
      currentDevice: this.currentDeviceId || null,
      activeSubscriptions: Array.from(this.subscriptions.keys()),
    });

    console.log(
      "[WS] Testing mode enabled — sendPumpCommand / simulateSensorData / wsInfo",
    );
  }
}

// --- Singleton export ---
export const webSocketClient = new WebSocketClient();

if (typeof window !== "undefined" && import.meta.env?.DEV) {
  window.webSocketClient = webSocketClient;
}
