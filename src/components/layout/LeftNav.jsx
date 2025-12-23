// src/components/layout/LeftNav.jsx
import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

// render TMS left nav when in /tms space
import TmsLeftNav from "../../pages/TMS/layout/tms_LeftNav";

// Use role utils provided in your frontend snapshot
import { getCanonicalRole } from "../../utils/roleUtils";

function classNames(...args) {
  return args.filter(Boolean).join(" ");
}

/**
 * Fallback role mapping (if roleUtils isn't behaving as expected).
 * Keep this in sync with your roles table.
 */
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

function resolveRoleKeyFallback(user) {
  if (!user) return "";

  const maybeRoleId = Number(user.role_id ?? user.role);
  if (!Number.isNaN(maybeRoleId) && ROLE_ID_MAP[maybeRoleId]) {
    return ROLE_ID_MAP[maybeRoleId];
  }

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
    if (rn.includes("state_admin")) return "state_admin";
    if (rn.includes("pmu_admin")) return "pmu_admin";
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
    // ignore parse errors
  }

  return "";
}

/**
 * Map canonical role key -> TMS dashboard route
 */
const ROLE_TMS_ROUTE = {
  bmmu: "/tms/bmmu/dashboard",
  dmmu: "/tms/dmmu/dashboard",
  smmu: "/tms/smmu/dashboard",
  training_partner: "/tms/tp/dashboard",
  master_trainer: "/tms/mt/dashboard",
  tp_contact_person: "/tms/cp/dashboard",
  default: "/tms",
};

export default function LeftNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openGroups, setOpenGroups] = useState({
    beneficiary: true,
    tms: false,
    epsakhi: false,
    lakhpati: false,
    ecommerce: false,
  });

  // If inside /tms path, return the specialized TMS left nav (unchanged)
  if (location.pathname.startsWith("/tms")) {
    return <TmsLeftNav />;
  }

  // Resolve role key using getCanonicalRole; fallback if needed
  let roleKey = "";
  try {
    roleKey = getCanonicalRole ? getCanonicalRole(user) : "";
  } catch (err) {
    roleKey = "";
  }
  if (!roleKey) roleKey = resolveRoleKeyFallback(user);

  // Determine tmsRoute
  let tmsRoute = ROLE_TMS_ROUTE.default;
  if (roleKey && ROLE_TMS_ROUTE[roleKey]) tmsRoute = ROLE_TMS_ROUTE[roleKey];

  function toggleGroup(key) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function renderItem(label, to) {
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          classNames(
            "ln-item",
            isActive || location.pathname === to ? "ln-item-active" : ""
          )
        }
      >
        <span>{label}</span>
      </NavLink>
    );
  }

  return (
    <aside className="left-nav">
      <div className="ln-header">
        <div className="ln-title">Pragati Setu</div>
        <div className="ln-subtitle">{user?.username || user?.first_name || ""}</div>
      </div>

      <nav className="ln-nav">
        {/* ---------------- Beneficiary Management — only for BMMU / DMMU / SMMU ---------------- */}
        {(roleKey === "bmmu" || roleKey === "dmmu" || roleKey === "smmu") && (
          <div className="ln-group">
            <button
              type="button"
              className="ln-group-header"
              onClick={() => toggleGroup("beneficiary")}
              aria-expanded={!!openGroups.beneficiary}
            >
              <span>Beneficiary Management</span>
              <span className="ln-chevron">{openGroups.beneficiary ? "▾" : "▸"}</span>
            </button>
            <div className={classNames("ln-group-body", openGroups.beneficiary ? "open" : "collapsed")}>
              {renderItem("Dashboard Home", "/dashboard")}
            </div>
          </div>
        )}

        {/* ---------------- TMS (only header + single nav to role dashboard) ---------------- */}
        <div className="ln-group">
          <button
            className="ln-group-header"
            onClick={() => {
              // toggle visual open state and navigate to role-specific TMS dashboard
              toggleGroup("tms");
              navigate(tmsRoute);
            }}
            aria-expanded={!!openGroups.tms}
          >
            <span>Training Management</span>
            <span className={`caret ${openGroups.tms ? "open" : ""}`}>▸</span>
          </button>

          {/* only show single link - no submenu items */}
          <div className={`ln-submenu ${openGroups.tms ? "show" : ""}`}>
            <NavLink to={tmsRoute} className="ln-item">
              <span>Go to Training Management</span>
            </NavLink>
          </div>
        </div>

        {/* ---------------- EP-Sakhi & Enterprise Profiling (restored) ---------------- */}
        <div className="ln-group">
          <button
            type="button"
            className="ln-group-header"
            onClick={() => toggleGroup("epsakhi")}
            aria-expanded={!!openGroups.epsakhi}
          >
            <span>EP-Sakhi & Enterprise Profiling</span>
            <span className="ln-chevron">{openGroups.epsakhi ? "▾" : "▸"}</span>
          </button>
          <div className={classNames("ln-group-body", openGroups.epsakhi ? "open" : "collapsed")}>
            {renderItem("Dashboard", "/dashboard")}
          </div>
        </div>

        {/* ---------------- Lakhpati Didi & Analytics (restored) ---------------- */}
        <div className="ln-group">
          <button
            type="button"
            className="ln-group-header"
            onClick={() => toggleGroup("lakhpati")}
            aria-expanded={!!openGroups.lakhpati}
          >
            <span>Lakhpati Didi & Analytics</span>
            <span className="ln-chevron">{openGroups.lakhpati ? "▾" : "▸"}</span>
          </button>
          <div className={classNames("ln-group-body", openGroups.lakhpati ? "open" : "collapsed")}>
            {renderItem("Dashboard", "/dashboard")}
          </div>
        </div>

        {/* ---------------- E-Commerce (restored) ---------------- */}
        <div className="ln-group">
          <button
            type="button"
            className="ln-group-header"
            onClick={() => toggleGroup("ecommerce")}
            aria-expanded={!!openGroups.ecommerce}
          >
            <span>E-Commerce</span>
            <span className="ln-chevron">{openGroups.ecommerce ? "▾" : "▸"}</span>
          </button>
          <div className={classNames("ln-group-body", openGroups.ecommerce ? "open" : "collapsed")}>
            {renderItem("Marketplace", "/dashboard")}
          </div>
        </div>
      </nav>
    </aside>
  );
}
