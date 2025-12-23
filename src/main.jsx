import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { HashRouter } from 'react-router-dom'; // Only HashRouter is needed now
import { AuthProvider, useAuth } from './Context/AuthContext.jsx';
import { NotificationProvider } from './Context/NotificationContext.jsx';
import { login } from "./Service/authService";

// The import of BrowserRouter is no longer needed
// import { BrowserRouter } from 'react-router-dom';

// ✅ UPDATED: Real Protonest credentials
// These are the actual credentials from the Protonest dashboard
const email = import.meta.env.VITE_USER_EMAIL; // || "ratnaabinayansn@gmail.com";
const password = import.meta.env.VITE_USER_SECRET ;//|| "6M3@pwYvBGRVJLN";

const AutoLogin = ({ children }) => {
  const { setAuth } = useAuth();
  const [loginAttempted, setLoginAttempted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (loginAttempted) return;
    
    setLoginAttempted(true);
    
    const performLogin = async () => {
      try {
        // Remove the placeholder check since we now have real credentials
        console.log("🔑 Attempting auto login with real credentials...");
        console.log("📧 Email:", email);
        console.log("🔐 SecretKey length:", password.length);
        
        const authData = await login(email, password);
        
        console.log("✅ Auto login successful. Ready for connection.");
        setAuth({ userId: authData.userId || email, jwtToken: authData.jwtToken });
        
        if (authData.refreshToken) {
          localStorage.setItem('refreshToken', authData.refreshToken);
        }
        
      } catch (error) {
        console.warn("⚠️ Auto login failed. Using mock data for development.");
        console.error("Auto login error details:", error.message);
        
        // Provide helpful error message
        if (error.message.includes("Invalid credentials")) {
          console.error("🔧 Credentials may be incorrect or expired. Please verify from Protonest dashboard");
        }
        
        setAuth({ userId: email, jwtToken: "MOCK_TOKEN_FOR_TESTING" });
      } finally {
        setIsLoading(false);
      }
    };

    performLogin();
  }, [setAuth, loginAttempted]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating with Protonest API...</p>
          <p className="text-blue-600 text-sm mt-2">✅ Using real credentials</p>
        </div>
      </div>
    );
  }

  return children;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  // Remove StrictMode to prevent double mounting in development
  <AuthProvider>
    <AutoLogin>
			<HashRouter // <-- FIXED
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
				<NotificationProvider>
					<App />
				</NotificationProvider>
      </HashRouter>
    </AutoLogin>
  </AuthProvider>
);