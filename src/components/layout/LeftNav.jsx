// src/components/layout/LeftNav.jsx
import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function classNames(...args) {
  return args.filter(Boolean).join(" ");
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

  const roleName = (user?.role_name || "").toLowerCase();

  const isRegionRole = ["bmmu", "dmmu", "dcnrlm", "smmu"].includes(roleName);
  const isAdminRole = ["state_admin", "pmu_admin"].includes(roleName);
  const isPartnerRole = ["training_partner", "master_trainer"].includes(
    roleName
  );
  const isCrpRole = ["crp_ep", "crp_ld"].includes(roleName);

  // TMS-only: TP, MT, Contact Person
  const isTmsOnlyRole = [
    "training_partner",
    "master_trainer",
    "tp_cp",
  ].includes(roleName);

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
        <div className="ln-group">
          <button
            type="button"
            className="ln-group-header"
            onClick={() => toggleGroup("tms")}
          >
            <span>TMS & Training Management</span>
            <span className="ln-chevron">{openGroups.tms ? "▾" : "▸"}</span>
          </button>
          <div
            className={classNames(
              "ln-group-body",
              openGroups.tms ? "open" : "collapsed"
            )}
          >
            {renderItem("Dashboard", "/dashboard")}
          </div>
        </div>

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
