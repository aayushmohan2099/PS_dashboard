// src/pages/TMS/TP/tp_tr_closure.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API } from "../../../api/axios";
import api from "../../../api/axios";
import { getCanonicalRole } from "../../../utils/roleUtils";

/* ---------- small modal wrapper (background blur) ---------- */

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

/* ---------- simple formatters ---------- */

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

export default function TpTrainingRequestClosure() {
  const { user } = useContext(AuthContext) || {};
  const { id: requestId } = useParams(); // opened training request id
  const navigate = useNavigate();
  const role = getCanonicalRole(user || {});
  const isTP = role === "training_partner" || role === "4";

  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [refreshToken, setRefreshToken] = useState(0);

  const [costingByBatch, setCostingByBatch] = useState({});
  const [loadingCosting, setLoadingCosting] = useState({});
  const [scheduleByBatch, setScheduleByBatch] = useState({});
  const [loadingSchedules, setLoadingSchedules] = useState({});

  const [trainerFee, setTrainerFee] = useState({});
  const [tpFee, setTpFee] = useState({});
  const [savingCost, setSavingCost] = useState({});
  const [savedBatchCosts, setSavedBatchCosts] = useState({});

  const [creatingClosure, setCreatingClosure] = useState(false);

  // TR-closure (for this training)
  const [trClosure, setTrClosure] = useState(null);
  const [loadingTrClosure, setLoadingTrClosure] = useState(false);

  // modal: show batch detail (reusing logic from training_batch_detail)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailBatchId, setDetailBatchId] = useState(null);

  // lightbox for media (inside modal detail)
  const [mediaPreviewSrc, setMediaPreviewSrc] = useState(null);

  const inFlightRef = useRef(false);

  // training request level info (minimal)
  const [trInfo, setTrInfo] = useState(null);
  const [loadingTrInfo, setLoadingTrInfo] = useState(false);

  /* ---------------- fetch training request minimal detail ---------------- */
  useEffect(() => {
    async function fetchTr() {
      if (!requestId) return;
      setLoadingTrInfo(true);
      try {
        const resp = await api.get(
          `/tms/training-requests/${requestId}/detail/`
        );
        setTrInfo(resp?.data || null);
      } catch (e) {
        console.error("tp_tr_closure: fetch training request failed", e);
        setTrInfo(null);
      } finally {
        setLoadingTrInfo(false);
      }
    }
    fetchTr();
  }, [requestId]);

  /* ---------------- check if TR closure already exists ---------------- */
  useEffect(() => {
    async function fetchTrClosure() {
      if (!requestId) return;
      setLoadingTrClosure(true);
      try {
        const resp = await api.get(`/tms/tr-closures/?training=${requestId}`);
        const data = resp?.data ?? resp ?? {};
        const list = data.results || data || [];
        setTrClosure(list[0] || null);
      } catch (e) {
        console.error("tp_tr_closure: fetch tr-closures failed", e);
        setTrClosure(null);
      } finally {
        setLoadingTrClosure(false);
      }
    }
    fetchTrClosure();
  }, [requestId]);

  /* ---------------- main batches fetch ---------------- */
  async function fetchBatches(force = false) {
    if (!requestId || !user?.id) return;
    if (inFlightRef.current && !force) return;

    inFlightRef.current = true;
    setLoading(true);
    try {
      const params = {
        request: requestId,
        page_size: 500,
      };
      const resp = await TMS_API.batches.list(params);
      const items = resp?.data?.results || resp?.data || [];
      setBatches(items);
    } catch (e) {
      console.error("tp_tr_closure: fetch batches failed", e);
      setBatches([]);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    if (!requestId) {
      navigate("/tms/training-requests");
      return;
    }
    fetchBatches(refreshToken > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, refreshToken]);

  /* ---------------- per-batch costing & schedules ---------------- */

  async function fetchCosting(batchId) {
    if (!batchId) return;
    setLoadingCosting((m) => ({ ...m, [batchId]: true }));
    try {
      const resp = await api.get(
        `/tms/tp-batch-cost-breakups/?batch=${batchId}`
      );
      const data = resp?.data ?? resp ?? {};
      const list = data.results || data || [];
      const record = list[0] || null;
      setCostingByBatch((m) => ({ ...m, [batchId]: record || null }));

      setTrainerFee((m) => ({ ...m, [batchId]: m[batchId] ?? "" }));
      setTpFee((m) => ({ ...m, [batchId]: m[batchId] ?? "" }));
    } catch (e) {
      console.error("tp_tr_closure: fetch costing failed", e);
      setCostingByBatch((m) => ({ ...m, [batchId]: null }));
    } finally {
      setLoadingCosting((m) => ({ ...m, [batchId]: false }));
    }
  }

  async function fetchBatchCosts(batchId) {
    if (!batchId) return;
    try {
      const resp = await api.get(`/tms/batch-costs/?batch=${batchId}`);
      const data = resp?.data ?? resp ?? {};
      const list = data.results || data || [];
      const record = list[0] || null;
      if (record) {
        setSavedBatchCosts((m) => ({ ...m, [batchId]: record }));
        setTrainerFee((m) => ({
          ...m,
          [batchId]: record.trainer_part_cost || "",
        }));
        setTpFee((m) => ({ ...m, [batchId]: record.tp_part_cost || "" }));
      }
    } catch (e) {
      console.error("tp_tr_closure: fetch batch-costs failed", e);
    }
  }

  async function fetchSchedules(batchId) {
    if (!batchId) return;
    setLoadingSchedules((m) => ({ ...m, [batchId]: true }));
    try {
      const resp = await api.get(`/tms/batch-schedules/?batch=${batchId}`);
      const data = resp?.data ?? resp ?? {};
      const list = data.results || data || [];
      setScheduleByBatch((m) => ({ ...m, [batchId]: list || [] }));
    } catch (e) {
      console.error("tp_tr_closure: fetch schedules failed", e);
      setScheduleByBatch((m) => ({ ...m, [batchId]: [] }));
    } finally {
      setLoadingSchedules((m) => ({ ...m, [batchId]: false }));
    }
  }

  useEffect(() => {
    (batches || []).forEach((b) => {
      const bid = b.id;
      if (bid && costingByBatch[bid] === undefined) {
        fetchCosting(bid);
      }
      if (bid && scheduleByBatch[bid] === undefined) {
        fetchSchedules(bid);
      }
      if (bid && savedBatchCosts[bid] === undefined) {
        fetchBatchCosts(bid);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches]);

  /* ---------------- fee inputs ---------------- */

  function handleFeeChange(batchId, field, value) {
    if (field === "trainer") {
      setTrainerFee((m) => ({ ...m, [batchId]: value }));
    } else if (field === "tp") {
      setTpFee((m) => ({ ...m, [batchId]: value }));
    }
  }

  /* ---------------- save/update batch costs ---------------- */

  async function handleSaveBatchCost(batch) {
    const batchId = batch?.id;
    if (!batchId || !requestId || !user?.id) return;

    const breakup = costingByBatch[batchId];
    if (!breakup || !breakup.id) {
      alert(
        "Cost breakup not found for this batch. Please ensure batch costing (centre/hostel/fooding etc.) is submitted before entering trainer/TP fees."
      );
      return;
    }

    const trainerVal = parseFloat(trainerFee[batchId] || "0") || 0;
    const tpVal = parseFloat(tpFee[batchId] || "0") || 0;

    const existing = savedBatchCosts[batchId];
    const method = existing && existing.id ? "patch" : "post";
    const url =
      method === "post"
        ? "/tms/batch-costs/"
        : `/tms/batch-costs/${existing.id}/`;

    setSavingCost((m) => ({ ...m, [batchId]: true }));
    try {
      const payload = {
        training: requestId,
        batch: batchId,
        trainer_part_cost: trainerVal.toFixed(2),
        tp_part_cost: tpVal.toFixed(2),
        batch_expenses: breakup.id,
        created_by: user.id,
        is_active: 1,
      };

      const resp =
        method === "post"
          ? await api.post(url, payload)
          : await api.patch(url, payload);

      const saved = resp?.data || existing || {};
      setSavedBatchCosts((m) => ({ ...m, [batchId]: saved }));
      alert(
        method === "post"
          ? "Batch costing details saved successfully."
          : "Batch costing details updated successfully."
      );
    } catch (e) {
      console.error("tp_tr_closure: save/update batch-costs failed", e);
      alert(
        "Failed to save costing for this batch. Please check values and try again."
      );
    } finally {
      setSavingCost((m) => ({ ...m, [batchId]: false }));
    }
  }

  /* ---------------- update batch cost breakup via form ---------------- */

  function handleBreakupFieldChange(batchId, field, value) {
    setCostingByBatch((prev) => {
      const current = prev[batchId] || {};
      return {
        ...prev,
        [batchId]: {
          ...current,
          [field]: value,
        },
      };
    });
  }

  async function handleUpdateBreakup(batchId) {
    const breakup = costingByBatch[batchId];
    if (!breakup || !breakup.id) {
      alert("No existing breakup found for this batch to update.");
      return;
    }
    if (!user?.id) return;

    setLoadingCosting((m) => ({ ...m, [batchId]: true }));
    try {
      const payload = {
        ...breakup,
        created_by: breakup.created_by || user.id,
        is_active: 1,
      };
      delete payload.id;
      const url = `/tms/tp-batch-cost-breakups/${breakup.id}/`;
      await api.patch(url, payload);
      alert("Batch cost breakup updated successfully.");
      fetchCosting(batchId);
    } catch (e) {
      console.error("tp_tr_closure: update breakup failed", e);
      alert("Failed to update cost breakup for this batch.");
    } finally {
      setLoadingCosting((m) => ({ ...m, [batchId]: false }));
    }
  }

  /* ---------------- training-level closure ---------------- */

  async function handleCreateTrClosure() {
    if (!requestId || !user?.id) return;
    if (trClosure) {
      alert(
        "A closure request already exists for this training and is under review."
      );
      return;
    }
    if (
      !window.confirm(
        "Are you sure you want to create a closure request for this training?"
      )
    ) {
      return;
    }

    setCreatingClosure(true);
    try {
      const formData = new FormData();
      formData.append("training", requestId);
      formData.append("created_by", String(user.id));
      formData.append("is_active", "1");
      await api.post("/tms/tr-closures/", formData);
      alert("Training closure request created successfully.");
      setRefreshToken((t) => t + 1);
    } catch (e) {
      console.error("tp_tr_closure: create TRClosure failed", e);
      alert(
        "Failed to create training closure request. Please verify all details and try again."
      );
    } finally {
      setCreatingClosure(false);
    }
  }

  /* ---------------- batch detail modal (reusing training_batch_detail logic) ---------------- */

  function openBatchDetailModal(batchId) {
    setDetailBatchId(batchId);
    setDetailModalOpen(true);
  }

  function closeBatchDetailModal() {
    setDetailModalOpen(false);
    setDetailBatchId(null);
    setMediaPreviewSrc(null);
  }

  /* ---------------- render helpers ---------------- */

  const allBatchesCompleted = useMemo(() => {
    if (!batches || batches.length === 0) return false;
    return batches.every((b) => (b.status || "").toUpperCase() === "COMPLETED");
  }, [batches]);

  /* ========================================================= */
  /* =========================== UI ========================== */
  /* ========================================================= */

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu — Training Request Closure
            </div>
          }
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1200, margin: "20px auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <h2 style={{ margin: 0 }}>Close Training Request #{requestId}</h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => setRefreshToken((t) => t + 1)}
                >
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

            {/* TR closure info */}
            <div
              style={{
                marginBottom: 12,
                padding: 10,
                borderRadius: 8,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                fontSize: 14,
                color: "#1e3a8a",
              }}
            >
              {loadingTrClosure ? (
                <span>Checking training closure status…</span>
              ) : trClosure ? (
                <span>
                  A closure request has already been created for this training
                  and is under review by the appropriate authority.
                </span>
              ) : (
                <span>
                  No closure request has been submitted yet for this training.
                </span>
              )}
            </div>

            {/* if TR-closure exists, show only saved batch-costs and exit */}
            {trClosure ? (
              <div
                style={{
                  background: "#fff",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                  Saved Batch Costings (Read Only)
                </h3>
                <div style={{ maxHeight: 520, overflow: "auto" }}>
                  <table className="table table-compact">
                    <thead>
                      <tr>
                        <th>S.No.</th>
                        <th>Batch Code</th>
                        <th>Status</th>
                        <th>Trainer Part Cost</th>
                        <th>TP Part Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center" }}>
                            Loading batches…
                          </td>
                        </tr>
                      ) : batches.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            No batches found for this training request.
                          </td>
                        </tr>
                      ) : (
                        batches.map((batch, index) => {
                          const bid = batch.id;
                          const saved = savedBatchCosts[bid];
                          return (
                            <tr key={bid}>
                              <td>{index + 1}</td>
                              <td>{batch.code}</td>
                              <td>{batch.status}</td>
                              <td>
                                {saved?.trainer_part_cost
                                  ? `₹ ${saved.trainer_part_cost}`
                                  : "-"}
                              </td>
                              <td>
                                {saved?.tp_part_cost
                                  ? `₹ ${saved.tp_part_cost}`
                                  : "-"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                {/* small training request summary */}
                <div
                  style={{
                    marginBottom: 12,
                    padding: 10,
                    borderRadius: 8,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                  }}
                >
                  {loadingTrInfo ? (
                    <span>Loading training request details…</span>
                  ) : !trInfo ? (
                    <span>Training request details not available.</span>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong>Plan:</strong>{" "}
                        {trInfo.training_plan?.training_name ||
                          trInfo.training_plan ||
                          "-"}
                      </div>
                      <div>
                        <strong>Type:</strong> {trInfo.training_type || "-"}
                      </div>
                      <div>
                        <strong>Level:</strong> {trInfo.level || "-"}
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        <span style={{ fontWeight: 700 }}>
                          {trInfo.status || "-"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* warnings / guidance */}
                <div
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    borderRadius: 8,
                    background: "#fffbeb",
                    border: "1px solid #facc15",
                    fontSize: 14,
                    color: "#854d0e",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    Please verify before closing:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    <li>
                      Please ensure all batches are marked complete by the
                      contact person.
                    </li>
                    <li>
                      Please ensure all participant attendences are marked by
                      the contact person.
                    </li>
                    <li>
                      Please ensure all costing details are carefully input.
                    </li>
                  </ul>
                </div>

                {/* batch list + costing */}
                <div
                  style={{ background: "#fff", padding: 12, borderRadius: 8 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <h3 style={{ margin: 0 }}>Batches under this Training</h3>
                    <div style={{ marginLeft: "auto", color: "#6b7280" }}>
                      {loading
                        ? "Loading batches…"
                        : `${batches.length} batch(es) found`}
                    </div>
                  </div>

                  <div style={{ maxHeight: 520, overflow: "auto" }}>
                    <table className="table table-compact">
                      <thead>
                        <tr>
                          <th>S.No.</th>
                          <th>Batch Code</th>
                          <th>Status</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Batch Type</th>
                          <th>Centre</th>
                          <th>Cost Breakup (Editable)</th>
                          <th>Saved Costing</th>
                          <th>Schedules</th>
                          <th>Master Trainer Fee</th>
                          <th>Training Partner Fee</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td
                              colSpan={13}
                              style={{
                                textAlign: "center",
                                padding: "40px",
                              }}
                            >
                              <div>Loading batches…</div>
                            </td>
                          </tr>
                        ) : batches.length === 0 ? (
                          <tr>
                            <td colSpan={13}>
                              No batches found for this training request.
                            </td>
                          </tr>
                        ) : (
                          batches.map((batch, index) => {
                            const bid = batch.id;
                            const cost = costingByBatch[bid] || {};
                            const schedules = scheduleByBatch[bid] || [];
                            const saving = !!savingCost[bid];
                            const savedCost = savedBatchCosts[bid];

                            return (
                              <tr key={bid}>
                                <td>{index + 1}</td>
                                <td>{batch.code}</td>
                                <td>{batch.status}</td>
                                <td>{fmtDate(batch.start_date)}</td>
                                <td>{fmtDate(batch.end_date)}</td>
                                <td>{batch.batch_type}</td>
                                <td>{batch.centre}</td>

                                {/* Cost breakup form */}
                                <td style={{ minWidth: 220 }}>
                                  {loadingCosting[bid] ? (
                                    <span style={{ fontSize: 12 }}>
                                      Loading…
                                    </span>
                                  ) : !cost || !cost.id ? (
                                    <span
                                      style={{
                                        fontSize: 12,
                                        color: "#b91c1c",
                                      }}
                                    >
                                      No breakup found
                                    </span>
                                  ) : (
                                    <div
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                          "repeat(2, minmax(0, 1fr))",
                                        gap: 4,
                                        fontSize: 12,
                                      }}
                                    >
                                      <label>
                                        Total
                                        <input
                                          type="number"
                                          className="form-control"
                                          value={cost.total_cost || ""}
                                          onChange={(e) =>
                                            handleBreakupFieldChange(
                                              bid,
                                              "total_cost",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </label>
                                      <label>
                                        Centre
                                        <input
                                          type="number"
                                          className="form-control"
                                          value={cost.centre_cost || ""}
                                          onChange={(e) =>
                                            handleBreakupFieldChange(
                                              bid,
                                              "centre_cost",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </label>
                                      <label>
                                        Hostel
                                        <input
                                          type="number"
                                          className="form-control"
                                          value={cost.hostel_cost || ""}
                                          onChange={(e) =>
                                            handleBreakupFieldChange(
                                              bid,
                                              "hostel_cost",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </label>
                                      <label>
                                        Fooding
                                        <input
                                          type="number"
                                          className="form-control"
                                          value={cost.fooding_cost || ""}
                                          onChange={(e) =>
                                            handleBreakupFieldChange(
                                              bid,
                                              "fooding_cost",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </label>
                                      <label>
                                        Dresses
                                        <input
                                          type="number"
                                          className="form-control"
                                          value={cost.dresses_cost || ""}
                                          onChange={(e) =>
                                            handleBreakupFieldChange(
                                              bid,
                                              "dresses_cost",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </label>
                                      <label>
                                        Study Material
                                        <input
                                          type="number"
                                          className="form-control"
                                          value={cost.study_material_cost || ""}
                                          onChange={(e) =>
                                            handleBreakupFieldChange(
                                              bid,
                                              "study_material_cost",
                                              e.target.value
                                            )
                                          }
                                        />
                                      </label>
                                      <div
                                        style={{
                                          gridColumn: "1 / -1",
                                          display: "flex",
                                          gap: 4,
                                          marginTop: 4,
                                        }}
                                      >
                                        <button
                                          type="button"
                                          className="btn-sm btn-flat"
                                          onClick={() => fetchCosting(bid)}
                                        >
                                          Refresh
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-sm btn-outline"
                                          disabled={!cost.id}
                                          onClick={() =>
                                            handleUpdateBreakup(bid)
                                          }
                                        >
                                          Update Breakup
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </td>

                                {/* Saved costing */}
                                <td style={{ minWidth: 140 }}>
                                  {savedCost ? (
                                    <div style={{ fontSize: 12 }}>
                                      <div>
                                        <strong>Trainer:</strong> ₹{" "}
                                        {savedCost.trainer_part_cost || "0.00"}
                                      </div>
                                      <div>
                                        <strong>TP:</strong> ₹{" "}
                                        {savedCost.tp_part_cost || "0.00"}
                                      </div>
                                    </div>
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: 12,
                                        color: "#6b7280",
                                      }}
                                    >
                                      Not saved yet
                                    </span>
                                  )}
                                </td>

                                {/* Schedules */}
                                <td style={{ minWidth: 160 }}>
                                  {loadingSchedules[bid] ? (
                                    <span style={{ fontSize: 12 }}>
                                      Loading…
                                    </span>
                                  ) : schedules.length === 0 ? (
                                    <span style={{ fontSize: 12 }}>
                                      No schedules
                                    </span>
                                  ) : (
                                    <div style={{ fontSize: 12 }}>
                                      {schedules.slice(0, 3).map((s) => (
                                        <div key={s.id}>
                                          {fmtDate(s.schedule_date)}{" "}
                                          {s.start_time || ""}
                                        </div>
                                      ))}
                                      {schedules.length > 3 && (
                                        <div>
                                          + {schedules.length - 3} more…
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className="btn-sm btn-flat"
                                    style={{ marginTop: 4 }}
                                    onClick={() => fetchSchedules(bid)}
                                  >
                                    Refresh
                                  </button>
                                </td>

                                {/* Trainer Fee */}
                                <td style={{ minWidth: 130 }}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={trainerFee[bid] ?? ""}
                                    onChange={(e) =>
                                      handleFeeChange(
                                        bid,
                                        "trainer",
                                        e.target.value
                                      )
                                    }
                                    className="form-control"
                                    style={{ width: "100%" }}
                                  />
                                </td>

                                {/* TP Fee */}
                                <td style={{ minWidth: 130 }}>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={tpFee[bid] ?? ""}
                                    onChange={(e) =>
                                      handleFeeChange(bid, "tp", e.target.value)
                                    }
                                    className="form-control"
                                    style={{ width: "100%" }}
                                  />
                                </td>

                                {/* Actions */}
                                <td style={{ minWidth: 150 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 4,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="btn-sm btn-primary"
                                      onClick={() => openBatchDetailModal(bid)}
                                    >
                                      View Detail
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-sm"
                                      disabled={saving}
                                      onClick={() => handleSaveBatchCost(batch)}
                                    >
                                      {saving
                                        ? "Saving…"
                                        : savedCost
                                          ? "Update Costing"
                                          : "Save Costing"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* closure button */}
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: "1px solid #e5e7eb",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, fontSize: 13, color: "#4b5563" }}>
                      {allBatchesCompleted ? (
                        <span>
                          All batches under this training are marked{" "}
                          <strong>COMPLETED</strong>. You may proceed to create
                          the closure request.
                        </span>
                      ) : (
                        <span>
                          Some batches are not in <strong>COMPLETED</strong>{" "}
                          status. You can still submit the closure request if
                          appropriate.
                        </span>
                      )}
                    </div>
                    {isTP && (
                      <button
                        type="button"
                        className="btn btn-success"
                        disabled={creatingClosure}
                        onClick={handleCreateTrClosure}
                      >
                        {creatingClosure
                          ? "Creating Closure Request…"
                          : "Create Closure request for this training"}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Batch detail modal */}
      <Modal
        open={detailModalOpen && !!detailBatchId}
        onClose={closeBatchDetailModal}
        title={
          detailBatchId
            ? `Batch Detail — Batch #${detailBatchId}`
            : "Batch Detail"
        }
      >
        {detailBatchId ? (
          <BatchDetailInner
            batchId={detailBatchId}
            mediaPreviewSrc={mediaPreviewSrc}
            setMediaPreviewSrc={setMediaPreviewSrc}
          />
        ) : null}
      </Modal>
    </div>
  );
}

/* ========================================================= */
/* ============ INNER BATCH DETAIL (REUSED LOGIC) ========== */
/* ========================================================= */

const DETAIL_CACHE_PREFIX = "tms_batch_detail_cache_v1::";

function loadDetailCache(id) {
  try {
    const raw = localStorage.getItem(DETAIL_CACHE_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDetailCache(id, payload) {
  try {
    localStorage.setItem(
      DETAIL_CACHE_PREFIX + id,
      JSON.stringify({ ts: Date.now(), payload })
    );
  } catch {}
}

function BatchDetailInner({ batchId, mediaPreviewSrc, setMediaPreviewSrc }) {
  const { user } = useContext(AuthContext) || {};

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

  const [refreshToken, setRefreshToken] = useState(0);
  const inFlightRef = useRef(false);

  const [closureRequest, setClosureRequest] = useState(null);
  const [batchMedia, setBatchMedia] = useState([]);
  const [loadingClosureInfo, setLoadingClosureInfo] = useState(false);
  const [selectedMediaDate, setSelectedMediaDate] = useState(null);

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
        const cached = loadDetailCache(batchId);
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
        console.error("tp_tr_closure: fetch attendance list failed", e);
        setAttendanceList([]);
      } finally {
        setLoadingAttendance(false);
      }

      saveDetailCache(batchId, {
        batchData: batchResponse,
        trainingRequestDetail: trDetail,
        participants: batchResponse?.beneficiary || [],
        masterTrainers: batchResponse?.master_trainers || [],
        centreDetail: fullCentreData,
        attendanceList: attendances,
      });
    } catch (e) {
      console.error("tp_tr_closure: fetchAll batch detail failed", e);
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
      console.error("tp_tr_closure: fetchClosureInfo failed", e);
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
        "tp_tr_closure: fetchAttendanceParticipantsForDate failed",
        e
      );
      setSelectedAttendanceRecords([]);
    } finally {
      setLoadingSelectedAttendance(false);
    }
  }

  if (loadingAll && !batchData) {
    return (
      <div style={{ padding: 12 }}>
        <div className="table-spinner">Loading batch details…</div>
      </div>
    );
  }

  return (
    <div>
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
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-sm" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </div>

      {/* closure banner */}
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
            {/* 1. Training details */}
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

            {/* 2. Batch details */}
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
              </div>
            </div>

            {/* 3. Attendance + media */}
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

            {/* 4. centre details */}
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

            {/* 5. participants */}
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

      {/* lightbox for media preview */}
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
