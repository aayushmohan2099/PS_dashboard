// src/pages/TMS/layout/tms_LeftNav.jsx
import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";

// -----------------------------
// Helpers
// -----------------------------

function normalizeRoleName(raw) {
  if (!raw) return "";
  const v = String(raw).toLowerCase();

  if (v.startsWith("bmmu")) return "bmmu";
  if (v.startsWith("dmmu")) return "dmmu";
  if (v.includes("smmu") || v.includes("state_mission")) return "smmu";

  if (v.includes("training_partner")) return "training_partner";
  if (v.includes("master_trainer")) return "master_trainer";

  // contact person / CP etc.
  if (v.includes("contact_person") || v.includes("contact person") || v.includes("cp_")) {
    return "contact_person";
  }

  // CRP roles – treat as contact person for TMS perspective
  if (v.includes("crp_ep") || v.includes("crp-ep")) return "contact_person";
  if (v.includes("crp_ld") || v.includes("crp-ld")) return "contact_person";

  return v;
}

// Role → menu config
const MENU_CONFIG = {
  bmmu: [
    {
      label: "TMS Dashboard",
      to: "/tms/bmmu/dashboard",
      key: "bmmu-dashboard",
    },
    {
      label: "Training Requests",
      to: "/tms/bmmu/requests",
      key: "bmmu-requests",
    },
    {
      label: "Batches & Schedules",
      to: "/tms/bmmu/batches",
      key: "bmmu-batches",
    },
    {
      label: "Attendance & Completion",
      to: "/tms/bmmu/attendance",
      key: "bmmu-attendance",
    },
    {
      label: "Reports",
      to: "/tms/bmmu/reports",
      key: "bmmu-reports",
    },
  ],

  dmmu: [
    {
      label: "District TMS Dashboard",
      to: "/tms/dmmu/dashboard",
      key: "dmmu-dashboard",
    },
    {
      label: "Block-wise Progress",
      to: "/tms/dmmu/block-progress",
      key: "dmmu-block-progress",
    },
    {
      label: "Training Batches",
      to: "/tms/dmmu/batches",
      key: "dmmu-batches",
    },
    {
      label: "Attendance Aggregation",
      to: "/tms/dmmu/attendance",
      key: "dmmu-attendance",
    },
    {
      label: "Reports",
      to: "/tms/dmmu/reports",
      key: "dmmu-reports",
    },
  ],

  smmu: [
    {
      label: "State TMS Dashboard",
      to: "/tms/smmu/dashboard",
      key: "smmu-dashboard",
    },
    {
      label: "District-wise Progress",
      to: "/tms/smmu/district-progress",
      key: "smmu-district-progress",
    },
    {
      label: "All Training Batches",
      to: "/tms/smmu/batches",
      key: "smmu-batches",
    },
    {
      label: "Monitoring & Evaluation",
      to: "/tms/smmu/monitoring",
      key: "smmu-monitoring",
    },
    {
      label: "State Reports",
      to: "/tms/smmu/reports",
      key: "smmu-reports",
    },
  ],

  training_partner: [
    {
      label: "Partner Dashboard",
      to: "/tms/tp/dashboard",
      key: "tp-dashboard",
    },
    {
      label: "My Batches",
      to: "/tms/tp/batches",
      key: "tp-batches",
    },
    {
      label: "Trainers",
      to: "/tms/tp/trainers",
      key: "tp-trainers",
    },
    {
      label: "Attendance Entry",
      to: "/tms/tp/attendance",
      key: "tp-attendance",
    },
    {
      label: "Uploads & Docs",
      to: "/tms/tp/uploads",
      key: "tp-uploads",
    },
  ],

  master_trainer: [
    {
      label: "MT Dashboard",
      to: "/tms/mt/dashboard",
      key: "mt-dashboard",
    },
    {
      label: "Assigned Batches",
      to: "/tms/mt/batches",
      key: "mt-batches",
    },
    {
      label: "Attendance / Assessments",
      to: "/tms/mt/attendance",
      key: "mt-attendance",
    },
    {
      label: "Resources",
      to: "/tms/mt/resources",
      key: "mt-resources",
    },
  ],

  contact_person: [
    {
      label: "CP Dashboard",
      to: "/tms/cp/dashboard",
      key: "cp-dashboard",
    },
    {
      label: "My Beneficiaries",
      to: "/tms/cp/beneficiaries",
      key: "cp-beneficiaries",
    },
    {
      label: "Training Batches",
      to: "/tms/cp/batches",
      key: "cp-batches",
    },
    {
      label: "Attendance Entry",
      to: "/tms/cp/attendance",
      key: "cp-attendance",
    },
  ],
};

// Fallback if role not in the map
const DEFAULT_MENU = [
  {
    label: "TMS Dashboard",
    to: "/tms",
    key: "generic-dashboard",
  },
  {
    label: "Training Batches",
    to: "/tms/batches",
    key: "generic-batches",
  },
  {
    label: "Attendance",
    to: "/tms/attendance",
    key: "generic-attendance",
  },
  {
    label: "Reports",
    to: "/tms/reports",
    key: "generic-reports",
  },
];

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export default function TmsLeftNav() {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  // derive role from user / geoscope cache
  let rawRole = user?.role_name || user?.role || "";

  try {
    const geo = JSON.parse(
      window.localStorage.getItem("ps_user_geoscope") || "null"
    );
    if (geo?.role && !rawRole) {
      rawRole = geo.role;
    }
  } catch {
    // ignore parse issues
  }

  const normRole = normalizeRoleName(rawRole);
  const menu = MENU_CONFIG[normRole] || DEFAULT_MENU;

  let roleLabel = "";
  switch (normRole) {
    case "bmmu":
      roleLabel = "BMMU – Block Level";
      break;
    case "dmmu":
      roleLabel = "DMMU – District Level";
      break;
    case "smmu":
      roleLabel = "SMMU – State Level";
      break;
    case "training_partner":
      roleLabel = "Training Partner";
      break;
    case "master_trainer":
      roleLabel = "Master Trainer";
      break;
    case "contact_person":
      roleLabel = "Contact Person";
      break;
    default:
      roleLabel = "TMS User";
  }

  const renderItem = (item) => (
    <NavLink
      key={item.key}
      to={item.to}
      className={({ isActive }) =>
        "ln-item" + (isActive ? " active" : "")
      }
    >
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <aside className="leftnav tms-leftnav">
      {/* Logo / title */}
      <div
        className="ln-logo"
        onClick={() => navigate("/dashboard")}
        style={{ cursor: "pointer" }}
      >
        <div className="ln-logo-title">Pragati Setu</div>
        <div className="ln-logo-subtitle">
          Training Management System
        </div>
        <div className="ln-logo-badge">{roleLabel}</div>
      </div>

      {/* TMS navigation */}
      <nav className="ln-menu">
        <div className="ln-group">
          <div className="ln-group-header">
            <span>TMS Navigation</span>
          </div>
          <div className="ln-submenu show">
            {menu.map((item) => renderItem(item))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
