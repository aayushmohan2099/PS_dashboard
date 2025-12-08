// src/components/layout/TopNav.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function TopNav({ left = null, right = null }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // try to read cached geoscope for contextual title
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
    logout(); // clears tokens + user + geoscope
    navigate("/login");
  };

  return (
    <header className="topnav">
      <div className="topnav-left">
        {left || <div className="app-title">Pragati Setu — Dashboard</div>}
        {scopeLabel && (
          <div style={{ marginLeft: 12, fontSize: 13, color: "#666" }}>
            {scopeLabel}
          </div>
        )}
      </div>

      <div className="topnav-right">
        {right || (
          <>
            <div
              className="topnav-user"
              style={{ marginRight: 12, fontWeight: 500 }}
            >
              {user?.full_name || user?.username || "User"}
            </div>

            <button
              className="btn btn-ghost"
              onClick={handleLogout}
              title="Logout"
              style={{ color: "#d9534f", fontWeight: 600 }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
