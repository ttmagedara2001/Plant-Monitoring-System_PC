# Protonest API Integration - Setup Guide

## Configuration

### Step 1: Set Environment Variables

Create a `.env` file in the project root with your Protonest credentials:

```env
# Protonest Backend Configuration
VITE_API_BASE_URL=https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user

# Your Protonest Dashboard Credentials
# These are obtained from Protonest Web Dashboard
VITE_USER_EMAIL=your-email@example.com
VITE_USER_PASSWORD=your-secretKey-from-dashboard
```

### Step 2: Understanding Credentials

- **Email:** Your Protonest account email
- **Password:** The secret key from your Protonest Web Dashboard (NOT your login password)
  - This is the "secret key" provided in your device configuration
  - Example: `123456789`

### Step 3: Optional - Store Credentials in localStorage

Instead of using `.env`, you can set credentials at runtime via browser console:

```javascript
// Set in browser console
localStorage.setItem("userEmail", "your-email@example.com");
localStorage.setItem("userPassword", "your-secretKey");

// Reload the page
window.location.reload();
```

---

## API Endpoints Used

### 1. Get JWT Token (API 1)

**Endpoint:** `POST /get-token`

**Request:**

```json
{
  "email": "your-email@example.com",
  "password": "your-secretKey"
}
```

**Response:**

```json
{
  "status": "Success",
  "data": {
    "jwtToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

- **JWT Token:** Valid for 24 hours (used for WebSocket)
- **Refresh Token:** Valid for 7 days (used to get new JWT)

### 2. Refresh JWT Token (API 2)

**Endpoint:** `GET /get-new-token`

**Headers:**

```
X-Refresh-Token: {refreshToken}
```

**Response:**

```json
{
  "status": "Success",
  "data": {
    "jwtToken": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

### 3. Get Stream Data (API 3-5)

Used for historical data retrieval in Dashboard

### WebSocket Connection

**URL:** `wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token={jwtToken}`

**Topics:**

- `/topic/stream/{deviceId}` - Real-time stream data
- `/topic/state/{deviceId}` - Device state updates

---

## Data Flow

```
1. Application Starts
   ↓
2. Read credentials from .env or localStorage
   ↓
3. Call POST /get-token with email/password
   ↓
4. Receive jwtToken and refreshToken
   ↓
5. Store tokens in localStorage
   ↓
6. Connect to WebSocket with jwtToken as query parameter
   ↓
7. Subscribe to /topic/stream/{deviceId} and /topic/state/{deviceId}
   ↓
8. Receive sensor data from these topics
   ↓
9. After 23 hours, call GET /get-new-token with refreshToken
   ↓
10. Get new jwtToken and reconnect WebSocket
```

---

## MQTT Topics Reference

### Publishing (Device → Protonest)

**Stream Data:**

```
Topic: protonest/{deviceId}/stream/temp
Payload: any string or JSON (timestamp added automatically)
Example: {"temp": 24.5, "unit": "C"}
```

**State Data:**

```
Topic: protonest/{deviceId}/state/motor/paddy
Payload: JSON only (timestamp added automatically)
Example: {"power": "off", "status": "idle"}
```

### Subscription (Protonest → Device)

**State Updates:**

```
Topic: protonest/{deviceId}/state/updates (retained)
Payload: Updated state values from API
```

**OTA Updates:**

```
Topic: protonest/{deviceId}/ota/pending (retained)
Payload: OTA version and download URL
```

---

## Troubleshooting

### "Email and password required" Error

**Solution:** Set credentials in .env file or localStorage

```bash
# Check .env file exists in project root
ls -la .env

# Or in browser console:
localStorage.getItem('userEmail')
localStorage.getItem('userPassword')
```

### "Invalid credentials" Error (400)

**Causes:**

- Wrong email address
- Wrong secret key (not your login password)
- Email not verified in Protonest dashboard

**Solution:**

1. Go to Protonest Web Dashboard
2. Verify your email is confirmed
3. Copy the correct secret key for your device
4. Update .env or localStorage

### "User not found" Error (400)

**Solution:** Email doesn't exist in Protonest system

- Check email spelling
- Verify account is created in Protonest

### "Email not verified" Error (400)

**Solution:** Verify your email in Protonest dashboard

- Check confirmation email
- Click verification link
- Try again after verification

### WebSocket Connection Failed

**Possible Causes:**

1. JWT token expired or invalid

   - Check console for `[WS]` logs
   - Look for "Invalid token" error

2. Wrong WebSocket URL

   - Verify URL in browser console
   - Check token is URL-encoded

3. Device not found
   - Verify deviceId is correct
   - Check device exists in your Protonest account

**Solution:**

```javascript
// Check token in browser console:
console.log(localStorage.getItem("jwtToken"));

// Check WebSocket URL:
console.log(
  "wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token=" +
    encodeURIComponent(localStorage.getItem("jwtToken"))
);
```

### No Data Appearing in Dashboard

**Possible Causes:**

1. Not subscribed to correct topics
2. Device not sending data
3. Topics don't match format

**Solution:**

1. Check browser console for `[WS]` subscription logs
2. Verify topics are:
   - `/topic/stream/{deviceId}`
   - `/topic/state/{deviceId}`
3. Publish test data to MQTT topics from your device
4. Check Dashboard receives it

---

## Local Development Setup

### Using Local API (localhost:8091)

To test with a local backend running on port 8091:

```env
VITE_API_BASE_URL=http://localhost:8091/api/v1/user
```

### Testing Token Endpoint

In browser console:

```javascript
// Test token endpoint
fetch(
  "https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user/get-token",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "your-email@example.com",
      password: "your-secretKey",
    }),
  }
)
  .then((r) => r.json())
  .then((d) => console.log("Token Response:", d));
```

---

## Console Logs Explained

### Successful Connection

```
[WS] Fetching JWT token from API...
[WS] Token fetch response: {status: "Success", data: {...}}
[WS] Connecting to: wss://protonest-connect...
[WS] Connected successfully
[WS] Subscribed to state topic: {subscribe: "/topic/state/device0000"}
[WS] Subscribed to stream topic: {subscribe: "/topic/stream/device0000"}
```

### Token Refresh (after 23 hours)

```
[WS] Token refresh timer triggered
[WS] Refreshing JWT token...
[WS] Token refresh response: {status: "Success", data: {...}}
```

### Receiving Data

```
[WS] Received message: {destination: "/topic/stream/device0000", payload: {...}}
[WS] Updated liveData from stream: {temp: 24, humidity: 60}
```

### Errors

```
[WS] Failed to fetch JWT token: Invalid credentials
[WS] WebSocket error: WebSocket connection failed
[WS] Error processing stream data: ...
```

---

## Next Steps

1. ✅ Set credentials in `.env`
2. ✅ Run `npm run dev`
3. ✅ Check browser console for `[WS]` logs
4. ✅ Verify dashboard displays data
5. ✅ Test threshold alerts
6. ✅ Verify token refresh works (after 23 hours in production)

---

**Version:** 1.1.0  
**Last Updated:** January 2025  
**Status:** Ready for Integration
