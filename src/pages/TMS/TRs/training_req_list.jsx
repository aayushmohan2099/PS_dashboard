// src/pages/TMS/TRs/training_req_list.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API } from "../../../api/axios";
import { getCanonicalRole } from "../../../utils/roleUtils";

const CACHE_KEY = "tms_training_requests_cache_v1";

function saveCache(payload) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), payload })
    );
  } catch (e) {}
}
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw).payload;
  } catch (e) {
    return null;
  }
}

export default function TrainingRequestList() {
  const { user } = useContext(AuthContext) || {};
  const role = getCanonicalRole(user || {});
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState(loadCache() || []);
  const [filters, setFilters] = useState({
    status: "",
    level: "",
    training_type: "",
    plan: "",
  });
  const [refreshToken, setRefreshToken] = useState(0);

  // fetch function
  async function fetchRequests(force = false) {
    setLoading(true);
    try {
      if (!force) {
        const cached = loadCache();
        if (cached && Array.isArray(cached) && cached.length > 0) {
          setRequests(cached);
          setLoading(false);
          return;
        }
      }

      // Build API params depending on role
      const params = { limit: 500 }; // bulk fetch
      // bmmu -> filter by block
      if (role === "bmmu") {
        const geo = JSON.parse(
          localStorage.getItem("ps_user_geoscope") || "null"
        );
        const blockId =
          user?.block_id ??
          user?.blockId ??
          geo?.blocks?.[0] ??
          geo?.block_id ??
          null;
        if (blockId) params.block = blockId;
      }
      // dmmu -> filter by district
      if (role === "dmmu") {
        const geo = JSON.parse(
          localStorage.getItem("ps_user_geoscope") || "null"
        );
        const districtId =
          user?.district_id ??
          user?.districtId ??
          geo?.districts?.[0] ??
          geo?.district_id ??
          null;
        if (districtId) params.district = districtId;
      }
      // training_partner -> created_by = user.id
      if (role === "training_partner") {
        params.created_by = user?.id ?? user?.user_id ?? null;
      }
      // For smmu we will fetch all and filter client-side by plans belonging to their theme(s)
      if (role === "smmu") {
        // We'll fetch training themes for expert=user, plans next, then filter requests response below
      }

      // actually call list (unfiltered for smmu; server-filter for bmmu/dmmu/tp)
      const resp = await TMS_API.trainingRequests.list(params);
      const payload = resp?.data ?? resp ?? {};
      let items = payload.results || payload.data || payload || [];

      // smmu: restrict to training plans of themes where expert=user
      if (role === "smmu") {
        try {
          // get themes where expert = user.id
          const tResp = await TMS_API.trainingThemes.list({
            expert: user?.id,
            limit: 500,
          });
          const themes = tResp?.data?.results || tResp?.data || tResp || [];
          const themeIds = (themes || []).map((t) => t.id).filter(Boolean);
          // fetch plans for these themes
          const plansResp = await TMS_API.trainingPlans.list({ limit: 500 });
          const allPlans =
            plansResp?.data?.results || plansResp?.data || plansResp || [];
          const planIds = (allPlans || [])
            .filter((p) => themeIds.includes(p.theme))
            .map((p) => p.id);
          if (planIds.length > 0) {
            items = (items || []).filter((r) =>
              planIds.includes(r.training_plan)
            );
          } else {
            items = [];
          }
        } catch (e) {
          console.warn("smmu plan filtering failed", e);
          items = [];
        }
      }

      setRequests(items || []);
      saveCache(items || []);
    } catch (e) {
      console.error("fetch training requests failed", e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  // Filtered view
  const filtered = useMemo(() => {
    return (requests || []).filter((r) => {
      if (
        filters.status &&
        String(r.status || "").toLowerCase() !==
          String(filters.status).toLowerCase()
      )
        return false;
      if (
        filters.level &&
        String(r.level || "").toLowerCase() !==
          String(filters.level).toLowerCase()
      )
        return false;
      if (
        filters.training_type &&
        String(r.training_type || "").toLowerCase() !==
          String(filters.training_type).toLowerCase()
      )
        return false;
      if (filters.plan && String(r.training_plan) !== String(filters.plan))
        return false;
      return true;
    });
  }, [requests, filters]);

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">Pragati Setu — Training Requests</div>
          }
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1200, margin: "20px auto" }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0 }}>Training Requests</h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.removeItem(CACHE_KEY);
                    setRefreshToken((t) => t + 1);
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>

            <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <label style={{ fontWeight: 700 }}>Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, status: e.target.value }))
                    }
                    className="input"
                  >
                    <option value="">All</option>
                    <option value="BATCHING">BATCHING</option>
                    <option value="PENDING">PENDING</option>
                    <option value="ONGOING">ONGOING</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: 700 }}>Level</label>
                  <select
                    value={filters.level}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, level: e.target.value }))
                    }
                    className="input"
                  >
                    <option value="">All</option>
                    <option value="BLOCK">BLOCK</option>
                    <option value="DISTRICT">DISTRICT</option>
                    <option value="STATE">STATE</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontWeight: 700 }}>Participant Type</label>
                  <select
                    value={filters.training_type}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        training_type: e.target.value,
                      }))
                    }
                    className="input"
                  >
                    <option value="">All</option>
                    <option value="BENEFICIARY">BENEFICIARY</option>
                    <option value="TRAINER">TRAINER</option>
                  </select>
                </div>

                <div
                  style={{ marginLeft: "auto", fontSize: 13, color: "#6c757d" }}
                >
                  {loading ? "Fetching requests…" : `${filtered.length} shown`}
                </div>
              </div>

              <div style={{ maxHeight: 520, overflow: "auto" }}>
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Plan</th>
                      <th>Type</th>
                      <th>Level</th>
                      <th>Status</th>
                      <th>Partner</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={8} className="muted">
                          No training requests found.
                        </td>
                      </tr>
                    ) : loading ? (
                      <tr>
                        <td colSpan={8}>
                          <div className="table-spinner">
                            Fetching requests…
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((r) => (
                        <tr key={r.id}>
                          <td>{r.id}</td>
                          <td>{r.training_plan || "-"}</td>
                          <td>{r.training_type || "-"}</td>
                          <td>{r.level || "-"}</td>
                          <td>{r.status || "-"}</td>
                          <td>{r.partner || "-"}</td>
                          <td>{r.created_by || "-"}</td>
                          <td>
                            <button
                              className="btn-sm btn-flat"
                              onClick={() =>
                                navigate(`/tms/training-requests/${r.id}`)
                              }
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
