# WebSocket Integration Guide - Step-by-Step

## Overview

The dashboard is now **fully connected to the WebSocket** with the following flow:

```
1. Dashboard starts → useWebSocket hook is called with deviceId
2. Hook calls /get-token API → receives JWT token
3. Hook builds WebSocket URL: wss://...?token={JWT}
4. Hook connects and sends subscribe message with deviceId
5. Server sends payloads → Hook receives and routes to Dashboard
6. Dashboard updates UI with real-time data and charts
```

---

## How Data Flows to Dashboard

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DASHBOARD (React)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Dashboard.jsx                                         │   │
│  │ - Receives: liveData, chartData, alerts from hook    │   │
│  │ - Displays status cards, chart, alert bars          │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ useWebSocket(deviceId)
                        │
┌───────────────────────▼──────────────────────────────────────┐
│              useWebSocket Hook (React)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. fetchJWTToken() → calls /get-token API           │   │
│  │ 2. buildWebSocketURL(token) → creates wss:// URL    │   │
│  │ 3. new WebSocket(url) → connects                     │   │
│  │ 4. handleMessage() → routes by messageType           │   │
│  │    - sensor_update → setLiveData()                   │   │
│  │    - history_batch → setChartData()                  │   │
│  │    - alerts → setAlerts()                            │   │
│  │    - ack/status → setLastAck()                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  Returns: { liveData, chartData, alerts, isConnected, ... } │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ JSON WebSocket Messages
                        │
┌───────────────────────▼──────────────────────────────────────┐
│              Backend / External System                       │
│  wss://protonest-connect-...yellowsea.../ws?token={JWT}    │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Verify WebSocket Connection

**Browser Console Check:**

Open the dashboard in your browser and press `F12` to open Developer Tools. Check the **Console** for these logs:

```
[WS] Token fetch response: {token: "eyJhbGc...", ...}
[WS] Connecting to: wss://protonest-connect-...?token=eyJ...
[WS] Connected successfully
[WS] Updated liveData: {moisture: 45, temperature: 24, ...}
```

If you see `[WS] Connected successfully`, the WebSocket is live and ready.

---

## Step 2: Send sensor_update Payload

This updates **live sensor data** (status cards) and triggers alerts.

### 2A. From Backend WebSocket Server

Send this JSON message to **all connected clients** (or specific device):

```json
{
  "messageType": "sensor_update",
  "deviceId": "greenhouse-1",
  "timestamp": "2025-11-20T10:15:30.123Z",
  "data": {
    "moisture": 45.2,
    "temperature": 24.8,
    "humidity": 62.5,
    "light": 850,
    "pumpStatus": "OFF",
    "pumpMode": "AUTO"
  }
}
```

**Expected Dashboard Behavior:**
- Status cards update with new values
- No chart update (chart is only for history_batch)
- No alerts (values are within thresholds)

---

### 2B. From Browser Console (Testing)

```javascript
// Get the send function from hook (advanced testing)
// This requires injecting into React context (not recommended for production)

// Simulate receiving a message by sending it yourself:
const payload = {
  "messageType": "sensor_update",
  "deviceId": "greenhouse-1",
  "timestamp": new Date().toISOString(),
  "data": {
    "moisture": 45.2,
    "temperature": 24.8,
    "humidity": 62.5,
    "light": 850,
    "pumpStatus": "OFF",
    "pumpMode": "AUTO"
  }
};

// If you have access to the WebSocket:
// ws.send(JSON.stringify(payload));
```

---

## Step 3: Send history_batch Payload

This updates the **line chart** with historical data.

### 3A. From Backend

```json
{
  "messageType": "history_batch",
  "deviceId": "greenhouse-1",
  "timestamp": "2025-11-20T10:25:00Z",
  "data": [
    { "time": "10:00", "moisture": 40, "temperature": 24 },
    { "time": "10:05", "moisture": 38, "temperature": 25 },
    { "time": "10:10", "moisture": 45, "temperature": 23 },
    { "time": "10:15", "moisture": 42, "temperature": 24 },
    { "time": "10:20", "moisture": 40, "temperature": 25 },
    { "time": "10:25", "moisture": 39, "temperature": 26 }
  ]
}
```

