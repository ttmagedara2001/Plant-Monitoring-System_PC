# Testing Guide - Protonest Integration

## Pre-Flight Checklist

- [ ] Protonest account created and verified
- [ ] Device registered in Protonest dashboard
- [ ] Secret key obtained from device configuration
- [ ] `.env` file configured with email and secret key
- [ ] Node.js and npm installed
- [ ] Project dependencies installed (`npm install`)

---

## Step 1: Environment Setup

### Create `.env` File

```bash
# In project root, copy the example:
cp .env.example .env

# Edit .env with your credentials:
VITE_USER_EMAIL=your-email@example.com
VITE_USER_PASSWORD=your-secret-key-from-dashboard
```

### Verify Environment Variables

```bash
# Check .env file was created
cat .env

# Should show:
# VITE_USER_EMAIL=...
# VITE_USER_PASSWORD=...
```

---

## Step 2: Start Development Server

```bash
# Install dependencies if not already done
npm install

# Start development server
npm run dev

# Output should show:
# ➜  Local:   http://localhost:5173/
```

---

## Step 3: Monitor Browser Console

Open the dashboard in browser: `http://localhost:5173/`

### Open DevTools Console (F12)

Watch for these connection logs (in order):

```
[WS] Fetching JWT token from API...
[WS] Token fetch response: {status: "Success", data: {...}}
[WS] Connecting to: wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token=...
[WS] Connected successfully
[WS] Subscribed to state topic: {subscribe: "/topic/state/device0000"}
[WS] Subscribed to stream topic: {subscribe: "/topic/stream/device0000"}
```

---

## Step 4: Test Dashboard Display

### Check Status Cards

- ✅ Moisture value displays
- ✅ Temperature value displays
- ✅ Humidity value displays
- ✅ Light value displays

### Expected Initial State

All cards should show green borders (optimal) with placeholder values from real device or mock data.

---

## Step 5: Send Test Data from Device

### Using MQTT (if device supports it)

```bash
# Publish stream data to device topic
mosquitto_pub -h protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io \
  -u "your-email@example.com" \
  -P "your-secret-key" \
  -t "protonest/device0000/stream/temp" \
  -m '{"temp": 24.5, "humidity": 60}'

# Or publish state data
mosquitto_pub -h protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io \
  -u "your-email@example.com" \
  -P "your-secret-key" \
  -t "protonest/device0000/state/motor/paddy" \
  -m '{"power": "off", "status": "idle"}'
```

### Monitor Dashboard

After publishing, watch browser console:

```
[WS] Received message: {destination: "/topic/stream/device0000", payload: {...}}
[WS] Updated liveData from stream: {temp: 24.5, humidity: 60}
```

Check dashboard - values should update!

---

## Step 6: Test Alerts

### Trigger Low Moisture Alert

1. Open Settings Panel (in dashboard)
2. Set "Moisture Min" to 90
3. Send mock data with moisture < 90 (or wait for current value to drop)
4. Alert should appear in red box:
   ```
   🔴 Moisture Low
   Current: 45% | Threshold: 90%
   ```

### Trigger High Temperature Alert

1. Set "Temperature Max" to 20°C
2. Send data with temperature > 20 (or wait for value to rise)
3. Alert should appear:
   ```
   🔴 Temperature High
   Current: 24°C | Threshold: 20°C
   ```

---

## Step 7: Test Chart Export

### Export to CSV

1. Scroll to Historical Trend Chart
2. Wait 30+ seconds for data to accumulate (50 points)
3. Click "Export to CSV" button
4. File should download: `plant-monitoring-data-[timestamp].csv`

### Verify CSV Content

```csv
timestamp,moisture,temperature,humidity,light
2025-01-15T10:30:00Z,45,24,60,800
2025-01-15T10:33:00Z,46,24.5,61,810
...
```

---

## Step 8: Test Token Refresh

### Check Token Expiration & Refresh

1. Monitor browser console for refresh logs (after 23 hours in production)
2. For testing, temporarily modify refresh timer in UseWebSocket.js:

```javascript
// Change 23 * 60 * 60 * 1000 to 60000 (1 minute) for testing
startTokenRefreshTimer = setTimeout(() => {
  console.log("[WS] Token refresh timer triggered");
  refreshJWTToken();
}, 60000); // 1 minute for testing
```

3. Wait 1 minute and watch console:

```
[WS] Token refresh timer triggered
[WS] Refreshing JWT token...
[WS] Token refresh response: {status: "Success", data: {...}}
```

---

## Step 9: Test Multiple Devices

### Add Another Device

1. Register second device in Protonest dashboard
2. Change device ID in dashboard selector
3. Dashboard should:
   - Fetch new data for that device
   - Resubscribe to new topics
   - Clear previous data
   - Show data from new device

Console should show:

```
[WS] Subscribed to state topic: {subscribe: "/topic/state/device0001"}
[WS] Subscribed to stream topic: {subscribe: "/topic/stream/device0001"}
[WS] Received message: {destination: "/topic/stream/device0001", ...}
```

---

