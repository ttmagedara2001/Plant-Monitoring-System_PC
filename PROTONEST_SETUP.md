# Protonest API Integration - Setup Guide

## Authentication Method

This application uses **Cookie-Based HttpOnly Authentication**:

- Login sets JWT and Refresh Token as HttpOnly cookies
- No tokens stored in localStorage/sessionStorage
- Browser automatically sends cookies with all requests
- More secure than header-based token authentication

## Configuration

### Step 1: Set Environment Variables

Create a `.env` file in the project root:

```env
# Protonest Backend Configuration
VITE_API_BASE_URL=https://api.protonestconnect.co/api/v1

# WebSocket Configuration
VITE_WS_URL=wss://api.protonestconnect.co/ws

# Auto-Login Credentials (Optional)
# These are obtained from Protonest Web Dashboard
VITE_USER_EMAIL=your-email@example.com
VITE_USER_SECRET=your-secretKey-from-dashboard
```

### Step 2: Understanding Credentials

- **Email:** Your Protonest account email
- **Secret Key:** The API secret key from your Protonest Web Dashboard
  - This is NOT your login password
  - Find it in your device configuration settings
  - Example format: `cQm2znez@8rp9N4`

---

## API Endpoints

### 1. Login - Get Session Cookies

**Endpoint:** `POST /user/get-token`

**Request:**
```json
{
  "email": "your-email@example.com",
  "password": "your-secretKey"
}
```

**Response:**
- Status: `200 OK`
- Body: Empty (no response body)
- **Cookies Set by Server:**
  - `jwt` - HttpOnly, Secure (valid ~24 hours)
  - `refreshToken` - HttpOnly, Secure (valid ~7 days)

### 2. Refresh Session

**Endpoint:** `GET /get-new-token`

**Headers:** None required (cookies sent automatically)

**Response:**
- Status: `200 OK`
- Body: Empty
- New cookies set automatically

**Error Responses:**
- `400` with `"Refresh token is required"` - No refresh cookie present
- `400` with `"Invalid refresh token"` - Refresh token expired

### 3. WebSocket Connection

**URL:** `wss://api.protonestconnect.co/ws`

**Authentication:** Via browser cookies (no token parameter)

**Topics:**
- `/topic/stream/{deviceId}` - Real-time sensor data
- `/topic/state/{deviceId}` - Device state updates

---

## Data Flow

```
1. Application Starts
   ↓
2. Read credentials from .env
   ↓
3. POST /user/get-token with email/password
   ↓
4. Server sets HttpOnly cookies
   ↓
5. Connect to WebSocket (cookies sent automatically)
   ↓
6. Subscribe to /topic/stream/{deviceId}
   ↓
7. Receive sensor data
   ↓
8. On token expiry → GET /get-new-token (auto-refresh)
```

---

## MQTT Topics Reference

### Publishing (IoT Device → Protonest)

**Stream Data:**
```
Topic: protonest/{deviceId}/stream/temp
Payload: {"temp": "24.5"}
```

**State Data:**
```
Topic: protonest/{deviceId}/state/pump
Payload: {"power": "on", "mode": "auto"}
```

### Subscription (Dashboard ← Protonest)

**Stream Updates:**
```
Topic: /topic/stream/{deviceId}
Payload: {"payload": {"temp": "24.5"}, "topic": "temp", "timestamp": "..."}
```

**State Updates:**
```
Topic: /topic/state/{deviceId}
Payload: {"payload": {"power": "on"}, "timestamp": "..."}
```

---

## Troubleshooting

### "Email and password required" Error

Ensure `.env` file exists with credentials:
```bash
# Check if .env exists
cat .env
```

### "Invalid credentials" Error (400)

**Possible Causes:**
- Wrong email address
- Wrong secret key (not using the API secret, using login password instead)
- Account not verified

**Solution:**
1. Go to Protonest Web Dashboard
2. Navigate to your device settings
3. Copy the correct API secret key
4. Update `.env` file

### "User not found" Error (400)

- Verify email is registered in Protonest
- Check for typos in email address

### WebSocket Connection Failed

**Check:**
1. Login succeeded (cookies were set)
2. Browser DevTools → Application → Cookies should show `jwt` cookie
3. Network tab shows WebSocket connection attempt

**Common Issues:**
- CORS blocking credentials
- Cookies blocked by browser settings
- Server not allowing credentials

### Session Expired

On 400 "Invalid token":
1. Automatic refresh is attempted via `/get-new-token`
2. If refresh fails, user is logged out
3. Re-login required

---

## Console Logs Explained

### Successful Login & Connection

```
🔄 Making cookie-based authentication request to: /api
✅ Login successful - cookies set by server
🔌 Initializing WebSocket with cookie-based auth: wss://...
✅ WebSocket Connected (cookie-based auth)
🔔 Subscribed to /topic/stream/device0000
```

### Token Refresh

```
🔄 Attempting cookie-based token refresh...
✅ Token refreshed successfully via cookies
```

### Errors

```
❌ Authentication failed (400): ...
❌ Session expired - logging out: Refresh token is required
```

---

## Local Development

### Using Vite Proxy

In development, requests go through Vite proxy to bypass CORS:

```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'https://api.protonestconnect.co/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // Important for cookies
        cookieDomainRewrite: 'localhost',
      },
    },
  },
};
```

### Testing Login

```javascript
// Browser console
fetch('/api/user/get-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important!
  body: JSON.stringify({
    email: 'your-email@example.com',
    password: 'your-secretKey',
  }),
}).then(r => console.log('Status:', r.status));
```

---

## Security Notes

### HttpOnly Cookies

- Tokens are NOT accessible from JavaScript
- Protects against XSS attacks
- Automatically sent by browser

### Secure Flag

- Cookies only sent over HTTPS
- In development, may need to disable for localhost

### SameSite Policy

- Server may set `SameSite=None` for cross-origin requests
- Requires Secure flag

---

**Version:** 2.0.0 (Cookie-Based Auth)  
**Last Updated:** January 2026  
**Status:** Ready for Integration
