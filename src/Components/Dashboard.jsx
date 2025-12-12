import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { getAllStreamData, updatePumpStatus } from '../Service/deviceService'; 
import { webSocketClient } from '../Service/webSocketClient'; // ✅ Direct WebSocket client
import { AlertTriangle } from 'lucide-react';

// Import Sub-Components
import Header from './Header';
import SettingsPanel from './SettingsPanel';
import StatusCard from './StatusCard';
import HistoricalChart from './HistoricalChartTest';

const Dashboard = () => {
  const { deviceId: paramDeviceId } = useParams();
  //Change this to your actual device ID that belongs to your user account
  const defaultDeviceId = 'device0011233'; //'device9988'
  const deviceId = paramDeviceId || defaultDeviceId;
  
  const { jwtToken } = useAuth(); 

  // WebSocket states: default values
  const [liveData, setLiveData] = useState({
    moisture: 0,
    temperature: 0,
    humidity: 0,
    light: 0,
    battery: 0,
    pumpStatus: "OFF",
    pumpMode: "manual",
  });
  const [isConnected, setIsConnected] = useState(false);
  const [deviceList] = useState(['device9988', 'device0011233', 'device0000', 'device0001', 'device0002']);
  
  // HTTP API for historical data visualization
  const [historicalData, setHistoricalData] = useState([]);
  const [filteredData, setFilteredData] = useState([]); // Data after time range and interval filtering
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dataFetchError, setDataFetchError] = useState(null);
  
  // Time frame selection for historical chart: default to 1 hour
  const [timeRange, setTimeRange] = useState(() => {
    const saved = localStorage.getItem(`timeRange_${deviceId}`);
    return saved || '1h';
  }); 
  const [dataInterval, setDataInterval] = useState(() => {
    const saved = localStorage.getItem(`dataInterval_${deviceId}`);
    return saved || 'auto';
  }); 
  
  // Settings & Control States (Frontend only - no backend API)
  const [settings, setSettings] = useState(() => {
    // Load settings from localStorage or use defaults
    const saved = localStorage.getItem(`settings_${deviceId}`);
    return saved ? JSON.parse(saved) : { 
      moistureMin: '20', 
      moistureMax: '70',
      tempMin: '10',
      tempMax: '35',
      humidityMin: '30',
      humidityMax: '80',
      lightMin: '200',
      lightMax: '1000',
      batteryMin: '20',
      autoMode: false 
    };
  });
  const [alertMessage, setAlertMessage] = useState(null);
  const [commandStatus, setCommandStatus] = useState(null); 
  const [commandInProgress, setCommandInProgress] = useState(null);

  // Helper function to filter and downsample data based on time range and interval
  const filterDataByTimeframe = (data, range, interval) => {
    if (!data || data.length === 0) return [];

    // Calculate time range in ms
    const now = new Date();
    
    // Handle custom ranges (format: custom_<ms>)
    let rangeMs;
    if (range.startsWith('custom_')) {
      rangeMs = parseInt(range.replace('custom_', ''));
    } else {
      rangeMs = {
        '1m': 1 * 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000
      }[range] || 60 * 60 * 1000;
    }

    const cutoffTime = now.getTime() - rangeMs;

    // Filter data by time range
    let filtered = data.filter(record => {
      const recordTime = new Date(record.timestamp).getTime();
      return recordTime >= cutoffTime;
    });

    // Group by interval if not 'auto' - show readings at exact interval points
    if (interval !== 'auto' && filtered.length > 0) {
      let intervalMs;
      
      // Handle custom intervals (format: custom_interval_<ms>)
      if (interval.startsWith('custom_interval_')) {
        intervalMs = parseInt(interval.replace('custom_interval_', ''));
      } else {
        intervalMs = {
          '1s': 1000,
          '5s': 5000,
          '1m': 60000,
          '5m': 5 * 60000,
          '1h': 60 * 60000
        }[interval] || 0;
      }

      if (intervalMs > 0) {
        // Group data into interval buckets and get one reading per interval
        const intervalBuckets = new Map();
        
        filtered.forEach(record => {
          const recordTime = new Date(record.timestamp).getTime();
          // Calculate which interval bucket this record belongs to
          const bucketKey = Math.floor(recordTime / intervalMs) * intervalMs;
          
          // Store the closest record to the bucket start time
          if (!intervalBuckets.has(bucketKey)) {
            intervalBuckets.set(bucketKey, record);
          } else {
            const existing = intervalBuckets.get(bucketKey);
            const existingTime = new Date(existing.timestamp).getTime();
            // Keep the record closest to the interval boundary
            if (Math.abs(recordTime - bucketKey) < Math.abs(existingTime - bucketKey)) {
              intervalBuckets.set(bucketKey, record);
            }
          }
        });

        // Convert back to array and sort by time
        filtered = Array.from(intervalBuckets.values()).sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
    }

    // Update time format based on interval - show seconds for granular intervals
    const shouldShowSeconds = interval === '1s' || interval === '5s' || 
                             (interval.startsWith('custom_interval_') && 
                              parseInt(interval.replace('custom_interval_', '')) < 60000);
    
    // Format time field for display
    filtered = filtered.map(record => ({
      ...record,
      time: new Date(record.timestamp).toLocaleTimeString([], 
        shouldShowSeconds 
          ? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
          : { hour: '2-digit', minute: '2-digit' }
      )
    }));

    return filtered;
  };

  // Fetch historical data from HTTP API when device changes
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!deviceId || !jwtToken) {
        console.warn("⚠️ Cannot fetch historical data: missing deviceId or token");
        return;
      }

      setIsLoadingChart(true);
      setDataFetchError(null);

      try {
        console.log(`📊 [HTTP API] Fetching historical data for device: ${deviceId}`);
        const data = await getAllStreamData(deviceId);
        setHistoricalData(data);
        console.log(`✅ [HTTP API] Historical data loaded: ${data.length} records`);
      } catch (error) {
        console.error("❌ [HTTP API] Failed to fetch historical data:", error);
        
        // Check if it's a device ownership error
        if (error.response?.data?.data === "Device does not belong to the user") {
          setDataFetchError(
            `⚠️ Device "${deviceId}" not found in your account. Please update the device ID in Dashboard.jsx or add this device to your ProtoNest account. Real-time data will still work.`
          );
        } else {
          setDataFetchError("Failed to load historical data. Real-time WebSocket data will still work.");
        }
        setHistoricalData([]);
      } finally {
        setIsLoadingChart(false);
      }
    };

    fetchHistoricalData();
    
    // Refresh historical data every 30s to show newly saved real-time data
    const refreshInterval = setInterval(() => {
      if (deviceId && jwtToken) {
        fetchHistoricalData();
      }
    }, 30000); // 30s

    return () => clearInterval(refreshInterval);
  }, [deviceId, jwtToken, timeRange]);

  // Reset all data when device changes
  useEffect(() => {
    console.log(`[Dashboard] 🔄 Device changed to: ${deviceId} - Resetting all data`);
    
    // Reset live data to defaults
    setLiveData({
      moisture: 0,
      temperature: 0,
      humidity: 0,
      light: 0,
      battery: 0,
      pumpStatus: "OFF",
      pumpMode: "manual",
    });
    
    // Reset historical data
    setHistoricalData([]);
    setFilteredData([]);
    setDataFetchError(null);
    
    // Reset alerts and command status
    setAlertMessage(null);
    setCommandStatus(null);
    setCommandInProgress(null);
    
    // Load device-specific settings from localStorage
    const saved = localStorage.getItem(`settings_${deviceId}`);
    if (saved) {
      setSettings(JSON.parse(saved));
      console.log('📥 Settings loaded from localStorage for device:', deviceId);
    } else {
      // Reset to defaults if no saved settings for this device
      setSettings({ 
        moistureMin: '20', 
        moistureMax: '70',
        tempMin: '10',
        tempMax: '35',
        humidityMin: '30',
        humidityMax: '80',
        lightMin: '200',
        lightMax: '1000',
        batteryMin: '20',
        autoMode: false 
      });
    }
    
    // Load device-specific time range and interval
    const savedTimeRange = localStorage.getItem(`timeRange_${deviceId}`);
    const savedInterval = localStorage.getItem(`dataInterval_${deviceId}`);
    setTimeRange(savedTimeRange || '1h');
    setDataInterval(savedInterval || 'auto');
    
    console.log(`[Dashboard] ✅ Reset complete for device: ${deviceId}`);
  }, [deviceId]);

  // WebSocket Connection Management
  useEffect(() => {
    if (!jwtToken || !deviceId) {
      console.warn("[Dashboard] Missing deviceId or JWT token for WebSocket");
      return;
    }

    // Data handler for WebSocket messages
    const handleData = (data) => {
      console.log(`[Dashboard] 📡 Real-time ${data.sensorType}:`, data.value);

      setLiveData((prev) => {
        const updated = { ...prev };

        // Handle batch state updates (all sensors at once)
        if (data.sensorType === "batchUpdate") {
          console.log(`[Dashboard] 🔄 Processing BATCH state update:`, data.value);
          
          // Update all sensors from the batch
          if (data.value.temp !== undefined) {
            updated.temperature = parseFloat(data.value.temp);
            console.log(`[Dashboard] ✅ Updated temperature: ${updated.temperature}`);
          }
          if (data.value.humidity !== undefined) {
            updated.humidity = parseFloat(data.value.humidity);
            console.log(`[Dashboard] ✅ Updated humidity: ${updated.humidity}`);
          }
          if (data.value.battery !== undefined) {
            updated.battery = parseFloat(data.value.battery);
            console.log(`[Dashboard] ✅ Updated battery: ${updated.battery}`);
          }
          if (data.value.light !== undefined) {
            updated.light = parseFloat(data.value.light);
            console.log(`[Dashboard] ✅ Updated light: ${updated.light}`);
          }
          if (data.value.moisture !== undefined) {
            updated.moisture = parseFloat(data.value.moisture);
            console.log(`[Dashboard] ✅ Updated moisture: ${updated.moisture}`);
          }
          
          console.log(`[Dashboard] 📊 Batch update complete. New state:`, updated);
        } else {
          // Handle individual sensor updates (original logic)
          switch (data.sensorType) {
            case "temp":
              updated.temperature = parseFloat(data.value);
              console.log(`[Dashboard] ✅ Updated temperature: ${updated.temperature}`);
              break;
            case "humidity":
              updated.humidity = parseFloat(data.value);
              console.log(`[Dashboard] ✅ Updated humidity: ${updated.humidity}`);
              break;
            case "battery":
              updated.battery = parseFloat(data.value);
              console.log(`[Dashboard] ✅ Updated battery: ${updated.battery}`);
              break;
            case "light":
              updated.light = parseFloat(data.value);
              console.log(`[Dashboard] ✅ Updated light: ${updated.light}`);
              break;
            case "moisture":
              updated.moisture = parseFloat(data.value);
              console.log(`[Dashboard] ✅ Updated moisture: ${updated.moisture}`);
              break;
            case "pumpStatus":
              updated.pumpStatus = data.value;
              console.log(`[Dashboard] 🚨 Pump status updated to: ${data.value}`);
              break;
            case "pumpMode":
              updated.pumpMode = data.value;
              console.log(`[Dashboard] ⚙️ Pump mode updated to: ${data.value}`);
              break;
            default:
              console.warn(`[Dashboard] ⚠️ Unknown sensor type: ${data.sensorType}`);
          }
        }

        console.log(`[Dashboard] 📊 New liveData state:`, updated);
        return updated;
      });
    };

    // Setup connection callbacks
    webSocketClient.onConnect(() => {
      setIsConnected(true);
      console.log("[Dashboard] ✅ WebSocket Connected");
    });

    webSocketClient.onDisconnect(() => {
      setIsConnected(false);
      console.log("[Dashboard] ❌ WebSocket Disconnected");
    });

    // Connect to WebSocket
    const initWebSocket = async () => {
      try {
        console.log("[Dashboard] 🔄 Initializing WebSocket connection");
        await webSocketClient.connect(jwtToken);
        
        // Subscribe to device topics
        const success = webSocketClient.subscribeToDevice(deviceId, handleData);
        if (success) {
          console.log(`[Dashboard] ✅ Subscribed to ${deviceId} topics`);
        }
      } catch (error) {
        console.error("[Dashboard] ❌ WebSocket connection failed:", error);
        setIsConnected(false);
      }
    };

    initWebSocket();

    // Cleanup on unmount or when deviceId/jwtToken changes
    return () => {
      console.log("[Dashboard] 🧹 Cleaning up WebSocket connection");
      webSocketClient.disconnect();
    };
  }, [deviceId, jwtToken]);

  // Alert Logic - Check all sensors for critical conditions
  useEffect(() => {
    const currentData = liveData || {}; 
    const alerts = [];

    // Moisture alerts
    const minM = parseFloat(settings.moistureMin);
    const maxM = parseFloat(settings.moistureMax);
    if (currentData.moisture !== undefined) {
      if (currentData.moisture < minM) {
        alerts.push(`CRITICAL: Soil Moisture (${currentData.moisture.toFixed(1)}%) is below minimum (${minM}%)`);
      } else if (currentData.moisture > maxM) {
        alerts.push(`WARNING: Soil Moisture (${currentData.moisture.toFixed(1)}%) exceeds maximum (${maxM}%)`);
      }
    }

    // Temperature alerts
    const minT = parseFloat(settings.tempMin);
    const maxT = parseFloat(settings.tempMax);
    if (currentData.temperature !== undefined) {
      if (currentData.temperature < minT) {
        alerts.push(`CRITICAL: Temperature (${currentData.temperature.toFixed(1)}°C) is below minimum (${minT}°C)`);
      } else if (currentData.temperature > maxT) {
        alerts.push(`WARNING: Temperature (${currentData.temperature.toFixed(1)}°C) exceeds maximum (${maxT}°C)`);
      }
    }

    // Humidity alerts
    const minH = parseFloat(settings.humidityMin);
    const maxH = parseFloat(settings.humidityMax);
    if (currentData.humidity !== undefined) {
      if (currentData.humidity < minH) {
        alerts.push(`CRITICAL: Humidity (${currentData.humidity.toFixed(1)}%) is below minimum (${minH}%)`);
      } else if (currentData.humidity > maxH) {
        alerts.push(`WARNING: Humidity (${currentData.humidity.toFixed(1)}%) exceeds maximum (${maxH}%)`);
      }
    }

    // Light alerts
    const minL = parseFloat(settings.lightMin);
    const maxL = parseFloat(settings.lightMax);
    if (currentData.light !== undefined) {
      if (currentData.light < minL) {
        alerts.push(`CRITICAL: Light (${currentData.light.toFixed(0)} lux) is below minimum (${minL} lux)`);
      } else if (currentData.light > maxL) {
        alerts.push(`WARNING: Light (${currentData.light.toFixed(0)} lux) exceeds maximum (${maxL} lux)`);
      }
    }

    // Battery alert
    const minB = parseFloat(settings.batteryMin);
    if (currentData.battery !== undefined && currentData.battery < minB) {
      alerts.push(`CRITICAL: Battery (${currentData.battery.toFixed(1)}%) is below minimum (${minB}%)`);
    }

    // Set the alert message (show first critical alert or null if none)
    setAlertMessage(alerts.length > 0 ? alerts[0] : null);
  }, [liveData, settings]);

  // Automation Logic - Auto Pump Control based on Moisture Levels
  useEffect(() => {
    // Only run automation if auto mode is enabled in SAVED settings
    if (!settings.autoMode) {
      console.log(`[Automation] ⚙️ Auto mode is DISABLED - Manual control only`);
      return;
    }

    const currentMoisture = liveData?.moisture;
    if (currentMoisture === undefined) {
      console.log(`[Automation] ⏳ Waiting for moisture data...`);
      return;
    }

    const minMoisture = parseFloat(settings.moistureMin);
    const maxMoisture = parseFloat(settings.moistureMax);
    const currentPumpStatus = liveData?.pumpStatus || "OFF";

    console.log(`[Automation] 🤖 AUTO MODE ACTIVE - Checking conditions:`, {
      autoMode: settings.autoMode,
      moisture: currentMoisture,
      min: minMoisture,
      max: maxMoisture,
      pumpStatus: currentPumpStatus
    });

    // 1: Turn pump ON if moisture is too LOW (CRITICAL) and pump is currently OFF
    if (currentMoisture < minMoisture && currentPumpStatus === "OFF") {
      console.log(`[Automation] 🚨 CRITICAL SITUATION DETECTED!`);
      console.log(`[Automation] 💧 Moisture ${currentMoisture}% < ${minMoisture}% - AUTO MODE turning pump ON`);
      console.log(`[Automation] 📡 Sending MQTT command via HTTP API...`);
      
      // Send HTTP API request to backend, which will forward to MQTT device
      updatePumpStatus(deviceId, "ON", "pump", "auto")
        .then(() => {
          console.log(`[Automation] ✅ HTTP API request successful - Backend forwarding MQTT command to IoT device`);
          setAlertMessage(`AUTO MODE: Pump activated automatically - Moisture CRITICAL (${currentMoisture.toFixed(1)}%)`);
        })
        .catch((error) => {
          console.error(`[Automation] ❌ HTTP API request failed:`, error);
          setAlertMessage(`ERROR: Auto mode failed to activate pump - ${error.message}`);
        });
    }

    // 2: Turn pump OFF if moisture returns to NORMAL range (>= min) and pump is currently ON
    if (currentMoisture >= minMoisture && currentPumpStatus === "ON") {
      console.log(`[Automation] ✅ NORMAL: Moisture ${currentMoisture}% >= ${minMoisture}% - AUTO MODE turning pump OFF`);
      console.log(`[Automation] 📡 Sending MQTT command via HTTP API...`);
      
      // Send HTTP API request to backend, which will forward to MQTT device
      updatePumpStatus(deviceId, "OFF", "pump", "auto")
        .then(() => {
          console.log(`[Automation] ✅ HTTP API request successful - Backend forwarding MQTT command to IoT device`);
          setAlertMessage(`AUTO MODE: Pump deactivated - Moisture restored to normal (${currentMoisture.toFixed(1)}%)`);
        })
        .catch((error) => {
          console.error(`[Automation] ❌ HTTP API request failed:`, error);
          setAlertMessage(`ERROR: Auto mode failed to deactivate pump - ${error.message}`);
        });
    }
  }, [liveData?.moisture, liveData?.pumpStatus, settings.moistureMin, settings.moistureMax, settings.autoMode, deviceId]);
  
  // Data Export Function - Export from HTTP API historical data only
  const handleExportCSV = async (selectedSensors = null) => {
    setIsExporting(true);
    try {
      // Use filtered data if available, otherwise fall back to all historical data
      const dataToExport = filteredData.length > 0 ? filteredData : historicalData;
      
      if (dataToExport.length === 0) {
        alert("No data available to export. Please wait for data to accumulate.");
        return;
      }
      
      // If selectedSensors is provided, filter columns; otherwise export all
      const allSensors = ["moisture", "temperature", "humidity", "light", "battery"];
      const sensorsToExport = selectedSensors && selectedSensors.length > 0 
        ? selectedSensors.filter(s => allSensors.includes(s))
        : allSensors;
      
      // Build headers dynamically based on selected sensors
      const headers = ["time", ...sensorsToExport].join(',');
      
      // Build rows with only selected sensor data
      const rows = dataToExport.map(d => {
        const rowData = [d.time];
        sensorsToExport.forEach(sensor => {
          rowData.push(d[sensor] ?? '');
        });
        return rowData.join(',');
      }).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const exportType = selectedSensors ? 'selected' : 'all';
      const timeRangeLabel = timeRange.replace('custom_', 'custom-');
      const intervalLabel = dataInterval === 'auto' ? 'auto' : dataInterval.replace('custom_interval_', 'interval-');
      link.download = `agricop_${deviceId}_${exportType}_${timeRangeLabel}_${intervalLabel}_report.csv`;
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
  const handleSaveSettings = () => {
    setCommandInProgress('settings');
    setCommandStatus(null);
    try {
      // Save settings to localStorage (frontend only - no backend API available)
      localStorage.setItem(`settings_${deviceId}`, JSON.stringify(settings));
      console.log('💾 Settings saved to localStorage:', settings);
      
      // Log auto mode status
      if (settings.autoMode) {
        console.log('🤖 AUTO MODE ENABLED - System will automatically control pump based on moisture levels');
        console.log(`📊 Moisture thresholds: Min=${settings.moistureMin}%, Max=${settings.moistureMax}%`);
        console.log('💧 Pump will turn ON when moisture < minimum threshold');
        console.log('✅ Pump will turn OFF when moisture >= minimum threshold');
      } else {
        console.log('👤 MANUAL MODE - User has full control of pump');
      }
      
      setCommandStatus({ 
        type: 'success', 
        message: settings.autoMode 
          ? 'Settings saved! Auto mode is now ACTIVE.' 
          : 'Settings saved! Manual control mode is active.'
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setCommandStatus({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setCommandInProgress(null);
      setTimeout(() => setCommandStatus(null), 5000);
    }
  };
  
  // Handle time range change
  const handleTimeRangeChange = (newRange) => {
    console.log(`📊 Changing time range to: ${newRange}`);
    setTimeRange(newRange);
    localStorage.setItem(`timeRange_${deviceId}`, newRange);
    
    // Auto-adjust interval based on time range for optimal display
    let newInterval = 'auto';
    if (newRange === '1m') {
      newInterval = '1s';
    } else if (newRange === '5m') {
      newInterval = '1s';
    } else if (newRange === '15m') {
      newInterval = '5s';
    } else if (newRange === '1h') {
      newInterval = 'auto';
    } else if (newRange === '6h') {
      newInterval = '1m';
    } else if (newRange === '24h') {
      newInterval = '5m';
    }
    setDataInterval(newInterval);
    localStorage.setItem(`dataInterval_${deviceId}`, newInterval);
  };

  const handleDataIntervalChange = (newInterval) => {
    console.log(`📊 Changing data interval to: ${newInterval}`);
    setDataInterval(newInterval);
    localStorage.setItem(`dataInterval_${deviceId}`, newInterval);
  };

  const togglePump = async () => {
    setCommandInProgress('pump');
    const currentStatus = liveData?.pumpStatus === 'ON';
    const newStatus = currentStatus ? 'OFF' : 'ON';
    
    console.log(`🔄 [HTTP API] Toggling pump from ${liveData?.pumpStatus} to ${newStatus}`);
    
    try {
      // Use HTTP API to send pump command (backend forwards to MQTT)
      await updatePumpStatus(deviceId, newStatus, 'pump', 'manual');
      
      console.log(`✅ [HTTP API] Pump command sent: ${newStatus}`);
      console.log(`📡 Waiting for backend to publish to MQTT and device confirmation...`);
      setCommandStatus({ type: 'success', message: `Pump command sent: ${newStatus}` });
      
      // Device will respond with actual pump status via WebSocket
      // The status will update automatically when we receive the confirmation
    } catch (error) {
      console.error("❌ [HTTP API] Pump control failed:", error);
      setCommandStatus({ type: 'error', message: 'Failed to send pump command. Check API connection.' });
    } finally {
      setCommandInProgress(null);
      setTimeout(() => setCommandStatus(null), 3000);
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
      return 'border-red-500 bg-red-50'; // Red border and light red background for critical
    }
    
    // Return original colors when not critical
    switch (key) {
      case 'moisture': return 'border-cyan-500';
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
        <div className={`text-center py-2 rounded-lg text-sm font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-gray-100 text-gray-600 border border-gray-300'
        }`}>
          WebSocket (Real-Time): {isConnected ? '🟢 Connected' : '⚪ Disconnected'}
        </div>
        
        <div className={`text-center py-2 rounded-lg text-sm font-medium ${
          isConnected 
            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
            : 'bg-gray-100 text-gray-600 border border-gray-300'
        }`}>
          MQTT Stream: {isConnected ? '🟢 Receiving Data' : '⚪ Waiting for Data'}
        </div>
      </div>

      {/* Overall Connection Status */}
      <div className={`text-center py-2 mb-4 rounded-lg text-sm font-medium ${
        isConnected
          ? 'bg-green-100 text-green-800 border border-green-300' 
          : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
      }`}>
        System Status: {isConnected 
          ? `🟢 Online • Real-Time: ${isConnected ? 'Active' : 'Standby'} • Historical: HTTP API` 
          : '🟡 Limited - Real-time data only'}
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
          borderColor={getBorderColor('temperature', parseFloat(settings.tempMin), parseFloat(settings.tempMax))} 
        />
        <StatusCard 
          value={getVal('humidity', '%')} 
          label="Humidity" 
          borderColor={getBorderColor('humidity', parseFloat(settings.humidityMin), parseFloat(settings.humidityMax))} 
        />
        <StatusCard 
          value={getVal('light', ' lux', 0)} 
          label="Light" 
          borderColor={getBorderColor('light', parseFloat(settings.lightMin), parseFloat(settings.lightMax))} 
        />
        <StatusCard 
          value={getVal('battery', '%')} 
          label="Battery" 
          borderColor={getBorderColor('battery', parseFloat(settings.batteryMin), 100)} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Historical Chart Component - HTTP API Data Only */}
        <HistoricalChart 
            chartData={historicalData}
            isLoading={isLoadingChart}
            onExportCSV={handleExportCSV}
            isExporting={isExporting}
            dataSource="HTTP API"
            error={dataFetchError}
            timeRange={timeRange}
            dataInterval={dataInterval}
            onTimeRangeChange={handleTimeRangeChange}
            onDataIntervalChange={handleDataIntervalChange}
            allData={historicalData}
            onFilteredDataChange={setFilteredData}
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

// Comments - done 