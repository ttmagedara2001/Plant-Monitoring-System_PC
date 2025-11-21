// // import React, { useState, useEffect } from 'react';
// // import { useParams, useNavigate } from 'react-router-dom';
// // import { useAuth } from '../Context/AuthContext';
// // import api from '../Services/api';
// // import { useWebSocket } from '../Hooks/UseWebSocket';
// // import { sendControlCommand, sendSettingsUpdate, sendSetPump } from '../Services/commands';
// // import { Download, AlertTriangle, Loader2 } from 'lucide-react';
// // import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// // // Import sub-components
// // import Header from './Header';
// // import SettingsPanel from './SettingsPanel';
// // import StatusCard from './StatusCard';

// // const Dashboard = () => {
// //   const { deviceId: paramDeviceId } = useParams();
// //   const defaultDeviceId = 'greenhouse-1';
// //   const deviceId = paramDeviceId || defaultDeviceId;
// //   const { userId, logout } = useAuth();
// //   const navigate = useNavigate();

// //   const [deviceList] = useState(['greenhouse-1', 'greenhouse-2', 'greenhouse-3']);
// //   const [settings, setSettings] = useState({ moistureMin: '20', moistureMax: '60', tempMax: '30' });

// //   // Mock data fallback
// //   const mockChartData = [
// //     { time: '10:00', moisture: 40, temperature: 24 }, 
// //     { time: '10:05', moisture: 38, temperature: 25 },
// //     { time: '10:10', moisture: 45, temperature: 23 }, 
// //     { time: '10:15', moisture: 31, temperature: 27 },
// //     { time: '10:20', moisture: 40, temperature: 26 }, 
// //     { time: '10:25', moisture: 42, temperature: 22 },
// //     { time: '10:30', moisture: 39, temperature: 24 },
// //   ];

// //   // WebSocket data
// //   const { liveData, chartData: wsChartData, alerts: wsAlerts, isConnected, lastAck, send: sendWsMessage } = useWebSocket(deviceId);
  
// //   const [chartData, setChartData] = useState(mockChartData);
// //   const [alerts, setAlerts] = useState([]);
// //   const [isLoadingChart, setIsLoadingChart] = useState(false);
// //   const [commandInProgress, setCommandInProgress] = useState(null);

// //   // Sync WebSocket chart data or use mock
// //   useEffect(() => {
// //     if (wsChartData && Array.isArray(wsChartData) && wsChartData.length > 0) {
// //       setChartData(wsChartData);
// //     } else {
// //       // Use mock data as fallback
// //       setChartData(mockChartData);
// //     }
// //     setIsLoadingChart(false);
// //   }, [wsChartData]);

// //   // Sync WebSocket alerts or compute client-side
// //   useEffect(() => {
// //     if (wsAlerts && Array.isArray(wsAlerts) && wsAlerts.length > 0) {
// //       setAlerts(wsAlerts);
// //       return;
// //     }
    
// //     // Client-side alert computation (fallback)
// //     const currentData = liveData || {}; 
// //     const minM = parseFloat(settings.moistureMin) || 20;
// //     const maxM = parseFloat(settings.moistureMax) || 60;
// //     const maxT = parseFloat(settings.tempMax) || 30;

// //     const newAlerts = [];

// //     if (currentData.moisture !== undefined && currentData.moisture < minM) {
// //       newAlerts.push({
// //         id: 'moisture-min',
// //         type: 'CRITICAL',
// //         message: `CRITICAL: Soil Moisture (${currentData.moisture}%) is below minimum threshold (${minM}%).`,
// //       });
// //     }

// //     if (currentData.moisture !== undefined && currentData.moisture > maxM) {
// //       newAlerts.push({
// //         id: 'moisture-max',
// //         type: 'WARNING',
// //         message: `WARNING: Soil Moisture (${currentData.moisture}%) exceeds maximum threshold (${maxM}%).`,
// //       });
// //     }

// //     if (currentData.temperature !== undefined && currentData.temperature > maxT) {
// //       newAlerts.push({
// //         id: 'temp-max',
// //         type: 'WARNING',
// //         message: `WARNING: Temperature (${currentData.temperature}°C) exceeds maximum threshold (${maxT}°C).`,
// //       });
// //     }

// //     setAlerts(newAlerts);
// //   }, [liveData, settings, wsAlerts]);
  
