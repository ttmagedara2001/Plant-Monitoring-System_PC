# WebSocket Integration - Fallback Mode Implementation

## What Changed

The `UseWebSocket.js` hook has been enhanced to gracefully handle API failures while maintaining full dashboard functionality.

## Key Improvements

### 1. **Dual HTTP Method Support for Token Fetching**
The hook now tries both GET and POST methods when fetching the JWT token:

```javascript
// Tries GET first
try {
  const response = await api.get("/get-token");
  // ... check for token or accessToken
}
catch (getErr) {
  // Falls back to POST
  const response = await api.post("/get-token", {});
  // ... check for token or accessToken
}
```

**Benefit:** Works with APIs that accept either GET or POST

### 2. **Mock Token Fallback**
If both methods fail, generates a development mock token:

```javascript
const mockToken = "mock-jwt-token-" + Date.now() + "-dev";
```

**Benefit:** Dashboard continues working even if API is down

### 3. **Mock Data Simulation**
New `startMockDataSimulation()` function generates realistic sensor data:

```javascript
// Updates every 3 seconds
// Simulates slight variation in:
// - Moisture (20-100%)
// - Temperature (15-35°C)
// - Humidity (30-90%)
// - Light (100-1500 lux)
```

**Benefit:** Full UI testing possible without backend

### 4. **Enhanced Error Logging**
Added descriptive console messages for debugging:

```
[WS] Fetching JWT token from API...
[WS] GET /get-token failed, trying POST with empty body...
[WS] Failed to fetch JWT token: {error}
[WS] Using mock token for development testing
[WS] Connecting to: wss://...?token=mock-jwt-token-...
```

### 5. **Better Reconnection Handling**
After max retries, falls back to mock data instead of crashing:

```javascript
if (reconnectAttempts.current >= maxReconnectAttempts) {
  console.warn("[WS] Max reconnection attempts reached, using mock data");
  setLiveData(DEFAULT_MOCK);
}
```

**Benefit:** App never becomes completely non-functional

## File Changes

### `src/Hooks/UseWebSocket.js`

**Lines Changed:**
- Lines 32-70: Enhanced `fetchJWTToken()` with dual-method support and fallback
- Lines 162-225: Updated `connectWebSocket()` with improved error handling
- Lines 227-250: New `startMockDataSimulation()` function
- Lines 253-282: Updated `useEffect()` to start mock data simulation

**New Functions:**
- `startMockDataSimulation()` - Generates realistic mock sensor data every 3 seconds

**New State:**
- `tokenError` - Already existed, tracks token fetching errors

## How It Works

```
┌─ User loads dashboard
│
├─ useEffect triggers connectWebSocket()
│
├─ fetchJWTToken() attempts:
│  ├─ GET /get-token
│  └─ (if fails) POST /get-token
│
├─ If API success → Use real token
├─ If API fails → Generate mock token
│
├─ Connect WebSocket with token
│  ├─ (real or mock)
│  └─ May succeed or fail
│
├─ startMockDataSimulation() starts
│  └─ Updates sensor values every 3 seconds
│
└─ Dashboard displays data
   (from WebSocket or mock simulation)
```

## Testing Scenarios

### Scenario 1: API Works (Production)
```
GET /get-token → Success
↓
Real JWT token
↓
WebSocket connects with real token
↓
Receive real sensor data
```

### Scenario 2: API Down (Current)
```
GET /get-token → Network Error
POST /get-token → Network Error
↓
Mock JWT token generated
↓
WebSocket connects with mock token (fails server-side)
↓
Mock data simulation starts
↓
Dashboard displays simulated data
```

### Scenario 3: Wrong HTTP Method
```
GET /get-token → 405 Method Not Allowed
↓
POST /get-token → Success
↓
Real JWT token
↓
WebSocket connects with real token
```

## Browser Console Expected Output

### When API Works:
```
[WS] Fetching JWT token from API...
[WS] Token fetch response: {token: "eyJ..."}
[WS] Connecting to: wss://...?token=eyJ...
[WS] Connected successfully
```

### When API Fails (Fallback):
```
[WS] Fetching JWT token from API...
[WS] GET /get-token failed, trying POST with empty body...
[WS] Failed to fetch JWT token: Network Error
[WS] Using mock token for development testing
[WS] Connecting to: wss://...?token=mock-jwt-token-...
[WS] Sent handshake: {messageType: "subscribe", deviceId: "..."}
```

## What Still Works in Mock Mode

✅ Dashboard renders  
✅ Status cards display live data  
✅ Charts populate with historical data  
✅ Alerts trigger based on thresholds  
✅ Settings panel loads  
✅ Device selector works  
✅ Data refreshes every 3 seconds  
✅ Export to CSV works (with mock data)  
✅ Responsive design functions normally  

## What Doesn't Work in Mock Mode

❌ Real sensor data  
❌ Backend WebSocket message reception  
❌ Pump control commands  
❌ Settings persistence to backend  
❌ User authentication  

## Debugging Tips

1. **Check console for token source:**
   ```
   // Real JWT?
   [WS] Token fetch response: {token: "eyJ..."}
   
   // Mock fallback?
   [WS] Using mock token for development testing
   ```

2. **Monitor network requests:**
   - DevTools → Network tab
   - Filter by "get-token"
   - Check Status, Headers, Response

3. **Decode JWT token:**
   - Visit [jwt.io](https://jwt.io)
   - Paste token in "Encoded" field
   - See payload structure

4. **Verify WebSocket connection:**
   - DevTools → Console
   - Look for: `[WS] Connected successfully`
   - Or: `[WS] Connection closed` + retry attempts

## Next Steps to Fix API Integration

1. **Identify correct API endpoint:**
   - Check backend documentation
   - Confirm URL path
   - Confirm HTTP method (GET vs POST)

2. **Check for required fields:**
   - Does it need authentication headers?
   - Does it need request body fields?
   - Does it need query parameters?

3. **Use API_DEBUG_GUIDE.md:**
   - Follow testing methods
   - Test endpoint directly
   - Identify exact failure cause

4. **Update UseWebSocket.js:**
   - Modify `fetchJWTToken()` function
   - Add required headers/body/params
   - Test with real API

5. **Verify JWT in WebSocket:**
   - Connect with real token
   - Monitor console for connection status
   - Verify real sensor data appears

## Related Files

- **API Configuration:** `src/Services/api.js`
- **Dashboard Component:** `src/Components/Dashboard.jsx`
- **Status Display:** `src/Components/StatusCard.jsx`
- **Historical Chart:** `src/Components/HistoricalChart.jsx`
- **Debug Guide:** `API_DEBUG_GUIDE.md`
- **Payload Reference:** `WEBSOCKET_PAYLOADS.md`
- **Integration Guide:** `WEBSOCKET_INTEGRATION_GUIDE.md`

