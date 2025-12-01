# Plant Monitoring System - PC Dashboard

A real-time, interactive React dashboard for monitoring plant sensor data with WebSocket integration and intelligent fallback mode.

## 🌱 Overview

The Plant Monitoring System PC Dashboard displays live sensor data (moisture, temperature, humidity, light) from IoT devices monitoring plants/greenhouses. It provides real-time alerts, historical trending, and device control capabilities.

**Key Features:**

- ✅ Real-time sensor data updates via WebSocket
- ✅ Multiple simultaneous alerts with configurable thresholds
- ✅ Interactive charts with historical trending
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Device management and selection
- ✅ Threshold configuration panel
- ✅ CSV export for analysis
- ✅ Graceful fallback with mock data when API unavailable

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- npm 7+

### Installation & Running

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

### Build for Production

```bash
npm run build
npm run preview  # Preview production build locally
```

---

## 📊 Core Features

### 1. Real-Time Sensor Monitoring

Live WebSocket updates for 6 key metrics:

- **Moisture (0-100%)** - Soil/substrate moisture level with auto pump trigger
- **Temperature (°C)** - Ambient temperature monitoring
- **Humidity (0-100%)** - Air humidity tracking
- **Light (lux)** - Light intensity measurement
- **Battery (0-100%)** - Device battery level
- **Pump Status** - Real-time pump state (ON/OFF) with mode indicator (auto/manual)

### 2. Automated Irrigation System

Intelligent pump control based on configurable moisture thresholds:

- **Auto Mode** - Automatically turns pump ON when moisture < minimum threshold (default: 20%)
- **Auto Mode** - Automatically turns pump OFF when moisture > maximum threshold (default: 70%)
- **Mode Tracking** - Device receives mode information (auto/manual) with each command
- **HTTP API Flow** - PC → `/update-state-details` → Backend → MQTT → Device → Confirmation → WebSocket → UI Update

### 3. Manual Pump Control

User-controlled pump operation with instant feedback:

- **Toggle Control** - One-click pump ON/OFF from settings panel
- **Mode Tracking** - Commands sent with `mode: "manual"` to distinguish from automation
- **Status Display** - Real-time pump status with color coding (green=ON, red=OFF)
- **Loading States** - Visual feedback during command processing
- **Unified Flow** - Same HTTP API flow as auto mode for consistency

### 4. Historical Data Visualization

Interactive charts showing sensor trends over time:

- **24-Hour Data** - Default view of last 24 hours with auto-refresh every 30 seconds
- **Multi-Line Chart** - All sensors on one graph with Recharts
- **CSV Export** - Download data for external analysis
- **Responsive Design** - Zoom, pan, and tooltip interactions
- **Error Handling** - Graceful fallback with clear error messages

### 5. Threshold Configuration

Fully customizable alert and automation thresholds:

- **Moisture Thresholds** - Min/max for pump automation (default: 20%-70%)
- **Temperature Thresholds** - Min/max for temperature alerts (default: 10°C-35°C)
- **Humidity Thresholds** - Min/max for humidity alerts (default: 30%-80%)
- **Light Thresholds** - Min/max for light alerts (default: 200-1000 lux)
- **Battery Threshold** - Minimum battery level alert (default: 20%)
- **Auto Mode Toggle** - Enable/disable automated pump control
- **LocalStorage Persistence** - Settings saved per device for quick access

### 6. Component-Based Architecture

Modular, reusable components for maintainability:

- **7 Reusable Components** - ThresholdInput, ThresholdSection, SensorStatusIndicator, CommandStatusMessage, ActionButton, AutoModeToggle, PumpControlToggle
- **71% Code Reduction** - Settings panel reduced from 305 lines to 87 lines
- **Consistent UI** - Unified styling and behavior across all components
- **Easy Maintenance** - Fix bugs once, update everywhere
- **Single Responsibility** - Each component does one thing well

### 7. Multi-Device Support

Seamless switching between multiple IoT devices:

- **Device Selection** - Dropdown to switch active device
- **Per-Device Settings** - Each device has its own threshold configuration
- **WebSocket Resubscription** - Automatic topic switching when device changes
- **Historical Data Reload** - Chart data refreshed for new device

### 8. Alert System

Color-coded status indicators for all sensors:

