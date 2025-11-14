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
  const [openGroups, setOpenGroups] = useState({ tms: true, epsakhi: true, lpdidi: false, ecom: false, apps: false });
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

  const toggleMode = () => setMode((m) => (m + 1) % 3);
  const toggleGroup = (k) => setOpenGroups((g) => ({ ...g, [k]: !g[k] }));

  const navClass = ['left-nav', 'left-nav-compact', 'left-nav-hidden'][mode] || 'left-nav';

  // Role buckets
  const regionRoles = new Set(['bmmu','dmmu','dcnrlm','smmu']);
  const adminRoles = new Set(['state_admin','pmu_admin']);
  const partnerRoles = new Set(['training_partner','master_trainer','crp_ep','crp_ld']);

  const renderItem = (label, href='#') => (
    <a className="ln-item" href={href} target="_blank" rel="noreferrer">{label}</a>
  );

  return (
    <aside className={navClass} aria-label="Primary navigation">
      <div className="ln-top">
        <div className="ln-brand" title="Pragati Setu">
          <div className="ln-logo" aria-hidden>PS</div>
          {mode === 0 && <div className="ln-title">Pragati Setu</div>}
        </div>

        <button className="ln-mode-btn" onClick={toggleMode} aria-label="Toggle navigation mode" style={{background:'transparent',border:'none',cursor:'pointer'}}>
          {mode === 0 ? 'Compact' : mode === 1 ? 'Hide' : 'Show'}
        </button>
      </div>

      <nav className="ln-nav" style={{paddingTop:8}}>
        {/* REGION roles */}
        {regionRoles.has(roleName) && (
          <>
            <div className="ln-group">
              <button className="ln-group-header" onClick={() => toggleGroup('tms')} aria-expanded={!!openGroups.tms}>
                <span>TMS Portal</span>
                <span className={`caret ${openGroups.tms ? 'open' : ''}`}>▸</span>
              </button>
              <div className={`ln-submenu ${openGroups.tms ? 'show' : ''}`}>
                {renderItem('My Trainings', '/dashboard/tms/my-trainings')}
                {renderItem('Block Summary', '/dashboard/tms/block-summary')}
                {renderItem('Training Calendar', '/dashboard/tms/calendar')}
              </div>
            </div>

            <div className="ln-group">
              <button className="ln-group-header" onClick={() => toggleGroup('epsakhi')} aria-expanded={!!openGroups.epsakhi}>
                <span>epSakhi</span>
                <span className={`caret ${openGroups.epsakhi ? 'open' : ''}`}>▸</span>
              </button>
              <div className={`ln-submenu ${openGroups.epsakhi ? 'show' : ''}`}>
                {renderItem('Enterprises Overview', '/dashboard/epsakhi/overview')}
                {renderItem('Collected Data', '/dashboard/epsakhi/data')}
                {renderItem('Reports', '/dashboard/epsakhi/reports')}
              </div>
            </div>

            <div className="ln-group">
              <button className="ln-group-header" onClick={() => toggleGroup('lpdidi')} aria-expanded={!!openGroups.lpdidi}>
                <span>Lakhpati Sakhi</span>
                <span className={`caret ${openGroups.lpdidi ? 'open' : ''}`}>▸</span>
              </button>
              <div className={`ln-submenu ${openGroups.lpdidi ? 'show' : ''}`}>
                {renderItem('Overview', '/dashboard/lakhpati/overview')}
                {renderItem('Beneficiaries', '/dashboard/lakhpati/beneficiaries')}
              </div>
            </div>
          </>
        )}

        {/* PARTNER roles */}
        {partnerRoles.has(roleName) && (
          <>
            <div className="ln-group">
              <button className="ln-group-header" onClick={() => toggleGroup('partner_tms')} aria-expanded={!!openGroups.tms}>
                <span>Partner — TMS</span>
                <span className={`caret ${openGroups.tms ? 'open' : ''}`}>▸</span>
              </button>
              <div className={`ln-submenu ${openGroups.tms ? 'show' : ''}`}>
                {renderItem('My Trainings', '/dashboard/tms/my-trainings')}
                {renderItem('Participant Lists', '/dashboard/partner/participants')}
                {renderItem('Reports', '/dashboard/partner/reports')}
              </div>
            </div>

            <div className="ln-group">
              <button className="ln-group-header" onClick={() => toggleGroup('partner_epsakhi')} aria-expanded={!!openGroups.epsakhi}>
                <span>Partner — epSakhi</span>
                <span className={`caret ${openGroups.epsakhi ? 'open' : ''}`}>▸</span>
              </button>
              <div className={`ln-submenu ${openGroups.epsakhi ? 'show' : ''}`}>
                {renderItem('Register Enterprise', '/dashboard/epsakhi/register')}
                {renderItem('My Enterprises', '/dashboard/epsakhi/my-enterprises')}
              </div>
            </div>
          </>
        )}

        {/* ADMIN roles */}
        {adminRoles.has(roleName) && (
          <>
            <div className="ln-group">
              <button className="ln-group-header" onClick={() => toggleGroup('admin_tms')} aria-expanded={!!openGroups.tms}>
                <span>Admin — TMS</span>
                <span className={`caret ${openGroups.tms ? 'open' : ''}`}>▸</span>
              </button>
              <div className={`ln-submenu ${openGroups.tms ? 'show' : ''}`}>
                {renderItem('All Trainings', '/admin/tms/trainings')}
                {renderItem('Manage Partners', '/admin/tms/partners')}
                {renderItem('Settings', '/admin/tms/settings')}
              </div>
            </div>

            <div className="ln-group">
              <button className="ln-group-header" onClick={() => toggleGroup('admin_epsakhi')} aria-expanded={!!openGroups.epsakhi}>
                <span>Admin — epSakhi</span>
                <span className={`caret ${openGroups.epsakhi ? 'open' : ''}`}>▸</span>
              </button>
              <div className={`ln-submenu ${openGroups.epsakhi ? 'show' : ''}`}>
                {renderItem('User Management', '/admin/epsakhi/users')}
                {renderItem('Data Exports', '/admin/epsakhi/exports')}
              </div>
            </div>
          </>
        )}

        {/* COMMON section */}
        <div className="ln-group">
          <button className="ln-group-header" onClick={() => toggleGroup('apps')} aria-expanded={!!openGroups.apps}>
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
        {mode === 0 ? <small className="muted">Govt. of State — Internal</small> : <small className="muted">PS</small>}
      </div>
    </aside>
  );
}
