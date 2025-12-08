// src/components/layout/TopNav.jsx
import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";

export default function TopNav({ left = null, right = null }) {
  const { user, logout } = useContext(AuthContext) || {};

  // try to read cached geoscope for contextual title / scope
  let geo = null;
  try {
    geo = JSON.parse(localStorage.getItem("ps_user_geoscope") || "null");
  } catch (e) {
    geo = null;
  }

  let scopeLabel = "";
  if (geo) {
    if (
      geo.role === "bmmu" &&
      Array.isArray(geo.blocks) &&
      geo.blocks.length > 0
    ) {
      scopeLabel = `Block: ${geo.blocks[0]}`;
    } else if (
      (geo.role === "dmmu" || geo.role === "dcnrlm") &&
      Array.isArray(geo.districts) &&
      geo.districts.length > 0
    ) {
      scopeLabel = `District: ${geo.districts[0]}`;
    } else if (geo.role) {
      scopeLabel = geo.role.toUpperCase();
    }
  }

  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

  const defaultRight = (
    <>
      <div className="topnav-user">
        {user?.username ? `Hi, ${user.username}` : "Welcome"}
        {scopeLabel && (
          <span
            style={{
              marginLeft: 8,
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            ({scopeLabel})
          </span>
        )}
      </div>
      <button className="btn btn-ghost" onClick={handleLogout}>
        Logout
      </button>
    </>
  );

  return (
    <header className="topnav">
      <div className="topnav-left">
        {left || <div className="app-title">Pragati Setu — Dashboard</div>}
      </div>
      <div className="topnav-right">{right || defaultRight}</div>
    </header>
  );
}
