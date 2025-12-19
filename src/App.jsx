import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './Components/ErrorBoundary';
import Header from './Components/Header';
import Dashboard from './Components/Dashboard'; // Add missing import
import DeviceSettingsPage from './Components/DeviceSettingsPage';

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <Header />
        {/* space for fixed header */}
        <div className="pt-24" />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/:deviceId" element={<Dashboard />} />
          <Route path="/settings" element={<DeviceSettingsPage />} />
          <Route path="/settings/:deviceId" element={<DeviceSettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