// //   // Control Handlers passed to SettingsPanel
// //   const handleSaveSettings = async () => {
// //     try {
// //       // Logic is in SettingsPanel, this is a placeholder function call to API
// //       await api.post(`/update-state-details-${deviceId}`, settings);
// //     } catch (error) {
// //       console.error('Failed to save settings:', error);
// //     }
// //   };
// //   const togglePump = async () => {
// //     try {
// //       // Logic is in SettingsPanel, this is a placeholder function call to API
// //       const newStatus = liveData?.pumpStatus === 'ON' ? 'OFF' : 'ON';
// //       await api.post(`/update-state-details-${deviceId}`, { pump: newStatus, mode: 'MANUAL' });
// //     } catch (error) {
// //       console.error('Failed to toggle pump:', error);
// //     }
// //   };

// //   // Helpers
// //   const getVal = (key, unit, decimals = 1) => liveData?.[key] ? `${liveData[key].toFixed(decimals)}${unit}` : '--';
// //   const pumpStatus = liveData?.pumpStatus || 'OFF';

// //   const handleExportCSV = () => {
// //     try {
// //       if (!chartData || chartData.length === 0) {
// //         console.warn('No chart data to export');
// //         return;
// //       }
      
// //       const csv = [
// //         ['Time', 'Moisture', 'Temperature', 'Humidity', 'Light'],
// //         ...chartData.map(row => [
// //           row.time || '',
// //           row.moisture || '',
// //           row.temperature || '',
// //           row.humidity || '',
// //           row.light || ''
// //         ])
// //       ].map(row => row.join(',')).join('\n');
      
// //       const blob = new Blob([csv], { type: 'text/csv' });
// //       const url = window.URL.createObjectURL(blob);
// //       const a = document.createElement('a');
// //       a.href = url;
// //       a.download = `dashboard-${deviceId}-${new Date().toISOString()}.csv`;
// //       a.click();
// //       window.URL.revokeObjectURL(url);
// //     } catch (error) {
// //       console.error('Error exporting CSV:', error);
// //     }
// //   };

// //   return (
// //     <div className="min-h-screen bg-[#f0f4f8] p-4 font-sans text-gray-800">
      
// //       {/* Alert Banners - Display all alerts */}
// //       {alerts.length > 0 && (
// //         <div className="space-y-3 mb-6">
// //           {alerts.map(alert => (
// //             <div key={alert.id} className={`${alert.type === 'CRITICAL' ? 'bg-red-500' : 'bg-yellow-500'} text-white rounded-lg p-3 shadow-xl flex items-center justify-center font-bold text-lg animate-pulse`}>
// //               <AlertTriangle className="w-6 h-6 mr-3" />
// //               {alert.message}
// //             </div>
// //           ))}
// //         </div>
// //       )}

// //       {/* Header Component */}
// //       <Header deviceId={deviceId} deviceList={deviceList} />

// //       {/* Pump Status Banner */}
// //       <div className={`rounded-xl py-4 text-center mb-8 shadow-sm border transition-colors duration-500 ${pumpStatus === 'ON' ? 'bg-green-100 border-green-300' : 'bg-blue-100 border-blue-300'}`}>
// //         <h2 className={`text-xl font-bold ${pumpStatus === 'ON' ? 'text-green-900' : 'text-blue-900'}`}>
// //           Pump : {pumpStatus} ({liveData?.pumpMode || 'Optimal'})
// //         </h2>
// //       </div>

// //       {/* Real Time Status Cards */}
// //       <div className="mb-8">
// //         <div className="flex items-center gap-3 mb-4">
// //            <h3 className="text-lg font-bold text-gray-800">Real Time Status : <span className="font-normal text-gray-600">{deviceId}</span></h3>
// //            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
// //               {isConnected ? '● Live' : '● Connecting...'}
// //            </span>
// //         </div>
        
// //         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
// //           <StatusCard value={getVal('moisture', '%')} label="Soil Moisture" borderColor={alerts.some(a => a.id.includes('moisture')) ? 'border-red-500' : 'border-green-500'} />
// //           <StatusCard value={getVal('temperature', '°C')} label="Temperature" borderColor={alerts.some(a => a.id === 'temp-max') ? 'border-red-500' : 'border-green-500'} />
// //           <StatusCard value={getVal('humidity', '%')} label="Humidity" borderColor="border-blue-400" />
// //           <StatusCard value={getVal('light', ' lux', 0)} label="Light" borderColor="border-gray-300" />
// //         </div>
// //       </div>

