# Device Payload Specification for Plant Monitoring System

This document specifies the exact payload formats that IoT devices should send to be compatible with this Plant Monitoring System PC application.

---

## 📡 MQTT Topics and Payload Formats

### Connection Details

- **MQTT Broker**: `wss://api.protonestconnect.co/ws` (WebSocket MQTT)
- **Authentication**: JWT token required in WebSocket connection URL
- **QoS Level**: 1 (recommended for reliable delivery)

---

## 1️⃣ Sensor Stream Data (Real-time Measurements)

### Topic Pattern

```
protonest/{deviceId}/stream/{sensorType}
```

### Supported Sensor Types

- `temp` - Temperature sensor
- `moisture` - Soil moisture sensor
- `humidity` - Air humidity sensor
- `light` - Light intensity sensor
- `battery` - Battery level sensor

### Payload Format (Option 1 - JSON Object - RECOMMENDED)

```json
{
  "temp": "25.5"
}
```

**For each sensor type:**

```json
// Temperature
{
  "temp": "25.5"
}

// Moisture
{
  "moisture": "45.2"
}

// Humidity
{
  "humidity": "68.0"
}

// Light
{
  "light": "750.5"
}

// Battery
{
  "battery": "85.3"
}
```

### Payload Format (Option 2 - Plain Value)

```
25.5
```

_Note: JSON format is preferred for better data validation_

### Complete Examples

#### Example 1: Temperature Reading

```
Topic: protonest/device200300/stream/temp
Payload: {"temp": "25.5"}
```

#### Example 2: Moisture Reading

```
Topic: protonest/device200300/stream/moisture
Payload: {"moisture": "42.8"}
```

#### Example 3: Battery Status

```
Topic: protonest/device200300/stream/battery
Payload: {"battery": "87.5"}
```

### Expected Value Ranges

| Sensor Type | Unit | Typical Range | Data Type         |
| ----------- | ---- | ------------- | ----------------- |
| Temperature | °C   | 0 - 50        | Float (1 decimal) |
| Moisture    | %    | 0 - 100       | Float (1 decimal) |
| Humidity    | %    | 0 - 100       | Float (1 decimal) |
| Light       | lux  | 0 - 2000      | Float (1 decimal) |
| Battery     | %    | 0 - 100       | Float (1 decimal) |

---

## 2️⃣ Pump/Motor Status Updates

### Topic Pattern

```
protonest/{deviceId}/state/motor/paddy
```

### Payload Format (JSON Object - REQUIRED)

```json
{
  "power": "on"
}
```

or

```json
{
  "power": "off"
}
```

### Optional: With Mode Information

```json
{
  "power": "on",
  "mode": "manual"
}
```

or

```json
{
  "power": "on",
  "mode": "automatic"
}
```

### Complete Examples

#### Example 1: Pump Turned ON

```
Topic: protonest/device200300/state/motor/paddy
Payload: {"power": "on"}
```

#### Example 2: Pump Turned OFF

```
Topic: protonest/device200300/state/motor/paddy
Payload: {"power": "off"}
```

#### Example 3: Pump ON with Manual Mode

```
Topic: protonest/device200300/state/motor/paddy
Payload: {"power": "on", "mode": "manual"}
```

### Field Specifications

| Field | Required | Valid Values                           | Description                   |
| ----- | -------- | -------------------------------------- | ----------------------------- |
| power | Yes      | `"on"`, `"off"`                        | Pump power status (lowercase) |
| mode  | No       | `"manual"`, `"automatic"`, `"optimal"` | Operating mode (lowercase)    |

---

## 3️⃣ Receiving Pump Control Commands

The device should subscribe to the same pump control topic to receive commands from the PC application.

### Subscribe Topic

```
protonest/{deviceId}/state/motor/paddy
```

### Expected Command Format

```json
{
  "power": "on"
}
```

or

```json
{
  "power": "off"
}
```

### Device Response

After receiving a command, the device should:

1. Execute the pump control action
2. Publish the new status back to the same topic with the actual pump state
3. Response should be sent within 2 seconds for UI feedback

---

## 4️⃣ Publishing Frequency Recommendations

### Sensor Data

- **Normal Operation**: Every 5-10 seconds per sensor
- **Power Saving Mode**: Every 30-60 seconds per sensor
- **Alert Conditions**: Immediate (< 1 second)

