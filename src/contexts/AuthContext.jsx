// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../api/axios";
import { getUser, setAuth, clearAuth, getAccessToken } from "../utils/storage";
import { getCanonicalRole } from "../utils/roleUtils";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());
  const [loading, setLoading] = useState(false);

  // On mount, try to re-hydrate user if we already have a token
  useEffect(() => {
    try {
      const token = getAccessToken();
      if (token && !user) {
        const storedUser = getUser();
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }
      }
    } catch (e) {
      console.error("AuthContext init error", e);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * login
   * - clears any stale auth before POSTing credentials (prevents expired access token from being sent to /auth/login/)
   * - POSTs to /auth/login/
   * - backend should set refresh cookie; response contains access token and user info
   */
  const login = async ({ username, password }) => {
    setLoading(true);
    try {
      // VERY IMPORTANT: remove any stored/expired access token so axios won't include Authorization on /auth/login/
      clearAuth();

      const res = await api.post("/auth/login/", { username, password });
      // Expect backend to return { access, user } (refresh cookie set server-side)
      const { access, user: resUser } = res.data || {};

      if (access) {
        // persist access & user. setAuth implementation handles storage (and may keep refresh cookie server-side).
        setAuth({ access, user: resUser });
        setUser(resUser || null);
        setIsAuthenticated(true);
        setLoading(false);
        return { success: true };
      } else {
        // Unexpected shape
        setLoading(false);
        return {
          success: false,
          error: { detail: "Login response missing access token" },
        };
      }
    } catch (err) {
      setLoading(false);
      // Normalise error payload
      const errData = err?.response?.data || {
        message: err.message || "Login failed",
      };
      console.error("Login failed", errData);
      return { success: false, error: errData };
    }
  };

  /**
   * logout - COMPLETE localStorage cleanup + server logout
   */
  const logout = async () => {
    try {
      // Clear ALL app caches and TMS-specific storage
      const tmsKeys = [
        'tms_training_requests_cache_v1',
        'tms_user_map_v1',
        'tms_partner_map_v1',
        'tms_plan_map_v1',
        'tms_self_partner_id_v1',
        'tms_training_batches_cache_v1',
        'tms_batch_user_map_v1',
        'tms_centre_map_v1'
      ];
      
      // Clear per-request batch caches (pattern: tms_training_batches_cache_v1_{requestId})
      const allKeys = Object.keys(localStorage);
      const batchCacheKeys = allKeys.filter(key => key.startsWith('tms_training_batches_cache_v1_'));
      
      [...tmsKeys, ...batchCacheKeys].forEach(key => {
        try { localStorage.removeItem(key); } catch(e) {}
      });

      // Clear geoscope and other app caches
      localStorage.removeItem('ps_user_geoscope');
      
      // Clear auth storage
      clearAuth();
      
    } catch (e) {
      console.error('Logout cleanup error:', e);
    }
    
    // Server logout (fire and forget)
    api.post("/auth/logout/").catch(console.error);
    
    // Reset state
    setUser(null);
    setIsAuthenticated(false);
  };

  /**
   * refreshAccess - explicitly refresh access token using refresh cookie
   * - Calls POST /auth/refresh/ (server reads refresh cookie)
   * - On success persists new access token and returns it
   */
  const refreshAccess = async () => {
    try {
      setLoading(true);
      const res = await api.post("/auth/refresh/");
      const newAccess = res?.data?.access;
      if (newAccess) {
        // persist and keep existing user in storage if present
        const prevUser = getUser();
        setAuth({ access: newAccess, user: prevUser });
        setUser(prevUser || null);
        setIsAuthenticated(true);
        setLoading(false);
        return newAccess;
      } else {
        setLoading(false);
        logout();
        return null;
      }
    } catch (e) {
      setLoading(false);
      console.error("refreshAccess failed", e?.response?.data || e.message);
      logout();
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        setUser,
        refreshAccess,
        roleKey: getCanonicalRole(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Small convenience hook so components can just do:
 *   const { user, isAuthenticated } = useAuth();
 */
export const useAuth = () => useContext(AuthContext);
