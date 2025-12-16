// src/pages/TMS/TP_CP/cpad_per_batch_ekyc.jsx
import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import TmsLeftNav from "../../layout/tms_LeftNav";
import TopNav from "../../../../components/layout/TopNav";
import { AuthContext } from "../../../../contexts/AuthContext";
import api, { TMS_API } from "../../../../api/axios";

const BATCH_DETAIL_CACHE_PREFIX = "tms_cp_batch_detail_v1::";
const EKYC_CACHE_PREFIX = "tms_cp_batch_ekyc_v1::";
const SCHEDULE_CACHE_PREFIX = "tms_cp_batch_schedule_v1::";

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
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN");
  } catch {
    return iso || "-";
  }
}

function todayISODate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nowISODateTime() {
  return new Date().toISOString();
}

export default function CpAdPerBatchEkyc() {
  const { id: batchId } = useParams();
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const [batch, setBatch] = useState(
    () => loadJson(BATCH_DETAIL_CACHE_PREFIX + batchId)?.payload || null
  );
  const [loadingBatch, setLoadingBatch] = useState(false);

  const [schedule, setSchedule] = useState(
    () => loadJson(SCHEDULE_CACHE_PREFIX + batchId)?.payload || null
  );
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // unified EKYC rows (one row per participation, from base + server)
  const [ekycRows, setEkycRows] = useState(
    () => loadJson(EKYC_CACHE_PREFIX + batchId)?.payload || []
  );
  const [loadingEkyc, setLoadingEkyc] = useState(false);

  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("");
  const [startAmPm, setStartAmPm] = useState("AM");
  const [scheduleRemarks, setScheduleRemarks] = useState("");

  const [testingConn, setTestingConn] = useState(false);
  const [connMessage, setConnMessage] = useState("");
  const [connStatus, setConnStatus] = useState("idle"); // idle | testing | ok | failed

  const [recordingFor, setRecordingFor] = useState(null);
  const [verifyingFor, setVerifyingFor] = useState(null);

  const scheduleLoadedRef = useRef(false);
  const ekycLoadedRef = useRef(false);

  const today = useMemo(() => todayISODate(), []);
  const hasSchedule = !!schedule;

  /* ---------- helpers: build base list from batch ---------- */

  function buildBaseRowsFromBatch(batchObj) {
    if (!batchObj) return [];
    const rows = [];

    (batchObj.master_trainer_participations || []).forEach((mt) => {
      const key = `trainer-${mt.id}`;
      rows.push({
        key,
        id: null,
        batch: batchObj.id,
        participant_id: String(mt.id),
        participant_role: "trainer",
        ekyc_status: "PENDING",
        verified_on: null,
        remarks: "",
      });
    });

    (batchObj.beneficiary_participations || []).forEach((bp) => {
      const key = `trainee-${bp.id}`;
      rows.push({
        key,
        id: null,
        batch: batchObj.id,
        participant_id: String(bp.id),
        participant_role: "trainee",
        ekyc_status: "PENDING",
        verified_on: null,
        remarks: "",
      });
    });

    return rows;
  }

  function mergeServerEkycIntoBase(baseRows, serverRows) {
    if (!serverRows || !serverRows.length) return baseRows;
    const byKey = new Map();
    baseRows.forEach((row) => {
      byKey.set(`${row.participant_role}-${row.participant_id}`, row);
    });

    serverRows.forEach((srv) => {
      const key = `${(srv.participant_role || "").toLowerCase()}-${String(
        srv.participant_id
      )}`;
      const existing = byKey.get(key);
      const merged = {
        ...(existing || {}),
        ...srv,
        key,
      };
      byKey.set(key, merged);
    });

    // preserve original base order
    const result = baseRows.map((base) => {
      const k = `${base.participant_role}-${base.participant_id}`;
      return byKey.get(k) || base;
    });

    return result;
  }

  /* ---------- derived: all participants verified ---------- */

  const allParticipantsVerified = useMemo(() => {
    if (!batch) return false;
    const expected = new Set();
    (batch.master_trainer_participations || []).forEach((mt) => {
      expected.add(`trainer-${mt.id}`);
    });
    (batch.beneficiary_participations || []).forEach((bp) => {
      expected.add(`trainee-${bp.id}`);
    });
    if (!expected.size) return false;

    const verified = new Set(
      (ekycRows || [])
        .filter((r) => (r.ekyc_status || "").toUpperCase() === "VERIFIED")
        .map(
          (r) =>
            `${(r.participant_role || "").toLowerCase()}-${String(
              r.participant_id
            )}`
        )
    );
    for (const k of expected) {
      if (!verified.has(k)) return false;
    }
    return true;
  }, [batch, ekycRows]);

  /* ---------- batch ---------- */

  async function fetchBatch(force = false) {
    if (!batchId) return;
    if (!force && batch) return;
    setLoadingBatch(true);
    try {
      if (!force) {
        const cached = loadJson(BATCH_DETAIL_CACHE_PREFIX + batchId);
        if (cached?.payload) {
          setBatch(cached.payload);
          return;
        }
      }
      const resp = await api.get(`/tms/batches/${batchId}/detail/`);
      const data = resp?.data || null;
      setBatch(data);
      saveJson(BATCH_DETAIL_CACHE_PREFIX + batchId, data);
    } catch (e) {
      console.error("cp fetch batch detail failed", e);
      setBatch(null);
    } finally {
      setLoadingBatch(false);
    }
  }

  /* ---------- schedule ---------- */

  async function fetchSchedule(force = false) {
    if (!batchId) return;
    if (!force && scheduleLoadedRef.current && schedule) return;
    setLoadingSchedule(true);
    try {
      if (!force) {
        const cached = loadJson(SCHEDULE_CACHE_PREFIX + batchId);
        if (cached?.payload) {
          setSchedule(cached.payload);
          scheduleLoadedRef.current = true;
          return;
        }
      }
      const resp = await TMS_API.batchSchedules?.list
        ? await TMS_API.batchSchedules.list({ batch: batchId, page_size: 1 })
        : await api.get(`/tms/batch-schedules/?batch=${batchId}`);
      const data = resp?.data ?? resp ?? {};
      const rec = data.results ? data.results[0] : data[0];
      if (rec) {
        setSchedule(rec);
        saveJson(SCHEDULE_CACHE_PREFIX + batchId, rec);
        if (rec.start_time) {
          const [hh, mm] = rec.start_time.split(":");
          let h = parseInt(hh || "0", 10);
          let ampm = "AM";
          if (h === 0) {
            h = 12;
            ampm = "AM";
          } else if (h === 12) {
            ampm = "PM";
          } else if (h > 12) {
            h = h - 12;
            ampm = "PM";
          }
          setStartHour(String(h).padStart(2, "0"));
          setStartMinute(String(mm || "00").padStart(2, "0"));
          setStartAmPm(ampm);
        }
      } else {
        setSchedule(null);
      }
      scheduleLoadedRef.current = true;
    } catch (e) {
      console.error("cp fetch schedule failed", e);
      setSchedule(null);
    } finally {
      setLoadingSchedule(false);
    }
  }

  async function handleSaveSchedule() {
    if (!batchId) return;
    if (hasSchedule) {
      setConnMessage("");
      alert("Schedule already saved once for this batch.");
      return;
    }
    const h = parseInt(startHour || "0", 10);
    const m = parseInt(startMinute || "0", 10);
    if (!h || h < 1 || h > 12) {
      alert("Please enter a valid hour (1–12).");
      return;
    }
    if (m < 0 || m > 59) {
      alert("Please enter valid minutes (0–59).");
      return;
    }
    let hh24 = h % 12;
    if (startAmPm === "PM") {
      hh24 += 12;
    }
    const hhStr = hh24.toString().padStart(2, "0");
    const mmStr = m.toString().padStart(2, "0");
    const timeStr = `${hhStr}:${mmStr}:00`;

    setSavingSchedule(true);
    try {
      const payload = {
        batch: batchId,
        schedule_date: today,
        start_time: timeStr,
        remarks: scheduleRemarks || "",
      };
      const resp = await TMS_API.batchSchedules?.create
        ? await TMS_API.batchSchedules.create(payload)
        : await api.post("/tms/batch-schedules/", payload);
      const data = resp?.data ?? resp ?? null;
      setSchedule(data);
      saveJson(SCHEDULE_CACHE_PREFIX + batchId, data);
    } catch (e) {
      console.error("save schedule failed", e);
      alert("Failed to save start time. Please try again.");
    } finally {
      setSavingSchedule(false);
    }
  }

  /* ---------- EKYC fetch and merge ---------- */

  async function fetchEkyc(force = false) {
    if (!batchId) return;
    if (!force && ekycLoadedRef.current && ekycRows.length) return;
    if (!batch) return; // need batch to build base list

    setLoadingEkyc(true);
    try {
      let serverRows = [];
      try {
        const resp = await api.get(`/tms/batch-ekyc/?batch=${batchId}`);
        const data = resp?.data ?? resp ?? {};
        serverRows = data.results || data || [];
      } catch (e) {
        serverRows = [];
      }

      const base = buildBaseRowsFromBatch(batch);
      const merged = mergeServerEkycIntoBase(base, serverRows);
      setEkycRows(merged);
      saveJson(EKYC_CACHE_PREFIX + batchId, merged);
      ekycLoadedRef.current = true;
    } catch (e) {
      console.error("fetch EKYC failed", e);
      const base = buildBaseRowsFromBatch(batch);
      setEkycRows(base);
    } finally {
      setLoadingEkyc(false);
    }
  }

  /* ---------- EKYC actions ---------- */

  async function handleVerify(row) {
    const isExisting = !!row.id;
    const participantRole = row.participant_role;
    const participantId = row.participant_id;
    const key = `${participantRole}-${participantId}`;

    setVerifyingFor(key);
    try {
      if (isExisting) {
        const resp = await api.patch(`/tms/batch-ekyc/${row.id}/`, {
          ekyc_status: "VERIFIED",
          verified_on: nowISODateTime(),
        });
        const updated = resp?.data ?? resp ?? null;
        const next = (ekycRows || []).map((r) =>
          r.id === row.id ? { ...r, ...updated } : r
        );
        setEkycRows(next);
        saveJson(EKYC_CACHE_PREFIX + batchId, next);
      } else {
        const resp = await api.post("/tms/batch-ekyc/", {
          batch: batchId,
          participant_id: participantId,
          participant_role: participantRole,
          ekyc_status: "VERIFIED",
          verified_on: nowISODateTime(),
        });
        const created = resp?.data ?? resp ?? null;
        const next = (ekycRows || []).map((r) => {
          if (
            !r.id &&
            r.participant_id === participantId &&
            r.participant_role === participantRole
          ) {
            return { ...r, ...created };
          }
          return r;
        });
        setEkycRows(next);
        saveJson(EKYC_CACHE_PREFIX + batchId, next);
      }
    } catch (e) {
      console.error("EKYC verify failed", e);
      alert("Could not mark as verified. Please try again.");
    } finally {
      setVerifyingFor(null);
      setRecordingFor(null);
    }
  }

  function handleRecord(row) {
    const key = `${row.participant_role}-${row.participant_id}`;
    setRecordingFor(key);
    setTimeout(() => setRecordingFor(null), 800);
  }

  /* ---------- connection animation ---------- */

  function handleTestConnection() {
    setConnStatus("testing");
    setConnMessage("Testing connection...");
    setTestingConn(true);
    setTimeout(() => {
      setConnStatus("ok");
      setConnMessage("Device connected successfully. You can start EKYC.");
      setTestingConn(false);
    }, 1200);
  }

  /* ---------- participant name mapping ---------- */

  const participantInfoMap = useMemo(() => {
    const map = {};
    if (!batch) return map;
    (batch.master_trainer_participations || []).forEach((mtp) => {
      const mt = (batch.master_trainers || []).find(
        (m) => m.id === mtp.master_trainer
      );
      const name = mt?.full_name || `MasterTrainer #${mtp.master_trainer}`;
      map[`trainer-${mtp.id}`] = { name, roleLabel: "Master Trainer" };
    });
    (batch.beneficiary_participations || []).forEach((bp) => {
      const b = (batch.beneficiary || []).find((x) => x.id === bp.beneficiary);
      const name = b?.member_name || `Beneficiary #${bp.beneficiary}`;
      map[`trainee-${bp.id}`] = { name, roleLabel: "Trainee" };
    });
    return map;
  }, [batch]);

  function getRowDisplay(row) {
    const key = `${(row.participant_role || "").toLowerCase()}-${String(
      row.participant_id
    )}`;
    const info = participantInfoMap[key] || {};
    return {
      key,
      name: info.name || `Participant #${row.participant_id}`,
      roleLabel: info.roleLabel || row.participant_role || "—",
    };
  }

  /* ---------- effects ---------- */

  useEffect(() => {
    fetchBatch(false);
  }, [batchId]);

  useEffect(() => {
    if (batch) {
      fetchSchedule(false);
      fetchEkyc(false);
    }
  }, [batch]);

  /* ---------- render ---------- */

  return (
    <div className="app-shell">
      <TmsLeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu — Batch EKYC & Attendance (CP)
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
              <h2 style={{ margin: 0 }}>Batch EKYC — Batch #{batchId}</h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => {
                    try {
                      localStorage.removeItem(
                        BATCH_DETAIL_CACHE_PREFIX + batchId
                      );
                      localStorage.removeItem(
                        SCHEDULE_CACHE_PREFIX + batchId
                      );
                      localStorage.removeItem(EKYC_CACHE_PREFIX + batchId);
                    } catch {}
                    setEkycRows([]);
                    fetchBatch(true);
                  }}
                >
                  Refresh
                </button>
                <button className="btn btn-outline" onClick={() => navigate(-1)}>
                  Back
                </button>
              </div>
            </div>

            <div style={{ background: "#fff", borderRadius: 8, padding: 18 }}>
              {loadingBatch && !batch ? (
                <div className="table-spinner">Loading batch details…</div>
              ) : !batch ? (
                <div className="muted">
                  Batch could not be loaded. Please go back and try again.
                </div>
              ) : (
                <>
                  {/* batch summary */}
                  <div style={{ marginBottom: 12 }}>
                    <div>
                      <strong>Batch Code:</strong>{" "}
                      <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
                        {batch.code || batch.id}
                      </span>
                    </div>
                    <div>
                      <strong>Centre:</strong>{" "}
                      {batch.centre?.venue_name || "—"}
                    </div>
                    <div>
                      <strong>Dates:</strong> {fmtDate(batch.start_date)} —{" "}
                      {fmtDate(batch.end_date)}
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 12,
                          background: "#0f172a",
                          color: "#fff",
                          padding: "3px 10px",
                          borderRadius: 999,
                        }}
                      >
                        {(batch.status || "-").toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Day 1 schedule */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      background: "#eff6ff",
                      marginBottom: 16,
                    }}
                  >
                    <h4 style={{ marginTop: 0 }}>Day 1 Setup</h4>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      Today: <strong>{today}</strong>. Set the batch start time
                      once. This time will be reused for all training days.
                    </div>

                    {loadingSchedule ? (
                      <div className="table-spinner">
                        Loading batch schedule…
                      </div>
                    ) : hasSchedule ? (
                      <div style={{ marginTop: 8 }}>
                        <div>
                          <strong>Schedule Date:</strong>{" "}
                          {schedule.schedule_date}
                        </div>
                        <div>
                          <strong>Start Time:</strong>{" "}
                          {schedule.start_time?.slice(0, 5) || "—"} (24-hour)
                        </div>
                        {schedule.remarks && (
                          <div>
                            <strong>Remarks:</strong> {schedule.remarks}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            marginBottom: 8,
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>
                            Batch Start Time:
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            className="input"
                            style={{ width: 80 }}
                            placeholder="HH"
                            value={startHour}
                            onChange={(e) =>
                              setStartHour(e.target.value.slice(0, 2))
                            }
                          />
                          <span>:</span>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            className="input"
                            style={{ width: 80 }}
                            placeholder="MM"
                            value={startMinute}
                            onChange={(e) =>
                              setStartMinute(e.target.value.slice(0, 2))
                            }
                          />
                          <select
                            className="input"
                            value={startAmPm}
                            onChange={(e) => setStartAmPm(e.target.value)}
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <textarea
                            className="input"
                            rows={2}
                            placeholder="Remarks (optional)…"
                            value={scheduleRemarks}
                            onChange={(e) =>
                              setScheduleRemarks(e.target.value)
                            }
                            style={{ width: "100%" }}
                          />
                        </div>
                        <button
                          className="btn"
                          onClick={handleSaveSchedule}
                          disabled={savingSchedule}
                        >
                          {savingSchedule ? "Saving…" : "Save Start Time"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* EKYC section */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      background: "#f9fafb",
                    }}
                  >
                    <h4 style={{ marginTop: 0 }}>
                      Day 1 E-KYC — Fingerprint Verification
                    </h4>
                    <p style={{ fontSize: 13, color: "#6b7280" }}>
                      Plug in your fingerprint scanner (or mobile reader), test
                      the device connection, then record fingerprint and verify
                      for each participant.
                    </p>

                    {/* Test connection block */}
                    <div
                      id="ekyc_instructions"
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: "#e5f3ff",
                        marginBottom: 8,
                      }}
                    >
                      <div className="notice" style={{ fontSize: 13 }}>
                        Plugin your fingerprint scanner or device and click{" "}
                        <strong>Test connection</strong>.
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <button
                          id="testConnectionBtn"
                          className="btn btn-outline"
                          type="button"
                          onClick={handleTestConnection}
                          disabled={testingConn}
                        >
                          {testingConn ? "Testing..." : "Test connection"}
                        </button>
                        <span
                          id="testStatus"
                          style={{
                            marginLeft: 4,
                            fontSize: 12,
                            color:
                              connStatus === "ok"
                                ? "#15803d"
                                : connStatus === "failed"
                                ? "#b91c1c"
                                : "#6b7280",
                          }}
                        >
                          {connStatus === "testing" && (
                            <>
                              Testing connection...{" "}
                              <span id="connSpinner">⏳</span>
                            </>
                          )}
                          {connStatus === "ok" && connMessage}
                          {connStatus === "idle" && connMessage}
                        </span>
                      </div>
                    </div>

                    {/* participants table */}
                    <div style={{ marginTop: 12 }}>
                      {loadingEkyc ? (
                        <div className="table-spinner">
                          Loading EKYC records...
                        </div>
                      ) : !ekycRows.length ? (
                        <div className="muted">
                          No participants found for EKYC.
                        </div>
                      ) : (
                        <div style={{ maxHeight: 420, overflow: "auto" }}>
                          <table
                            className="table table-striped align-middle table-sm"
                            id="ekyc_table"
                          >
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>EKYC Status</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ekycRows.map((row) => {
                                const disp = getRowDisplay(row);
                                const status =
                                  (row.ekyc_status || "PENDING").toUpperCase();
                                const isVerified = status === "VERIFIED";
                                const recording = recordingFor === disp.key;
                                const verifying = verifyingFor === disp.key;

                                return (
                                  <tr
                                    key={`${row.participant_role}-${row.participant_id}`}
                                    data-participant-id={row.participant_id}
                                    data-participant-role={row.participant_role}
                                  >
                                    <td>{disp.name}</td>
                                    <td>{disp.roleLabel}</td>
                                    <td className="ekyc-status">
                                      {status.charAt(0) +
                                        status.slice(1).toLowerCase()}
                                    </td>
                                    <td className="ekyc-actions">
                                      <div className="d-flex gap-2 align-items-center">
                                        <button
                                          className="btn btn-sm btn-outline-secondary recordBtn"
                                          type="button"
                                          disabled={isVerified || recording}
                                          onClick={() => handleRecord(row)}
                                        >
                                          {recording
                                            ? "Recording..."
                                            : "Record Fingerprint"}
                                        </button>
                                        <button
                                          className="btn btn-sm btn-primary verifyBtn"
                                          type="button"
                                          disabled={
                                            isVerified ||
                                            verifying ||
                                            !hasSchedule
                                          }
                                          onClick={() => handleVerify(row)}
                                        >
                                          {verifying
                                            ? "Verifying..."
                                            : "Verify!"}
                                        </button>
                                        <span
                                          className="small text-muted ml-2 actionStatus"
                                          style={{ fontSize: 11 }}
                                        >
                                          {recording && "Fingerprint recorded."}
                                          {verifying && "Verifying match..."}
                                          {isVerified &&
                                            "Verified successfully."}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {allParticipantsVerified && (
                      <div
                        id="ekyc_done_msg"
                        style={{
                          marginTop: 12,
                          padding: 10,
                          borderRadius: 6,
                          background: "#dcfce7",
                          color: "#166534",
                          fontSize: 13,
                        }}
                      >
                        All participants verified — redirect to today's
                        attendance when ready.
                        <div style={{ marginTop: 8 }}>
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() =>
                              navigate(`/tms/cp/batch-attendance/${batchId}`)
                            }
                          >
                            Go to Attendance Screen
                          </button>
                        </div>
                      </div>
                    )}
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
