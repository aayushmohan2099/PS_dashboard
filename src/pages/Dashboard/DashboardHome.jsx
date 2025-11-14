// src/pages/Dashboard/DashboardHome.jsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import LeftNav from '../../components/layout/LeftNav';
import TopNav from '../../components/layout/TopNav';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../api/axios';
import LoadingModal from '../../components/ui/LoadingModal';
import ModulePlaceholder from './ModulePlaceholder';
import { useNavigate } from 'react-router-dom';

/**
 * Role-aware dashboard:
 * - regionRoles: show SHGs table (fetches user-geoscope -> block/district -> shg-list)
 *    -> click a SHG to view its members (calls /lookups/beneficiary-list/<shg_code>/?page=&page_size=)
 * - Supports:
 *    - caching of pages in sessionStorage for quick back/forward navigation
 *    - spinner inside table area while members or SHG pages load
 *    - Cancel request button for member fetch (uses AbortController)
 *    - per-request page_size control (page_size selector for members)
 *    - clicks on member navigate to BeneficiaryDetail page (/dashboard/beneficiary/<member_code>)
 *
 * Fix: user-geoscope now uses longer per-request timeout + retries to avoid "timeout of 15000ms exceeded".
 */

export default function DashboardHome() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // general UI state
  const [globalLoading, setGlobalLoading] = useState(false); // for big actions
  const [resolvingRole, setResolvingRole] = useState(false);

  // role normalized
  const [roleNameNormalized, setRoleNameNormalized] = useState(null);

  // SHG list state
  const [shgs, setShgs] = useState([]);
  const [shgHeaders, setShgHeaders] = useState([]);
  const [shgPage, setShgPage] = useState(1);
  const [shgPageSize] = useState(10); // keep default 10 for shg listing
  const [shgTotalCount, setShgTotalCount] = useState(null);
  const [shgLoading, setShgLoading] = useState(false);

  // members state
  const [selectedShg, setSelectedShg] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberHeaders, setMemberHeaders] = useState([]);
  const [membersPage, setMembersPage] = useState(1);
  const [membersPageSize, setMembersPageSize] = useState(10);
  const [membersTotalCount, setMembersTotalCount] = useState(null);
  const [membersLoading, setMembersLoading] = useState(false);

  // heading
  const [headingName, setHeadingName] = useState('Dashboard');

  // role groups
  const regionRoles = new Set(['bmmu','dmmu','dcnrlm','smmu']);
  const partnerRoles = new Set(['training_partner','master_trainer','crp_ep','crp_ld']);
  const adminRoles = new Set(['state_admin','pmu_admin']);

  // AbortController ref for cancelling members request
  const membersControllerRef = useRef(null);

  // cache keys helpers
  const SHG_CACHE_KEY = (uid) => `ps_cache_shgs_user_${uid}`;
  const MEMBER_CACHE_KEY = (uid, shgCode) => `ps_cache_members_user_${uid}_shg_${encodeURIComponent(shgCode)}`;

  function readCache(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('cache read failed', e);
      return null;
    }
  }
  function writeCache(key, obj) {
    try {
      sessionStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {
      console.warn('cache write failed', e);
    }
  }

  // helper: extract role candidate from user object
  function extractRoleCandidate(u) {
    if (!u) return null;
    if (u.role_name && typeof u.role_name === 'string') return u.role_name.toLowerCase();
    if (u.role && typeof u.role === 'object' && (u.role.name || u.role.role_name)) {
      return (u.role.name || u.role.role_name).toLowerCase();
    }
    if (u.role && typeof u.role === 'string') return u.role.toLowerCase();
    if (u.role && (typeof u.role === 'number' || (/^\d+$/.test(String(u.role))))) {
      return String(u.role);
    }
    return null;
  }

  // ---------- RESOLVE ROLE (user-geoscope with longer timeout + retries) ----------
  useEffect(() => {
    async function resolveRoleViaGeo() {
      setResolvingRole(true);
      try {
        const candidate = extractRoleCandidate(user);
        // if local candidate exists and is friendly, use it
        if (candidate && !/^\d+$/.test(candidate)) {
          setRoleNameNormalized(String(candidate).toLowerCase());
          setResolvingRole(false);
          return;
        }

        const uid = user?.id;
        if (!uid) {
          setRoleNameNormalized(candidate ? String(candidate) : null);
          setResolvingRole(false);
          return;
        }

        // We'll try a few attempts with per-request timeout = 30s
        const ATTEMPTS = 3;
        const PER_REQ_TIMEOUT = 30000; // 30s
        let lastErr = null;
        for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
          try {
            const res = await api.get(`/lookups/user-geoscope/${uid}/`, { timeout: PER_REQ_TIMEOUT });
            const geo = res?.data || {};
            if (geo && geo.role && typeof geo.role === 'string') {
              setRoleNameNormalized(String(geo.role).toLowerCase());
            } else {
              const cand = candidate || (user?.username || '').toLowerCase();
              setRoleNameNormalized(cand || null);
            }
            lastErr = null;
            break; // success
          } catch (err) {
            lastErr = err;
            // If aborted or user logged out, break early
            if (err?.name === 'CanceledError' || err?.message === 'canceled') break;
            // small backoff before retry, don't block too long
            const backoff = 200 * attempt;
            await new Promise(r => setTimeout(r, backoff));
            // try again
          }
        }

        if (lastErr) {
          // exhausted attempts - fallback to candidate and log extra info
          console.error('user-geoscope role resolve failed after retries', lastErr?.response?.data || lastErr.message || lastErr);
          setRoleNameNormalized(candidate ? String(candidate) : (user?.role_name ? String(user.role_name).toLowerCase() : null));
        }
      } catch (err) {
        console.error('resolveRoleViaGeo unexpected', err);
        setRoleNameNormalized(null);
      } finally {
        setResolvingRole(false);
      }
    }

    resolveRoleViaGeo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // When role is region, load SHGs; otherwise clear region state
  useEffect(() => {
    if (!user) return;
    if (regionRoles.has(roleNameNormalized)) {
      setSelectedShg(null);
      setMembers([]);
      setMemberHeaders([]);
      setMembersPage(1);

      // try quick cache load for shgs
      const cached = readCache(SHG_CACHE_KEY(user.id));
      if (cached && cached.lastPage) {
        const pageKey = `${cached.lastPage}|${shgPageSize}`;
        const p = (cached.pages && cached.pages[pageKey]) ? cached.pages[pageKey] : null;
        if (p) {
          setShgs(p.items || []);
          setShgHeaders(cached.headers || []);
          setShgTotalCount(p.total ?? null);
          setShgPage(cached.lastPage || 1);
        }
      }

      fetchShgsForUser(user.id, 1);
    } else {
      setShgs([]);
      setShgHeaders([]);
      setShgTotalCount(null);
      setSelectedShg(null);
      setMembers([]);
      setMemberHeaders([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleNameNormalized, user]);

  /* ---------- helpers to pick friendly names ---------- */
  function extractFriendlyNameFromBlockResponse(blockData) {
    if (!blockData || typeof blockData !== 'object') return null;
    const candidates = [
      blockData.block_name_en,
      blockData.block_name,
      blockData.block_name_local,
      blockData.name,
      blockData.block_name_short,
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim().length > 0) return c.trim();
    }
    if (blockData.data && typeof blockData.data === 'object') {
      return extractFriendlyNameFromBlockResponse(blockData.data);
    }
    return null;
  }
  function extractFriendlyNameFromDistrictResponse(districtData) {
    if (!districtData || typeof districtData !== 'object') return null;
    const candidates = [
      districtData.district_name_en,
      districtData.district_name,
      districtData.district_name_local,
      districtData.name,
      districtData.district_short_name_en
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim().length > 0) return c.trim();
    }
    if (districtData.data && typeof districtData.data === 'object') {
      return extractFriendlyNameFromDistrictResponse(districtData.data);
    }
    return null;
  }

  /* ---------- FETCH SHGs for user (keeps same behaviour) ---------- */
  async function fetchShgsForUser(userId, pageNum = 1) {
    setShgLoading(true);
    setShgs([]);
    setShgHeaders([]);
    setShgPage(pageNum);
    setShgTotalCount(null);
    setHeadingName('SHGs');

    const cacheKey = SHG_CACHE_KEY(userId);
    const pageCacheKey = `${pageNum}|${shgPageSize}`;

    // load cache quickly if present
    try {
      const cached = readCache(cacheKey);
      if (cached && cached.pages && cached.pages[pageCacheKey]) {
        const p = cached.pages[pageCacheKey];
        setShgs(p.items || []);
        setShgHeaders(cached.headers || []);
        setShgTotalCount(p.total ?? null);
      }
    } catch (e) {
      // ignore
    }

    try {
      const geoRes = await api.get(`/lookups/user-geoscope/${userId}/`, { timeout: 30000 });
      const geo = geoRes?.data || {};

      let listRes = null;
      if (Array.isArray(geo.blocks) && geo.blocks.length > 0) {
        const usedId = geo.blocks[0];
        try {
          const blk = await api.get(`/lookups/blocks/detail/${usedId}/`, { timeout: 30000 });
          const b = blk?.data || {};
          const blockName = extractFriendlyNameFromBlockResponse(b) || `Block ${usedId}`;
          setHeadingName(`SHGs in ${blockName}`);
        } catch (err) {
          console.warn(`Failed to fetch block detail for ${usedId}`, err?.response?.data || err.message || err);
          setHeadingName(`SHGs in Block ${usedId}`);
        }
        listRes = await api.get(`/lookups/shg-list/${usedId}/`, { params: { page: pageNum, page_size: shgPageSize }, timeout: 30000 });
      } else if (Array.isArray(geo.districts) && geo.districts.length > 0) {
        const usedId = geo.districts[0];
        try {
          const dt = await api.get(`/lookups/districts/${usedId}/`, { timeout: 30000 });
          const d = dt?.data || {};
          const districtName = extractFriendlyNameFromDistrictResponse(d) || `District ${usedId}`;
          setHeadingName(`SHGs in ${districtName}`);
        } catch (err) {
          console.warn(`Failed to fetch district detail for ${usedId}`, err?.response?.data || err.message || err);
          setHeadingName(`SHGs in District ${usedId}`);
        }
        listRes = await api.get(`/lookups/shg-list/by-district/${usedId}/`, { params: { page: pageNum, page_size: shgPageSize }, timeout: 30000 });
      } else {
        listRes = await api.get(`/lookups/shgs/`, { params: { page: pageNum, page_size: shgPageSize }, timeout: 30000 });
        setHeadingName('SHGs (All)');
      }

      const data = listRes?.data;
      let items = [];
      if (Array.isArray(data)) {
        items = data;
        setShgTotalCount(items.length);
      } else if (data && Array.isArray(data.results)) {
        items = data.results;
        setShgTotalCount(data.count ?? null);
      } else if (data && Array.isArray(data.data)) {
        items = data.data;
        setShgTotalCount(data.count ?? null);
      } else {
        items = Array.isArray(data) ? data : (data && typeof data === 'object' ? (data.items || []) : []);
        setShgTotalCount(Array.isArray(items) ? items.length : null);
      }

      setShgs(items || []);

      // headers
      const hdrSet = new Set();
      (items || []).forEach(it => { if (it && typeof it === 'object') Object.keys(it).forEach(k => hdrSet.add(k)); });
      const preferred = ['shg_code','shg_name','clf_code','village','panchayat','block','district'];
      const hdrList = Array.from(hdrSet);
      hdrList.sort((a,b) => {
        const ai = preferred.indexOf(a);
        const bi = preferred.indexOf(b);
        if (ai !== -1 || bi !== -1) {
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        }
        return a.localeCompare(b);
      });
      setShgHeaders(hdrList);

      // cache
      try {
        const cached = readCache(cacheKey) || { pages: {}, headers: hdrList, lastPage: pageNum };
        cached.pages = cached.pages || {};
        cached.pages[pageCacheKey] = { items, total: Array.isArray(items) ? items.length : (listRes?.data?.count ?? null) };
        cached.headers = hdrList;
        cached.lastPage = pageNum;
        writeCache(cacheKey, cached);
      } catch (e) { /* ignore */ }
    } catch (e) {
      console.error('fetchShgsForUser error', e?.response?.data || e.message || e);
      try { alert('Failed to load SHGs: ' + (e.response?.data?.detail || e.message)); } catch (_) {}
    } finally {
      setShgLoading(false);
    }
  }

  /* ---------- FETCH members for SHG (with cancel + cache) ---------- */
  async function fetchMembersForShg(shgIdentifier, pageNum = 1) {
    if (!shgIdentifier) return;

    const shgCode = (typeof shgIdentifier === 'string') ? shgIdentifier :
      (shgIdentifier.shg_code || shgIdentifier.shgCode || shgIdentifier.code || shgIdentifier.id || null);
    const displayName = (typeof shgIdentifier === 'object') ? (shgIdentifier.shg_name || shgIdentifier.name || shgCode) : shgCode;

    if (!shgCode) { alert('SHG code not found'); return; }

    setSelectedShg(shgIdentifier);
    setHeadingName(`${displayName} — Members`);
    setMembersPage(pageNum);

    const cacheKey = MEMBER_CACHE_KEY(user?.id, shgCode);
    const pageCacheKey = `${pageNum}|${membersPageSize}`;

    // cancel previous
    if (membersControllerRef.current) {
      try { membersControllerRef.current.abort(); } catch (e) {}
      membersControllerRef.current = null;
    }

    // try cache
    try {
      const cached = readCache(cacheKey);
      if (cached && cached.pages && cached.pages[pageCacheKey]) {
        const p = cached.pages[pageCacheKey];
        setMembers(p.items || []);
        setMemberHeaders(cached.headers || []);
        setMembersTotalCount(p.total ?? null);
      } else {
        setMembers([]);
        setMemberHeaders([]);
        setMembersTotalCount(null);
      }
    } catch (e) {
      setMembers([]);
      setMemberHeaders([]);
      setMembersTotalCount(null);
    }

    const controller = new AbortController();
    membersControllerRef.current = controller;
    setMembersLoading(true);

    try {
      const res = await api.get(`/lookups/beneficiary-list/${encodeURIComponent(shgCode)}/`, {
        params: { page: pageNum, page_size: membersPageSize },
        signal: controller.signal,
        timeout: 30000
      });

      const data = res?.data;
      let items = [];
      if (Array.isArray(data)) {
        items = data;
        setMembersTotalCount(items.length);
      } else if (data && Array.isArray(data.results)) {
        items = data.results;
        setMembersTotalCount(data.count ?? null);
      } else if (data && Array.isArray(data.data)) {
        items = data.data;
        setMembersTotalCount(data.count ?? null);
      } else {
        items = Array.isArray(data) ? data : (data && typeof data === 'object' ? (data.items || []) : []);
        setMembersTotalCount(Array.isArray(items) ? items.length : null);
      }

      setMembers(items || []);

      const hdrSet = new Set();
      (items || []).forEach(it => { if (it && typeof it === 'object') Object.keys(it).forEach(k => hdrSet.add(k)); });
      const preferred = ['member_code','member_name','shg_code','village','panchayat','block','district','state'];
      const hdrList = Array.from(hdrSet);
      hdrList.sort((a,b) => {
        const ai = preferred.indexOf(a);
        const bi = preferred.indexOf(b);
        if (ai !== -1 || bi !== -1) {
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        }
        return a.localeCompare(b);
      });
      setMemberHeaders(hdrList);

      // cache
      try {
        const cached = readCache(cacheKey) || { pages: {}, headers: hdrList, lastPage: pageNum };
        cached.pages = cached.pages || {};
        cached.pages[pageCacheKey] = { items, total: Array.isArray(items) ? items.length : (res?.data?.count ?? null) };
        cached.headers = hdrList;
        cached.lastPage = pageNum;
        writeCache(cacheKey, cached);
      } catch (e) { /* ignore */ }
    } catch (err) {
      if (err && err.name === 'CanceledError') {
        console.info('Members fetch canceled by user');
      } else {
        console.warn('Failed to fetch members', err?.response?.data || err.message || err);
        try { alert('Failed to load members: ' + (err.response?.data?.detail || err.message || String(err))); } catch (_) {}
        setMembers([]);
        setMemberHeaders([]);
        setMembersTotalCount(null);
      }
    } finally {
      membersControllerRef.current = null;
      setMembersLoading(false);
    }
  }

  function cancelMembersFetch() {
    if (membersControllerRef.current) {
      try { membersControllerRef.current.abort(); } catch (e) {}
      membersControllerRef.current = null;
      setMembersLoading(false);
    }
  }

  const handleShgPageChange = (newPage) => {
    setShgPage(newPage);
    if (user && user.id) fetchShgsForUser(user.id, newPage);
  };
  const handleMembersPageChange = (newPage) => {
    setMembersPage(newPage);
    if (selectedShg) fetchMembersForShg(selectedShg, newPage);
  };

  const onShgRowClick = (row) => {
    const code = row.shg_code || row.shgCode || row.code || row.id || null;
    const displayName = row.shg_name || row.name || code || 'SHG';
    if (!code) { alert('SHG code missing'); return; }
    fetchMembersForShg({ ...row, shg_code: code, shg_name: displayName }, 1);
  };

  const onMemberRowClick = (row) => {
    const memberCode = row.member_code || row.memberCode || row.code || row.memberId || null;
    if (!memberCode) { alert('Member code missing'); return; }
    navigate(`/dashboard/beneficiary/${encodeURIComponent(memberCode)}`);
  };

  const backToShgs = () => {
    setSelectedShg(null);
    setMembers([]);
    setMemberHeaders([]);
    setMembersPage(1);
    if (headingName && headingName.includes('— Members')) {
      setHeadingName(headingName.split('— Members')[0].trim());
    } else {
      setHeadingName('SHGs');
    }
  };

  const tableSpinner = (label = 'Loading...') => (
    <div className="table-spinner" style={{ padding: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <div className="ps-spinner" style={{ width: 40, height: 40, borderWidth: 6 }} aria-hidden />
      <div style={{ marginTop: 10, color: '#6b7280' }}>{label}</div>
    </div>
  );

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={<div className="topnav-left"><div className="app-title">Pragati Setu</div></div>}
          right={<div className="topnav-right"><div className="topnav-user">Welcome {user?.username || 'User'}</div></div>}
        />

        <main className={`dashboard-main ${regionRoles.has(roleNameNormalized) ? 'region' : partnerRoles.has(roleNameNormalized) ? 'partner' : adminRoles.has(roleNameNormalized) ? 'admin' : ''}`} style={{ padding: 18 }}>
          <LoadingModal open={globalLoading || resolvingRole} title={resolvingRole ? 'Resolving role' : 'Loading'} message={resolvingRole ? 'Preparing your dashboard...' : 'Please wait...'} />

          {/* REGION ROLES */}
          {regionRoles.has(roleNameNormalized) && (
            <>
              <header className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{headingName}</h2>
                  <div className="small-muted">Role: {roleNameNormalized || (user?.role_name || user?.role)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {selectedShg ? (
                    <>
                      <button onClick={backToShgs} className="btn btn-flat">Back to SHGs</button>
                      <button onClick={() => fetchMembersForShg(selectedShg, membersPage)} className="btn btn-flat">Refresh Members</button>
                      <button onClick={cancelMembersFetch} className="btn btn-warning" disabled={!membersLoading}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => fetchShgsForUser(user?.id, shgPage)} className="btn btn-flat">Refresh</button>
                  )}
                  <button onClick={logout} className="btn btn-outline">Logout</button>
                </div>
              </header>

              <section className="card" style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="small-muted">
                    {selectedShg ? `Members — page ${membersPage}${membersTotalCount ? ` — ${membersTotalCount} total` : ''}` : `SHGs — page ${shgPage}${shgTotalCount ? ` — ${shgTotalCount} total` : ''}`}
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!selectedShg ? (
                      <>
                        <button className="btn btn-sm" disabled={shgPage <= 1} onClick={() => handleShgPageChange(Math.max(1, shgPage - 1))}>Prev</button>
                        <button className="btn btn-sm" onClick={() => handleShgPageChange(shgPage + 1)} style={{ marginLeft: 8 }}>Next</button>
                      </>
                    ) : (
                      <>
                        <label style={{ fontSize: 12, color: '#6b7280' }}>Page size:
                          <select value={membersPageSize} onChange={(e) => { setMembersPageSize(Number(e.target.value)); fetchMembersForShg(selectedShg, 1); }} style={{ marginLeft: 8 }}>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                          </select>
                        </label>
                        <button className="btn btn-sm" disabled={membersPage <= 1} onClick={() => handleMembersPageChange(Math.max(1, membersPage - 1))}>Prev</button>
                        <button className="btn btn-sm" onClick={() => handleMembersPageChange(membersPage + 1)} style={{ marginLeft: 8 }}>Next</button>
                      </>
                    )}
                  </div>
                </div>

                <div className="table-wrap" style={{ overflowX: 'auto', minHeight: 120 }}>
                  { (shgLoading && !selectedShg) ? tableSpinner('Loading SHGs...') :
                    (membersLoading && selectedShg) ? tableSpinner('Loading members...') : (
                      <table className="s-table-compressed" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#0b5394', color: '#fff' }}>
                          <tr>
                            { (!selectedShg && shgHeaders.length === 0) && <th style={{ padding: 12 }}>No SHGs</th> }
                            { (selectedShg && memberHeaders.length === 0) && <th style={{ padding: 12 }}>No members</th> }
                            { !selectedShg && shgHeaders.map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12 }}>{h.replace(/_/g, ' ').toUpperCase()}</th>)}
                            { selectedShg && memberHeaders.map(h => <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 12 }}>{h.replace(/_/g, ' ').toUpperCase()}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          { !selectedShg && shgs.length === 0 && (
                            <tr><td colSpan={Math.max(1, shgHeaders.length)} style={{ padding: 20 }}>No SHGs found for your area.</td></tr>
                          )}
                          { selectedShg && members.length === 0 && (
                            <tr><td colSpan={Math.max(1, memberHeaders.length)} style={{ padding: 20 }}>No members found for this SHG.</td></tr>
                          )}
                          { !selectedShg && shgs.map((row, i) => (
                            <tr key={i} style={{ borderTop: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }} onClick={() => onShgRowClick(row)}>
                              { shgHeaders.map(h => {
                                  const val = row[h];
                                  const display = (val && typeof val === 'object') ? JSON.stringify(val) : (val === null ? '' : String(val));
                                  const style = { padding: '8px 10px', fontSize: 13 };
                                  if (h === 'shg_code') style.fontWeight = 700;
                                  return <td key={h} style={style}>{display}</td>;
                              })}
                            </tr>
                          ))}
                          { selectedShg && members.map((row, i) => (
                            <tr key={i} style={{ borderTop: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer' }} onClick={() => onMemberRowClick(row)}>
                              { memberHeaders.map(h => {
                                  const val = row[h];
                                  const display = (val && typeof val === 'object') ? JSON.stringify(val) : (val === null ? '' : String(val));
                                  return <td key={h} style={{ padding: '8px 10px', fontSize: 13 }}>{display}</td>;
                              })}
                            </tr>
                          )) }
                        </tbody>
                      </table>
                    )
                  }
                </div>
              </section>
            </>
          )}

          {/* PARTNER ROLES */}
          {partnerRoles.has(roleNameNormalized) && (
            <>
              <header className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Partner Dashboard</h2>
                  <div className="small-muted">Welcome, {user?.username || 'Partner'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => {}} className="btn btn-flat">Sync Data</button>
                  <button onClick={logout} className="btn btn-outline">Logout</button>
                </div>
              </header>

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                <div className="card"><h3>Upcoming Trainings</h3><p className="small-muted">Next 30 days</p><ul><li>Training A — 12 Dec</li><li>Training B — 20 Dec</li></ul></div>
                <div className="card"><h3>Participants</h3><p className="small-muted">Active participants</p><div style={{ fontSize: 24, fontWeight: 700 }}>128</div></div>
                <div className="card"><h3>Quick Links</h3><ul><li><a href="/dashboard/epsakhi/register">Register Enterprise</a></li><li><a href="/dashboard/tms/create">Create Training Request</a></li></ul></div>
              </section>
            </>
          )}

          {/* ADMIN ROLES */}
          {adminRoles.has(roleNameNormalized) && (
            <>
              <header className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div><h2 style={{ margin: 0 }}>Admin Dashboard</h2><div className="small-muted">System overview</div></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => {}} className="btn btn-flat">System Settings</button>
                  <button onClick={logout} className="btn btn-outline">Logout</button>
                </div>
              </header>

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                <div className="card"><h3>Total Users</h3><div style={{ fontSize: 28, fontWeight: 700 }}>1,234</div><p className="small-muted">Active / All</p></div>
                <div className="card"><h3>Pending Approvals</h3><div style={{ fontSize: 28, fontWeight: 700 }}>14</div><p className="small-muted">Approve new partners and trainings</p></div>
                <div className="card"><h3>Exports</h3><ul><li><a href="/admin/exports/users">Export users</a></li></ul></div>
              </section>
            </>
          )}

          {/* DEFAULT fallback */}
          {!regionRoles.has(roleNameNormalized) && !partnerRoles.has(roleNameNormalized) && !adminRoles.has(roleNameNormalized) && (
            <>
              <header className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div><h2 style={{ margin: 0 }}>Dashboard</h2><div className="small-muted">Welcome — role: {roleNameNormalized || 'unknown'}</div></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => {}} className="btn btn-flat">Refresh</button>
                  <button onClick={logout} className="btn btn-outline">Logout</button>
                </div>
              </header>

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                <ModulePlaceholder title="Quick Actions" />
                <ModulePlaceholder title="Reports" />
                <ModulePlaceholder title="Help & Docs" />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
