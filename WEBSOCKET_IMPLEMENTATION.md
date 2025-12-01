# WebSocket Implementation Guide

## Overview

This Plant Monitoring System uses **STOMP over WebSocket** to receive real-time sensor data and pump status updates from IoT devices via the ProtoNest platform.

## Architecture

```
IoT Device → MQTT Broker (ProtoNest) → STOMP/WebSocket → React Dashboard
```

## Files

### Core Service Files

- **`src/Service/webSocketClient.js`** - Production WebSocket client service (singleton)
- **`src/Service/websocket_test.js`** - Standalone testing utility
- **`src/Hook/useWebSocketClient.js`** - React hook for WebSocket integration

## Topics Structure

Based on the DEVICE_PAYLOAD_SPECIFICATION.md, the system subscribes to these topics:

### Sensor Stream Topics (Real-time Data)

| Topic Pattern                       | Data Type   | Example Payload        |
| ----------------------------------- | ----------- | ---------------------- |
| `/topic/stream/{deviceId}/temp`     | Temperature | `{"temp": "25.5"}`     |
| `/topic/stream/{deviceId}/humidity` | Humidity    | `{"humidity": "68.0"}` |
| `/topic/stream/{deviceId}/moisture` | Moisture    | `{"moisture": "45.2"}` |
| `/topic/stream/{deviceId}/light`    | Light       | `{"light": "850.0"}`   |
| `/topic/stream/{deviceId}/battery`  | Battery     | `{"battery": "87.5"}`  |

### State Topics (Pump Control)

| Topic Pattern                         | Data Type   | Example Payload                     |
| ------------------------------------- | ----------- | ----------------------------------- |
| `/topic/state/{deviceId}/motor/paddy` | Pump Status | `{"power": "on", "mode": "manual"}` |

## WebSocket Client Service (`webSocketClient.js`)

### Features

✅ **Singleton Pattern** - One connection per application  
✅ **Auto-Reconnection** - Reconnects every 5 seconds on disconnect  
✅ **Subscription Management** - Tracks and manages all active subscriptions  
✅ **Message Parsing** - Handles different payload formats automatically  
✅ **Pump Control** - Send commands to control pump remotely  
✅ **Event Callbacks** - Connect/disconnect event handlers

### API Reference

#### `connect(jwtToken)`

Establishes WebSocket connection with JWT authentication.

```javascript
await webSocketClient.connect("your-jwt-token-here");
```

#### `subscribeToDevice(deviceId, callback)`

Subscribes to all topics for a specific device.

```javascript
const success = webSocketClient.subscribeToDevice("device9988", (data) => {
  console.log("Received:", data);
  // data structure:
  // {
  //   sensorType: 'temp' | 'humidity' | 'moisture' | 'light' | 'battery' | 'pumpStatus' | 'pumpMode',
  //   value: string,
  //   rawValue: object,
  //   timestamp: ISO string
  // }
});
```

#### `sendPumpCommand(deviceId, power, mode)`

Sends pump control command.

```javascript
// Turn pump ON
webSocketClient.sendPumpCommand("device9988", "ON");

// Turn pump OFF
webSocketClient.sendPumpCommand("device9988", "OFF");

// Turn pump ON with manual mode
webSocketClient.sendPumpCommand("device9988", "ON", "manual");
```

#### `disconnect()`

Closes WebSocket connection and unsubscribes from all topics.

```javascript
webSocketClient.disconnect();
```

#### `onConnect(callback)` / `onDisconnect(callback)`

Register event handlers for connection state changes.

```javascript
webSocketClient.onConnect(() => {
  console.log("Connected!");
});

webSocketClient.onDisconnect(() => {
  console.log("Disconnected!");
});
```

#### `getConnectionStatus()`

Returns current connection status.

```javascript
const isConnected = webSocketClient.getConnectionStatus();
```

## React Hook (`useWebSocketClient.js`)

### Usage in Components

```javascript
import { useWebSocketClient } from "../Hook/useWebSocketClient";

function Dashboard() {
  const deviceId = "device9988";
  const jwtToken = "your-jwt-token";

  const { liveData, isConnected, connectionStatus } = useWebSocketClient(
    deviceId,
    jwtToken
  );

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      <p>Temperature: {liveData.temperature}°C</p>
      <p>Moisture: {liveData.moisture}%</p>
      <p>Humidity: {liveData.humidity}%</p>
      <p>Light: {liveData.light} lux</p>
      <p>Battery: {liveData.battery}%</p>
      <p>Pump: {liveData.pumpStatus}</p>
      <p>Mode: {liveData.pumpMode}</p>
    </div>
  );
}
```

