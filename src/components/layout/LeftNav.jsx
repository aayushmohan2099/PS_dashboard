// src/components/Layout/DashboardLeftNav.jsx
import React, { useContext, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { getCanonicalRole } from "../../utils/roleUtils";
import logo from "../../assets/PS_LOGO.jpg";

import {
  FaHome,
  FaChalkboardTeacher,
  FaChartLine,
  FaUsers,
  FaStore,
} from "react-icons/fa";

function classNames(...args) {
  return args.filter(Boolean).join(" ");
}

/* -------------------------------------------------
   ROLE → ROUTES
-------------------------------------------------- */
const ROLE_TMS_ROUTE = {
  bmmu: "/tms/bmmu/dashboard",
  dmmu: "/tms/dmmu/dashboard",
  smmu: "/tms/smmu/dashboard",
  training_partner: "/tms/tp/dashboard",
  master_trainer: "/tms/mt/dashboard",
  tp_contact_person: "/tms/cp/dashboard",
  default: "/tms",
};

const ROLE_LDMS_ROUTE = {
  bmmu: "/ldms/bmmu/dashboard",
  dmmu: "/ldms/dmmu/dashboard",
  smmu: "/ldms/smmu/dashboard",
  default: "/ldms",
};

/* -------------------------------------------------
   MENU STRUCTURE
-------------------------------------------------- */
const MENU = [
  {
    key: "beneficiary",
    label: "Beneficiary Management",
    icon: FaUsers,
    to: "/dashboard",
    roles: ["bmmu", "dmmu", "smmu"],
  },
  {
    key: "tms",
    label: "Training Management",
    icon: FaChalkboardTeacher,
    resolveRoute: (roleKey) =>
      ROLE_TMS_ROUTE[roleKey] || ROLE_TMS_ROUTE.default,
  },
  {
    key: "ldms",
    label: "Lakhpati Didi & Analytics",
    icon: FaChartLine,
    resolveRoute: (roleKey) =>
      ROLE_LDMS_ROUTE[roleKey] || ROLE_LDMS_ROUTE.default,
  },
  {
    key: "epsakhi",
    label: "EP-Sakhi",
    icon: FaHome,
    to: "/dashboard",
  },
  {
    key: "ecommerce",
    label: "E-Commerce",
    icon: FaStore,
    to: "/dashboard",
  },
];

export default function DashboardLeftNav() {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  /* Resolve role */
  let roleKey = "";
  try {
    roleKey = getCanonicalRole(user);
  } catch {
    roleKey = "";
  }

  function handleNav(item) {
    if (item.resolveRoute) {
      navigate(item.resolveRoute(roleKey));
    } else if (item.to) {
      navigate(item.to);
    }
  }

  return (
    <aside className={`dashboard-leftnav ${collapsed ? "collapsed" : ""}`}>
      {/* HEADER */}
      <div className="dash-logo" onClick={() => navigate("/dashboard")}>
        <img className="logo-image" src={logo} alt="PRAGATI-SETU" />
      </div>

      {/* NAV */}
      <nav className="dash-nav">
        {MENU.map((item) => {
          if (item.roles && !item.roles.includes(roleKey)) return null;

          const to = item.resolveRoute
            ? item.resolveRoute(roleKey)
            : item.to;

          return (
            <NavLink
              key={item.key}
              to={to}
              className={({ isActive }) =>
                classNames(
                  "dash-nav-item",
                  isActive || location.pathname === to ? "active" : ""
                )
              }
              onClick={() => handleNav(item)}
            >
              <span className="nav-icon">
                <item.icon size={20} />
              </span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* TOGGLE */}
      <button
        className="dash-toggle"
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? "→" : "←"}
      </button>

      {/* STYLES */}
      <style>{`
        .dashboard-leftnav {
          width: 220px;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          transition: width 0.25s ease;
          overflow: hidden;
          position: relative;
        }

        .dashboard-leftnav.collapsed {
          width: 64px;
        }

        /* HEADER */
        .dash-logo {
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid #f1f5f9;
          font-weight: 800;
          color: #010433;
          cursor: pointer;
          white-space: nowrap;
        }

        .logo-image {
          max-height: 40px;
          max-width: 70px;
        }

        .dash-title {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .dashboard-leftnav.collapsed .dash-title {
          opacity: 0;
          transform: translateX(-8px);
          pointer-events: none;
        }

        /* NAV */
        .dash-nav {
          flex: 1;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }

        .dash-nav-item {
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

        .dash-nav-item:hover {
          background: #fdecea;
        }

        .dash-nav-item.active {
          background: #080133;
          color: #ffffff;
        }

        .nav-icon {
          min-width: 20px;
          color: #01062e;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dash-nav-item.active .nav-icon {
          color: #ffffff;
        }

        .nav-label {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .dashboard-leftnav.collapsed .nav-label {
          opacity: 0;
          width: 0;
          overflow: hidden;
          pointer-events: none;
        }

        /* TOGGLE */
        .dash-toggle {
        height: 40px;
        border: none;
        background: #133074;
        color: #ffffff;
        font-size: 14px;
        cursor: pointer;

        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;

        border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </aside>
  );
}
