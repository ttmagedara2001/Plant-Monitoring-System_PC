import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Components/DashboardTest';
import ErrorBoundary from './Components/ErrorBoundary';


function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Route 1: Dashboard at Root */}
        <Route path="/" element={<Dashboard />} />

        {/* Route 2: Dashboard with Device ID */}
        <Route path="/dashboard/:deviceId" element={<Dashboard />} />

        {/* Route 3: Catch-all 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
