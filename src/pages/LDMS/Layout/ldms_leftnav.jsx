// src/pages/LDMS/Layout/ldms_leftnav.jsx
import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import logo from "../../../assets/LDMS/logo.png";
import {
  FaTachometerAlt,
  FaUsers,
  FaChartBar,
  FaBook,
  FaHandsHelping,
  FaDatabase,
  FaAddressBook,
} from "react-icons/fa";

/**
 * LDMS Left Navigation
 * - Fully responsive
 * - Layout-aware (no fixed positioning)
 * - Icon-only when collapsed
 */

const MENU = {
  bmmu: [
    { label: "Dashboard", to: "/ldms/bmmu/dashboard", icon: FaTachometerAlt },
    { label: "Meetings", to: "/ldms/bmmu/blcc-meetings", icon: FaUsers },
    {
      label: "Demand Analytics",
      to: "/ldms/demand-analytics",
      icon: FaChartBar,
    },
    { label: "Scheme Dictionary", to: "/ldms/scheme-dictionary", icon: FaBook },
    {
      label: "Support Mapping",
      to: "/ldms/support-capture",
      icon: FaHandsHelping,
    },
    {
      label: "Support Bucket List",
      to: "/ldms/support-map-list",
      icon: FaAddressBook,
    },
    { label: "PLD Database", to: "/ldms/supported-pld-list", icon: FaDatabase },
  ],
  dmmu: [
    { label: "Dashboard", to: "/ldms/dmmu/dashboard", icon: FaTachometerAlt },
    { label: "Meetings", to: "#", icon: FaUsers },
    { label: "Demand Analytics", to: "#", icon: FaChartBar },
    { label: "Scheme Dictionary", to: "#", icon: FaBook },
    {
      label: "Support Bucket List",
      to: "/ldms/support-map-list",
      icon: FaAddressBook,
    },
    { label: "Support benefit Extension", to: "#", icon: FaHandsHelping },
    { label: "PLD Database", to: "/ldms/supported-pld-list", icon: FaDatabase },
  ],
  smmu: [
    { label: "Dashboard", to: "/ldms/smmu/dashboard", icon: FaTachometerAlt },
    {
      label: "Support Bucket List",
      to: "/ldms/support-map-list",
      icon: FaAddressBook,
    },
    { label: "Support benefit Extension", to: "#", icon: FaHandsHelping },
    { label: "PLD Database", to: "/ldms/supported-pld-list", icon: FaDatabase },
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
      {/* LOGO
      <div className="ldms-logo" onClick={() => navigate("/dashboard")}>
        <img src={logo} alt="LDMS" />
        <span className="logo-text">Benefica</span>
      </div> */}

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
            <span className="nav-icon">
              <item.icon size={20} />
            </span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* TOGGLE */}
      <button className="ldms-toggle" onClick={onToggle}>
        {collapsed ? "→" : "←"}
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
          overflow: hidden; 
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
          white-space: nowrap;
        }

        .ldms-logo img {
          height: 45px;
          width: auto;
        }

        .logo-text {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .ldms-leftnav.collapsed .logo-text {
          opacity: 0;
          transform: translateX(-8px);
          pointer-events: none;
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
          white-space: nowrap;
        }

        .ldms-nav-item .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #c62828;
          flex-shrink: 0;
        }

        /* Label animation */
        .nav-label {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .ldms-leftnav.collapsed .nav-label {
          opacity: 0;
          width: 0;
          overflow: hidden;
          margin: 0;
          padding: 0;
          pointer-events: none;
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
          color: #fff;
        }
        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          color: #c62828;
          transition: color 0.2s ease;
        }

        .ldms-nav-item.active .nav-icon {
          color: #ffffff;
        }

        /* Center icon when collapsed */
        .ldms-leftnav.collapsed .ldms-nav-item {
          justify-content: center;
          padding: 10px 0;
          gap: 0;
        }

        .ldms-leftnav.collapsed .nav-icon {
          margin: 0 auto;
        }          
      `}</style>
    </aside>
  );
}
