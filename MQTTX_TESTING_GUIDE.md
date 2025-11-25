# MQTTX Testing Guide

## Step 1: Install MQTTX

Download from: https://mqttx.app/

## Step 2: Connect to MQTT Broker

**Connection Settings:**

- **Host:** mqtt.protonest.co
- **Port:** 8883
- **Protocol:** mqtts://
- **Client ID:** (auto-generated or custom) -> `device200300`
- **Username / Password:** _leave empty_ (Dashboard authentication is done over HTTPS, not MQTT)
- **TLS / SSL:**
  - Enable TLS
  - Use system CA (no client certificate)
  - Allow self‑signed: optional (only if you see TLS validation errors)

> In MQTTX:
>
> - Click “+ New Connection”
> - Select `MQTTS/TLS`
> - Fill host/port, set Client ID, enable TLS, then “Connect”

---

## Step 3: Subscribe to Topics (to Observe Dashboard Traffic)

Create a new **tab** in MQTTX and subscribe to:

- `protonest/device200300/stream/#`
- `protonest/device200300/state/#`

This allows you to:

- See all sensor messages the dashboard would consume
- See any state / pump messages the device is expected to react to

---

## Step 4: Publish Sensor Data

> All payloads are JSON, UTF‑8 encoded. The dashboard expects **string values** that can be parsed as numbers.

### Temperature Data

```text
Topic: protonest/device200300/stream/temp
Payload: {"temp":"25.5"}
```

### Moisture Data

```text
Topic: protonest/device200300/stream/moisture
Payload: {"moisture":"45.2"}
```

### Humidity Data

```text
Topic: protonest/device200300/stream/humidity
Payload: {"humidity":"65.8"}
```

### Light Data

```text
Topic: protonest/device200300/stream/light
Payload: {"light":"850"}
```

### Battery Data

```text
Topic: protonest/device200300/stream/battery
Payload: {"battery":"87.5"}
```

### Combined Sensor Packet (optional)

If the device/bridge supports a single multiplexed topic:

```text
Topic: protonest/device200300/stream/all
Payload: {
  "temp": "25.5",
  "moisture": "45.2",
  "humidity": "65.8",
  "light": "850",
  "battery": "87.5",
  "pumpStatus": "OFF",
  "pumpMode": "Optimal"
}
```

> Whether `stream/all` is used depends on the backend bridge. The React dashboard is tolerant as long as the final data structure it receives over WebSocket/MQTT contains numeric `moisture/temperature/humidity/light/battery` fields.

---

## Step 5: Pump Control via MQTT

The dashboard (through the MQTT/WebSocket bridge) expects pump commands in the following shape:

```text
Topic: protonest/device200300/state/motor/paddy
Payload: {"status":"ON"}
```

```text
Topic: protonest/device200300/state/motor/paddy
Payload: {"status":"OFF"}
```

Recommended:

- Use **non‑retained** (`retain = false`) for control commands.
- QoS 0 or 1 is fine; 0 is usually enough on LAN.

If your device reports pump feedback, it should publish:

```text
Topic: protonest/device200300/state/pump
Payload: {"pumpStatus":"ON","pumpMode":"Optimal"}
```

or

```text
Topic: protonest/device200300/state/pump
Payload: {"pumpStatus":"OFF","pumpMode":"Optimal"}
```

---

## Step 6: Mapping MQTT Messages to Dashboard UI

When you publish the payloads above (and the backend forwards them to the WebSocket that `UseMqttWebSocket` / `useWebSocket` listens to), you should see:

1. **Status Cards (top metrics)**

   - `protonest/device200300/stream/moisture` → “Soil Moisture” card
   - `protonest/device200300/stream/temp` → “Temperature” card
   - `protonest/device200300/stream/humidity`→ “Humidity” card
   - `protonest/device200300/stream/light` → “Light” card
   - `protonest/device200300/stream/battery` → “Battery” card

2. **Pump Banner**

   - `protonest/device200300/state/pump` with `"pumpStatus":"ON"` → Green “Pump : ON” banner
   - `"pumpStatus":"OFF"` → Blue “Pump : OFF” banner

3. **Historical Chart**

   - Any sensor message that the backend converts into `history_batch` or `historical_data` will appear as a new point in:
     - Moisture
     - Temperature
     - Humidity
     - Light
     - Battery
   - You can toggle each metric in the chart toolbar (Moisture/Temp/Humidity/Light/Battery).

4. **Alert Banner**
   - If `moisture` < `moistureMin` in the dashboard settings → red “CRITICAL: Soil Moisture…” banner.
   - If `temperature` > `tempMax` → red “WARNING: Temperature…” banner.

---

## Step 7: Recommended Test Sequences

### A. Basic Sensor Flow

1. Connect MQTTX to `mqtt.protonest.co:8883` using `mqtts://`.
2. Subscribe to `protonest/device200300/stream/#`.
3. From MQTTX, publish:
   ```text
   Topic: protonest/device200300/stream/moisture
   Payload: {"moisture":"15.0"}
   ```
4. Watch the dashboard:
   - “Soil Moisture” card should show `15.0%`.
   - Alert banner should show a **critical** moisture alert (below default min 20).

### B. Pump Control Round‑Trip

1. In the dashboard, click the **Pump** toggle (in `SettingsPanel`).
2. Observe what topic/payload the backend publishes by watching MQTTX subscriptions (if you have visibility on that bridge).
3. Manually simulate device feedback in MQTTX:
   ```text
   Topic: protonest/device200300/state/pump
   Payload: {"pumpStatus":"ON","pumpMode":"Optimal"}
   ```
4. Dashboard pump banner should change to **ON**.

### C. Historical Trend

1. Publish a series of values (with a few seconds between them) for moisture & temperature:
   ```text
   Topic: protonest/device200300/stream/moisture
   Payload: {"moisture":"30.0"}
   ```
   ```text
   Topic: protonest/device200300/stream/temp
   Payload: {"temp":"22.0"}
   ```
2. Ensure backend pushes them as history to the WebSocket.
3. On the “Historical Trends” chart:
   - Enable Moisture and Temp toggles.
   - You should see one or more points over the “Last 24h” window.

---

## Step 8: Retained Messages & QoS Notes

- **Retained sensor data** (retain = true) is useful so that new subscribers immediately get last known readings.
- **Retained control commands** are usually **not recommended** (device might restart and immediately act on a stale `ON`).
- Typical setup:
  - Sensor topics: QoS 0/1, retain = true (optional).
  - State/control topics: QoS 0/1, retain = false.

---

## Expected Dashboard Console Logs (for debugging)

From the browser DevTools console you may see logs such as:

- `🔄 Making secure authentication request to: https://api.protonestconnect.co/api/v1/user`
- `📡 API Response from /get-token (Success): ...`
- `[WS] Connecting to: wss://api.protonestconnect.co/ws`
- `[WS] Received data: { ... }`
- `✅ Pump control sent via MQTT: ON`
- `Error fetching history for export: ...` (if historical API is misconfigured)

Use these logs together with MQTTX payloads to verify that:

1. Auth → WebSocket connect → subscriptions work.
2. MQTTX messages are reaching the broker and being forwarded to the dashboard.
3. UI updates line up with your MQTT test scenarios.
