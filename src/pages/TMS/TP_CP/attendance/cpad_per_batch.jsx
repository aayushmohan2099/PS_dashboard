// src/pages/TMS/TP_CP/cpad_per_batch.jsx
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
const SCHEDULE_CACHE_PREFIX = "tms_cp_batch_schedule_v1::";
const EKYC_CACHE_PREFIX = "tms_cp_batch_ekyc_v1::";
const ATT_TODAY_CACHE_PREFIX = "tms_cp_batch_att_today_v1::";

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

// get YYYY-MM-DD using local time (not UTC)
function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN");
  } catch {
    return iso || "-";
  }
}

function parseHHMM(timeStr) {
  if (!timeStr) return { h: 0, m: 0 };
  const [h, m] = timeStr.split(":");
  return { h: parseInt(h || "0", 10), m: parseInt(m || "0", 10) };
}

// compute day's start datetime in local time, assuming same start_time every day
function computeDayStart(schedule, dateStr) {
  if (!schedule?.start_time) return null;
  const { h, m } = parseHHMM(schedule.start_time);
  const d = new Date(dateStr + "T00:00:00");
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0);
}

function addDaysISO(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CpAdPerBatch() {
  const { id: batchId } = useParams();
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const [batch, setBatch] = useState(
    () => loadJson(BATCH_DETAIL_CACHE_PREFIX + batchId)?.payload || null
  );
  const [schedule, setSchedule] = useState(
    () => loadJson(SCHEDULE_CACHE_PREFIX + batchId)?.payload || null
  );
  const [ekyc, setEkyc] = useState(
    () => loadJson(EKYC_CACHE_PREFIX + batchId)?.payload || []
  );

  const [loadingBatch, setLoadingBatch] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingEkyc, setLoadingEkyc] = useState(false);

  const [attendanceToday, setAttendanceToday] = useState(
    () => loadJson(ATT_TODAY_CACHE_PREFIX + batchId)?.payload || null
  );
  const [loadingAttendanceToday, setLoadingAttendanceToday] = useState(false);

  const [attendanceList, setAttendanceList] = useState([]); // all days
  const [loadingAttendanceList, setLoadingAttendanceList] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateRecords, setSelectedDateRecords] = useState([]);
  const [loadingSelectedRecords, setLoadingSelectedRecords] = useState(false);

  const [savingAttendance, setSavingAttendance] = useState(false);
  const [participantPresence, setParticipantPresence] = useState({});
  const [csvFile, setCsvFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("Submitting attendance…");

  const [missingDates, setMissingDates] = useState([]); // list of YYYY-MM-DD needing auto-absent
  const today = useMemo(() => todayLocalISO(), []);
  const timeCheckIntervalRef = useRef(null);

  const currentUserId = user?.id || user?.pk || null;

  /* ---------------- load batch + schedule + ekyc ---------------- */

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
      console.error("attendance fetch batch failed", e);
      setBatch(null);
    } finally {
      setLoadingBatch(false);
    }
  }

  async function fetchSchedule(force = false) {
    if (!batchId) return;
    if (!force && schedule) return;
    setLoadingSchedule(true);
    try {
      if (!force) {
        const cached = loadJson(SCHEDULE_CACHE_PREFIX + batchId);
        if (cached?.payload) {
          setSchedule(cached.payload);
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
      } else {
        setSchedule(null);
      }
    } catch (e) {
      console.error("attendance fetch schedule failed", e);
      setSchedule(null);
    } finally {
      setLoadingSchedule(false);
    }
  }

  async function fetchEkyc(force = false) {
    if (!batchId) return;
    if (!force && ekyc && ekyc.length) return;
    setLoadingEkyc(true);
    try {
      if (!force) {
        const cached = loadJson(EKYC_CACHE_PREFIX + batchId);
        if (cached?.payload) {
          setEkyc(cached.payload);
          return;
        }
      }
      const resp = await api.get(`/tms/batch-ekyc/?batch=${batchId}`);
      const data = resp?.data ?? resp ?? {};
      const results = data.results || data || [];
      setEkyc(results);
      saveJson(EKYC_CACHE_PREFIX + batchId, results);
    } catch (e) {
      console.error("attendance fetch ekyc failed", e);
      setEkyc([]);
    } finally {
      setLoadingEkyc(false);
    }
  }

  useEffect(() => {
    fetchBatch(false);
    fetchSchedule(false);
    fetchEkyc(false);
  }, [batchId]);

  const allEkycVerified = useMemo(() => {
    if (!batch) return false;
    const expectedIds = new Set();
    (batch.master_trainer_participations || []).forEach((mt) => {
      expectedIds.add(`trainer-${mt.id}`);
    });
    (batch.beneficiary_participations || []).forEach((bp) => {
      expectedIds.add(`trainee-${bp.id}`);
    });
    if (expectedIds.size === 0) return false;
    const verifiedIds = new Set(
      (ekyc || [])
        .filter((r) => (r.ekyc_status || "").toUpperCase() === "VERIFIED")
        .map(
          (r) =>
            `${(r.participant_role || "").toLowerCase()}-${String(
              r.participant_id
            )}`
        )
    );
    for (const k of expectedIds) {
      if (!verifiedIds.has(k)) return false;
    }
    return true;
  }, [batch, ekyc]);

  /* ---------------- attendance: today's record ---------------- */

  async function fetchAttendanceToday(force = false) {
    if (!batchId) return;
    if (!force && attendanceToday && attendanceToday.id) return;
    setLoadingAttendanceToday(true);
    try {
      const resp = await api.get(
        `/tms/batch-attendance/?batch=${batchId}&date=${today}`
      );
      const data = resp?.data ?? resp ?? {};
      const rec = (data.results || data || [])[0] || null;
      setAttendanceToday(rec);
      saveJson(ATT_TODAY_CACHE_PREFIX + batchId, rec);
    } catch (e) {
      console.error("fetch today attendance failed", e);
      setAttendanceToday(null);
    } finally {
      setLoadingAttendanceToday(false);
    }
  }

  useEffect(() => {
    fetchAttendanceToday(false);
  }, [batchId, today]);

  /* ---------------- attendance: all days list + selected day ---------------- */

  async function fetchAttendanceList() {
    if (!batchId) return;
    setLoadingAttendanceList(true);
    try {
      const resp = await api.get(`/tms/batch-attendance/?batch=${batchId}`);
      const data = resp?.data ?? resp ?? {};
      const results = data.results || data || [];
      setAttendanceList(results);
    } catch (e) {
      console.error("fetch attendance list failed", e);
      setAttendanceList([]);
    } finally {
      setLoadingAttendanceList(false);
    }
  }

  async function fetchParticipantRecordsForDate(dateStr) {
    if (!batchId || !dateStr) return;
    setLoadingSelectedRecords(true);
    setSelectedDate(dateStr);
    setSelectedDateRecords([]);
    try {
      const resp = await api.get(
        `/tms/batch-attendance/?batch=${batchId}&date=${dateStr}`
      );
      const data = resp?.data ?? resp ?? {};
      const attendance = (data.results || data || [])[0];
      if (!attendance?.id) {
        setSelectedDateRecords([]);
        return;
      }
      const recResp = await api.get(
        `/tms/participant-attendance/?attendance=${attendance.id}`
      );
      const recData = recResp?.data ?? recResp ?? {};
      const recs = recData.results || recData || [];
      setSelectedDateRecords(recs);
    } catch (e) {
      console.error("fetch participant-attendance failed", e);
      setSelectedDateRecords([]);
    } finally {
      setLoadingSelectedRecords(false);
    }
  }

  useEffect(() => {
    if (attendanceToday !== undefined) {
      fetchAttendanceList();
    }
  }, [attendanceToday?.id]);

  /* ---------------- participants for attendance ---------------- */

  const participants = useMemo(() => {
    if (!batch) return [];
    const rows = [];
    (batch.master_trainer_participations || []).forEach((mtp) => {
      const mt = (batch.master_trainers || []).find(
        (m) => m.id === mtp.master_trainer
      );
      rows.push({
        key: `trainer-${mtp.id}`,
        participant_id: String(mtp.id),
        participant_role: "trainer",
        name: mt?.full_name || `MasterTrainer #${mtp.master_trainer}`,
      });
    });
    (batch.beneficiary_participations || []).forEach((bp) => {
      const b = (batch.beneficiary || []).find((x) => x.id === bp.beneficiary);
      rows.push({
        key: `trainee-${bp.id}`,
        participant_id: String(bp.id),
        participant_role: "trainee",
        name: b?.member_name || `Beneficiary #${bp.beneficiary}`,
      });
    });
    return rows;
  }, [batch]);

  /* ---------------- compute missing dates from start_date to yesterday ---------------- */

  useEffect(() => {
    if (!batch || !batch.start_date) return;
    const startDate = batch.start_date; // YYYY-MM-DD
    const endLimit =
      batch.end_date && batch.end_date < today ? batch.end_date : today;
    const yesterday = addDaysISO(today, -1);
    const stop = yesterday < endLimit ? yesterday : endLimit;

    if (startDate > stop) {
      setMissingDates([]);
      return;
    }

    const recorded = new Set(
      (attendanceList || [])
        .map((a) => a.date)
        .filter((d) => d && d >= startDate && d <= stop)
    );

    const toMark = [];
    let cursor = startDate;
    while (cursor <= stop) {
      if (!recorded.has(cursor)) {
        toMark.push(cursor);
      }
      cursor = addDaysISO(cursor, 1);
    }
    setMissingDates(toMark);
  }, [batch, attendanceList, today]);

  /* ---------------- helpers: get or create BatchAttendance & missing participants ---------------- */

  async function getOrCreateBatchAttendanceForDate(dateStr, { allowCreate = true } = {}) {
    // 1) Try GET
    try {
      const resp = await api.get(
        `/tms/batch-attendance/?batch=${batchId}&date=${dateStr}`
      );
      const data = resp?.data ?? resp ?? {};
      const rec = (data.results || data || [])[0] || null;
      if (rec && rec.id) {
        return rec;
      }
    } catch (e) {
      console.error("GET batch-attendance failed for", dateStr, e);
    }

    if (!allowCreate) {
      return null;
    }

    // 2) Try POST with created_by and is_active
    try {
      const formData = new FormData();
      formData.append("batch", batchId);
      formData.append("date", dateStr);
      formData.append("is_active", "true");
      if (currentUserId != null) {
        formData.append("created_by", String(currentUserId));
      }
      const postResp = await api.post("/tms/batch-attendance/", formData);
      const rec = postResp?.data ?? postResp ?? null;
      return rec;
    } catch (e) {
      const nonFieldErrors = e?.response?.data?.non_field_errors || [];
      const isUniqueError = nonFieldErrors.some((msg) =>
        String(msg).includes("batch, date must make a unique set")
      );
      if (isUniqueError) {
        // re-GET in case of soft-deleted / concurrent create
        try {
          const resp2 = await api.get(
            `/tms/batch-attendance/?batch=${batchId}&date=${dateStr}`
          );
          const data2 = resp2?.data ?? resp2 ?? {};
          const rec2 = (data2.results || data2 || [])[0] || null;
          if (rec2 && rec2.id) {
            return rec2;
          }
        } catch (e2) {
          console.error("Re-GET after unique error failed for", dateStr, e2);
        }
      }
      throw e;
    }
  }

  async function getExistingParticipantAttendanceIds(attendanceId) {
    const resp = await api.get(
      `/tms/participant-attendance/?attendance=${attendanceId}`
    );
    const data = resp?.data ?? resp ?? {};
    const recs = data.results || data || [];
    const keys = new Set(
      recs.map(
        (r) =>
          `${(r.participant_role || "").toLowerCase()}-${String(
            r.participant_id
          )}`
      )
    );
    return keys;
  }

  /* ---------------- bulk mark all absent for all missing dates ---------------- */

  async function autoMarkAllMissingAbsent() {
    if (!batchId || !missingDates.length) return;
    if (!participants.length) {
      alert("No participants configured for this batch.");
      return;
    }
    setSubmitting(true);
    setSubmitMessage("Submitting attendance for past days…");
    try {
      for (const dateStr of missingDates) {
        const attRec = await getOrCreateBatchAttendanceForDate(dateStr, {
          allowCreate: true,
        });
        if (!attRec?.id) {
          console.warn("No attendance id for", dateStr, "skipping.");
          continue;
        }

        const existingKeys = await getExistingParticipantAttendanceIds(
          attRec.id
        );

        for (const p of participants) {
          const key = `${p.participant_role}-${p.participant_id}`;
          if (existingKeys.has(key)) continue;
          await api.post("/tms/participant-attendance/", {
            attendance: attRec.id,
            participant_id: p.participant_id,
            participant_name: p.name,
            participant_role: p.participant_role,
            present: false,
            is_active: true,
            created_by: currentUserId,
          });
        }
      }
      await fetchAttendanceList();
      setMissingDates([]);
      alert("All pending past days marked absent successfully.");
    } catch (e) {
      console.error("bulk auto mark absent failed", e);
      alert("Failed to auto-mark some days as absent. Please try again.");
    } finally {
      setSubmitting(false);
      setSubmitMessage("Submitting attendance…");
    }
  }

  /* ---------------- time window for enabling today's attendance ---------------- */

  const canShowAttendanceForm = useMemo(() => {
    if (!batch || !schedule) return false;
    if (!allEkycVerified) return false;
    if (attendanceToday && attendanceToday.id) return false;
    if (missingDates.length) return false; // must close all past days first

    const start = computeDayStart(schedule, today);
    if (!start) return false;
    const now = new Date();
    return now >= start;
  }, [batch, schedule, allEkycVerified, attendanceToday, today, missingDates.length]);

  // keep polling time until start time passes (for today's session)
  useEffect(() => {
    if (attendanceToday && attendanceToday.id) {
      if (timeCheckIntervalRef.current) {
        clearInterval(timeCheckIntervalRef.current);
        timeCheckIntervalRef.current = null;
      }
      return;
    }
    if (!schedule || !batch || !allEkycVerified || missingDates.length) return;
    const start = computeDayStart(schedule, today);
    if (!start) return;

    function checkTime() {
      const now = new Date();
      if (now >= start) {
        if (timeCheckIntervalRef.current) {
          clearInterval(timeCheckIntervalRef.current);
          timeCheckIntervalRef.current = null;
        }
      }
    }

    checkTime();
    if (!timeCheckIntervalRef.current) {
      timeCheckIntervalRef.current = setInterval(checkTime, 30000);
    }

    return () => {
      if (timeCheckIntervalRef.current) {
        clearInterval(timeCheckIntervalRef.current);
        timeCheckIntervalRef.current = null;
      }
    };
  }, [schedule, batch, allEkycVerified, attendanceToday?.id, today, missingDates.length]);

  /* ---------------- submit today's attendance ---------------- */

  async function handleSubmitAttendance(e) {
    e.preventDefault();
    if (!batchId) return;
    if (!allEkycVerified) {
      alert("EKYC is not complete. Please verify all participants first.");
      return;
    }
    if (missingDates.length) {
      alert(
        "Please close all previous days' attendance (mark all absent) before taking today's attendance."
      );
      return;
    }
    if (!canShowAttendanceForm) {
      alert("Attendance window has not started yet.");
      return;
    }

    if (!participants.length) {
      alert("No participants configured for this batch.");
      return;
    }

    setSubmitting(true);
    setSubmitMessage("Submitting attendance for today…");
    setSavingAttendance(true);
    try {
      // get or create BatchAttendance for today
      let rec = await getOrCreateBatchAttendanceForDate(today, {
        allowCreate: true,
      });

      // if CSV provided and record exists, PATCH CSV
      if (csvFile && rec?.id) {
        const patchForm = new FormData();
        patchForm.append("csv_upload", csvFile);
        const patchResp = await api.patch(
          `/tms/batch-attendance/${rec.id}/`,
          patchForm
        );
        rec = patchResp?.data ?? patchResp ?? rec;
      }

      setAttendanceToday(rec);
      saveJson(ATT_TODAY_CACHE_PREFIX + batchId, rec);

      if (!rec?.id) {
        alert("Cannot create participant attendance without record id.");
        return;
      }

      const existingKeys = await getExistingParticipantAttendanceIds(rec.id);

      for (const p of participants) {
        const key = `${p.participant_role}-${p.participant_id}`;
        const present = !!participantPresence[p.key];
        if (existingKeys.has(key)) {
          // optionally PATCH existing records; skipping here
          continue;
        }
        await api.post("/tms/participant-attendance/", {
          attendance: rec.id,
          participant_id: p.participant_id,
          participant_name: p.name,
          participant_role: p.participant_role,
          present,
          is_active: true,
          created_by: currentUserId,
        });
      }

      alert("Today's attendance recorded successfully.");
      fetchAttendanceList();
    } catch (e) {
      console.error("attendance submit failed", e);
      alert("Failed to record attendance. Please try again.");
    } finally {
      setSavingAttendance(false);
      setSubmitting(false);
      setSubmitMessage("Submitting attendance…");
    }
  }

  const attendanceAllowed = allEkycVerified;

  return (
    <div className="app-shell">
      <TmsLeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu — Batch Attendance (CP)
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
              <h2 style={{ margin: 0 }}>Attendance — Batch #{batchId}</h2>
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
                      localStorage.removeItem(
                        ATT_TODAY_CACHE_PREFIX + batchId
                      );
                    } catch {}
                    setAttendanceToday(null);
                    setAttendanceList([]);
                    setMissingDates([]);
                    fetchBatch(true);
                    fetchSchedule(true);
                    fetchEkyc(true);
                    fetchAttendanceToday(true);
                    fetchAttendanceList();
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
                  Batch not found. Please go back and try again.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <div>
                      <strong>Batch Code:</strong>{" "}
                      <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
                        {batch.code || batch.id}
                      </span>
                    </div>
                    <div>
                      <strong>Today:</strong> {today}
                    </div>
                    <div>
                      <strong>Time of training:</strong>{" "}
                      {batch.time_of_training || "Not set"}
                    </div>
                  </div>

                  {loadingSchedule ? (
                    <div className="table-spinner">
                      Loading batch schedule…
                    </div>
                  ) : !schedule ? (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: "#fef3c7",
                        color: "#92400e",
                        fontSize: 13,
                        marginBottom: 10,
                      }}
                    >
                      No schedule found for this batch. Please set start time in
                      EKYC screen first.
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: "#eff6ff",
                        marginBottom: 10,
                        fontSize: 13,
                      }}
                    >
                      <div>
                        <strong>Schedule Date (first day):</strong>{" "}
                        {schedule.schedule_date}
                      </div>
                      <div>
                        <strong>Daily Start Time:</strong>{" "}
                        {schedule.start_time?.slice(0, 5) || "—"} (24-hour)
                      </div>
                      <div>
                        Attendance opens at the configured start time each day.
                      </div>
                    </div>
                  )}

                  {loadingEkyc ? (
                    <div className="table-spinner">
                      Checking EKYC status…
                    </div>
                  ) : !allEkycVerified ? (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        background: "#fee2e2",
                        color: "#b91c1c",
                        fontSize: 13,
                        marginBottom: 12,
                      }}
                    >
                      EKYC verification is not complete yet. Attendance cannot
                      be recorded until all participants and trainers are
                      verified. Please complete EKYC first.
                      <div style={{ marginTop: 8 }}>
                        <button
                          className="btn btn-outline"
                          onClick={() =>
                            navigate(`/tms/cp/batch-attendance-ekyc/${batchId}`)
                          }
                        >
                          Go to EKYC Screen
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Catch-up: mark all absent for ALL missing days */}
                  {attendanceAllowed &&
                    schedule &&
                    missingDates.length > 0 &&
                    !loadingAttendanceList && (
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 6,
                          background: "#fee2e2",
                          color: "#991b1b",
                          fontSize: 13,
                          marginBottom: 16,
                        }}
                      >
                        Attendance is not recorded for{" "}
                        <strong>{missingDates.length}</strong> past day
                        {missingDates.length > 1 ? "s" : ""} (from{" "}
                        {fmtDate(missingDates[0])} to{" "}
                        {fmtDate(missingDates[missingDates.length - 1])}).
                        The window has expired, so all participants must be
                        marked absent for those days.
                        <div style={{ marginTop: 8 }}>
                          <button
                            className="btn btn-danger"
                            disabled={submitting || !participants.length}
                            onClick={autoMarkAllMissingAbsent}
                          >
                            {submitting
                              ? "Submitting attendance…"
                              : "Mark all absent for missed days"}
                          </button>
                        </div>
                      </div>
                    )}

                  {/* TODAY section */}
                  {attendanceAllowed && schedule && missingDates.length === 0 && (
                    <>
                      {loadingAttendanceToday ? (
                        <div className="table-spinner">
                          Checking today's attendance…
                        </div>
                      ) : attendanceToday && attendanceToday.id ? (
                        <div
                          style={{
                            padding: 10,
                            borderRadius: 6,
                            background: "#dcfce7",
                            color: "#166534",
                            fontSize: 13,
                            marginBottom: 14,
                          }}
                        >
                          Attendance for today ({today}) has already been
                          recorded.
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 6,
                            background: "#f9fafb",
                            marginBottom: 18,
                          }}
                        >
                          <h4 style={{ marginTop: 0 }}>
                            Record Attendance for Today ({today})
                          </h4>
                          {!canShowAttendanceForm ? (
                            <div
                              style={{
                                padding: 10,
                                borderRadius: 6,
                                background: "#e5f3ff",
                                color: "#1f2937",
                                fontSize: 13,
                              }}
                            >
                              Attendance recording will be enabled when today's
                              start time is reached and EKYC is complete.
                            </div>
                          ) : (
                            <form onSubmit={handleSubmitAttendance}>
                              <div style={{ marginBottom: 12 }}>
                                <label
                                  style={{
                                    fontWeight: 600,
                                    marginBottom: 4,
                                    display: "block",
                                  }}
                                >
                                  Upload Punch Machine CSV (optional)
                                </label>
                                <input
                                  type="file"
                                  accept=".csv"
                                  onChange={(e) => {
                                    const file =
                                      e.target.files?.[0] || null;
                                    setCsvFile(file);
                                  }}
                                />
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#6b7280",
                                    marginTop: 4,
                                  }}
                                >
                                  Optional - upload one CSV file for today's
                                  punch records.
                                </div>
                              </div>

                              <h4>Participants</h4>
                              {participants.length === 0 ? (
                                <div className="muted">
                                  No participants configured for this batch.
                                </div>
                              ) : (
                                <div
                                  style={{
                                    maxHeight: 400,
                                    overflow: "auto",
                                  }}
                                >
                                  <table className="table table-compact">
                                    <thead>
                                      <tr>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Present</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {participants.map((p) => (
                                        <tr key={p.key}>
                                          <td>{p.name}</td>
                                          <td>
                                            {p.participant_role === "trainer"
                                              ? "Master Trainer"
                                              : "Trainee"}
                                          </td>
                                          <td>
                                            <input
                                              type="checkbox"
                                              checked={
                                                !!participantPresence[p.key]
                                              }
                                              onChange={(e) =>
                                                setParticipantPresence(
                                                  (prev) => ({
                                                    ...prev,
                                                    [p.key]:
                                                      e.target.checked,
                                                  })
                                                )
                                              }
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              <div
                                style={{
                                  marginTop: 12,
                                  display: "flex",
                                  justifyContent: "flex-end",
                                }}
                              >
                                <button
                                  type="submit"
                                  className="btn btn-success"
                                  disabled={
                                    savingAttendance || !participants.length
                                  }
                                >
                                  {savingAttendance
                                    ? "Submitting…"
                                    : "Submit Attendance"}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* HISTORICAL section */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <h4 style={{ marginTop: 0 }}>Attendance Records</h4>
                    {loadingAttendanceList ? (
                      <div className="table-spinner">
                        Loading attendance records…
                      </div>
                    ) : attendanceList.length === 0 ? (
                      <div className="muted">
                        No attendance records found for this batch yet.
                      </div>
                    ) : (
                      <div style={{ marginBottom: 10 }}>
                        <table className="table table-compact">
                          <thead>
                            <tr>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceList.map((a) => (
                              <tr key={a.id}>
                                <td>
                                  <button
                                    className="btn-sm btn-flat"
                                    type="button"
                                    onClick={() =>
                                      fetchParticipantRecordsForDate(a.date)
                                    }
                                  >
                                    {fmtDate(a.date)}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {selectedDate && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: "1px solid #e5e7eb",
                        }}
                      >
                        <h5>Attendance on {fmtDate(selectedDate)}</h5>
                        {loadingSelectedRecords ? (
                          <div className="table-spinner">
                            Loading participant records…
                          </div>
                        ) : selectedDateRecords.length === 0 ? (
                          <div className="muted">
                            No records for this date.
                          </div>
                        ) : (
                          <div style={{ maxHeight: 400, overflow: "auto" }}>
                            <table className="table table-compact">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Role</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedDateRecords.map((r) => (
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
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Submitting overlay */}
          {submitting && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15,23,42,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 8,
                  padding: "16px 24px",
                  minWidth: 260,
                  textAlign: "center",
                  boxShadow: "0 10px 25px rgba(15,23,42,0.25)",
                }}
              >
                <div
                  className="spinner-border"
                  role="status"
                  style={{ width: 24, height: 24, marginBottom: 8 }}
                >
                  <span className="visually-hidden">Loading…</span>
                </div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  Submitting Attendance
                </div>
                <div style={{ fontSize: 13, color: "#4b5563" }}>
                  {submitMessage}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
