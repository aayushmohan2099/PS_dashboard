// src/pages/TMS/TRs/training_batch_list.jsx
import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API, LOOKUP_API } from "../../../api/axios";
import { getCanonicalRole } from "../../../utils/roleUtils";

const CACHE_KEY = "tms_training_batches_cache_v1";
const USER_MAP_KEY = "tms_batch_user_map_v1";
const CENTRE_MAP_KEY = "tms_centre_map_v1";

function getCacheKey(requestId) {
  return `${CACHE_KEY}_${requestId}`;
}

/* ---------------- cache helpers ---------------- */

function saveCache(requestId, payload, meta = {}) {
  try {
    localStorage.setItem(
      getCacheKey(requestId),
      JSON.stringify({ ts: Date.now(), payload, meta })
    );
  } catch {}
}

function loadCache(requestId) {
  try {
    const raw = localStorage.getItem(getCacheKey(requestId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadMap(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function saveMap(key, map) {
  try {
    localStorage.setItem(key, JSON.stringify(map || {}));
  } catch {}
}

/* ========================================================= */

export default function TrainingBatchList() {
  const { user } = useContext(AuthContext) || {};
  const { id: requestId } = useParams();
  const navigate = useNavigate();
  const role = getCanonicalRole(user || {});

  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState(() => {
    if (requestId) {
      return loadCache(requestId)?.payload || [];
    }
    return [];
  });
  const [refreshToken, setRefreshToken] = useState(0);

  const [userMap, setUserMap] = useState(() => loadMap(USER_MAP_KEY));
  const [centreMap, setCentreMap] = useState(() => loadMap(CENTRE_MAP_KEY));

  const didRunRef = useRef(false);

  /* ---------------- lookup maps ---------------- */

  async function fetchAndStoreLookupMaps(items = []) {
    try {
      const userIds = new Set();
      const centreIds = new Set();

      items.forEach((b) => {
        if (b.created_by) userIds.add(b.created_by);
        if (b.centre) centreIds.add(b.centre);
      });

      const missingUsers = [...userIds].filter((i) => !userMap[i]);
      const missingCentres = [...centreIds].filter((i) => !centreMap[i]);

      const [users, centres] = await Promise.all([
        Promise.all(
          missingUsers.map(async (id) => {
            const r = await LOOKUP_API.users.list({
              search: id,
              fields: "username",
            });
            return { id, v: r?.data?.results?.[0]?.username };
          })
        ),
        Promise.all(
          missingCentres.map(async (id) => {
            const r = await TMS_API.trainingPartnerCentres.list({
              id,
              fields: "name",
            });
            return { id, v: r?.data?.results?.[0]?.name };
          })
        ),
      ]);

      const um = { ...userMap };
      users.forEach((x) => (um[x.id] = x.v));

      const cm = { ...centreMap };
      centres.forEach((x) => (cm[x.id] = x.v));

      setUserMap(um);
      setCentreMap(cm);

      saveMap(USER_MAP_KEY, um);
      saveMap(CENTRE_MAP_KEY, cm);
    } catch {}
  }

  /* ---------------- main fetch ---------------- */

  async function fetchBatches(force = false) {
    if (!requestId || !user?.id) return;

    setLoading(true);
    try {
      const params = { 
        request: requestId,
        page_size: 500 
      };

      const resp = await TMS_API.batches.list(params);
      const items = resp?.data?.results || [];

      setBatches(items);
      saveCache(requestId, items, { userId: user.id, role });
      await fetchAndStoreLookupMaps(items);
    } catch (e) {
      console.error("fetch batches failed", e);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!requestId) {
      navigate('/tms/training-requests');
      return;
    }

    if (didRunRef.current) return;
    didRunRef.current = true;
    
    // Try to load fresh cache first
    const cached = loadCache(requestId);
    if (cached && !refreshToken) {
      setBatches(cached.payload || []);
      fetchAndStoreLookupMaps(cached.payload || []);
    }
    
    fetchBatches(false);
  }, [requestId, refreshToken]);

  /* ---------------- render helpers ---------------- */

  const renderUsername = (id) => userMap[id] || id || "-";
  const renderCentreName = (id) => centreMap[id] || id || "-";

  /* ---------------- UI ---------------- */

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">Pragati Setu — Training Batches</div>
          }
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1200, margin: "20px auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>Training Batches (Request #{requestId})</h2>
              <div style={{ marginLeft: "auto" }}>
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.removeItem(getCacheKey(requestId));
                    setRefreshToken((t) => t + 1);
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>

            <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
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
                      <th>Created By</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "40px" }}>
                          <div>Loading batches...</div>
                        </td>
                      </tr>
                    ) : batches.length === 0 ? (
                      <tr>
                        <td colSpan={9}>No batches found for this training request</td>
                      </tr>
                    ) : (
                      batches.map((batch, index) => (
                        <tr key={batch.id}>
                          <td>{index + 1}</td>
                          <td>{batch.code}</td>
                          <td>{batch.status}</td>
                          <td>{batch.start_date}</td>
                          <td>{batch.end_date}</td>
                          <td>{batch.batch_type}</td>
                          <td>{renderCentreName(batch.centre)}</td>
                          <td>{renderUsername(batch.created_by)}</td>
                          <td>
                            <button
                              className="btn-sm btn-flat"
                              onClick={() => navigate(`/tms/batch-detail/${batch.id}`)}
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
