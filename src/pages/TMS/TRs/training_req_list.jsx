// src/pages/TMS/TRs/training_req_list.jsx
import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API, LOOKUP_API } from "../../../api/axios";
import { getCanonicalRole } from "../../../utils/roleUtils";

const CACHE_KEY = "tms_training_requests_cache_v1";
const USER_MAP_KEY = "tms_user_map_v1";
const PARTNER_MAP_KEY = "tms_partner_map_v1";
const PLAN_MAP_KEY = "tms_plan_map_v1";
const TP_SELF_PARTNER_KEY = "tms_self_partner_id_v1";

/* ---------------- cache helpers ---------------- */

function saveCache(payload, meta = {}) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), payload, meta })
    );
  } catch {}
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
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

/* ---------------- partner resolver (SAFE & CACHED) ---------------- */

async function resolveTrainingPartnerIdForUser(userId) {
  if (!userId) return null;

  try {
    const cached = localStorage.getItem(TP_SELF_PARTNER_KEY);
    if (cached) return Number(cached);
  } catch {}

  try {
    const resp = await TMS_API.trainingPartners.list({
      search: userId,
      fields: "id",
    });

    const results = resp?.data?.results || [];
    const partnerId = results[0]?.id || null;

    if (partnerId) {
      try {
        localStorage.setItem(TP_SELF_PARTNER_KEY, String(partnerId));
      } catch {}
    }

    return partnerId;
  } catch (e) {
    console.warn("Partner resolution failed (will retry on refresh)");
    return null;
  }
}

/* ========================================================= */

export default function TrainingRequestList() {
  const { user } = useContext(AuthContext) || {};
  const role = getCanonicalRole(user || {});
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState(() => loadCache()?.payload || []);
  const [refreshToken, setRefreshToken] = useState(0);

  const [filters, setFilters] = useState({
    status: "",
    level: "",
    training_type: "",
  });

  const [userMap, setUserMap] = useState(() => loadMap(USER_MAP_KEY));
  const [partnerMap, setPartnerMap] = useState(() => loadMap(PARTNER_MAP_KEY));
  const [planMap, setPlanMap] = useState(() => loadMap(PLAN_MAP_KEY));

  const didRunRef = useRef(false);

  /* ---------------- geoscope ---------------- */

  async function ensureUserGeoscope() {
    try {
      const cached = JSON.parse(
        localStorage.getItem("ps_user_geoscope") || "null"
      );
      if (cached) return cached;
    } catch {}

    try {
      const resp = await LOOKUP_API.userGeoscopeByUserId(user?.id);
      if (resp?.data) {
        localStorage.setItem("ps_user_geoscope", JSON.stringify(resp.data));
        return resp.data;
      }
    } catch {}
    return null;
  }

  /* ---------------- lookup maps ---------------- */

  async function fetchAndStoreLookupMaps(items = []) {
    try {
      const userIds = new Set();
      const partnerIds = new Set();
      const planIds = new Set();

      items.forEach((r) => {
        if (r.created_by) userIds.add(r.created_by);
        if (r.partner) partnerIds.add(r.partner);
        if (r.training_plan) planIds.add(r.training_plan);
      });

      const missingUsers = [...userIds].filter((i) => !userMap[i]);
      const missingPartners = [...partnerIds].filter((i) => !partnerMap[i]);
      const missingPlans = [...planIds].filter((i) => !planMap[i]);

      const [users, partners, plans] = await Promise.all([
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
          missingPartners.map(async (id) => {
            const r = await TMS_API.trainingPartners.list({
              id,
              fields: "name",
            });
            return { id, v: r?.data?.results?.[0]?.name };
          })
        ),
        Promise.all(
          missingPlans.map(async (id) => {
            const r = await TMS_API.trainingPlans.list({
              id,
              fields: "training_name",
            });
            return {
              id,
              v: r?.data?.results?.[0]?.training_name,
            };
          })
        ),
      ]);

      const um = { ...userMap };
      users.forEach((x) => (um[x.id] = x.v));

      const pm = { ...partnerMap };
      partners.forEach((x) => (pm[x.id] = x.v));

      const plm = { ...planMap };
      plans.forEach((x) => (plm[x.id] = x.v));

      setUserMap(um);
      setPartnerMap(pm);
      setPlanMap(plm);

      saveMap(USER_MAP_KEY, um);
      saveMap(PARTNER_MAP_KEY, pm);
      saveMap(PLAN_MAP_KEY, plm);
    } catch {}
  }

  /* ---------------- main fetch ---------------- */

  async function fetchRequests(force = false) {
    if (!user?.id) return;

    setLoading(true);
    try {
      const params = { page_size: 500 };
      const geoscope = await ensureUserGeoscope();

      if (role === "bmmu" && geoscope?.blocks?.[0])
        params.block = geoscope.blocks[0];

      if (role === "dmmu" && geoscope?.districts?.[0])
        params.district = geoscope.districts[0];

      if (role === "training_partner") {
        const partnerId = await resolveTrainingPartnerIdForUser(user.id);
        if (!partnerId) {
          setRequests([]);
          setLoading(false);
          return;
        }
        params.partner = partnerId;
      }

      const resp = await TMS_API.trainingRequests.list(params);
      const items = resp?.data?.results || [];

      setRequests(items);
      saveCache(items, { userId: user.id, role });
      await fetchAndStoreLookupMaps(items);
    } catch (e) {
      console.error("fetch training requests failed", e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;
    fetchRequests(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  /* ---------------- filtered view ---------------- */

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filters.status && r.status !== filters.status) return false;
      if (filters.level && r.level !== filters.level) return false;
      if (filters.training_type && r.training_type !== filters.training_type)
        return false;
      return true;
    });
  }, [requests, filters]);

  /* ---------------- render helpers ---------------- */

  const renderUsername = (id) => userMap[id] || id || "-";
  const renderPartnerName = (id) => partnerMap[id] || id || "-";
  const renderTrainingName = (id) => planMap[id] || id || "-";

  /* ---------------- UI ---------------- */

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
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>Training Requests</h2>
              <div style={{ marginLeft: "auto" }}>
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.removeItem(CACHE_KEY);
                    localStorage.removeItem(TP_SELF_PARTNER_KEY);
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
                      <th>ID</th>
                      <th>Plan</th>
                      <th>Type</th>
                      <th>Level</th>
                      <th>Status</th>
                      <th>Partner</th>
                      <th>Created By</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8}>Loading…</td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8}>No training requests</td>
                      </tr>
                    ) : (
                      filtered.map((r) => (
                        <tr key={r.id}>
                          <td>{r.id}</td>
                          <td>{renderTrainingName(r.training_plan)}</td>
                          <td>{r.training_type}</td>
                          <td>{r.level}</td>
                          <td>{r.status}</td>
                          <td>{renderPartnerName(r.partner)}</td>
                          <td>{renderUsername(r.created_by)}</td>
                          <td>
                            <button
                              className="btn-sm btn-flat"
                              onClick={() => navigate(`/tms/tr-detail/${r.id}`)}
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
