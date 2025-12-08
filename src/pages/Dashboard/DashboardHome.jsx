// src/pages/Dashboard/DashboardHome.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import LeftNav from "../../components/layout/LeftNav";
import TopNav from "../../components/layout/TopNav";
import { AuthContext } from "../../contexts/AuthContext";
import api from "../../api/axios";
import LoadingModal from "../../components/ui/LoadingModal";
import ModulePlaceholder from "./ModulePlaceholder";

import ShgListTable from "./ShgListTable";
import ShgDetailCard from "./ShgDetailCard";
import ShgMemberListTable from "./ShgMemberListTable";
import MemberDetailPanel from "./MemberDetailPanel";

// If you have TMS LeftNav and want TMS roles to default to it:
import TmsLeftNav from "../TMS/layout/tms_LeftNav";

// ---- helpers -----------------------------------------------------

const REGION_ROLES = new Set(["bmmu", "dmmu", "dcnrlm"]);
const PARTNER_ROLES = new Set([
  "training_partner",
  "master_trainer",
  "crp_ep",
  "crp_ld",
]);
const ADMIN_ROLES = new Set(["state_admin", "pmu_admin", "smmu"]);

// normalise whatever backend sends (BMMU_USER, DMMU_ROLE, etc.)
function normalizeRoleName(raw) {
  if (!raw) return "";
  const v = String(raw).toLowerCase();
  if (v.startsWith("bmmu")) return "bmmu";
  if (v.startsWith("dmmu")) return "dmmu";
  if (v.startsWith("dcnrlm")) return "dcnrlm";
  if (v.includes("state") && v.includes("admin")) return "state_admin";
  if (v.includes("pmu")) return "pmu_admin";
  if (v.includes("smmu")) return "smmu";
  if (v.includes("training_partner")) return "training_partner";
  if (v.includes("master_trainer")) return "master_trainer";
  if (v.includes("crp_ep")) return "crp_ep";
  if (v.includes("crp_ld")) return "crp_ld";
  return v;
}

// key used to store geoscope in localStorage (LeftNav / TopNav already expect this)
const GEOSCOPE_KEY = "ps_user_geoscope";

// -----------------------------------------------------------------
// Reusable Block → SHG → Member explorer (step-based)
// -----------------------------------------------------------------

function BlockShgExplorer({ blockId, blockName }) {
  const [selectedShg, setSelectedShg] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  // 'shgs' | 'shgDetail' | 'members' | 'memberDetail'
  const [step, setStep] = useState("shgs");

  // reset when block changes
  useEffect(() => {
    setSelectedShg(null);
    setSelectedMember(null);
    setStep("shgs");
  }, [blockId]);

  const handleSelectShg = (shg) => {
    setSelectedShg(shg);
    setSelectedMember(null);
    // First show only SHG detail on a blank screen
    setStep("shgDetail");
  };

  const handleFetchMembers = () => {
    if (!selectedShg) return;
    setSelectedMember(null);
    setStep("members");
  };

  const handleSelectMember = (m) => {
    setSelectedMember(m || null);
    // Blank page then only Member detail
    setStep("memberDetail");
  };

  const handleBackToShgs = () => {
    setSelectedShg(null);
    setSelectedMember(null);
    setStep("shgs");
  };

  const handleBackToShgDetail = () => {
    setSelectedMember(null);
    setStep("shgDetail");
  };

  const handleBackToMembers = () => {
    setStep("members");
  };

  return (
    <>
      {/* Step 1: SHG list */}
      {step === "shgs" && (
        <ShgListTable
          blockId={blockId}
          onSelectShg={handleSelectShg}
          selectedShgCode={selectedShg?.code}
        />
      )}

      {/* Step 2: SHG detail (alone, with back + fetch members) */}
      {step === "shgDetail" && selectedShg && (
        <>
          <div style={{ marginBottom: 8 }}>
            <button
              className="btn-sm btn-flat"
              onClick={handleBackToShgs}
              style={{ marginRight: 8 }}
            >
              ← Back to SHG List
            </button>
          </div>
          <ShgDetailCard shg={selectedShg} />
          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={handleFetchMembers}>
              Fetch Members
            </button>
          </div>
        </>
      )}

      {/* Step 3: Members list (blank page before it, then list + back buttons) */}
      {step === "members" && selectedShg && (
        <>
          <div style={{ marginBottom: 8 }}>
            <button
              className="btn-sm btn-flat"
              onClick={handleBackToShgs}
              style={{ marginRight: 8 }}
            >
              ← Back to SHG List
            </button>
            <button
              className="btn-sm btn-flat"
              onClick={handleBackToShgDetail}
            >
              ← Back to SHG Detail
            </button>
          </div>
          <ShgMemberListTable
            shg={selectedShg}
            onSelectMember={handleSelectMember}
            selectedMemberCode={selectedMember?.member_code}
          />
        </>
      )}

      {/* Step 4: Member detail (blank page with only detail + back buttons) */}
      {step === "memberDetail" && selectedShg && selectedMember && (
        <>
          <div style={{ marginBottom: 8 }}>
            <button
              className="btn-sm btn-flat"
              onClick={handleBackToShgs}
              style={{ marginRight: 8 }}
            >
              ← Back to SHG List
            </button>
            <button
              className="btn-sm btn-flat"
              onClick={handleBackToMembers}
            >
              ← Back to Members
            </button>
          </div>
          <MemberDetailPanel
            shgCode={selectedShg.code || selectedShg.shg_code}
            memberCode={selectedMember.member_code}
          />
        </>
      )}
    </>
  );
}