- **Critical (Red)** - Sensor far outside acceptable range, immediate attention required
- **Warning (Yellow)** - Sensor approaching threshold, monitor closely
- **Optimal (Green)** - Sensor within safe range, all good

---

## 🏗️ System Architecture

### Communication Flow

```
┌──────────────┐    MQTT Publish    ┌──────────────┐
│  IoT Device  │ ─────────────────→ │   Backend    │
│  (ESP32)     │                     │ MQTT Broker  │
└──────────────┘                     └──────┬───────┘
       ↑                                    │
       │                                    │ WebSocket
       │ MQTT Subscribe                     │ (Real-time)
       │                                    ↓
       │                             ┌──────────────┐
       │    ←─── HTTP API ───────── │   Frontend   │
       │      (Commands)              │  Dashboard   │
       └─────────────────────────────│  (React)     │
         Device Confirmation          └──────────────┘
```

### Data Flows

1. **Real-time Sensor Data**: Device → MQTT → Backend → WebSocket → Frontend → UI Update
2. **Pump Control (Auto)**: Frontend Automation → HTTP POST → Backend → MQTT → Device → Confirmation → WebSocket → UI Update
3. **Pump Control (Manual)**: User Click → HTTP POST → Backend → MQTT → Device → Confirmation → WebSocket → UI Update
4. **Historical Data**: Frontend → HTTP POST → Backend Database → JSON Response → Chart Render

---

## 🏗️ Project Structure

```
src/
├── Components/                      # React Components
│   ├── Dashboard.jsx               # Main orchestrator (576 lines)
│   ├── Header.jsx                  # Navigation bar
│   ├── SettingsPanel.jsx           # Threshold settings UI (87 lines)
│   ├── StatusCard.jsx              # Sensor display card
│   ├── HistoricalChartTest.jsx     # Recharts visualization
│   ├── ErrorBoundary.jsx           # Error handling wrapper
│   │
│   └── Reusable Components/        # Extracted for code reuse
│       ├── ThresholdInput.jsx      # Single threshold input field
│       ├── ThresholdSection.jsx    # Min/max threshold pair
│       ├── SensorStatusIndicator.jsx # Color-coded status display
│       ├── CommandStatusMessage.jsx  # Success/error message banner
│       ├── ActionButton.jsx         # Button with loading state
│       ├── AutoModeToggle.jsx       # Auto pump control toggle
│       └── PumpControlToggle.jsx    # Manual pump control button
│
├── Service/                         # API & Communication Layer
│   ├── api.js                      # Axios instance with JWT interceptor
│   ├── authService.js              # Login/register API calls
│   ├── deviceService.js            # Device & sensor data API (498 lines)
│   └── webSocketClient.js          # STOMP WebSocket client (469 lines)
│
├── Context/                         # React Context
│   └── AuthContext.jsx             # JWT token & user ID management
│
└── assets/                          # Images, logos
    └── images/
```

---

## 🔌 Technology Stack

### Frontend

- **React 18.2.0** - Component-based UI framework
- **Vite 7.2.2** - Fast build tool and dev server
- **React Router 6.20.0** - Client-side routing
- **Tailwind CSS 3.4.0** - Utility-first CSS framework
- **Lucide React 0.263.1** - Modern icon library

### Data & Communication

- **@stomp/stompjs 7.2.1** - WebSocket STOMP protocol for real-time updates
- **Axios 1.6.2** - HTTP client for REST API calls
- **Recharts 2.10.3** - Interactive charting library

### Backend Integration

- **WebSocket Server** - STOMP over WebSocket for real-time sensor data
- **REST API** - HTTP endpoints for commands and historical data
- **MQTT Broker** - Device communication protocol
- **JWT Authentication** - Secure token-based authentication

---

## 📡 Backend Integration

**Base URL (Production):**  
`https://api.protonestconnect.co/api/v1/user`

**WebSocket URL (Production):**  
`wss://api.protonestconnect.co/ws?token={JWT_TOKEN}`

### Key Endpoints

- **POST /login-email** - User authentication (returns JWT token)
- **POST /get-all-stream-data** - Fetch historical sensor data (24 hours)
- **POST /get-stream-data/device/topic** - Fetch specific sensor data with time range
- **POST /update-state-details** - Send commands to device (pump control, etc.)

### WebSocket Topics

