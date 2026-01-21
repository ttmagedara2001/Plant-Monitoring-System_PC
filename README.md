# Plant Monitoring System - PC Dashboard

A real-time, interactive React dashboard for monitoring plant sensor data with WebSocket integration and cookie-based authentication.

## 🌱 Overview

The Plant Monitoring System PC Dashboard displays live sensor data (moisture, temperature, humidity, light) from IoT devices monitoring plants/greenhouses. It provides real-time alerts, historical trending, and device control capabilities.

**Key Features:**

- ✅ Real-time sensor data updates via WebSocket
- ✅ Cookie-based HttpOnly authentication (secure)
- ✅ Multiple simultaneous alerts with configurable thresholds
- ✅ Interactive charts with historical trending
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ Device management and selection
- ✅ Threshold configuration panel
- ✅ CSV export for analysis
- ✅ Graceful fallback with mock data when API unavailable
- ✅ Seasonal visual effects

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

## 🔐 Authentication

The application uses **Cookie-Based HttpOnly Authentication** for enhanced security.

### How It Works

1. **Login** (`POST /user/get-token`)
   - Send email and secretKey in request body
   - Server returns 200 OK with **no response body**
   - JWT and Refresh Token are set as **HttpOnly cookies** automatically

2. **API Requests**
   - All requests include `withCredentials: true`
   - Browser automatically sends cookies with each request
   - No manual token attachment needed

3. **Token Refresh** (`GET /get-new-token`)
   - Server uses Refresh Token from cookie
   - New tokens set as cookies automatically
   - Transparent to the application

4. **WebSocket Connection**
   - Connect to `wss://api.protonestconnect.co/ws`
   - No token query parameter needed
   - Browser sends cookies with WebSocket handshake

### Environment Variables

```env
# API Configuration
VITE_API_BASE_URL=https://api.protonestconnect.co/api/v1

# WebSocket Configuration  
VITE_WS_URL=wss://api.protonestconnect.co/ws

# Auto-login credentials (optional)
VITE_USER_EMAIL=your-email@example.com
VITE_USER_SECRET=your-secretKey
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

- **Auto Mode** - Automatically turns pump ON when moisture ≤ minimum threshold (default: 20%)
- **Auto Mode** - Pump turns OFF when moisture > minimum threshold
- **Mode Tracking** - Device receives mode information (auto/manual) with each command
- **HTTP API Flow** - PC → `/update-state-details` → Backend → MQTT → Device → Confirmation → WebSocket → UI Update

### 3. Manual Pump Control

User-controlled pump operation with instant feedback:

- **Toggle Control** - One-click pump ON/OFF from settings panel
- **Mode Tracking** - Commands sent with `mode: "manual"` to distinguish from automation
- **Status Display** - Real-time pump status with color coding (green=ON, red=OFF)
- **Loading States** - Visual feedback during command processing

### 4. Historical Data Visualization

Interactive charts showing sensor trends over time:

- **24-Hour Data** - Default view of last 24 hours with configurable time ranges
- **Multi-Line Chart** - All sensors on one graph with Recharts
- **CSV Export** - Download data for external analysis
- **Responsive Design** - Zoom, pan, and tooltip interactions

### 5. Threshold Configuration

Fully customizable alert and automation thresholds:

- **Moisture Thresholds** - Min/max for pump automation (default: 20%-70%)
- **Temperature Thresholds** - Min/max for temperature alerts (default: 10°C-35°C)
- **Humidity Thresholds** - Min/max for humidity alerts (default: 30%-80%)
- **Light Thresholds** - Min/max for light alerts (default: 200-1000 lux)
- **Battery Threshold** - Minimum battery level alert (default: 20%)
- **Auto Mode Toggle** - Enable/disable automated pump control
- **LocalStorage Persistence** - Settings saved per device

### 6. Multi-Device Support

Seamless switching between multiple IoT devices:

- **Device Selection** - Dropdown to switch active device
- **Per-Device Settings** - Each device has its own threshold configuration
- **WebSocket Resubscription** - Automatic topic switching when device changes
- **Historical Data Reload** - Chart data refreshed for new device

---

## 🏗️ System Architecture

### Communication Flow (Cookie-Based Auth)

```
┌──────────────┐    MQTT Publish     ┌──────────────┐
│  IoT Device  │ ─────────────────→  │   Backend    │
│  (MQTTX)     │                     │ MQTT Broker  │
└──────────────┘                     └──────┬───────┘
       ↑                                    │
       │                                    │ WebSocket
       │ MQTT Subscribe                     │ (Cookie Auth)
       │                                    ↓
       │                             ┌──────────────┐
       │    ←─── HTTP API ─────────  │   Frontend   │
       │      (with cookies)         │  Dashboard   │
       └─────────────────────────────│  (React)     │
         Device Confirmation         └──────────────┘
