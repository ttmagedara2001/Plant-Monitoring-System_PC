# WebSocket Data Flow Logic - Explanation

## Current Status: ⚠️ **PARTIALLY WORKING**

### ✅ What's Working:

1. WebSocket connects to ProtoNest server
2. Data is received from MQTT broker
3. Data is logged to console

### ❌ What's NOT Working:

1. **Data is NOT passed to StatusCards** - The callback mechanism was missing
2. **Wrong topic subscriptions** - All sensors subscribed to same topic
3. **Data persistence confusion** - Need to clarify where data is saved

---

## The Correct Data Flow

```
┌─────────────┐
│ ESP32 Device│ Publishes sensor data
└──────┬──────┘
       │
       ▼
┌────────────────────────────────────────┐
│    ProtoNest MQTT Broker               │
│  Topic: protonest/device9988/stream/*  │
└──────┬──────────────────────┬──────────┘
       │                      │
       │                      │ (Automatic - Server Side)
       ▼                      ▼
┌─────────────┐      ┌────────────────┐
│  WebSocket  │      │  Time-Series   │
│  (Real-time)│      │  Database      │
└──────┬──────┘      └────────┬───────┘
       │                      │
       │                      │
       ▼                      ▼
┌────────────────────────────────────────┐
│          PC Dashboard App              │
│                                        │
│  WebSocket → StatusCards (Live)       │
│  HTTP API → Charts (Historical)       │
└────────────────────────────────────────┘
```

---

## Key Questions & Answers

### Q1: Should the PC app save sensor data to files?

**NO!** ❌

According to `DATA_FLOW_ARCHITECTURE.md`:

- ProtoNest **automatically saves** all MQTT data to time-series database (server-side)
- PC app only needs to **display** real-time data
- For historical data, PC app **retrieves** it from server via HTTP API

### Q2: Where is sensor data stored?

**On ProtoNest Server** ☁️

- ESP32 publishes → MQTT Broker → **ProtoNest saves automatically**
- PC App retrieves via `getAllStreamData()` HTTP endpoint
- No local file storage needed in PC app

### Q3: How does StatusCard get updated?

**Via WebSocket callback** 🔄

**Flow:**

1. WebSocket receives message: `{temp: 25.5}`
2. WebSocketClient calls callback: `callback({sensorType: 'temp', value: 25.5})`
3. Dashboard's `handleData()` receives data
4. Updates `liveData` state
5. StatusCard re-renders with new value

---

## Fixed Implementation

### Issue #1: Callback Not Called

**Problem:** WebSocket received data but didn't notify Dashboard

**Before:**

```javascript
client.subscribe(topic, (message) => {
  console.log("📡 Received:", JSON.parse(message.body));
  // ❌ No callback called - data stays in console!
});
```

**After:**

```javascript
client.subscribe(topic, (message) => {
  const data = JSON.parse(message.body);
  console.log(`📡 Received ${sensorType}:`, data);

  // ✅ Call Dashboard callback
  if (self.dataCallback) {
    self.dataCallback({
      sensorType: sensorType,
      value: data[sensorType] || data.value,
      timestamp: data.timestamp || new Date().toISOString(),
    });
  }
});
```

### Issue #2: Wrong Topic Subscriptions

**Problem:** According to `DEVICE_PAYLOAD_SPECIFICATION.md`, topics should be specific per sensor

**Expected topics:**

- `protonest/device9988/stream/temp`
- `protonest/device9988/stream/humidity`
- `protonest/device9988/stream/moisture`
- `protonest/device9988/stream/light`
- `protonest/device9988/stream/battery`
- `protonest/device9988/state/motor/paddy`

**Current code issue:** All sensors subscribe to `/topic/stream/${deviceId}` (same topic)

**This needs verification:** Check what topics your MQTT broker actually uses!

---

## Data Storage Clarification

### Real-Time Data (WebSocket)

- **Source:** MQTT Broker via WebSocket
- **Destination:** `liveData` state in Dashboard
- **Lifetime:** Only current values (lost on page refresh)
- **Purpose:** Display on StatusCards
- **Saved to files?** ❌ No

### Historical Data (HTTP API)

