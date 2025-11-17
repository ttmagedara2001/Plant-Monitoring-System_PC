import React, { createContext, useContext, useState } from 'react';

// 1. Create the Context
const AuthContext = createContext({
  userId: 'default-user',
  logout: () => {}, 
});

// 2. Create a Custom Hook for easy access in components
export const useAuth = () => {
  return useContext(AuthContext);
};

// 3. Create the Provider Component
export const AuthProvider = ({ children }) => {
  const [userId] = useState("AGRICOP_ADMIN_01");

  const logout = () => {
    console.log('Logout called');
  };

  const value = {
    userId,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;