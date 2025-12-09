// src/pages/TMS/layout/tms_LeftNav.jsx
import React, { useContext, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../contexts/AuthContext";

/**
 * TMS Left Nav — role aware
 * Uses numeric role ids first (from login response), then falls back to role_name or geoscope.
 *
 * This version is fixed-position and small-width; it applies a matching left-margin
 * to the main-area to avoid compressing the header/content.
 */

// map numeric role id -> canonical key
const ROLE_ID_MAP = {
  1: "bmmu",
  2: "dmmu",
  3: "smmu",
  4: "training_partner",
  5: "crp_ld",
  6: "crp_ep",
  7: "master_trainer",
  8: "state_admin",
  9: "pmu_admin",
  10: "dcnrlm",
  11: "tp_contact_person",
};

function getRoleKey(user) {
  if (!user) return "";

  const id = Number(user.role_id ?? user.role);
  if (!Number.isNaN(id) && ROLE_ID_MAP[id]) return ROLE_ID_MAP[id];

  if (user.role_name) {
    const rn = String(user.role_name).toLowerCase();
    if (rn.includes("bmmu")) return "bmmu";
    if (rn.includes("dmmu")) return "dmmu";
    if (rn.includes("smmu") || rn.includes("state_mission")) return "smmu";
    if (rn.includes("training_partner")) return "training_partner";
    if (rn.includes("master_trainer")) return "master_trainer";
    if (rn.includes("dcnrlm")) return "dcnrlm";
    if (rn.includes("contact") || rn.includes("tp_cp") || rn.includes("tp_contact")) return "tp_contact_person";
    if (rn.includes("crp_ep")) return "crp_ep";
    if (rn.includes("crp_ld")) return "crp_ld";
  }

  try {
    const geo = JSON.parse(window.localStorage.getItem("ps_user_geoscope") || "null");
    if (geo?.role) {
      const g = String(geo.role).toLowerCase();
      if (g.includes("bmmu")) return "bmmu";
      if (g.includes("dmmu")) return "dmmu";
      if (g.includes("smmu") || g.includes("state_mission")) return "smmu";
      if (g.includes("training_partner")) return "training_partner";
      if (g.includes("master_trainer")) return "master_trainer";
      if (g.includes("dcnrlm")) return "dcnrlm";
      if (g.includes("contact") || g.includes("tp_cp") || g.includes("tp_contact")) return "tp_contact_person";
    }
  } catch (e) {
    // ignore
  }

  return "";
}

function renderNavItem(item) {
  return (
    <NavLink
      key={item.key}
      to={item.to}
      className={({ isActive }) => "ln-item" + (isActive ? " active" : "")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 6,
        textDecoration: "none",
        color: "#0b2540",
      }}
    >
      <span style={{ fontSize: 14 }}>{item.label}</span>
    </NavLink>
  );
}

