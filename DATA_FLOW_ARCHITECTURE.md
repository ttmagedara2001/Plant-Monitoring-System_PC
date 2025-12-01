# Data Flow Architecture

## Overview

This document explains the clear separation between WebSocket (real-time data) and HTTP API (state changes & historical data).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        IoT Device (ESP32)                       │
│                                                                 │
│  Sensors: Temperature, Humidity, Moisture, Light, Battery      │
│  Actuators: Water Pump                                         │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ Publishes MQTT Messages
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ProtoNest Cloud Platform                    │
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │  MQTT Broker     │         │  Time-Series DB  │            │
│  │  (Real-time)     │         │  (Historical)    │            │
│  └────────┬─────────┘         └────────┬─────────┘            │
│           │                             │                       │
│           │                             │                       │
│  ┌────────▼──────────┐         ┌────────▼──────────┐          │
│  │  WebSocket API    │         │   HTTP REST API   │          │
│  │  Port: 443/wss    │         │   Port: 443/https │          │
│  └────────┬──────────┘         └────────┬──────────┘          │
└───────────┼──────────────────────────────┼────────────────────-┘
            │                              │
            │                              │
┌───────────▼──────────────────────────────▼────────────────────┐
│                     Dashboard PC Application                   │
│                                                                │
│  ┌─────────────────────┐      ┌──────────────────────┐       │
│  │   WebSocket Hook    │      │   HTTP API Service   │       │
│  │  useMqttWebSocket   │      │   deviceService.js   │       │
│  └─────────┬───────────┘      └──────────┬───────────┘       │
│            │                              │                    │
│            │ Real-time Updates            │ State Changes &    │
│            │ (View Only)                  │ Historical Queries │
│            │                              │                    │
│  ┌─────────▼──────────────────────────────▼────────────┐     │
│  │              Dashboard Component                     │     │
│  │                                                      │     │
│  │  ┌────────────────┐        ┌─────────────────────┐ │     │
│  │  │ Real-time Cards│        │  Historical Chart   │ │     │
│  │  │ (WebSocket)    │        │  (HTTP API)         │ │     │
│  │  └────────────────┘        └─────────────────────┘ │     │
│  │                                                      │     │
│  │  ┌─────────────────────────────────────────────┐   │     │
│  │  │         Control Panel                       │   │     │
│  │  │  - Pump Control (HTTP API)                  │   │     │
│  │  │  - Settings Update (HTTP API)               │   │     │
│  │  │  - Feedback via WebSocket                   │   │     │
│  │  └─────────────────────────────────────────────┘   │     │
│  └──────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow Types

### 1. Real-Time Data Reception (WebSocket)

**Purpose:** Display live sensor readings

**Flow:**

```
IoT Device → MQTT Broker → ProtoNest WebSocket → Dashboard (Live Display)
```

**Implementation:**

- **Hook:** `useMqttWebSocket()`
- **Component:** `StatusCard` components
- **Update Frequency:** As soon as data arrives (real-time)
- **Data Stored:** Only in `liveData` state (current values)

**Topics Subscribed:**

- `protonest/{deviceId}/stream/temp`
- `protonest/{deviceId}/stream/humidity`
- `protonest/{deviceId}/stream/moisture`
- `protonest/{deviceId}/stream/light`
- `protonest/{deviceId}/stream/battery`
- `protonest/{deviceId}/state/motor/paddy` (pump status)

### 2. Historical Data Visualization (HTTP API)

**Purpose:** Display charts and export data

**Flow:**

```
Time-Series DB ← HTTP API ← Dashboard (Chart Display)
```

**Implementation:**

- **Service:** `deviceService.js`
- **Functions:** `getAllStreamData()`, `getStreamDataByTopic()`
- **Component:** `HistoricalChart`
- **Update Frequency:** Every 30 seconds (auto-refresh)
- **Data Stored:** In `historicalData` state (array of time-series data)

**API Endpoints Used:**

- `POST /get-stream-data/device/topic`
  - Topics: `temp4/new`, `moisture`, `humidity`, `battery`, `light`
  - Parameters: `deviceId`, `topic`, `startTime`, `endTime`, `pagination`, `pageSize`

### 3. State Changes (HTTP API)

**Purpose:** Control devices and update settings

**Flow:**

```
Dashboard → HTTP API → ProtoNest Platform → IoT Device → WebSocket Feedback
```

**Implementation:**

- **Service:** `deviceService.js`
- **Functions:** `updatePumpStatus()`, `updateDeviceSettings()`
- **Component:** `SettingsPanel`
- **Feedback:** Via WebSocket real-time updates

**API Endpoints Used:**

