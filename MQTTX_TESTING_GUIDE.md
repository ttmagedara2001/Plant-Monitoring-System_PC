# MQTTX Testing Guide

## Step 1: Install MQTTX

Download from: https://mqttx.app/

## Step 2: Connect to MQTT Broker

**Connection Settings:**
- **Host:** mqtt.protonest.co
- **Port:** 8883
- **Protocol:** mqtts://
- **Client ID:** (auto-generated or custom) -> device200300

## Step 3: Publish Sensor Data

### Temperature Data
```
Topic: protonest/device200300/stream/temp
Payload: {"temp":"25.5"}
```

### Moisture Data
```
Topic: protonest/device200300/stream/moisture
Payload: {"moisture":"45.2"}
```

### Humidity Data
```
Topic: protonest/device200300/stream/humidity
Payload: {"humidity":"65.8"}
```

### Light Data
```
Topic: protonest/device200300/stream/light
Payload: {"light":"850"}
```

### Battery Data
```
Topic: protonest/device200300/stream/battery
Payload: {"battery":"87.5"}
```

### Pump Control
```
Topic: protonest/device200300/state/motor/paddy
Payload: {"status":"ON"}
or
Payload: {"status":"OFF"}
```

## Expected Dashboard Response

When you publish these payloads:
1. Dashboard status cards will update immediately
2. Historical chart will add new data points
3. Console will show: `✅ Processed temp data: 25.5`