const MENU = {
  bmmu: [
    { label: "TMS Dashboard", to: "/tms/bmmu/dashboard", key: "bmmu-dashboard" },
    { label: "Create Training Request", to: "/tms/bmmu/create-tr", key: "bmmu-create-tr" },
    { label: "Training Plans", to: "/tms/training-plans", key: "bmmu-training-plans" },
    { label: "Master Trainers (Block)", to: "/tms/bmmu/master-trainers", key: "bmmu-mt" },
    { label: "Training Requests", to: "/tms/bmmu/requests", key: "bmmu-requests" },
    { label: "Batches & Schedules", to: "/tms/bmmu/batches", key: "bmmu-batches" },
    { label: "Attendance & Completion", to: "/tms/bmmu/attendance", key: "bmmu-attendance" },
    { label: "Reports", to: "/tms/bmmu/reports", key: "bmmu-reports" },
  ],

  dmmu: [
    { label: "TMS Dashboard", to: "/tms/dmmu/dashboard", key: "dmmu-dashboard" },
    { label: "Create / Review TRs", to: "/tms/dmmu/requests", key: "dmmu-requests" },
    { label: "Block-wise Progress", to: "/tms/dmmu/block-progress", key: "dmmu-block-progress" },
    { label: "Assign Master Trainers", to: "/tms/dmmu/assign-mt", key: "dmmu-assign-mt" },
    { label: "Training Batches", to: "/tms/dmmu/batches", key: "dmmu-batches" },
    { label: "Attendance Aggregation", to: "/tms/dmmu/attendance", key: "dmmu-attendance" },
    { label: "Reports", to: "/tms/dmmu/reports", key: "dmmu-reports" },
  ],

  smmu: [
    { label: "TMS Dashboard", to: "/tms/smmu/dashboard", key: "smmu-dashboard" },
    { label: "Create Partner Targets", to: "/tms/smmu/partner-targets", key: "smmu-targets" },
    { label: "Training Plans & Themes", to: "/tms/training-plans", key: "smmu-plans" },
    { label: "All Training Batches", to: "/tms/smmu/batches", key: "smmu-batches" },
    { label: "Monitoring & Evaluation", to: "/tms/smmu/monitoring", key: "smmu-monitoring" },
    { label: "State Reports", to: "/tms/smmu/reports", key: "smmu-reports" },
  ],

  training_partner: [
    { label: "Partner Dashboard", to: "/tms/tp/dashboard", key: "tp-dashboard" },
    { label: "My Training Requests", to: "/tms/tp/requests", key: "tp-requests" },
    { label: "Create / Manage Centres", to: "/tms/tp/centres", key: "tp-centres" },
    { label: "Contact Persons (CP)", to: "/tms/tp/contact-persons", key: "tp-cps" },
    { label: "Create Batch", to: "/tms/tp/create-batch", key: "tp-create-batch" },
    { label: "Uploads & Closure", to: "/tms/tp/closures", key: "tp-closures" },
    { label: "Reports", to: "/tms/tp/reports", key: "tp-reports" },
  ],

  master_trainer: [
    { label: "MT Dashboard", to: "/tms/mt/dashboard", key: "mt-dashboard" },
    { label: "Assigned Batches", to: "/tms/mt/batches", key: "mt-batches" },
    { label: "Attendance / Assessments", to: "/tms/mt/attendance", key: "mt-attendance" },
    { label: "Profile & Availability", to: "/tms/mt/profile", key: "mt-profile" },
  ],

  contact_person: [
    { label: "CP Dashboard", to: "/tms/cp/dashboard", key: "cp-dashboard" },
    { label: "My Assigned Centres", to: "/tms/cp/centres", key: "cp-centres" },
    { label: "Batch Attendance", to: "/tms/cp/attendance", key: "cp-attendance" },
    { label: "Participant EKYC", to: "/tms/cp/ekyc", key: "cp-ekyc" },
  ],
};

const DEFAULT_MENU = [
  { label: "TMS Home", to: "/tms", key: "tms-home" },
  { label: "Training Plans", to: "/tms/training-plans", key: "tms-plans" },
  { label: "Training Themes", to: "/tms/training-themes", key: "tms-themes" },
  { label: "Training Requests", to: "/tms/training-requests", key: "tms-requests" },
  { label: "Reports", to: "/tms/reports", key: "tms-reports" },
];

