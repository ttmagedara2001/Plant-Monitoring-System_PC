# WebSocket Implementation Guide

## Overview

This Plant Monitoring System uses **STOMP over WebSocket** with **Cookie-Based Authentication** to receive real-time sensor data and pump status updates from IoT devices via the ProtoNest platform.

## Architecture

```
IoT Device → MQTT Broker (ProtoNest) → STOMP/WebSocket → React Dashboard
                                         (Cookie Auth)
```

## Authentication Method

**Cookie-Based HttpOnly Authentication:**

- WebSocket connection is established AFTER successful login to `/user/get-token`
- Login sets HttpOnly cookies that browser sends automatically with WebSocket handshake
- No token query parameter in WebSocket URL
- No Authorization headers needed

## Files

### Core Service Files

- **`src/Service/webSocketClient.js`** - WebSocket client service (cookie-based auth)
- **`src/Service/authService.js`** - Authentication service with login
- **`src/Context/AuthContext.jsx`** - React context for auth state

## Topics Structure

### Sensor Stream Topics (Real-time Data)

| Topic Pattern | Data Type | Example Payload |
|--------------|-----------|-----------------|
| `/topic/stream/{deviceId}/temp` | Temperature | `{"temp": "25.5"}` |
| `/topic/stream/{deviceId}/humidity` | Humidity | `{"humidity": "68.0"}` |
| `/topic/stream/{deviceId}/moisture` | Moisture | `{"moisture": "45.2"}` |
| `/topic/stream/{deviceId}/light` | Light | `{"light": "850.0"}` |
| `/topic/stream/{deviceId}/battery` | Battery | `{"battery": "87.5"}` |

### State Topics (Pump Control)

| Topic Pattern | Data Type | Example Payload |
|--------------|-----------|-----------------|
| `/topic/state/{deviceId}/pump` | Pump Status | `{"power": "ON", "mode": "auto"}` |

## WebSocket Client Service (`webSocketClient.js`)

### Features

✅ **Cookie-Based Auth** - No token URL parameter needed  
✅ **Singleton Pattern** - One connection per application  
✅ **Auto-Reconnection** - Reconnects automatically on disconnect  
✅ **Subscription Management** - Tracks active subscriptions  
✅ **Message Parsing** - Handles different payload formats  
✅ **Pump Control** - Send commands to control pump  
✅ **Event Callbacks** - Connect/disconnect handlers  

### API Reference

#### `connect()`

Establishes WebSocket connection using browser cookies for authentication.

```javascript
// Must be called AFTER successful login
await webSocketClient.connect();
```

#### `connectWithAutoLogin()`

Attempts auto-login from environment variables, then connects.

```javascript
await webSocketClient.connectWithAutoLogin();
```

#### `subscribeToDevice(deviceId, callback)`

Subscribes to all topics for a specific device.

```javascript
webSocketClient.subscribeToDevice("device9988", (data) => {
  console.log("Received:", data);
  // data structure:
  // {
  //   sensorType: 'temp' | 'humidity' | 'moisture' | 'light' | 'battery' | 'pumpStatus' | 'pumpMode',
  //   value: string,
  //   timestamp: ISO string
  // }
});
```

#### `unsubscribeFromDevice(deviceId)`

Unsubscribes from all topics for a device.

```javascript
webSocketClient.unsubscribeFromDevice("device9988");
```

#### `sendPumpCommand(deviceId, power, mode)`

Sends pump control command.

```javascript
webSocketClient.sendPumpCommand("device9988", "ON", "manual");
```

#### `disconnect()`

Closes WebSocket connection.

```javascript
webSocketClient.disconnect();
```

#### Event Handlers

```javascript
// Connection events
webSocketClient.onConnect(() => console.log("Connected!"));
webSocketClient.onDisconnect(() => console.log("Disconnected!"));

// Remove handlers
webSocketClient.offConnect(handler);
webSocketClient.offDisconnect(handler);

// Check status
const isConnected = webSocketClient.getConnectionStatus();
```

## React Integration (App.jsx)

```javascript
import { webSocketClient } from './Service/webSocketClient';
import { useAuth } from './Context/AuthContext';

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    // Wait for auth to complete
    if (isLoading) return;
    if (!isAuthenticated) return;
    
    const handleData = (data) => {
      // Process incoming sensor data
    };
    
    const onConnect = () => {
      webSocketClient.subscribeToDevice(deviceId, handleData);
    };
    
    webSocketClient.onConnect(onConnect);
    
    // Connect using cookies set by login
    webSocketClient.connect();
    
    return () => {
      webSocketClient.offConnect(onConnect);
      webSocketClient.unsubscribeFromDevice(deviceId);
    };
  }, [isAuthenticated, isLoading, deviceId]);
}
```

## Connection Lifecycle

### Initial Connection (Cookie-Based)

1. User logs in via `/user/get-token` → HttpOnly cookies set
2. App calls `webSocketClient.connect()` (no token parameter)
3. Browser establishes WebSocket with cookies
4. STOMP handshake completes
5. `onConnect` callbacks fire
6. App subscribes to device topics

### Receiving Data

1. IoT device publishes MQTT message
2. ProtoNest broker forwards to STOMP topic
3. `webSocketClient` receives message
4. Message parsed and callback invoked
5. React state updated

### Reconnection

1. Connection lost
2. `onWebSocketClose` callback fires
3. STOMP client auto-reconnects (cookies still valid)
4. `onConnect` fires again
5. Subscriptions re-established

### Session Expiry

1. Cookie expires or becomes invalid
2. WebSocket receives authentication error
3. `auth:logout` event dispatched
4. AuthContext handles logout
5. User redirected to login

## Error Handling

### Authentication Errors

```javascript
onStompError: (frame) => {
  const errorMsg = frame.headers["message"];
  if (errorMsg.includes("Unauthorized") || errorMsg.includes("401")) {
    // Cookie auth failed
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }
};
```

### Message Parsing

```javascript
try {
  const data = JSON.parse(message.body);
  // Process...
} catch (error) {
  console.error("Failed to parse message:", error);
}
```

## Troubleshooting

### WebSocket Not Connecting

1. ✅ Verify login succeeded (cookies set)
2. ✅ Check browser DevTools → Application → Cookies
3. ✅ Ensure WebSocket URL is correct
4. ✅ Check for CORS issues

### No Data Received

1. ✅ Verify deviceId matches actual device
2. ✅ Check if device is publishing to MQTT
3. ✅ Verify subscription topics

### Authentication Failures

1. ✅ Re-login to get fresh cookies
2. ✅ Check cookie expiration
3. ✅ Verify credentials are correct

## Security

### Cookie-Based Auth Benefits

- **HttpOnly Cookies** - Not accessible from JavaScript (XSS protection)
- **Automatic Handling** - Browser manages cookie sending
- **Server-Controlled** - Token lifecycle managed by server
- **No localStorage Exposure** - Tokens not stored in vulnerable locations

### HTTPS/WSS

- All connections use secure WebSocket (`wss://`)
- Cookies marked Secure (HTTPS only)
- TLS encryption for all messages

## Environment Variables

```env
VITE_API_BASE_URL=https://api.protonestconnect.co/api/v1
VITE_WS_URL=wss://api.protonestconnect.co/ws
VITE_USER_EMAIL=your-email@example.com
VITE_USER_SECRET=your-secretKey
```

---

**Last Updated:** January 2026  
**Version:** 2.0.0 (Cookie-Based Auth)  
**Auth Method:** HttpOnly Cookies
