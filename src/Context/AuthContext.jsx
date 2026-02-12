import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as authLogin,
  setAuthenticatedState,
  clearAuthState,
  getJwtToken,
} from '../Service/authService';

/**
 * Authentication context — provides login/logout and token state.
 * Tokens are stored in localStorage (via authService), attached as
 * Bearer headers on API requests, and passed as ?token= on WebSocket.
 */
const AuthContext = createContext({
  userId: '',
  jwtToken: '',
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState('');
  const [jwtToken, setJwtToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /** Authenticate using email + secretKey. */
  const login = useCallback(async (email, password) => {
    try {
      const result = await authLogin(email, password);
      if (result.success) {
        setUserId(result.userId);
        setJwtToken(result.jwtToken || '');
        setIsAuthenticated(true);
        setAuthenticatedState(true);
        localStorage.setItem('userId', result.userId);
        return { success: true, userId: result.userId, jwtToken: result.jwtToken };
      }
    } catch (error) {
      setIsAuthenticated(false);
      setJwtToken('');
      setAuthenticatedState(false);
      throw error;
    }
  }, []);

  /** Clear tokens and redirect to login. */
  const logout = useCallback(() => {
    setUserId('');
    setJwtToken('');
    setIsAuthenticated(false);
    clearAuthState();
    localStorage.removeItem('userId');
    localStorage.removeItem('activeTab');
    localStorage.removeItem('selectedDevice');
    window.location.href = '/';
  }, []);

  // Restore session from localStorage or auto-login from env vars
  useEffect(() => {
    const initAuth = async () => {
      try {
        const envEmail = import.meta.env.VITE_USER_EMAIL;
        const envSecret = import.meta.env.VITE_USER_SECRET;

        // 1. Check for localStorage-restored token
        const restoredToken = getJwtToken();
        if (restoredToken) {
          const storedUserId = localStorage.getItem('userId') || '';

          // If env credentials changed → stale token, force re-login
          if (envEmail && storedUserId && storedUserId !== envEmail) {
            clearAuthState();
            localStorage.removeItem('userId');
          } else {
            setUserId(storedUserId);
            setJwtToken(restoredToken);
            setIsAuthenticated(true);
            setAuthenticatedState(true);
            setIsLoading(false);
            return;
          }
        }

        // 2. Auto-login from env
        if (envEmail && envSecret) {
          try {
            await login(envEmail, envSecret);
          } catch (_) {
            localStorage.removeItem('userId');
          }
        }
      } catch (error) {
        console.error('[Auth] Initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [login]);

  // Handle logout events dispatched by the API interceptor
  useEffect(() => {
    const handleLogout = () => logout();
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ userId, jwtToken, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;