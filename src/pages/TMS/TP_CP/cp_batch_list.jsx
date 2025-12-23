// src/pages/TMS/TP_CP/cp_batch_list.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TmsLeftNav from "../layout/tms_LeftNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api, { TMS_API } from "../../../api/axios";

const CP_ROOT_CACHE_KEY = "tms_cp_dashboard_cache_v1";
const CP_CENTRE_CACHE_KEY = "tms_cp_centre_cache_v1";
const CP_BATCHES_CACHE_KEY = "tms_cp_batches_cache_v1";

// simple cache helpers (reuse patterns from cp_dashboard)
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

export default function CpBatchList() {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const [loadingCentreChain, setLoadingCentreChain] = useState(false);
  const [cpRecord, setCpRecord] = useState(null);
  const [centreLink, setCentreLink] = useState(null);
  const [centre, setCentre] = useState(
    () => loadJson(CP_CENTRE_CACHE_KEY)?.payload || null
  );

  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batches, setBatches] = useState(
    () => loadJson(CP_BATCHES_CACHE_KEY)?.payload || []
  );

  const didRunRef = useRef(false);

  // load root cache (CP + link + centreId)
  useEffect(() => {
    if (!user?.id) return;
    const cached = loadJson(CP_ROOT_CACHE_KEY);
    if (cached?.payload?.cpRecord) {
      setCpRecord(cached.payload.cpRecord);
      setCentreLink(cached.payload.centreLink || null);
    } else {
      fetchCentreChain(false);
    }
  }, [user?.id]);

  async function fetchCentreChain(force = false) {
    if (!user?.id) return;
    if (!force && cpRecord && centreLink) return;

    setLoadingCentreChain(true);
    try {
      // 1) contact person
      const cpResp = await api.get(
        `/tms/training-partner-contact-persons/?master_user=${user.id}`
      );
      const cp = cpResp?.data?.results?.[0] || null;
      setCpRecord(cp);

      if (!cp) {
        saveJson(CP_ROOT_CACHE_KEY, { cpRecord: null, centreLink: null });
        setCentre(null);
        setBatches([]);
        return;
      }

      // 2) centre link
      const linkResp = await api.get(
        `/tms/tpcp-centre-links/?contact_person=${cp.id}`
      );
      const link = linkResp?.data?.results?.[0] || null;
      setCentreLink(link);

      // 3) centre detail
      if (link?.allocated_centre) {
        const centreResp = await api.get(
          `/tms/training-partner-centres/${link.allocated_centre}/detail/`
        );
        const centreData = centreResp?.data || null;
        setCentre(centreData);
        saveJson(CP_CENTRE_CACHE_KEY, centreData);
      } else {
        setCentre(null);
      }

      // cache root
      saveJson(CP_ROOT_CACHE_KEY, { cpRecord: cp, centreLink: link });
    } catch (e) {
      console.error("CP centre chain load failed", e);
    } finally {
      setLoadingCentreChain(false);
    }
  }

  async function fetchBatches(force = false) {
    if (!centre?.id) return;
    if (!force) {
      const cached = loadJson(CP_BATCHES_CACHE_KEY);
      if (cached?.payload) {
        setBatches(cached.payload || []);
        return;
      }
    }
    setBatchesLoading(true);
    try {
      const resp = await TMS_API.batches.list({
        centre: centre.id,
        page_size: 500,
      });
      const items = resp?.data?.results || [];
      setBatches(items);
      saveJson(CP_BATCHES_CACHE_KEY, items);
    } catch (e) {
      console.error("cp batches fetch failed", e);
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }

  useEffect(() => {
    if (centre?.id && !didRunRef.current) {
      didRunRef.current = true;
      fetchBatches(false);
    }
  }, [centre?.id]);

  const hasCentre = !!centre;
  const cpName =
    cpRecord?.name || user?.first_name || user?.username || "Contact Person";

  // ALL batches for this centre (no extra status filter here; we show all, actions depend on status)
  const rows = useMemo(() => batches || [], [batches]);

  function renderAction(batch) {
    const status = (batch.status || "").toUpperCase();
    if (status === "ONGOING") {
      return (
        <button
          className="btn-sm btn-flat"
          onClick={() => navigate(`/tms/cp/batch-detail/${batch.id}`)}
        >
          View
        </button>
      );
    }
    if (status === "PENDING") {
      return (
        <button
          className="btn-sm btn-flat"
          onClick={() => navigate(`/tms/batch-detail/${batch.id}`)}
        >
          View
        </button>
      );
    }
    if (status === "SCHEDULED") {
      return (
        <button
          className="btn-sm btn-flat"
          onClick={() => navigate(`/tms/batch-detail/${batch.id}`)}
        >
          View
        </button>
      );
    }
    if (status === "COMPLETED") {
      return (
        <>
          <button
            className="btn-sm btn-flat"
            style={{ marginRight: 6 }}
            onClick={() => navigate(`/tms/batch-detail/${batch.id}`)}
          >
            View
          </button>
          <button
            className="btn-sm btn-flat"
            onClick={() => navigate(`/tms/cp/batch-closure/${batch.id}`)}
          >
            Send Closure Request
          </button>
        </>
      );
    }
    // PENDING, SCHEDULED, REJECTED, DRAFT → no action button
    return null;
  }

  return (
    <div className="app-shell">
      <TmsLeftNav />
      <div className="main-area">
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ marginTop: 8 }}>Contact Person — Batches</h2>
            <div className="muted" style={{ marginBottom: 16 }}>
              List of all training batches mapped to your assigned centre.
            </div>

            {/* Centre info + refresh chain */}
            <div
              className="card"
              style={{ marginBottom: 20, padding: 18, borderRadius: 8 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 10,
                  gap: 8,
                }}
              >
                <h3 style={{ margin: 0 }}>My Centre</h3>
                <button
                  className="btn btn-sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    try {
                      localStorage.removeItem(CP_ROOT_CACHE_KEY);
                      localStorage.removeItem(CP_CENTRE_CACHE_KEY);
                    } catch {}
                    setCpRecord(null);
                    setCentreLink(null);
                    setCentre(null);
                    fetchCentreChain(true);
                  }}
                  disabled={loadingCentreChain}
                >
                  {loadingCentreChain ? "Refreshing…" : "Refresh Mapping"}
                </button>
              </div>

              {loadingCentreChain ? (
                <div className="table-spinner">
                  Loading your contact person and centre mapping…
                </div>
              ) : !cpRecord ? (
                <div className="muted">
                  No Contact Person mapping found for this user.
                </div>
              ) : !centreLink || !hasCentre ? (
                <div className="muted">
                  No centre is currently linked to your Contact Person profile.
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Centre Name:</strong> {centre.venue_name}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Address:</strong> {centre.venue_address}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Type:</strong> {centre.centre_type} &nbsp;|&nbsp;
                    <strong>Halls:</strong> {centre.training_hall_count}
                  </div>
                </div>
              )}
            </div>

            {/* Batches list */}
            <div
              className="card"
              style={{ background: "#fff", padding: 18, borderRadius: 8 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <h3 style={{ margin: 0 }}>Batches for My Centre</h3>
                <button
                  className="btn btn-sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    try {
                      localStorage.removeItem(CP_BATCHES_CACHE_KEY);
                    } catch {}
                    fetchBatches(true);
                  }}
                  disabled={batchesLoading || !hasCentre}
                >
                  {batchesLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              {!hasCentre ? (
                <div className="muted">
                  Link a centre to your Contact Person profile to see batches.
                </div>
              ) : batchesLoading ? (
                <div className="table-spinner">Loading batches…</div>
              ) : rows.length === 0 ? (
                <div className="muted">
                  No batches found for your assigned centre.
                </div>
              ) : (
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
                        <th>Participants</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((batch, index) => {
                        const participantsCount = Array.isArray(
                          batch.beneficiary
                        )
                          ? batch.beneficiary.length
                          : "-";
                        return (
                          <tr key={batch.id}>
                            <td>{index + 1}</td>
                            <td>{batch.code}</td>
                            <td>{batch.status}</td>
                            <td>{fmtDate(batch.start_date)}</td>
                            <td>{fmtDate(batch.end_date)}</td>
                            <td>{batch.batch_type}</td>
                            <td>{participantsCount}</td>
                            <td>{renderAction(batch)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