**Expected Dashboard Behavior:**
- Chart clears and **redraws** with new 6 data points
- Both moisture and temperature lines visible
- Interactive tooltips on hover

---

## Step 4: Trigger Alerts

Send sensor data that violates thresholds.

### 4A. Critical Alert (Moisture Too Low)

Threshold: moistureMin = 20

```json
{
  "messageType": "sensor_update",
  "deviceId": "greenhouse-1",
  "timestamp": "2025-11-20T10:30:00Z",
  "data": {
    "moisture": 15.0,
    "temperature": 24.0,
    "humidity": 60.0,
    "light": 800,
    "pumpStatus": "OFF",
    "pumpMode": "AUTO"
  }
}
```

**Expected Dashboard Behavior:**
- **Red alert bar appears** at top: "CRITICAL: Soil Moisture (15.0%) is below minimum threshold (20%)."
- Soil Moisture status card border turns **red**

---

### 4B. Warning Alert (Moisture Too High)

Threshold: moistureMax = 60

```json
{
  "messageType": "sensor_update",
  "deviceId": "greenhouse-1",
  "timestamp": "2025-11-20T10:31:00Z",
  "data": {
    "moisture": 72.0,
    "temperature": 24.0,
    "humidity": 70.0,
    "light": 900,
    "pumpStatus": "ON",
    "pumpMode": "MANUAL"
  }
}
```

**Expected Dashboard Behavior:**
- **Yellow alert bar appears**: "WARNING: Soil Moisture (72.0%) exceeds maximum threshold (60%)."
- Soil Moisture status card border turns **red**

---

### 4C. Temperature Warning

Threshold: tempMax = 30

```json
{
  "messageType": "sensor_update",
  "deviceId": "greenhouse-1",
  "timestamp": "2025-11-20T10:32:00Z",
  "data": {
    "moisture": 50.0,
    "temperature": 31.5,
    "humidity": 55.0,
    "light": 950,
    "pumpStatus": "OFF",
    "pumpMode": "AUTO"
  }
}
```

**Expected Dashboard Behavior:**
- **Yellow alert bar appears**: "WARNING: Temperature (31.5°C) exceeds maximum threshold (30°C)."
- Temperature status card border turns **red**

---

### 4D. Multiple Alerts

Send both moisture low AND temperature high:

```json
{
  "messageType": "sensor_update",
  "deviceId": "greenhouse-1",
  "timestamp": "2025-11-20T10:33:00Z",
  "data": {
    "moisture": 18.0,
    "temperature": 32.0,
    "humidity": 45.0,
    "light": 850,
    "pumpStatus": "ON",
    "pumpMode": "MANUAL"
  }
}
```

**Expected Dashboard Behavior:**
- **Two alert bars appear** stacked at top
- Both Moisture and Temperature status cards turn **red**

---

## Step 5: Test with Real WebSocket Client

### Option A: Using wscat (Command Line)

**Install:**
```bash
npm install -g wscat
```

**1. Get JWT Token:**
```bash
curl -X GET https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token \
  -H "Content-Type: application/json"
```

Copy the token from response.

**2. Connect to WebSocket:**
```bash
wscat -c "wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token=YOUR_JWT_TOKEN_HERE"
```

**3. Send Payload:**
```
{"messageType":"sensor_update","deviceId":"greenhouse-1","timestamp":"2025-11-20T10:15:30.123Z","data":{"moisture":45.2,"temperature":24.8,"humidity":62.5,"light":850,"pumpStatus":"OFF","pumpMode":"AUTO"}}
```

---

### Option B: Using Python WebSocket Client

**install:**
```bash
pip install websocket-client
```

**Script (test_websocket.py):**
```python
import json
import websocket
from datetime import datetime

# Get your JWT token first
JWT_TOKEN = "YOUR_JWT_TOKEN_HERE"
WS_URL = f"wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token={JWT_TOKEN}"

def send_sensor_update():
    ws = websocket.create_connection(WS_URL)
    
    payload = {
        "messageType": "sensor_update",
        "deviceId": "greenhouse-1",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": {
            "moisture": 45.2,
            "temperature": 24.8,
            "humidity": 62.5,
            "light": 850,
            "pumpStatus": "OFF",
            "pumpMode": "AUTO"
        }
    }
    
    ws.send(json.dumps(payload))
    print(f"Sent: {json.dumps(payload, indent=2)}")
    
    ws.close()

if __name__ == "__main__":
    send_sensor_update()
```

