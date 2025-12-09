// src/components/layout/LeftNav.jsx
import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

// render TMS left nav when in /tms space
import TmsLeftNav from "../../pages/TMS/layout/tms_LeftNav";

function classNames(...args) {
  return args.filter(Boolean).join(" ");
}

/**
 * Role mapping (DB values) -> canonical short role key used across the app
 * Keep this in sync with your roles table.
 *
 * role id -> canonical role string (lowercase keys used elsewhere: 'bmmu','dmmu','smmu','training_partner','crp_ld','crp_ep','master_trainer','state_admin','pmu_admin','dcnrlm','tp_contact_person')
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

function resolveRoleKey(user) {
  // Prefer numeric role (role_id or role), fall back to role_name string,
  // then try localStorage geoscope role (ps_user_geoscope) as fallback.
  if (!user) return "";

  const maybeRoleId = Number(user.role_id ?? user.role);
  if (!Number.isNaN(maybeRoleId) && ROLE_ID_MAP[maybeRoleId]) {
    return ROLE_ID_MAP[maybeRoleId];
  }

  // If role_name present (string), normalise
  if (user.role_name) {
    const rn = String(user.role_name).toLowerCase();
    // map some obvious string forms to canonical keys
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

  // final fallback: try ps_user_geoscope stored role (string)
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

export default function LeftNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [openGroups, setOpenGroups] = useState({
    beneficiary: true,
    tms: false,
    epsakhi: false,
    lakhpati: false,
    ecommerce: false,
  });

  const roleKey = resolveRoleKey(user);

  // role buckets (using canonical role keys)
  const isRegionRole = ["bmmu", "dmmu", "dcnrlm", "smmu"].includes(roleKey);
  const isAdminRole = ["state_admin", "pmu_admin"].includes(roleKey);
  const isPartnerRole = ["training_partner", "master_trainer"].includes(roleKey);
  const isCrpRole = ["crp_ep", "crp_ld"].includes(roleKey);

  // TMS-only: TP, MT, Contact Person
  const isTmsOnlyRole = ["training_partner", "master_trainer", "tp_contact_person"].includes(roleKey);

  // DCNRLM should not see Training Management System
  const isDcnrlm = roleKey === "dcnrlm";

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

  // If we are in /tms path, render TMS left nav
  if (location.pathname.startsWith("/tms")) {
    return <TmsLeftNav />;
  }

  return (
    <aside className="left-nav">
      <div className="ln-header">
        <div className="ln-title">Pragati Setu</div>
        <div className="ln-subtitle">{user?.username || ""}</div>
      </div>

      <nav className="ln-nav">
        {/* ---------------- Beneficiary Management (new app) ---------------- */}
        {!isTmsOnlyRole && (
          <div className="ln-group">
            <button
              type="button"
              className="ln-group-header"
              onClick={() => toggleGroup("beneficiary")}
            >
              <span>Beneficiary Management</span>
              <span className="ln-chevron">
                {openGroups.beneficiary ? "▾" : "▸"}
              </span>
            </button>
            <div
              className={classNames(
                "ln-group-body",
                openGroups.beneficiary ? "open" : "collapsed"
              )}
            >
              {/* For now, Beneficiary Management = role-specific dashboard at /dashboard */}
              {renderItem("Overview", "/dashboard")}
            </div>
          </div>
        )}

        {/* ---------------- TMS & Training Management ---------------- */}
        {/* Hide TMS for DCNRLM */}
        {!isDcnrlm && (
          <div className="ln-group">
            <button
              className="ln-group-header"
              onClick={() => toggleGroup("tms")}
              aria-expanded={!!openGroups.tms}
            >
              <span>Training Management</span>
              <span className={`caret ${openGroups.tms ? "open" : ""}`}>
                ▸
              </span>
            </button>
            <div className={`ln-submenu ${openGroups.tms ? "show" : ""}`}>
              {/* Enter TMS area - TmsLeftNav will take over when pathname starts with /tms */}
              {renderItem("Dashboard", "/tms")}
              {renderItem("Batches", "/tms/batches")}
              {renderItem("Trainers", "/tms/trainers")}
              {renderItem("Participants", "/tms/participants")}
            </div>
          </div>
        )}

        {/* ---------------- EP-Sakhi & Enterprise Profiling ---------------- */}
        {!isTmsOnlyRole && (
          <div className="ln-group">
            <button
              type="button"
              className="ln-group-header"
              onClick={() => toggleGroup("epsakhi")}
            >
              <span>EP-Sakhi & Enterprise Profiling</span>
              <span className="ln-chevron">
                {openGroups.epsakhi ? "▾" : "▸"}
              </span>
            </button>
            <div
              className={classNames(
                "ln-group-body",
                openGroups.epsakhi ? "open" : "collapsed"
              )}
            >
              {renderItem("Dashboard", "/dashboard")}
            </div>
          </div>
        )}

        {/* ---------------- Lakhpati Didi & E-commerce ---------------- */}
        {(isRegionRole || isAdminRole || isPartnerRole || isCrpRole) && (
          <>
            <div className="ln-group">
              <button
                type="button"
                className="ln-group-header"
                onClick={() => toggleGroup("lakhpati")}
              >
                <span>Lakhpati Didi & Analytics</span>
                <span className="ln-chevron">
                  {openGroups.lakhpati ? "▾" : "▸"}
                </span>
              </button>
              <div
                className={classNames(
                  "ln-group-body",
                  openGroups.lakhpati ? "open" : "collapsed"
                )}
              >
                {renderItem("Dashboard", "/dashboard")}
              </div>
            </div>

            {/* E-Commerce hidden for TMS-only roles */}
            {!isTmsOnlyRole && (
              <div className="ln-group">
                <button
                  type="button"
                  className="ln-group-header"
                  onClick={() => toggleGroup("ecommerce")}
                >
                  <span>E-Commerce</span>
                  <span className="ln-chevron">
                    {openGroups.ecommerce ? "▾" : "▸"}
                  </span>
                </button>
                <div
                  className={classNames(
                    "ln-group-body",
                    openGroups.ecommerce ? "open" : "collapsed"
                  )}
                >
                  {renderItem("Marketplace", "/dashboard")}
                </div>
              </div>
            )}
          </>
        )}
      </nav>
    </aside>
  );
}
