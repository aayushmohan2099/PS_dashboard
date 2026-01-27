// src/utils/useIdleSession.js
import { useEffect, useRef } from "react";

/**
 * Reusable idle session manager
 *
 * @param {Object} options
 * @param {boolean} options.enabled - enable / disable idle logic
 * @param {Function} options.refreshAccess - token refresh function
 * @param {Function} options.logout - logout function
 * @param {number} options.idleMaxMs - max idle time before logout
 * @param {number} options.refreshIntervalMs - refresh interval
 */
export default function useIdleSession({
  enabled = true,
  refreshAccess,
  logout,
  idleMaxMs = 30 * 60 * 1000, // 30 minutes
  refreshIntervalMs = 5 * 60 * 1000, // 5 minutes
}) {
  const lastActivityRef = useRef(Date.now());

  // Track user activity
  useEffect(() => {
    if (!enabled) return;

    const bumpActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener("click", bumpActivity);
    window.addEventListener("keydown", bumpActivity);
    window.addEventListener("mousemove", bumpActivity);
    window.addEventListener("scroll", bumpActivity);

    return () => {
      window.removeEventListener("click", bumpActivity);
      window.removeEventListener("keydown", bumpActivity);
      window.removeEventListener("mousemove", bumpActivity);
      window.removeEventListener("scroll", bumpActivity);
    };
  }, [enabled]);

  // Idle check + token refresh
  useEffect(() => {
    if (!enabled || !logout) return;

    const timer = setInterval(async () => {
      const idleFor = Date.now() - lastActivityRef.current;

      if (idleFor > idleMaxMs) {
        logout();
        clearInterval(timer);
        return;
      }

      try {
        if (refreshAccess) {
          await refreshAccess();
        }
      } catch (err) {
        console.error("Idle refresh failed", err);
        logout();
      }
    }, refreshIntervalMs);

    return () => clearInterval(timer);
  }, [enabled, refreshAccess, logout, idleMaxMs, refreshIntervalMs]);
}