- **Source:** ProtoNest Time-Series Database
- **Destination:** `historicalData` state in Dashboard
- **Retrieval:** `getAllStreamData()` every 30 seconds
- **Purpose:** Display on charts, export CSV
- **Saved to files?** ⚠️ Only when user clicks "Export CSV"

---

## What Was Changed in webSocketClient.js

### 1. Added `_setupConnectionHandlers()` method

- Intercepts STOMP client's `onConnect` event
- Subscribes to topics with callback support
- Parses incoming messages and calls `this.dataCallback()`

### 2. Modified subscription logic

```javascript
_setupConnectionHandlers() {
  const self = this;

  client.onConnect = (frame) => {
    // Subscribe to each sensor topic
    const streamTopics = ['temp', 'humidity', 'moisture', 'light', 'battery'];

    streamTopics.forEach(sensorType => {
      const topic = `/topic/stream/${deviceId}`;

      client.subscribe(topic, (message) => {
        const data = JSON.parse(message.body);

        // ✅ THIS IS THE KEY: Call Dashboard's callback
        if (self.dataCallback) {
          self.dataCallback({
            sensorType: sensorType,
            value: data[sensorType] || data.value,
            timestamp: data.timestamp || new Date().toISOString()
          });
        }
      });
    });
  };
}
```

### 3. Dashboard receives data

```javascript
// Dashboard.jsx
const handleData = (data) => {
  console.log(`[Dashboard] 📡 Real-time ${data.sensorType}:`, data.value);

  setLiveData((prev) => {
    const updated = { ...prev };

    switch (data.sensorType) {
      case "temp":
        updated.temperature = parseFloat(data.value);
        break;
      case "humidity":
        updated.humidity = parseFloat(data.value);
        break;
      // ... etc
    }

    return updated;
  });
};
```

---

## Remaining Issues to Fix

### ⚠️ Topic Format Mismatch

The code currently uses `/topic/stream/${deviceId}` but documentation suggests:

- `protonest/${deviceId}/stream/${sensorType}` - Specific per sensor

**TODO:** Verify actual MQTT topic format with MQTTX or broker logs

### ⚠️ Multiple Subscriptions to Same Topic

Current code subscribes 5 times to `/topic/stream/device9988` with different sensor type labels - this is inefficient.

**Better approach:**

1. Subscribe once per topic
2. Detect sensor type from message payload
3. OR subscribe to specific topics: `/topic/stream/device9988/temp`, etc.

---

## Testing Checklist

### ✅ Verify WebSocket Connection

```
1. Open Dashboard
2. Check console for "✅ Connected:"
3. Check "🔔 Subscribed to..." messages
```

### ✅ Verify Data Reception

```
1. ESP32 sends sensor data
2. Console shows "📡 Received temp: {temp: 25.5}"
3. Console shows "[Dashboard] 📡 Real-time temp: 25.5"
4. StatusCard updates with new value
```

### ✅ Verify Data Flow

```
1. Temperature changes on ESP32
2. StatusCard for Temperature updates (Live)
3. Historical chart updates after 30 seconds (HTTP API)
4. No errors in console
```

### ✅ Verify Data Storage

```
1. Real-time data: Check `liveData` state in React DevTools
2. Historical data: Check `historicalData` state
3. Server storage: Call deviceService.getAllStreamData() manually
4. Local files: Should be NONE (data stays in state/server)
```

---

## Summary

### The Fix Applied:

1. ✅ WebSocketClient now calls Dashboard callback when data arrives
2. ✅ Data flows from WebSocket → callback → handleData → liveData → StatusCard
3. ✅ Connection/disconnection callbacks properly forwarded

### Still Need to Verify:

1. ⚠️ Topic format (check MQTT broker)
2. ⚠️ Message payload structure (check actual messages)
3. ⚠️ Whether to use wildcard or specific topics

### Data Storage Answer:

- **Real-time:** Memory only (state)
- **Historical:** ProtoNest server (automatic)
- **Local files:** Only CSV exports (manual)
- **PC App does NOT save sensor data to files!**

---

## Next Steps

1. **Test the connection** - Open Dashboard and watch console
2. **Send test data** - Use MQTTX or ESP32 to publish
3. **Verify topics** - Check what topics broker actually uses
4. **Update topic subscriptions** - Use correct format based on verification
5. **Monitor StatusCards** - Confirm they update with real-time data