- **Subscribe**: `/topic/protonest/{deviceId}/state/#` - All sensor updates
- **Message Format**: `{ sensorType: "moisture", data: { moisture: 45.2 } }`
- **Batch Updates**: `{ sensorType: "batchUpdate", data: { moisture: 45.2, temp: 28.5, ... } }`

See `PROJECT_DOCUMENTATION.md` for complete API reference.

---

## 📚 Documentation

| Document                            | Purpose                                      |
| ----------------------------------- | -------------------------------------------- |
| **PROJECT_DOCUMENTATION.md**        | 📘 Complete project documentation (71 pages) |
| **DATA_FLOW_ARCHITECTURE.md**       | Detailed data flow diagrams                  |
| **DEVICE_AUTHORIZATION_FIX.md**     | Device ownership troubleshooting             |
| **DEVICE_PAYLOAD_SPECIFICATION.md** | MQTT payload formats                         |
| **MQTTX_TESTING_GUIDE.md**          | Testing with MQTTX tool                      |
| **WEBSOCKET_INTEGRATION_GUIDE.md**  | WebSocket integration tutorial               |
| **WEBSOCKET_MIGRATION.md**          | Migration from polling to WebSocket          |

---

## ⚙️ Configuration

### Default Device ID

Edit `src/Components/Dashboard.jsx`:

```javascript
const defaultDeviceId = "device0011233"; // Change to your device ID
```

### Time Intervals

**Historical data refresh** (Dashboard.jsx, line 103):

```javascript
}, 30000); // 30 seconds - change to 15000 for 15 seconds
```

**Command status message display** (Dashboard.jsx, lines 408, 434):

```javascript
setTimeout(() => setCommandStatus(null), 3000); // 3 seconds
```

**WebSocket reconnect delay** (webSocketClient.js, line 37):

```javascript
reconnectDelay: 5000, // 5 seconds
```

### Default Thresholds

**Location**: `src/Components/Dashboard.jsx` (line 50)

```javascript
{
  moistureMin: '20',    // Turn pump ON if below
  moistureMax: '70',    // Turn pump OFF if above
  tempMin: '10',
  tempMax: '35',
  humidityMin: '30',
  humidityMax: '80',
  lightMin: '200',
  lightMax: '1000',
  batteryMin: '20',
  autoMode: true        // Auto pump control enabled by default
}
```

---

## 🐛 Troubleshooting

### WebSocket Not Connecting

- Check JWT token: `console.log(localStorage.getItem('jwtToken'))`
- Login again if token expired
- Check browser console for connection errors
- Verify WebSocket URL (must be `wss://` for HTTPS sites)

### Pump Not Turning On (Auto Mode)

1. **Check auto mode enabled**: Toggle should be blue in Settings Panel
2. **Check thresholds saved**: Click "Save Settings" after changes
3. **Check moisture level**: Must be below minimum threshold (default: 20%)
4. **Check console logs**: Look for HTTP POST `/update-state-details` requests
5. **Check device logs**: Ensure device receives MQTT messages

### Historical Data Not Loading

- **Device ownership**: Ensure device belongs to your account
- **Update device ID**: Edit `defaultDeviceId` in Dashboard.jsx
- **JWT expired**: Login again to refresh token
- **Check console**: Look for 403/401 errors in Network tab

### Settings Not Saving

1. Click "Save Settings" button (not just change values)
2. Check localStorage: `console.log(localStorage.getItem('settings_device0011233'))`
3. Clear localStorage and re-save if needed

### Chart Performance Issues

- Reduce data range (last 6 hours instead of 24)
- Increase refresh interval (60 seconds instead of 30)
- Limit data points displayed

**For detailed troubleshooting**, see `PROJECT_DOCUMENTATION.md` section 13.

---

## 🚀 Quick Deploy

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
netlify deploy --prod --dir=dist
```

### Docker

```bash
docker build -t plant-monitoring:latest .
docker run -p 80:80 plant-monitoring:latest
```

---

**Status:** Production Ready  
**Last Updated:** December 1, 2025  
**Version:** 1.0.0

---

## 📞 Support & Contributing

**Issues**: Open GitHub issue with detailed description and console logs  
**Questions**: Use GitHub Discussions  
**Documentation**: See `PROJECT_DOCUMENTATION.md` for complete reference

**License**: MIT License
