// src/pages/LDMS/Layout/ldms_header.jsx
import React, { useContext, useState } from "react";
import { AuthContext } from "../../../contexts/AuthContext";

export default function LdmsHeader() {
  const { user } = useContext(AuthContext) || {};
  const [showNotifications, setShowNotifications] = useState(false);

  const username = user?.username || user?.name || user?.email || "User";
  const avatarLetter = username.charAt(0).toUpperCase();

  return (
    <header className="ldms-header">
      {/* -------- LEFT -------- */}
      <div className="ldms-header-left">
        <span className="ldms-govt-badge" />
        <h1 className="ldms-title">
          Lakhpati Didi <span>Management System</span>
        </h1>
      </div>

      {/* -------- RIGHT -------- */}
      <div className="ldms-header-right">
        {/* Notifications */}
        <div className="ldms-notification-wrapper">
          <button
            className="ldms-icon-btn"
            onClick={() => setShowNotifications((v) => !v)}
            title="Notifications"
          >
            🔔
          </button>

          {showNotifications && (
            <div className="ldms-notification-panel">
              <div className="ldms-notification-header">Notifications</div>
              <div className="ldms-notification-empty">
                No notifications available
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="ldms-user-info">
          <div className="ldms-user-avatar">{avatarLetter}</div>
          <span className="ldms-user-name">{username}</span>
        </div>
      </div>

      {/* -------- STYLES -------- */}
      <style>{`
        :root {
          --ldms-red: #c62828;
          --ldms-red-light: #fdecea;
          --ldms-border: #f1c0c0;
          --ldms-text-dark: #1f2937;
          --ldms-text-muted: #6b7280;
        }

        .ldms-header {
          height: 60px;
          background: #ffffff;
          border-bottom: 2px solid var(--ldms-red);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          position: relative;
          z-index: 50;
        }

        /* Left section */
        .ldms-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ldms-govt-badge {
          width: 6px;
          height: 32px;
          background: var(--ldms-red);
          border-radius: 4px;
        }

        .ldms-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--ldms-red);
          margin: 0;
          letter-spacing: 0.2px;
        }

        .ldms-title span {
          font-weight: 600;
          color: var(--ldms-text-dark);
        }

        /* Right section */
        .ldms-header-right {
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
        }

        /* Icon button */
        .ldms-icon-btn {
          background: var(--ldms-red-light);
          border: 1px solid var(--ldms-border);
          font-size: 18px;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .ldms-icon-btn:hover {
          background: var(--ldms-red);
          color: #ffffff;
        }

        /* Notifications panel */
        .ldms-notification-wrapper {
          position: relative;
        }

        .ldms-notification-panel {
          position: absolute;
          right: 0;
          top: 44px;
          width: 300px;
          background: #ffffff;
          border: 1px solid var(--ldms-border);
          border-radius: 10px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.15);
          overflow: hidden;
          z-index: 100;
        }

        .ldms-notification-header {
          padding: 12px;
          font-weight: 700;
          font-size: 14px;
          background: var(--ldms-red-light);
          color: var(--ldms-red);
          border-bottom: 1px solid var(--ldms-border);
        }

        .ldms-notification-empty {
          padding: 20px;
          font-size: 13px;
          color: var(--ldms-text-muted);
          text-align: center;
        }

        /* User info */
        .ldms-user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 12px;
          border-left: 1px solid #e5e7eb;
        }

        .ldms-user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--ldms-red);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
        }

        .ldms-user-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--ldms-text-dark);
          white-space: nowrap;
        }
      `}</style>
    </header>
  );
}
