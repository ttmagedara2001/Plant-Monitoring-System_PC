# Quick Start - Dashboard Status & Next Steps

## ✅ Current Status

The Plant Monitoring Dashboard is **fully functional with mock data** while API integration is being debugged.

### What Works Now

| Feature               | Status | Notes                                        |
|-----------------      |------- |------- --------                              |
| Dashboard loads       | ✅    | No crashes on root path                       |
| Status cards display  | ✅    | Shows moisture, temperature, humidity, light  |
| Real-time updates     | ✅    | Mock data updates every 3 seconds             |
| Alerts/thresholds     | ✅    | Multiple alerts for each condition            |
| Historical chart      | ✅    | Displays trend data                           |
| Settings panel        | ✅    | Can adjust thresholds                         |
| Responsive design     | ✅    | Works on desktop and mobile                   |
| Export to CSV         | ✅    | Downloads chart data                          |

### What Needs Backend API

| Feature | Status | Blocker |
|---------|--------|---------|
| Real sensor data | ❌ | JWT token endpoint failing |
| WebSocket connection | ⚠️ | Connects but receives no server messages |
| Pump control | ❌ | Needs real WebSocket + backend |
| Settings save | ❌ | Needs backend API |

---

## 📊 Dashboard Preview

When you open the app now, you'll see:

```
┌─────────────────────────────────────────┐
│  Plant Monitoring System                │
│  Device: greenhouse-1                   │
└─────────────────────────────────────────┘

Status Cards (Top Row):
┌──────────┬──────────┬──────────┬──────────┐
│ Moisture │ Temp     │ Humidity │ Light    │
│ 45%      │ 24°C     │ 60%      │ 800 lux  │
│ (Green)  │ (Green)  │ (Green)  │ (Green)  │
└──────────┴──────────┴──────────┴──────────┘

Alerts (if any):
[ No alerts - all values optimal ]

Charts (Bottom):
┌─────────────────────────────────────┐
│ Historical Trend                    │
│ (Moisture & Temp over time)         │
│                                     │
│      ╱╲                             │
│     ╱  ╲___╱╲                       │
│    ╱        ╲__╱╲                   │
│   ╱              ╲___               │
└─────────────────────────────────────┘

Controls:
┌──────────────────────────────┐
│ Settings Panel               │
│ • Moisture Min: 30%          │
│ • Moisture Max: 70%          │
│ • Temp Max: 30°C             │
│ [Save Settings]              │
└──────────────────────────────┘
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open in Browser
```
http://localhost:5173
```

### 4. Check Console
Open DevTools (F12) → Console tab to see connection status:

**With mock data (current):**
```
[WS] Fetching JWT token from API...
[WS] Using mock token for development testing
[WS] Connecting to: wss://...?token=mock-jwt-token-...
```

**With real API (when fixed):**
```
[WS] Fetching JWT token from API...
[WS] Token fetch response: {token: "eyJ..."}
[WS] Connected successfully
```

---

## 🔍 API Integration Issue

### Current Problem
The `/get-token` endpoint returns a **Network Error**.

**Impact:** Dashboard can't fetch JWT token to authenticate with WebSocket

### Workaround (Active)
- Generates mock JWT token automatically
- Starts mock data simulation
- App functions normally with simulated data

### Solution (3 Steps)

#### Step 1: Identify API Method
Open browser DevTools console and run:

```javascript
fetch("https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token")
  .then(r => r.json())
  .then(d => console.log("✓ GET works:", d))
  .catch(e => console.log("✗ GET failed:", e.message));

fetch("https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({})
})
  .then(r => r.json())
  .then(d => console.log("✓ POST works:", d))
  .catch(e => console.log("✗ POST failed:", e.message));
