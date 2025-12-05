// src/pages/Dashboard/DashboardHome.jsx
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LeftNav from '../../components/layout/LeftNav';
import TopNav from '../../components/layout/TopNav';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../api/axios';
import LoadingModal from '../../components/ui/LoadingModal';
import ModulePlaceholder from './ModulePlaceholder';

// ---- helpers -----------------------------------------------------

const REGION_ROLES = new Set(['bmmu', 'dmmu', 'dcnrlm']);
const PARTNER_ROLES = new Set(['training_partner', 'master_trainer', 'crp_ep', 'crp_ld']);
const ADMIN_ROLES = new Set(['state_admin', 'pmu_admin', 'smmu']);

// normalise whatever backend sends (bmmu_user, DMMU_ROLE, etc.)
function normalizeRoleName(raw) {
  if (!raw) return '';
  const v = String(raw).toLowerCase();
  if (v.startsWith('bmmu')) return 'bmmu';
  if (v.startsWith('dmmu')) return 'dmmu';
  if (v.startsWith('dcnrlm')) return 'dcnrlm';
  if (v.includes('state') && v.includes('admin')) return 'state_admin';
  if (v.includes('pmu')) return 'pmu_admin';
  if (v.includes('smmu')) return 'smmu';
  if (v.includes('training_partner')) return 'training_partner';
  if (v.includes('master_trainer')) return 'master_trainer';
  if (v.includes('crp_ep')) return 'crp_ep';
  if (v.includes('crp_ld')) return 'crp_ld';
  return v;
}

// key used to store geoscope in localStorage (LeftNav / TopNav already expect this)
const GEOSCOPE_KEY = 'ps_user_geoscope';

// -----------------------------------------------------------------
// Base DashboardHome
// -----------------------------------------------------------------

