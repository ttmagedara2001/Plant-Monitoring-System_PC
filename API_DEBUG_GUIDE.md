# API Debug Guide

## Overview

This guide helps diagnose and debug API integration issues with the Plant Monitoring System backend.

## Backend Configuration

**Base URL:** `https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io`

**API Prefix:** `/api/v1/user`

**WebSocket URL:** `wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token={JWT_TOKEN}`

---

## API Endpoints

### 1. **GET /get-token** (JWT Token Acquisition)

**Purpose:** Fetch a JWT token for WebSocket authentication

**Request:**
```bash
GET /api/v1/user/get-token
```

**Expected Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

OR

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Status Code:** 200

**Current Implementation Issues:**
- ❌ Returns Network Error
- Possible causes:
  - Endpoint expects POST instead of GET
  - Requires authentication headers
  - CORS misconfiguration
  - Backend service down

---

## Testing Methods

### Method 1: Browser DevTools (Simplest)

1. Open Firefox/Chrome DevTools → Console tab
2. Paste this code:

```javascript
fetch("https://protonest-connect-general-app.yellowsea-5dc9141a.westeurcore.azurecontainerapps.io/api/v1/user/get-token")
  .then(r => r.json())
  .then(d => console.log("✓ GET Success:", d))
  .catch(e => console.log("✗ GET Failed:", e.message));

fetch("https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({})
})
  .then(r => r.json())
  .then(d => console.log("✓ POST Success:", d))
  .catch(e => console.log("✗ POST Failed:", e.message));
```

### Method 2: PowerShell/curl

```powershell
# Test GET
curl -X GET "https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token"

# Test POST
curl -X POST "https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token" `
  -H "Content-Type: application/json" `
  -d '{}'
```

### Method 3: VS Code REST Extension

Install "REST Client" extension, then create a file `test.rest`:

```http
### Test GET /get-token
GET https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token
Content-Type: application/json

### Test POST /get-token
POST https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token
Content-Type: application/json

{}
```

Right-click and select "Send Request"

---

## Current Application Behavior

### When API Fails (Current State)

1. **Token Fetching:**
   - Tries GET `/get-token` → fails with Network Error
   - Tries POST `/get-token` → fails with Network Error
   - Falls back to generating **mock JWT token**: `mock-jwt-token-{timestamp}-dev`
   - Continues with mock token

2. **WebSocket Connection:**
   - Attempts to connect with mock token (may fail server-side)
   - Shows as "Connected" in UI but receives no real data
   - Starts mock data simulation as fallback

3. **Data Display:**
   - Uses simulated random sensor data (updates every 3 seconds)
   - Dashboard displays, but values are not from real sensors
   - All functionality works (alerts, charts) with mock data

### Console Output for API Failure

You'll see these logs if API fails:

```
[WS] Fetching JWT token from API...
[WS] GET /get-token failed, trying POST with empty body...
[WS] Failed to fetch JWT token: ...
[WS] Using mock token for development testing
[WS] Connecting to: wss://...?token=mock-jwt-token-...
```

---

## API Response Analysis

### Check What Your API Expects

Run one of the testing methods above and check the response in browser console/terminal:

**If you see:**

```
403 Forbidden
```
→ Authentication/authorization issue

**If you see:**

```
404 Not Found
```
→ Endpoint doesn't exist or URL is wrong

**If you see:**

```
405 Method Not Allowed
```
→ Endpoint expects different HTTP method (try both GET and POST)

**If you see:**

```
CORS error / Network Error
```
→ CORS issue or backend not responding

---

## Debugging Steps

### Step 1: Verify Backend Service is Running

```bash
ping https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io
```

### Step 2: Test Base Endpoint

```bash
curl https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io
```

This should return something (not error 404).

### Step 3: Test Token Endpoint with All Methods

```bash
# GET
curl https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token

# POST with empty body
curl -X POST https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token -H "Content-Type: application/json" -d "{}"

# POST with possible auth headers
curl -X POST https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{}"
```

### Step 4: Check Network Activity

1. Open DevTools → Network tab
2. Reload dashboard
3. Look for `/get-token` requests
4. Click on the request and check:
   - **Status:** What error code?
   - **Headers:** What headers were sent?
   - **Response:** What did server return?
   - **Preview:** What does the error look like?

---

## Solution: Update UseWebSocket Hook

Once you identify the correct API method, update `src/Hooks/UseWebSocket.js`:

### If it's GET:
```javascript
const response = await api.get("/get-token");
```

### If it's POST with body:
```javascript
const response = await api.post("/get-token", {/* required fields */});
```

### If it requires headers:
```javascript
const response = await api.post("/get-token", {}, {
  headers: {
    "Authorization": "Bearer ...",
    // other headers
  }
});
```

### If it's a different URL pattern:
Update `baseURL` in `src/Services/api.js`:
```javascript
baseURL: 'https://your-correct-endpoint/path'
```

---

## Mock Mode Features (Current Fallback)

When API fails, the app operates in **mock mode**:

✅ Dashboard loads and displays data  
✅ Real-time data simulation (updates every 3 seconds)  
✅ Charts render with simulated values  
✅ Alerts trigger based on mock data  
✅ All UI features work normally  

❌ Data is not from actual sensors  
❌ WebSocket may not receive server messages  
❌ Control commands (pump toggle) won't affect real hardware  

---

## Production Checklist

- [ ] Confirm correct API endpoint URL
- [ ] Confirm HTTP method (GET vs POST)
- [ ] Confirm required headers (if any)
- [ ] Confirm request body format (if any)
- [ ] Confirm response field name (`token` or `accessToken`)
- [ ] Test endpoint directly before integrating
- [ ] Update `UseWebSocket.js` with correct implementation
- [ ] Verify JWT token decodes correctly
- [ ] Test WebSocket connection with real JWT
- [ ] Monitor console for connection status
- [ ] Verify sensor data appears in dashboard

---

## Additional Resources

- [Axios Documentation](https://axios-http.com/)
- [Fetch API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [WebSocket Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [JWT.io - Debug JWTs](https://jwt.io/)

---

## Current Status

**Issue:** `/get-token` API returning Network Error  
**Workaround:** Using mock JWT token (development mode)  
**Impact:** Dashboard works with simulated data  
**Next Step:** Determine correct API endpoint specification