### Pump Status

- **On Status Change**: Immediately
- **Periodic Heartbeat**: Every 30 seconds (even if no change)

---

## 5️⃣ Data Validation Rules

### All Numeric Values

- Must be valid numbers (integer or float)
- Use decimal point (`.`) not comma (`,`)
- Maximum 1 decimal place recommended
- Negative values not allowed (except temperature in special cases)

### String Values

- Use lowercase for: `"on"`, `"off"`, `"manual"`, `"automatic"`
- UTF-8 encoding required
- Maximum field length: 50 characters

---

## 6️⃣ Complete Device Implementation Example

### Arduino/ESP32/ESP8266 Example (Pseudocode)

```cpp
// Libraries needed
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Device configuration
const char* DEVICE_ID = "device200300";
const char* MQTT_SERVER = "mqtt.protonestconnect.co";
const int MQTT_PORT = 8883; // or 1883 for non-SSL

// Topics
String tempTopic = "protonest/" + String(DEVICE_ID) + "/stream/temp";
String moistureTopic = "protonest/" + String(DEVICE_ID) + "/stream/moisture";
String humidityTopic = "protonest/" + String(DEVICE_ID) + "/stream/humidity";
String lightTopic = "protonest/" + String(DEVICE_ID) + "/stream/light";
String batteryTopic = "protonest/" + String(DEVICE_ID) + "/stream/battery";
String pumpTopic = "protonest/" + String(DEVICE_ID) + "/state/motor/paddy";

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

void setup() {
  Serial.begin(115200);

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  // Setup MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  // Connect and subscribe
  connectMQTT();
  mqttClient.subscribe(pumpTopic.c_str(), 1);
}

void publishSensorData() {
  StaticJsonDocument<128> doc;
  char buffer[128];

  // Read temperature sensor
  float temp = readTemperatureSensor();
  doc["temp"] = String(temp, 1); // 1 decimal place
  serializeJson(doc, buffer);
  mqttClient.publish(tempTopic.c_str(), buffer, true);
  doc.clear();

  // Read moisture sensor
  float moisture = readMoistureSensor();
  doc["moisture"] = String(moisture, 1);
  serializeJson(doc, buffer);
  mqttClient.publish(moistureTopic.c_str(), buffer, true);
  doc.clear();

  // Read humidity sensor
  float humidity = readHumiditySensor();
  doc["humidity"] = String(humidity, 1);
  serializeJson(doc, buffer);
  mqttClient.publish(humidityTopic.c_str(), buffer, true);
  doc.clear();

  // Read light sensor
  float light = readLightSensor();
  doc["light"] = String(light, 1);
  serializeJson(doc, buffer);
  mqttClient.publish(lightTopic.c_str(), buffer, true);
  doc.clear();

  // Read battery level
  float battery = readBatteryLevel();
  doc["battery"] = String(battery, 1);
  serializeJson(doc, buffer);
  mqttClient.publish(batteryTopic.c_str(), buffer, true);
}

void publishPumpStatus(String status, String mode = "") {
  StaticJsonDocument<128> doc;
  char buffer[128];

  doc["power"] = status; // "on" or "off"
  if (mode != "") {
    doc["mode"] = mode; // "manual" or "automatic"
  }

  serializeJson(doc, buffer);
  mqttClient.publish(pumpTopic.c_str(), buffer, true);

  Serial.print("Published pump status: ");
  Serial.println(buffer);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Parse incoming pump control command
  String topicStr = String(topic);

  if (topicStr == pumpTopic) {
    StaticJsonDocument<128> doc;
    deserializeJson(doc, payload, length);

    String power = doc["power"];

    if (power == "on") {
      // Turn pump ON
      digitalWrite(PUMP_PIN, HIGH);
      // Confirm status
      publishPumpStatus("on", "manual");
    } else if (power == "off") {
      // Turn pump OFF
      digitalWrite(PUMP_PIN, LOW);
      // Confirm status
      publishPumpStatus("off", "manual");
    }
  }
}

void loop() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  // Publish sensor data every 10 seconds
  static unsigned long lastPublish = 0;
  if (millis() - lastPublish > 10000) {
    publishSensorData();
    lastPublish = millis();
  }

  // Publish pump heartbeat every 30 seconds
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 30000) {
    String currentStatus = digitalRead(PUMP_PIN) ? "on" : "off";
    publishPumpStatus(currentStatus);
    lastHeartbeat = millis();
  }
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.println("Connecting to MQTT...");
    if (mqttClient.connect(DEVICE_ID)) {
      Serial.println("Connected!");
      mqttClient.subscribe(pumpTopic.c_str(), 1);
    } else {
      delay(5000);
    }
  }
}
```

