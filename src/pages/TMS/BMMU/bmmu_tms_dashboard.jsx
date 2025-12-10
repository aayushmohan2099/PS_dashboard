// src/pages/TMS/BMMU/bmmu_tms_dashboard.jsx
import React, { useEffect, useState, useRef, useContext } from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API, LOOKUP_API } from "../../../api/axios";
import { useNavigate } from "react-router-dom";

const GEOSCOPE_KEY = "ps_user_geoscope";
const BMMU_CACHE_KEY = "tms_bmmu_dashboard_cache_v1";

/**
 * Resolve effective user id & attempt to load cached geoscope if present.
 */
async function resolveEffectiveUserId(user) {
  if (user && (user.id || user.user_id)) return user.id ?? user.user_id;
  try {
    const raw = window.localStorage.getItem(GEOSCOPE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.user_id) return parsed.user_id;
    }
  } catch (e) {
    // ignore
  }
  try {
    const uid = user?.id ?? user?.user_id ?? null;
    if (uid) {
      const res = await LOOKUP_API.userGeoscopeByUserId(uid);
      const payload = res?.data ?? res;
      if (payload) {
        try { window.localStorage.setItem(GEOSCOPE_KEY, JSON.stringify(payload)); } catch (e) {}
        if (payload.user_id) return payload.user_id;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Lightweight animated number hook (ease-out-ish)
 */
function useAnimatedNumber(toVal, ms = 900) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const prevRef = useRef(0);

  useEffect(() => {
    if (typeof toVal !== "number" || Number.isNaN(toVal)) {
      setDisplay(toVal);
      prevRef.current = toVal;
      return;
    }
    const from = Number(prevRef.current) || 0;
    prevRef.current = toVal;
    const start = Date.now();
    const duration = ms;

    function step() {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = Math.sqrt(t);
      const current = Math.round(from + (toVal - from) * eased);
      setDisplay(current);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else setDisplay(toVal);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [toVal, ms]);

  return display;
}

export default function BmmuTmsDashboard() {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const [effectiveUserId, setEffectiveUserId] = useState(null);
  const [blockId, setBlockId] = useState(null);

  const [kpis, setKpis] = useState({
    beneficiaries_trained: 0,
    trainers_trained: 0,
    trainings_in_block: 0,
  });
  const [loading, setLoading] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // animated displays
  const animBeneficiaries = useAnimatedNumber(kpis.beneficiaries_trained, 900);
  const animTrainers = useAnimatedNumber(kpis.trainers_trained, 900);
  const animTrainings = useAnimatedNumber(kpis.trainings_in_block, 900);

  // try load cache and initial fetch
  useEffect(() => {
    (async () => {
      const uid = await resolveEffectiveUserId(user);
      setEffectiveUserId(uid);

      // try get block id from geoscope (cached) first
      try {
        const geoRaw = localStorage.getItem(GEOSCOPE_KEY);
        if (geoRaw) {
          const geo = JSON.parse(geoRaw);
          if (geo?.blocks && geo.blocks.length > 0) setBlockId(geo.blocks[0]);
          else if (geo?.block_id) setBlockId(geo.block_id);
        }
      } catch (e) {
        // ignore
      }

      // try read dashboard cache
      const cacheRaw = localStorage.getItem(BMMU_CACHE_KEY);
      if (cacheRaw) {
        try {
          const parsed = JSON.parse(cacheRaw);
          if (parsed && parsed.kpis) {
            setKpis(parsed.kpis);
            setBlockId((b) => b ?? parsed.blockId ?? null);
            setUsingCache(true);
          }
        } catch (e) {
          console.warn("bmmu cache corrupted — ignoring");
          localStorage.removeItem(BMMU_CACHE_KEY);
        }
      }

      // if block not known from cache, try fetch geoscope now
      if (!blockId && uid) {
        try {
          const geoResp = await LOOKUP_API.userGeoscopeByUserId(uid);
          const payload = geoResp?.data ?? geoResp;
          if (payload) {
            try { localStorage.setItem(GEOSCOPE_KEY, JSON.stringify(payload)); } catch (e) {}
            if (payload.blocks && payload.blocks.length > 0) setBlockId(payload.blocks[0]);
            else if (payload.block_id) setBlockId(payload.block_id);
          }
        } catch (e) {
          // ignore
        }
      }

      // fetch counts (either use cache or call APIs) — targets/training lists need block
      // Always fetch the table-level items fresh; for KPIs we can use cache or fetch.
      if (!cacheRaw) {
        await fetchKpis(uid, true);
      } else {
        // still fetch kpis in background but do not overwrite cache unless explicit refresh
        fetchKpis(uid, false).catch(() => {});
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // fetch and cache KPIs
  async function fetchKpis(uid = null, saveCache = false) {
    setLoading(true);
    try {
      // Resolve block id if not present
      let bId = blockId;
      if (!bId && uid) {
        try {
          const geoResp = await LOOKUP_API.userGeoscopeByUserId(uid);
          const payload = geoResp?.data ?? geoResp;
          if (payload) {
            try { localStorage.setItem(GEOSCOPE_KEY, JSON.stringify(payload)); } catch (e) {}
            if (payload.blocks && payload.blocks.length > 0) bId = payload.blocks[0];
            else if (payload.block_id) bId = payload.block_id;
            setBlockId(bId);
          }
        } catch (e) {
          // ignore
        }
      }

      // If still no block id, we can't fetch block-scoped counts — set zeros
      let beneficiariesCount = 0;
      let trainersCount = 0;
      let trainingsCount = 0;

      if (bId) {
        // beneficiaries trained in your block
        try {
          const resp = await TMS_API.trainingRequestBeneficiaries.list({ block: bId, limit: 1 });
          beneficiariesCount = resp?.data?.count ?? resp?.count ?? 0;
        } catch (e) {
          console.warn("fetch beneficiaries count failed", e);
        }

        // trainers trained in your block
        try {
          const resp = await TMS_API.trainingRequestTrainers.list({ block: bId, limit: 1 });
          trainersCount = resp?.data?.count ?? resp?.count ?? 0;
        } catch (e) {
          console.warn("fetch trainers count failed", e);
        }
      } else {
        // if block unknown, attempt to fetch by user scope: some installs may use created_by scoping
        if (uid) {
          try {
            const resp = await TMS_API.trainingRequests.list({ created_by: uid, limit: 1 });
            trainingsCount = resp?.data?.count ?? resp?.count ?? 0;
          } catch (e) {
            console.warn("fetch trainings by created_by failed", e);
          }
        }
      }

      // trainings in your block (created_by = user to get ones they created)
      try {
        const resp = await TMS_API.trainingRequests.list(uid ? { created_by: uid, limit: 1 } : { limit: 1 });
        const createdCount = resp?.data?.count ?? resp?.count ?? 0;
        // prefer block-specific trainingsCount if we have block
        trainingsCount = trainingsCount || createdCount;
      } catch (e) {
        // ignore
      }

      const newKpis = {
        beneficiaries_trained: Number(beneficiariesCount) || 0,
        trainers_trained: Number(trainersCount) || 0,
        trainings_in_block: Number(trainingsCount) || 0,
      };

      setKpis(newKpis);

      if (saveCache) {
        try {
          localStorage.setItem(BMMU_CACHE_KEY, JSON.stringify({ ts: Date.now(), kpis: newKpis, blockId: bId }));
          setUsingCache(true);
        } catch (e) {
          console.warn("failed to write bmmu cache", e);
        }
      }
    } catch (err) {
      console.error("fetchKpis", err);
    } finally {
      setLoading(false);
    }
  }

  // Refresh button handler — force re-fetch and overwrite cache
  async function handleRefresh() {
    setRefreshing(true);
    try {
      const uid = effectiveUserId;
      await fetchKpis(uid, true);
      setUsingCache(false);
    } catch (e) {
      console.error("bmmu refresh failed", e);
    } finally {
      setRefreshing(false);
    }
  }

  const cardStyle = { background: "#fff", borderRadius: 8, padding: 18, boxShadow: "0 2px 8px rgba(10,20,40,0.04)", minWidth: 160 };
  const small = { color: "#6c757d", fontSize: 13 };

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav left={<div className="app-title">Pragati Setu — TMS (BMMU)</div>} />

        <main className="dashboard-main" style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "20px auto", padding: "0 16px" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>BMMU — Training Management</h2>
              <div style={{ marginLeft: "auto", color: "#6c757d", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 13 }}>{user?.first_name ? `Welcome, ${user.first_name}` : "Welcome"}</div>
                <button className="btn" onClick={handleRefresh} disabled={refreshing} style={{ padding: "6px 10px", borderRadius: 6 }}>
                  {refreshing ? "Refreshing…" : (usingCache ? "Refresh (reload APIs)" : "Refresh")}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 18 }}>
              <div style={cardStyle}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{loading ? "…" : animBeneficiaries}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Beneficiaries trained</div>
                <div style={small}>Total beneficiaries trained in your block</div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{loading ? "…" : animTrainers}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Trainers trained</div>
                <div style={small}>Total trainers trained in your block</div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{loading ? "…" : animTrainings}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Trainings (your block)</div>
                <div style={small}>Training requests / sessions created in your block</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
              <div style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 1px 0 rgba(10,20,40,0.03)" }}>
                <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => navigate("/tms/create-training-request")} className="btn" style={{ background: "#0b2540", color: "#fff", padding: "8px 12px", borderRadius: 6 }}>
                    Create New Training Request
                  </button>
                  <button onClick={() => navigate("/tms/bmmu/training-requests")} className="btn" style={{ padding: "8px 12px", borderRadius: 6 }}>
                    View All Training Requests
                  </button>
                  <button onClick={() => navigate("/tms/bmmu/create-training-plan")} className="btn" style={{ padding: "8px 12px", borderRadius: 6 }}>
                    Propose Training Plan
                  </button>
                </div>

                <div style={{ marginTop: 16 }}>
                  <h4 style={{ margin: "8px 0" }}>Info</h4>
                  <div style={small}>Block: {blockId ?? "—"}</div>
                </div>
              </div>

              <aside style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 1px 0 rgba(10,20,40,0.03)" }}>
                <h4 style={{ marginTop: 0 }}>Notes</h4>
                <div style={small}>This dashboard shows block-scoped analytics (uses your geoscope). If block is not detected, counts fallback to created_by scoping where possible.</div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