### Returned Data Structure

```javascript
{
  liveData: {
    temperature: number,  // °C
    humidity: number,     // %
    moisture: number,     // %
    light: number,        // lux
    battery: number,      // %
    pumpStatus: string,   // "ON" | "OFF"
    pumpMode: string      // "Manual" | "Automatic" | "Optimal"
  },
  isConnected: boolean,
  connectionStatus: {
    websocket: boolean,
    mqtt: boolean,
    type: string  // "websocket" | "none"
  }
}
```

## Testing Utility (`websocket_test.js`)

### Configuration

Before running tests, update these constants:

```javascript
const JWT_TOKEN = "your-jwt-token-here";
const DEVICE_ID = "your-device-id";
```

### Running the Test

1. **Import in your app** (e.g., `main.jsx` or `App.jsx`):

```javascript
import "./Service/websocket_test.js";
```

2. **Open browser console** (F12)

3. **Watch for connection logs**:

```
🔌 WebSocket Test Utility Starting...
📍 Device ID: device9988
🌐 Connecting to: wss://api.protonestconnect.co/ws?token=...
✅ WebSocket Connected Successfully!
🔔 Subscribing to all device topics...
   ✓ Subscribed to Temperature
   ✓ Subscribed to Humidity
   ✓ Subscribed to Moisture
   ✓ Subscribed to Light
   ✓ Subscribed to Battery
   ✓ Subscribed to Pump Status
✨ All subscriptions active! Waiting for messages...
```

### Browser Console Commands

Once connected, use these commands in the browser console:

```javascript
// Control pump
sendPumpCommand("on"); // Turn ON
sendPumpCommand("off"); // Turn OFF
sendPumpCommand("on", "manual"); // Turn ON with manual mode

// Simulate sensor data (testing only)
simulateSensorData("temp", 25.5);
simulateSensorData("moisture", 42.0);
simulateSensorData("humidity", 68.0);
simulateSensorData("light", 850.0);
simulateSensorData("battery", 87.5);

// Disconnect
wsTestClient.deactivate();
```

### Expected Console Output

When device sends data:

```
📡 [Temperature] Received: { temp: "25.5" }
📡 [Moisture] Received: { moisture: "42.0" }
🚰 [Pump Status] Received: { power: "on", mode: "manual" }
   • Power: ON
   • Mode: manual
```

## Message Flow Diagram

```
┌─────────────────┐
│   IoT Device    │
│   (ESP32/etc)   │
└────────┬────────┘
         │
         │ MQTT Publish
         │ Topic: protonest/device9988/stream/temp
         │ Payload: {"temp": "25.5"}
         │
         ▼
┌─────────────────────────────────────┐
│    ProtoNest MQTT Broker            │
│    (wss://api.protonestconnect.co)  │
└────────┬────────────────────────────┘
         │
         │ STOMP Frame
         │ Destination: /topic/stream/device9988/temp
         │ Body: {"temp": "25.5"}
         │
         ▼
┌─────────────────────────────────────┐
│    webSocketClient.js               │
│    - Receives STOMP message         │
│    - Parses JSON body               │
│    - Extracts sensorType & value    │
└────────┬────────────────────────────┘
         │
         │ Callback with parsed data:
         │ {
         │   sensorType: 'temp',
         │   value: '25.5',
         │   rawValue: {temp: '25.5'},
         │   timestamp: '2025-11-28T...'
         │ }
         │
         ▼
┌─────────────────────────────────────┐
│    useWebSocketClient.js            │
│    - handleData() function          │
│    - Updates liveData state         │
│    - setLiveData({...prev,          │
│        temperature: 25.5 })         │
└────────┬────────────────────────────┘
         │
         │ React state update
         │
         ▼
┌─────────────────────────────────────┐
│    Dashboard Component              │
│    - Receives updated liveData      │
│    - Renders: "Temperature: 25.5°C" │
└─────────────────────────────────────┘
```

## Connection Lifecycle

### Initial Connection

1. User opens dashboard → `useWebSocketClient` hook initializes
2. Hook calls `webSocketClient.connect(jwtToken)`
3. WebSocket connects to `wss://api.protonestconnect.co/ws?token=...`
4. STOMP handshake completes
5. `onConnect` callback fires
6. Hook calls `subscribeToDevice(deviceId, handleData)`
7. Client subscribes to all 6 topics
8. Connection status → `isConnected = true`

### Receiving Data

1. IoT device publishes MQTT message
2. ProtoNest broker forwards to STOMP topic
3. `webSocketClient` receives message
4. Message parsed and callback invoked
5. Hook's `handleData()` processes data
6. `liveData` state updated
7. React components re-render with new data