---

## 7️⃣ Testing Your Device Payloads

### Using MQTTX (Desktop App)

1. **Install MQTTX**: Download from [mqttx.app](https://mqttx.app/)

2. **Create Connection**:

   - Name: ProtoNest
   - Host: `mqtt.protonestconnect.co` (or WebSocket URL)
   - Port: `1883` (or `8883` for SSL)
   - Client ID: `test_client_001`

3. **Publish Temperature Data**:

   ```
   Topic: protonest/device200300/stream/temp
   Payload: {"temp": "25.5"}
   QoS: 1
   ```

4. **Publish Pump Status**:

   ```
   Topic: protonest/device200300/state/motor/paddy
   Payload: {"power": "on", "mode": "manual"}
   QoS: 1
   ```

5. **Subscribe to Commands**:
   ```
   Topic: protonest/device200300/state/motor/paddy
   QoS: 1
   ```

---

## 8️⃣ Troubleshooting

### Common Issues

#### Sensor data not appearing in PC app

✅ **Check**:

- Topic format matches exactly: `protonest/{deviceId}/stream/{sensorType}`
- Payload is valid JSON: `{"temp": "25.5"}`
- DeviceId matches the one configured in PC app
- Values are quoted strings, not raw numbers

#### Pump control not working

✅ **Check**:

- Subscribed to correct topic: `protonest/{deviceId}/state/motor/paddy`
- Responding with status confirmation after command execution
- Using lowercase for power values: `"on"` not `"ON"`
- Publishing back to the same topic after state change

#### Data appears but values are incorrect

✅ **Check**:

- Using decimal point (`.`) not comma (`,`)
- Values are within expected ranges
- Sensor calibration is correct
- Data type is string in JSON: `"25.5"` not `25.5`

---

## 9️⃣ Quick Reference Card

### Temperature

```
Topic: protonest/{deviceId}/stream/temp
Payload: {"temp": "25.5"}
```

### Moisture

```
Topic: protonest/{deviceId}/stream/moisture
Payload: {"moisture": "42.0"}
```

### Humidity

```
Topic: protonest/{deviceId}/stream/humidity
Payload: {"humidity": "68.5"}
```

### Light

```
Topic: protonest/{deviceId}/stream/light
Payload: {"light": "850.0"}
```

### Battery

```
Topic: protonest/{deviceId}/stream/battery
Payload: {"battery": "87.5"}
```

### Pump ON

```
Topic: protonest/{deviceId}/state/motor/paddy
Payload: {"power": "on"}
```

### Pump OFF

```
Topic: protonest/{deviceId}/state/motor/paddy
Payload: {"power": "off"}
```

---

## 🔟 API State Storage Format

When the PC app stores data to ProtoNest API using `/update-state-details`, it uses this format:

```json
{
  "deviceId": "device200300",
  "topic": "settings/thresholds",
  "payload": {
    "moistureMin": "20",
    "moistureMax": "70",
    "tempMax": "35"
  }
}
```

Your device can read these settings from the API using `/get-state-details/device/topic` to sync configuration.

---

## Summary Checklist for Device Developers

- [ ] Use JSON format for all payloads
- [ ] Include field name in JSON object (e.g., `{"temp": "25.5"}`)
- [ ] Use lowercase for command values (`"on"`, `"off"`)
- [ ] Values are strings with quotes: `"25.5"` not `25.5`
- [ ] Subscribe to pump control topic for receiving commands
- [ ] Publish pump status confirmation after executing commands
- [ ] Publish sensor data every 5-10 seconds
- [ ] Publish pump heartbeat every 30 seconds
- [ ] Use QoS 1 for reliable delivery
- [ ] Match deviceId exactly with PC app configuration

---

**Last Updated**: November 26, 2025
**Compatible with**: Plant Monitoring System PC v1.0
