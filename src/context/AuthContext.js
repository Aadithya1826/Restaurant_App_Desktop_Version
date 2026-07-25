import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = await authService.getCurrentUser();
        const isAuth = await authService.isAuthenticated();
        if (storedUser && isAuth) {
          setUser(storedUser);
        }
      } catch (err) {
        console.error("Auth initialization failed", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email, password, role = undefined) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.login(email, password, role);
      setUser(response.user);
      return response;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Login failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password, role = null, restaurantId = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.signup(name, email, password, role, restaurantId);
      setUser(response.user);
      return response;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Signup failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setError(null);
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