// -----------------------------------------------------------------
// Role-specific dashboards
// -----------------------------------------------------------------

// BMMU: directly show SHGs of the block from geoscope
function BmmuDashboard({ geo }) {
  const blockId =
    geo?.blocks && Array.isArray(geo.blocks) && geo.blocks.length > 0
      ? geo.blocks[0]
      : null;
  const [blockName, setBlockName] = useState("");

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
            Start from SHG list in your block. Click an SHG to view its detail,
            then fetch & view members and finally member details.
          </p>
        </div>
        <div>
          <span className="badge">BMMU</span>
        </div>
      </div>

      {!blockId ? (
        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          No block is mapped to your BMMU user. Please contact State team to
          configure your geoscope.
        </div>
      ) : (
        <>
          <div className="card" style={{ marginTop: 8, marginBottom: 8 }}>
            <div>
              <strong>Block:</strong>{" "}
              <span style={{ color: "#111827" }}>
                {blockName || blockId}
              </span>
            </div>
          </div>
          <BlockShgExplorer blockId={blockId} blockName={blockName} />
        </>
      )}
    </section>
  );
}

// DMMU / DCNRLM: blocks in district → block → SHGs
function DistrictBlocksDashboard({ geo, roleLabel }) {
  const districtId =
    geo?.districts &&
    Array.isArray(geo.districts) &&
    geo.districts.length > 0
      ? geo.districts[0]
      : null;

  const [districtName, setDistrictName] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [blockMeta, setBlockMeta] = useState({
    page: 1,
    page_size: 50,
    total: 0,
  });
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksError, setBlocksError] = useState("");
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [onlyAspirational, setOnlyAspirational] = useState(false);

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

  async function loadBlocks(page = 1) {
    if (!districtId) return;
    setBlocksLoading(true);
    setBlocksError("");
    try {
      const params = {
        district_id: districtId,
        page,
        page_size: blockMeta.page_size || 50,
        is_aspirational: onlyAspirational ? 1 : undefined,
      };
      const res = await api.get("/lookups/blocks/", { params });
      const payload = res.data || {};
      const rows = payload.results || payload.data || [];
      const total =
        typeof payload.count === "number" ? payload.count : rows.length;

      setBlocks(rows);
      setBlockMeta({
        page,
        page_size: blockMeta.page_size || 50,
        total,
      });
      setSelectedBlock(null);
    } catch (err) {
      console.error("Error fetching blocks for district", err);
      setBlocksError("Could not load blocks for your district.");
    } finally {
      setBlocksLoading(false);
    }
  }

  // initial + filter change
  useEffect(() => {
    if (!districtId) return;
    loadBlocks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId, onlyAspirational]);

  const totalPages =
    blockMeta && blockMeta.page_size > 0
      ? Math.max(1, Math.ceil((blockMeta.total || 0) / blockMeta.page_size))
      : 1;

  return (
    <section>
      <div className="header-row">
        <div>
          <h1>{roleLabel} – Beneficiary Management</h1>
          <p className="muted">
            Start with blocks in your district. Click a block to drill down to
            SHGs and then members.
          </p>
        </div>
        <div>
          <span className="badge">{roleLabel}</span>
        </div>
      </div>

      {!districtId ? (
        <div className="alert alert-warning" style={{ marginTop: 16 }}>
          No district is mapped to your user. Please contact State team to
          configure your geoscope.
        </div>
      ) : (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header space-between">
              <div>
                <h2 style={{ marginBottom: 4 }}>
                  Blocks in District –{" "}
                  <span className="badge">
                    {districtName || districtId}
                  </span>
                </h2>
                <p className="muted" style={{ margin: 0 }}>
                  Use the filter to see{" "}
                  <strong>Aspirational Blocks in this District</strong>.
                </p>
              </div>
            </div>

            <div className="filters-row">
              <label
                className="small-muted"
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <input
                  type="checkbox"
                  checked={onlyAspirational}
                  onChange={(e) => setOnlyAspirational(e.target.checked)}
                />
                Aspirational Blocks in this District
              </label>
            </div>

            {blocksError && (
              <div className="alert alert-danger">{blocksError}</div>
            )}

            {blocksLoading ? (
              <div className="table-spinner">
                <span>Loading blocks…</span>
              </div>
            ) : blocks.length === 0 ? (
              <p className="muted">No blocks were found for this district.</p>
            ) : (
              <>
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
                        const isSelected =
                          selectedBlock &&
                          selectedBlock.block_id === b.block_id;
                        return (
                          <tr
                            key={b.block_id}
                            className={isSelected ? "row-selected" : ""}
                          >
                            <td>
                              {b.block_name_en}{" "}
                              {isAsp && (
                                <span
                                  className="badge"
                                  style={{ marginLeft: 6 }}
                                >
                                  Aspirational
                                </span>
                              )}
                            </td>
                            <td>{b.block_id}</td>
                            <td>{isAsp ? "Yes" : "No"}</td>
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
                </div>

                {blockMeta.total > blockMeta.page_size && (
                  <div className="pagination">
                    <button
                      className="btn-sm btn-flat"
                      disabled={blockMeta.page <= 1}
                      onClick={() => loadBlocks(blockMeta.page - 1)}
                    >
                      Prev
                    </button>
                    <span>
                      Page {blockMeta.page} of {totalPages}
                    </span>
                    <button
                      className="btn-sm btn-flat"
                      disabled={blockMeta.page >= totalPages}
                      onClick={() => loadBlocks(blockMeta.page + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {selectedBlock && (
            <BlockShgExplorer
              blockId={selectedBlock.block_id}
              blockName={selectedBlock.block_name_en}
            />
          )}
        </>
      )}
    </section>
  );
}

function DmmuDashboard({ geo }) {
  return <DistrictBlocksDashboard geo={geo} roleLabel="DMMU" />;
}

function DcnrlmDashboard({ geo }) {
  return <DistrictBlocksDashboard geo={geo} roleLabel="DCNRLM" />;
}

// SMMU: All districts → blocks → SHGs → members
function SmmuDashboard() {
  // (unchanged; same as your existing SMMU implementation or placeholder)
  return (
    <section>
      <div className="header-row">
        <div>
          <h1>SMMU – Beneficiary Management</h1>
          <p className="muted">
            Start from any district in the state, drill down to blocks, then
            SHGs and member detail.
          </p>
        </div>
        <div>
          <span className="badge">SMMU</span>
        </div>
      </div>
      <ModulePlaceholder title="SMMU Dashboard" />
    </section>
  );
}

// -----------------------------------------------------------------
// Base DashboardHome
// -----------------------------------------------------------------

export default function DashboardHome() {
  const { user, loading: authLoading, refreshAccess, logout } =
    useContext(AuthContext);
  const [geo, setGeo] = useState(null);
  const [roleNameNormalized, setRoleNameNormalized] = useState("");
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState("");
  const navigate = useNavigate();

  // for idle timeout / activity tracking
  const lastActivityRef = useRef(Date.now());

  // Track user activity (mousemove, keypress, click) and update lastActivityRef
  useEffect(() => {
    function bumpActivity() {
      lastActivityRef.current = Date.now();
    }
    window.addEventListener("click", bumpActivity);
    window.addEventListener("keydown", bumpActivity);
    window.addEventListener("mousemove", bumpActivity);

    return () => {
      window.removeEventListener("click", bumpActivity);
      window.removeEventListener("keydown", bumpActivity);
      window.removeEventListener("mousemove", bumpActivity);
    };
  }, []);

  // Periodically refresh token if active; auto logout on long idle
  useEffect(() => {
    if (!user) return;

    const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    const IDLE_MAX_MS = 30 * 60 * 1000; // 30 minutes

    const timer = setInterval(async () => {
      const now = Date.now();
      const idleFor = now - lastActivityRef.current;

      if (idleFor > IDLE_MAX_MS) {
        // auto logout on idle
        if (logout) {
          logout();
        }
        clearInterval(timer);
        return;
      }

      // user is active enough; refresh token quietly
      try {
        if (refreshAccess) {
          await refreshAccess();
        }
      } catch (e) {
        console.error("Background token refresh failed", e);
        // If refresh fails (e.g. refresh token expired), log out gracefully
        if (logout) {
          logout();
        }
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [user, refreshAccess, logout]);

  // fetch geoscope for logged-in user
  useEffect(() => {
    let cancelled = false;

    async function loadGeo() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setGeoError("");

      try {
        // 1. try localStorage first
        const cachedRaw = window.localStorage.getItem(GEOSCOPE_KEY);
        if (cachedRaw) {
          try {
            const parsed = JSON.parse(cachedRaw);
            if (parsed && parsed.user_id === user.id) {
              if (!cancelled) {
                setGeo(parsed);
                setRoleNameNormalized(
                  normalizeRoleName(parsed.role || user.role_name)
                );
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
          setRoleNameNormalized(
            normalizeRoleName(payload.role || user.role_name)
          );
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading user geoscope", err);
        if (!cancelled) {
          setGeoError(
            "Could not resolve your geographical scope. Please contact administrator."
          );
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
    return <LoadingModal open={true} title="Loading dashboard…" message="" />;
  }

  if (!user) {
    return (
      <div className="app-shell">
        <main className="dashboard-main center">
          <div className="card">
            <p>Your session has ended. Please login again.</p>
            <button
              className="btn"
              style={{ marginTop: 8 }}
              onClick={() => navigate("/login")}
            >
              Go to Login
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isRegionRole = REGION_ROLES.has(roleNameNormalized);
  const isPartnerRole = PARTNER_ROLES.has(roleNameNormalized);
  const isAdminRole = ADMIN_ROLES.has(roleNameNormalized);

  let mainContent = null;

  if (geoError) {
    mainContent = (
      <div className="alert alert-danger" style={{ marginTop: 16 }}>
        {geoError}
      </div>
    );
  } else if (isRegionRole && roleNameNormalized === "bmmu") {
    mainContent = <BmmuDashboard geo={geo} />;
  } else if (isRegionRole && roleNameNormalized === "dmmu") {
    mainContent = <DmmuDashboard geo={geo} />;
  } else if (isRegionRole && roleNameNormalized === "dcnrlm") {
    mainContent = <DcnrlmDashboard geo={geo} />;
  } else if (roleNameNormalized === "smmu") {
    mainContent = <SmmuDashboard />;
  } else if (isPartnerRole) {
    // Master Trainer / Training Partner / CRP etc -> TMS only
    mainContent = (
      <ModulePlaceholder
        title="TMS & Training Management"
        description="Use the TMS menu to manage training requests, batches and attendance."
      />
    );
  } else if (isAdminRole) {
    mainContent = (
      <ModulePlaceholder
        title="Admin Dashboard"
        description="Admin overview dashboards will be configured here."
      />
    );
  } else {
    mainContent = (
      <ModulePlaceholder
        title="Dashboard"
        description="Your role specific dashboard will appear here."
      />
    );
  }

  // For Training / MT / CRP roles → use TMS LeftNav by default
  const useTmsNavForUser = isPartnerRole;

  return (
    <div className="app-shell">
      {useTmsNavForUser ? <TmsLeftNav /> : <LeftNav />}
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu {useTmsNavForUser ? "— TMS" : "— Dashboard"}
            </div>
          }
          // IMPORTANT: do NOT pass `right` so logout/user controls show
        />
        <main className="dashboard-main" style={{ padding: 18 }}>
          {mainContent}
        </main>
      </div>
    </div>
  );
}
