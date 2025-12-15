// src/pages/TMS/TRs/training_req_detail.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API, LOOKUP_API } from "../../../api/axios";
import { getCanonicalRole } from "../../../utils/roleUtils";

const DETAIL_CACHE_PREFIX = "tms_tr_detail_cache_v1::";

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

/* Small, reusable Modal used to show participant/trainer details */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 96%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#fff",
          borderRadius: 8,
          padding: 18,
          boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", marginBottom: 12 }}
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

/* Helper to format ISO timestamp to readable */
function fmtDate(iso) {
  try {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (e) {
    return iso || "-";
  }
}

export default function TrainingRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const role = getCanonicalRole(user || {});
  const isTP = role === "training_partner" || role === "4"
  const isDmmu = role === "2"
  const isSmmu = role === "3"    

  // overall loading for "load ALL apis"
  const [loadingAll, setLoadingAll] = useState(false);

  // training request object
  const [tr, setTr] = useState(() => {
    const c = loadCache(id);
    return c?.payload?.tr || null;
  });

  // partner details
  const [partner, setPartner] = useState(() => {
    const c = loadCache(id);
    return c?.payload?.partner || null;
  });

  // training plan name object
  const [trainingPlanObj, setTrainingPlanObj] = useState(() => {
    const c = loadCache(id);
    return c?.payload?.training_plan_obj || null;
  });

  // participants list and loading
  const [participants, setParticipants] = useState(() => {
    const c = loadCache(id);
    return c?.payload?.participants || [];
  });
  const [participantLoading, setParticipantLoading] = useState(false);

  // modal state for viewing participant details
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalPayload, setModalPayload] = useState(null);

  // filters
  const [pldFilter, setPldFilter] = useState("");

  // simple refresh token to trigger useEffect
  const [refreshToken, setRefreshToken] = useState(0);

  // guard against concurrent fetchAll calls (prevents duplicate network calls in StrictMode)
  const inFlightRef = useRef(false);

  /* ----------------- training plan fetch (fast path: list with fields) ----------------- */
  async function fetchTrainingPlan(planId) {
    if (!planId) return null;
    try {
      // Use list with id+fields as requested (faster than retrieve)
      const r = await TMS_API.trainingPlans.list({
        id: planId,
        fields: "training_name",
      });
      const results = r?.data?.results || r?.data || [];
      return results[0] || null;
    } catch (err) {
      console.warn("training plan fetch failed", err);
      return null;
    }
  }

  /* ----------------- location name lookups (use LOOKUP_API.*.retrieve) ----------------- */
  async function fetchDistrictNameSafe(districtId) {
    if (!districtId) return null;
    try {
      const resp = await LOOKUP_API.districts.retrieve(districtId, {
        fields: "district_name_en",
      });
      return resp?.data?.district_name_en || null;
    } catch (e) {
      return null;
    }
  }
  async function fetchBlockNameSafe(blockId) {
    if (!blockId) return null;
    try {
      // prefer standard retrieve
      const resp = await LOOKUP_API.blocks_detail.retrieve(blockId, {
        fields: "block_name_en",
      });
      return resp?.data?.block_name_en || null;
    } catch (e) {
      // fallback: try calling detail route if backend exposes it
      try {
        const resp2 = await LOOKUP_API.blocks_detail.list({
          id: blockId,
          fields: "block_name_en",
        });
        const results = resp2?.data?.results || resp2?.data || [];
        return (results[0] && results[0].block_name_en) || null;
      } catch (err) {
        return null;
      }
    }
  }
  async function fetchPanchayatNameSafe(panchayatId) {
    if (!panchayatId) return null;
    try {
      const resp = await LOOKUP_API.panchayats_detail.retrieve(panchayatId, {
        fields: "panchayat_name_en",
      });
      return resp?.data?.panchayat_name_en || null;
    } catch (e) {
      try {
        const resp2 = await LOOKUP_API.panchayats_detail.list({
          id: panchayatId,
          fields: "panchayat_name_en",
        });
        const results = resp2?.data?.results || resp2?.data || [];
        return (results[0] && results[0].panchayat_name_en) || null;
      } catch (err) {
        return null;
      }
    }
  }
  async function fetchVillageNameSafe(villageId) {
    if (!villageId) return null;
    try {
      const resp = await LOOKUP_API.villages_detail.retrieve(villageId, {
        fields: "village_name_english",
      });
      return resp?.data?.village_name_english || null;
    } catch (e) {
      try {
        const resp2 = await LOOKUP_API.villages_detail.list({
          id: villageId,
          fields: "village_name_english",
        });
        const results = resp2?.data?.results || resp2?.data || [];
        return (results[0] && results[0].village_name_english) || null;
      } catch (err) {
        return null;
      }
    }
  }

  /* Convenience wrapper to fetch all location names in parallel */
  async function fetchLocationNames({ district, block, panchayat, village }) {
    const promises = [
      fetchDistrictNameSafe(district),
      fetchBlockNameSafe(block),
      fetchPanchayatNameSafe(panchayat),
      fetchVillageNameSafe(village),
    ];
    const [districtName, blockName, panchayatName, villageName] =
      await Promise.all(promises);
    return { districtName, blockName, panchayatName, villageName };
  }

  /* ----------------- main orchestration ----------------- */
  async function fetchAll(force = false) {
    if (!id) return;
    // avoid concurrent fetches unless forced
    if (inFlightRef.current && !force) return;
    inFlightRef.current = true;
    setLoadingAll(true);

    try {
      if (!force) {
        const cached = loadCache(id);
        if (cached && cached.payload && cached.payload.tr) {
          setTr(cached.payload.tr);
          setParticipants(cached.payload.participants || []);
          setPartner(cached.payload.partner || null);
          setTrainingPlanObj(cached.payload.training_plan_obj || null);
          setLoadingAll(false);
          inFlightRef.current = false;
          return;
        }
      }

      // 1) fetch training request
      const trResp = await TMS_API.trainingRequests.retrieve(id);
      const trObj = trResp?.data ?? trResp ?? null;
      setTr(trObj);

      // 1.a) fetch training plan name (fast list)
      let trainingPlanObjLocal = null;
      try {
        if (trObj?.training_plan) {
          trainingPlanObjLocal = await fetchTrainingPlan(trObj.training_plan);
          setTrainingPlanObj(trainingPlanObjLocal);
        }
      } catch (e) {
        console.warn("Failed to fetch training plan", e);
      }

      // 2) fetch partner details if present
      let partnerObj = null;
      try {
        if (trObj?.partner) {
          if (TMS_API.trainingPartners && TMS_API.trainingPartners.retrieve) {
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
          setPartner(partnerObj);
        }
      } catch (e) {
        console.warn("Failed to fetch partner", e);
      }

      // 3) participants
      setParticipantLoading(true);
      let parts = [];
      try {
        if ((trObj?.training_type || "").toUpperCase() === "BENEFICIARY") {
          const pResp = await TMS_API.trainingRequestBeneficiaries.list({
            training: id,
            page_size: 500,
          });
          parts = pResp?.data?.results || pResp?.data || pResp || [];
        } else {
          const pResp = await TMS_API.trainingRequestTrainers.list({
            training: id,
            page_size: 500,
          });
          parts = pResp?.data?.results || pResp?.data || pResp || [];
        }
      } catch (e) {
        console.warn("Failed to fetch participants", e);
        parts = [];
      } finally {
        setParticipantLoading(false);
        setParticipants(parts || []);
      }

      // 4) cache
      saveCache(id, {
        tr: trObj,
        partner: partnerObj,
        participants: parts || [],
        training_plan_obj: trainingPlanObjLocal,
      });
    } catch (e) {
      console.error("fetch detail failed", e);
      setTr(null);
      setParticipants([]);
      setPartner(null);
      setTrainingPlanObj(null);
    } finally {
      setParticipantLoading(false);
      setLoadingAll(false);
      inFlightRef.current = false;
    }
  }

  useEffect(() => {
    fetchAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshToken]);

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

  /* ----------------- status message with highlighted status & partner ----------------- */
  function statusMessage(trObj, partnerObj) {
    if (!trObj) return null;
    const partnerName =
      partnerObj?.name ||
      trObj.partner_name ||
      `Partner ID ${trObj.partner || "-"}`;
    const rej = trObj.rejection_reason || "";
    const statusText = (trObj.status || "—").toUpperCase();

    const boldStatus = (
      <strong style={{ color: "#0b5cff", padding: "2px 6px", borderRadius: 4 }}>
        {statusText}
      </strong>
    );
    const boldPartner = (
      <strong style={{ color: "#0b8a3e", padding: "2px 6px", borderRadius: 4 }}>
        {partnerName}
      </strong>
    );

    switch (statusText) {
      case "BATCHING":
        return (
          <span>
            Training Request is in {boldStatus} status, Please wait for Training
            Partner {boldPartner} to create batches for this Request.
          </span>
        );
      case "PENDING":
        return (
          <span>
            Training Request is in {boldStatus} status, Please wait for
            appropriate authority to approve this Training Request.
          </span>
        );
      case "ONGOING":
        return (
          <span>
            Training Request is {boldStatus}, Stats are visible below.
          </span>
        );
      case "REVIEW":
        return (
          <span>
            Training Request is under {boldStatus}, Please wait for appropriate
            authority to close this Training Request.
          </span>
        );
      case "COMPLETED":
        return <span>Training is {boldStatus}, Stats are visible below.</span>;
      case "REJECTED":
        return (
          <span>
            Training Request is REVERTED due to{" "}
            <strong style={{ color: "#c93b3b" }}>
              {rej || "unspecified reason"}
            </strong>
            , Please wait for Training Partner {boldPartner} to resolve the
            issue.
          </span>
        );
      default:
        return <span>Status: {boldStatus}</span>;
    }
  }

  /* ----------------- open modal handlers ----------------- */

  async function openParticipantModal(title, payload) {
    setModalTitle(title || "Detail");
    setModalPayload(null); // show loading until enriched
    setModalOpen(true);

    // If beneficiary, enrich with location names and show only requested fields
    if (
      payload &&
      (payload.lokos_shg_code ||
        payload.member_name ||
        payload.lokos_member_code)
    ) {
      // fetch names for district/block/panchayat/village
      const locs = await fetchLocationNames({
        district: payload.district,
        block: payload.block,
        panchayat: payload.panchayat,
        village: payload.village,
      });

      // build display object with logical labels
      const disp = {
        "SHG Code": payload.lokos_shg_code || "-",
        "Member Code": payload.lokos_member_code || "-",
        Name: payload.member_name || "-",
        Age: payload.age ?? "-",
        Gender: payload.gender || "-",
        Designation: payload.designation || "-",
        "PLD Status": payload.pld_status || "-",
        "Social Category": payload.social_category || "-",
        Religion: payload.religion || "-",
        Mobile: payload.mobile || "-",
        Email: payload.email || "-",
        Education: payload.education || "-",
        Address: payload.address || "-",
        Remarks: payload.remarks || "-",
        "Registered On": fmtDate(payload.registered_on),
        District: locs.districtName || payload.district || "-",
        Block: locs.blockName || payload.block || "-",
        Panchayat: locs.panchayatName || payload.panchayat || "-",
        Village: locs.villageName || payload.village || "-",
      };

      setModalPayload(disp);
      return;
    }

    // For other payloads (trainer fallback etc.), just show key-values
    setModalPayload(payload || {});
  }

  function closeModal() {
    setModalOpen(false);
    setModalPayload(null);
    setModalTitle("");
  }

  async function onViewBeneficiary(p) {
    await openParticipantModal("Beneficiary Detail", p);
  }

  async function onViewTrainer(p) {
    const trainerId = p.trainer || p.id;
    try {
      const resp = await TMS_API.masterTrainers.retrieve(trainerId);
      const payload = resp?.data ?? resp ?? null;

      // Format trainer display fields: id, full_name, mobile_no, aadhaar_no, remarks, registered_on
      const disp = {
        "Trainer ID": payload?.id ?? trainerId,
        "Full Name": payload?.full_name ?? payload?.name ?? "-",
        Mobile: payload?.mobile_no ?? "-",
        Aadhaar: payload?.aadhaar_no ?? "-",
        Remarks: payload?.remarks ?? "-",
        "Registered On": fmtDate(payload?.registered_on),
      };
      openParticipantModal("Trainer Detail", disp);
    } catch (e) {
      // fallback to showing the row data
      const disp = {
        "Trainer ID": p.trainer || p.id,
        "Full Name": p.full_name || "-",
        Mobile: p.mobile_no || "-",
        "Registered On": fmtDate(p.registered_on),
      };
      openParticipantModal("Trainer Detail", disp);
    }
  }

  function handleRefresh() {
    try {
      localStorage.removeItem(DETAIL_CACHE_PREFIX + id);
    } catch (e) {}
    setRefreshToken((t) => t + 1);
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

            <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
              {loadingAll ? (
                <div className="table-spinner">Loading all details…</div>
              ) : !tr ? (
                <div className="muted">Training request not found.</div>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <strong>Plan:</strong>{" "}
                    {trainingPlanObj?.training_name || tr.training_plan || "-"}{" "}
                    &nbsp;&nbsp;
                    <strong>Type:</strong> {tr.training_type || "-"}{" "}
                    &nbsp;&nbsp;
                    <strong>Level:</strong> {tr.level || "-"} &nbsp;&nbsp;
                    <strong>Status:</strong>{" "}
                    <span style={{ fontWeight: 700 }}>{tr.status || "-"}</span>
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
                    {statusMessage(tr, partner)}
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
                      {(tr.training_type || "").toUpperCase() ===
                        "BENEFICIARY" && (
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
                      )}

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
                    ) : (tr.training_type || "").toUpperCase() ===
                      "BENEFICIARY" ? (
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
                                    onClick={() => onViewBeneficiary(p)}
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
                                    onClick={() => onViewTrainer(p)}
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
                    {/* PENDING → SMMU REVIEW */}
                    {isSmmu && (tr.status || "").toUpperCase() === "PENDING" && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Note:</strong> Request is PENDING. Appropriate
                        authority action required.
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

                    {/* PENDING → DMMU REVIEW */}
                    {isDmmu && (tr.status || "").toUpperCase() === "PENDING" && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Note:</strong> Request is PENDING. Appropriate
                        authority action required.
                        <div style={{ marginTop: 8 }}>
                          <button
                            className="btn"
                            onClick={() => navigate("/tms/smmu/tr-review")}
                          >
                            Go to SMMU Review
                          </button>
                        </div>
                      </div>
                    )}

                    {/* REVIEW → SMMU CLOSURE */}
                    {isSmmu && (tr.status || "").toUpperCase() === "REVIEW" && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Note:</strong> Request is PENDING. Appropriate
                        authority action required.
                        <div style={{ marginTop: 8 }}>
                          <button
                            className="btn"
                            onClick={() => navigate("/tms/smmu/tr-review")}
                          >
                            Go to DMMU Review
                          </button>
                        </div>
                      </div>
                    )}

                    {/* REVIEW → DMMU CLOSURE */}
                    {isDmmu && (tr.status || "").toUpperCase() === "REVIEW" && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Note:</strong> Request is PENDING. Appropriate
                        authority action required.
                        <div style={{ marginTop: 8 }}>
                          <button
                            className="btn"
                            onClick={() => navigate("/tms/dmmu/tr-review")}
                          >
                            Go to SMMU Review
                          </button>
                        </div>
                      </div>
                    )}                    

                    {/* TP REVERTED TR */}
                    {isTP && (tr.status || "").toUpperCase() === "REJECTED" && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Note:</strong> Request is REJECTED !. Appropriate
                        authority action required.
                        <div style={{ marginTop: 8 }}>
                          <button
                            className="btn"
                            onClick={() => navigate("/tms/smmu/tr-review")}
                          >
                            Go to Batches Review
                          </button>
                        </div>
                      </div>
                    )}                    

                    {/* TRAINING PARTNER + BATCHING → CREATE BATCHES */}
                    {isTP && (tr.status || "").toUpperCase() === "BATCHING" ? (
                      <div>
                        <button
                          className="btn btn-primary"
                          onClick={() => navigate(`/tms/tp/batches/create/${id}`)}
                        >
                          Create Batches
                        </button>
                      </div>
                    ) : (
                      /* ALL OTHER CASES → VIEW BATCHES */
                      [
                        "ONGOING",
                        "PENDING", 
                        "COMPLETED",
                        "REJECTED",
                      ].includes((tr.status || "").toUpperCase()) && (
                        <div>
                          <button
                            className="btn"
                            onClick={() => navigate(`/tms/batches-list/${id}`)}
                          >
                            View Batches in this Training Request
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Participant / Trainer modal */}
      <Modal open={modalOpen} onClose={closeModal} title={modalTitle}>
        {modalPayload ? (
          <div style={{ display: "grid", gap: 10 }}>
            {Object.keys(modalPayload).map((label) => (
              <div
                key={label}
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
              >
                <div style={{ minWidth: 160, fontWeight: 700, color: "#333" }}>
                  {label}
                </div>
                <div style={{ color: "#111", whiteSpace: "pre-wrap" }}>
                  {modalPayload[label] ?? "-"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 12 }}>Loading details…</div>
        )}
      </Modal>
    </div>
  );
}
