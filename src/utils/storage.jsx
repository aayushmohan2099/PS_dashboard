// src/utils/storage.js
// Centralized storage helpers used by the frontend.
// Exports: setAuth, getAccessToken, getRefreshToken, getUser, clearAuth, getApiHeaders

const ACCESS_KEY = 'ps_access';
const REFRESH_KEY = 'ps_refresh';
const USER_KEY = 'ps_user';

/**
 * Save auth tokens + user
 * @param {{access: string, refresh?: string, user?: object}} param0
 */
export function setAuth({ access, refresh, user }) {
  try {
    if (access !== undefined && access !== null) {
      localStorage.setItem(ACCESS_KEY, access);
    }
    if (refresh !== undefined && refresh !== null) {
      localStorage.setItem(REFRESH_KEY, refresh);
    }
    if (user !== undefined && user !== null) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.error('storage setAuth failed', e);
  }
}

export function getAccessToken() {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch (e) {
    console.error('storage getAccessToken failed', e);
    return null;
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch (e) {
    console.error('storage getRefreshToken failed', e);
    return null;
  }
}

export function getUser() {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    console.error('storage getUser failed', e);
    return null;
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('storage clearAuth failed', e);
  }
}

/**
 * Return the static API header map used for core lookups
 * (keeps the frontend and middleware contract consistent).
 * This helper is optional for axios since axios request interceptor also adds headers,
 * but we export it because some parts of the code may call it.
 *
 * Returns an object with X-API-ID and X-API-KEY (or {} if not configured).
 */
export function getApiHeaders() {
  try {
    const apiId = import.meta.env.VITE_API_ID;
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiId && apiKey) {
      return {
        'X-API-ID': apiId,
        'X-API-KEY': apiKey,
      };
    }
    return {};
  } catch (e) {
    console.error('storage getApiHeaders failed', e);
    return {};
  }
}
