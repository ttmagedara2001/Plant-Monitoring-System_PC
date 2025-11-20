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

## 📊 Dashboard Features

### Status Cards

Real-time display of four key metrics:

- **Moisture:** Soil/water level (0-100%)
- **Temperature:** Ambient temperature (°C)
- **Humidity:** Air humidity (0-100%)
- **Light:** Light intensity (lux)

### Alert System

Displays triggered conditions:

- **Moisture Min Alert:** When moisture drops below threshold
- **Moisture Max Alert:** When moisture exceeds threshold
- **Temperature Max Alert:** When temperature exceeds threshold

### Historical Chart

Recharts-based visualization with CSV export

### Settings Panel

Configurable thresholds for all sensors

---

## 🏗️ Project Structure

```
src/
├── Components/       # UI components
├── Hooks/           # Custom React hooks (useWebSocket)
├── Services/        # API services
├── Context/         # React Context
└── assets/          # Images and assets
```

---

## 🔌 Technology Stack

- **React 18.2.0** - UI framework
- **Vite 5.0+** - Build tool
- **Recharts 2.10.3** - Charts
- **Tailwind CSS** - Styling
- **WebSocket API** - Real-time communication
- **Axios** - HTTP client
- **JWT** - Token authentication

---

## 📡 Backend Integration

**Base URL:** `https://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/api/v1/user`

**WebSocket URL:** `wss://protonest-connect-general-app.yellowsea-5dc9141a.westeurope.azurecontainerapps.io/ws?token={JWT_TOKEN}`

See `WEBSOCKET_PAYLOADS.md` for message formats.

---

## 📚 Documentation

| Document                         | Purpose                 |
| -------------------------------- | ----------------------- |
| `QUICK_START.md`                 | Getting started guide   |
| `API_DEBUG_GUIDE.md`             | API troubleshooting     |
| `FALLBACK_MODE_GUIDE.md`         | Mock mode explanation   |
| `WEBSOCKET_PAYLOADS.md`          | Message format examples |
| `WEBSOCKET_INTEGRATION_GUIDE.md` | Integration walkthrough |
| `IMPLEMENTATION_SUMMARY.md`      | Technical details       |
| `BUILD_AND_DEPLOYMENT.md`        | Deployment guide        |

---

## 🐛 Troubleshooting

**Dashboard Won't Load?**  
Check browser console for errors, ensure `npm run dev` is running.

**No Data Displaying?**  
Wait 3-5 seconds for mock data, check console for `[WS]` logs.

**Chart Empty?**  
Requires ~50 seconds of data accumulation.

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

**Status:** Ready for Development Testing  
**Last Updated:** 2024  
**Version:** 1.0.0-beta
