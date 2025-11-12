// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { getUser, setAuth, clearAuth, getAccessToken } from '../utils/storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // optionally validate token on mount; for now rely on api interceptors
  }, []);

  const login = async ({ username, password }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login/', { username, password });
      // { access, user }  ; refresh cookie is set by backend
      const { access, user } = res.data;
      setAuth({ access, user });
      setUser(user);
      setIsAuthenticated(true);
      setLoading(false);
      return { success: true };
    } catch (err) {
      setLoading(false);
      console.error('Login failed', err.response?.data || err.message);
      return { success: false, error: err.response?.data || err.message };
    }
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshAccess = async () => {
    try {
      const res = await api.post('/auth/refresh-cookie/');
      if (res.data && res.data.access) {
        setAuth({ access: res.data.access, user });
        setIsAuthenticated(true);
        return res.data.access;
      }
    } catch (e) {
      console.error('refreshAccess failed', e);
      logout();
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, setUser, refreshAccess }}>
      {children}
    </AuthContext.Provider>
  );
};
