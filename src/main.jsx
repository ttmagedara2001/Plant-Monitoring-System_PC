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
 * Authentication Flow (Cookie-Based):
 * 1. AuthProvider initializes and attempts auto-login from ENV variables
 * 2. If VITE_USER_EMAIL and VITE_USER_SECRET are set, login() is called
 * 3. Login sets HttpOnly cookies via /user/get-token
 * 4. isLoading stays true until auth initialization completes
 * 5. App.jsx waits for isAuthenticated before connecting WebSocket
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