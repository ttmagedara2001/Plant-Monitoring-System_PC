import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { getHistoricalData, updateDeviceState } from '../Service/deviceService'; 
import { useWebSocket } from '../Hook/UseWebSocket'; 
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
  
  const { jwtToken } = useAuth(); 

  // Data Hooks & States
  const { liveData, isConnected, chartData } = useWebSocket(deviceId, jwtToken);
  const [deviceList] = useState(['device0000', 'device0001', 'device0002']); 
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Settings & Control States
  const [settings, setSettings] = useState({ 
    moistureMin: '20', 
    moistureMax: '60', 
    tempMax: '30' 
  });
  const [alertMessage, setAlertMessage] = useState(null);
  const [commandStatus, setCommandStatus] = useState(null); 
  const [commandInProgress, setCommandInProgress] = useState(null);

  useEffect(() => {
    console.log("Dashboard mounted. DeviceId:", deviceId, "JWT available:", !!jwtToken);
  }, [deviceId, jwtToken]);

  // Alert Logic
  useEffect(() => {
    const currentData = liveData || {}; 
    const minM = parseFloat(settings.moistureMin);
    const maxT = parseFloat(settings.tempMax);

    if (currentData.moisture !== undefined && currentData.moisture < minM) {
      setAlertMessage(`CRITICAL: Soil Moisture (${currentData.moisture}%) is below minimum (${minM}%).`);
    } else if (currentData.temperature !== undefined && currentData.temperature > maxT) {
      setAlertMessage(`WARNING: Temperature (${currentData.temperature}°C) exceeds maximum (${maxT}°C).`);
    } else {
      setAlertMessage(null);
    }
  }, [liveData, settings]);
  
  // Data Export Function
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
      await updateDeviceState(deviceId, settings); 
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
      await updateDeviceState(deviceId, { pumpStatus: newStatus }); 
    } catch (error) {
      console.error("Pump control failed:", error);
    } finally {
      setCommandInProgress(null);
    }
  };

  // Helpers
  const getVal = (key, unit, decimals = 1) => {
    return liveData?.[key] ? `${Number(liveData[key]).toFixed(decimals)}${unit}` : '--';
  };
  
  const pumpStatus = liveData?.pumpStatus || 'OFF';
  
  const getBorderColor = (key, min, max) => {
    const val = liveData?.[key];
    
    // Check if value is critical (outside bounds)
    const isCritical = val !== undefined && (val < min || val > max);
    
    if (isCritical) {
      return 'border-red-500'; // Red for all critical situations
    }
    
    // Return original colors when not critical
    switch (key) {
      case 'moisture': return 'border-teal-500';
      case 'temperature': return 'border-green-500';
      case 'humidity': return 'border-blue-400';
      case 'light': return 'border-yellow-500';
      case 'battery': return 'border-purple-500';
      default: return 'border-green-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-4 font-sans text-gray-800">
      
      {/* Connection Status */}
      <div className={`text-center py-2 mb-4 rounded-lg text-sm font-medium ${
        isConnected 
          ? 'bg-green-100 text-green-800 border border-green-300' 
          : 'bg-red-100 text-red-800 border border-red-300'
      }`}>
        WebSocket: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {/* Alert Banner */}
      {alertMessage && (
          <div className="bg-red-500 text-white rounded-lg p-3 mb-6 shadow-xl flex items-center justify-center font-bold text-lg animate-pulse transition-all">
              <AlertTriangle className="w-6 h-6 mr-3" />
              {alertMessage}
          </div>
      )}

      <Header deviceId={deviceId} deviceList={deviceList} />

      {/* Pump Status Banner */}
      <div className={`rounded-xl py-4 text-center mb-8 border transition-colors duration-500 shadow-sm ${
        pumpStatus === 'ON' ? 'bg-green-100 border-green-300 text-green-900' : 'bg-blue-100 border-blue-300 text-blue-900'
      }`}>
        <h2 className="text-xl font-bold">
          Pump : {pumpStatus} ({liveData?.pumpMode || 'Optimal'})
        </h2>
      </div>

      {/* Real-Time Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatusCard 
          value={getVal('moisture', '%')} 
          label="Soil Moisture" 
          borderColor={getBorderColor('moisture', parseFloat(settings.moistureMin), parseFloat(settings.moistureMax))} 
        />
        <StatusCard 
          value={getVal('temperature', '°C')} 
          label="Temperature" 
          borderColor={getBorderColor('temperature', 0, parseFloat(settings.tempMax))} 
        />
        <StatusCard 
          value={getVal('humidity', '%')} 
          label="Humidity" 
          borderColor={getBorderColor('humidity', 0, 100)} 
        />
        <StatusCard 
          value={getVal('light', ' lux', 0)} 
          label="Light" 
          borderColor={getBorderColor('light', 0, 1000)} 
        />
        <StatusCard 
          value={getVal('battery', '%')} 
          label="Battery" 
          borderColor={getBorderColor('battery', 0, 100)} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Historical Chart Component */}
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
