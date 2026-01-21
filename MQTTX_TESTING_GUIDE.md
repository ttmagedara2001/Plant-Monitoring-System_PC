# MQTTX Testing Guide

## Device Configuration

**Primary Test Device:**

- Device ID: `device0011233`
- Owner: Your ProtoNest account
- Used throughout this guide for examples

**Alternative Test Devices:**

- `device9988`
- `device0000`
- `device0001`
- `device0002`

> **Note:** The device ID must belong to your ProtoNest account. If you see 403 errors, verify device ownership in your ProtoNest dashboard.

**MQTT Connection Details:**

- **Broker Host:** `mqtt.protonest.co`
- **Port:** `8883` (secure MQTT over TLS)
- **Protocol:** `mqtts://`
- **Username/Password:** Not required (authentication via cookies over HTTPS)

**API Endpoints:**

- **Base URL:** `https://api.protonestconnect.co/api/v1`
- **WebSocket:** `wss://api.protonestconnect.co/ws` (cookie-based auth)

---

## Step 1: Install MQTTX

Download from: https://mqttx.app/

## Step 2: Connect to MQTT Broker

**Connection Settings:**

- **Host:** mqtt.protonest.co
- **Port:** 8883
- **Protocol:** mqtts://
- **Client ID:** `device0011233` (recommended: use your actual device ID)
- **Username / Password:** _leave empty_
- **TLS / SSL:**
  - Enable TLS
  - Use system CA (no client certificate)
  - Allow self‑signed: optional

> In MQTTX:
> - Click "+ New Connection"
> - Select `MQTTS/TLS`
> - Fill host/port, set Client ID, enable TLS, then "Connect"

---

## Step 3: Subscribe to Topics

Create a new **tab** in MQTTX and subscribe to:

- `protonest/device0011233/stream/#`
- `protonest/device0011233/state/#`

This allows you to:

- See all sensor messages the dashboard would consume
- See any state/pump messages

---

## Step 4: Publish Sensor Data

> All payloads are JSON, UTF‑8 encoded. Dashboard expects **string values** that can be parsed as numbers.

### Temperature Data

```text
Topic: protonest/device0011233/stream/temp
Payload: {"temp":"25.5"}
```

### Moisture Data

```text
Topic: protonest/device0011233/stream/moisture
Payload: {"moisture":"45.2"}
```

### Humidity Data

```text
Topic: protonest/device0011233/stream/humidity
Payload: {"humidity":"65.8"}
```

### Light Data

```text
Topic: protonest/device0011233/stream/light
Payload: {"light":"850"}
```

### Battery Data

```text
Topic: protonest/device0011233/stream/battery
Payload: {"battery":"87.5"}
```

### Combined Sensor Packet

```text
Topic: protonest/device0011233/stream/all
Payload: {
  "temp": "25.5",
  "moisture": "45.2",
  "humidity": "65.8",
  "light": "850",
  "battery": "87.5"
}
```

---

## Step 5: Pump Control via MQTT

```text
Topic: protonest/device0011233/state/pump
Payload: {"power":"ON"}
```

```text
Topic: protonest/device0011233/state/pump
Payload: {"power":"OFF"}
```

Device feedback:

```text
Topic: protonest/device0011233/state/pump
Payload: {"power":"on","mode":"manual"}
```

---

## Step 6: Mapping MQTT Messages to Dashboard UI

When you publish payloads and they're forwarded to WebSocket:

1. **Status Cards (top metrics)**
   - `stream/moisture` → "Soil Moisture" card
   - `stream/temp` → "Temperature" card
   - `stream/humidity` → "Humidity" card
   - `stream/light` → "Light" card
   - `stream/battery` → "Battery" card

2. **Pump Banner**
   - `state/pump` with `"power":"ON"` → Green "Pump: ON" banner
   - `state/pump` with `"power":"OFF"` → Blue "Pump: OFF" banner

3. **Alert Banner**
   - If `moisture` < `moistureMin` → red critical alert
   - If `temperature` > `tempMax` → red warning alert

---

## Step 7: Test Sequences

### A. Basic Sensor Flow

1. Connect MQTTX to `mqtt.protonest.co:8883`
2. Subscribe to `protonest/device0011233/stream/#`
3. Publish:
   ```text
   Topic: protonest/device0011233/stream/moisture
   Payload: {"moisture":"15.0"}
   ```
4. Watch dashboard:
   - "Soil Moisture" card shows `15.0%`
   - Critical moisture alert appears

### B. Pump Control Round‑Trip

1. In dashboard, click **Pump** toggle in Settings
2. Observe API request to `/update-state-details`
3. Simulate device feedback in MQTTX:
   ```text
   Topic: protonest/device0011233/state/pump
   Payload: {"power":"ON","mode":"manual"}
   ```
4. Dashboard shows pump ON

---

## Step 8: Dashboard Authentication

The dashboard uses **Cookie-Based Authentication**:

1. Login via `/user/get-token` sets HttpOnly cookies
2. WebSocket connects to `wss://api.protonestconnect.co/ws`
3. Browser sends cookies automatically (no token URL param)
4. All API requests include `withCredentials: true`

### Console Logs to Expect

```
✅ Login successful - cookies set by server
🔌 Initializing WebSocket with cookie-based auth: wss://...
✅ WebSocket Connected (cookie-based auth)
🔔 Subscribed to /topic/stream/device0011233
📡 [device0011233] Stream data received: {"moisture":"45.2"}
```

---

## Troubleshooting

### Dashboard Not Receiving Data

1. Verify MQTTX connected to broker
2. Check topic format matches exactly
3. Verify device ID ownership
4. Check dashboard WebSocket connected (green indicator)

### Authentication Issues

1. Cookie-based auth requires login first
2. Check browser DevTools → Application → Cookies
3. Verify `jwt` cookie exists after login
4. If expired, refresh or re-login

### Pump Commands Not Working

1. Check device subscribed to `protonest/{deviceId}/state/#`
2. Verify payload format: `{"power":"ON"}` (uppercase)
3. Check dashboard has WebSocket connection

---

**Last Updated:** January 2026  
**Version:** 2.0.0 (Cookie-Based Auth)