**Run:**
```bash
python test_websocket.py
```

---

## Step 6: Dashboard Data Flow Checklist

| Payload Type | API Call | Hook Function | Dashboard State | UI Component |
|---|---|---|---|---|
| `sensor_update` | — | `handleSensorUpdate()` | `liveData` → `setLiveData()` | Status Cards, Alerts |
| `history_batch` | — | `handleHistoryBatch()` | `chartData` → `setChartData()` | HistoricalChart |
| `alerts` | — | `handleAlerts()` | `alerts` → `setAlerts()` | Alert Bars |
| `ack`/`status` | — | `handleAck()` | `lastAck` → `setLastAck()` | Console / Feedback |
| `/get-token` | ✅ Called on mount | `fetchJWTToken()` | JWT token used | (None, internal) |

---

## Step 7: Common Issues & Debugging

### Issue: "No deviceId provided, using mock data"

**Cause:** `deviceId` is undefined or empty string

**Solution:**
- Check URL: should be `/dashboard/greenhouse-1`
- Verify `deviceList` includes the device
- Check browser console for errors

---

### Issue: "[WS] Failed to fetch JWT token"

**Cause:** `/get-token` API is failing

**Solution:**
```javascript
// Check in browser console:
console.log(api.defaults.baseURL);  // Should be production URL

// Verify API response:
// Open Network tab (F12) → XHR → filter /get-token
// Check status: should be 200
// Check response: should have `token` or `accessToken`
```

---

### Issue: "[WS] Failed to parse message"

**Cause:** WebSocket received invalid JSON

**Solution:**
- Verify payload is valid JSON (use JSON.stringify)
- Check `deviceId` matches URL parameter
- Ensure all required fields are present

---

### Issue: Chart doesn't update

**Cause:** `history_batch` data format incorrect

**Solution:**
```javascript
// Correct format:
{
  "messageType": "history_batch",
  "deviceId": "greenhouse-1",
  "data": [
    { "time": "10:00", "moisture": 40, "temperature": 24 },
    // ...
  ]
}

// WRONG:
{
  "messageType": "history_batch",
  "data": {  // ❌ Should be array, not object
    "time": ["10:00"],
    "moisture": [40],
    "temperature": [24]
  }
}
```

---

## Step 8: Full End-to-End Test Flow

**Time: 5-10 minutes**

1. **Start the dashboard:**
   ```bash
   npm run dev
   ```
   - Open http://localhost:5174

2. **Check console:**
   - Press F12 → Console
   - Should see `[WS] Connected successfully`

3. **Send sensor_update:**
   - Use wscat or Python script
   - Dashboard status cards should update immediately

4. **Send history_batch:**
   - Chart should appear with 5-6 data points

5. **Trigger alert:**
   - Send moisture: 15 (below 20 threshold)
   - Red alert bar should appear at top

6. **Verify connection stability:**
   - Leave running for 1 minute
   - Check console for reconnection attempts

---

## Summary: Payload Types & Visual Effect

| Payload | Example Data | Visual Effect |
|---|---|---|
| **sensor_update** | moisture: 45.2 | Status card updates; chart unchanged |
| **sensor_update** | moisture: 15.0 | + Red alert bar "CRITICAL" |
| **sensor_update** | temperature: 31.5 | + Yellow alert bar "WARNING" |
| **history_batch** | [ {time, moisture, temperature} ] | Chart redraws with all points |
| **alerts** | [ {id, severity, message} ] | Alert bars update (server-side computation) |

---

## Next Steps

- **Production:** Replace mock `/get-token` with real authentication
- **Optimization:** Add message batching for high-frequency sensor data
- **Features:** Implement command_control for pump toggle (already in Dashboard)
- **Testing:** Create mock WebSocket server for development testing