export default function TmsLeftNav() {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const roleKey = getRoleKey(user);
  const menu = MENU[roleKey] || DEFAULT_MENU;

  const roleLabel =
    roleKey === "bmmu"
      ? "BMMU"
      : roleKey === "dmmu"
      ? "DMMU"
      : roleKey === "smmu"
      ? "SMMU"
      : roleKey === "training_partner"
      ? "Training Partner"
      : roleKey === "master_trainer"
      ? "Master Trainer"
      : roleKey === "tp_contact_person" || roleKey === "contact_person"
      ? "Contact Person"
      : "TMS User";

  // final width used by nav (px)
  const NAV_WIDTH = 220;

  // apply margin to main area so header/content aren't smushed
  useEffect(() => {
    const mainArea = document.querySelector(".main-area");
    const appShell = document.querySelector(".app-shell");
    const originalMainMarginLeft = mainArea ? mainArea.style.marginLeft : null;
    const originalAppPaddingLeft = appShell ? appShell.style.paddingLeft : null;

    // nav is fixed; push main area right by NAV_WIDTH
    if (mainArea) {
      mainArea.style.marginLeft = `${NAV_WIDTH}px`;
    }
    // as fallback, also apply small padding to app shell
    if (appShell) {
      appShell.style.paddingLeft = "";
    }

    return () => {
      if (mainArea) mainArea.style.marginLeft = originalMainMarginLeft || "";
      if (appShell) appShell.style.paddingLeft = originalAppPaddingLeft || "";
    };
  }, []);

  // compact styles to reduce left nav footprint and beautify
  const asideStyle = {
    width: NAV_WIDTH,
    minWidth: NAV_WIDTH,
    position: "fixed",
    left: 0,
    top: 0,
    height: "100vh",
    background: "#ffffff",
    borderRight: "1px solid #eef2f6",
    padding: "12px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    zIndex: 30,
    overflowY: "auto",
  };

  const logoStyle = {
    padding: "10px 8px",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    background: "#fbfdff",
    alignItems: "flex-start",
  };

  const logoTitle = { fontSize: 16, fontWeight: 700, color: "#0b2540" };
  const logoSub = { fontSize: 12, color: "#6c757d" };
  const logoBadge = { marginTop: 6, background: "#eef6ff", color: "#0b2540", fontSize: 11, padding: "4px 6px", borderRadius: 6 };

  const groupHeaderStyle = { fontSize: 12, color: "#6b7280", fontWeight: 600, padding: "6px 4px" };
  const submenuStyle = { display: "flex", flexDirection: "column", gap: 6, padding: "6px 2px" };

  return (
    <aside className="leftnav tms-leftnav" style={asideStyle}>
      <div style={logoStyle} onClick={() => navigate("/dashboard")}>
        <div style={logoTitle}>Pragati Setu</div>
        <div style={logoSub}>Training Management</div>
        <div style={logoBadge}>{roleLabel}</div>
      </div>

      <nav className="ln-menu" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(roleKey === "bmmu" || roleKey === "dmmu" || roleKey === "smmu") && (
          <div className="ln-group">
            <div className="ln-group-header" style={groupHeaderStyle}>
              <span>Beneficiary Management</span>
            </div>
            <div className="ln-submenu show" style={submenuStyle}>
              <NavLink to="/dashboard" className="ln-item" style={{ textDecoration: "none", color: "#0b2540", padding: "8px 10px", borderRadius: 6 }}>
                <span style={{ fontSize: 14 }}>Dashboard Home</span>
              </NavLink>
            </div>
          </div>
        )}

        <div className="ln-group">
          <div className="ln-group-header" style={groupHeaderStyle}>
            <span>TMS Navigation</span>
          </div>
          <div className="ln-submenu show" style={submenuStyle}>
            {menu.map((item) => renderNavItem(item))}
          </div>
        </div>

        <div className="ln-group" style={{ marginTop: "auto" }}>
          <div className="ln-group-header" style={groupHeaderStyle}>
            <span>Quick Actions</span>
          </div>
          <div className="ln-submenu show" style={submenuStyle}>
            <NavLink to="/tms/training-plans" className="ln-item" style={{ textDecoration: "none", color: "#0b2540", padding: "8px 10px", borderRadius: 6 }}>
              <span style={{ fontSize: 14 }}>Training Plans</span>
            </NavLink>
            <NavLink to="/tms/training-themes" className="ln-item" style={{ textDecoration: "none", color: "#0b2540", padding: "8px 10px", borderRadius: 6 }}>
              <span style={{ fontSize: 14 }}>Training Themes</span>
            </NavLink>
            <NavLink to="/tms/training-requests" className="ln-item" style={{ textDecoration: "none", color: "#0b2540", padding: "8px 10px", borderRadius: 6 }}>
              <span style={{ fontSize: 14 }}>All Requests</span>
            </NavLink>
          </div>
        </div>
      </nav>
    </aside>
  );
}