// //       {/*  Main Content Grid */}
// //       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
// //         {/* Historical Chart */}
// //         <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-md flex flex-col">
// //           <div className="flex justify-between items-center mb-6">
// //             <h3 className="text-xl font-bold text-gray-800">Historical Data</h3>
// //             <button onClick={handleExportCSV} className="bg-yellow-200 hover:bg-yellow-300 text-gray-800 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition">
// //               download .CSV <Download className="w-4 h-4" />
// //             </button>
// //           </div>
// //           <div className="h-64 w-full flex-grow">
// //             {isLoadingChart ? <div className="h-full flex items-center justify-center text-gray-400"><Loader2 className="animate-spin w-8 h-8"/></div> : 
// //             (
// //               <ResponsiveContainer width="100%" height="100%">
// //                 <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
// //                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
// //                   <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} />
// //                   <YAxis tick={{ fontSize: 10, fill: '#888' }} />
// //                   <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
// //                   <Legend verticalAlign="top" height={36} />
// //                   <Line type="monotone" dataKey="moisture" name="Moisture" stroke="#4ade80" strokeWidth={3} dot={false} />
// //                   <Line type="monotone" dataKey="temperature" name="Temp" stroke="#ef4444" strokeWidth={3} dot={false} />
// //                 </LineChart>
// //               </ResponsiveContainer>
// //             )}
// //           </div>
// //         </div>

// //         {/* Settings Panel Component */}
// //         <SettingsPanel 
// //           settings={settings} 
// //           setSettings={setSettings} 
// //           handleSaveSettings={handleSaveSettings} 
// //           liveData={liveData} 
// //           togglePump={togglePump} 
// //         />
// //       </div>
// //     </div>
// //   );
// // };

// // export default Dashboard;

// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { useAuth } from '../Context/AuthContext'; // Import Auth Context
// import api from '../Services/api';
// import { useWebSocket } from '../Hooks/UseWebSocket';
// import { Download, AlertTriangle, Loader2 } from 'lucide-react';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// // Import sub-components
// import Header from './Header';
// import SettingsPanel from './SettingsPanel';
// import StatusCard from './StatusCard';

// const Dashboard = () => {
//   const { deviceId: paramDeviceId } = useParams();
//   const defaultDeviceId = 'greenhouse-1';
//   const deviceId = paramDeviceId || defaultDeviceId;
  
//   // 1. Get the auto-fetched token from AuthContext
//   const { userId, jwtToken, logout } = useAuth();
  
//   const navigate = useNavigate();
//   const [deviceList] = useState(['greenhouse-1', 'greenhouse-2', 'greenhouse-3']);
//   const [settings, setSettings] = useState({ moistureMin: '20', moistureMax: '60', tempMax: '30' });

//   // 2. Pass the token to useWebSocket
//   // The hook handles the connection logic and waits for the token
//   const { liveData, chartData: wsChartData, alerts: wsAlerts, isConnected } = useWebSocket(deviceId, jwtToken);
  
//   const [chartData, setChartData] = useState([]);
//   const [alerts, setAlerts] = useState([]);
//   const [commandInProgress, setCommandInProgress] = useState(null);
//   const [commandStatus, setCommandStatus] = useState(null);

//   // Sync WebSocket chart data
//   useEffect(() => {
//     if (wsChartData && Array.isArray(wsChartData) &&HzChartData.length > 0) {
//       setChartData(wsChartData);
//     }
//   }, [wsChartData]);

//   // Sync WebSocket alerts
//   useEffect(() => {
//     if (wsAlerts && Array.isArray(wsAlerts)) {
//       setAlerts(wsAlerts);
//     } else {
//         // Fallback: Client-side alert computation if backend doesn't send 'alerts' type
//         const currentData = liveData || {}; 
//         const minM = parseFloat(settings.moistureMin) || 20;
//         const maxM = parseFloat(settings.moistureMax) || 60;
//         const maxT = parseFloat(settings.tempMax) || 30;

