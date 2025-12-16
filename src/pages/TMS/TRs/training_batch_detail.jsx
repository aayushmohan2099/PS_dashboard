// src/pages/TMS/TRs/training_batch_detail.jsx
import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api from "../../../api/axios";

const DETAIL_CACHE_PREFIX = "tms_batch_detail_cache_v1::";

function loadCache(id) {
  try {
    const raw = localStorage.getItem(DETAIL_CACHE_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveCache(id, payload) {
  try {
    localStorage.setItem(
      DETAIL_CACHE_PREFIX + id,
      JSON.stringify({ ts: Date.now(), payload })
    );
  } catch (e) {}
}

function fmtDate(iso) {
  try {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN");
  } catch (e) {
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

export default function TrainingBatchDetail() {
  const { id: batchId } = useParams();
  const navigate = useNavigate();
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
  const [selectedAttendanceRecords, setSelectedAttendanceRecords] = useState([]);
  const [loadingSelectedAttendance, setLoadingSelectedAttendance] =
    useState(false);

  const [refreshToken, setRefreshToken] = useState(0);
  const inFlightRef = useRef(false);

  /* ----------------- main fetch orchestration ----------------- */
  async function fetchAll(force = false) {
    if (!batchId) return;

    console.log("🔄 Fetching batch detail for ID:", batchId);

    if (inFlightRef.current && !force) return;
    inFlightRef.current = true;
    setLoadingAll(true);

    let trDetail = null;
    let fullCentreData = null;
    let attendances = [];

    try {
      // Check cache first
      if (!force) {
        const cached = loadCache(batchId);
        if (cached?.payload?.batchData) {
          console.log("✅ Using cache");
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

      // 1. Fetch batch detail → /tms/batches/1/detail/
      console.log("📦 Fetching /tms/batches/" + batchId + "/detail/");
      const batchResp = await api.get(`/tms/batches/${batchId}/detail/`);
      const batchResponse = batchResp?.data || null;
      console.log("✅ Batch data loaded:", batchResponse);
      setBatchData(batchResponse);

      // Extract immediate data
      const requestId = batchResponse?.request?.id;
      setParticipants(batchResponse?.beneficiary || []);
      setMasterTrainers(batchResponse?.master_trainers || []);

      // 2. Fetch FULL Training Request → /tms/training-requests/1/detail/
      if (requestId) {
        console.log(
          "📋 Fetching /tms/training-requests/" + requestId + "/detail/"
        );
        const trResp = await api.get(
          `/tms/training-requests/${requestId}/detail/`
        );
        trDetail = trResp?.data || null;
        console.log("✅ Training Request detail:", trDetail);
        setTrainingRequestDetail(trDetail);
      }

      // 3. Fetch FULL Centre Detail → /tms/training-partner-centres/2/detail/
      if (batchResponse?.centre?.id) {
        const centreId = batchResponse.centre.id;
        console.log(
          "🏢 Fetching /tms/training-partner-centres/" +
            centreId +
            "/detail/"
        );
        const centreResp = await api.get(
          `/tms/training-partner-centres/${centreId}/detail/`
        );
        fullCentreData = centreResp?.data || batchResponse.centre;
        console.log("✅ Full centre detail with media:", fullCentreData);
        setCentreDetail(fullCentreData);
      }

      // 4. Fetch attendance list for this batch
      try {
        setLoadingAttendance(true);
        console.log(
          "📅 Fetching /tms/batch-attendance/?batch=" + batchId
        );
        const attResp = await api.get(
          `/tms/batch-attendance/?batch=${batchId}`
        );
        const attData = attResp?.data ?? attResp ?? {};
        attendances = attData.results || attData || [];
        attendances.sort((a, b) =>
          (a.date || "").localeCompare(b.date || "")
        );
        setAttendanceList(attendances);
        console.log("✅ Attendance list loaded:", attendances);
      } catch (e) {
        console.error("❌ Fetch attendance list failed:", e);
        setAttendanceList([]);
      } finally {
        setLoadingAttendance(false);
      }

      // 5. Cache everything
      saveCache(batchId, {
        batchData: batchResponse,
        trainingRequestDetail: trDetail,
        participants: batchResponse?.beneficiary || [],
        masterTrainers: batchResponse?.master_trainers || [],
        centreDetail: fullCentreData,
        attendanceList: attendances,
      });

      console.log("✅ All data loaded and cached successfully!");
    } catch (e) {
      console.error("❌ fetchAll failed:", e);
    } finally {
      setLoadingAll(false);
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    fetchAll(refreshToken > 0);
  }, [batchId, refreshToken]);

  function handleRefresh() {
    console.log("🔄 Refresh clicked");
    try {
      localStorage.removeItem(DETAIL_CACHE_PREFIX + batchId);
    } catch (e) {}
    setSelectedAttendanceDate(null);
    setSelectedAttendanceRecords([]);
    setRefreshToken((t) => t + 1);
  }

  const hasMasterTrainers = masterTrainers && masterTrainers.length > 0;
  const firstMasterTrainer = hasMasterTrainers ? masterTrainers[0] : null;

  /* ------------- fetch participant records for a given attendance date ------------- */
  async function fetchAttendanceParticipantsForDate(dateStr) {
    if (!batchId || !dateStr) return;
    setLoadingSelectedAttendance(true);
    setSelectedAttendanceDate(dateStr);
    setSelectedAttendanceRecords([]);

    try {
      // 1) Find the BatchAttendance row for this date
      const attResp = await api.get(
        `/tms/batch-attendance/?batch=${batchId}&date=${dateStr}`
      );
      const attData = attResp?.data ?? attResp ?? {};
      const attendance = (attData.results || attData || [])[0];
      if (!attendance?.id) {
        setSelectedAttendanceRecords([]);
        return;
      }

      // 2) Fetch participant records for this attendance id
      const recResp = await api.get(
        `/tms/participant-attendance/?attendance=${attendance.id}`
      );
      const recData = recResp?.data ?? recResp ?? {};
      const recs = recData.results || recData || [];
      setSelectedAttendanceRecords(recs);
    } catch (e) {
      console.error("❌ fetchAttendanceParticipantsForDate failed:", e);
      setSelectedAttendanceRecords([]);
    } finally {
      setLoadingSelectedAttendance(false);
    }
  }

  if (loadingAll && !batchData) {
    return (
      <div className="app-shell">
        <LeftNav />
        <div className="main-area">
          <TopNav
            left={<div className="app-title">Pragati Setu — Batch Detail</div>}
          />
          <main style={{ padding: 18 }}>
            <div style={{ maxWidth: 1200, margin: "20px auto" }}>
              <div className="table-spinner">Loading batch details…</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={<div className="app-title">Pragati Setu — Batch Detail</div>}
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1200, margin: "20px auto" }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0 }}>
                Batch #{batchId}{" "}
                {batchData?.code ? `(${batchData.code})` : ""}
              </h2>
              <div
                style={{ marginLeft: "auto", display: "flex", gap: 8 }}
              >
                <button className="btn" onClick={handleRefresh}>
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

            <div style={{ background: "#fff", padding: 20, borderRadius: 8 }}>
              {!batchData ? (
                <div className="muted">
                  Batch not found.{" "}
                  <button className="btn-sm" onClick={handleRefresh}>
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. TRAINING DETAILS */}
                  <div style={{ marginBottom: 24 }}>
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        color: "#1a1a1a",
                      }}
                    >
                      📋 Training Details
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(250px, 1fr))",
                        gap: 16,
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
                        {trainingRequestDetail?.training_plan
                          ?.training_name || "-"}
                      </div>
                      <div>
                        <strong>Type of Training:</strong>{" "}
                        {trainingRequestDetail?.training_plan
                          ?.type_of_training || "-"}
                      </div>
                      <div>
                        <strong>Level of Training:</strong>{" "}
                        {trainingRequestDetail?.training_plan
                          ?.level_of_training || "-"}
                      </div>
                      <div>
                        <strong>No. of Days:</strong>{" "}
                        {trainingRequestDetail?.training_plan?.no_of_days ||
                          "-"}
                      </div>
                      <div>
                        <strong>District:</strong>{" "}
                        {trainingRequestDetail?.district?.district_name_en ||
                          "-"}
                      </div>
                      <div>
                        <strong>Block:</strong>{" "}
                        {trainingRequestDetail?.block?.block_name_en || "-"}
                      </div>
                    </div>
                  </div>

                  {/* 2. BATCH DETAILS */}
                  <div style={{ marginBottom: 24 }}>
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        color: "#1a1a1a",
                      }}
                    >
                      🎯 Batch Details
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: 16,
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
                        <strong>Batch Type:</strong>{" "}
                        {batchData.batch_type || "-"}
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
                        <strong>Start Date:</strong>{" "}
                        {fmtDate(batchData.start_date)}
                      </div>
                      <div>
                        <strong>End Date:</strong>{" "}
                        {fmtDate(batchData.end_date)}
                      </div>
                    </div>
                  </div>

                  {/* 3. ATTENDANCE DETAILS */}
                  <div style={{ marginBottom: 24 }}>
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        color: "#1a1a1a",
                      }}
                    >
                      📅 Attendance (All Dates)
                    </h3>
                    {loadingAttendance ? (
                      <div className="table-spinner">
                        Loading attendance…
                      </div>
                    ) : attendanceList.length === 0 ? (
                      <div className="muted">
                        No attendance records found for this batch.
                      </div>
                    ) : (
                      <>
                        <div style={{ maxHeight: 250, overflow: "auto" }}>
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
                                      className="btn-sm btn-flat"
                                      onClick={() =>
                                        fetchAttendanceParticipantsForDate(
                                          att.date
                                        )
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
                            <h4>
                              Attendance on {fmtDate(selectedAttendanceDate)}
                            </h4>
                            {loadingSelectedAttendance ? (
                              <div className="table-spinner">
                                Loading participant records…
                              </div>
                            ) : selectedAttendanceRecords.length === 0 ? (
                              <div className="muted">
                                No participant attendance records for this
                                date.
                              </div>
                            ) : (
                              <div
                                style={{
                                  maxHeight: 300,
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
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* 4. CENTRE DETAILS */}
                  {centreDetail && (
                    <div style={{ marginBottom: 24 }}>
                      <h3
                        style={{
                          margin: "0 0 16px 0",
                          color: "#1a1a1a",
                        }}
                      >
                        🏢 Centre Details
                      </h3>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(300px, 1fr))",
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
                          <div
                            style={{ color: "#666", marginBottom: 12 }}
                          >
                            {centreDetail.venue_address}
                          </div>
                          <div>
                            <strong>Serial:</strong>{" "}
                            {centreDetail.serial_number || "-"}
                          </div>
                          <div>
                            <strong>Type:</strong>{" "}
                            {centreDetail.centre_type || "-"}
                          </div>
                          <div>
                            <strong>Halls:</strong>{" "}
                            {centreDetail.training_hall_count || 0} (Capacity:{" "}
                            {centreDetail.training_hall_capacity || 0})
                          </div>

                          {centreDetail.rooms &&
                            centreDetail.rooms.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <h4
                                  style={{
                                    margin: "8px 0",
                                    fontSize: 14,
                                  }}
                                >
                                  Training Halls
                                </h4>
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
                            {centreDetail.medical_kit ? "✅ Yes" : "❌ No"}
                          </div>
                          <div>
                            <strong>Open Space:</strong>{" "}
                            {centreDetail.open_space ? "✅ Yes" : "❌ No"}
                          </div>
                          <div>
                            <strong>Field Visit:</strong>{" "}
                            {centreDetail.field_visit_facility
                              ? "✅ Yes"
                              : "❌ No"}
                          </div>
                          <div>
                            <strong>Transport:</strong>{" "}
                            {centreDetail.transport_facility
                              ? "✅ Yes"
                              : "❌ No"}
                          </div>
                          <div>
                            <strong>Dining:</strong>{" "}
                            {centreDetail.dining_facility
                              ? "✅ Yes"
                              : "❌ No"}
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <strong>Other:</strong>{" "}
                            {centreDetail.other_details || "-"}
                          </div>

                          {centreDetail.submissions &&
                            centreDetail.submissions.length > 0 && (
                              <div style={{ marginTop: 16 }}>
                                <h4
                                  style={{
                                    margin: "8px 0",
                                    fontSize: 14,
                                  }}
                                >
                                  Media
                                </h4>
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 12,
                                  }}
                                >
                                  {centreDetail.submissions.map(
                                    (submission) => {
                                      const src = normalizeMediaUrl(
                                        submission.file
                                      );
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
                                            onClick={() =>
                                              window.open(src, "_blank")
                                            }
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
                                    }
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. PARTICIPANT DETAILS */}
                  <div>
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        color: "#1a1a1a",
                      }}
                    >
                      👥 Participants ({participants.length})
                    </h3>

                    {hasMasterTrainers && firstMasterTrainer && (
                      <div
                        style={{
                          background: "#e3f2fd",
                          border: "2px solid #2196f3",
                          borderRadius: 8,
                          padding: 16,
                          marginBottom: 20,
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
                          👨‍🏫 Master Trainer
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

                    <div style={{ maxHeight: 400, overflow: "auto" }}>
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
                            <tr key="empty">
                              <td
                                colSpan={10}
                                style={{
                                  textAlign: "center",
                                  padding: 20,
                                }}
                              >
                                No participants assigned
                              </td>
                            </tr>
                          ) : (
                            participants.map((p, index) => (
                              <tr key={p.id || `p-${index}`}>
                                <td>{index + 1}</td>
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
          </div>
        </main>
      </div>
    </div>
  );
}