```

**Note what works:** GET or POST?

#### Step 2: Check Response Format
Look at console output - does it return:
- `{token: "..."}` or
- `{accessToken: "..."}`?

#### Step 3: Update Hook
File: `src/Hooks/UseWebSocket.js`

If POST works:
```javascript
const response = await api.post("/get-token", {});
```

If additional headers needed:
```javascript
const response = await api.post("/get-token", {}, {
  headers: {"Authorization": "Bearer your-token"}
});
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `API_DEBUG_GUIDE.md` | How to test API endpoints |
| `FALLBACK_MODE_GUIDE.md` | How fallback mock mode works |
| `WEBSOCKET_PAYLOADS.md` | Example WebSocket messages |
| `WEBSOCKET_INTEGRATION_GUIDE.md` | Full integration walkthrough |

---

## 🛠️ File Structure

```
src/
├── Components/
│   ├── Dashboard.jsx          ← Main container
│   ├── StatusCard.jsx         ← Individual sensor display
│   ├── HistoricalChart.jsx    ← Chart component
│   ├── SettingsPanel.jsx      ← Settings control
│   ├── Header.jsx             ← Device selector
│   └── ErrorBoundary.jsx      ← Error handling
│
├── Hooks/
│   └── UseWebSocket.js        ← WebSocket integration (MODIFIED)
│
├── Services/
│   └── api.js                 ← Axios config
│
├── Context/
│   └── AuthContext.jsx        ← Auth state
│
└── App.jsx                    ← Router setup
```

---

## 🐛 Troubleshooting

### Dashboard won't load
```
→ Check browser console for errors
→ Make sure npm run dev is running
→ Try clearing cache (Ctrl+Shift+Delete)
```

### No data showing
```
→ This is normal - mock mode active
→ Check console for [WS] logs
→ Wait 3-5 seconds for mock data to populate
```

### Chart empty
```
→ Mock data needs ~30 seconds to accumulate
→ Historical chart requires history_batch from server
→ With mock mode, it populates gradually
```

### High CPU usage
```
→ Mock data simulation running
→ Will stop once real WebSocket connects
→ Normal for development
```

### Alerts not triggering
```
→ Check threshold values (Settings panel)
→ Mock data updates every 3 seconds
→ Alert will show when threshold exceeded
→ Wait for mock values to reach threshold
```

---

## 💡 Tips for Testing

### Test Alerts
1. Open Settings panel
2. Set "Moisture Min" to 80%
3. Wait for mock moisture to reach 80%+
4. Alert will appear in red box

### Test Chart Export
1. Wait 30+ seconds for chart to populate
2. Scroll to chart section
3. Click "Export to CSV" button
4. Check Downloads folder

### Test Device Selector
1. Click device dropdown in header
2. Select "greenhouse-1" or other device
3. Dashboard resets with that device's data

### Monitor Connection Status
1. Open DevTools Console
2. Watch for `[WS]` prefixed messages
3. Red errors = problems
4. Blue logs = normal operation

---

## 📞 For Backend Integration

When you have the real API endpoint, provide:

1. **Endpoint URL:** (already have: `/api/v1/user/get-token`)
2. **HTTP Method:** GET or POST?
3. **Request Body:** (if POST, what fields needed?)
4. **Request Headers:** (authentication, content-type, etc?)
5. **Response Format:** Field name for token?

Once we have this info, updating the hook takes ~2 minutes.

---

## ✨ What's Next

1. **Fix API:** Identify correct `/get-token` endpoint
2. **Test Real Token:** Verify JWT token works with WebSocket
3. **Connect Real Data:** Start receiving sensor updates
4. **Implement Controls:** Add pump toggle functionality
5. **Production Deploy:** Move to production environment

---

## 📝 Recent Changes

- ✅ Enhanced token fetching with dual-method support (GET + POST)
- ✅ Mock token generation for development
- ✅ Mock data simulation every 3 seconds
- ✅ Better error messages in console
- ✅ Improved reconnection fallback
- ✅ Created comprehensive debugging guides

---

**Status:** Ready for testing with mock data  
**Next Blocker:** Real API endpoint configuration  
**Estimated Time to Fix API:** 15-30 minutes once details provided

