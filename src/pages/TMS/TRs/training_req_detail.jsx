// src/pages/TMS/TRs/training_req_detail.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API } from "../../../api/axios";
import { getCanonicalRole } from "../../../utils/roleUtils";

const DETAIL_CACHE_PREFIX = "tms_tr_detail_cache_v1::";

function loadCache(id) {
  try {
    const raw = localStorage.getItem(DETAIL_CACHE_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw).payload;
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

export default function TrainingRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const role = getCanonicalRole(user || {});

  const [loading, setLoading] = useState(false);
  const [tr, setTr] = useState(loadCache(id) ? loadCache(id).tr : null);
  const [participants, setParticipants] = useState(
    loadCache(id) ? loadCache(id).participants : []
  );
  const [participantLoading, setParticipantLoading] = useState(false);
  const [pldFilter, setPldFilter] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  async function fetchAll(force = false) {
    setLoading(true);
    try {
      if (!force) {
        const cached = loadCache(id);
        if (cached && cached.tr) {
          setTr(cached.tr);
          setParticipants(cached.participants || []);
          setLoading(false);
          return;
        }
      }

      // fetch tr
      const resp = await TMS_API.trainingRequests.retrieve(id);
      const trObj = resp?.data ?? resp ?? null;
      setTr(trObj);

      // fetch participants depending on type
      setParticipantLoading(true);
      let parts = [];
      if (trObj?.training_type === "BENEFICIARY") {
        const pResp = await TMS_API.trainingRequestBeneficiaries.list({
          training: id,
          limit: 500,
        });
        parts = pResp?.data?.results || pResp?.data || pResp || [];
      } else {
        const pResp = await TMS_API.trainingRequestTrainers.list({
          training: id,
          limit: 500,
        });
        parts = pResp?.data?.results || pResp?.data || pResp || [];
      }
      setParticipants(parts || []);
      saveCache(id, { tr: trObj, participants: parts || [] });
    } catch (e) {
      console.error("fetch detail failed", e);
      setTr(null);
      setParticipants([]);
    } finally {
      setParticipantLoading(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, id]);

  const visibleParticipants = useMemo(() => {
    if (!participants) return [];
    return participants.filter((p) => {
      if (!pldFilter) return true;
      return (
        String((p.pld_status || "").toLowerCase()) ===
        String(pldFilter).toLowerCase()
      );
    });
  }, [participants, pldFilter]);

  // status message helper
  function statusMessage(trObj) {
    if (!trObj) return null;
    const partnerName =
      trObj.partner_name || `Partner ID ${trObj.partner || "-"}`;
    const rej = trObj.rejection_reason || "";
    switch ((trObj.status || "").toUpperCase()) {
      case "BATCHING":
        return `Training Request is in BATCHING status, Please wait for Training Partner ${partnerName} to create batches for this Request.`;
      case "PENDING":
        return `Training Request is in PENDING status, Please wait for appropriate authority to approve this Training Request.`;
      case "ONGOING":
        return `Training Request is ONGOING, Stats are visible below.`;
      case "REVIEW":
        return `Training Request is under REVIEW, Please wait for appropriate authority to close this Training Request.`;
      case "COMPLETED":
        return `Training is COMPLETED, Stats are visible below.`;
      case "REJECTED":
        return `Training Request is REVERTED due to ${rej || "unspecified reason"}, Please wait for Training Partner ${partnerName} to resolve the issue.`;
      default:
        return `Status: ${trObj.status || "—"}`;
    }
  }

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu — Training Request Detail
            </div>
          }
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "20px auto" }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0 }}>Training Request #{id}</h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.removeItem(DETAIL_CACHE_PREFIX + id);
                    setRefreshToken((t) => t + 1);
                  }}
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

            <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
              {loading ? (
                <div className="table-spinner">Loading all details…</div>
              ) : !tr ? (
                <div className="muted">Training request not found.</div>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <strong>Plan:</strong> {tr.training_plan || "-"}{" "}
                    &nbsp;&nbsp;
                    <strong>Type:</strong> {tr.training_type} &nbsp;&nbsp;
                    <strong>Level:</strong> {tr.level} &nbsp;&nbsp;
                    <strong>Status:</strong> {tr.status}
                  </div>

                  {/* Status tab */}
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

                  {/* Participants */}
                  <div style={{ marginBottom: 12 }}>
                    <h4>Participants</h4>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      {tr.training_type === "BENEFICIARY" ? (
                        <>
                          <label style={{ fontWeight: 700 }}>PLD Filter</label>
                          <select
                            value={pldFilter}
                            onChange={(e) => setPldFilter(e.target.value)}
                            className="input"
                          >
                            <option value="">All</option>
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                          </select>
                        </>
                      ) : null}
                      <div style={{ marginLeft: "auto", color: "#6c757d" }}>
                        {participantLoading
                          ? "Loading participants…"
                          : `${visibleParticipants.length} shown`}
                      </div>
                    </div>

                    {participantLoading ? (
                      <div className="table-spinner">
                        Fetching participants…
                      </div>
                    ) : visibleParticipants.length === 0 ? (
                      <div className="muted">No participants found.</div>
                    ) : tr.training_type === "BENEFICIARY" ? (
                      <div style={{ maxHeight: 420, overflow: "auto" }}>
                        <table className="table table-compact">
                          <thead>
                            <tr>
                              <th>SHG Code</th>
                              <th>Member Code</th>
                              <th>Name</th>
                              <th>Age</th>
                              <th>Gender</th>
                              <th>Social Category</th>
                              <th>PLD</th>
                              <th>View</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleParticipants.map((p) => (
                              <tr key={p.id}>
                                <td>{p.lokos_shg_code}</td>
                                <td>{p.lokos_member_code}</td>
                                <td>{p.member_name}</td>
                                <td>{p.age ?? "-"}</td>
                                <td>{p.gender}</td>
                                <td>{p.social_category}</td>
                                <td>{p.pld_status}</td>
                                <td>
                                  <button
                                    className="btn-sm btn-flat"
                                    onClick={() => {
                                      // show details in a simple modal (browser alert used for speed)
                                      alert(JSON.stringify(p, null, 2));
                                    }}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      // Trainers
                      <div style={{ maxHeight: 420, overflow: "auto" }}>
                        <table className="table table-compact">
                          <thead>
                            <tr>
                              <th>Trainer ID</th>
                              <th>Full Name</th>
                              <th>Mobile</th>
                              <th>View</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleParticipants.map((p) => (
                              <tr key={p.id}>
                                <td>{p.trainer || p.id}</td>
                                <td>{p.full_name}</td>
                                <td>{p.mobile_no}</td>
                                <td>
                                  <button
                                    className="btn-sm btn-flat"
                                    onClick={async () => {
                                      try {
                                        const resp =
                                          await TMS_API.masterTrainers.retrieve(
                                            p.trainer || p.id
                                          );
                                        const payload =
                                          resp?.data ?? resp ?? null;
                                        alert(JSON.stringify(payload, null, 2));
                                      } catch (e) {
                                        alert(
                                          "Failed to fetch trainer detail."
                                        );
                                      }
                                    }}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Conditional actions based on status */}
                  <div style={{ marginTop: 12 }}>
                    {["PENDING"].includes((tr.status || "").toUpperCase()) && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Note:</strong> Request is PENDING. Appropriate
                        authority action required.
                        {/* DMMU review route for PENDING */}
                        <div style={{ marginTop: 8 }}>
                          <button
                            className="btn"
                            onClick={() => navigate("/tms/dmmu/tr-review")}
                          >
                            Go to DMMU Review
                          </button>
                        </div>
                      </div>
                    )}

                    {[
                      "BATCHING",
                      "ONGOING",
                      "COMPLETED",
                      "REVIEW",
                      "REJECTED",
                    ].includes((tr.status || "").toUpperCase()) && (
                      <div>
                        <button
                          className="btn"
                          onClick={() =>
                            navigate("/tms/training-batches?training=" + id)
                          }
                        >
                          View Batches in this Training Request
                        </button>
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
