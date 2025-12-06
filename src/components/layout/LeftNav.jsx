// src/components/layout/LeftNav.jsx
import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import '/src/styles.css';
import { getUser } from '../../utils/storage';

/**
 * LeftNav (role-aware)
 * - Reads geoscope from localStorage.ps_user_geoscope (set by DashboardHome).
 * - Falls back to stored user profile from getUser().
 * - Shows different menu groups for region / partner / admin roles.
 */

export default function LeftNav() {
  const [mode, setMode] = useState(0); // simple mode (kept for compatibility)
  const [openGroups, setOpenGroups] = useState({
    tms: true,
    epsakhi: true,
    lpdidi: false,
    ecom: false,
    apps: false,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [geo, setGeo] = useState(null);
  const [roleName, setRoleName] = useState(null);

  useEffect(() => {
    const s = sessionStorage.getItem('ps_leftnav_mode');
    if (s) setMode(Number(s));
    const u = getUser();
    setCurrentUser(u);

    // try to read cached geoscope (set by DashboardHome)
    try {
      const g = JSON.parse(localStorage.getItem('ps_user_geoscope') || 'null');
      if (g) {
        setGeo(g);
        if (g.role) setRoleName(String(g.role).toLowerCase());
      } else if (u) {
        // fallback derive role from stored user object
        const cand = (u.role_name || u.role || (u.role && u.role.name)) || null;
        if (cand) setRoleName(String(cand).toLowerCase());
      }
    } catch (e) {
      const u2 = getUser();
      if (u2) {
        const cand = (u2.role_name || u2.role || (u2.role && u2.role.name)) || null;
        if (cand) setRoleName(String(cand).toLowerCase());
      }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('ps_leftnav_mode', String(mode));
  }, [mode]);

  const toggleGroup = (key) => {
    setOpenGroups((g) => ({
      ...g,
      [key]: !g[key],
    }));
  };

  const isRegionRole = roleName && ['bmmu', 'dmmu', 'dcnrlm', 'smmu'].includes(roleName);
  const isAdminRole = roleName && ['state_admin', 'pmu_admin'].includes(roleName);
  const isPartnerRole = roleName && ['training_partner', 'master_trainer'].includes(roleName);
  const isCrpRole = roleName && ['crp_ep', 'crp_ld'].includes(roleName);

  const renderItem = (label, to) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        'ln-item' + (isActive ? ' active' : '')
      }
    >
      {label}
    </NavLink>
  );

  return (
    <aside className="left-nav ln">
      <div className="ln-header">
        <div className="ln-title">Pragati Setu</div>
        <div className="ln-subtitle">
          {roleName ? roleName.toUpperCase() : 'USER'}
        </div>
        {currentUser?.username && (
          <div className="small-muted">Logged in as {currentUser.username}</div>
        )}
      </div>

      <nav className="ln-body">
        {/* TMS group */}
        <div className="ln-group">
          <button
            className="ln-group-header"
            onClick={() => toggleGroup('tms')}
            aria-expanded={!!openGroups.tms}
          >
            <span>Training Management</span>
            <span className={`caret ${openGroups.tms ? 'open' : ''}`}>▸</span>
          </button>
          <div className={`ln-submenu ${openGroups.tms ? 'show' : ''}`}>
            {renderItem('Dashboard', '/dashboard')}
            {renderItem('Batches', '/dashboard/tms/batches')}
            {renderItem('Trainers', '/dashboard/tms/trainers')}
            {renderItem('Participants', '/dashboard/tms/participants')}
          </div>
        </div>

        {/* EPSakhi group */}
        <div className="ln-group">
          <button
            className="ln-group-header"
            onClick={() => toggleGroup('epsakhi')}
            aria-expanded={!!openGroups.epsakhi}
          >
            <span>EP-Sakhi</span>
            <span className={`caret ${openGroups.epsakhi ? 'open' : ''}`}>▸</span>
          </button>
          <div className={`ln-submenu ${openGroups.epsakhi ? 'show' : ''}`}>
            {renderItem('CRP Analytics', '/dashboard/epsakhi/crp-analytics')}
            {renderItem('Beneficiaries', '/dashboard/epsakhi/beneficiaries')}
            {renderItem('Enterprises', '/dashboard/epsakhi/enterprises')}
          </div>
        </div>

        {/* Placeholders for other groups; logic for roleDisplay kept very simple */}
        {(isRegionRole || isAdminRole || isPartnerRole || isCrpRole) && (
          <>
            {/* Lakhpati Didi */}
            <div className="ln-group">
              <button
                className="ln-group-header"
                onClick={() => toggleGroup('lpdidi')}
                aria-expanded={!!openGroups.lpdidi}
              >
                <span>Lakhpati Didi</span>
                <span className={`caret ${openGroups.lpdidi ? 'open' : ''}`}>▸</span>
              </button>
              <div className={`ln-submenu ${openGroups.lpdidi ? 'show' : ''}`}>
                {renderItem('Overview', '/dashboard/lpdidi')}
                {renderItem('Households', '/dashboard/lpdidi/households')}
              </div>
            </div>

            {/* E-commerce */}
            <div className="ln-group">
              <button
                className="ln-group-header"
                onClick={() => toggleGroup('ecom')}
                aria-expanded={!!openGroups.ecom}
              >
                <span>E-Commerce</span>
                <span className={`caret ${openGroups.ecom ? 'open' : ''}`}>▸</span>
              </button>
              <div className={`ln-submenu ${openGroups.ecom ? 'show' : ''}`}>
                {renderItem('Products', '/dashboard/ecom/products')}
                {renderItem('Orders', '/dashboard/ecom/orders')}
              </div>
            </div>
          </>
        )}

        {/* COMMON section */}
        <div className="ln-group">
          <button
            className="ln-group-header"
            onClick={() => toggleGroup('apps')}
            aria-expanded={!!openGroups.apps}
          >
            <span>Common</span>
            <span className={`caret ${openGroups.apps ? 'open' : ''}`}>▸</span>
          </button>
          <div className={`ln-submenu ${openGroups.apps ? 'show' : ''}`}>
            {renderItem('Reports', '/dashboard/reports')}
            {renderItem('Settings', '/dashboard/settings')}
            {renderItem('Help', '/dashboard/help')}
          </div>
        </div>
      </nav>

      <div className="ln-footer">
        {mode === 0 ? (
          <small className="muted">Govt. of State — Internal</small>
        ) : (
          <small className="muted">PS</small>
        )}
      </div>
    </aside>
  );
}
