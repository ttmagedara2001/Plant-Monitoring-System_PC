import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './Context/AuthContext.jsx';
import { login } from "./Service/authService";

// Hardcoded credentials for auto login
const email = "ratnaabinayan@gmail.com";
const password = "123456789";

const AutoLogin = ({ children }) => {
  const { setAuth } = useAuth();

  React.useEffect(() => {
    (async () => {
      try {
        console.log("🔑 Attempting auto login with hardcoded credentials...");
        const authData = await login(email, password);
        
        console.log("✅ Auto login successful. Ready for connection.");
        setAuth({ userId: authData.userId || email, jwtToken: authData.jwtToken });
        
        // Store tokens in localStorage for persistence
        if (authData.refreshToken) {
          localStorage.setItem('refreshToken', authData.refreshToken);
        }
        
      } catch (error) {
        console.warn("⚠️ Auto login failed. Using mock data for development.");
        console.error("Auto login error details:", error);
        // Set mock values for development fallback
        setAuth({ userId: email, jwtToken: "MOCK_TOKEN_FOR_TESTING" });
      }
    })();
  }, [setAuth]);

  return children;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AutoLogin>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AutoLogin>
    </AuthProvider>
  </React.StrictMode>,
);