import React, { createContext, useContext, useState, useEffect } from "react";
import { isTokenValid } from "./utils";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 檢查初始登入狀態
    const checkAuthStatus = () => {
      const valid = isTokenValid();
      setIsAuthenticated(valid);
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearAuthData();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
