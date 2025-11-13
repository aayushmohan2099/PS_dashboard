// src/utils/storage.js
const ACCESS_KEY = 'ps_access';
const REFRESH_KEY = 'ps_refresh';
const USER_KEY = 'ps_user';

export function setAuth({ access, refresh, user }) {
  try {
    if (access !== undefined && access !== null) localStorage.setItem(ACCESS_KEY, access);
    if (refresh !== undefined && refresh !== null) localStorage.setItem(REFRESH_KEY, refresh);
    if (user !== undefined && user !== null) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) { console.error('storage setAuth failed', e); }
}

export function getAccessToken() { try { return localStorage.getItem(ACCESS_KEY); } catch (e) { console.error(e); return null; } }
export function getRefreshToken() { try { return localStorage.getItem(REFRESH_KEY); } catch (e) { console.error(e); return null; } }
export function getUser() { try { const s = localStorage.getItem(USER_KEY); return s ? JSON.parse(s) : null; } catch (e) { console.error(e); return null; } }
export function clearAuth() { try { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY); localStorage.removeItem(USER_KEY); } catch (e) { console.error(e); } }

export function getApiHeaders() {
  try {
    const apiId = import.meta.env.VITE_API_ID;
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiId && apiKey) {
      return { 'X-API-ID': apiId, 'X-API-KEY': apiKey };
    }
    return {};
  } catch (e) {
    console.error('storage getApiHeaders failed', e);
    return {};
  }
}
