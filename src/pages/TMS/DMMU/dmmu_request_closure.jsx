// src/pages/TMS/DMMU/dmmu_request_closure.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api from "../../../api/axios";

/* ---------- small modal + helpers ---------- */

function Modal({ open, onClose, title, children, width = "min(1200px,96%)" }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(3px)",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxHeight: "92vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 10,
          padding: 18,
          boxShadow: "0 18px 45px rgba(15,23,42,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 12,
            gap: 8,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <div style={{ marginLeft: "auto" }}>
            <button className="btn btn-outline" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function fmtDateTime(iso) {
  try {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("en-IN");
  } catch {
    return iso || "-";
  }
}

function fmtDate(iso) {
  try {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN");
  } catch {
    return iso || "-";
  }
}

function normalizeMediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://66.116.207.88/")) {
    return url.replace("http://66.116.207.88/", "http://66.116.207.88:8088/");
  }
  return url;
}

/* ========================================================= */
/* ======================= MAIN PAGE ======================= */
/* ========================================================= */

export default function DmmuRequestClosure() {
  const { user } = useContext(AuthContext) || {};
  const { id: requestId } = useParams(); // training request id
  const navigate = useNavigate();

  const [trDetail, setTrDetail] = useState(null);
  const [loadingTrDetail, setLoadingTrDetail] = useState(false);

  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const [batchDetailModalOpen, setBatchDetailModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  const [batchCosts, setBatchCosts] = useState({}); // batchId -> /detail payload
  const [loadingBatchCosts, setLoadingBatchCosts] = useState({});

  const [hraFile, setHraFile] = useState(null);
  const [tadaFile, setTadaFile] = useState(null);
  const [savingClosureFiles, setSavingClosureFiles] = useState(false);

  const [trClosure, setTrClosure] = useState(null);
  const [loadingTrClosure, setLoadingTrClosure] = useState(false);
  const [updatingTrStatus, setUpdatingTrStatus] = useState(false);

  const [breakupModalOpen, setBreakupModalOpen] = useState(false);
  const [breakupBatchId, setBreakupBatchId] = useState(null);

  const refreshTokenRef = useRef(0);

  /* ---------- fetch TR detail ---------- */

  async function fetchTrainingRequest() {
    if (!requestId) return;
    setLoadingTrDetail(true);
    try {
      const resp = await api.get(`/tms/training-requests/${requestId}/detail/`);
      setTrDetail(resp?.data || null);
    } catch (e) {
      console.error("dmmu_request_closure: fetch TR detail failed", e);
      setTrDetail(null);
    } finally {
      setLoadingTrDetail(false);
    }
  }

  /* ---------- fetch batches ---------- */

  async function fetchBatches() {
    if (!requestId) return;
    setLoadingBatches(true);
    try {
      const resp = await api.get(
        `/tms/batches/?request=${requestId}&page_size=500`
      );
      const data = resp?.data ?? resp ?? {};
      const results = data.results || data || [];
      setBatches(results);
    } catch (e) {
      console.error("dmmu_request_closure: fetch batches failed", e);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }

  /* ---------- fetch TR closure row ---------- */

  async function fetchTrClosure() {
    if (!requestId) return;
    setLoadingTrClosure(true);
    try {
      const resp = await api.get(`/tms/tr-closures/?training=${requestId}`);
      const data = resp?.data ?? resp ?? {};
      const list = data.results || data || [];
      setTrClosure(list[0] || null);
    } catch (e) {
      console.error("dmmu_request_closure: fetch tr-closure failed", e);
      setTrClosure(null);
    } finally {
      setLoadingTrClosure(false);
    }
  }

  /* ---------- fetch batch-cost detail (id is batch-cost id in example) ---------- */

  async function fetchBatchCostDetail(batchId) {
    if (!batchId) return;
    setLoadingBatchCosts((m) => ({ ...m, [batchId]: true }));
    try {
      const resp = await api.get(`/tms/batch-costs/${batchId}/detail/`);
      const data = resp?.data || resp || null;
      setBatchCosts((m) => ({ ...m, [batchId]: data || null }));
    } catch (e) {
      console.error("dmmu_request_closure: fetch batch-cost detail failed", e);
      setBatchCosts((m) => ({ ...m, [batchId]: null }));
    } finally {
      setLoadingBatchCosts((m) => ({ ...m, [batchId]: false }));
    }
  }

  /* ---------- initial + refresh ---------- */

  useEffect(() => {
    if (!requestId) {
      navigate("/tms/training-requests");
      return;
    }
    fetchTrainingRequest();
    fetchBatches();
    fetchTrClosure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, refreshTokenRef.current]);

  function handleRefreshAll() {
    refreshTokenRef.current += 1;
    fetchTrainingRequest();
    fetchBatches();
    fetchTrClosure();
    setBatchCosts({});
  }

  /* ---------- batch modal ---------- */

  function openBatchDetail(batchId) {
    setSelectedBatchId(batchId);
    setBatchDetailModalOpen(true);
  }

  function closeBatchDetail() {
    setBatchDetailModalOpen(false);
    setSelectedBatchId(null);
  }

  /* ---------- breakup modal ---------- */

  function openBreakupModal(batchId) {
    setBreakupBatchId(batchId);
    setBreakupModalOpen(true);
  }

  function closeBreakupModal() {
    setBreakupModalOpen(false);
    setBreakupBatchId(null);
  }

  /* ---------- computed grand totals ---------- */

  const batchCostSummary = useMemo(() => {
    let totalAll = 0;
    const rows = (batches || []).map((b) => {
      const cost = batchCosts[b.id];
      if (!cost || !cost.batch_expenses) {
        return { batchId: b.id, total: 0 };
      }
      const be = cost.batch_expenses;
      const base = parseFloat(be.total_cost || "0") || 0;
      const trainer = parseFloat(cost.trainer_part_cost || "0") || 0;
      const tp = parseFloat(cost.tp_part_cost || "0") || 0;
      const total = base + trainer + tp;
      totalAll += total;
      return { batchId: b.id, total };
    });
    return { rows, totalAll };
  }, [batches, batchCosts]);

  const getGrandTotalForBatch = (batchId) => {
    const row = batchCostSummary.rows.find((r) => r.batchId === batchId);
    return row ? row.total : 0;
  };

  /* ---------- upload hra / ta-da and update TRClosure ---------- */

  async function handleSaveClosureDocs() {
    if (!requestId || !trClosure || !user?.id) {
      alert("TR closure row not found or user missing.");
      return;
    }
    if (!hraFile && !tadaFile) {
      alert("Please select at least one document (HRA or TA/DA) to upload.");
      return;
    }

    setSavingClosureFiles(true);
    try {
      const formData = new FormData();
      if (hraFile) {
        formData.append("hra", hraFile);
      }
      if (tadaFile) {
        formData.append("ta_da", tadaFile);
      }
      formData.append("updated_by", String(user.id));

      await api.patch(`/tms/tr-closures/${trClosure.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("HRA / TA-DA documents uploaded successfully.");
      setHraFile(null);
      setTadaFile(null);
      fetchTrClosure();
    } catch (e) {
      console.error("dmmu_request_closure: update TRClosure files failed", e);
      alert("Failed to upload documents. Please try again.");
    } finally {
      setSavingClosureFiles(false);
    }
  }

  /* ---------- mark training request completed ---------- */

  async function handleMarkTrainingCompleted() {
    if (!requestId || !user?.id) return;
    if (!window.confirm("Mark this training request as COMPLETED?")) return;

    setUpdatingTrStatus(true);
    try {
      const payload = {
        status: "COMPLETED",
        updated_by: user.id,
      };
      await api.patch(`/tms/training-requests/${requestId}/`, payload);
      alert("Training request marked as COMPLETED.");
      fetchTrainingRequest();
    } catch (e) {
      console.error("dmmu_request_closure: update TR status failed", e);
      alert("Failed to mark training as COMPLETED.");
    } finally {
      setUpdatingTrStatus(false);
    }
  }

  /* ========================================================= */
  /* =========================== UI ========================== */
  /* ========================================================= */

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">Pragati Setu — DMMU Request Closure</div>
          }
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "20px auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <h2 style={{ margin: 0 }}>
                DMMU — Training Request Closure #{requestId}
              </h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button className="btn" onClick={handleRefreshAll}>
                  Refresh
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate(-1)}
                >
                  Back
                </button>
              </div>
            </div>

            {/* Training request detail */}
            <section
              style={{
                background: "#fff",
                padding: 18,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 10,
                  gap: 8,
                }}
              >
                <h3 style={{ margin: 0 }}>Training Request Detail</h3>
                <button
                  className="btn-sm btn-flat"
                  style={{ marginLeft: "auto" }}
                  onClick={fetchTrainingRequest}
                >
                  {loadingTrDetail ? "Loading…" : "Refresh"}
                </button>
              </div>

              {loadingTrDetail ? (
                <div className="table-spinner">Loading training request…</div>
              ) : !trDetail ? (
                <div className="muted">
                  Training request details not available.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(230px, 1fr))",
                      gap: 10,
                      fontSize: 14,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <strong>Plan:</strong>{" "}
                      {trDetail.training_plan?.training_name || "-"}
                    </div>
                    <div>
                      <strong>Type:</strong> {trDetail.training_type || "-"}
                    </div>
                    <div>
                      <strong>Level:</strong> {trDetail.level || "-"}
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      <span style={{ fontWeight: 700 }}>
                        {trDetail.status || "-"}
                      </span>
                    </div>
                    <div>
                      <strong>District:</strong>{" "}
                      {trDetail.district?.district_name_en || "-"}
                    </div>
                    <div>
                      <strong>Block:</strong>{" "}
                      {trDetail.block?.block_name_en || "-"}
                    </div>
                    <div>
                      <strong>Partner:</strong> {trDetail.partner?.name || "-"}
                    </div>
                    <div>
                      <strong>Created On:</strong>{" "}
                      {fmtDateTime(trDetail.created_at)}
                    </div>
                    <div>
                      <strong>Updated On:</strong>{" "}
                      {fmtDateTime(trDetail.updated_at)}
                    </div>
                    <div>
                      <strong>Created By:</strong>{" "}
                      {trDetail.created_by?.username || trDetail.created_by?.id}
                    </div>
                    <div>
                      <strong>Updated By:</strong>{" "}
                      {trDetail.updated_by?.username || trDetail.updated_by?.id}
                    </div>
                  </div>

                  {/* Beneficiary registrations table */}
                  <div style={{ marginTop: 10 }}>
                    <h4
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: 15,
                      }}
                    >
                      Beneficiary Registrations (
                      {trDetail.beneficiary_registrations?.length || 0})
                    </h4>
                    <div style={{ maxHeight: 260, overflow: "auto" }}>
                      <table className="table table-compact">
                        <thead>
                          <tr>
                            <th>S.No.</th>
                            <th>Name</th>
                            <th>Gender</th>
                            <th>Age</th>
                            <th>Mobile</th>
                            <th>PLD</th>
                            <th>Social Category</th>
                            <th>Religion</th>
                            <th>Education</th>
                            <th>Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trDetail.beneficiary_registrations?.length ? (
                            trDetail.beneficiary_registrations.map((m, idx) => (
                              <tr key={m.id}>
                                <td>{idx + 1}</td>
                                <td>{m.member_name}</td>
                                <td>{m.gender}</td>
                                <td>{m.age}</td>
                                <td>{m.mobile || "-"}</td>
                                <td>{m.pld_status}</td>
                                <td>{m.social_category}</td>
                                <td>{m.religion}</td>
                                <td>{m.education}</td>
                                <td
                                  style={{
                                    maxWidth: 200,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {m.address}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={10}>
                                No beneficiary registrations.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Batches list with modal view */}
            <section
              style={{
                background: "#fff",
                padding: 18,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <h3 style={{ margin: 0 }}>Batches under this Training</h3>
                <button
                  className="btn-sm btn-flat"
                  style={{ marginLeft: "auto" }}
                  onClick={fetchBatches}
                >
                  {loadingBatches ? "Loading…" : "Refresh"}
                </button>
              </div>

              <div style={{ maxHeight: 260, overflow: "auto" }}>
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>S.No.</th>
                      <th>Batch Code</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingBatches ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center" }}>
                          Loading batches…
                        </td>
                      </tr>
                    ) : batches.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          No batches found for this training request.
                        </td>
                      </tr>
                    ) : (
                      batches.map((b, idx) => (
                        <tr key={b.id}>
                          <td>{idx + 1}</td>
                          <td>{b.code}</td>
                          <td>{b.batch_type}</td>
                          <td>{b.status}</td>
                          <td>{fmtDate(b.start_date)}</td>
                          <td>{fmtDate(b.end_date)}</td>
                          <td>
                            <button
                              className="btn-sm btn-primary"
                              onClick={() => openBatchDetail(b.id)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Batch costing summary */}
            <section
              style={{
                background: "#fff",
                padding: 18,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <h3 style={{ margin: 0 }}>Batch-wise Costing</h3>
              </div>

              <div style={{ maxHeight: 260, overflow: "auto" }}>
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>S.No.</th>
                      <th>Batch Code</th>
                      <th>Base Total</th>
                      <th>Trainer Part Cost</th>
                      <th>TP Part Cost</th>
                      <th>Grand Total (Batch)</th>
                      <th>Load</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={7}>No batches found.</td>
                      </tr>
                    ) : (
                      batches.map((b, idx) => {
                        const cost = batchCosts[b.id];
                        const loadingCost = loadingBatchCosts[b.id];
                        const base =
                          parseFloat(cost?.batch_expenses?.total_cost || "0") ||
                          0;
                        const trainer =
                          parseFloat(cost?.trainer_part_cost || "0") || 0;
                        const tp = parseFloat(cost?.tp_part_cost || "0") || 0;
                        const total = base + trainer + tp;

                        return (
                          <tr key={b.id}>
                            <td>{idx + 1}</td>
                            <td>{b.code}</td>
                            <td>
                              {cost ? (
                                <button
                                  type="button"
                                  className="btn-sm btn-flat"
                                  onClick={() => openBreakupModal(b.id)}
                                  title="View breakups"
                                >
                                  ₹ {cost.batch_expenses?.total_cost || "0.00"}
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>
                              {cost ? `₹ ${cost.trainer_part_cost}` : "-"}
                            </td>
                            <td>{cost ? `₹ ${cost.tp_part_cost}` : "-"}</td>
                            <td>{cost ? `₹ ${total.toFixed(2)}` : "-"}</td>
                            <td>
                              <button
                                className="btn-sm btn-flat"
                                onClick={() => fetchBatchCostDetail(b.id)}
                                disabled={loadingCost}
                              >
                                {loadingCost ? "…" : "Load"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {batches.length > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={5} style={{ textAlign: "right" }}>
                          <strong>Total Training Cost:</strong>
                        </td>
                        <td colSpan={2}>
                          <strong>
                            ₹ {batchCostSummary.totalAll.toFixed(2)}
                          </strong>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>

            {/* HRA / TA-DA upload and mark completed */}
            <section
              style={{
                background: "#fff",
                padding: 18,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <h3 style={{ margin: 0 }}>Closure Documents & Status</h3>
                <button
                  className="btn-sm btn-flat"
                  style={{ marginLeft: "auto" }}
                  onClick={fetchTrClosure}
                >
                  {loadingTrClosure ? "Loading…" : "Refresh TR-Closure"}
                </button>
              </div>

              {trClosure ? (
                <div
                  style={{
                    marginBottom: 10,
                    padding: 10,
                    borderRadius: 6,
                    background: "#ecfdf5",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                    fontSize: 13,
                  }}
                >
                  <div>
                    TR-Closure row exists for this training (ID: {trClosure.id}
                    ). Attach HRA and TA/DA documents and then mark training as
                    completed.
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12 }}>
                    Existing HRA:{" "}
                    {trClosure.hra ? (
                      <a
                        href={normalizeMediaUrl(trClosure.hra)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      "Not uploaded"
                    )}
                    {" | "}
                    Existing TA/DA:{" "}
                    {trClosure.ta_da ? (
                      <a
                        href={normalizeMediaUrl(trClosure.ta_da)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      "Not uploaded"
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginBottom: 10,
                    padding: 10,
                    borderRadius: 6,
                    background: "#fffbeb",
                    border: "1px solid #facc15",
                    color: "#854d0e",
                    fontSize: 13,
                  }}
                >
                  TR-Closure row not found for this training. DMMU can only
                  upload HRA / TA-DA once TP has created TR-closure from their
                  panel.
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 16,
                  marginTop: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontWeight: 600,
                    }}
                  >
                    HRA Document (PDF / JPG / DOC)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setHraFile(e.target.files[0] || null)}
                  />
                  {hraFile && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Selected: {hraFile.name}
                    </div>
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 4,
                      fontWeight: 600,
                    }}
                  >
                    TA/DA Document (PDF / JPG / DOC)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setTadaFile(e.target.files[0] || null)}
                  />
                  {tadaFile && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Selected: {tadaFile.name}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 16,
                  alignItems: "center",
                }}
              >
                <button
                  className="btn btn-primary"
                  disabled={savingClosureFiles || !trClosure}
                  onClick={handleSaveClosureDocs}
                >
                  {savingClosureFiles
                    ? "Uploading Documents…"
                    : "Upload / Update HRA & TA/DA"}
                </button>

                <button
                  className="btn btn-success"
                  disabled={updatingTrStatus}
                  onClick={handleMarkTrainingCompleted}
                >
                  {updatingTrStatus
                    ? "Marking COMPLETED…"
                    : "Mark Training as COMPLETED"}
                </button>

                {trDetail?.status === "COMPLETED" && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 13,
                      color: "#16a34a",
                      fontWeight: 600,
                    }}
                  >
                    Current Status: COMPLETED
                  </span>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Batch detail modal using rich detail component */}
      <Modal
        open={batchDetailModalOpen && !!selectedBatchId}
        onClose={closeBatchDetail}
        title={
          selectedBatchId
            ? `Batch Detail — Batch #${selectedBatchId}`
            : "Batch Detail"
        }
      >
        {selectedBatchId && <BatchDetailForDmmu batchId={selectedBatchId} />}
      </Modal>

      {/* Breakup modal for base total */}
      <Modal
        open={breakupModalOpen && !!breakupBatchId}
        onClose={closeBreakupModal}
        title={
          breakupBatchId
            ? `Cost Breakup — Batch #${breakupBatchId}`
            : "Cost Breakup"
        }
        width="min(700px,96%)"
      >
        {breakupBatchId && (
          <BreakupDetailForDmmu
            batchId={breakupBatchId}
            cost={batchCosts[breakupBatchId]}
            grandTotal={getGrandTotalForBatch(breakupBatchId)}
          />
        )}
      </Modal>
    </div>
  );
}

/* ========================================================= */
/* ============ DMMU Batch Detail (modal content) ========== */
/* ====== Inspired by src/pages/TMS/TRs/training_batch_detail.jsx ===== */
/* ========================================================= */

const DETAIL_CACHE_PREFIX = "tms_batch_detail_cache_v1::";

function loadCache(id) {
  try {
    const raw = localStorage.getItem(DETAIL_CACHE_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(id, payload) {
  try {
    localStorage.setItem(
      DETAIL_CACHE_PREFIX + id,
      JSON.stringify({ ts: Date.now(), payload })
    );
  } catch {}
}

function BatchDetailForDmmu({ batchId }) {
  const [loadingAll, setLoadingAll] = useState(false);
  const [batchData, setBatchData] = useState(null);
  const [trainingRequestDetail, setTrainingRequestDetail] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [masterTrainers, setMasterTrainers] = useState([]);
  const [centreDetail, setCentreDetail] = useState(null);

  const [attendanceList, setAttendanceList] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(null);
  const [selectedAttendanceRecords, setSelectedAttendanceRecords] = useState(
    []
  );
  const [loadingSelectedAttendance, setLoadingSelectedAttendance] =
    useState(false);

  const [closureRequest, setClosureRequest] = useState(null);
  const [batchMedia, setBatchMedia] = useState([]);
  const [loadingClosureInfo, setLoadingClosureInfo] = useState(false);
  const [selectedMediaDate, setSelectedMediaDate] = useState(null);
  const [mediaPreviewSrc, setMediaPreviewSrc] = useState(null);

  const [refreshToken, setRefreshToken] = useState(0);
  const inFlightRef = useRef(false);

  const mediaByDate = useMemo(() => {
    const grouped = {};
    (batchMedia || []).forEach((m) => {
      const dt = m.date || "";
      if (!grouped[dt]) grouped[dt] = [];
      grouped[dt].push(m);
    });
    return grouped;
  }, [batchMedia]);

  async function fetchAll(force = false) {
    if (!batchId) return;
    if (inFlightRef.current && !force) return;

    inFlightRef.current = true;
    setLoadingAll(true);

    let trDetail = null;
    let fullCentreData = null;
    let attendances = [];

    try {
      if (!force) {
        const cached = loadCache(batchId);
        if (cached?.payload?.batchData) {
          setBatchData(cached.payload.batchData);
          setTrainingRequestDetail(
            cached.payload.trainingRequestDetail || null
          );
          setParticipants(cached.payload.participants || []);
          setMasterTrainers(cached.payload.masterTrainers || []);
          setCentreDetail(cached.payload.centreDetail || null);
          setAttendanceList(cached.payload.attendanceList || []);
          setLoadingAll(false);
          inFlightRef.current = false;
          return;
        }
      }

      const batchResp = await api.get(`/tms/batches/${batchId}/detail/`);
      const batchResponse = batchResp?.data || null;
      setBatchData(batchResponse);

      const requestId = batchResponse?.request?.id;
      setParticipants(batchResponse?.beneficiary || []);
      setMasterTrainers(batchResponse?.master_trainers || []);

      if (requestId) {
        const trResp = await api.get(
          `/tms/training-requests/${requestId}/detail/`
        );
        trDetail = trResp?.data || null;
        setTrainingRequestDetail(trDetail);
      }

      if (batchResponse?.centre?.id) {
        const centreId = batchResponse.centre.id;
        const centreResp = await api.get(
          `/tms/training-partner-centres/${centreId}/detail/`
        );
        fullCentreData = centreResp?.data || batchResponse.centre;
        setCentreDetail(fullCentreData);
      }

      try {
        setLoadingAttendance(true);
        const attResp = await api.get(
          `/tms/batch-attendance/?batch=${batchId}`
        );
        const attData = attResp?.data ?? attResp ?? {};
        attendances = attData.results || attData || [];
        attendances.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        setAttendanceList(attendances);
      } catch (e) {
        console.error("dmmu_request_closure: attendance list failed", e);
        setAttendanceList([]);
      } finally {
        setLoadingAttendance(false);
      }

      saveCache(batchId, {
        batchData: batchResponse,
        trainingRequestDetail: trDetail,
        participants: batchResponse?.beneficiary || [],
        masterTrainers: batchResponse?.master_trainers || [],
        centreDetail: fullCentreData,
        attendanceList: attendances,
      });
    } catch (e) {
      console.error("dmmu_request_closure: fetchAll batch detail failed", e);
    } finally {
      setLoadingAll(false);
      inFlightRef.current = false;
    }
  }

  async function fetchClosureInfo() {
    if (!batchId) return;
    try {
      setLoadingClosureInfo(true);
      const crResp = await api.get(
        `/tms/batch-closure-requests/?batch=${batchId}`
      );
      const crData = crResp?.data ?? crResp ?? {};
      const crList = crData.results || crData || [];
      setClosureRequest(crList[0] || null);

      const mediaResp = await api.get(
        `/tms/batch-media/?batch=${batchId}&page_size=500`
      );
      const mData = mediaResp?.data ?? mediaResp ?? {};
      const mList = mData.results || mData || [];
      setBatchMedia(mList);
    } catch (e) {
      console.error("dmmu_request_closure: fetchClosureInfo failed", e);
      setClosureRequest(null);
      setBatchMedia([]);
    } finally {
      setLoadingClosureInfo(false);
    }
  }

  useEffect(() => {
    fetchAll(refreshToken > 0);
    fetchClosureInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, refreshToken]);

  function handleRefresh() {
    try {
      localStorage.removeItem(DETAIL_CACHE_PREFIX + batchId);
    } catch {}
    setSelectedAttendanceDate(null);
    setSelectedAttendanceRecords([]);
    setSelectedMediaDate(null);
    setMediaPreviewSrc(null);
    setRefreshToken((t) => t + 1);
  }

  const hasMasterTrainers = masterTrainers && masterTrainers.length > 0;
  const firstMasterTrainer = hasMasterTrainers ? masterTrainers[0] : null;

  async function fetchAttendanceParticipantsForDate(dateStr) {
    if (!batchId || !dateStr) return;
    setLoadingSelectedAttendance(true);
    setSelectedAttendanceDate(dateStr);
    setSelectedAttendanceRecords([]);
    setSelectedMediaDate(dateStr);

    try {
      const attResp = await api.get(
        `/tms/batch-attendance/?batch=${batchId}&date=${dateStr}`
      );
      const attData = attResp?.data ?? attResp ?? {};
      const attendance = (attData.results || attData || [])[0];
      if (!attendance?.id) {
        setSelectedAttendanceRecords([]);
        return;
      }

      const recResp = await api.get(
        `/tms/participant-attendance/?attendance=${attendance.id}`
      );
      const recData = recResp?.data ?? recResp ?? {};
      const recs = recData.results || recData || [];
      setSelectedAttendanceRecords(recs);
    } catch (e) {
      console.error(
        "dmmu_request_closure: fetchAttendanceParticipantsForDate failed",
        e
      );
      setSelectedAttendanceRecords([]);
    } finally {
      setLoadingSelectedAttendance(false);
    }
  }

  if (loadingAll && !batchData) {
    return <div className="table-spinner">Loading batch details…</div>;
  }

  return (
    <div style={{ fontSize: 14 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>
          Batch #{batchId} {batchData?.code ? `(${batchData.code})` : ""}
        </h3>
        <button
          className="btn btn-sm"
          style={{ marginLeft: "auto" }}
          onClick={handleRefresh}
        >
          Refresh
        </button>
      </div>

      {loadingClosureInfo ? (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 6,
            background: "#f9fafb",
            border: "1px dashed #e5e7eb",
            fontSize: 13,
          }}
        >
          Checking batch closure status…
        </div>
      ) : closureRequest ? (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 8,
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            color: "#166534",
            fontSize: 14,
          }}
        >
          <strong>This batch is now closed.</strong> A closure request has been
          submitted for this batch and is under review / processing.
        </div>
      ) : null}

      <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
        {!batchData ? (
          <div className="muted">
            Batch not found.{" "}
            <button className="btn-sm" onClick={handleRefresh}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Training details */}
            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  margin: "0 0 12px 0",
                  color: "#1a1a1a",
                }}
              >
                📋 Training Details
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                <div>
                  <strong>Type:</strong>{" "}
                  {trainingRequestDetail?.training_type ||
                    batchData?.request?.training_type ||
                    "-"}
                </div>
                <div>
                  <strong>Level:</strong>{" "}
                  {trainingRequestDetail?.level ||
                    batchData?.request?.level ||
                    "-"}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#0b5cff",
                    }}
                  >
                    {trainingRequestDetail?.status ||
                      batchData?.request?.status ||
                      "-"}
                  </span>
                </div>
                <div>
                  <strong>Training Name:</strong>{" "}
                  {trainingRequestDetail?.training_plan?.training_name || "-"}
                </div>
                <div>
                  <strong>Type of Training:</strong>{" "}
                  {trainingRequestDetail?.training_plan?.type_of_training ||
                    "-"}
                </div>
                <div>
                  <strong>Level of Training:</strong>{" "}
                  {trainingRequestDetail?.training_plan?.level_of_training ||
                    "-"}
                </div>
                <div>
                  <strong>No. of Days:</strong>{" "}
                  {trainingRequestDetail?.training_plan?.no_of_days || "-"}
                </div>
                <div>
                  <strong>District:</strong>{" "}
                  {trainingRequestDetail?.district?.district_name_en || "-"}
                </div>
                <div>
                  <strong>Block:</strong>{" "}
                  {trainingRequestDetail?.block?.block_name_en || "-"}
                </div>
              </div>
            </div>

            {/* Batch details */}
            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  margin: "0 0 12px 0",
                  color: "#1a1a1a",
                }}
              >
                🎯 Batch Details
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                <div>
                  <strong>Batch Code:</strong>{" "}
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#1976d2",
                    }}
                  >
                    {batchData.code || "-"}
                  </span>
                </div>
                <div>
                  <strong>Batch Type:</strong> {batchData.batch_type || "-"}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#0b5cff",
                    }}
                  >
                    {batchData.status || "-"}
                  </span>
                </div>
                <div>
                  <strong>Start Date:</strong> {fmtDate(batchData.start_date)}
                </div>
                <div>
                  <strong>End Date:</strong> {fmtDate(batchData.end_date)}
                </div>
                <div>
                  <strong>Time:</strong> {batchData.time_of_training || "-"}
                </div>
              </div>
            </div>

            {/* Attendance + media */}
            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  margin: "0 0 12px 0",
                  color: "#1a1a1a",
                }}
              >
                📅 Attendance (All Dates)
              </h4>
              {loadingAttendance ? (
                <div className="table-spinner">Loading attendance…</div>
              ) : attendanceList.length === 0 ? (
                <div className="muted">
                  No attendance records found for this batch.
                </div>
              ) : (
                <>
                  <div style={{ maxHeight: 220, overflow: "auto" }}>
                    <table className="table table-compact">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Created At</th>
                          <th>CSV Uploaded</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceList.map((att) => (
                          <tr key={att.id}>
                            <td>
                              <button
                                type="button"
                                className={
                                  selectedAttendanceDate === att.date
                                    ? "btn-sm btn-flat active"
                                    : "btn-sm btn-flat"
                                }
                                onClick={() =>
                                  fetchAttendanceParticipantsForDate(att.date)
                                }
                              >
                                {fmtDate(att.date)}
                              </button>
                            </td>
                            <td>{fmtDate(att.created_at)}</td>
                            <td>
                              {att.csv_upload ? (
                                <span
                                  style={{
                                    fontSize: 12,
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    background: "#e0f2fe",
                                    color: "#0369a1",
                                  }}
                                >
                                  Yes
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 12,
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    background: "#f3f4f6",
                                    color: "#4b5563",
                                  }}
                                >
                                  No
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {selectedAttendanceDate && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: "1px solid #e5e7eb",
                      }}
                    >
                      <h5>Attendance on {fmtDate(selectedAttendanceDate)}</h5>
                      {loadingSelectedAttendance ? (
                        <div className="table-spinner">
                          Loading participant records…
                        </div>
                      ) : selectedAttendanceRecords.length === 0 ? (
                        <div className="muted">
                          No participant attendance records for this date.
                        </div>
                      ) : (
                        <div
                          style={{
                            maxHeight: 260,
                            overflow: "auto",
                            marginTop: 6,
                          }}
                        >
                          <table className="table table-compact">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedAttendanceRecords.map((r) => (
                                <tr key={r.id}>
                                  <td>{r.participant_name}</td>
                                  <td>
                                    {r.participant_role === "trainer"
                                      ? "Trainer"
                                      : "Trainee"}
                                  </td>
                                  <td>
                                    <span
                                      style={{
                                        fontSize: 12,
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        background: r.present
                                          ? "#dcfce7"
                                          : "#fee2e2",
                                        color: r.present
                                          ? "#166534"
                                          : "#b91c1c",
                                      }}
                                    >
                                      {r.present ? "Present" : "Absent"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {selectedMediaDate &&
                        mediaByDate[selectedMediaDate] &&
                        mediaByDate[selectedMediaDate].length > 0 && (
                          <div
                            style={{
                              marginTop: 16,
                              paddingTop: 8,
                              borderTop: "1px dashed #e5e7eb",
                            }}
                          >
                            <h5>Media on {fmtDate(selectedMediaDate)}</h5>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 12,
                              }}
                            >
                              {mediaByDate[selectedMediaDate].map((m) => {
                                const src = normalizeMediaUrl(m.file);
                                const isImage =
                                  src && !src.toLowerCase().endsWith(".pdf");
                                return (
                                  <div
                                    key={m.id}
                                    style={{
                                      width: 150,
                                      borderRadius: 6,
                                      border: "1px solid #e5e7eb",
                                      padding: 8,
                                      background: "#fff",
                                      fontSize: 12,
                                    }}
                                  >
                                    {isImage ? (
                                      <img
                                        src={src}
                                        alt={m.category}
                                        style={{
                                          width: "100%",
                                          height: 90,
                                          objectFit: "cover",
                                          borderRadius: 4,
                                          cursor: "pointer",
                                        }}
                                        onClick={() => setMediaPreviewSrc(src)}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          height: 90,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          background: "#f9fafb",
                                          borderRadius: 4,
                                          cursor: "pointer",
                                        }}
                                        onClick={() =>
                                          window.open(src, "_blank")
                                        }
                                      >
                                        View PDF
                                      </div>
                                    )}
                                    <div
                                      style={{
                                        marginTop: 4,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {m.category}
                                    </div>
                                    {m.notes && (
                                      <div
                                        style={{
                                          marginTop: 2,
                                          color: "#4b5563",
                                        }}
                                      >
                                        {m.notes}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Centre details */}
            {centreDetail && (
              <div style={{ marginBottom: 20 }}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    color: "#1a1a1a",
                  }}
                >
                  🏢 Centre Details
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 8,
                        fontSize: 18,
                      }}
                    >
                      {centreDetail.venue_name}
                    </div>
                    <div style={{ color: "#666", marginBottom: 12 }}>
                      {centreDetail.venue_address}
                    </div>
                    <div>
                      <strong>Serial:</strong>{" "}
                      {centreDetail.serial_number || "-"}
                    </div>
                    <div>
                      <strong>Type:</strong> {centreDetail.centre_type || "-"}
                    </div>
                    <div>
                      <strong>Halls:</strong>{" "}
                      {centreDetail.training_hall_count || 0} (Capacity:{" "}
                      {centreDetail.training_hall_capacity || 0})
                    </div>

                    {centreDetail.rooms && centreDetail.rooms.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <h5
                          style={{
                            margin: "8px 0",
                            fontSize: 14,
                          }}
                        >
                          Training Halls
                        </h5>
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                          }}
                        >
                          <thead>
                            <tr style={{ background: "#f5f5f5" }}>
                              <th
                                style={{
                                  padding: "8px",
                                  border: "1px solid #ddd",
                                  textAlign: "left",
                                }}
                              >
                                Name
                              </th>
                              <th
                                style={{
                                  padding: "8px",
                                  border: "1px solid #ddd",
                                  textAlign: "left",
                                }}
                              >
                                Capacity
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {centreDetail.rooms.map((room) => (
                              <tr key={room.id}>
                                <td
                                  style={{
                                    padding: "8px",
                                    border: "1px solid #ddd",
                                  }}
                                >
                                  {room.room_name}
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    border: "1px solid #ddd",
                                  }}
                                >
                                  {room.room_capacity}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div>
                    <div>
                      <strong>Security:</strong>{" "}
                      {centreDetail.security_arrangements || "-"}
                    </div>
                    <div>
                      <strong>Toilets:</strong>{" "}
                      {centreDetail.toilets_bathrooms || "-"}
                    </div>
                    <div>
                      <strong>Power/Water:</strong>{" "}
                      {centreDetail.power_water_facility || "-"}
                    </div>
                    <div>
                      <strong>Medical Kit:</strong>{" "}
                      {centreDetail.medical_kit ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Open Space:</strong>{" "}
                      {centreDetail.open_space ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Field Visit:</strong>{" "}
                      {centreDetail.field_visit_facility ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Transport:</strong>{" "}
                      {centreDetail.transport_facility ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Dining:</strong>{" "}
                      {centreDetail.dining_facility ? "Yes" : "No"}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <strong>Other:</strong>{" "}
                      {centreDetail.other_details || "-"}
                    </div>

                    {centreDetail.submissions &&
                      centreDetail.submissions.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <h5
                            style={{
                              margin: "8px 0",
                              fontSize: 14,
                            }}
                          >
                            Centre Media
                          </h5>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 12,
                            }}
                          >
                            {centreDetail.submissions.map((submission) => {
                              const src = normalizeMediaUrl(submission.file);
                              return (
                                <div
                                  key={submission.id}
                                  style={{
                                    textAlign: "center",
                                    border: "1px solid #eee",
                                    padding: 8,
                                    borderRadius: 4,
                                  }}
                                >
                                  <img
                                    src={src}
                                    alt={submission.category}
                                    style={{
                                      height: 80,
                                      width: 80,
                                      objectFit: "cover",
                                      borderRadius: 4,
                                      cursor: "pointer",
                                    }}
                                    onClick={() => window.open(src, "_blank")}
                                  />
                                  <div
                                    style={{
                                      fontSize: 12,
                                      marginTop: 4,
                                    }}
                                  >
                                    {submission.category}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Participants */}
            <div>
              <h4
                style={{
                  margin: "0 0 12px 0",
                  color: "#1a1a1a",
                }}
              >
                👥 Participants ({participants.length})
              </h4>

              {hasMasterTrainers && firstMasterTrainer && (
                <div
                  style={{
                    background: "#e3f2fd",
                    border: "2px solid #2196f3",
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      marginBottom: 8,
                      color: "#1976d2",
                    }}
                  >
                    Master Trainer
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div>
                      <strong>Name:</strong>{" "}
                      {firstMasterTrainer.full_name ||
                        firstMasterTrainer.name ||
                        "-"}
                    </div>
                    <div>
                      <strong>Mobile:</strong>{" "}
                      {firstMasterTrainer.mobile_no ||
                        firstMasterTrainer.mobile ||
                        "-"}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ maxHeight: 300, overflow: "auto" }}>
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>S.No.</th>
                      <th>Member Name</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>PLD Status</th>
                      <th>Social Category</th>
                      <th>Religion</th>
                      <th>Mobile</th>
                      <th>Education</th>
                      <th>Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          style={{
                            textAlign: "center",
                            padding: 20,
                          }}
                        >
                          No participants assigned.
                        </td>
                      </tr>
                    ) : (
                      participants.map((p, idx) => (
                        <tr key={p.id || `p-${idx}`}>
                          <td>{idx + 1}</td>
                          <td style={{ fontWeight: 500 }}>
                            {p.member_name || "-"}
                          </td>
                          <td>{p.age || "-"}</td>
                          <td>{p.gender || "-"}</td>
                          <td>{p.pld_status || "-"}</td>
                          <td>{p.social_category || "-"}</td>
                          <td>{p.religion || "-"}</td>
                          <td>{p.mobile || "-"}</td>
                          <td>{p.education || "-"}</td>
                          <td
                            style={{
                              maxWidth: 200,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {p.address || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {mediaPreviewSrc && (
        <div
          onClick={() => setMediaPreviewSrc(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4000,
            cursor: "zoom-out",
          }}
        >
          <img
            src={mediaPreviewSrc}
            alt="Preview"
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: 6,
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ========================================================= */
/* ============ Breakup detail (base total click) ========== */
/* ========================================================= */

function BreakupDetailForDmmu({ batchId, cost, grandTotal }) {
  if (!cost || !cost.batch_expenses) {
    return <div className="muted">Cost breakup not loaded for this batch.</div>;
  }
  const be = cost.batch_expenses;

  return (
    <div style={{ fontSize: 14 }}>
      <div style={{ marginBottom: 10 }}>
        <strong>Batch ID:</strong> {batchId}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        <div>
          <strong>Centre Cost:</strong> ₹ {be.centre_cost}
        </div>
        <div>
          <strong>Hostel Cost:</strong> ₹ {be.hostel_cost}
        </div>
        <div>
          <strong>Fooding Cost:</strong> ₹ {be.fooding_cost}
        </div>
        <div>
          <strong>Dresses Cost:</strong> ₹ {be.dresses_cost}
        </div>
        <div>
          <strong>Study Material Cost:</strong> ₹ {be.study_material_cost}
        </div>
        <div>
          <strong>Base Total:</strong> ₹ {be.total_cost}
        </div>
        <div>
          <strong>Trainer Part Cost:</strong> ₹ {cost.trainer_part_cost}
        </div>
        <div>
          <strong>TP Part Cost:</strong> ₹ {cost.tp_part_cost}
        </div>
        <div
          style={{
            gridColumn: "1 / -1",
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <strong>Grand Total for this Batch:</strong> ₹ {grandTotal.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
