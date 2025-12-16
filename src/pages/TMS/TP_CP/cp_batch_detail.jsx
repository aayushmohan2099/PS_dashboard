// src/pages/TMS/TP_CP/cp_batch_detail.jsx
import React, {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import TmsLeftNav from "../layout/tms_LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api, { TMS_API } from "../../../api/axios";

const BATCH_CACHE_KEY_PREFIX = "tms_cp_batch_detail_v1::";
const PLAN_CACHE_KEY_PREFIX = "tms_cp_training_plan_v1::";

function loadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveJson(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), payload }));
  } catch {}
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

function statusBadgeColor(status) {
  const s = (status || "").toUpperCase();
  if (s === "ONGOING") return "#16a34a";
  if (s === "SCHEDULED") return "#0ea5e9";
  if (s === "COMPLETED") return "#6b7280";
  if (s === "REJECTED") return "#ef4444";
  return "#6b7280";
}

function parseHHMMToParts(value) {
  if (!value) return { h: "", m: "" };
  const [h, m] = String(value).split(":");
  return { h: h ?? "", m: m ?? "" };
}

export default function CpBatchDetail() {
  const { id: batchId } = useParams();
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const [batch, setBatch] = useState(
    () => loadJson(BATCH_CACHE_KEY_PREFIX + batchId)?.payload || null
  );
  const [trainingPlan, setTrainingPlan] = useState(() => {
    const cached = loadJson(PLAN_CACHE_KEY_PREFIX + batchId);
    return cached?.payload || null;
  });

  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // time_of_training controls
  const [durationMode, setDurationMode] = useState("1"); // "1","2","3","custom"
  const [customHours, setCustomHours] = useState("");
  const [customMinutes, setCustomMinutes] = useState("");
  const [savingDuration, setSavingDuration] = useState(false);
  const [openingManager, setOpeningManager] = useState(false);

  const didInitRef = useRef(false);

  async function fetchBatch(force = false) {
    if (!batchId) return;
    if (!force && batch) return;
    setLoadingBatch(true);
    try {
      if (!force) {
        const cached = loadJson(BATCH_CACHE_KEY_PREFIX + batchId);
        if (cached?.payload) {
          setBatch(cached.payload);
          return;
        }
      }
      const resp = await api.get(`/tms/batches/${batchId}/detail/`);
      const data = resp?.data || null;
      setBatch(data);
      saveJson(BATCH_CACHE_KEY_PREFIX + batchId, data);

      // if time_of_training already present, prefill UI
      if (data?.time_of_training) {
        const { h, m } = parseHHMMToParts(data.time_of_training);
        setDurationMode("custom");
        setCustomHours(h);
        setCustomMinutes(m);
      }
    } catch (e) {
      console.error("cp fetch batch detail failed", e);
      setBatch(null);
    } finally {
      setLoadingBatch(false);
    }
  }

  async function fetchTrainingPlan(force = false) {
    if (!batch?.request?.training_plan) return;
    if (!force && trainingPlan) return;
    setLoadingPlan(true);
    try {
      if (!force) {
        const cached = loadJson(PLAN_CACHE_KEY_PREFIX + batchId);
        if (cached?.payload) {
          setTrainingPlan(cached.payload);
          return;
        }
      }
      const planId = batch.request.training_plan;
      const resp = await TMS_API.trainingPlans.retrieve
        ? await TMS_API.trainingPlans.retrieve(planId)
        : await api.get(`/tms/training-plans/${planId}/`);
      const data = resp?.data || resp || null;
      setTrainingPlan(data);
      saveJson(PLAN_CACHE_KEY_PREFIX + batchId, data);
    } catch (e) {
      console.error("cp fetch training plan failed", e);
      setTrainingPlan(null);
    } finally {
      setLoadingPlan(false);
    }
  }

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    fetchBatch(false);
  }, [batchId]);

  useEffect(() => {
    if (batch?.request?.training_plan) {
      fetchTrainingPlan(false);
    }
  }, [batch?.request?.training_plan]);

  function handleRefreshAll() {
    try {
      localStorage.removeItem(BATCH_CACHE_KEY_PREFIX + batchId);
      localStorage.removeItem(PLAN_CACHE_KEY_PREFIX + batchId);
    } catch {}
    setBatch(null);
    setTrainingPlan(null);
    fetchBatch(true);
  }

  function computeTimeOfTrainingPayload() {
    if (durationMode === "1" || durationMode === "2" || durationMode === "3") {
      const hours = parseInt(durationMode, 10);
      const hh = hours.toString().padStart(2, "0");
      return `${hh}:00`;
    }
    // custom
    const h = parseInt(customHours || "0", 10);
    const m = parseInt(customMinutes || "0", 10);
    const safeH = Math.min(Math.max(h, 0), 8);
    const safeM = Math.min(Math.max(m, 0), 59);
    const hh = safeH.toString().padStart(2, "0");
    const mm = safeM.toString().padStart(2, "0");
    return `${hh}:${mm}`;
  }

  async function patchTimeOfTraining() {
    if (!batchId) return null;
    const payloadTime = computeTimeOfTrainingPayload();
    try {
      const resp = await (TMS_API.batches?.partialUpdate
        ? TMS_API.batches.partialUpdate(batchId, {
            time_of_training: payloadTime,
          })
        : api.patch(`/tms/batches/${batchId}/`, {
            time_of_training: payloadTime,
          }));
      const data = resp?.data || resp || null;
      const updated = {
        ...(batch || {}),
        time_of_training: payloadTime,
      };
      setBatch(updated);
      saveJson(BATCH_CACHE_KEY_PREFIX + batchId, updated);
      return payloadTime;
    } catch (e) {
      console.error("patch time_of_training failed", e);
      throw e;
    }
  }

  async function handleSaveDuration() {
    if (!batchId) return;
    setSavingDuration(true);
    try {
      await patchTimeOfTraining();
      alert("Session duration saved.");
    } catch {
      alert("Failed to save duration. Please try again.");
    } finally {
      setSavingDuration(false);
    }
  }

  async function handleOpenAttendanceManager() {
    if (!batchId) return;
    setOpeningManager(true);
    try {
      await patchTimeOfTraining();
      navigate(`/tms/cp/batch-attendance-ekyc/${batchId}`);
    } catch {
      alert(
        "Could not save session duration. Please check and try opening the manager again."
      );
    } finally {
      setOpeningManager(false);
    }
  }

  const hasTimeOfTraining = !!batch?.time_of_training;

  return (
    <div className="app-shell">
      <TmsLeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu — Contact Person / Batch Detail
            </div>
          }
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <h2 style={{ margin: 0 }}>Batch Detail — #{batchId}</h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button className="btn" onClick={handleRefreshAll}>
                  Refresh
                </button>
                <button className="btn btn-outline" onClick={() => navigate(-1)}>
                  Back
                </button>
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 8, padding: 18 }}>
              {/* Batch summary */}
              {loadingBatch && !batch ? (
                <div className="table-spinner">Loading batch details…</div>
              ) : !batch ? (
                <div className="muted">
                  Batch not found or could not be loaded.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Batch Code:</strong>{" "}
                      <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
                        {batch.code || batch.id}
                      </span>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Status:</strong>{" "}
                      <span
                        style={{
                          fontWeight: 700,
                          color: "#fff",
                          background: statusBadgeColor(batch.status),
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontSize: 12,
                        }}
                      >
                        {(batch.status || "-").toUpperCase()}
                      </span>
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Centre:</strong>{" "}
                      {batch.centre?.venue_name || "—"}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Start Date:</strong> {fmtDate(batch.start_date)} |{" "}
                      <strong>End Date:</strong> {fmtDate(batch.end_date)}
                    </div>
                  </div>

                  {/* Training Plan info */}
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      background: "#f9fafb",
                      marginBottom: 12,
                    }}
                  >
                    {loadingPlan && !trainingPlan ? (
                      <div className="table-spinner">
                        Loading training plan information…
                      </div>
                    ) : !trainingPlan ? (
                      <div className="muted">
                        Training name:{" "}
                        <strong>
                          {batch.request?.training_plan
                            ? `Plan #${batch.request.training_plan}`
                            : "—"}
                        </strong>
                      </div>
                    ) : (
                      <>
                        <div>
                          <strong>Training Name:</strong>{" "}
                          {trainingPlan.training_name || "-"}
                        </div>
                        <div>
                          <strong>No. of Days:</strong>{" "}
                          {trainingPlan.no_of_days || "-"}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Session duration configuration */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      background: "#eff6ff",
                    }}
                  >
                    <h4 style={{ marginTop: 0 }}>Set session duration</h4>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                        marginBottom: 8,
                      }}
                    >
                      Duration of one training session. This will also be used
                      to compute the attendance recording window.
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                      <label style={{ fontWeight: 600 }}>
                        Duration (Hours):
                      </label>
                      <select
                        className="input"
                        value={durationMode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDurationMode(val);
                          if (val === "1" || val === "2" || val === "3") {
                            setCustomHours("");
                            setCustomMinutes("");
                          }
                        }}
                      >
                        <option value="1">1 Hour</option>
                        <option value="2">2 Hours</option>
                        <option value="3">3 Hours</option>
                        <option value="custom">Custom</option>
                      </select>

                      {durationMode === "custom" && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <input
                              type="number"
                              min={0}
                              max={8}
                              className="input"
                              style={{ width: 80 }}
                              placeholder="Hours"
                              value={customHours}
                              onChange={(e) =>
                                setCustomHours(e.target.value.slice(0, 2))
                              }
                            />{" "}
                            <span style={{ fontSize: 12, color: "#6b7280" }}>
                              (0–8)
                            </span>
                          </div>
                          <div>
                            <input
                              type="number"
                              min={0}
                              max={59}
                              className="input"
                              style={{ width: 80 }}
                              placeholder="Minutes"
                              value={customMinutes}
                              onChange={(e) =>
                                setCustomMinutes(e.target.value.slice(0, 2))
                              }
                            />{" "}
                            <span style={{ fontSize: 12, color: "#6b7280" }}>
                              (0–59)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <button
                        className="btn"
                        onClick={handleSaveDuration}
                        disabled={savingDuration}
                      >
                        {savingDuration ? "Saving…" : "Save Duration"}
                      </button>
                      {batch?.time_of_training && (
                        <span
                          style={{
                            marginLeft: 10,
                            fontSize: 13,
                            color: "#6b7280",
                          }}
                        >
                          Current:{" "}
                          <strong>{batch.time_of_training || "Not set"}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attendance Manager entry */}
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: "1px solid #e5e7eb",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      className="btn btn-primary"
                      onClick={handleOpenAttendanceManager}
                      disabled={openingManager}
                    >
                      {openingManager
                        ? "Opening…"
                        : "Open Batch Attendance Manager"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
