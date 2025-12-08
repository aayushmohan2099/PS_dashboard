// src/pages/Dashboard/DashboardHome.jsx
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LeftNav from "../../components/layout/LeftNav";
import TopNav from "../../components/layout/TopNav";
import { AuthContext } from "../../contexts/AuthContext";
import api, { LOOKUP_API, EPSAKHI_API } from "../../api/axios";
import LoadingModal from "../../components/ui/LoadingModal";
import ModulePlaceholder from "./ModulePlaceholder";

import ShgListTable from "./ShgListTable";
import ShgMemberListTable from "./ShgMemberListTable";
import BeneficiaryDetailPanel from "./BeneficiaryDetailPanel";

// ---- helpers -----------------------------------------------------

const REGION_ROLES = new Set(["bmmu", "dmmu", "dcnrlm"]);
const PARTNER_ROLES = new Set([
  "training_partner",
  "master_trainer",
  "crp_ep",
  "crp_ld",
]);
const ADMIN_ROLES = new Set(["state_admin", "pmu_admin", "smmu"]);

function normalizeRoleName(raw) {
  if (!raw) return "";
  return String(raw).toLowerCase();
}

// -----------------------------------------------------------------
// SHG + member panel for a given block (uses reusable components)
// -----------------------------------------------------------------

