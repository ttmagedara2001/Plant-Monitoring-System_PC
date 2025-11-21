import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { getHistoricalData, updateDeviceState } from '../Services/deviceService'; 
import { useWebSocket } from '../Hooks/UseWebSocketTest'; 
import { AlertTriangle } from 'lucide-react';

// Import Sub-Components
import Header from './Header';
import SettingsPanel from './SettingsPanel';
import StatusCard from './StatusCard';
import HistoricalChart from './HistoricalChartTest';

const Dashboard = () => {
  const { deviceId: paramDeviceId } = useParams();
  const defaultDeviceId = 'device0000'; 
  const deviceId = paramDeviceId || defaultDeviceId;
  
  const { logout, jwtToken } = useAuth(); 
  const navigate = useNavigate();

  // 1. Data Hooks & States
  const { liveData, isConnected } = useWebSocket(deviceId);
  const [chartData, setChartData] = useState([]);
  const [deviceList] = useState(['device0000', 'device0001']); 
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Settings & Control States
  const [settings, setSettings] = useState({ moistureMin: '20', moistureMax: '60', tempMax: '30' });
  const [alertMessage, setAlertMessage] = useState(null);
  const [commandStatus, setCommandStatus] = useState(null); 
  const [commandInProgress, setCommandInProgress] = useState(null);

  // Fetch Historical Data
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingChart(true);
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - (24 * 60 * 60 * 1000)); // Last 24h

        const history = await getHistoricalData(deviceId, startTime, endTime);
        
        // Map all available metrics for the new Chart component
        const formattedData = history.map(item => {
          try {
             const p = item.payload || {};
             return { 
               time: new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
               moisture: p.moisture || 0, 
               temperature: p.temperature || 0,
               humidity: p.humidity || 0,
               light: p.light || 0,
               battery: p.battery || 0
             };
          } catch(e) { return null; }
        }).filter(Boolean);

        setChartData(formattedData);
      } catch (error) {
        console.error("Failed to load history", error);
        setChartData([]);
      } finally {
        setIsLoadingChart(false);
      }
    };

    if (deviceId) loadData();
  }, [deviceId]); 

  // Alert Logic
  useEffect(() => {
    const currentData = liveData || {}; 
    const minM = parseFloat(settings.moistureMin);
    const maxT = parseFloat(settings.tempMax);

    // Only show alerts if we have valid data and thresholds
    if (currentData.moisture && currentData.moisture < minM) {
      setAlertMessage(`CRITICAL: Soil Moisture (${currentData.moisture}%) is below minimum (${minM}%).`);
    } else if (currentData.temperature && currentData.temperature > maxT) {
      setAlertMessage(`WARNING: Temperature (${currentData.temperature}°C) exceeds maximum (${maxT}°C).`);
    } else {
      setAlertMessage(null);
    }
  }, [liveData, settings]);
  
  // Task 3.1: Data Export Function
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      if (chartData.length === 0) {
        alert("No data available to export.");
        return;
      }
      const headers = ["time", "moisture", "temperature", "humidity", "light", "battery"].join(','); 
      const rows = chartData.map(d => 
        `${d.time},${d.moisture},${d.temperature},${d.humidity},${d.light},${d.battery}`
      ).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agricop_${deviceId}_report.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Control Handlers
  const handleSaveSettings = async () => {
    setCommandInProgress('settings');
    setCommandStatus(null);
    try {
      await updateDeviceState(deviceId, "settings/thresholds", settings); 
      setCommandStatus({ type: 'success', message: 'Settings saved successfully!' });
    } catch (error) {
      setCommandStatus({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setCommandInProgress(null);
      setTimeout(() => setCommandStatus(null), 3000);
    }
  };
  
  const togglePump = async () => {
    setCommandInProgress('pump');
    const currentStatus = liveData?.pumpStatus === 'ON';
    const newStatus = currentStatus ? 'OFF' : 'ON';
    
    try {
      await updateDeviceState(deviceId, "motor/paddy", { power: newStatus.toLowerCase() }); 
    } catch (error) {
      console.error("Pump control failed:", error);
    } finally {
      setCommandInProgress(null);
    }
  };

  // Helpers
  const getVal = (key, unit, decimals = 1) => liveData?.[key] ? `${Number(liveData[key]).toFixed(decimals)}${unit}` : '--';
  const pumpStatus = liveData?.pumpStatus || 'OFF';
  
  const getBorderColor = (key, min, max) => {
    const val = liveData?.[key];
    // If value exists and is outside bounds, return red, else green
    if (val !== undefined && (val < min || val > max)) return 'border-red-500';
    return 'border-green-500';
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-4 font-sans text-gray-800">
      
      {/* Alert Banner */}
      {alertMessage && (
          <div className="bg-red-500 text-white rounded-lg p-3 mb-6 shadow-xl flex items-center justify-center font-bold text-lg animate-pulse transition-all">
              <AlertTriangle className="w-6 h-6 mr-3" />
              {alertMessage}
          </div>
      )}

      <Header deviceId={deviceId} deviceList={deviceList} />

      {/* Pump Status Banner */}
      <div className={`rounded-xl py-4 text-center mb-8 border transition-colors duration-500 shadow-sm ${pumpStatus === 'ON' ? 'bg-green-100 border-green-300 text-green-900' : 'bg-blue-100 border-blue-300 text-blue-900'}`}>
        <h2 className="text-xl font-bold">
          Pump : {pumpStatus} ({liveData?.pumpMode || 'Optimal'})
        </h2>
      </div>

      {/* Real-Time Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatusCard value={getVal('moisture', '%')} label="Soil Moisture" borderColor={getBorderColor('moisture', parseFloat(settings.moistureMin), parseFloat(settings.moistureMax))} />
        <StatusCard value={getVal('temperature', '°C')} label="Temperature" borderColor={getBorderColor('temperature', 0, parseFloat(settings.tempMax))} />
        <StatusCard value={getVal('humidity', '%')} label="Humidity" borderColor={'border-blue-400'} />
        <StatusCard value={getVal('light', ' lux', 0)} label="Light" borderColor={'border-yellow-500'} />
        <StatusCard value={getVal('battery', '%')} label="Battery" borderColor={'border-purple-500'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* New Historical Chart Component */}
        <HistoricalChart 
            chartData={chartData}
            isLoading={isLoadingChart}
            onExportCSV={handleExportCSV}
            isExporting={isExporting}
        />

        {/* Settings Panel */}
        <SettingsPanel 
          settings={settings} 
          setSettings={setSettings} 
          handleSaveSettings={handleSaveSettings} 
          commandInProgress={commandInProgress}
          commandStatus={commandStatus}
          liveData={liveData} 
          togglePump={togglePump} 
          pumpStatus={pumpStatus}
        />
      </div>
    </div>
  );
};

export default Dashboard;