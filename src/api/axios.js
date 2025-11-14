// src/api/axios.js
/**
 * Axios instance used across the app.
 * - withCredentials=true so browser will send HttpOnly refresh cookie.
 * - Attaches Authorization header for protected endpoints (but NOT for /auth/* or /lookups/*).
 * - Attaches X-API headers only for /lookups/* endpoints (as before).
 * - Implements cookie-backed refresh flow and retries original requests after refresh.
 *
 * Key surgical changes:
 * - Strict detection of auth endpoints -> do NOT attach Authorization for them (prevents expired-token errors)
 * - Ensure refresh call itself doesn't send Authorization (backend expects cookie)
 * - When retrying original requests after refresh, only attach Authorization for non-auth, non-lookups endpoints
 */

import axios from 'axios';
import { getAccessToken, setAuth, getRefreshToken, clearAuth } from '../utils/storage';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true, // important for refresh-cookie flow
});

// helper: robustly detect paths (works for absolute or relative URLs in config.url)
function pathContains(configOrUrl, substring) {
  try {
    let url = '';
    if (typeof configOrUrl === 'string') {
      url = configOrUrl;
    } else if (configOrUrl && typeof configOrUrl.url === 'string') {
      url = configOrUrl.url;
      // include baseURL if available so absolute checks work
      if (configOrUrl.baseURL) url = configOrUrl.baseURL + url;
    } else {
      return false;
    }
    return url.includes(substring);
  } catch (e) {
    return false;
  }
}

// Request interceptor
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  const isAuthEndpoint = pathContains(config, '/auth/');
  const isLookupEndpoint = pathContains(config, '/lookups/');

  // 1) Attach X-API headers for lookups (your app expects this)
  if (isLookupEndpoint) {
    const apiId = import.meta.env.VITE_API_ID;
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiId && apiKey) {
      config.headers['X-API-ID'] = apiId;
      config.headers['X-API-KEY'] = apiKey;
    }
  } else {
    // ensure we do not accidentally send X-API headers to non-lookups endpoints
    if (config.headers['X-API-ID']) delete config.headers['X-API-ID'];
    if (config.headers['X-API-KEY']) delete config.headers['X-API-KEY'];
  }

  // 2) Attach Authorization header for non-auth AND non-lookups endpoints
  // IMPORTANT: do NOT attach Authorization for /auth/* (login, refresh) and /lookups/*
  if (!isAuthEndpoint && !isLookupEndpoint) {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      if (config.headers.Authorization) delete config.headers.Authorization;
    }
  } else {
    // ensure Authorization is not sent to auth or lookups endpoints
    if (config.headers.Authorization) delete config.headers.Authorization;
  }

  return config;
}, (err) => Promise.reject(err));

// Refresh-handling
const REFRESH_ENDPOINT = '/auth/refresh/';

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) { refreshSubscribers.push(cb); }
function onRefreshed(token) { refreshSubscribers.forEach(cb => cb(token)); refreshSubscribers = []; }

async function attemptRefresh() {
  // Make sure refresh call hits /auth/refresh/ WITHOUT Authorization header (request interceptor will remove it)
  const res = await api.post(REFRESH_ENDPOINT);
  return res.data?.access || null;
}

// Response interceptor: handle 401 by attempting refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // If response is 401 and original request not retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If another refresh is ongoing, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(async (newToken) => {
            if (newToken) {
              // attach new token only if not an auth/lookup endpoint
              if (!pathContains(originalRequest, '/auth/') && !pathContains(originalRequest, '/lookups/')) {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      // start refresh
      isRefreshing = true;
      try {
        const newAccess = await attemptRefresh();
        if (!newAccess) throw new Error('No new access token from refresh');

        // persist token (keep refresh cookie server-side)
        const prevUser = JSON.parse(localStorage.getItem('ps_user') || 'null');
        setAuth({ access: newAccess, refresh: getRefreshToken(), user: prevUser });

        // notify queued requests
        onRefreshed(newAccess);
        isRefreshing = false;

        // retry original request: only add Authorization if it's not an auth/lookup endpoint
        if (!pathContains(originalRequest, '/auth/') && !pathContains(originalRequest, '/lookups/')) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        } else {
          // ensure no Authorization is present for auth/lookups
          if (originalRequest.headers && originalRequest.headers.Authorization) {
            delete originalRequest.headers.Authorization;
          }
        }

        return api(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        // clear local auth state, force re-login
        clearAuth();
        return Promise.reject(error);
      }
    }

    // for other cases, just forward
    return Promise.reject(error);
  }
);

export default api;
