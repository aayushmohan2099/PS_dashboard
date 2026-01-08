import React, { useEffect, useState, useRef, useContext } from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API, LOOKUP_API } from "../../../api/axios";
import { useNavigate } from "react-router-dom";
import LoadingModal from "../../../components/ui/LoadingModal";

const GEOSCOPE_KEY = "ps_user_geoscope";
const BMMU_CACHE_KEY = "tms_bmmu_dashboard_cache_v1";

/* ---------------------- resolve effective user ID ---------------------- */
async function resolveEffectiveUserId(user) {
  if (user?.id || user?.user_id) return user.id ?? user.user_id;

  try {
    const raw = localStorage.getItem(GEOSCOPE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.user_id) return parsed.user_id;
    }
  } catch (e) {}

  try {
    if (user?.id || user?.user_id) {
      const uid = user.id ?? user.user_id;
      const res = await LOOKUP_API.userGeoscopeByUserId(uid);
      const payload = res?.data ?? res;
      if (payload?.user_id) {
        try {
          localStorage.setItem(GEOSCOPE_KEY, JSON.stringify(payload));
        } catch (e) {}
        return payload.user_id;
      }
    }
  } catch (e) {}

  return null;
}

/* ---------------------- number animation hook ---------------------- */
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

    function tick() {
      const t = Math.min(1, (Date.now() - start) / ms);
      const eased = Math.sqrt(t);
      const val = Math.round(from + (toVal - from) * eased);
      setDisplay(val);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [toVal, ms]);

  return display;
}

/* ====================================================================== */
/*                     MAIN COMPONENT — BMMU DASHBOARD                     */
/* ====================================================================== */

