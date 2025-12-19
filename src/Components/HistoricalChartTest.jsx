// Use this to display historical data charts with toggles for different metrics
import React, { useState, useMemo } from 'react';
import { Download, Loader2, Eye, EyeOff, Database, Wifi, AlertCircle, Clock } from 'lucide-react';
import SensorToggleToolbar from './SensorToggleToolbar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const HistoricalChart = ({ 
  chartData, 
  isLoading, 
  onExportCSV, 
  isExporting, 
  dataSource = 'None', 
  error = null,
  timeRange = '1h',
  dataInterval = 'auto',
  onTimeRangeChange,
  onDataIntervalChange,
  allData = [],
  onFilteredDataChange
}) => {
  // Local state to manage which lines are visible for all sensors/ if not needed for the default add 'false'
  const [visibleSeries, setVisibleSeries] = useState({
    moisture: true,
    temperature: true,
    humidity: true,
    light: true,
    battery: true
  });

  // Custom range configuration
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customUnit, setCustomUnit] = useState('minutes');
  const [customIntervalValue, setCustomIntervalValue] = useState('');
  const [customIntervalUnit, setCustomIntervalUnit] = useState('seconds');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportTimeRange, setExportTimeRange] = useState(timeRange);
  const [exportDataInterval, setExportDataInterval] = useState(dataInterval);
  const [exportSensorSelection, setExportSensorSelection] = useState('all'); // 'all' or 'selected': which sensors to export

  // Handle custom range application
  const applyCustomRange = () => {
    if (!customValue || parseFloat(customValue) <= 0) {
      alert('Please enter a valid time range value');
      return;
    }

    // Convert to ms
    const multipliers = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000
    };

    const rangeMs = parseFloat(customValue) * multipliers[customUnit];
    const customRangeKey = `custom_${rangeMs}`;

    // Update time range labels
    timeRangeLabels[customRangeKey] = `${customValue} ${customUnit.charAt(0).toUpperCase() + customUnit.slice(1)}`;

    // Apply custom interval if specified
    if (customIntervalValue && parseFloat(customIntervalValue) > 0) {
      const intervalMs = parseFloat(customIntervalValue) * multipliers[customIntervalUnit];
      const customIntervalKey = `custom_interval_${intervalMs}`;
      intervalLabels[customIntervalKey] = `${customIntervalValue} ${customIntervalUnit.charAt(0).toUpperCase() + customIntervalUnit.slice(1)}`;
      onDataIntervalChange && onDataIntervalChange(customIntervalKey);
    }

    onTimeRangeChange && onTimeRangeChange(customRangeKey);
    setShowCustomDialog(false);
  };

  // Time range labels
  const timeRangeLabels = {
    '1m': 'Last 1 Minute',
    '5m': 'Last 5 Minutes',
    '15m': 'Last 15 Minutes',
    '1h': 'Last 1 Hour',
    '6h': 'Last 6 Hours',
    '24h': 'Last 24 Hours'
  };

  // Data interval labels
  const intervalLabels = {
    'auto': 'Auto',
    '1s': '1 Second',
    '5s': '5 Seconds',
    '1m': '1 Minute',
    '5m': '5 Minutes',
    '1h': '1 Hour'
  };

  // Determine which intervals are valid for the current time range
  const getValidIntervals = (range) => {
    // For custom ranges, calculate dynamically
    if (range.startsWith('custom_')) {
      const rangeMs = parseInt(range.replace('custom_', ''));
      const validIntervals = ['auto'];
      
      // Only show intervals that are smaller than the time range
      if (rangeMs >= 1000) validIntervals.push('1s');
      if (rangeMs >= 5000) validIntervals.push('5s');
      if (rangeMs >= 60000) validIntervals.push('1m');
      if (rangeMs >= 300000) validIntervals.push('5m');
      if (rangeMs >= 3600000) validIntervals.push('1h');
      
      return validIntervals;
    }
    
    // For preset ranges : to make sense with the time range chosen
    const validIntervals = {
      '1m': ['auto', '1s'],                    
      '5m': ['auto', '1s', '5s'],              
      '15m': ['auto', '1s', '5s', '1m'],       
      '1h': ['auto', '1s', '5s', '1m', '5m'],  
      '6h': ['auto', '5s', '1m', '5m'],        
      '24h': ['auto', '1m', '5m', '1h']        
    };
    return validIntervals[range] || ['auto'];
  };

  const validIntervals = getValidIntervals(timeRange);

  // Filter data based on time range and interval
  const displayData = useMemo(() => {
    if (!allData || allData.length === 0) return chartData;

    const now = new Date();
    
    // Handle custom ranges (format: custom_<ms>)
    let rangeMs;
    if (timeRange.startsWith('custom_')) {
      rangeMs = parseInt(timeRange.replace('custom_', ''));
    } else {
      rangeMs = {
        '1m': 1 * 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000
      }[timeRange] || 60 * 60 * 1000;
    }

    const cutoffTime = now.getTime() - rangeMs;

    // Filter by time range
    let filtered = allData.filter(record => {
      const recordTime = new Date(record.timestamp).getTime();
      return recordTime >= cutoffTime;
    });

    // Apply interval grouping if not auto - show readings at exact interval points
    if (dataInterval !== 'auto' && filtered.length > 0) {
      let intervalMs;
      
      // Handle custom intervals (format: custom_interval_<ms>)
      if (dataInterval.startsWith('custom_interval_')) {
        intervalMs = parseInt(dataInterval.replace('custom_interval_', ''));
      } else {
        intervalMs = {
          '1s': 1000,
          '5s': 5000,
          '1m': 60000,
          '5m': 5 * 60000,
          '1h': 60 * 60000
        }[dataInterval] || 0;
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
    const shouldShowSeconds = dataInterval === '1s' || dataInterval === '5s' || 
                             (dataInterval.startsWith('custom_interval_') && 
                              parseInt(dataInterval.replace('custom_interval_', '')) < 60000);
    
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
  }, [allData, chartData, timeRange, dataInterval]);

  const toggleSeries = (key) => {
    setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Check if all sensors are selected
  const allSensorsSelected = Object.values(visibleSeries).every(val => val === true);

  // Notify parent component when filtered data changes
  React.useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(displayData);
    }
  }, [displayData, onFilteredDataChange]);

  // Handle export with selected sensors only
  const handleExportSelected = () => {
    const selectedSensors = Object.keys(visibleSeries).filter(key => visibleSeries[key]);
    // Temporarily apply export settings
    onTimeRangeChange && onTimeRangeChange(exportTimeRange);
    onDataIntervalChange && onDataIntervalChange(exportDataInterval);
    
    // Export after a short delay to allow data filtering
    setTimeout(() => {
      onExportCSV && onExportCSV(selectedSensors);
      setShowExportMenu(false);
    }, 100);
  };

  // Handle export all sensors
  const handleExportAll = () => {
    // Temporarily apply export settings
    onTimeRangeChange && onTimeRangeChange(exportTimeRange);
    onDataIntervalChange && onDataIntervalChange(exportDataInterval);
    
    // Export after a short delay to allow data filtering
    setTimeout(() => {
      onExportCSV && onExportCSV();
      setShowExportMenu(false);
    }, 100);
  };

  // Handle quick export with current settings
  const handleQuickExport = (sensorType) => {
    const sensors = sensorType === 'selected' 
      ? Object.keys(visibleSeries).filter(key => visibleSeries[key])
      : null;
    onExportCSV && onExportCSV(sensors);
    setShowExportMenu(false);
  };

  // Reset export settings to current view settings
  React.useEffect(() => {
    if (showExportMenu) {
      setExportTimeRange(timeRange);
      setExportDataInterval(dataInterval);
    }
  }, [showExportMenu, timeRange, dataInterval]);

  // Helper to generate button classes based on active state
  const getButtonClass = (isActive, colorClass) => 
    `px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all border ${
      isActive 
        ? `${colorClass} text-white border-transparent shadow-sm` 
        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
    }`;

  return (
   <div className="w-full bg-white rounded-2xl p-4 shadow-sm flex flex-col border border-gray-200 px-6 py-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-gray-800">Historical Trends of the Sensors</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeRangeLabels[timeRange] || timeRange.replace('custom_', '').replace(/\d+/, (ms) => {
              const val = parseInt(ms);
              if (val >= 86400000) return `${(val / 86400000).toFixed(1)} Days`;
              if (val >= 3600000) return `${(val / 3600000).toFixed(1)} Hours`;
              if (val >= 60000) return `${(val / 60000).toFixed(1)} Minutes`;
              return `${(val / 1000).toFixed(1)} Seconds`;
            })}
          </span>
          {(dataInterval !== 'auto') && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200">
              {intervalLabels[dataInterval] || dataInterval.replace('custom_interval_', '').replace(/\d+/, (ms) => {
                const val = parseInt(ms);
                if (val >= 3600000) return `${(val / 3600000).toFixed(1)} Hour Interval`;
                if (val >= 60000) return `${(val / 60000).toFixed(1)} Min Interval`;
                return `${(val / 1000).toFixed(1)}s Interval`;
              })}
            </span>
          )}
          {displayData.length > 0 && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full border border-purple-200">
              {displayData.length} points
            </span>
          )}
          {dataSource !== 'None' && (
            <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
              dataSource === 'API' 
                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}>
              {dataSource === 'API' ? <Database className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              {dataSource}
            </span>
          )}
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting || chartData.length === 0}
            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
            <span>Export CSV</span>
          </button>
          
          {showExportMenu && !isExporting && chartData.length > 0 && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              <div className="p-4">
                <h4 className="text-sm font-bold text-gray-800 mb-3">Export Options</h4>
                
                {/* Sensor Selection */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sensors</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setExportSensorSelection('all')}
                      className={`flex-1 px-3 py-1.5 text-xs rounded transition-all ${
                        exportSensorSelection === 'all'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All Sensors
                    </button>
                    {!allSensorsSelected && (
                      <button
                        onClick={() => setExportSensorSelection('selected')}
                        className={`flex-1 px-3 py-1.5 text-xs rounded transition-all ${
                          exportSensorSelection === 'selected'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Selected ({Object.values(visibleSeries).filter(v => v).length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Time Range Selection */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Time Range</label>
                  <select
                    value={exportTimeRange}
                    onChange={(e) => setExportTimeRange(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1m">Last 1 Minute</option>
                    <option value="5m">Last 5 Minutes</option>
                    <option value="15m">Last 15 Minutes</option>
                    <option value="1h">Last 1 Hour</option>
                    <option value="6h">Last 6 Hours</option>
                    <option value="24h">Last 24 Hours</option>
                  </select>
                </div>

                {/* Data Interval Selection */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data Interval</label>
                  <select
                    value={exportDataInterval}
                    onChange={(e) => setExportDataInterval(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto">Auto</option>
                    <option value="1s">1 Second</option>
                    <option value="5s">5 Seconds</option>
                    <option value="1m">1 Minute</option>
                    <option value="5m">5 Minutes</option>
                    <option value="1h">1 Hour</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => setShowExportMenu(false)}
                    className="flex-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={exportSensorSelection === 'all' ? handleExportAll : handleExportSelected}
                    className="flex-1 px-3 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-all font-medium flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </button>
                </div>

                {/* Quick Export with Current View */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleQuickExport(exportSensorSelection)}
                    className="w-full px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-all text-center"
                  >
                    Quick Export (Current View)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowExportMenu(false)}
        />
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Custom Range Dialog */}
      {showCustomDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx- shadow-2xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Custom Time Range</h3>
            
            <div className="space-y-10">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="Enter value"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="any"
                  />
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Interval (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customIntervalValue}
                    onChange={(e) => setCustomIntervalValue(e.target.value)}
                    placeholder="Leave empty for auto"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="any"
                  />
                  <select
                    value={customIntervalUnit}
                    onChange={(e) => setCustomIntervalUnit(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCustomDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={applyCustomRange}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-medium shadow-md"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* (Compact selectors moved to the visibility toolbar; large selector bar removed) */}

      {/* Toggles Toolbar with compact Time Range + Interval selectors on the right */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          <SensorToggleToolbar
            visibleSeries={visibleSeries}
            toggleSeries={toggleSeries}
            getButtonClass={getButtonClass}
            className="mb-0 p-0 bg-transparent border-0"
          />
        </div>

        <div className="flex items-center gap-3 ml-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 hidden md:inline">Time Range</span>
            <select
              value={timeRange.startsWith('custom_') ? 'custom' : timeRange}
              onChange={e => {
                if (e.target.value === 'custom') {
                  setShowCustomDialog(true);
                } else {
                  onTimeRangeChange && onTimeRangeChange(e.target.value);
                }
              }}
              className="px-3 py-1 rounded-lg text-xs border border-gray-300 bg-white"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="6h">6h</option>
              <option value="24h">24h</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 hidden md:inline">Interval</span>
            <select
              value={dataInterval.startsWith('custom_interval_') ? 'custom' : dataInterval}
              onChange={e => {
                if (e.target.value === 'custom') {
                  setShowCustomDialog(true);
                } else {
                  onDataIntervalChange && onDataIntervalChange(e.target.value);
                }
              }}
              className="px-3 py-1 rounded-lg text-xs border border-gray-300 bg-white"
            >
              {['auto', '1s', '5s', '1m', '5m', '1h'].map(interval => (
                <option key={interval} value={interval} disabled={!validIntervals.includes(interval)}>
                  {intervalLabels[interval]}
                </option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Chart Container - increase horizontal space */}
      <div className="h-96 w-full flex-grow relative">
        {isLoading ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-white/50 z-10">
             <Loader2 className="animate-spin w-10 h-10 mb-3 text-blue-500" />
             <span className="text-sm font-medium">Loading Data...</span>
           </div>
        ) : displayData.length === 0 ? (
           <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
             <span className="text-sm">No data available for this period</span>
           </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis 
                dataKey="time" 
                tick={{ fontSize: 11, fill: '#9ca3af' }} 
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                minTickGap={30}
            />
            
            {/* Left Axis for most metrics */}
            <YAxis 
                yAxisId="left" 
                tick={{ fontSize: 11, fill: '#9ca3af' }} 
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
            />
            
            {/* Right Axis specifically for Light (high values; eg 800/900 lux) */}
            <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 11, fill: '#eab308' }} 
                tickLine={false}
                axisLine={false}
                hide={!visibleSeries.light} // Hide axis if light is hidden
            />
            
            <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ fontSize: '12px', fontWeight: 600 }}
            />
            
            {visibleSeries.moisture && (
                <Line yAxisId="left" type="monotone" dataKey="moisture" name="Moisture (%)" stroke="#06b6d4" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            )}
            {visibleSeries.temperature && (
                <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#22c55e" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            )}
            {visibleSeries.humidity && (
                <Line yAxisId="left" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            )}
            {visibleSeries.battery && (
                <Line yAxisId="left" type="step" dataKey="battery" name="Battery (%)" stroke="#a855f7" strokeWidth={3} dot={false} />
            )}
            {visibleSeries.light && (
                <Line yAxisId="right" type="monotone" dataKey="light" name="Light (lux)" stroke="#eab308" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            )}
            
          </LineChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default HistoricalChart;