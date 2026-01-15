import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import logo from "../../../assets/LDMS/logo.png";

/**
 * LDMS Left Navigation
 * - Fully responsive
 * - Layout-aware (no fixed positioning)
 * - Icon-only when collapsed
 */

const MENU = {
  bmmu: [
    { label: "Dashboard", to: "/ldms/bmmu/dashboard" },
    { label: "Meetings", to: "#" },
    { label: "Demand Analytics", to: "#" },
    { label: "Support Mapping", to: "#" },
  ],
};

function getRoleKey(user) {
  const id = Number(user?.role_id ?? user?.role);
  if (id === 1) return "bmmu";
  if (id === 2) return "dmmu";
  if (id === 3) return "smmu";
  return "bmmu";
}

export default function LdmsLeftNav({ collapsed, onToggle }) {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const roleKey = getRoleKey(user);
  const menu = MENU[roleKey] || [];

  return (
    <aside className={`ldms-leftnav ${collapsed ? "collapsed" : ""}`}>
      {/* LOGO */}
      <div className="ldms-logo" onClick={() => navigate("/dashboard")}>
        <img src={logo} alt="LDMS" />
        {!collapsed && <span> Back to Home</span>}
      </div>

      {/* NAV */}
      <nav className="ldms-nav">
        {menu.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              "ldms-nav-item" + (isActive ? " active" : "")
            }
          >
            <span className="dot" />
            {!collapsed && item.label}
          </NavLink>
        ))}
      </nav>

      {/* TOGGLE */}
      <button className="ldms-toggle" onClick={onToggle}>
        {collapsed ? "▶" : "◀"}
      </button>

      {/* STYLES */}
      <style>{`
        .ldms-leftnav {
          width: 220px;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          transition: width 0.25s ease;
        }

        .ldms-leftnav.collapsed {
          width: 64px;
        }

        /* Logo */
        .ldms-logo {
          height: 56px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          font-weight: 700;
          color: #c62828;
        }

        .ldms-logo img {
          height: 28px;
          width: auto;
        }

        /* Nav */
        .ldms-nav {
          flex: 1;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }

        .ldms-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          text-decoration: none;
          color: #374151;
          font-size: 14px;
          transition: background 0.2s ease;
        }

        .ldms-nav-item .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #c62828;
          flex-shrink: 0;
        }

        .ldms-nav-item:hover {
          background: #fdecea;
        }

        .ldms-nav-item.active {
          background: #c62828;
          color: #ffffff;
        }

        .ldms-nav-item.active .dot {
          background: #ffffff;
        }

        /* Toggle */
        .ldms-toggle {
          height: 40px;
          border: none;
          background: #c62828;
          border-top: 1px solid #e5e7eb;
          cursor: pointer;
          font-size: 14px;
        }
      `}</style>
    </aside>
  );
}
