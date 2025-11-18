import React, { createContext, useContext, useState } from 'react';

// 1. Created the Context
const AuthContext = createContext({
  userId: 'default-user',
  jwtToken: '',
  logout: () => {}, 
});

// 2. Created a Custom Hook for easy access in components
export const useAuth = () => {
  return useContext(AuthContext);
};

// 3. Created the Provider Component
export const AuthProvider = ({ children }) => {
  const [userId] = useState("AGRICOP_ADMIN_01");
  const [jwtToken] = useState("MOCK_TOKEN_FOR_TESTING");

  const logout = () => {
    console.log('Logout called');
    // Clear authentication and redirect
    window.location.href = '/';
  };

  const value = {
    userId,
    jwtToken,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;