```

### Authentication Flow

```
1. User Login (or Auto-Login from ENV)
   POST /user/get-token → Sets HttpOnly Cookies
                ↓
2. WebSocket Connection
   Connect to wss://...ws (cookies sent automatically)
                ↓
3. API Requests
   All requests include withCredentials: true
   Cookies sent automatically
                ↓
4. Token Refresh (on 400 "Invalid token")
   GET /get-new-token → New cookies set automatically
```

---

## 🏗️ Project Structure

```
src/
├── Components/                      # React Components
│   ├── Dashboard.jsx               # Main dashboard with sensor display
│   ├── Header.jsx                  # Navigation bar with device selector
│   ├── StatusBar.jsx               # Tab navigation component
│   ├── DeviceSettingsPage.jsx      # Full device settings page
│   ├── HistoricalChartTest.jsx     # Recharts visualization
│   ├── ErrorBoundary.jsx           # Error handling wrapper
│   └── ... (reusable components)
│
├── Service/                         # API & Communication Layer
│   ├── api.js                      # Axios client with cookie auth
│   ├── authService.js              # Login/session management
│   ├── deviceService.js            # Device & sensor data API
│   └── webSocketClient.js          # STOMP WebSocket client
│
├── Context/                         # React Context
│   ├── AuthContext.jsx             # Authentication state management
│   └── NotificationContext.jsx     # App-wide notification system
│
├── App.jsx                          # Main app with WebSocket integration
├── main.jsx                         # React entry point
└── index.css                        # Global styles
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

- **@stomp/stompjs 7.2.1** - WebSocket STOMP protocol
- **Axios 1.6.2** - HTTP client with cookie support
- **Recharts 2.10.3** - Interactive charting library

### Backend Integration

- **WebSocket Server** - STOMP over WebSocket for real-time data
- **REST API** - HTTP endpoints with cookie authentication
- **MQTT Broker** - Device communication protocol
- **HttpOnly Cookies** - Secure token storage

---

## 📡 API Reference

**Base URL:** `https://api.protonestconnect.co/api/v1`  
**WebSocket URL:** `wss://api.protonestconnect.co/ws`

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/user/get-token` | POST | Login - sets HttpOnly cookies |
| `/get-new-token` | GET | Refresh tokens via cookie |

### Data Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/user/get-stream-data/device/topic` | POST | Fetch historical sensor data |
| `/update-state-details` | POST | Send commands to device |

### WebSocket Topics

- **Stream Data**: `/topic/stream/{deviceId}` - All sensor updates
- **State Data**: `/topic/state/{deviceId}` - Pump status updates

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **MQTTX_TESTING_GUIDE.md** | 🧪 MQTT testing with MQTTX client |
| **PROTONEST_SETUP.md** | ⚙️ ProtoNest platform configuration |
| **WEBSOCKET_IMPLEMENTATION.md** | 🔌 WebSocket client details |
| **README.md** | 📖 This documentation |

---

## 🐛 Troubleshooting

### WebSocket Not Connecting

1. Verify you're authenticated (login succeeded)
2. Check browser console for cookie-related errors
3. Ensure `withCredentials: true` in requests
4. For CORS issues, verify server allows credentials

### Session Expired

- On 400 "Invalid token" error, automatic refresh is attempted
- If refresh fails, user is logged out
- Re-login to get new session cookies

### Pump Not Responding

1. Check auto mode enabled in settings
2. Verify device ownership
3. Check console for API errors
4. Verify WebSocket connection status

---

## 🚀 Deployment

### GitHub Pages

```bash
npm run deploy
```

### Vercel

```bash
npm install -g vercel
vercel
```

### Docker

```bash
docker build -t plant-monitoring:latest .
docker run -p 80:80 plant-monitoring:latest
```

---

**Status:** Production Ready  
**Last Updated:** January 2026  
**Version:** 2.0.0 (Cookie-Based Auth)
**Auth Method:** HttpOnly Cookies

---

## 📞 Support

**Issues**: Open GitHub issue with console logs  
**Questions**: Use GitHub Discussions
