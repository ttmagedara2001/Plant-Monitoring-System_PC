import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const HistoricalChart = ({ chartData, isLoadingChart, deviceId, onExportCSV }) => {
  return (
    <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-md flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800">Historical Data</h3>
        <button 
          onClick={onExportCSV} 
          className="bg-yellow-200 hover:bg-yellow-300 text-gray-800 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition"
        >
          download .CSV <Download className="w-4 h-4" />
        </button>
      </div>
      
      <div className="h-64 w-full flex-grow">
        {isLoadingChart ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        ) : chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#888' }} />
              <YAxis tick={{ fontSize: 10, fill: '#888' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" height={36} />
              <Line 
                type="monotone" 
                dataKey="moisture" 
                name="Moisture %" 
                stroke="#4ade80" 
                strokeWidth={3} 
                dot={false} 
              />
              <Line 
                type="monotone" 
                dataKey="temperature" 
                name="Temperature °C" 
                stroke="#ef4444" 
                strokeWidth={3} 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p>No chart data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoricalChart;