- `POST /update-state-details`
  - Payload: `{ deviceId, topic, payload: {...} }`
  - Topics: `pump/control`, `settings/thresholds`

## Key Principles

### 1. Separation of Concerns

✅ **WebSocket:** Read-only real-time data  
✅ **HTTP API:** Write operations and historical queries

### 2. Data Persistence

- Real-time data from WebSocket is **displayed immediately** but **NOT stored locally**
- The ProtoNest platform **automatically saves** all MQTT data to the time-series database
- Dashboard fetches historical data via HTTP API when needed (charts, exports)
- Auto-refresh every 30 seconds ensures charts show latest accumulated data

### 3. State Consistency

- Pump control sent via **HTTP API** (`updatePumpStatus()`)
- Status update received via **WebSocket** in real-time
- This creates a reliable feedback loop:
  1. User clicks pump button
  2. HTTP API request sent
  3. ProtoNest updates device state
  4. Device responds via MQTT
  5. WebSocket receives status update
  6. UI updates with new status

## Benefits

### Performance

- Real-time updates don't require database queries
- Historical data loaded only when needed
- Automatic data accumulation on server side

### Reliability

- WebSocket disconnections don't affect historical data
- HTTP API provides fallback for state queries
- Clear separation prevents race conditions

### Scalability

- Server handles data persistence
- Client only displays and controls
- Efficient bandwidth usage

## Data Flow Examples

### Example 1: Temperature Reading

```
1. ESP32 reads temperature: 25.5°C
2. ESP32 publishes: protonest/device200300/stream/temp → 25.5
3. ProtoNest MQTT Broker receives message
4. ProtoNest saves to time-series DB (automatic)
5. WebSocket broadcasts to connected clients
6. Dashboard receives via MQTT subscription
7. Temperature card updates: "25.5°C"
8. After 30 seconds: Chart auto-refreshes from HTTP API
9. New data point appears in historical chart
```

### Example 2: Pump Control

```
1. User clicks "Turn ON" button
2. Dashboard calls: updatePumpStatus('device200300', 'ON', 'pump/control')
3. HTTP POST to /update-state-details
4. ProtoNest updates pump state in database
5. ProtoNest sends MQTT command to device
6. Device turns pump ON
7. Device publishes status: protonest/device200300/state/motor/paddy → ON
8. WebSocket broadcasts status update
9. Dashboard receives pump status via MQTT
10. Button updates to "Turn OFF" with green color
```

### Example 3: Chart Display

```
1. User opens dashboard
2. Dashboard calls: getAllStreamData('device200300')
3. HTTP API queries time-series database
4. Server returns last 24 hours of data (100 points per topic)
5. Dashboard combines all topics into single dataset
6. Chart component renders combined data
7. Every 30 seconds: Chart auto-refreshes with new data points
8. Real-time values update independently on status cards
```

## Implementation Files

### Core Files

- **Dashboard.jsx** - Main orchestration, separates real-time vs historical display
- **UseMqttWebSocket.js** - WebSocket hook for real-time data only
- **deviceService.js** - HTTP API service for state changes and historical data
- **HistoricalChart.jsx** - Chart component displaying HTTP API data

### Configuration

- **WebSocket URL:** `wss://api.protonestconnect.co/ws`
- **HTTP API URL:** `https://api.protonestconnect.co/api/v1/user`

## Monitoring

### Connection Status Display

The dashboard shows three connection indicators:

1. **WebSocket (Real-Time):** 🟢 Connected / ⚪ Disconnected
2. **MQTT Stream:** 🟢 Receiving Data / ⚪ Waiting for Data
3. **System Status:** 🟢 Online • Real-Time: Active • Historical: HTTP API

### Data Source Indicators

- **Status Cards:** Always show "WebSocket" data source
- **Historical Chart:** Always shows "HTTP API" data source
- **Auto-refresh:** Indicator shows when chart is updating

## Troubleshooting

### No Real-time Data

- Check WebSocket connection status
- Verify device is publishing to MQTT topics
- Check browser console for WebSocket errors

### No Historical Data

- Verify device ID belongs to your account
- Check HTTP API response in Network tab
- Ensure device has been sending data (needs accumulation time)

### State Changes Not Working

- Verify HTTP API authentication (JWT token)
- Check device ownership
- Review error messages in console

## Future Enhancements

### Possible Improvements

1. **Local Caching:** Cache historical data locally to reduce API calls
2. **Optimistic Updates:** Show pump state change immediately, revert on failure
3. **Batch State Updates:** Queue multiple state changes and send together
4. **Compression:** Compress historical data for faster loading
5. **Progressive Loading:** Load recent data first, older data on demand