//         const newAlerts = [];
//         if (currentData.moisture !== undefined && currentData.moisture < minM) {
//             newAlerts.push({ id: 'moisture-min', type: 'CRITICAL', message: `CRITICAL: Soil Moisture (${currentData.moisture}%) is below minimum.` });
//         }
//         if (currentData.moisture !== undefined && currentData.moisture > maxM) {
//             newAlerts.push({ id: 'moisture-max', type: 'WARNING', message: `WARNING: Soil Moisture (${currentData.moisture}%) exceeds maximum.` });
//         }
//         if (currentData.temperature !== undefined && currentData.temperature > maxT) {
//             newAlerts.push({ id: 'temp-max', type: 'WARNING', message: `WARNING: Temperature (${currentData.temperature}°C) exceeds maximum.` });
//         }
//         setAlerts(newAlerts);
//     }
//   }, [liveData, settings, wsAlerts]);
  
//   // Control Handlers
//   const handleSaveSettings = async () => {
//     setCommandInProgress('settings');
//     try {
//       await api.post(`/update-state-details`, { deviceId, settings }); 
//       setCommandStatus({ type: 'success',QP: 'Settings saved!' });
//     } catch (error) {
//       setCommandStatus({ type: 'error', message: 'Failed to save.' });
//     } finally {
//       setCommandInProgress(null);
//       setTimeout(() => setCommandStatus(null), 3000);
//     }
//   };

//   const togglePump = async () => {
//     try {
//       const newStatus = liveData?.pumpStatus === 'ON' ? 'OFF' : 'ON';
//       await api.post(`/update-state-details`, { deviceId, topic: 'pump', payload: { status: newStatus, mode: 'MANUAL' } });
//     } catch (error) {
//       console.error('Failed to toggle pump:', error);
//     }
//   };

//   // Helpers
//   const getVal = (key, unit, decimals = 1) => liveData?.[key] ? `${liveData[key].toFixed(decimals)}${unit}` : '--';
//   const pumpStatus = liveData?.pumpStatus || 'OFF';

//   const handleExportCSV = () => {
//       if (!chartData || chartData.length === 0) return;
//       const csv = [
//         ['Time', 'Moisture', 'Temperature', 'Humidity', 'Light'],
//         ...chartData.map(row => [row.time, row.moisture, row.temperature, row.humidity, row.light])
//       ].map(r => r.join(',')).join('\n');
      
//       const blob = new Blob([csv], { type: 'text/csv' });
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = `dashboard-${deviceId}.csv`;
//       a.click();
//   };

//   return (
//     <div className="min-h-screen bg-[#f0f4f8] p-4 font-sans text-gray-800">
      
//       {/* Alert Banners */}
//       {alerts.length > 0 && (
//         <div className="space-y-3 mb-6">
//           {alerts.map((alert, idx) => (
//             <div key={alert.id || idx} className={`${alert.type === 'CRITICAL' ? 'bg-red-500' : 'bg-yellow-500'} text-white rounded-lg p-3 shadow-xl flex items-center justify-center font-bold text-lg animate-pulse`}>
//               <AlertTriangle className="w-6 h-6 mr-3" />
//               {alert.message}
//             </div>
//           ))}
//         </div>
//       )}

//       <Header deviceId={deviceId} deviceList={deviceList} />

//       {/* Pump Status Banner */}
//       <div className={`rounded-xl py-4 text-center mb-8 shadow-smyb border transition-colors duration-500 ${pumpStatus === 'ON' ? 'bg-green-100 border-green-300' : 'bg-blue-100 border-blue-300'}`}>
//         <h2 className={`text-xl font-bold ${pumpStatus === 'ON' ? 'text-green-900' : 'text-blue-900'}`}>
//           Pump : {pumpStatus} ({liveData?.pumpMode || 'Optimal'})
//         </h2>
//       </div>

//       {/* Real Time Status */}
//       <div className="mb-8">
//         <div className="flex items-center gap-3 mb-4">
//            <h3 className="text-lg font-bold text-gray-800">Real Time Status : <span className="font-normal text-gray-600">{deviceId}</span></h3>
//            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
//               {isConnected ? '● Live' : '● Connecting...'}
//            </span>
//         </div>
        
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//           <StatusCard value={getVal('moisture', '%')} label="Soil Moisture" borderColor={alerts.some(a => a.id?.includes('moisture')) ? 'border-red-500' : 'border-green-500'} />
//           <StatusCard value={getVal('temperature', '°C')} label="Temperature" borderColor={alerts.some(a => a.id?.includes('temp')) ? 'border-red-500' : 'border-green-500'} />
//           <StatusCard value={getVal('humidity', '%')} label="Humidity" borderColor="border-blue-400" />
//           <StatusCard value={getVal('light', ' lux', 0)} label="Light" borderColor="border-gray-300" />
//         </div>
//       </div>