### Reconnection

1. Connection lost (network issue, server restart, etc.)
2. `onWebSocketClose` callback fires
3. Connection status → `isConnected = false`
4. STOMP client auto-reconnects after 5 seconds
5. `onConnect` callback fires again
6. Client automatically resubscribes to device topics
7. Connection status → `isConnected = true`

## Error Handling

### Connection Errors

```javascript
// In webSocketClient.js
onWebSocketError: (event) => {
  console.error("[WebSocketClient] 🚫 WebSocket error:", event);
  this.isConnected = false;
};
```

### STOMP Errors

```javascript
onStompError: (frame) => {
  console.error("[WebSocketClient] ❌ STOMP error:", frame.headers["message"]);
  console.error("[WebSocketClient] Error details:", frame.body);
  this.isConnected = false;
};
```

### Message Parsing Errors

```javascript
try {
  const body = JSON.parse(message.body);
  // Process message...
} catch (error) {
  console.error("[WebSocketClient] ❌ Failed to parse message:", error);
  console.error("[WebSocketClient] Raw message:", message.body);
}
```

## Troubleshooting

### Issue: WebSocket not connecting

**Symptoms:**

- Console shows: `🚫 WebSocket error`
- `isConnected` stays `false`

**Solutions:**

1. ✅ Verify JWT token is valid (check expiration)
2. ✅ Test connection with `websocket_test.js`
3. ✅ Check browser console for CORS errors
4. ✅ Verify WebSocket URL: `wss://api.protonestconnect.co/ws`
5. ✅ Try regenerating JWT token via `/get-token` API

### Issue: No data received

**Symptoms:**

- WebSocket connected but no sensor data

**Solutions:**

1. ✅ Verify deviceId matches the actual device
2. ✅ Check if device is publishing to MQTT topics
3. ✅ Use `websocket_test.js` to confirm subscriptions
4. ✅ Check topic format: `/topic/stream/{deviceId}/{sensorType}`
5. ✅ Verify device payload format matches specification

### Issue: Pump control not working

**Symptoms:**

- Pump commands sent but no response

**Solutions:**

1. ✅ Verify device is subscribed to pump control topic
2. ✅ Check device logs for received commands
3. ✅ Ensure payload format: `{"power": "on"}` (lowercase)
4. ✅ Test with `sendPumpCommand()` in browser console
5. ✅ Check if device is responding with status confirmation

### Issue: Frequent disconnections

**Symptoms:**

- Connection drops every few minutes

**Solutions:**

1. ✅ Check network stability
2. ✅ Verify heartbeat settings (default: 4000ms)
3. ✅ Check browser console for JWT expiration
4. ✅ Monitor server-side logs
5. ✅ Adjust `reconnectDelay` if needed

## Performance Considerations

### Memory Management

- WebSocket client uses singleton pattern (one connection)
- Subscriptions are tracked in `Map` for efficient cleanup
- Auto-unsubscribe when component unmounts or device changes

### Network Efficiency

- Heartbeat every 4 seconds keeps connection alive
- Auto-reconnect prevents excessive connection attempts
- Message parsing happens once per message

### React State Updates

- Data updates are batched by React
- Only changed values trigger re-renders
- Status cards re-render independently

## Security

### JWT Authentication

- Token passed in WebSocket URL query parameter
- Token is URL-encoded for safety
- Verify token validity before connection

### HTTPS/WSS

- All connections use secure WebSocket (`wss://`)
- TLS encryption for all messages
- No plain-text transmission

## Production Checklist

Before deploying:

- [ ] Replace test JWT token in `websocket_test.js`
- [ ] Remove or comment out `websocket_test.js` import in production
- [ ] Disable debug logs (`client.debug`)
- [ ] Verify all topic patterns match backend
- [ ] Test reconnection behavior
- [ ] Test pump control commands
- [ ] Verify error handling for all scenarios
- [ ] Add error boundaries in React components
- [ ] Monitor connection stability in production
- [ ] Set up alerts for connection failures

## Additional Resources

- **STOMP Documentation:** https://stomp.github.io/
- **@stomp/stompjs GitHub:** https://github.com/stomp-js/stompjs
- **DEVICE_PAYLOAD_SPECIFICATION.md** - Complete payload format reference
- **WEBSOCKET_INTEGRATION_GUIDE.md** - Step-by-step integration guide
- **DATA_FLOW_ARCHITECTURE.md** - System architecture overview

---

**Last Updated:** November 28, 2025  
**Version:** 1.0.0  
**Compatible with:** Plant Monitoring System PC v1.0
