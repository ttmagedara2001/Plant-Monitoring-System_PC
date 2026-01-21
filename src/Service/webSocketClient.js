import { Client } from '@stomp/stompjs';

/* ======================================================
   CONFIG FROM ENVIRONMENT
====================================================== */

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const WS_URL = import.meta.env.VITE_WS_URL;
const EMAIL = import.meta.env.VITE_USER_EMAIL;
const PASSWORD = import.meta.env.VITE_USER_SECRET;

/* ======================================================
   LOGIN (GET COOKIES)
====================================================== */

/**
 * Login using cookie-based authentication via fetch
 * 
 * @param {string} email - User email
 * @param {string} password - User secret key (from Protonest dashboard)
 * @returns {Promise<void>}
 */
async function login(email = EMAIL, password = PASSWORD) {
  const response = await fetch(
    `${API_BASE}/user/get-token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // ⭐ REQUIRED for cookies
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Login failed');
    throw new Error(`Login failed: ${errorText}`);
  }

  console.log('✅ Login successful, cookies stored');
}

/* ======================================================
   WEBSOCKET CLIENT CLASS
====================================================== */

/**
 * WebSocket Client Wrapper Class for Dashboard Integration
 * 
 * Cookie-Based Authentication:
 * - WebSocket URL no longer includes ?token=... query parameter
 * - Connection relies on browser cookies set by /user/get-token
 * - Must only connect AFTER successful login (cookies set)
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
  }

  /**
   * Initialize and connect the STOMP client
   */
  _initializeClient() {
    if (this.client) {
      return;
    }

    console.log('🔌 Initializing WebSocket with cookie-based auth:', WS_URL);

    this.client = new Client({
      brokerURL: WS_URL,

      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log('✅ WebSocket connected');
        this.isReady = true;

        // Clear stale subscription references on reconnect
        this.subscriptions.clear();

        // If we have a device already set, subscribe to it
        if (this.currentDeviceId) {
          setTimeout(() => {
            if (this.isReady && this.currentDeviceId) {
              this._subscribeToDeviceTopics(this.currentDeviceId);
            }
          }, 100);
        }

        // Call user's connect callbacks
        this.connectCallbacks.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            console.error('Connect callback error:', e);
          }
        });
      },

      onStompError: (frame) => {
        console.error('❌ STOMP error:', frame.headers['message']);
        console.error('Details:', frame.body);

        // Check for authentication errors
        const errorMsg = frame.headers['message'] || '';
        if (errorMsg.includes('Unauthorized') || errorMsg.includes('401')) {
          console.error('🔐 WebSocket authentication failed - cookies may have expired');
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
      },

      onWebSocketError: (event) => {
        console.error('🚫 WebSocket error', event);
      },

      onWebSocketClose: (event) => {
        console.warn('🔻 WebSocket closed', event);
        this.isReady = false;

        this.disconnectCallbacks.forEach((cb) => {
          try {
            cb();
          } catch (e) {
            console.error('Disconnect callback error:', e);
          }
        });
      },

      debug: (msg) => {
        console.log('🪵', msg);
      },
    });

    this.client.activate();
  }

  /**
   * Subscribe to device topics dynamically
   * @param {string} deviceId - Device ID to subscribe to
   */
  _subscribeToDeviceTopics(deviceId) {
    // Guard: Check if client is ready
    if (!this.client || !this.isReady) {
      return;
    }

    // Guard: Check if already subscribed to this device
    const streamKey = `stream-${deviceId}`;
    const stateKey = `state-${deviceId}`;
    if (this.subscriptions.has(streamKey) && this.subscriptions.has(stateKey)) {
      return;
    }

    // 🔔 Stream topic
    const streamTopic = `/topic/stream/${deviceId}`;
    const streamSub = this.client.subscribe(streamTopic, (message) => {
      try {
        const data = JSON.parse(message.body);
        console.log('📡 Stream message:', data);
        this._processStreamMessage(data);
      } catch (parseError) {
        console.error('❌ Failed to parse stream message:', parseError);
      }
    });
    this.subscriptions.set(streamKey, streamSub);

    // 🔔 State topic
    const stateTopic = `/topic/state/${deviceId}`;
    const stateSub = this.client.subscribe(stateTopic, (message) => {
      try {
        const data = JSON.parse(message.body);
        console.log('📡 State message:', data);
        this._processStateMessage(data);
      } catch (parseError) {
        console.error('❌ Failed to parse state message:', parseError);
      }
    });
    this.subscriptions.set(stateKey, stateSub);

    console.log('🔔 Subscribed to device topics:');
    console.log(`   📡 Stream: ${streamTopic}`);
    console.log(`   📡 State: ${stateTopic}`);
  }

  /**
   * Process stream message and notify callback
   */
  _processStreamMessage(data) {
    if (!this.dataCallback) return;

    const payload = data.payload || data;
    const topic = data.topic;

    const sensorMap = {
      temp: 'temp',
      temperature: 'temp',
      humidity: 'humidity',
      moisture: 'moisture',
      light: 'light',
      battery: 'battery',
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
        sensorType: 'batchUpdate',
        value: stateUpdate,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    } else {
      // Single sensor update
      if (topic && payload[topic] !== undefined) {
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

  /**
   * Process state message and notify callback
   */
  _processStateMessage(data) {
    if (!this.dataCallback) return;

    const payload = data.payload || data;

    const powerValue =
      payload.power || payload.status || payload.pumpStatus || payload.pump;
    if (powerValue !== undefined) {
      const normalizedPower = String(powerValue).toUpperCase();
      this.dataCallback({
        sensorType: 'pumpStatus',
        value: normalizedPower,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    }

    const modeValue = payload.mode || payload.pumpMode;
    if (modeValue !== undefined) {
      const normalizedMode = String(modeValue).toLowerCase();
      this.dataCallback({
        sensorType: 'pumpMode',
        value: normalizedMode,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    }
  }

  /**
   * Unsubscribe from device topics
   * @param {string} deviceId - Device ID to unsubscribe from
   */
  _unsubscribeFromDeviceTopics(deviceId) {
    const streamKey = `stream-${deviceId}`;
    const stateKey = `state-${deviceId}`;

    if (this.subscriptions.has(streamKey)) {
      try {
        this.subscriptions.get(streamKey).unsubscribe();
      } catch (e) {
        // Unsubscribe may fail if connection lost
      }
      this.subscriptions.delete(streamKey);
    }

    if (this.subscriptions.has(stateKey)) {
      try {
        this.subscriptions.get(stateKey).unsubscribe();
      } catch (e) {
        // Unsubscribe may fail if connection lost
      }
      this.subscriptions.delete(stateKey);
    }
  }

  /**
   * Public wrapper to unsubscribe from a device's topics
   * @param {string} deviceId
   */
  unsubscribeFromDevice(deviceId) {
    try {
      this._unsubscribeFromDeviceTopics(deviceId);
    } catch (e) {
      // Unsubscribe error
    }
  }

  /**
   * Connect to WebSocket (cookie-based authentication)
   * 
   * IMPORTANT: This should only be called AFTER a successful login
   * The WebSocket connection will use the cookies set by that login call
   */
  async connect() {
    console.log('🔌 Connecting WebSocket (cookie-based auth)...');

    // Initialize client if not already done
    if (!this.client) {
      this._initializeClient();
    } else if (!this.isConnected) {
      // Client exists but disconnected - try to reconnect
      this.client.activate();
    }

    return Promise.resolve();
  }

  /**
   * Connect with auto-login from environment variables
   * Login → WebSocket connection flow
   */
  async connectWithAutoLogin() {
    if (EMAIL && PASSWORD) {
      try {
        console.log('🔐 Attempting auto-login before WebSocket connection...');
        await login(EMAIL, PASSWORD);
        console.log('✅ Auto-login successful, connecting WebSocket...');
      } catch (e) {
        console.error('❌ Auto-login failed:', e.message);
        throw new Error('Authentication required for WebSocket connection');
      }
    }

    return this.connect();
  }

  /**
   * Subscribe to device topics with callback
   * @param {string} deviceIdParam - Device ID to subscribe to
   * @param {Function} callback - Data handler callback
   */
  subscribeToDevice(deviceIdParam, callback) {
    // If switching to a different device, unsubscribe from old one
    if (this.currentDeviceId && this.currentDeviceId !== deviceIdParam) {
      this._unsubscribeFromDeviceTopics(this.currentDeviceId);
    }

    // Update current device and callback
    this.currentDeviceId = deviceIdParam;
    this.dataCallback = callback;

    // Subscribe to new device if connection is ready
    if (this.isReady && this.isConnected) {
      this._subscribeToDeviceTopics(deviceIdParam);
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
    if (typeof callback === 'function') {
      this.connectCallbacks.push(callback);
      if (this.isConnected) {
        try {
          callback();
        } catch (e) {
          // Callback error
        }
      }
    }
  }

  /**
   * Remove a previously registered connect callback
   */
  offConnect(callback) {
    if (!callback) return;
    this.connectCallbacks = this.connectCallbacks.filter((cb) => cb !== callback);
  }

  /**
   * Register disconnect callback
   */
  onDisconnect(callback) {
    if (typeof callback === 'function') {
      this.disconnectCallbacks.push(callback);
    }
  }

  /**
   * Remove a previously registered disconnect callback
   */
  offDisconnect(callback) {
    if (!callback) return;
    this.disconnectCallbacks = this.disconnectCallbacks.filter((cb) => cb !== callback);
  }

  /**
   * Send pump command
   */
  sendPumpCommand(deviceIdParam, power, mode = null) {
    if (!this.isConnected) {
      console.warn('❌ Cannot send pump command - not connected');
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
      console.log('✅ Pump command sent:', payload);
      return true;
    } catch (error) {
      console.error('❌ Failed to send pump command:', error);
      return false;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.client && this.isConnected) {
      // Unsubscribe from all topics
      if (this.currentDeviceId) {
        this._unsubscribeFromDeviceTopics(this.currentDeviceId);
      }

      // Deactivate client
      this.client.deactivate();
      this.isReady = false;
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Enable testing mode (development only)
   */
  enableTestingMode() {
    if (typeof window === 'undefined') return;

    window.sendPumpCommand = (power, mode = null) => {
      if (!this.currentDeviceId) {
        console.error('No device selected');
        return false;
      }
      return this.sendPumpCommand(this.currentDeviceId, power, mode);
    };

    window.simulateSensorData = (sensorType, value) => {
      if (!this.isConnected) {
        console.error('Not connected');
        return false;
      }

      if (!this.currentDeviceId) {
        console.error('No device selected');
        return false;
      }

      const destination = `protonest/${this.currentDeviceId}/stream/${sensorType}`;
      const payload = { [sensorType]: String(value) };

      try {
        this.client.publish({
          destination,
          body: JSON.stringify(payload),
        });
        console.log('✅ Simulated sensor data sent:', payload);
        return true;
      } catch (error) {
        console.error('❌ Failed to simulate sensor data:', error);
        return false;
      }
    };

    window.wsInfo = () => {
      return {
        connected: this.isConnected,
        currentDevice: this.currentDeviceId || null,
        activeSubscriptions: Array.from(this.subscriptions.keys()),
        authMethod: 'cookie-based',
      };
    };

    console.log('🧪 Testing mode enabled. Available commands:');
    console.log("  - sendPumpCommand('on'|'off', 'auto'|'manual')");
    console.log("  - simulateSensorData('temp'|'moisture'|..., value)");
    console.log('  - wsInfo()');
  }
}

// Export singleton instance
export const webSocketClient = new WebSocketClient();

// Export login function for external use
export { login };

// Auto-enable testing mode in development
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.webSocketClient = webSocketClient;
}