//       {/* Main Content Grid */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
//         {/* Historical Chart */}
//         <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-md flex flex-col">
//           <div className="flex justify-between items-center mb-6">
//             <h3 className="text-xl font-bold text-gray-800">Historical Data</h3>
//             <button onClick={handleExportCSV} className="bg-yellow-200 hover:bg-yellow-300 text-gray-800 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition">
//               download .CSV <Download className="w-4 h-4" />
//             </button>
//           </div>
//           <div className="h-64 w-full flex-grow">
//              <ResponsiveContainer width="100%" height="100%">
//                 <LineChart data={chartData}yb margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
//                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
//                   <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} />
//                   <YAxis tick={{ fontSize: 10, fill: '#888' }} />
//                   <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
//                   <Legend verticalAlign="top" height={36} />
//                   <Line type="monotone" dataKey="moisture" name="Moisture" stroke="#4ade80" strokeWidth={3} dot={false} />
//                   <Line type="monotone" dataKey="temperature" name="Temp" stroke="#ef4444" strokeWidth={3} dot={false} />
//                 </LineChart>
//               </ResponsiveContainer>
//           </div>
//         </div>

//         <SettingsPanel 
//           settings={settings} 
//           setSettings={setSettings} 
//           handleSaveSettings={handleSaveSettings} 
//           commandInProgress={commandInProgress}
//           commandStatus={commandStatus}
//           liveData={liveData} 
//           togglePump={togglePump} 
//           pumpStatus={pumpStatus}
//         />
//       </div>
//     </div>
//   );
// };