export default function BmmuTmsDashboard() {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  /* State */
  const [effectiveUserId, setEffectiveUserId] = useState(null);
  const [blockId, setBlockId] = useState(null);

  const [kpis, setKpis] = useState({
    beneficiaries_trained: 0,
    trainers_trained: 0,
    trainings_in_block: 0,
  });

  const [loadingFull, setLoadingFull] = useState(true); // FULL-PAGE LOADER
  const [usingCache, setUsingCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* animated numbers */
  const animBeneficiaries = useAnimatedNumber(kpis.beneficiaries_trained, 900);
  const animTrainers = useAnimatedNumber(kpis.trainers_trained, 900);
  const animTrainings = useAnimatedNumber(kpis.trainings_in_block, 900);

  /* ------------------- INITIAL LOAD (ALL APIs before UI) ------------------- */
  useEffect(() => {
    (async () => {
      setLoadingFull(true);

      /* STEP 1 — Resolve user */
      const uid = await resolveEffectiveUserId(user);
      setEffectiveUserId(uid);

      /* STEP 2 — Load geoscope (block ID) */
      let bId = null;
      try {
        const raw = localStorage.getItem(GEOSCOPE_KEY);
        if (raw) {
          const geo = JSON.parse(raw);
          bId = geo?.blocks?.[0] ?? geo?.block_id ?? null;
        }
      } catch (e) {}

      if (!bId && uid) {
        try {
          const geoResp = await LOOKUP_API.userGeoscopeByUserId(uid);
          const payload = geoResp?.data ?? geoResp;
          if (payload) {
            try {
              localStorage.setItem(GEOSCOPE_KEY, JSON.stringify(payload));
            } catch (e) {}
            bId = payload?.blocks?.[0] ?? payload?.block_id ?? null;
          }
        } catch (e) {}
      }
      setBlockId(bId);

      /* STEP 3 — Check cache */
      let loadedFromCache = false;
      try {
        const raw = localStorage.getItem(BMMU_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.kpis) {
            setKpis(parsed.kpis);
            loadedFromCache = true;
            setUsingCache(true);
          }
        }
      } catch (e) {
        localStorage.removeItem(BMMU_CACHE_KEY);
      }

      /* STEP 4 — Fetch all KPIs fresh BEFORE showing dashboard */
      await fetchKpis(uid, true, bId); // always save cache on full load

      setUsingCache(false); // now showing fresh data

      /* STEP 5 — Now UI can appear */
      setLoadingFull(false);
    })();
  }, [user]);

  /* ---------------------------------------------------------------------- */
  /*                          FETCH KPIS API METHOD                         */
  /* ---------------------------------------------------------------------- */

  async function fetchKpis(uid, saveCache = false, blockOverride = null) {
    const bId = blockOverride ?? blockId;
    let beneficiariesCount = 0;
    let trainersCount = 0;
    let trainingsCount = 0;

    try {
      if (bId) {
        /* #1 beneficiaries trained */
        try {
          const res = await TMS_API.trainingRequestBeneficiaries.list({
            block: bId,
            limit: 1,
          });
          beneficiariesCount = res?.data?.count ?? res?.count ?? 0;
        } catch (e) {}

        /* #2 trainers trained */
        try {
          const res = await TMS_API.trainingRequestTrainers.list({
            block: bId,
            limit: 1,
          });
          trainersCount = res?.data?.count ?? res?.count ?? 0;
        } catch (e) {}
      }

      /* #3 trainings in your block (created_by) */
      try {
        const res = await TMS_API.trainingRequests.list({
          created_by: uid,
          limit: 1,
        });
        trainingsCount = res?.data?.count ?? res?.count ?? 0;
      } catch (e) {}

      const newKpis = {
        beneficiaries_trained: Number(beneficiariesCount),
        trainers_trained: Number(trainersCount),
        trainings_in_block: Number(trainingsCount),
      };

      setKpis(newKpis);

      if (saveCache) {
        localStorage.setItem(
          BMMU_CACHE_KEY,
          JSON.stringify({
            ts: Date.now(),
            kpis: newKpis,
            blockId: bId,
          })
        );
      }
    } catch (e) {
      console.error("fetchKpis failed", e);
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                              REFRESH BUTTON                             */
  /* ---------------------------------------------------------------------- */

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetchKpis(effectiveUserId, true, blockId);
      setUsingCache(false);
    } catch (e) {
      console.error("refresh error", e);
    }
    setRefreshing(false);
  }

  const cardStyle = {
    background: "#fff",
    borderRadius: 8,
    padding: 18,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    minWidth: 160,
  };
  const small = { color: "#6c757d", fontSize: 13 };

  /* ====================================================================== */
  /*                                   UI                                   */
  /* ====================================================================== */

  return (
    <>
      {/* FULL PREPARING DASHBOARD LOADER */}
      <LoadingModal
        open={loadingFull}
        title="Preparing Dashboard"
        message="Fetching block details and analytics…"
      />

      <div className="app-shell" style={{ opacity: loadingFull ? 0.15 : 1 }}>
        <LeftNav />

        <div className="main-area">
          <TopNav
            left={<div className="app-title">Pragati Setu — TMS (BMMU)</div>}
          />

          <main className="dashboard-main" style={{ padding: 18 }}>
            <div
              style={{
                maxWidth: 1100,
                margin: "20px auto",
                padding: "0 16px",
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h2 style={{ margin: 0 }}>BMMU — Training Management</h2>

                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    color: "#6c757d",
                  }}
                >
                  <div style={{ fontSize: 13 }}>
                    {user?.first_name
                      ? `Welcome, ${user.first_name}`
                      : "Welcome"}
                  </div>

                  <button
                    className="btn"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                    }}
                  >
                    {refreshing
                      ? "Refreshing…"
                      : usingCache
                        ? "Refresh (reload APIs)"
                        : "Refresh"}
                  </button>
                </div>
              </div>

              {/* KPI CARDS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                {/* Beneficiaries */}
                <div style={cardStyle}>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>
                    {animBeneficiaries}
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>
                    Beneficiaries trained
                  </div>
                  <div style={small}>
                    Total beneficiaries trained in your block
                  </div>
                </div>

                {/* Trainers */}
                <div style={cardStyle}>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>
                    {animTrainers}
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>
                    Trainers trained
                  </div>
                  <div style={small}>Total trainers trained in your block</div>
                </div>

                {/* Trainings */}
                <div style={cardStyle}>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>
                    {animTrainings}
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>
                    Trainings (your block)
                  </div>
                  <div style={small}>
                    Training requests created in your block
                  </div>
                </div>
              </div>

              {/* QUICK ACTIONS + NOTES */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 420px",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 8,
                    padding: 16,
                    boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Quick Actions</h3>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => navigate("/tms/create-training-request")}
                      className="btn"
                      style={{
                        background: "#0b2540",
                        color: "#fff",
                        padding: "8px 12px",
                        borderRadius: 6,
                      }}
                    >
                      Create New Training Request
                    </button>

                    <button
                      onClick={() => navigate("/tms/bmmu/training-requests")}
                      className="btn"
                      style={{ padding: "8px 12px", borderRadius: 6 }}
                    >
                      View All Training Requests
                    </button>

                    <button
                      onClick={() => navigate("/tms/bmmu/create-training-plan")}
                      className="btn"
                      style={{ padding: "8px 12px", borderRadius: 6 }}
                    >
                      Propose Training Plan
                    </button>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <h4 style={{ margin: "8px 0" }}>Info</h4>
                    <div style={small}>Block: {blockId ?? "—"}</div>
                  </div>
                </div>

                <aside
                  style={{
                    background: "#fff",
                    borderRadius: 8,
                    padding: 16,
                    boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
                  }}
                >
                  <h4 style={{ marginTop: 0 }}>Notes</h4>
                  <div style={small}>
                    This dashboard uses block-scoped analytics based on your
                    geoscope. If block is missing, fallback uses created_by
                    scoping.
                  </div>
                </aside>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