function BlockShgPanel({ blockId, blockName, contextLabel }) {
  const [shgSearch, setShgSearch] = useState("");
  const [shgOrdering, setShgOrdering] = useState("");
  const [shgLoading, setShgLoading] = useState(false);
  const [shgError, setShgError] = useState("");
  const [shgRows, setShgRows] = useState([]);
  const [shgMeta, setShgMeta] = useState(null);

  const [selectedShg, setSelectedShg] = useState(null);

  const [shgDetail, setShgDetail] = useState(null);
  const [shgDetailLoading, setShgDetailLoading] = useState(false);
  const [shgDetailError, setShgDetailError] = useState("");

  const [memberSearch, setMemberSearch] = useState("");
  const [memberOrdering, setMemberOrdering] = useState("");
  const [memberPldStatus, setMemberPldStatus] = useState(""); // 1 ⇒ Potential Lakhpati

  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberRows, setMemberRows] = useState([]);
  const [memberMeta, setMemberMeta] = useState(null);

  const [memberDetail, setMemberDetail] = useState(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [memberDetailError, setMemberDetailError] = useState("");

  // ---- SHG list --------------------------------------------------

  async function loadShgs(page = 1) {
    if (!blockId) return;
    setShgLoading(true);
    setShgError("");
    try {
      const res = await EPSAKHI_API.upsrlmShgList(blockId, {
        page,
        page_size: 20,
        search: shgSearch || undefined,
        ordering: shgOrdering || undefined,
      });
      const payload = res.data || {};
      const data = payload.data || payload.results || [];
      const meta = payload.meta || {
        page: page,
        page_size: 20,
        total: Array.isArray(data) ? data.length : 0,
      };
      setShgRows(data);
      setShgMeta(meta);
      // IMPORTANT: do NOT auto-select first SHG.
      // We want user to click SHG first before showing members/detail.
    } catch (e) {
      console.error("SHG list failed", e?.response?.data || e.message || e);
      setShgError(
        e.response?.data?.detail ||
          e.message ||
          "Failed to load SHG list from UPSRLM."
      );
    } finally {
      setShgLoading(false);
    }
  }

  // ---- SHG detail ------------------------------------------------

  async function loadShgDetail(shgCode) {
    if (!shgCode) return;
    setShgDetailLoading(true);
    setShgDetailError("");
    try {
      const res = await EPSAKHI_API.upsrlmShgDetail(shgCode, {});
      const payload = res?.data || {};
      // UpsrlmShgDetailView returns {"data": {...}} or plain {...}
      const data = payload.data || payload;
      setShgDetail(data || null);
    } catch (e) {
      console.error("SHG detail failed", e?.response?.data || e.message || e);
      setShgDetailError(
        e.response?.data?.detail ||
          e.message ||
          "Failed to load SHG detail from UPSRLM."
      );
    } finally {
      setShgDetailLoading(false);
    }
  }

  // ---- SHG → members list ----------------------------------------

  async function loadMembers(shgCode, page = 1) {
    if (!shgCode) return;
    setMemberLoading(true);
    setMemberError("");
    try {
      const res = await EPSAKHI_API.upsrlmShgMembers(shgCode, {
        page,
        page_size: 20,
        search: memberSearch || undefined,
        ordering: memberOrdering || undefined,
        pld_status: memberPldStatus || undefined,
      });
      const payload = res.data || {};
      const data = payload.data || payload.results || [];
      const meta = payload.meta || {
        page,
        page_size: 20,
        total: Array.isArray(data) ? data.length : 0,
      };
      setMemberRows(data);
      setMemberMeta(meta);
    } catch (e) {
      console.error("Members list failed", e?.response?.data || e.message || e);
      setMemberError(
        e.response?.data?.detail ||
          e.message ||
          "Failed to load SHG members from UPSRLM."
      );
    } finally {
      setMemberLoading(false);
    }
  }

  // reload SHGs whenever filters / block change
  useEffect(() => {
    setSelectedShg(null);
    setMemberRows([]);
    setMemberMeta(null);
    setMemberDetail(null);
    setShgDetail(null);
    if (blockId) {
      loadShgs(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, shgSearch, shgOrdering]);

  // reload members when member filters change for the selected SHG
  useEffect(() => {
    if (!selectedShg) return;
    loadMembers(selectedShg.shg_code, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberSearch, memberOrdering, memberPldStatus]);

  // ---- Member detail (combined) ----------------------------------
  // As per spec: use upsrlm-shg-members/<shg_code>/?search=<member_code>
  // to get full member row, AND also get EPSakhi linkage.

  async function loadMemberDetail(member) {
    if (!member) return;
    const memberCode = member.member_code || member.lokos_member_code;
    const shgCode = member.shg_code || selectedShg?.shg_code;

    if (!memberCode || !shgCode) {
      setMemberDetailError("Member or SHG code not available.");
      return;
    }

    setMemberDetailLoading(true);
    setMemberDetailError("");
    try {
      const [memberRes, epsRes] = await Promise.all([
        EPSAKHI_API.upsrlmShgMembers(shgCode, {
          page: 1,
          page_size: 1,
          search: memberCode,
        }),
        EPSAKHI_API.beneficiaryRecordedByMember(memberCode, {}),
      ]);

      const memberPayload = memberRes?.data || {};
      const rows = memberPayload.data || memberPayload.results || [];
      const memberRow = rows[0] || {};

      const epsRaw = epsRes?.data || {};
      const beneficiaryRec = epsRaw.beneficiary || {};
      const enterprise = epsRaw.enterprise || {};
      const enterpriseType = epsRaw.enterprise_type || null;

      const basic = {
        member_name: memberRow.member_name || member.member_name,
        member_code: memberRow.member_code || memberCode,
        lokos_shg_code:
          memberRow.shg_code ||
          member.shg_code ||
          (selectedShg && selectedShg.shg_code),
        mobile_no: memberRow.mobile || memberRow.mobile_no || null,
        district_name: memberRow.district_name || memberRow.district_name_en,
        block_name: memberRow.block_name || memberRow.block_name_en,
        village_name: memberRow.village_name || memberRow.village_name_en,
      };

      const shg = {
        shg_code: shgCode,
        district_name: basic.district_name,
        block_name: basic.block_name,
        village_name: basic.village_name,
      };

      const epsakhi = {
        recorded_benef_id:
          beneficiaryRec.TH_urid || beneficiaryRec.id || beneficiaryRec.pk,
        enterprise_name: enterprise.enterprise_name || enterprise.name || null,
        enterprise_type: enterpriseType,
        is_training_received: !!enterprise.is_training_received,
      };

      setMemberDetail({ basic, shg, epsakhi });
    } catch (e) {
      console.error(
        "Member detail fetch failed",
        e?.response?.data || e.message || e
      );
      setMemberDetailError(
        e.response?.data?.detail ||
          e.message ||
          "Failed to fetch beneficiary detail."
      );
    } finally {
      setMemberDetailLoading(false);
    }
  }

  function handleClickMember(m) {
    setMemberDetail(null);
    loadMemberDetail(m);
  }

  const hasSelectedShg = !!selectedShg;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="header-row">
        <div>
          <h2>
            SHGs in Block: <span style={{ color: "#111827" }}>{blockName}</span>
          </h2>
          <p className="muted" style={{ marginTop: 4 }}>
            {contextLabel}
          </p>
        </div>
      </div>

      {/* STEP 1: Only SHG list until an SHG is clicked */}
      {!hasSelectedShg ? (
        <div className="flex" style={{ gap: 16, alignItems: "flex-start" }}>
          <ShgListTable
            rows={shgRows}
            meta={shgMeta}
            loading={shgLoading}
            error={shgError}
            search={shgSearch}
            ordering={shgOrdering}
            onSearchChange={setShgSearch}
            onOrderingChange={setShgOrdering}
            onApplyFilters={() => loadShgs(1)}
            onPageChange={(page) => loadShgs(page)}
            selectedShgCode={null}
            onSelectShg={(shg) => {
              setSelectedShg(shg);
              setMemberDetail(null);
              setShgDetail(null);
              loadShgDetail(shg.shg_code);
              loadMembers(shg.shg_code, 1);
            }}
          />
        </div>
      ) : (
        // STEP 2 & 3: Once SHG is clicked, show SHG detail + members + member detail
        <div className="flex" style={{ gap: 16, alignItems: "flex-start" }}>
          {/* Left: SHG list */}
          <ShgListTable
            rows={shgRows}
            meta={shgMeta}
            loading={shgLoading}
            error={shgError}
            search={shgSearch}
            ordering={shgOrdering}
            onSearchChange={setShgSearch}
            onOrderingChange={setShgOrdering}
            onApplyFilters={() => loadShgs(1)}
            onPageChange={(page) => loadShgs(page)}
            selectedShgCode={selectedShg?.shg_code || null}
            onSelectShg={(shg) => {
              setSelectedShg(shg);
              setMemberDetail(null);
              setShgDetail(null);
              loadShgDetail(shg.shg_code);
              loadMembers(shg.shg_code, 1);
            }}
          />

          {/* Middle: SHG detail + members */}
          <div style={{ flex: 2.2, minWidth: 0 }}>
            {selectedShg && (
              <div className="card soft" style={{ marginBottom: 12 }}>
                <h3 style={{ marginTop: 0 }}>SHG Detail</h3>
                {shgDetailLoading ? (
                  <div className="table-spinner">
                    <span>Loading SHG detail…</span>
                  </div>
                ) : shgDetailError ? (
                  <div className="alert alert-danger">{shgDetailError}</div>
                ) : shgDetail ? (
                  <table className="table table-compact">
                    <tbody>
                      <tr>
                        <td>
                          <strong>Name</strong>
                        </td>
                        <td>{shgDetail.shg_name || selectedShg.shg_name}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Code</strong>
                        </td>
                        <td>{shgDetail.shg_code || selectedShg.shg_code}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Village</strong>
                        </td>
                        <td>
                          {shgDetail.village_name || selectedShg.village_name}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Bank Linked</strong>
                        </td>
                        <td>{shgDetail.bank_linked ? "Yes" : "No"}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p className="muted">No extra SHG detail fetched.</p>
                )}
              </div>
            )}

            <ShgMemberListTable
              rows={memberRows}
              meta={memberMeta}
              loading={memberLoading}
              error={memberError}
              selectedShg={selectedShg}
              search={memberSearch}
              ordering={memberOrdering}
              pldStatus={memberPldStatus}
              onSearchChange={setMemberSearch}
              onOrderingChange={setMemberOrdering}
              onPldStatusChange={setMemberPldStatus}
              onApplyFilters={() =>
                selectedShg && loadMembers(selectedShg.shg_code, 1)
              }
              onPageChange={(page) =>
                selectedShg && loadMembers(selectedShg.shg_code, page)
              }
              onClickMember={handleClickMember}
            />
          </div>

          {/* Right: Beneficiary detail */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>Beneficiary Detail</h3>
            <BeneficiaryDetailPanel
              detail={memberDetail}
              loading={memberDetailLoading}
              error={memberDetailError}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------
// Role-specific dashboards
// -----------------------------------------------------------------

// BMMU: directly show SHGs of the block from geoscope
function BmmuDashboard({ geo }) {
  const blockId = geo?.blocks && geo.blocks.length > 0 ? geo.blocks[0] : null;
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
            Dashboard shows SHGs for your block and their members. Use search /
            ordering to analyse SHGs.
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
  const districtId =
    geo?.districts && geo.districts.length > 0 ? geo.districts[0] : null;

  const [districtName, setDistrictName] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [blockMeta, setBlockMeta] = useState({
    page: 1,
    page_size: 50,
    total: 0,
  });
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState("");
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
        if (!cancelled) {
          setDistrictName(`District ${districtId}`);
        }
      }
    }
    loadDistrictName();
    return () => {
      cancelled = true;
    };
  }, [districtId]);

  async function loadBlocks(page = 1) {
    if (!districtId) return;
    setBlockLoading(true);
    setBlockError("");
    try {
      const res = await api.get("/lookups/blocks/", {
        params: {
          district_id: districtId,
          page,
          page_size: 50,
          is_aspirational: onlyAspirational ? 1 : undefined,
        },
      });
      const payload = res.data || {};
      const results = payload.results || payload.data || [];
      const count = payload.count ?? results.length;

      setBlocks(results);
      setBlockMeta({
        page,
        page_size: 50,
        total: count,
      });
    } catch (e) {
      console.error("Blocks list failed", e?.response?.data || e.message || e);
      setBlockError(
        e.response?.data?.detail ||
          e.message ||
          "Failed to load blocks for this district."
      );
    } finally {
      setBlockLoading(false);
    }
  }

  useEffect(() => {
    loadBlocks(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId, onlyAspirational]);

  const currentBlockPage = blockMeta.page;
  const totalBlockPages = Math.max(
    1,
    Math.ceil(blockMeta.total / blockMeta.page_size)
  );

  return (
    <section>
      <div className="header-row">
        <div>
          <h1>{roleLabel} Dashboard</h1>
          <p className="muted">
            Start from blocks in your district and drill down to SHGs & members.
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
            <div className="header-row">
              <div>
                <h2>
                  Blocks in District:{" "}
                  <span style={{ color: "#111827" }}>{districtName}</span>
                </h2>
                <p className="muted">
                  Use the filter to see only Aspirational blocks if required.
                </p>
              </div>
            </div>

            <div className="filters-row">
              <label
                style={{ display: "flex", alignItems: "center", gap: 4 }}
                className="small-muted"
              >
                <input
                  type="checkbox"
                  checked={onlyAspirational}
                  onChange={(e) => setOnlyAspirational(e.target.checked)}
                />
                Aspirational Blocks in this District
              </label>
            </div>

            {blockLoading ? (
              <div className="table-spinner">
                <span>Loading blocks…</span>
              </div>
            ) : blockError ? (
              <div className="alert alert-danger">{blockError}</div>
            ) : (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Block Name</th>
                      <th>Block Code</th>
                      <th>Aspirational</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map((b) => (
                      <tr key={b.block_id}>
                        <td>{b.block_name_en}</td>
                        <td>{b.block_id}</td>
                        <td>{b.is_aspirational ? "Yes" : "No"}</td>
                        <td>
                          <button
                            className="btn-sm btn-outline"
                            onClick={() => setSelectedBlock(b)}
                          >
                            View SHGs
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {blockMeta.total > blockMeta.page_size && (
                  <div className="pagination">
                    <button
                      disabled={currentBlockPage <= 1}
                      onClick={() => loadBlocks(currentBlockPage - 1)}
                      className="btn-sm btn-flat"
                    >
                      Prev
                    </button>
                    <span>
                      Page {currentBlockPage} of {totalBlockPages}
                    </span>
                    <button
                      disabled={currentBlockPage >= totalBlockPages}
                      onClick={() => loadBlocks(currentBlockPage + 1)}
                      className="btn-sm btn-flat"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {selectedBlock && (
            <BlockShgPanel
              blockId={selectedBlock.block_id}
              blockName={selectedBlock.block_name_en}
              contextLabel="You are seeing SHGs fetched from UPSRLM (APISetu) for the selected block."
            />
          )}
        </>
      )}
    </section>
  );
}

// -----------------------------------------------------------------
// Main DashboardHome (entry for /dashboard)
// -----------------------------------------------------------------

export default function DashboardHome() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [geo, setGeo] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    if (!user || !user.id) return;

    let cancelled = false;
    async function loadGeoscope() {
      setGeoLoading(true);
      setGeoError("");
      try {
        const res = await LOOKUP_API.userGeoscopeByUserId(user.id, {});
        if (!cancelled) {
          setGeo(res.data || null);
        }
      } catch (e) {
        console.error("user geoscope fetch failed", e?.response?.data || e);
        if (!cancelled) {
          setGeoError(
            e.response?.data?.detail ||
              e.message ||
              "Failed to load user geoscope."
          );
        }
      } finally {
        if (!cancelled) {
          setGeoLoading(false);
        }
      }
    }

    loadGeoscope();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const effectiveRole = normalizeRoleName(geo?.role || user?.role_name);
  const isRegionRole = REGION_ROLES.has(effectiveRole);
  const isPartnerRole = PARTNER_ROLES.has(effectiveRole);
  const isAdminRole = ADMIN_ROLES.has(effectiveRole);

  let mainContent = null;

  if (geoLoading) {
    mainContent = (
      <LoadingModal
        open={true}
        title="Loading dashboard"
        message="Fetching your geo-scope and dashboard data…"
      />
    );
  } else if (geoError) {
    mainContent = (
      <div className="alert alert-danger" style={{ marginTop: 16 }}>
        {geoError}
      </div>
    );
  } else if (!user) {
    mainContent = (
      <div style={{ padding: 24 }}>
        <div className="alert alert-warning">
          You are not logged in. Please log in again.
        </div>
        <button
          className="btn"
          style={{ marginTop: 8 }}
          onClick={() => navigate("/login")}
        >
          Go to Login
        </button>
      </div>
    );
  } else if (isRegionRole && effectiveRole === "bmmu") {
    mainContent = <BmmuDashboard geo={geo} />; // Beneficiary Management at Block level
  } else if (isRegionRole && effectiveRole === "dmmu") {
    mainContent = <DmmuDashboard geo={geo} />; // Beneficiary Management at District -> Block level
  } else if (isRegionRole && effectiveRole === "dcnrlm") {
    mainContent = <DcnrlmDashboard geo={geo} />; // Beneficiary Management for DCNRLM
  } else if (isPartnerRole) {
    mainContent = (
      <ModulePlaceholder
        title="Training Partner / Master Trainer dashboard"
        description="Your TMS dashboard will appear here. Use the TMS menus to manage batches and trainings."
      />
    );
  } else if (isAdminRole) {
    mainContent = (
      <ModulePlaceholder
        title="Admin / SMMU Dashboard"
        description="State / PMU / SMMU overview dashboards will be configured here."
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

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="topnav-left">
              <div className="app-title">Pragati Setu</div>
            </div>
          }
          right={<div className="topnav-right"></div>}
        />
        <main className="dashboard-main" style={{ padding: 18 }}>
          {mainContent}
        </main>
      </div>
    </div>
  );
}