// export default Dashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { useWebSocket } from '../Hooks/UseWebSocket';
import { getHistoricalData, updateDeviceState } from '../Services/deviceService';
import { Download, AlertTriangle, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import Header from './Header';
import SettingsPanel from './SettingsPanel';
import StatusCard from './StatusCard';

const Dashboard = () => {
  const { deviceId: paramDeviceId } = useParams();
  const defaultDeviceId = 'greenhouse-1';
  const deviceId = paramDeviceId || defaultDeviceId;
  
  const { jwtToken } = useAuth();
  const navigate = useNavigate();
  
  const [deviceList] = useState(['greenhouse-1', 'greenhouse-2', 'greenhouse-3']);
  const [settings, setSettings] = useState({ moistureMin: '20', moistureMax: '60', tempMax: '30' });
  
  // WebSocket Integration
  const { liveData, chartData: wsChartData, alerts: wsAlerts, isConnected } = useWebSocket(deviceId, jwtToken);
  
  const [chartData, setChartData] = useState([]);
  const [clientAlerts, setClientAlerts] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [commandStatus, setCommandStatus] = useState(null);

  // Sync Chart Data
  useEffect(() => {
    if (wsChartData && wsChartData.length > 0) {
      setChartData(wsChartData);
    }
  }, [wsChartData]);

  // Task 3.2.1: Code the checkAlerts() function
  const checkAlerts = useCallback((data, currentSettings) => {
    const newAlerts = [];
    const minM = parseFloat(currentSettings.moistureMin) || 20;
    const maxM = parseFloat(currentSettings.moistureMax) || 60;
    const maxT = parseFloat(currentSettings.tempMax) || 30;

    if (data.moisture !== undefined && data.moisture < minM) {
      newAlerts.push({ 
        id: 'moisture-min', 
        type: 'CRITICAL', 
        message: `CRITICAL: Soil Moisture (${data.moisture}%) is below minimum (${minM}%).` 
      });
    }
    if (data.moisture !== undefined && data.moisture > maxM) {
      newAlerts.push({ 
        id: 'moisture-max', 
        type: 'WARNING', 
        message: `WARNING: Soil Moisture (${data.moisture}%) exceeds maximum (${maxM}%).` 
      });
    }
    if (data.temperature !== undefined && data.temperature > maxT) {
      newAlerts.push({ 
        id: 'temp-max', 
        type: 'WARNING', 
        message: `WARNING: Temperature (${data.temperature}°C) exceeds maximum (${maxT}°C).` 
      });
    }
    return newAlerts;
  }, []);

  // Update alerts when data changes
  useEffect(() => {
    // Use server alerts if available, otherwise use local checkAlerts logic
    if (wsAlerts && wsAlerts.length > 0) {
      setClientAlerts(wsAlerts);
    } else {
      setClientAlerts(checkAlerts(liveData, settings));
    }
  }, [liveData, settings, wsAlerts, checkAlerts]);

  // Task 3.3.2: Functional Export to CSV using API
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const history = await getHistoricalData(deviceId);
      
      if (!history || history.length === 0) {
        alert("No historical data available to export.");
        return;
      }

      const csvContent = [
        ['Timestamp', 'Moisture', 'Temperature', 'Humidity', 'Light'],
        ...history.map(row => [
          row.timestamp || row.time,
          row.moisture,
          row.temperature,
          row.humidity,
          row.light
        ])
      ].map(e => e.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${deviceId}_export_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Check console.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateDeviceState(deviceId, { settings });
      setCommandStatus({ type: 'success', message: 'Settings Saved' });
    } catch (e) {
      setCommandStatus({ type: 'error', message: 'Save Failed' });
    }
    setTimeout(() => setCommandStatus(null), 3000);
  };

  const togglePump = async () => {
    const newStatus = liveData.pumpStatus === 'ON' ? 'OFF' : 'ON';
    try {
        await updateDeviceState(deviceId, { 
            topic: 'pump', 
            payload: { status: newStatus, mode: 'MANUAL' } 
        });
    } catch (e) { console.error(e); }
  };

  // Helper for safe number display
  const getVal = (key, unit) => {
    const val = liveData[key];
    return (val !== undefined && val !== null && !isNaN(Number(val))) 
      ? `${Number(val).toFixed(1)}${unit}` 
      : '--';
  };

  // Task 3.2.2: Dynamic Coloring Logic
  const getBorderColor = (metric) => {
    if (clientAlerts.some(a => a.id.includes(metric))) return 'border-red-500';
    return 'border-green-500';
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-4 font-sans text-gray-800">
      {/* Alerts Overlay */}
      {clientAlerts.length > 0 && (
        <div className="space-y-3 mb-6">
          {clientAlerts.map((alert, idx) => (
            <div key={idx} className={`${alert.type === 'CRITICAL' ? 'bg-red-500' : 'bg-yellow-500'} text-white rounded-lg p-3 shadow-xl flex items-center justify-center font-bold animate-pulse`}>
              <AlertTriangle className="w-5 h-5 mr-2" /> {alert.message}
            </div>
          ))}
        </div>
      )}

      <Header deviceId={deviceId} deviceList={deviceList} />

      {/* Pump Status */}
      <div className={`rounded-xl py-4 text-center mb-8 border transition-colors duration-500 ${liveData.pumpStatus === 'ON' ? 'bg-green-100 border-green-300 text-green-900' : 'bg-blue-100 border-blue-300 text-blue-900'}`}>
        <h2 className="text-xl font-bold">Pump: {liveData.pumpStatus} ({liveData.pumpMode})</h2>
      </div>

      {/* Real-Time Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatusCard value={getVal('moisture', '%')} label="Soil Moisture" borderColor={getBorderColor('moisture')} />
        <StatusCard value={getVal('temperature', '°C')} label="Temperature" borderColor={getBorderColor('temp')} />
        <StatusCard value={getVal('humidity', '%')} label="Humidity" borderColor="border-blue-400" />
        <StatusCard value={getVal('light', ' lux')} label="Light" borderColor="border-gray-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Historical Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-md flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Historical Data</h3>
            <button 
                onClick={handleExportCSV} 
                disabled={isExporting}
                className="bg-yellow-200 hover:bg-yellow-300 text-gray-800 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50">
              {isExporting ? 'Exporting...' : 'Download .CSV'} <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="h-64 w-full flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="moisture" stroke="#4ade80" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Settings Panel */}
        <SettingsPanel 
          settings={settings} 
          setSettings={setSettings} 
          handleSaveSettings={handleSaveSettings} 
          commandStatus={commandStatus}
          liveData={liveData}
          togglePump={togglePump}
          pumpStatus={liveData.pumpStatus}
        />
      </div>
    </div>
  );
};

export default Dashboard;