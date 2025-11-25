// Use this to display historical data charts with toggles for different metrics
import React, { useState } from 'react';
import { Download, Loader2, Eye, EyeOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const HistoricalChart = ({ chartData, isLoading, onExportCSV, isExporting }) => {
  // Local state to manage which lines are visible
  const [visibleSeries, setVisibleSeries] = useState({
    moisture: true,
    temperature: true,
    humidity: false,
    light: false,
    battery: false
  });

  const toggleSeries = (key) => {
    setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to generate button classes based on active state
  const getButtonClass = (isActive, colorClass) => 
    `px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all border ${
      isActive 
        ? `${colorClass} text-white border-transparent shadow-sm` 
        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
    }`;

  return (
    <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-md flex flex-col border border-gray-100">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-gray-800">Historical Trends</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Last 24h</span>
        </div>
        
        <button 
            onClick={onExportCSV} 
            disabled={isExporting || chartData.length === 0}
            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50">
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
          <span>Export CSV</span>
        </button>
      </div>

      {/* Toggles Toolbar */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center md:justify-start p-3 bg-gray-50 rounded-xl border border-gray-100">
        <button onClick={() => toggleSeries('moisture')} className={getButtonClass(visibleSeries.moisture, 'bg-cyan-500')}>
          {visibleSeries.moisture ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>} Moisture
        </button>
        <button onClick={() => toggleSeries('temperature')} className={getButtonClass(visibleSeries.temperature, 'bg-green-500')}>
          {visibleSeries.temperature ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>} Temp
        </button>
        <button onClick={() => toggleSeries('humidity')} className={getButtonClass(visibleSeries.humidity, 'bg-blue-500')}>
          {visibleSeries.humidity ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>} Humidity
        </button>
        <button onClick={() => toggleSeries('light')} className={getButtonClass(visibleSeries.light, 'bg-yellow-500')}>
          {visibleSeries.light ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>} Light
        </button>
        <button onClick={() => toggleSeries('battery')} className={getButtonClass(visibleSeries.battery, 'bg-purple-500')}>
          {visibleSeries.battery ? <Eye className="w-3 h-3"/> : <EyeOff className="w-3 h-3"/>} Battery
        </button>
      </div>
      
      {/* Chart Container */}
      <div className="h-80 w-full flex-grow relative">
        {isLoading ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-white/50 z-10">
             <Loader2 className="animate-spin w-10 h-10 mb-3 text-blue-500" />
             <span className="text-sm font-medium">Loading Data...</span>
           </div>
        ) : chartData.length === 0 ? (
           <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
             <span className="text-sm">No data available for this period</span>
           </div>
        ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            
            {/* Right Axis specifically for Light (high values) */}
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