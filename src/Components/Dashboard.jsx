import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import api from '../Services/api';
import { useWebSocket } from '../Hooks/UseWebSocket'; 
import { Download, AlertTriangle, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Import sub-components
import Header from './Header';
import SettingsPanel from './SettingsPanel';
import StatusCard from './StatusCard';

const Dashboard = () => {
  const { deviceId: paramDeviceId } = useParams();
  const defaultDeviceId = 'greenhouse-1';
  const deviceId = paramDeviceId || defaultDeviceId;
  const { userId, logout } = useAuth();
  const navigate = useNavigate();

  // Data Hooks & States
  const { liveData, isConnected } = useWebSocket(deviceId);
  const mockChartData = [
    { time: '10:00', moisture: 40, temperature: 24 }, 
    { time: '10:05', moisture: 38, temperature: 25 },
    { time: '10:10', moisture: 45, temperature: 23 }, 
    { time: '10:15', moisture: 31, temperature: 27 },
    { time: '10:20', moisture: 40, temperature: 26 }, 
    { time: '10:25', moisture: 42, temperature: 22 },
    { time: '10:30', moisture: 39, temperature: 24 },
  ];
  const [chartData, setChartData] = useState(mockChartData);
  const [deviceList] = useState(['greenhouse-1', 'greenhouse-2', 'greenhouse-3']);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [settings, setSettings] = useState({ moistureMin: '20', moistureMax: '60', tempMax: '30' });
  const [alerts, setAlerts] = useState([]);

  // Fetch Historical Data 
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoadingChart(true);
      try {
        const response = await api.get(`/get-stream-data/${deviceId}`);
        const data = Array.isArray(response.data) ? response.data : mockChartData;
        setChartData(data); 
      } catch (error) {
        // Mock data for visualization
        setChartData(mockChartData);
      } finally {
        setIsLoadingChart(false);
      }
    };
    if (deviceId) fetchHistory();
  }, [deviceId]);

  // Alert Logic - Support multiple alerts
  useEffect(() => {
    const currentData = liveData || {}; 
    const minM = parseFloat(settings.moistureMin) || 20;
    const maxM = parseFloat(settings.moistureMax) || 60;
    const maxT = parseFloat(settings.tempMax) || 30;

    const newAlerts = [];

    // Check moisture min
    if (currentData.moisture !== undefined && currentData.moisture < minM) {
      newAlerts.push({
        id: 'moisture-min',
        type: 'CRITICAL',
        message: `CRITICAL: Soil Moisture (${currentData.moisture}%) is below minimum threshold (${minM}%).`,
        icon: 'AlertTriangle'
      });
    }

    // Check moisture max
    if (currentData.moisture !== undefined && currentData.moisture > maxM) {
      newAlerts.push({
        id: 'moisture-max',
        type: 'WARNING',
        message: `WARNING: Soil Moisture (${currentData.moisture}%) exceeds maximum threshold (${maxM}%).`,
        icon: 'AlertTriangle'
      });
    }

    // Check temperature max
    if (currentData.temperature !== undefined && currentData.temperature > maxT) {
      newAlerts.push({
        id: 'temp-max',
        type: 'WARNING',
        message: `WARNING: Temperature (${currentData.temperature}°C) exceeds maximum threshold (${maxT}°C).`,
        icon: 'AlertTriangle'
      });
    }

    setAlerts(newAlerts);
  }, [liveData, settings]);
  
  // Control Handlers passed to SettingsPanel
  const handleSaveSettings = async () => {
    try {
      // Logic is in SettingsPanel, this is a placeholder function call to API
      await api.post(`/update-state-details-${deviceId}`, settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };
  const togglePump = async () => {
    try {
      // Logic is in SettingsPanel, this is a placeholder function call to API
      const newStatus = liveData?.pumpStatus === 'ON' ? 'OFF' : 'ON';
      await api.post(`/update-state-details-${deviceId}`, { pump: newStatus, mode: 'MANUAL' });
    } catch (error) {
      console.error('Failed to toggle pump:', error);
    }
  };

  // Helpers
  const getVal = (key, unit, decimals = 1) => liveData?.[key] ? `${liveData[key].toFixed(decimals)}${unit}` : '--';
  const pumpStatus = liveData?.pumpStatus || 'OFF';

  const handleExportCSV = () => {
    try {
      if (!chartData || chartData.length === 0) {
        console.warn('No chart data to export');
        return;
      }
      
      const csv = [
        ['Time', 'Moisture', 'Temperature', 'Humidity', 'Light'],
        ...chartData.map(row => [
          row.time || '',
          row.moisture || '',
          row.temperature || '',
          row.humidity || '',
          row.light || ''
        ])
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${deviceId}-${new Date().toISOString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-4 font-sans text-gray-800">
      
      {/* Alert Banners - Display all alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3 mb-6">
          {alerts.map(alert => (
            <div key={alert.id} className={`${alert.type === 'CRITICAL' ? 'bg-red-500' : 'bg-yellow-500'} text-white rounded-lg p-3 shadow-xl flex items-center justify-center font-bold text-lg animate-pulse`}>
              <AlertTriangle className="w-6 h-6 mr-3" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Header Component */}
      <Header deviceId={deviceId} deviceList={deviceList} />

      {/* Pump Status Banner */}
      <div className={`rounded-xl py-4 text-center mb-8 shadow-sm border transition-colors duration-500 ${pumpStatus === 'ON' ? 'bg-green-100 border-green-300' : 'bg-blue-100 border-blue-300'}`}>
        <h2 className={`text-xl font-bold ${pumpStatus === 'ON' ? 'text-green-900' : 'text-blue-900'}`}>
          Pump : {pumpStatus} ({liveData?.pumpMode || 'Optimal'})
        </h2>
      </div>

      {/* Real Time Status Cards */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
           <h3 className="text-lg font-bold text-gray-800">Real Time Status : <span className="font-normal text-gray-600">{deviceId}</span></h3>
           <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isConnected ? '● Live' : '● Connecting...'}
           </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatusCard value={getVal('moisture', '%')} label="Soil Moisture" borderColor={alerts.some(a => a.id.includes('moisture')) ? 'border-red-500' : 'border-green-500'} />
          <StatusCard value={getVal('temperature', '°C')} label="Temperature" borderColor={alerts.some(a => a.id === 'temp-max') ? 'border-red-500' : 'border-green-500'} />
          <StatusCard value={getVal('humidity', '%')} label="Humidity" borderColor="border-blue-400" />
          <StatusCard value={getVal('light', ' lux', 0)} label="Light" borderColor="border-gray-300" />
        </div>
      </div>

      {/*  Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Historical Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-md flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">Historical Data</h3>
            <button onClick={handleExportCSV} className="bg-yellow-200 hover:bg-yellow-300 text-gray-800 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition">
              download .CSV <Download className="w-4 h-4" />
            </button>
          </div>
          <div className="h-64 w-full flex-grow">
            {isLoadingChart ? <div className="h-full flex items-center justify-center text-gray-400"><Loader2 className="animate-spin w-8 h-8"/></div> : 
            (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Line type="monotone" dataKey="moisture" name="Moisture" stroke="#4ade80" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="temperature" name="Temp" stroke="#ef4444" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Settings Panel Component */}
        <SettingsPanel 
          settings={settings} 
          setSettings={setSettings} 
          handleSaveSettings={handleSaveSettings} 
          liveData={liveData} 
          togglePump={togglePump} 
        />
      </div>
    </div>
  );
};

export default Dashboard;