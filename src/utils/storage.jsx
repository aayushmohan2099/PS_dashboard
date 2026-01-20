// src/utils/storage.js
const ACCESS_KEY = "ps_access";
const REFRESH_KEY = "ps_refresh";
const USER_KEY = "ps_user";

export function setAuth({ access, refresh, user }) {
  try {
    if (access !== undefined && access !== null)
      localStorage.setItem(ACCESS_KEY, access);
    if (refresh !== undefined && refresh !== null)
      localStorage.setItem(REFRESH_KEY, refresh);
    if (user !== undefined && user !== null)
      localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error("storage setAuth failed", e);
  }
}

export function getAccessToken() {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function getUser() {
  try {
    const s = localStorage.getItem(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error(e);
  }
}

export function getApiHeaders() {
  try {
    const apiId = import.meta.env.VITE_API_ID;
    const apiKey = import.meta.env.VITE_API_KEY;
    if (apiId && apiKey) {
      return { "X-API-ID": apiId, "X-API-KEY": apiKey };
    }
    return {};
  } catch (e) {
    console.error("storage getApiHeaders failed", e);
    return {};
  }
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function getCached(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  const { data, ts } = JSON.parse(raw);
  if (Date.now() - ts > CACHE_TTL) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
}

export function setCached(key, data) {
  localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
}

export function clearAllCache() {
  localStorage.clear();
}

const CACHE_PREFIXES = ["lookup:", "analytics:"];

/**
 * Clears only analytics / lookup cache.
 * DOES NOT touch auth/session keys.
 */
export function clearAppCacheOnly() {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (CACHE_PREFIXES.some((p) => key.startsWith(p))) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error("Failed to clear app cache", e);
  }
}