## Step 10: Performance Testing

### Monitor Resource Usage

1. Open DevTools → Performance tab
2. Start recording
3. Let app run for 1 minute
4. Stop recording and check:
   - CPU usage should be low (< 10%)
   - Memory should be stable (not constantly growing)
   - No red warnings in console

### Check Bundle Size

```bash
npm run build

# Output will show:
# dist/assets/index-abc123.js    445.5 kB (target: < 500 kB)
```

---

## Common Issues & Solutions

### Issue: "Email and password required" Error

**Cause:** Missing .env file or credentials not set

**Solution:**

```bash
# Create .env file
cp .env.example .env

# Edit with your credentials
# Then reload browser (hard refresh: Ctrl+Shift+R)
```

### Issue: "Invalid credentials" Error (400)

**Cause:** Wrong email or secret key

**Solution:**

1. Go to Protonest Web Dashboard
2. Find your device
3. Copy the secret key (not your login password)
4. Update .env file
5. Reload

### Issue: WebSocket Connection Failed

**Cause:** Could be multiple reasons

**Debug Steps:**

```javascript
// In browser console:

// 1. Check if token was fetched
console.log("JWT Token:", localStorage.getItem("jwtToken"));

// 2. Check WebSocket URL
console.log(
  "WS URL:",
  "wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token=" +
    localStorage.getItem("jwtToken").substring(0, 50) +
    "..."
);

// 3. Check if topics are correct
console.log("Topics should be:");
console.log("  - /topic/state/{deviceId}");
console.log("  - /topic/stream/{deviceId}");

// 4. Check for network errors in Network tab
// Open DevTools → Network tab
// Look for wss:// request
// Check Response and response code
```

### Issue: No Data Appears in Dashboard

**Cause:** Device not sending data or topics wrong

**Solution:**

1. Verify device is configured in Protonest
2. Send test data manually (see Step 5)
3. Check browser console for [WS] messages
4. Verify topic names in code match device config

### Issue: Chart Won't Populate

**Cause:** Needs ~50 data points, takes ~150 seconds at 3-second intervals

**Solution:**

- Wait at least 2-3 minutes for chart to populate
- Or send multiple data points via MQTT quickly
- Chart auto-updates as data arrives

### Issue: Performance Degradation After Long Run

**Cause:** Chart data not being trimmed

**Current Fix:** Automatically keeps last 50 points

**If Still Having Issues:**

```javascript
// Manually clear in browser console:
localStorage.clear();
window.location.reload();
```

---

## Testing Scenarios Checklist

### Scenario 1: Normal Operation

- [ ] Dashboard loads without errors
- [ ] Data updates every 3-5 seconds
- [ ] Chart populates gradually
- [ ] Alerts trigger correctly
- [ ] CSV export works

### Scenario 2: Multiple Alerts

- [ ] All 3 alerts display simultaneously
- [ ] Alert borders turn red on cards
- [ ] Alert boxes show correct values
- [ ] Clearing trigger removes alert

### Scenario 3: Device Switching

- [ ] Selecting new device works
- [ ] Old data clears
- [ ] New device data loads
- [ ] Topics resubscribe correctly

### Scenario 4: Extended Run (24 hours)

- [ ] Token refresh executes
- [ ] WebSocket reconnects cleanly
- [ ] No memory leaks
- [ ] No console errors
- [ ] Data still updates after refresh

### Scenario 5: Network Interruption

- [ ] Device loss causes connection error
- [ ] Browser console shows retry logs
- [ ] Exponential backoff observed
- [ ] Manual refresh restores connection

---

## Debugging Tips

### Enable More Detailed Logs

Add to browser console:

```javascript
// Watch all WebSocket messages
const originalLog = console.log;
console.log = function (...args) {
  if (String(args[0]).includes("[WS]")) {
    originalLog.apply(console, [
      "%cWS LOG",
      "color: blue; font-weight: bold",
      ...args.slice(1),
    ]);
  } else {
    originalLog.apply(console, args);
  }
};
```

### Inspect Live Data State

```javascript
// In browser console:
// This requires adding a window export in React component

// Or check localStorage:
console.log("Stored JWT Token:", localStorage.getItem("jwtToken"));
console.log("Refresh Token:", localStorage.getItem("refreshToken"));
```

### Test API Endpoints Directly

```javascript
// Test token fetch
fetch(
  "https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "your-email@example.com",
      password: "your-secret-key",
    }),
  }
)
  .then((r) => {
    console.log("Status:", r.status);
    return r.json();
  })
  .then((d) => console.log("Response:", d));
```

---

## Success Indicators

✅ Dashboard loads on `http://localhost:5173/`  
✅ Browser console shows `[WS] Connected successfully`  
✅ Status cards display current sensor values  
✅ Chart shows historical data with 50+ points  
✅ Alerts trigger and display correctly  
✅ CSV export downloads data  
✅ No red errors in console (warnings OK)  
✅ Performance is smooth (60 fps)

---

**When All Tests Pass:** Your Protonest integration is ready!

Next: Deploy to production and monitor real sensor data.
