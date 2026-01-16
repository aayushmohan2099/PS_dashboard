// src/pages/LDMS/Layout/ldms_header.jsx
import React, { useContext, useState } from "react";
import { AuthContext } from "../../../contexts/AuthContext";
import { AUTH_API } from "../../../api/axios";
import { clearAuth } from "../../../utils/storage";

export default function LdmsHeader() {
  const { user } = useContext(AuthContext) || {};
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const username = user?.username || user?.name || user?.email || "User";
  const avatarLetter = username.charAt(0).toUpperCase();

  const notifications = [
    "New AEP plan submitted in your block",
    "VPRP data updated for FY 2024",
    "15 new PLDs registered today",
    "Support benefits synced successfully",
  ];

  const handleLogout = async () => {
    try {
      await AUTH_API.logout();
    } catch (e) {
    } finally {
      clearAuth();
      window.location.href = "/login";
    }
  };

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
            onClick={() => {
              setShowNotifications((v) => !v);
              setShowUserMenu(false);
            }}
            title="Notifications"
          >
            🔔
            <span className="ldms-notification-badge">+4</span>
          </button>

          {showNotifications && (
            <div className="ldms-notification-panel pop-animate">
              <div className="ldms-notification-header">Notifications</div>
              {notifications.map((n, i) => (
                <div key={i} className="ldms-notification-item">
                  {n}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="ldms-user-wrapper">
          <button
            className="ldms-user-info"
            onClick={() => {
              setShowUserMenu((v) => !v);
              setShowNotifications(false);
            }}
          >
            <div className="ldms-user-avatar">{avatarLetter}</div>
            <span className="ldms-user-name">{username}</span>
          </button>

          {showUserMenu && (
            <div className="ldms-user-menu pop-animate">
              <button onClick={handleLogout} className="ldms-logout-btn">
                Logout
              </button>
            </div>
          )}
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
          z-index: 50;
        }

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
        }

        .ldms-title span {
          font-weight: 600;
          color: var(--ldms-text-dark);
        }

        .ldms-header-right {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        /* Buttons */
        .ldms-icon-btn,
        .ldms-user-info {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .ldms-icon-btn:hover,
        .ldms-user-info:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(198,40,40,0.15);
        }

        .ldms-icon-btn:active,
        .ldms-user-info:active {
          transform: scale(0.96);
        }

        .ldms-icon-btn {
          position: relative;
          background: var(--ldms-red-light);
          border: 1px solid var(--ldms-border);
          font-size: 18px;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 8px;
        }

        .ldms-notification-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: var(--ldms-red);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
        }

        /* Panels */
        .ldms-notification-panel,
        .ldms-user-menu {
          animation: popIn 0.18s ease-out;
        }

        @keyframes popIn {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .ldms-notification-panel {
          position: absolute;
          right: 0;
          top: 44px;
          width: 300px;
          background: #ffffff;
          border: 1px solid var(--ldms-border);
          border-radius: 10px;
          box-shadow: 0 14px 36px rgba(0,0,0,0.16);
          overflow: hidden;
          z-index: 100;
        }

        .ldms-notification-header {
          padding: 12px;
          font-weight: 700;
          font-size: 14px;
          background: var(--ldms-red-light);
          color: var(--ldms-red);
        }

        .ldms-notification-item {
          padding: 10px 12px;
          font-size: 13px;
          border-top: 1px solid #f3f4f6;
          color: var(--ldms-text-dark);
          transition: background 0.15s ease;
        }

        .ldms-notification-item:hover {
          background: #fff5f5;
        }

        /* User */
        .ldms-user-wrapper {
          position: relative;
        }

        .ldms-user-info {
          display: flex;
          align-items: center;
          gap: 10px;
          background: transparent;
          border: none;
          cursor: pointer;
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
        }

        .ldms-user-menu {
          position: absolute;
          right: 0;
          top: 44px;
          background: #ffffff;
          border: 1px solid var(--ldms-border);
          border-radius: 10px;
          box-shadow: 0 14px 36px rgba(0,0,0,0.16);
          overflow: hidden;
          z-index: 100;
        }

        .ldms-logout-btn {
          width: 100%;
          padding: 10px 14px;
          background: #ffffff;
          border: none;
          color: var(--ldms-red);
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .ldms-logout-btn:hover {
          background: var(--ldms-red-light);
        }
      `}</style>
    </header>
  );
}
