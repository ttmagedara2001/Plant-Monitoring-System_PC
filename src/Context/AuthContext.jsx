import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as authLogin,
  setAuthenticatedState,
  clearAuthState,
  ensureAuthFromEnv
} from '../Service/authService';

/**
 * Authentication Context for Cookie-Based Auth
 * 
 * Key Changes from Header-Based Auth:
 * - No jwtToken state (tokens are in HttpOnly cookies, not accessible from JS)
 * - Track isAuthenticated boolean instead
 * - No localStorage token storage
 * - Login function calls /user/get-token which sets cookies automatically
 */
const AuthContext = createContext({
  userId: '',
  isAuthenticated: false,
  isLoading: true,
  login: async () => { },
  logout: () => { },
});

// Custom Hook for easy access in components
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider Component
export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Login function - uses cookie-based authentication
   * Calls /user/get-token which sets HttpOnly cookies on success
   */
  const login = useCallback(async (email, password) => {
    try {
      const result = await authLogin(email, password);

      if (result.success) {
        setUserId(result.userId);
        setIsAuthenticated(true);
        setAuthenticatedState(true);

        // Store userId for display purposes only (not for auth)
        localStorage.setItem('userId', result.userId);

        console.log('✅ Auth state updated (cookie-based):', {
          userId: result.userId,
          isAuthenticated: true
        });

        return { success: true, userId: result.userId };
      }
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      setIsAuthenticated(false);
      setAuthenticatedState(false);
      throw error;
    }
  }, []);

  /**
   * Logout function - clears local state
   * Note: HttpOnly cookies must be cleared by server or they expire naturally
   */
  const logout = useCallback(() => {
    console.log('🚪 Logging out...');

    setUserId('');
    setIsAuthenticated(false);
    clearAuthState();

    // Clear any local storage items (but not auth cookies - they're HttpOnly)
    localStorage.removeItem('userId');
    localStorage.removeItem('activeTab');
    localStorage.removeItem('selectedDevice');

    // Redirect to home
    window.location.href = '/';
  }, []);

  /**
   * Attempt auto-login on app initialization
   * Uses environment variables if available
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if we have stored userId (might indicate previous session)
        const storedUserId = localStorage.getItem('userId');

        // Try auto-login from environment credentials
        const envEmail = import.meta.env.VITE_USER_EMAIL;
        const envSecret = import.meta.env.VITE_USER_SECRET;

        if (envEmail && envSecret) {
          console.log('🔐 Attempting auto-login from environment...');
          try {
            await login(envEmail, envSecret);
            console.log('✅ Auto-login successful');
          } catch (e) {
            console.warn('⚠️ Auto-login failed:', e.message);
            // If auto-login fails but we had a stored userId, 
            // the session might have expired
            if (storedUserId) {
              localStorage.removeItem('userId');
            }
          }
        } else if (storedUserId) {
          // We have a stored userId but no ENV credentials
          // User may still have valid cookies from previous session
          // We'll assume authenticated until an API call fails
          console.log('ℹ️ Found stored userId, assuming session active');
          setUserId(storedUserId);
          setIsAuthenticated(true);
          setAuthenticatedState(true);
        }
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [login]);

  /**
   * Listen for logout events from API interceptor
   * (When token refresh fails, api.js dispatches 'auth:logout')
   */
  useEffect(() => {
    const handleLogout = () => {
      console.log('📢 Received auth:logout event');
      logout();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout]);

  const value = {
    userId,
    isAuthenticated,
    isLoading,
    login,
    logout,
    // Backward compatibility: some components may check for jwtToken
    // Return a truthy value when authenticated
    jwtToken: isAuthenticated ? 'COOKIE_BASED_AUTH' : '',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;