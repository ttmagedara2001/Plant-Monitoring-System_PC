import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { getAllStreamData, updatePumpStatus } from '../Service/deviceService'; 
//import { AlertTriangle } from 'lucide-react';

// Import Sub-Components
import Header from './Header';
import StatusCard from './StatusCard';
import SensorStatusIndicator from './SensorStatusIndicator';
import { AlertTriangle } from 'lucide-react';
import HistoricalChart from './HistoricalChartTest';
import PageHeader from './PageHeader';
import SeasonalEffects from './SeasonalEffects';



const Dashboard = ({ deviceId: propDeviceId, liveData: propLiveData, settings: propSettings, isConnected: propIsConnected, alertMessage: propAlertMessage }) => {
  //Change this to your actual device ID that belongs to your user account
  const defaultDeviceId = 'device0011233'; //'device9988'
  const deviceId = propDeviceId || defaultDeviceId;
  
  const { jwtToken } = useAuth(); 

  // liveData, settings, and connection are provided by App via props
  const liveData = propLiveData || { moisture: 0, temperature: 0, humidity: 0, light: 0, battery: 0, pumpStatus: 'OFF', pumpMode: 'manual' };
  const isConnected = typeof propIsConnected !== 'undefined' ? propIsConnected : false;
  const settings = propSettings || { moistureMin: '20', moistureMax: '70', tempMin: '10', tempMax: '35', humidityMin: '30', humidityMax: '80', lightMin: '200', lightMax: '1000', batteryMin: '20', autoMode: false };
  const [deviceList] = useState(['device9988', 'device0011233', 'device0000', 'device0001', 'device0002','deviceTestUC']);
  
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
  // header clock handled by PageHeader component
  
  // alert states (computed here in Dashboard for every real-time update)
  const alertMessage = propAlertMessage || null;
  const [alertStates, setAlertStates] = useState({});

  // Compute per-sensor alert levels/messages on every liveData or settings change
  useEffect(() => {
    try {
      const compute = (key) => {
        const raw = propLiveData?.[key];
        if (raw === undefined || raw === null || settings == null) return { level: 'normal', message: null };
        const val = Number(raw);
        if (!isFinite(val)) return { level: 'normal', message: null };

        if (key === 'moisture') {
          const min = parseFloat(settings.moistureMin);
          const max = parseFloat(settings.moistureMax);
          if (!isNaN(min) && val < min) return { level: 'critical', message: `CRITICAL: ${val.toFixed(1)}% < ${min}%` };
          if (!isNaN(max) && val > max) return { level: 'warning', message: `WARNING: ${val.toFixed(1)}% > ${max}%` };
        }
        if (key === 'temperature') {
          const min = parseFloat(settings.tempMin);
          const max = parseFloat(settings.tempMax);
          if (!isNaN(min) && val < min) return { level: 'critical', message: `CRITICAL: ${val.toFixed(1)}°C < ${min}°C` };
          if (!isNaN(max) && val > max) return { level: 'warning', message: `WARNING: ${val.toFixed(1)}°C > ${max}°C` };
        }
        if (key === 'humidity') {
          const min = parseFloat(settings.humidityMin);
          const max = parseFloat(settings.humidityMax);
          if (!isNaN(min) && val < min) return { level: 'critical', message: `CRITICAL: ${val.toFixed(1)}% < ${min}%` };
          if (!isNaN(max) && val > max) return { level: 'warning', message: `WARNING: ${val.toFixed(1)}% > ${max}%` };
        }
        if (key === 'light') {
          const min = parseFloat(settings.lightMin);
          const max = parseFloat(settings.lightMax);
          if (!isNaN(min) && val < min) return { level: 'critical', message: `CRITICAL: ${Math.round(val)} lux < ${min} lux` };
          if (!isNaN(max) && val > max) return { level: 'warning', message: `WARNING: ${Math.round(val)} lux > ${max} lux` };
        }
        if (key === 'battery') {
          const min = parseFloat(settings.batteryMin);
          if (!isNaN(min) && val < min) return { level: 'critical', message: `Warning: below ${min}%` };
        }
        return { level: 'normal', message: null };
      };

      const states = {
        moisture: compute('moisture'),
        temperature: compute('temperature'),
        humidity: compute('humidity'),
        light: compute('light'),
        battery: compute('battery'),
      };
      // Debug: show computed states
      console.debug('[Dashboard] computed alertStates ->', { rawLive: propLiveData, settings, states });
      setAlertStates(states);
    } catch (e) {
      console.warn('[Dashboard] alertStates compute failed', e);
    }
  }, [propLiveData, settings]);
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

  // Reset view-specific data when device changes (keep liveData/settings handled by App)
  useEffect(() => {
    console.log(`[Dashboard] 🔄 Device changed to: ${deviceId} - Resetting view state`);
    setHistoricalData([]);
    setFilteredData([]);
    setDataFetchError(null);
    setCommandStatus(null);
    setCommandInProgress(null);

    // Load device-specific time range and interval (view-only)
    const savedTimeRange = localStorage.getItem(`timeRange_${deviceId}`);
    const savedInterval = localStorage.getItem(`dataInterval_${deviceId}`);
    setTimeRange(savedTimeRange || '1h');
    setDataInterval(savedInterval || 'auto');

    console.log(`[Dashboard] ✅ View reset complete for device: ${deviceId}`);
  }, [deviceId]);

  // (Settings and liveData persistence handled by App)

  // WebSocket and liveData are handled at the App level now.
  // Dashboard is a display-only component and receives `propLiveData`, `propIsConnected`, and `propSettings` from App.

  // Alerts and automation are handled at the App level now.
  // Dashboard is a display-only component that receives `propAlertMessage` and `propLiveData` from App.
  
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
    const raw = liveData?.[key];
    if (raw === null || raw === undefined || raw === '') return '--';
    const num = Number(raw);
    if (!isFinite(num)) return '--';
    return `${num.toFixed(decimals)}${unit}`;
  };
  
  const pumpStatus = liveData?.pumpStatus || 'OFF';
  
  const getBorderColor = (key, min, max) => {
    const raw = liveData?.[key];
    // Debug: show incoming value and provided bounds
    console.debug(`[Dashboard][getBorderColor] key=${key} raw=${raw} min=${min} max=${max}`);
    if (raw === undefined || raw === null || raw === '') {
      return (function(){
        switch (key) {
          case 'moisture': return 'border-cyan-500';
          case 'temperature': return 'border-green-500';
          case 'humidity': return 'border-blue-400';
          case 'light': return 'border-yellow-500';
          case 'battery': return 'border-purple-500';
          default: return 'border-green-500';
        }
      })();
    }

    const val = Number(raw);
    if (!isFinite(val)) {
      // Non-numeric values: keep default styling
      switch (key) {
        case 'moisture': return 'border-cyan-500';
        case 'temperature': return 'border-green-500';
        case 'humidity': return 'border-blue-400';
        case 'light': return 'border-yellow-500';
        case 'battery': return 'border-purple-500';
        default: return 'border-green-500';
      }
    }

    // Debug: log value and bounds
    console.debug(`[Dashboard][getBorderColor] ${key} value=${val} min=${min} max=${max}`);

    // Check if value is critical (outside bounds)
    const isCritical = (!isNaN(min) && val < min) || (!isNaN(max) && val > max);
    
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

  // Compute per-sensor alert message based on thresholds from `settings`
  const getSensorAlert = (key) => {
    const raw = liveData?.[key];
    if (raw === undefined || raw === null || settings == null) return null;
    const val = Number(raw);
    if (!isFinite(val)) return null;

    try {
      console.debug(`[Dashboard][getSensorAlert] checking ${key} val=${val} settings=`, settings);
      switch (key) {
        case 'moisture': {
          const min = parseFloat(settings.moistureMin);
          const max = parseFloat(settings.moistureMax);
          console.debug(`[Dashboard][getSensorAlert][moisture] val=${val} min=${min} max=${max}`);
          if (!isNaN(min) && val < min) return `CRITICAL: ${val.toFixed(1)}% < ${min}%`;
          if (!isNaN(max) && val > max) return `WARNING: ${val.toFixed(1)}% > ${max}%`;
          return null;
        }
        case 'temperature': {
          const min = parseFloat(settings.tempMin);
          const max = parseFloat(settings.tempMax);
          console.debug(`[Dashboard][getSensorAlert][temperature] val=${val} min=${min} max=${max}`);
          if (!isNaN(min) && val < min) return `CRITICAL: ${val.toFixed(1)}°C < ${min}°C`;
          if (!isNaN(max) && val > max) return `WARNING: ${val.toFixed(1)}°C > ${max}°C`;
          return null;
        }
        case 'humidity': {
          const min = parseFloat(settings.humidityMin);
          const max = parseFloat(settings.humidityMax);
          console.debug(`[Dashboard][getSensorAlert][humidity] val=${val} min=${min} max=${max}`);
          if (!isNaN(min) && val < min) return `CRITICAL: ${val.toFixed(1)}% < ${min}%`;
          if (!isNaN(max) && val > max) return `WARNING: ${val.toFixed(1)}% > ${max}%`;
          return null;
        }
        case 'light': {
          const min = parseFloat(settings.lightMin);
          const max = parseFloat(settings.lightMax);
          console.debug(`[Dashboard][getSensorAlert][light] val=${val} min=${min} max=${max}`);
          if (!isNaN(min) && val < min) return `CRITICAL: ${Math.round(val)} lux < ${min} lux`;
          if (!isNaN(max) && val > max) return `WARNING: ${Math.round(val)} lux > ${max} lux`;
          return null;
        }
        case 'battery': {
          const min = parseFloat(settings.batteryMin);
          console.debug(`[Dashboard][getSensorAlert][battery] val=${val} min=${min}`);
          if (!isNaN(min) && val < min) return `Warning: below ${min}%`;
          return null;
        }
        default:
          return null;
      }
    } catch (e) {
      console.error('[Dashboard] getSensorAlert error', e);
      return null;
    }
  };

  // Map sensor key to status string used by SensorStatusIndicator
  // Returns 'warning' when equal to min or max, 'critical' when outside bounds, and 'normal' otherwise.
  const getSensorStatus = (key) => {
    try {
      const raw = liveData?.[key];
      // Treat missing data as critical for visibility
      if (raw === undefined || raw === null || settings == null) return 'critical';
      const val = Number(raw);
      if (!isFinite(val)) return 'critical';

      // derive min/max from settings depending on key, with safe defaults
      let min = NaN;
      let max = NaN;
      const FALLBACK = {
        moistureMin: 20,
        moistureMax: 70,
        tempMin: 10,
        tempMax: 35,
        humidityMin: 30,
        humidityMax: 80,
        lightMin: 200,
        lightMax: 1000,
        batteryMin: 20,
      };
      switch (key) {
        case 'moisture':
          min = parseFloat(settings.moistureMin);
          max = parseFloat(settings.moistureMax);
          if (isNaN(min)) min = FALLBACK.moistureMin;
          if (isNaN(max)) max = FALLBACK.moistureMax;
          break;
        case 'temperature':
          min = parseFloat(settings.tempMin);
          max = parseFloat(settings.tempMax);
          if (isNaN(min)) min = FALLBACK.tempMin;
          if (isNaN(max)) max = FALLBACK.tempMax;
          break;
        case 'humidity':
          min = parseFloat(settings.humidityMin);
          max = parseFloat(settings.humidityMax);
          if (isNaN(min)) min = FALLBACK.humidityMin;
          if (isNaN(max)) max = FALLBACK.humidityMax;
          break;
        case 'light':
          min = parseFloat(settings.lightMin);
          max = parseFloat(settings.lightMax);
          if (isNaN(min)) min = FALLBACK.lightMin;
          if (isNaN(max)) max = FALLBACK.lightMax;
          break;
        case 'battery':
          min = parseFloat(settings.batteryMin);
          if (isNaN(min)) min = FALLBACK.batteryMin;
          max = 100;
          break;
        default:
          break;
      }

      // Warning when exactly equal to a bound
      if (!isNaN(min) && val === min) return 'warning';
      if (!isNaN(max) && val === max) return 'warning';

      // Critical when outside bounds
      if (!isNaN(min) && val < min) return 'critical';
      if (!isNaN(max) && val > max) return 'critical';

      // Otherwise neutral
      return 'normal';
    } catch (e) {
      console.warn('[Dashboard] getSensorStatus failed', e);
      return 'critical';
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] p-2 sm:p-4 font-sans text-gray-800 overflow-x-hidden">
      {/* Seasonal effects (snow/wishes) - only active in December */}
      <SeasonalEffects />
      <div className="max-w-7xl mx-auto">
      {/* Page heading */}
      <PageHeader
        title="Dashboard"
        subtitle="Real-time sensor readings, charts, and controls."
        deviceId={deviceId}
      />
      </div>


        {/* Connection Status Panel (navigation and dark mode only) */}

        {/* Real-Time Cards + Pump Banner (centered, compact within main container) */}
      <div className="w-full mx-auto px-1 sm:px-0 mb-4 sm:mb-6">
        <div className="max-w-7xl mx-auto">
        {/* All 5 sensor cards on one line - responsive sizing */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 mb-3 sm:mb-4">
          <SensorStatusIndicator
            label="Soil Moisture"
            value={liveData?.moisture}
            unit="%"
            decimals={1}
            status={getSensorStatus('moisture')}
          />

          <SensorStatusIndicator
            label="Temperature"
            value={liveData?.temperature}
            unit="°C"
            decimals={1}
            status={getSensorStatus('temperature')}
          />

          <SensorStatusIndicator
            label="Humidity"
            value={liveData?.humidity}
            unit="%"
            decimals={1}
            status={getSensorStatus('humidity')}
          />

          <SensorStatusIndicator
            label="Light"
            value={liveData?.light}
            unit=" lux"
            decimals={0}
            status={getSensorStatus('light')}
          />

          <SensorStatusIndicator
            label="Battery"
            value={liveData?.battery}
            unit="%"
            decimals={0}
            status={getSensorStatus('battery')}
          />
        </div>
        </div>

        {/* Pump Status Banner (aligned with cards) */}
        <div className={`w-full max-w-7xl mx-auto rounded-lg sm:rounded-xl py-2 sm:py-3 text-center border transition-colors duration-500 shadow-sm ${
          pumpStatus === 'ON' ? 'bg-green-100 border-green-300 text-green-900' : 'bg-blue-100 border-blue-300 text-blue-900'
        }`}>
          <h2 className="text-base sm:text-lg font-semibold">
            Pump: {pumpStatus} <span className="text-sm font-normal">({liveData?.pumpMode || 'Optimal'})</span>
          </h2>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center px-1 sm:px-0">
        {/* Historical Chart Component - HTTP API Data Only */}
        <div className="w-full mt-2 sm:mt-4">
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// Comments - done 