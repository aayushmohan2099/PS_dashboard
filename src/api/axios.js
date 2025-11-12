// src/api/axios.js
import axios from 'axios';
import { getAccessToken, getApiHeaders, clearAuth, setAuth, getRefreshToken } from '../utils/storage';
import { jwtDecode as jwt_decode } from 'jwt-decode';

// base URL from env
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL,
  timeout: 15000,
  // IMPORTANT: allow sending & receiving cookies (HttpOnly refresh cookie)
  withCredentials: true,
});

// src/api/axios.js (request interceptor portion)
api.interceptors.request.use((config) => {
  // Add Authorization from stored access token (for protected endpoints)
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add X-API headers ONLY for core lookups endpoints
  // The middleware requires X-API-ID/X-API-KEY for URLs under /lookups/
  try {
    // config.url could be absolute or relative. Normalize to a path string:
    const urlPath = (typeof config.url === 'string') ? config.url : '';
    // If axios called with full URL, check it too:
    const full = (config.baseURL ? (config.baseURL + urlPath) : urlPath);
    // decide if we need to attach X-API headers
    const needsApiHeaders = urlPath.startsWith('/lookups') ||
      urlPath.includes('/lookups/') ||
      full.includes('/api/v1/lookups/');

    if (needsApiHeaders) {
      const apiId = import.meta.env.VITE_API_ID;
      const apiKey = import.meta.env.VITE_API_KEY;
      if (apiId && apiKey) {
        config.headers['X-API-ID'] = apiId;
        config.headers['X-API-KEY'] = apiKey;
      }
    }
  } catch (e) {
    // fallback: do not add custom headers if any error
    console.warn('Error deciding api header attachment', e);
  }

  return config;
}, (err) => Promise.reject(err));

// Helper: attempt refresh via cookie-based endpoint
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
  try {
    // call refresh-cookie endpoint, cookie will be sent due to withCredentials=true
    const res = await api.post('/auth/refresh-cookie/');
    const { access } = res.data;
    return access;
  } catch (err) {
    throw err;
  }
}

// Response interceptor - global 401 handling
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // If it's a 401 and we haven't tried refresh for this request yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // prevent infinite loop
      originalRequest._retry = true;

      if (isRefreshing) {
        // queue requests while refresh in progress
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
        // store new access in local storage so further requests use it
        setAuth({ access: newAccess, refresh: getRefreshToken(), user: JSON.parse(localStorage.getItem('ps_user') || 'null') });
        onRefreshed(newAccess);
        isRefreshing = false;

        // retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        // refresh failed -> log out locally
        clearAuth();
        // allow UI to handle redirect; reject promise for now
        return Promise.reject(error);
      }
    }

    // Other errors - pass through
    return Promise.reject(error);
  }
);

export default api;
