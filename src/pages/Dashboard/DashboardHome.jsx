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
// Reusable Block → SHG → Member explorer (step-based for Block flows)
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
    // show only SHG detail first
    setStep("shgDetail");
  };

  const handleFetchMembers = () => {
    if (!selectedShg) return;
    setSelectedMember(null);
    setStep("members");
  };

  const handleSelectMember = (m) => {
    setSelectedMember(m || null);
    setStep("memberDetail");
  };

  const backToShgs = () => {
    setSelectedShg(null);
    setSelectedMember(null);
    setStep("shgs");
  };

  const backToShgDetail = () => {
    setSelectedMember(null);
    setStep("shgDetail");
  };

  const backToMembers = () => {
    setStep("members");
  };

  return (
    <>
      {/* Step 1: SHG list */}
      {step === "shgs" && (
        <ShgListTable
          blockId={blockId}
          onSelectShg={handleSelectShg}
          selectedShgCode={selectedShg?.shg_code || selectedShg?.code}
        />
      )}

      {/* Step 2: SHG detail (alone, with back + Fetch Members) */}
      {step === "shgDetail" && selectedShg && (
        <>
          <div style={{ marginBottom: 8 }}>
            <button className="btn-sm btn-flat" onClick={backToShgs} style={{ marginRight: 8 }}>
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

      {/* Step 3: Members list */}
      {step === "members" && selectedShg && (
        <>
          <div style={{ marginBottom: 8 }}>
            <button className="btn-sm btn-flat" onClick={backToShgs} style={{ marginRight: 8 }}>
              ← Back to SHG List
            </button>
            <button className="btn-sm btn-flat" onClick={backToShgDetail}>
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

      {/* Step 4: Member detail */}
      {step === "memberDetail" && selectedShg && selectedMember && (
        <>
          <div style={{ marginBottom: 8 }}>
            <button className="btn-sm btn-flat" onClick={backToShgs} style={{ marginRight: 8 }}>
              ← Back to SHG List
            </button>
            <button className="btn-sm btn-flat" onClick={backToMembers}>
              ← Back to Members
            </button>
          </div>
          <MemberDetailPanel
            shgCode={selectedShg.shg_code || selectedShg.code}
            memberCode={selectedMember.member_code}
          />
        </>
      )}
    </>
  );
}

// -----------------------------------------------------------------
// Role-specific dashboards (BMMU/DMMU unchanged except plumbing)
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
              <span style={{ color: "#111827" }}>{blockName || blockId}</span>
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
    geo?.districts && Array.isArray(geo.districts) && geo.districts.length > 0
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
      const total = typeof payload.count === "number" ? payload.count : rows.length;

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
                  Blocks in District – <span className="badge">{districtName || districtId}</span>
                </h2>
                <p className="muted" style={{ margin: 0 }}>
                  Use the filter to see <strong>Aspirational Blocks in this District</strong>.
                </p>
              </div>
            </div>

            <div className="filters-row">
              <label className="small-muted" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input type="checkbox" checked={onlyAspirational} onChange={(e) => setOnlyAspirational(e.target.checked)} />
                Aspirational Blocks in this District
              </label>
            </div>

            {blocksError && <div className="alert alert-danger">{blocksError}</div>}

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
                        const isSelected = selectedBlock && selectedBlock.block_id === b.block_id;
                        return (
                          <tr key={b.block_id} className={isSelected ? "row-selected" : ""}>
                            <td>
                              {b.block_name_en}{" "}
                              {isAsp && (
                                <span className="badge" style={{ marginLeft: 6 }}>
                                  Aspirational
                                </span>
                              )}
                            </td>
                            <td>{b.block_id}</td>
                            <td>{isAsp ? "Yes" : "No"}</td>
                            <td>
                              <button className="btn-sm btn-outline" onClick={() => setSelectedBlock(b)}>
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
                    <button className="btn-sm btn-flat" disabled={blockMeta.page <= 1} onClick={() => loadBlocks(blockMeta.page - 1)}>
                      Prev
                    </button>
                    <span>
                      Page {blockMeta.page} of {totalPages}
                    </span>
                    <button className="btn-sm btn-flat" disabled={blockMeta.page >= totalPages} onClick={() => loadBlocks(blockMeta.page + 1)}>
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {selectedBlock && <BlockShgExplorer blockId={selectedBlock.block_id} blockName={selectedBlock.block_name_en} />}
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

// -----------------------------------------------------------------
// SMMU: Step-based flow (Districts -> Blocks -> SHGs -> SHG Detail -> Member Detail)
// -----------------------------------------------------------------

function StepIndicator({ currentStep, onJump }) {
  // steps: 1..5 labels
  const steps = [
    { n: 1, label: "Districts" },
    { n: 2, label: "Blocks" },
    { n: 3, label: "SHGs" },
    { n: 4, label: "SHG Details" },
    { n: 5, label: "Member Details" },
  ];

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
      {steps.map((s) => {
        const active = s.n === currentStep;
        const completed = s.n < currentStep;
        return (
          <div
            key={s.n}
            onClick={() => onJump && onJump(s.n)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              opacity: active ? 1 : completed ? 0.9 : 0.7,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: active ? "#111827" : completed ? "#10b981" : "#e5e7eb",
                color: active ? "#fff" : completed ? "#fff" : "#111827",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              {s.n}
            </div>
            <div style={{ fontSize: 12, textAlign: "center", width: 80 }}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function SmmuDashboard() {
  // Districts list
  const [districts, setDistricts] = useState([]);
  const [districtMeta, setDistrictMeta] = useState({ page: 1, page_size: 50, total: 0 });
  const [districtLoading, setDistrictLoading] = useState(false);
  const [districtError, setDistrictError] = useState("");

  // Selected district -> blocks
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [blockMeta, setBlockMeta] = useState({ page: 1, page_size: 50, total: 0 });
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState("");
  const [onlyAspirational, setOnlyAspirational] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState(null);

  // SHG & member selection (delegated to step states)
  // step: 1..5
  const [step, setStep] = useState(1);
  const [selectedShgForStep, setSelectedShgForStep] = useState(null);
  const [selectedMemberForStep, setSelectedMemberForStep] = useState(null);

  // NEW: show members under SHG detail (Step 4)
  const [membersVisible, setMembersVisible] = useState(false);

  // Districts
  async function loadDistricts(page = 1) {
    setDistrictLoading(true);
    setDistrictError("");
    try {
      const params = { page, page_size: districtMeta.page_size || 50 };
      const res = await api.get("/lookups/districts/", { params });
      const payload = res.data || {};
      const rows = payload.results || payload.data || [];
      const total = typeof payload.count === "number" ? payload.count : rows.length;

      setDistricts(rows);
      setDistrictMeta({ page, page_size: districtMeta.page_size || 50, total });
    } catch (e) {
      console.error("Failed to load districts", e);
      setDistrictError("Failed to load districts list.");
    } finally {
      setDistrictLoading(false);
    }
  }

  // Blocks for district
  async function loadBlocksForDistrict(districtId, page = 1, aspirational = false) {
    if (!districtId) return;
    setBlockLoading(true);
    setBlockError("");
    try {
      const params = {
        district_id: districtId,
        page,
        page_size: blockMeta.page_size || 50,
        is_aspirational: aspirational ? 1 : undefined,
      };
      const res = await api.get("/lookups/blocks/", { params });
      const payload = res.data || {};
      const rows = payload.results || payload.data || [];
      const total = typeof payload.count === "number" ? payload.count : rows.length;

      setBlocks(rows);
      setBlockMeta({ page, page_size: blockMeta.page_size || 50, total });
      setSelectedBlock(null);
    } catch (e) {
      console.error("Failed to load blocks for district", e);
      setBlockError("Failed to load blocks for selected district.");
    } finally {
      setBlockLoading(false);
    }
  }

  // Jump between steps from the indicator
  function jumpToStep(n) {
    if (n === 1) {
      setStep(1);
      setSelectedDistrict(null);
      setSelectedBlock(null);
      setSelectedShgForStep(null);
      setSelectedMemberForStep(null);
      setMembersVisible(false);
      return;
    }
    if (n === 2 && selectedDistrict) {
      setStep(2);
      return;
    }
    if (n === 3 && selectedBlock) {
      setStep(3);
      return;
    }
    if (n === 4 && selectedShgForStep) {
      setStep(4);
      return;
    }
    if (n === 5 && selectedMemberForStep) {
      setStep(5);
      return;
    }
    // ignore invalid jumps
  }

  // Selectors triggered by user flow
  function onSelectDistrict(d) {
    setSelectedDistrict(d);
    setSelectedBlock(null);
    setBlocks([]);
    setSelectedShgForStep(null);
    setSelectedMemberForStep(null);
    setMembersVisible(false);
    setStep(2); // move to blocks
    loadBlocksForDistrict(d.district_id, 1, false);
  }

  function onSelectBlock(b) {
    setSelectedBlock(b);
    setSelectedShgForStep(null);
    setSelectedMemberForStep(null);
    setMembersVisible(false);
    setStep(3); // move to SHG list
  }

  function onSelectShgStep(shg) {
    setSelectedShgForStep(shg);
    setSelectedMemberForStep(null);
    setMembersVisible(false);
    setStep(4); // show SHG detail first
  }

  function onFetchMembersForShg() {
    if (!selectedShgForStep) return;
    // Show members below SHG detail (blank-before-list behavior is kept because membersVisible starts false)
    setMembersVisible(true);
    // keep step on 4 (we're still on SHG Detail page; members will appear below)
    setStep(4);
  }

  function onSelectMemberStep(member) {
    setSelectedMemberForStep(member);
    // show member detail below members list
    setStep(5);
  }

  // initial load
  useEffect(() => {
    loadDistricts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // block reload on aspirational change for the selected district
  useEffect(() => {
    if (!selectedDistrict) return;
    loadBlocksForDistrict(selectedDistrict.district_id, 1, onlyAspirational);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyAspirational]);

  const districtTotalPages =
    districtMeta && districtMeta.page_size > 0 ? Math.max(1, Math.ceil((districtMeta.total || 0) / districtMeta.page_size)) : 1;
  const blockTotalPages =
    blockMeta && blockMeta.page_size > 0 ? Math.max(1, Math.ceil((blockMeta.total || 0) / blockMeta.page_size)) : 1;

  // Minimal blank screen helper for "blank before detail" behavior
  function BlankBefore({ children }) {
    return <div style={{ minHeight: 140 }}>{children}</div>;
  }

  return (
    <section>
      <div className="header-row">
        <div>
          <h1>SMMU – Beneficiary Management</h1>
          <p className="muted">Start from any district in the state, drill down to blocks, then SHGs and member detail.</p>
        </div>
        <div>
          <span className="badge">SMMU</span>
        </div>
      </div>

      <StepIndicator currentStep={step} onJump={jumpToStep} />

      {/* Step 1: Districts */}
      {step === 1 && (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card-header space-between">
            <div>
              <h2 style={{ marginBottom: 4 }}>Districts</h2>
              <p className="muted" style={{ margin: 0 }}>Select a district to see its blocks and SHGs.</p>
            </div>
          </div>

          {districtError && <div className="alert alert-danger">{districtError}</div>}

          {districtLoading ? (
            <div className="table-spinner"><span>Loading districts…</span></div>
          ) : districts.length === 0 ? (
            <p className="muted">No districts found.</p>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>District Name</th>
                      <th>District ID</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districts.map((d) => {
                      const isSelected = selectedDistrict && selectedDistrict.district_id === d.district_id;
                      return (
                        <tr key={d.district_id} className={isSelected ? "row-selected" : ""}>
                          <td>{d.district_name_en}</td>
                          <td>{d.district_id}</td>
                          <td>
                            <button
                              className="btn-sm btn-outline"
                              onClick={() => onSelectDistrict(d)}
                            >
                              View Blocks
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {districtMeta.total > districtMeta.page_size && (
                <div className="pagination">
                  <button className="btn-sm btn-flat" disabled={districtMeta.page <= 1} onClick={() => loadDistricts(districtMeta.page - 1)}>Prev</button>
                  <span>Page {districtMeta.page} of {districtTotalPages}</span>
                  <button className="btn-sm btn-flat" disabled={districtMeta.page >= districtTotalPages} onClick={() => loadDistricts(districtMeta.page + 1)}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 2: Blocks for selected district */}
      {step === 2 && selectedDistrict && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <button className="btn-sm btn-flat" onClick={() => { setSelectedDistrict(null); setStep(1); }} style={{ marginRight: 8 }}>
              ← Back to Districts
            </button>
          </div>

          <div className="card-header space-between">
            <div>
              <h2 style={{ marginBottom: 4 }}>Blocks in District – <span className="badge">{selectedDistrict.district_name_en}</span></h2>
              <p className="muted" style={{ margin: 0 }}>
                Use the filter to see <strong>Aspirational Blocks in this District</strong>.
              </p>
            </div>
          </div>

          <div className="filters-row">
            <label className="small-muted" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="checkbox" checked={onlyAspirational} onChange={(e) => setOnlyAspirational(e.target.checked)} />
              Aspirational Blocks in this District
            </label>
          </div>

          {blockError && <div className="alert alert-danger">{blockError}</div>}
          {blockLoading ? <div className="table-spinner"><span>Loading blocks…</span></div> : blocks.length === 0 ? <p className="muted">No blocks found for this district.</p> : (
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
                      const isSelected = selectedBlock && selectedBlock.block_id === b.block_id;
                      return (
                        <tr key={b.block_id} className={isSelected ? "row-selected" : ""}>
                          <td>{b.block_name_en} {isAsp && <span className="badge" style={{ marginLeft: 6 }}>Aspirational</span>}</td>
                          <td>{b.block_id}</td>
                          <td>{isAsp ? "Yes" : "No"}</td>
                          <td>
                            <button className="btn-sm btn-outline" onClick={() => onSelectBlock(b)}>View SHGs</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {blockMeta.total > blockMeta.page_size && (
                <div className="pagination">
                  <button className="btn-sm btn-flat" disabled={blockMeta.page <= 1} onClick={() => loadBlocksForDistrict(selectedDistrict.district_id, blockMeta.page - 1, onlyAspirational)}>Prev</button>
                  <span>Page {blockMeta.page} of {blockTotalPages}</span>
                  <button className="btn-sm btn-flat" disabled={blockMeta.page >= blockTotalPages} onClick={() => loadBlocksForDistrict(selectedDistrict.district_id, blockMeta.page + 1, onlyAspirational)}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 3: SHG list for selected block */}
      {step === 3 && selectedBlock && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <button className="btn-sm btn-flat" onClick={() => { setSelectedBlock(null); setStep(2); }} style={{ marginRight: 8 }}>
              ← Back to Blocks
            </button>
            <button className="btn-sm btn-flat" onClick={() => { setSelectedDistrict(null); setSelectedBlock(null); setStep(1); }} style={{ marginRight: 8 }}>
              ← Back to Districts
            </button>
          </div>

          <ShgListTable
            blockId={selectedBlock.block_id}
            onSelectShg={(shg) => onSelectShgStep(shg)}
            selectedShgCode={selectedShgForStep?.shg_code || selectedShgForStep?.code}
          />
        </div>
      )}

      {/* Step 4: SHG detail; can reveal members below when membersVisible is true */}
      {step === 4 && selectedShgForStep && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <button className="btn-sm btn-flat" onClick={() => { setStep(3); setSelectedShgForStep(null); }} style={{ marginRight: 8 }}>
              ← Back to SHG List
            </button>
            <button className="btn-sm btn-flat" onClick={() => { setStep(2); setSelectedBlock(null); }} style={{ marginRight: 8 }}>
              ← Back to Blocks
            </button>
          </div>

          {/* SHG detail always shown on step 4 */}
          <ShgDetailCard shg={selectedShgForStep} />

          {/* Fetch members button */}
          <div style={{ marginTop: 12 }}>
            <button
              className="btn"
              onClick={() => {
                onFetchMembersForShg(); // now sets membersVisible = true *without* navigating to step 3
              }}
            >
              Fetch Members
            </button>
          </div>

          {/* Blank-before-list: we keep a minimal gap; when membersVisible is true we render the member list below */}
          <div style={{ marginTop: 16 }}>
            {!membersVisible ? (
              <BlankBefore />
            ) : (
              <>
                <ShgMemberListTable
                  shg={selectedShgForStep}
                  onSelectMember={(m) => onSelectMemberStep(m)}
                  selectedMemberCode={selectedMemberForStep?.member_code}
                />

                {/* When a member is selected, show detail below the list */}
                {selectedMemberForStep && (
                  <div style={{ marginTop: 12 }}>
                    <MemberDetailPanel
                      shgCode={selectedShgForStep.shg_code || selectedShgForStep.code}
                      memberCode={selectedMemberForStep.member_code}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Member detail (this still allows direct jump to standalone member detail view if needed) */}
      {step === 5 && selectedShgForStep && selectedMemberForStep && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <button className="btn-sm btn-flat" onClick={() => { setStep(3); setSelectedMemberForStep(null); }} style={{ marginRight: 8 }}>
              ← Back to SHG List
            </button>
            <button className="btn-sm btn-flat" onClick={() => { setStep(4); setSelectedMemberForStep(null); }} style={{ marginRight: 8 }}>
              ← Back to SHG Detail
            </button>
          </div>

          <MemberDetailPanel
            shgCode={selectedShgForStep.shg_code || selectedShgForStep.code}
            memberCode={selectedMemberForStep.member_code}
          />
        </div>
      )}
    </section>
  );
}


// -----------------------------------------------------------------
// Base DashboardHome
// -----------------------------------------------------------------

export default function DashboardHome() {
  const { user, loading: authLoading, refreshAccess, logout } = useContext(AuthContext);
  const [geo, setGeo] = useState(null);
  const [roleNameNormalized, setRoleNameNormalized] = useState("");
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState("");
  const navigate = useNavigate();

  // for idle timeout / activity tracking
  const lastActivityRef = useRef(Date.now());

  // Track user activity (mousemove, keypress, click)
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
        if (logout) logout();
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
        if (logout) logout();
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
        console.error("Error loading user geoscope", err);
        if (!cancelled) {
          setGeoError("Could not resolve your geographical scope. Please contact administrator.");
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
            <button className="btn" style={{ marginTop: 8 }} onClick={() => navigate("/login")}>
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
    mainContent = <div className="alert alert-danger" style={{ marginTop: 16 }}>{geoError}</div>;
  } else if (isRegionRole && roleNameNormalized === "bmmu") {
    mainContent = <BmmuDashboard geo={geo} />;
  } else if (isRegionRole && roleNameNormalized === "dmmu") {
    mainContent = <DistrictBlocksDashboard geo={geo} roleLabel="DMMU" />;
  } else if (isRegionRole && roleNameNormalized === "dcnrlm") {
    mainContent = <DistrictBlocksDashboard geo={geo} roleLabel="DCNRLM" />;
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
    mainContent = <ModulePlaceholder title="Admin Dashboard" description="Admin overview dashboards will be configured here." />;
  } else {
    mainContent = <ModulePlaceholder title="Dashboard" description="Your role specific dashboard will appear here." />;
  }

  // For Training / MT / CRP roles → use TMS LeftNav by default
  const useTmsNavForUser = isPartnerRole;

  return (
    <div className="app-shell">
      {useTmsNavForUser ? <TmsLeftNav /> : <LeftNav />}
      <div className="main-area">
        <TopNav
          left={
            <div className="topnav-left">
              <div className="app-title">{useTmsNavForUser ? "Pragati Setu — TMS" : "Pragati Setu"}</div>
            </div>
          }
          // IMPORTANT: do NOT pass `right` so TopNav shows default user/logout controls
        />
        <main className="dashboard-main" style={{ padding: 18 }}>
          {mainContent}
        </main>
      </div>
    </div>
  );
}
