// src/pages/TMS/layout/tms_LeftNav.jsx
import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";
import logo from "../../../assets/TMS/tms_logo.png";
import {
  FaTachometerAlt,
  FaUsers,
  FaChartBar,
  FaBook,
  FaHandsHelping,
  FaDatabase,
  FaAddressBook,
  FaClipboardCheck,
  FaBullseye,
  FaBookDead,
  FaIndustry,
  FaBuilding,
  FaChalkboardTeacher,
  FaUserCheck,
  FaUserEdit,
} from "react-icons/fa";

/**
 * TMS Left Navigation
 * - Fully responsive
 * - Layout-aware (no fixed positioning)
 * - Icon-only when collapsed
 */

const MENU = {
  bmmu: [
    { label: "Dashboard", to: "/tms/bmmu/dashboard", icon: FaTachometerAlt },
    {
      label: "Create Training Request",
      to: "/tms/create-training-request",
      icon: FaBookDead,
    },
    {
      label: "Training Requests",
      to: "/tms/training-requests",
      icon: FaChartBar,
    },
    {
      label: "Propose Training Plan",
      to: "/tms/tms/bmmu/create-training-plan",
      icon: FaBook,
    },
    {
      label: "Training Batches",
      to: "/tms/batches-list/",
      icon: FaBook,
    },
    { label: "Reports", to: "#", icon: FaClipboardCheck },
  ],
  dmmu: [
    { label: "Dashboard", to: "/tms/dmmu/dashboard", icon: FaTachometerAlt },
    {
      label: "Create Training Request",
      to: "/tms/create-training-request",
      icon: FaBookDead,
    },
    {
      label: "Training Requests",
      to: "/tms/training-requests",
      icon: FaChartBar,
    },
    {
      label: "Training Batches",
      to: "/tms/batches-list/",
      icon: FaBook,
    },
    { label: "Reports", to: "#", icon: FaClipboardCheck },
  ],
  smmu: [
    { label: "Dashboard", to: "/tms/smmu/dashboard", icon: FaTachometerAlt },
    {
      label: "Target Assignment",
      to: "/tms/smmu/partner-targets",
      icon: FaBullseye,
    },
    {
      label: "Training Requests",
      to: "/tms/training-requests",
      icon: FaChartBar,
    },
    {
      label: "Training Batches",
      to: "/tms/batches-list/",
      icon: FaBook,
    },
    { label: "Reports", to: "#", icon: FaClipboardCheck },
  ],
  training_partner: [
    {
      label: "Dashboard",
      to: "/tms/tp/dashboard",
      icon: FaTachometerAlt,
    },
    {
      label: "Centre Management",
      to: "/tms/tp/centre-list",
      icon: FaIndustry,
    },
    {
      label: "Register New Centre",
      to: "/tms/tp/centre/new",
      icon: FaBuilding,
    },
    {
      label: "Training Requests",
      to: "/tms/training-requests",
      icon: FaChartBar,
    },
    {
      label: "Training Batches",
      to: "/tms/batches-list/",
      icon: FaBook,
    },
    {
      label: "Contact Persons",
      to: "/tms/tp/cp-list",
      icon: FaUsers,
    },
    {
      label: "Register Contact Persons",
      to: "/tms/tp/cp/create",
      icon: FaUserEdit,
    },
    {
      label: "Assign Contact Persons",
      to: "/tms/tp/cp/assign",
      icon: FaUserCheck,
    },
  ],
  master_trainer: [
    {
      label: "Dashboard",
      to: "/tms/mt/dashboard",
      icon: FaTachometerAlt,
    },
  ],
  tp_contact_person: [
    {
      label: "Dashboard",
      to: "/tms/cp/dashboard",
      icon: FaTachometerAlt,
    },
    {
      label: "Training Batches",
      to: "/tms/cp/batch-list",
      icon: FaBook,
    },
  ],
  state_admin: [
    {
      label: "Dashboard",
      to: "/tms/state-admin/dashboard",
      icon: FaTachometerAlt,
    },
  ],
  pmu_admin: [
    {
      label: "Dashboard",
      to: "/tms/pmu-admin/dashboard",
      icon: FaTachometerAlt,
    },
  ],
};

function getRoleKey(user) {
  const id = Number(user?.role_id ?? user?.role);
  if (id === 1) return "bmmu";
  if (id === 2) return "dmmu";
  if (id === 3) return "smmu";
  if (id === 4) return "training_partner";
  if (id === 7) return "master_trainer";
  if (id === 8) return "state_admin";
  if (id === 9) return "pmu_admin";
  if (id === 11) return "tp_contact_person";
  return "bmmu";
}

export default function TmsLeftNav({ collapsed, onToggle }) {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const roleKey = getRoleKey(user);
  const menu = MENU[roleKey] || [];

  return (
    <aside className={`tms-leftnav ${collapsed ? "collapsed" : ""}`}>
      {/* LOGO */}
      <div className="tms-logo" onClick={() => navigate("/dashboard")}>
        <img src={logo} alt="TMS" />
        <span className="logo-text">Training Management System</span>
      </div>

      {/* NAV */}
      <nav className="tms-nav">
        {menu.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              "tms-nav-item" + (isActive ? " active" : "")
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
      <button className="tms-toggle" onClick={onToggle}>
        {collapsed ? "→" : "←"}
      </button>

      {/* STYLES */}
      <style>{`
        .tms-leftnav {
          width: 220px;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          transition: width 0.25s ease;
          overflow: hidden; 
        }

        .tms-leftnav.collapsed {
          width: 64px;
        }

        /* Logo */
        .tms-logo {
          height: 56px;
          display: flex;
          justify-content: center;
          gap: 10px;
          border-bottom: 1px solid #e5e7eb;
          cursor: pointer;
          font-weight: 700;
          font-size: 15px;
          color: #061b46;
          text-wrap: wrap;
        }

        .tms-logo img {
          height: 56px;
          width: auto;
        }

        .logo-text {
          transition: opacity 0.2s ease, transform 0.2s ease;
          align-self: center;
        }

        .tms-leftnav.collapsed .logo-text {
          display: none;
        }

        /* Nav */
        .tms-nav {
          flex: 1;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }

        .tms-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          text-decoration: none;
          color: #061b46;;
          font-size: 14px;
          transition: background 0.2s ease;
          white-space: nowrap;
        }

        .tms-nav-item .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #061b46;;
          flex-shrink: 0;
        }

        /* Label animation */
        .nav-label {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .tms-leftnav.collapsed .nav-label {
          opacity: 0;
          width: 0;
          overflow: hidden;
          margin: 0;
          padding: 0;
          pointer-events: none;
        }

        .tms-nav-item:hover {
          background: #fdecea;
        }

        .tms-nav-item.active {
          background: #061b46;
          color: #ffffff;
        }

        .tms-nav-item.active .dot {
          background: #ffffff;
        }

        /* Toggle */
        .tms-toggle {
          height: 40px;
          border: none;
          background: #061b46;
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
          color: #061b46;
          transition: color 0.2s ease;
        }

        .tms-nav-item.active .nav-icon {
          color: #ffffff;
        }

        /* Center icon when collapsed */
        .tms-leftnav.collapsed .tms-nav-item {
          justify-content: center;
          padding: 10px 0;
          gap: 0;
        }

        .tms-leftnav.collapsed .nav-icon {
          margin: 0 auto;  
        }          
          
        .tms-leftnav.collapsed .tms-logo {
          justify-content: center;
          padding: 0;
        }

        .tms-leftnav.collapsed .tms-logo img {
          margin: 0 auto;
          display: block;
        }          
      `}</style>
    </aside>
  );
}