export default function DashboardHome() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [geo, setGeo] = useState(null);
  const [roleNameNormalized, setRoleNameNormalized] = useState('');
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState('');
  const navigate = useNavigate();

  // fetch geoscope for logged-in user
  useEffect(() => {
    let cancelled = false;

    async function loadGeo() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setGeoError('');

      try {
        // 1. try localStorage first
        const cachedRaw = window.localStorage.getItem(GEOSCOPE_KEY);
        if (cachedRaw) {
          try {
            const parsed = JSON.parse(cachedRaw);
            if (parsed && parsed.user_id === user.id) {
              if (!cancelled) {
                setGeo(parsed);
                setRoleNameNormalized(normalizeRoleName(parsed.role || user.role_name));
                setLoading(false);
              }
              return;
            }
          } catch {
            // ignore corrupt cache
          }
        }

        // 2. fetch fresh from backend
        const res = await api.get(`/lookups/user-geoscope/${user.id}/`);
        const payload = res.data || {};
        if (!cancelled) {
          setGeo(payload);
          window.localStorage.setItem(GEOSCOPE_KEY, JSON.stringify(payload));
          setRoleNameNormalized(normalizeRoleName(payload.role || user.role_name));
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading user geoscope', err);
        if (!cancelled) {
          setGeoError('Could not resolve your geographical scope. Please contact administrator.');
          setRoleNameNormalized(normalizeRoleName(user?.role_name));
          setLoading(false);
        }
      }
    }

    loadGeo();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || loading) {
    return <LoadingModal open={true} title="Loading dashboard…" />;
  }

  if (!user) {
    return (
      <div className="app-shell">
        <main className="dashboard-main center">
          <p>You are not logged in. Please login again.</p>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </main>
      </div>
    );
  }

  const normalized = roleNameNormalized || normalizeRoleName(user.role_name);
  const isRegionRole = REGION_ROLES.has(normalized);
  const isPartnerRole = PARTNER_ROLES.has(normalized);
  const isAdminRole = ADMIN_ROLES.has(normalized);

  let roleSpecificContent = null;

  if (normalized === 'bmmu') {
    roleSpecificContent = <BmmuDashboard geo={geo} />;
  } else if (normalized === 'dmmu') {
    roleSpecificContent = <DmmuDashboard geo={geo} />;
  } else if (normalized === 'dcnrlm') {
    roleSpecificContent = <DcnrlmDashboard geo={geo} />;
  } else if (isPartnerRole) {
    roleSpecificContent = (
      <ModulePlaceholder
        title="Partner Dashboard"
        subtitle="You are logged in as Training Partner / Master Trainer / CRP."
      />
    );
  } else if (isAdminRole) {
    roleSpecificContent = (
      <ModulePlaceholder
        title="Admin Dashboard"
        subtitle="You are logged in as a State / SMMU / PMU admin."
      />
    );
  } else {
    roleSpecificContent = (
      <ModulePlaceholder
        title="Dashboard"
        subtitle="Your role does not have a dedicated dashboard yet."
      />
    );
  }

  const mainClass = isRegionRole ? 'dashboard-main region' : isPartnerRole ? 'dashboard-main partner' : 'dashboard-main admin';

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav />
        <main className={mainClass}>
          {geoError && (
            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              {geoError}
            </div>
          )}
          {roleSpecificContent}
        </main>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
// SHG + Member + Detail panel (reusable)
// -----------------------------------------------------------------

function BlockShgPanel({ blockId, blockName, contextLabel }) {
  const [shgs, setShgs] = useState([]);
  const [shgMeta, setShgMeta] = useState({ page: 1, page_size: 10, total: 0 });
  const [shgLoading, setShgLoading] = useState(false);
  const [shgError, setShgError] = useState('');

  const [shgSearch, setShgSearch] = useState('');
  const [shgOrdering, setShgOrdering] = useState('');
  const [shgGroupBy, setShgGroupBy] = useState('');
  const [shgFields, setShgFields] = useState('');

  const [selectedShg, setSelectedShg] = useState(null);

  const [members, setMembers] = useState([]);
  const [memberMeta, setMemberMeta] = useState({ page: 1, page_size: 10, total: 0 });
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberOrdering, setMemberOrdering] = useState('');

  const [memberDetail, setMemberDetail] = useState(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [memberDetailError, setMemberDetailError] = useState('');

  // load SHGs whenever block / filters change
  useEffect(() => {
    if (!blockId) return;
    loadShgs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, shgSearch, shgOrdering, shgGroupBy, shgFields]);

  async function loadShgs(page) {
    if (!blockId) return;
    setShgLoading(true);
    setShgError('');
    try {
      const params = {
        page,
        page_size: 20,
      };
      if (shgSearch) params.search = shgSearch;
      if (shgOrdering) params.ordering = shgOrdering;
      if (shgGroupBy) params.group_by = shgGroupBy;
      if (shgFields) params.fields = shgFields;

      const res = await api.get(`/upsrlm-shg-list/${blockId}/`, { params });
      const payload = res.data || {};
      const meta = payload.meta || { page, page_size: 20, total: (payload.data || []).length };
      setShgMeta(meta);
      setShgs(payload.data || []);
      // reset member/more when SHG set changes
      setSelectedShg(null);
      setMembers([]);
      setMemberMeta({ page: 1, page_size: 10, total: 0 });
      setMemberDetail(null);
    } catch (err) {
      console.error('Error fetching SHGs', err);
      setShgError('Could not load SHG list for this block.');
    } finally {
      setShgLoading(false);
    }
  }

  async function loadMembers(shgCode, page) {
    if (!shgCode) return;
    setMemberLoading(true);
    setMemberError('');
    try {
      const params = { page, page_size: 20 };
      if (memberSearch) params.search = memberSearch;
      if (memberOrdering) params.ordering = memberOrdering;

      const res = await api.get(`/upsrlm-shg-members/${encodeURIComponent(shgCode)}/`, { params });
      const payload = res.data || {};
      const meta = payload.meta || { page, page_size: 20, total: (payload.data || []).length };
      setMemberMeta(meta);
      setMembers(payload.data || []);
    } catch (err) {
      console.error('Error loading members', err);
      setMemberError('Could not load members for this SHG.');
    } finally {
      setMemberLoading(false);
    }
  }

  async function loadMemberDetail(memberCode) {
    if (!memberCode) return;
    setMemberDetailLoading(true);
    setMemberDetailError('');
    try {
      const res = await api.get(`/upsrlm-shg-members/search=${encodeURIComponent(memberCode)}/`);
      setMemberDetail(res.data || null);
    } catch (err) {
      console.error('Error loading beneficiary detail', err);
      setMemberDetailError('Could not load full beneficiary detail.');
    } finally {
      setMemberDetailLoading(false);
    }
  }

  const onClickShg = (shg) => {
    setSelectedShg(shg);
    setMemberDetail(null);
    loadMembers(shg.shg_code, 1);
  };

  const onClickMember = (m) => {
    loadMemberDetail(m.member_code);
  };

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-header space-between">
        <div>
          <h2 style={{ marginBottom: 4 }}>
            SHGs in Block – <span className="badge">{blockName || blockId}</span>
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            {contextLabel}
          </p>
        </div>
      </div>

      {/* SHG filters */}
      <div className="filters-row" style={{ marginTop: 12, marginBottom: 12 }}>
        <div className="filters-group">
          <label>
            Search SHGs
            <input
              type="text"
              value={shgSearch}
              onChange={(e) => setShgSearch(e.target.value)}
              placeholder="Search by SHG name / code / village"
            />
          </label>
        </div>
        <div className="filters-group">
          <label>
            Ordering
            <select value={shgOrdering} onChange={(e) => setShgOrdering(e.target.value)}>
              <option value="">Default</option>
              <option value="shg_name">SHG Name (A–Z)</option>
              <option value="-shg_name">SHG Name (Z–A)</option>
              <option value="shg_code">SHG Code (asc)</option>
              <option value="-shg_code">SHG Code (desc)</option>
              <option value="village_name">Village (A–Z)</option>
              <option value="-village_name">Village (Z–A)</option>
            </select>
          </label>
        </div>
        <div className="filters-group">
          <label>
            group_by (advanced)
            <input
              type="text"
              value={shgGroupBy}
              onChange={(e) => setShgGroupBy(e.target.value)}
              placeholder="e.g. village_name"
            />
          </label>
        </div>
        <div className="filters-group">
          <label>
            fields (projection)
            <input
              type="text"
              value={shgFields}
              onChange={(e) => setShgFields(e.target.value)}
              placeholder="e.g. shg_name,shg_code"
            />
          </label>
        </div>
      </div>

      {shgError && <div className="alert alert-danger">{shgError}</div>}

      {/* three-column layout: SHGs – Members – Member detail */}
      <div className="flex" style={{ gap: 16, alignItems: 'flex-start' }}>
        {/* SHG table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>SHG List</h3>
          {shgLoading ? (
            <div className="table-spinner">
              <span>Loading SHGs…</span>
            </div>
          ) : shgs.length === 0 ? (
            <p className="muted">No SHGs found for this block.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>SHG Name</th>
                    <th>SHG Code</th>
                    <th>Village</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shgs.map((shg) => (
                    <tr
                      key={shg.shg_code}
                      className={selectedShg && selectedShg.shg_code === shg.shg_code ? 'row-selected' : ''}
                    >
                      <td>{shg.shg_name}</td>
                      <td>{shg.shg_code}</td>
                      <td>{shg.village_name}</td>
                      <td>
                        <button className="btn-sm btn-outline" onClick={() => onClickShg(shg)}>
                          View Members
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shgMeta && shgMeta.total > shgMeta.page_size && (
                <div className="pagination">
                  <button
                    disabled={shgMeta.page <= 1}
                    onClick={() => loadShgs(shgMeta.page - 1)}
                    className="btn-sm btn-flat"
                  >
                    Prev
                  </button>
                  <span>
                    Page {shgMeta.page} of {Math.ceil(shgMeta.total / shgMeta.page_size)}
                  </span>
                  <button
                    disabled={shgMeta.page * shgMeta.page_size >= shgMeta.total}
                    onClick={() => loadShgs(shgMeta.page + 1)}
                    className="btn-sm btn-flat"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Members table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>
            Members{' '}
            {selectedShg ? (
              <span className="badge">
                {selectedShg.shg_name} ({selectedShg.shg_code})
              </span>
            ) : (
              <span className="muted">(Select an SHG)</span>
            )}
          </h3>

          {/* member filters */}
          <div className="filters-row" style={{ marginBottom: 8 }}>
            <div className="filters-group">
              <label>
                Search Members
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by name / code / mobile"
                />
              </label>
            </div>
            <div className="filters-group">
              <label>
                Ordering
                <select value={memberOrdering} onChange={(e) => setMemberOrdering(e.target.value)}>
                  <option value="">Default</option>
                  <option value="member_name">Name (A–Z)</option>
                  <option value="-member_name">Name (Z–A)</option>
                  <option value="member_code">Code (asc)</option>
                  <option value="-member_code">Code (desc)</option>
                </select>
              </label>
            </div>
            <div className="filters-group">
              <button
                className="btn-sm btn-flat"
                disabled={!selectedShg}
                onClick={() => selectedShg && loadMembers(selectedShg.shg_code, 1)}
              >
                Apply
              </button>
            </div>
          </div>

          {memberError && <div className="alert alert-danger">{memberError}</div>}

          {memberLoading ? (
            <div className="table-spinner">
              <span>Loading members…</span>
            </div>
          ) : !selectedShg ? (
            <p className="muted">Select an SHG above to view members.</p>
          ) : members.length === 0 ? (
            <p className="muted">No members found for this SHG.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Member Code</th>
                    <th>Mobile</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.member_code}>
                      <td>{m.member_name}</td>
                      <td>{m.member_code}</td>
                      <td>{m.mobile || m.mobile_no || '-'}</td>
                      <td>
                        <button className="btn-sm btn-outline" onClick={() => onClickMember(m)}>
                          View Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {memberMeta && memberMeta.total > memberMeta.page_size && (
                <div className="pagination">
                  <button
                    disabled={memberMeta.page <= 1}
                    onClick={() => loadMembers(selectedShg.shg_code, memberMeta.page - 1)}
                    className="btn-sm btn-flat"
                  >
                    Prev
                  </button>
                  <span>
                    Page {memberMeta.page} of {Math.ceil(memberMeta.total / memberMeta.page_size)}
                  </span>
                  <button
                    disabled={memberMeta.page * memberMeta.page_size >= memberMeta.total}
                    onClick={() => loadMembers(selectedShg.shg_code, memberMeta.page + 1)}
                    className="btn-sm btn-flat"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Member detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>Beneficiary Detail</h3>
          {memberDetailLoading ? (
            <div className="table-spinner">
              <span>Loading detail…</span>
            </div>
          ) : memberDetailError ? (
            <div className="alert alert-danger">{memberDetailError}</div>
          ) : !memberDetail ? (
            <p className="muted">Click on a member to see full detail.</p>
          ) : (
            <MemberDetailPanel detail={memberDetail} />
          )}
        </div>
      </div>
    </div>
  );
}

function MemberDetailPanel({ detail }) {
  const basic = detail.basic || {};
  const shg = detail.shg || {};
  const epsakhi = detail.epsakhi || {};

  return (
    <div className="card soft" style={{ padding: 12 }}>
      <h4 style={{ marginTop: 0 }}>{basic.member_name || 'Member'}</h4>
      <p className="muted" style={{ marginTop: 0 }}>
        Member Code: <strong>{basic.member_code}</strong>
      </p>

      <div className="flex" style={{ gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h5>Basic</h5>
          <ul className="detail-list">
            <li>
              <strong>SHG Code:</strong> {basic.lokos_shg_code || shg.shg_code || '-'}
            </li>
            <li>
              <strong>Mobile:</strong> {basic.mobile_no || '-'}
            </li>
            <li>
              <strong>District:</strong> {basic.district_name || shg.district_name || '-'}
            </li>
            <li>
              <strong>Block:</strong> {basic.block_name || shg.block_name || '-'}
            </li>
            <li>
              <strong>Village:</strong> {basic.village_name || shg.village_name || '-'}
            </li>
          </ul>
        </div>

        <div style={{ flex: 1 }}>
          <h5>Enterprise / TMS linkage</h5>
          {epsakhi && Object.keys(epsakhi).length > 0 ? (
            <ul className="detail-list">
              <li>
                <strong>Recorded Beneficiary ID:</strong> {epsakhi.recorded_benef_id || '-'}
              </li>
              <li>
                <strong>Enterprise Name:</strong> {epsakhi.enterprise_name || '-'}
              </li>
              <li>
                <strong>Enterprise Type:</strong> {epsakhi.enterprise_type || '-'}
              </li>
              <li>
                <strong>Training Received:</strong> {epsakhi.is_training_received ? 'Yes' : 'No'}
              </li>
            </ul>
          ) : (
            <p className="muted">No TMS / enterprise detail linked yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------
// Role-specific dashboards
// -----------------------------------------------------------------

// BMMU: directly show SHGs of the block from geoscope
function BmmuDashboard({ geo }) {
  const blockId = geo?.blocks && geo.blocks.length > 0 ? geo.blocks[0] : null;
  const [blockName, setBlockName] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadBlockName() {
      if (!blockId) return;
      try {
        const res = await api.get(`/lookups/blocks/detail/${blockId}/`);
        if (!cancelled) {
          const data = res.data || {};
          setBlockName(data.block_name_en || `Block ${blockId}`);
        }
      } catch {
        if (!cancelled) {
          setBlockName(`Block ${blockId}`);
        }
      }
    }
    loadBlockName();
    return () => {
      cancelled = true;
    };
  }, [blockId]);

  return (
    <section>
      <div className="header-row">
        <div>
          <h1>Block Mission Management Unit (BMMU)</h1>
          <p className="muted">
            Dashboard shows SHGs for your block and their members. Use search / ordering to analyse SHGs.
          </p>
        </div>
        <div>
          <span className="badge">BMMU</span>
        </div>
      </div>

      {!blockId ? (
        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          No block is mapped to your BMMU user. Please contact State team to configure your geoscope.
        </div>
      ) : (
        <BlockShgPanel
          blockId={blockId}
          blockName={blockName}
          contextLabel="You are seeing SHGs fetched from UPSRLM (APISetu) for your mapped block."
        />
      )}
    </section>
  );
}

// DMMU: list blocks in district; clicking a block shows SHGs for that block
function DmmuDashboard({ geo }) {
  return <DistrictBlocksDashboard geo={geo} roleLabel="DMMU" />;
}

// DCNRLM: same behaviour as DMMU but separate component
function DcnrlmDashboard({ geo }) {
  return <DistrictBlocksDashboard geo={geo} roleLabel="DCNRLM" />;
}

function DistrictBlocksDashboard({ geo, roleLabel }) {
  const districtId = geo?.districts && geo.districts.length > 0 ? geo.districts[0] : null;
  const [districtName, setDistrictName] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [blockMeta, setBlockMeta] = useState({ page: 1, page_size: 50, total: 0 });
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksError, setBlocksError] = useState('');
  const [selectedBlock, setSelectedBlock] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDistrictName() {
      if (!districtId) return;
      try {
        const res = await api.get(`/lookups/districts/detail/${districtId}/`);
        if (!cancelled) {
          const data = res.data || {};
          setDistrictName(data.district_name_en || `District ${districtId}`);
        }
      } catch {
        if (!cancelled) setDistrictName(`District ${districtId}`);
      }
    }

    loadDistrictName();
    return () => {
      cancelled = true;
    };
  }, [districtId]);

  useEffect(() => {
    if (!districtId) return;
    loadBlocks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId]);

  async function loadBlocks(page) {
    if (!districtId) return;
    setBlocksLoading(true);
    setBlocksError('');
    try {
      const params = { district_id: districtId, page, page_size: 100 };
      const res = await api.get('/lookups/blocks/', { params });
      const payload = res.data || {};
      const meta = payload.meta || { page, page_size: 100, total: (payload.results || payload.data || []).length };
      const rows = payload.results || payload.data || [];
      setBlockMeta(meta);
      setBlocks(rows);
      setSelectedBlock(null);
    } catch (err) {
      console.error('Error fetching blocks for district', err);
      setBlocksError('Could not load blocks for your district.');
    } finally {
      setBlocksLoading(false);
    }
  }

  return (
    <section>
      <div className="header-row">
        <div>
          <h1>{roleLabel} Dashboard</h1>
          <p className="muted">
            Select a block from your district to drill down to SHGs and member details.
          </p>
        </div>
        <div>
          <span className="badge">{roleLabel}</span>
        </div>
      </div>

      {!districtId ? (
        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          No district is mapped to your user. Please contact State team to configure your geoscope.
        </div>
      ) : (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header space-between">
              <div>
                <h2 style={{ marginBottom: 4 }}>
                  Blocks in District – <span className="badge">{districtName || districtId}</span>
                </h2>
                <p className="muted" style={{ margin: 0 }}>
                  Aspirational blocks are highlighted.
                </p>
              </div>
            </div>

            {blocksError && <div className="alert alert-danger">{blocksError}</div>}

            {blocksLoading ? (
              <div className="table-spinner">
                <span>Loading blocks…</span>
              </div>
            ) : blocks.length === 0 ? (
              <p className="muted">No blocks were found for this district.</p>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Block Name</th>
                      <th>Block ID</th>
                      <th>Aspirational</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map((b) => {
                      const isAsp = !!b.is_aspirational;
                      const isSelected = selectedBlock && selectedBlock.block_id === b.block_id;
                      return (
                        <tr key={b.block_id} className={isSelected ? 'row-selected' : ''}>
                          <td>
                            {b.block_name_en}{' '}
                            {isAsp && (
                              <span className="badge" style={{ marginLeft: 6 }}>
                                Aspirational
                              </span>
                            )}
                          </td>
                          <td>{b.block_id}</td>
                          <td>{isAsp ? 'Yes' : 'No'}</td>
                          <td>
                            <button
                              className="btn-sm btn-outline"
                              onClick={() => setSelectedBlock(b)}
                            >
                              View SHGs
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {blockMeta && blockMeta.total > blockMeta.page_size && (
                  <div className="pagination">
                    <button
                      disabled={blockMeta.page <= 1}
                      onClick={() => loadBlocks(blockMeta.page - 1)}
                      className="btn-sm btn-flat"
                    >
                      Prev
                    </button>
                    <span>
                      Page {blockMeta.page} of {Math.ceil(blockMeta.total / blockMeta.page_size)}
                    </span>
                    <button
                      disabled={blockMeta.page * blockMeta.page_size >= blockMeta.total}
                      onClick={() => loadBlocks(blockMeta.page + 1)}
                      className="btn-sm btn-flat"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedBlock && (
            <BlockShgPanel
              blockId={selectedBlock.block_id}
              blockName={selectedBlock.block_name_en}
              contextLabel={`You are viewing SHGs for the selected block under your district (${districtName ||
                districtId}).`}
            />
          )}
        </>
      )}
    </section>
  );
}
