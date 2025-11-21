import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './AppTest.jsx';
import './index.css'; // Ensures Tailwind/global styles are loaded
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 1. AuthProvider wraps the app so authentication state is global */}
    <AuthProvider>
      {/* 2. BrowserRouter wraps the app to enable routing (Routes/Route) */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
);