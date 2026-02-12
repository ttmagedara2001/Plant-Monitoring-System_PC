import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './Context/AuthContext.jsx';
import { NotificationProvider } from './Context/NotificationContext.jsx';

/**
 * Main entry point for the Plant Monitoring Dashboard
 * 
 * Authentication Flow (Bearer Token):
 * 1. AuthProvider initializes – restores tokens from localStorage if present
 * 2. If no stored token, attempts auto-login from ENV variables (VITE_USER_EMAIL / VITE_USER_SECRET)
 * 3. Login calls /user/get-token, extracts JWT + refresh token from response body
 * 4. Tokens are persisted in localStorage ('authToken' / 'refreshToken')
 * 5. All API requests attach Authorization: Bearer <token> via Axios interceptor
 * 6. WebSocket connects with ?token=<jwt> query parameter
 * 7. App.jsx waits for isAuthenticated before connecting WebSocket
 */
ReactDOM.createRoot(document.getElementById('root')).render(
	<AuthProvider>
		<HashRouter
			future={{
				v7_startTransition: true,
				v7_relativeSplatPath: true
			}}
		>
			<NotificationProvider>
				<App />
			</NotificationProvider>
		</HashRouter>
	</AuthProvider>
);