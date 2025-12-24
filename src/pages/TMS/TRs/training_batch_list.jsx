// src/pages/TMS/TRs/training_batch_list.jsx
import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api, { TMS_API, LOOKUP_API } from "../../../api/axios";
import { getCanonicalRole } from "../../../utils/roleUtils";

const CACHE_KEY = "tms_training_batches_cache_v1";

function getCacheKey(requestIdOrScopeKey) {
  return `${CACHE_KEY}_${requestIdOrScopeKey || "no_req"}`;
}

/* ---------------- cache helpers ---------------- */

function saveCache(requestIdOrScopeKey, payload, meta = {}) {
  try {
    localStorage.setItem(
      getCacheKey(requestIdOrScopeKey),
      JSON.stringify({ ts: Date.now(), payload, meta })
    );
  } catch {}
}

function loadCache(requestIdOrScopeKey) {
  try {
    const raw = localStorage.getItem(getCacheKey(requestIdOrScopeKey));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ========================================================= */

export default function TrainingBatchList() {
  const { user } = useContext(AuthContext) || {};
  const { id: requestId } = useParams();
  const navigate = useNavigate();
  const role = getCanonicalRole(user || {});

  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState(() => {
    const scopeKey = requestId || getScopeKey();
    return loadCache(scopeKey)?.payload || [];
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const didRunRef = useRef(false);

  /* ---------------- scope helpers ---------------- */

  function getUserGeoscope() {
    try {
      const raw = localStorage.getItem("user-geoscope");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function getScopeKey() {
    if (requestId) return requestId;

    const geoscope = getUserGeoscope() || {};
    const blockId =
      geoscope.block_id ||
      geoscope.blockId ||
      geoscope.block ||
      geoscope?.block?.block_id;
    const districtId =
      geoscope.district_id ||
      geoscope.districtId ||
      geoscope.district ||
      geoscope?.district?.district_id;

    if (role === "bmmu" && blockId) return `bmmu_block_${blockId}`;
    if (role === "dmmu" && districtId) return `dmmu_district_${districtId}`;
    return "no_req";
  }

  function getScopeParams() {
    if (requestId) {
      return {
        params: { request: requestId, page_size: 500 },
        titleSuffix: ` (Request #${requestId})`,
      };
    }

    const geoscope = getUserGeoscope() || {};
    const blockId =
      geoscope.block_id ||
      geoscope.blockId ||
      geoscope.block ||
      geoscope?.block?.block_id;
    const districtId =
      geoscope.district_id ||
      geoscope.districtId ||
      geoscope.district ||
      geoscope?.district?.district_id;

    if (role === "bmmu" && blockId) {
      return {
        params: { block_id: blockId, page_size: 500 },
        titleSuffix: ` (Block Batches)`,
      };
    }

    if (role === "dmmu" && districtId) {
      return {
        params: { district_id: districtId, page_size: 500 },
        titleSuffix: ` (District Batches)`,
      };
    }

    return {
      params: { page_size: 500 },
      titleSuffix: "",
    };
  }

  async function fetchThemeIdForSMMU() {
    if (!user?.id) return null;
    try {
      const resp = await TMS_API.trainingThemes.list({
        expert: user.id,
        page_size: 1,
      });
      return resp?.data?.results?.[0]?.id || null;
    } catch {
      return null;
    }
  }

  /* ---------------- main fetch ---------------- */

  async function fetchBatches() {
    if (!user?.id) return;

    setLoading(true);
    try {
      let params = getScopeParams().params;

      // SMMU: use theme_id when no specific request
      if (!requestId && role === "smmu") {
        const themeId = await fetchThemeIdForSMMU();
        if (themeId) {
          params = { theme_id: themeId, page_size: 500 };
        }
      }

      const queryString = new URLSearchParams(params).toString();
      const resp = await api.get(`/tms/batches-list/?${queryString}`);
      const items = resp?.data?.results || [];

      const scopeKey = getScopeKey();
      setBatches(items);
      saveCache(scopeKey, items, { userId: user.id, role, params });
    } catch (e) {
      console.error("fetch batches failed", e);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user?.id) return;

    const scopeKey = getScopeKey();
    const cached = loadCache(scopeKey);
    if (cached && !refreshToken) {
      setBatches(cached.payload || []);
    }

    if (didRunRef.current && refreshToken === 0) return;
    didRunRef.current = true;

    fetchBatches();
  }, [requestId, refreshToken, user?.id, role]);

  /* ---------------- render helpers ---------------- */

  const renderCentreName = (centre) => {
    if (!centre) return "-";
    return centre.venue_name || centre.partner?.name || centre.id || "-";
  };

  const { titleSuffix } = getScopeParams();

  /* ---------------- UI ---------------- */

  const handleRefresh = () => {
    const scopeKey = getScopeKey();
    localStorage.removeItem(getCacheKey(scopeKey));
    setRefreshToken((t) => t + 1);
    setBatches([]);
  };

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
              <h2 style={{ margin: 0 }}>Training Batches{titleSuffix}</h2>
              <div style={{ marginLeft: "auto" }}>
                <button className="btn" onClick={handleRefresh}>
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
                      <th>Participant Type</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Batch Type</th>
                      <th>Centre</th>
                      <th>Training Partner</th>
                      <th>Block</th>
                      <th>District</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={12}
                          style={{ textAlign: "center", padding: "40px" }}
                        >
                          <div>Loading batches...</div>
                        </td>
                      </tr>
                    ) : batches.length === 0 ? (
                      <tr>
                        <td colSpan={12}>
                          No batches found
                          {requestId ? " for this training request" : ""}
                        </td>
                      </tr>
                    ) : (
                      batches.map((batch, index) => (
                        <tr key={batch.id}>
                          <td>{index + 1}</td>
                          <td>{batch.code}</td>
                          <td>{batch.status}</td>
                          <td>{batch.request?.training_type || "-"}</td>
                          <td>{batch.start_date}</td>
                          <td>{batch.end_date}</td>
                          <td>{batch.batch_type}</td>
                          <td>{renderCentreName(batch.centre)}</td>
                          <td>{batch.centre?.partner?.name || "-"}</td>
                          <td>{batch.request?.block?.block_name_en || "-"}</td>
                          <td>
                            {batch.request?.district?.district_name_en || "-"}
                          </td>
                          <td>
                            <button
                              className="btn-sm btn-flat"
                              onClick={() =>
                                navigate(`/tms/batch-detail/${batch.id}`)
                              }
                            >
                              View
                            </button>
                            <button
                              className="btn-sm btn-flat"
                              onClick={() =>
                                navigate(`/tms/batch-certificate/${batch.id}`)
                              }
                            >
                              Closure
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
