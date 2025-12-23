// src/pages/TMS/DMMU/dmmu_tr_review.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API } from "../../../api/axios";
import { getCanonicalRole } from "../../../utils/roleUtils";

/* ---------------- cache keys ---------------- */

const TR_DETAIL_CACHE_KEY = "tms_tr_detail_cache_v1::";
const BATCHES_CACHE_KEY = "tms_training_batches_cache_v1";
const MASTER_TRAINER_PAGE_CACHE = "tms_master_trainer_page_cache_v1";

/* ---------------- helpers ---------------- */

function loadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function getBatchesCacheKey(requestId) {
  return `${BATCHES_CACHE_KEY}_${requestId}`;
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

/* ---------------- simple modal ---------------- */

function Modal({ open, title, onClose, children, width = 800 }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        backdropFilter: "blur(3px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `min(${width}px, 96%)`,
          maxHeight: "90vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 10,
          padding: 18,
          boxShadow: "0 8px 28px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: 10 }}
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

/* ---------------- main component ---------------- */

export default function DmmuTrReview() {
  const { id: requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const role = getCanonicalRole(user || {});
  const isDmmu = role === "dmmu" || role === "2";

  const [tr, setTr] = useState(null);
  const [trainingPlanObj, setTrainingPlanObj] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loadingTR, setLoadingTR] = useState(false);

  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // master trainer modal state
  const [mtModalOpen, setMtModalOpen] = useState(false);
  const [mtModalBatch, setMtModalBatch] = useState(null);
  const [mtLoadingList, setMtLoadingList] = useState(false);
  const [mtPage, setMtPage] = useState(1);
  const [mtPageSize] = useState(10);
  const [mtTotal, setMtTotal] = useState(0);
  const [mtList, setMtList] = useState([]);
  const [mtCheckingId, setMtCheckingId] = useState(null);
  const [mtSelections, setMtSelections] = useState({}); // { batchId: Set(masterTrainerId) }

  // approve / revert
  const [savingApprove, setSavingApprove] = useState(false);
  const [savingRevert, setSavingRevert] = useState(false);
  const [revertReason, setRevertReason] = useState("");
  const [revertModalOpen, setRevertModalOpen] = useState(false);

  const trInFlightRef = useRef(false);
  const batchesInFlightRef = useRef(false);
  const mtInFlightRef = useRef(false);

  /* ---------------- TR detail fetch (reusing training_req_detail cache style) ---------------- */

  function loadTrCache(id) {
    return loadJson(TR_DETAIL_CACHE_KEY + id);
  }

  function saveTrCache(id, payload) {
    saveJson(TR_DETAIL_CACHE_KEY + id, { ts: Date.now(), payload });
  }

  async function fetchTrainingPlan(planId) {
    if (!planId) return null;
    try {
      const r = await TMS_API.trainingPlans.list({
        id: planId,
        fields: "training_name",
      });
      const results = r?.data?.results || r?.data || [];
      return results[0] || null;
    } catch (err) {
      return null;
    }
  }

  async function fetchTrDetail(force = false) {
    if (!requestId) return;
    if (trInFlightRef.current && !force) return;
    trInFlightRef.current = true;
    setLoadingTR(true);
    try {
      if (!force) {
        const cached = loadTrCache(requestId);
        if (cached?.payload?.tr) {
          setTr(cached.payload.tr);
          setPartner(cached.payload.partner || null);
          setTrainingPlanObj(cached.payload.training_plan_obj || null);
          setLoadingTR(false);
          trInFlightRef.current = false;
          return;
        }
      }

      const trResp = await TMS_API.trainingRequests.retrieve(requestId);
      const trObj = trResp?.data ?? trResp ?? null;
      setTr(trObj);

      let tpObj = null;
      if (trObj?.training_plan) {
        tpObj = await fetchTrainingPlan(trObj.training_plan);
        setTrainingPlanObj(tpObj);
      }

      let partnerObj = null;
      if (trObj?.partner) {
        try {
          if (TMS_API.trainingPartners?.retrieve) {
            const pResp = await TMS_API.trainingPartners.retrieve(
              trObj.partner
            );
            partnerObj = pResp?.data ?? pResp ?? null;
          } else {
            const pResp = await TMS_API.trainingPartners.list({
              id: trObj.partner,
              fields: "name",
            });
            partnerObj = (pResp?.data?.results || pResp?.data || [])[0] || null;
          }
        } catch {
          partnerObj = null;
        }
      }
      setPartner(partnerObj);

      saveTrCache(requestId, {
        tr: trObj,
        partner: partnerObj,
        training_plan_obj: tpObj,
        participants: [], // not needed here
      });
    } catch (e) {
      setTr(null);
      setPartner(null);
      setTrainingPlanObj(null);
    } finally {
      setLoadingTR(false);
      trInFlightRef.current = false;
    }
  }

  /* ---------------- batches fetch (reusing training_batch_list style) ---------------- */

  function loadBatchesCache(requestId) {
    return loadJson(getBatchesCacheKey(requestId));
  }

  function saveBatchesCache(requestId, payload) {
    saveJson(getBatchesCacheKey(requestId), {
      ts: Date.now(),
      payload,
      meta: {},
    });
  }

  async function fetchBatches(force = false) {
    if (!requestId) return;
    if (batchesInFlightRef.current && !force) return;
    batchesInFlightRef.current = true;
    setLoadingBatches(true);
    try {
      if (!force) {
        const cached = loadBatchesCache(requestId);
        if (cached?.payload) {
          setBatches(cached.payload || []);
          setLoadingBatches(false);
          batchesInFlightRef.current = false;
          return;
        }
      }
      const resp = await TMS_API.batches.list({
        request: requestId,
        page_size: 500,
      });
      const items = resp?.data?.results || [];
      setBatches(items);
      saveBatchesCache(requestId, items);
    } catch (e) {
      setBatches([]);
    } finally {
      setLoadingBatches(false);
      batchesInFlightRef.current = false;
    }
  }

  /* ---------------- master trainer list ---------------- */

  function loadMtPageCache(page, pageSize) {
    const key = `${MASTER_TRAINER_PAGE_CACHE}_${page}_${pageSize}`;
    return loadJson(key);
  }

  function saveMtPageCache(page, pageSize, payload) {
    const key = `${MASTER_TRAINER_PAGE_CACHE}_${page}_${pageSize}`;
    saveJson(key, { ts: Date.now(), payload });
  }

  async function fetchMasterTrainers(page = 1, pageSize = 10, force = false) {
    if (mtInFlightRef.current && !force) return;
    mtInFlightRef.current = true;
    setMtLoadingList(true);
    try {
      if (!force) {
        const cached = loadMtPageCache(page, pageSize);
        if (cached?.payload) {
          const data = cached.payload;
          setMtList(data.results || []);
          setMtTotal(data.count || 0);
          setMtLoadingList(false);
          mtInFlightRef.current = false;
          return;
        }
      }
      const params = { page, page_size: pageSize };
      const resp = await TMS_API.masterTrainers.list(params);
      const data = resp?.data ?? resp ?? {};
      setMtList(data.results || []);
      setMtTotal(data.count || 0);
      saveMtPageCache(page, pageSize, data);
    } catch {
      setMtList([]);
      setMtTotal(0);
    } finally {
      setMtLoadingList(false);
      mtInFlightRef.current = false;
    }
  }

  /* ---------------- availability check + selection ---------------- */

  async function handleToggleMasterTrainer(batchId, trainer) {
    const trainerId = trainer.id;
    const currentSet = new Set(mtSelections[batchId] || []);
    const isSelected = currentSet.has(trainerId);

    // If deselecting, just remove
    if (isSelected) {
      currentSet.delete(trainerId);
      setMtSelections((prev) => ({
        ...prev,
        [batchId]: Array.from(currentSet),
      }));
      return;
    }

    // Selecting → check availability
    setMtCheckingId(trainerId);
    try {
      // show small logical message: Checking availability…
      const resp = await TMS_API.batchMasterTrainers.list({
        master_trainer: trainerId,
        status: "UNAVAILABLE",
      });
      const tr_resp = await TMS_API.trTrainers.list({
        trainer: trainerId,
      });
      const tr_results = tr_resp?.data?.results || tr_resp?.data || [];
      const results = resp?.data?.results || resp?.data || [];
      if (results.length > 0 || tr_results.length > 0) {
        // not available → do not select, maybe toast or alert
        alert("This Master Trainer is not available at the moment.");
      } else {
        // available → allow select
        currentSet.add(trainerId);
        setMtSelections((prev) => ({
          ...prev,
          [batchId]: Array.from(currentSet),
        }));
      }
    } catch (e) {
      alert("Unable to verify trainer availability. Please try again.");
    } finally {
      setMtCheckingId(null);
    }
  }

  const mtTotalPages = useMemo(
    () => Math.max(1, Math.ceil(mtTotal / mtPageSize)),
    [mtTotal, mtPageSize]
  );

  /* ---------------- approve / revert logic ---------------- */

  function isSameDate(dateStr, refDate) {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      return (
        d.getFullYear() === refDate.getFullYear() &&
        d.getMonth() === refDate.getMonth() &&
        d.getDate() === refDate.getDate()
      );
    } catch {
      return false;
    }
  }

  async function handleApprove() {
    if (!requestId || !tr) return;
    if (!batches || batches.length === 0) {
      alert("No batches found for this training request.");
      return;
    }
    setSavingApprove(true);
    try {
      const today = new Date();

      // 1) For each batch, create BatchMasterTrainer rows for selected trainers
      for (const batch of batches) {
        const selectedTrainerIds = mtSelections[batch.id] || [];
        for (const mtId of selectedTrainerIds) {
          try {
            await TMS_API.batchMasterTrainers.create({
              batch: batch.id,
              master_trainer: mtId,
              participated: false,
              status: "UNAVAILABLE",
              remarks: "",
            });
          } catch (e) {
            console.error("BatchMasterTrainer create failed", e);
          }
        }
      }

      // 2) Update training request status → ONGOING
      await TMS_API.trainingRequests.partialUpdate(requestId, {
        status: "ONGOING",
      });

      // 3) Update each batch status based on start_date
      for (const batch of batches) {
        let newStatus = "SCHEDULED";
        if (isSameDate(batch.start_date, today)) {
          newStatus = "ONGOING";
        } else {
          const ds = new Date(batch.start_date);
          if (ds < today) {
            // if start_date is past, treat as ONGOING too
            newStatus = "ONGOING";
          }
        }
        try {
          await TMS_API.batches.partialUpdate(batch.id, {
            status: newStatus,
          });
        } catch (e) {
          console.error("Batch status update failed", e);
        }
      }

      alert("Training Request approved and batches updated successfully.");
      navigate(-1);
    } catch (e) {
      console.error("Approve failed", e);
      alert("Failed to approve. Please try again.");
    } finally {
      setSavingApprove(false);
    }
  }

  async function handleConfirmRevert() {
    if (!requestId || !tr) return;
    if (!revertReason.trim()) {
      alert("Please enter a rejection reason.");
      return;
    }
    setSavingRevert(true);
    try {
      // 1) Update training request status → REJECTED with reason
      await TMS_API.trainingRequests.partialUpdate(requestId, {
        status: "REJECTED",
        rejection_reason: revertReason.trim(),
      });

      // 2) Update all batches → REJECTED
      for (const batch of batches) {
        try {
          await TMS_API.batches.partialUpdate(batch.id, {
            status: "REJECTED",
          });
        } catch (e) {
          console.error("Batch reject update failed", e);
        }
      }

      alert("Training Request reverted and all batches marked REJECTED.");
      navigate(-1);
    } catch (e) {
      console.error("Revert failed", e);
      alert("Failed to revert. Please try again.");
    } finally {
      setSavingRevert(false);
    }
  }

  /* ---------------- effects ---------------- */

  useEffect(() => {
    if (!requestId) return;
    fetchTrDetail(false);
    fetchBatches(false);
  }, [requestId]);

  useEffect(() => {
    if (!mtModalOpen) return;
    fetchMasterTrainers(mtPage, mtPageSize, false);
  }, [mtModalOpen, mtPage, mtPageSize]);

  /* ---------------- render helpers ---------------- */

  function statusMessage(trObj) {
    if (!trObj) return null;
    const statusText = (trObj.status || "—").toUpperCase();
    const boldStatus = (
      <strong style={{ color: "#0b5cff", padding: "2px 6px", borderRadius: 4 }}>
        {statusText}
      </strong>
    );

    switch (statusText) {
      case "PENDING":
        return (
          <span>
            Training Request is in {boldStatus} status. DMMU can review batches,
            assign Master Trainers, and either Approve or Revert.
          </span>
        );
      case "BATCHING":
        return (
          <span>
            Training Request is in {boldStatus} status. Wait for Training
            Partner to finish batching.
          </span>
        );
      case "REVIEW":
        return (
          <span>
            Training Request is under {boldStatus}. Please verify batches and
            finalize the decision.
          </span>
        );
      default:
        return <span>Status: {boldStatus}</span>;
    }
  }

  function renderTrSummary() {
    if (loadingTR) {
      return (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            background: "#f5f8ff",
            marginBottom: 12,
          }}
        >
          <div className="table-spinner">Loading training request details…</div>
        </div>
      );
    }
    if (!tr) {
      return (
        <div className="muted" style={{ marginBottom: 12 }}>
          Training Request could not be loaded.
        </div>
      );
    }
    return (
      <>
        <div style={{ marginBottom: 8 }}>
          <strong>Plan:</strong>{" "}
          {trainingPlanObj?.training_name || tr.training_plan || "-"}{" "}
          &nbsp;&nbsp;
          <strong>Type:</strong> {tr.training_type || "-"} &nbsp;&nbsp;
          <strong>Level:</strong> {tr.level || "-"} &nbsp;&nbsp;
          <strong>Status:</strong>{" "}
          <span style={{ fontWeight: 700 }}>{tr.status || "-"}</span>
        </div>
        <div style={{ marginBottom: 8 }}>
          <strong>Partner:</strong>{" "}
          {partner?.name ||
            tr.partner_name ||
            (tr.partner ? `Partner ID ${tr.partner}` : "-")}
        </div>
        <div
          style={{
            padding: 12,
            borderRadius: 6,
            background: "#fbfdff",
            marginBottom: 12,
          }}
        >
          {statusMessage(tr)}
        </div>
      </>
    );
  }

  /* ---------------- master trainer modal UI ---------------- */

  function renderMtModal() {
    if (!mtModalBatch) return null;
    const batchId = mtModalBatch.id;
    const selectedForBatch = new Set(mtSelections[batchId] || []);

    return (
      <Modal
        open={mtModalOpen}
        onClose={() => setMtModalOpen(false)}
        title={`Assign Master Trainer(s) — Batch ${mtModalBatch.code}`}
        width={900}
      >
        <div style={{ marginBottom: 10, display: "flex", gap: 8 }}>
          <div style={{ fontSize: 13, color: "#6c757d" }}>
            Select Master Trainers to attach with this batch. Availability will
            be checked before selection.
          </div>
          <button
            className="btn btn-outline"
            style={{ marginLeft: "auto" }}
            onClick={() => fetchMasterTrainers(mtPage, mtPageSize, true)}
          >
            Refresh list
          </button>
        </div>

        {mtLoadingList ? (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: "#6c757d",
            }}
          >
            Loading master trainers…
          </div>
        ) : mtList.length === 0 ? (
          <div style={{ padding: 12 }}>No master trainers found.</div>
        ) : (
          <div style={{ maxHeight: 360, overflow: "auto" }}>
            <table className="table table-compact">
              <thead>
                <tr>
                  <th />
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Mobile</th>
                  <th>Designation</th>
                </tr>
              </thead>
              <tbody>
                {mtList.map((mt) => {
                  const isSelected = selectedForBatch.has(mt.id);
                  const isChecking = mtCheckingId === mt.id;
                  return (
                    <tr key={mt.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isChecking}
                          onChange={() =>
                            handleToggleMasterTrainer(batchId, mt)
                          }
                        />
                      </td>
                      <td>{mt.id}</td>
                      <td>{mt.full_name || "-"}</td>
                      <td>{mt.mobile_no || "-"}</td>
                      <td>{mt.designation || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 10,
            gap: 10,
          }}
        >
          <button
            className="btn"
            disabled={mtPage <= 1 || mtLoadingList}
            onClick={() => setMtPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <div style={{ fontSize: 13, color: "#6c757d" }}>
            Page {mtPage} / {mtTotalPages}
          </div>
          <button
            className="btn"
            disabled={mtPage >= mtTotalPages || mtLoadingList}
            onClick={() => setMtPage((p) => Math.min(mtTotalPages, p + 1))}
          >
            Next
          </button>
          {mtCheckingId && (
            <div
              style={{
                marginLeft: "auto",
                fontSize: 13,
                color: "#2563eb",
                fontStyle: "italic",
              }}
            >
              Checking availability…
            </div>
          )}
        </div>
      </Modal>
    );
  }

  /* ---------------- main render ---------------- */

  const canActOnRequest =
    isDmmu &&
    tr &&
    ["PENDING", "REVIEW"].includes((tr.status || "").toUpperCase());

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu — DMMU Training Request Review
            </div>
          }
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1200, margin: "20px auto" }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>
                DMMU Review — Training Request #{requestId}
              </h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.removeItem(TR_DETAIL_CACHE_KEY + requestId);
                    fetchTrDetail(true);
                  }}
                >
                  Refresh request
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.removeItem(getBatchesCacheKey(requestId));
                    fetchBatches(true);
                  }}
                >
                  Refresh batches
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate(-1)}
                >
                  Back
                </button>
              </div>
            </div>

            <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
              {/* Training Request summary */}
              {renderTrSummary()}

              {/* Batches list */}
              <div style={{ marginTop: 16 }}>
                <h3 style={{ marginTop: 0 }}>
                  Batches in this Training Request
                </h3>
                <div
                  style={{
                    fontSize: 13,
                    color: "#6c757d",
                    marginBottom: 8,
                  }}
                >
                  Review each batch and assign master trainer(s) where required.
                </div>

                {loadingBatches ? (
                  <div
                    style={{
                      padding: 20,
                      textAlign: "center",
                      color: "#6c757d",
                    }}
                  >
                    <div className="table-spinner">
                      Loading batches for this training request…
                    </div>
                  </div>
                ) : batches.length === 0 ? (
                  <div className="muted">
                    No batches found for this training request.
                  </div>
                ) : (
                  <div style={{ maxHeight: 480, overflow: "auto" }}>
                    <table className="table table-compact">
                      <thead>
                        <tr>
                          <th>S.No.</th>
                          <th>Batch Code</th>
                          <th>Status</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Batch Type</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((b, idx) => (
                          <tr key={b.id}>
                            <td>{idx + 1}</td>
                            <td>{b.code}</td>
                            <td>{b.status}</td>
                            <td>{fmtDate(b.start_date)}</td>
                            <td>{fmtDate(b.end_date)}</td>
                            <td>{b.batch_type}</td>
                            <td>
                              <button
                                className="btn-sm btn-flat"
                                onClick={() =>
                                  navigate(`/tms/batch-detail/${b.id}`)
                                }
                              >
                                View
                              </button>{" "}
                              {canActOnRequest && (
                                <button
                                  className="btn-sm btn-flat"
                                  onClick={() => {
                                    setMtModalBatch(b);
                                    setMtModalOpen(true);
                                  }}
                                >
                                  Add Master Trainer
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Approve / Revert */}
              {canActOnRequest && (
                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 12,
                  }}
                >
                  <button
                    className="btn btn-outline"
                    style={{
                      borderColor: "#ef4444",
                      color: "#b91c1c",
                      fontWeight: 600,
                    }}
                    onClick={() => setRevertModalOpen(true)}
                    disabled={savingApprove || savingRevert}
                  >
                    {savingRevert ? "Reverting…" : "Revert Request"}
                  </button>
                  <button
                    className="btn"
                    style={{
                      border: "2px solid #16a34a",
                      background: "#16a34a",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                    onClick={handleApprove}
                    disabled={savingApprove || savingRevert}
                  >
                    {savingApprove ? "Approving…" : "Approve Request"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Master Trainer assignment modal */}
      {renderMtModal()}

      {/* Revert reason modal */}
      <Modal
        open={revertModalOpen}
        onClose={() => {
          if (!savingRevert) setRevertModalOpen(false);
        }}
        title="Revert Training Request"
        width={600}
      >
        <div style={{ fontSize: 14, marginBottom: 10 }}>
          Please provide a rejection reason. This will be stored in{" "}
          <strong>rejection_reason</strong> and the Training Request along with
          all its batches will be marked as <strong>REJECTED</strong>.
        </div>
        <textarea
          className="input"
          rows={4}
          placeholder="Rejection Reason…"
          value={revertReason}
          onChange={(e) => setRevertReason(e.target.value)}
          disabled={savingRevert}
          style={{ width: "100%", marginBottom: 12 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={() => setRevertModalOpen(false)}
            disabled={savingRevert}
          >
            Cancel
          </button>
          <button
            className="btn"
            style={{
              borderColor: "#ef4444",
              background: "#ef4444",
              color: "#fff",
            }}
            onClick={handleConfirmRevert}
            disabled={savingRevert}
          >
            {savingRevert ? "Submitting…" : "Confirm Revert"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
