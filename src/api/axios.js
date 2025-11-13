// src/api/axios.js
import axios from 'axios';
import { getAccessToken, setAuth, getRefreshToken, clearAuth } from '../utils/storage';

// base URL from env
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true, // send cookies (refresh cookie)
});

// Request interceptor: attach Authorization and attach X-API headers ONLY for lookups endpoints
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const urlPath = typeof config.url === 'string' ? config.url : '';
    const full = (config.baseURL ? (config.baseURL + urlPath) : urlPath);

    const isLookups =
      urlPath.startsWith('/lookups') ||
      urlPath.includes('/lookups/') ||
      full.includes('/api/v1/lookups/');

    if (isLookups) {
      const apiId = import.meta.env.VITE_API_ID;
      const apiKey = import.meta.env.VITE_API_KEY;
      if (apiId && apiKey) {
        config.headers['X-API-ID'] = apiId;
        config.headers['X-API-KEY'] = apiKey;
      }
    }
  } catch (e) {
    console.warn('Error in axios request interceptor deciding api headers', e);
  }

  return config;
}, (err) => Promise.reject(err));

// Refresh handling helpers
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach(cb => cb(newToken));
  refreshSubscribers = [];
}
function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

async function attemptRefresh() {
  // Calls the backend refresh endpoint which reads the httpOnly refresh cookie and returns new access
  // Backend route per your files: POST /api/v1/auth/refresh/
  const res = await api.post('/auth/refresh/');
  return res.data && res.data.access ? res.data.access : null;
}

// Response interceptor - handle 401 attempts
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) return Promise.reject(error);

    // Only handle 401s for API requests
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // queue it
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      isRefreshing = true;
      try {
        const newAccess = await attemptRefresh();
        if (!newAccess) throw new Error('No access token returned during refresh');

        // Persist new access token in localStorage (keep refresh cookie server-side)
        const user = JSON.parse(localStorage.getItem('ps_user') || 'null');
        setAuth({ access: newAccess, refresh: getRefreshToken(), user });

        onRefreshed(newAccess);
        isRefreshing = false;

        // retry original
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        clearAuth();
        // let caller handle redirect / UI
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
