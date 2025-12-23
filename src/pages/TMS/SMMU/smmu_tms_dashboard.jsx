// src/pages/TMS/SMMU/smmu_tms_dashboard.jsx
import React, { useEffect, useState, useContext, useRef } from "react";
import TmsLeftNav from "../layout/tms_LeftNav"; // switched to TmsLeftNav
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API, LOOKUP_API } from "../../../api/axios";
import { useNavigate } from "react-router-dom";

const GEOSCOPE_KEY = "ps_user_geoscope";
const DASHBOARD_CACHE_KEY = "tms_smmu_dashboard_cache_v1";

/**
 * Resolve an "effective" user id:
 *  - prefer user.id from AuthContext
 *  - then check localStorage geoscope.user_id (DashboardHome pattern)
 *  - fallback: return null (server-side will use token user)
 */
async function resolveEffectiveUserId(user) {
  if (user && (user.id || user.user_id)) {
    return user.id ?? user.user_id;
  }
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
 * Simple "random step" number animation hook.
 * Animates from 0 (or from fromVal) to toVal with small random increments.
 */
function useAnimatedNumber(toVal, ms = 900) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // animate only when toVal is number
    if (typeof toVal !== "number" || Number.isNaN(toVal)) {
      setDisplay(toVal);
      return;
    }
    // small no-op if value hasn't changed
    if (display === toVal && startedRef.current) return;

    const start = Date.now();
    const duration = ms;
    const from = Number(display) || 0;
    startedRef.current = true;

    function step() {
      const t = Math.min(1, (Date.now() - start) / duration);
      // ease-out-ish — use sqrt
      const eased = Math.sqrt(t);
      const current = Math.round(from + (toVal - from) * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        // ensure final
        setDisplay(toVal);
      }
    }
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toVal]);

  return display;
}

/**
 * SMMU Dashboard — KPIs + paginated Assigned Targets with progress column
 *
 * Only displays targets created by this SMMU user (uses created_by filter).
 * Uses caching for KPIs / lists in localStorage; a Refresh button forces re-fetch.
 */
export default function SmmuTmsDashboard() {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const [effectiveUserId, setEffectiveUserId] = useState(null);

  // real values
  const [kpis, setKpis] = useState({ themes: 0, plans: 0, partners: 0, targets: 0 });
  const [loadingKpis, setLoadingKpis] = useState(false);

  // animated displays
  const animThemes = useAnimatedNumber(kpis.themes, 900);
  const animPlans = useAnimatedNumber(kpis.plans, 900);
  const animPartners = useAnimatedNumber(kpis.partners, 900);
  const animTargets = useAnimatedNumber(kpis.targets, 900);

  // Assigned targets table
  const [targets, setTargets] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalTargets, setTotalTargets] = useState(0);

  // helpers: local cache of partners/plans/themes to map ids -> names
  const [partnersMap, setPartnersMap] = useState({});
  const [plansMap, setPlansMap] = useState({});
  const [themesList, setThemesList] = useState([]);

  // cache control state
  const [usingCache, setUsingCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // load effective user on mount, then load dashboard data (preferring cache)
  useEffect(() => {
    (async () => {
      const uid = await resolveEffectiveUserId(user);
      setEffectiveUserId(uid);

      // try read cache
      const cacheRaw = localStorage.getItem(DASHBOARD_CACHE_KEY);
      if (cacheRaw) {
        try {
          const parsed = JSON.parse(cacheRaw);
          if (parsed && parsed.kpis) {
            setKpis(parsed.kpis);
            setPartnersMap(parsed.partnersMap || {});
            setPlansMap(parsed.plansMap || {});
            setThemesList(parsed.themesList || []);
            setUsingCache(true);
          }
        } catch (e) {
          console.warn("dashboard cache corrupted — ignoring");
          localStorage.removeItem(DASHBOARD_CACHE_KEY);
        }
      }

      // fetch targets (scoped) always (so table is fresh) but KPIs may use cache
      await fetchTargets(page, pageSize, uid);
      // If we didn't load cache, fetch Kpis now
      if (!cacheRaw) {
        await fetchKpis(uid, true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // re-fetch targets when page / pageSize changes
  useEffect(() => {
    fetchTargets(page, pageSize, effectiveUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, effectiveUserId]);

  // ---------- API data fetching / caching ----------

  // fetch Kpis and supporting lists; if saveCache=true store results in localStorage
  async function fetchKpis(uidForTargets = null, saveCache = false) {
    setLoadingKpis(true);
    try {
      // 1) themes list (we need theme ids to call plans per-theme)
      const themesRes = await TMS_API.trainingThemes.list({ limit: 500 }); // get all themes
      const themes = (themesRes?.data?.results ?? themesRes?.results ?? []) || [];
      // 2) for each theme fetch plans (theme-specific)
      const plansCollected = [];
      for (const th of themes) {
        try {
          const resp = await TMS_API.trainingPlans.list({ theme: th.id, limit: 500 });
          const arr = (resp?.data?.results ?? resp?.results ?? []) || [];
          arr.forEach((p) => plansCollected.push(p));
        } catch (e) {
          console.warn("trainingPlans for theme", th.id, e);
        }
      }

      // 3) training partners (full list) to map ids->names and also count
      const partnersResp = await TMS_API.trainingPartners.list({ limit: 10000 });
      const partnersArr = (partnersResp?.data?.results ?? partnersResp?.results ?? []) || [];

      // 4) targets count (scoped to this smmu user)
      const targetsParams = uidForTargets ? { created_by: uidForTargets, limit: 1 } : { limit: 1 };
      const targetsRes = await TMS_API.trainingPartnerTargets.list(targetsParams);

      const newKpis = {
        themes: themes.length,
        plans: plansCollected.length,
        partners: partnersResp?.data?.count ?? partnersResp?.count ?? partnersArr.length,
        targets: targetsRes?.data?.count ?? targetsRes?.count ?? 0,
      };

      // build maps
      const pMap = {};
      partnersArr.forEach((p) => {
        pMap[p.id] = p;
      });
      const plMap = {};
      plansCollected.forEach((p) => {
        plMap[p.id] = p;
      });

      setKpis(newKpis);
      setPartnersMap(pMap);
      setPlansMap(plMap);
      setThemesList(themes);

      if (saveCache) {
        try {
          localStorage.setItem(
            DASHBOARD_CACHE_KEY,
            JSON.stringify({
              ts: Date.now(),
              kpis: newKpis,
              partnersMap: pMap,
              plansMap: plMap,
              themesList: themes,
            }),
          );
          setUsingCache(true);
        } catch (e) {
          console.warn("failed to write dashboard cache", e);
        }
      } else {
        // if we're refreshing explicitly, replace cache with latest
        try {
          localStorage.setItem(
            DASHBOARD_CACHE_KEY,
            JSON.stringify({
              ts: Date.now(),
              kpis: newKpis,
              partnersMap: pMap,
              plansMap: plMap,
              themesList: themes,
            }),
          );
          setUsingCache(false);
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.error("fetchKpis", err);
    } finally {
      setLoadingKpis(false);
    }
  }

  // fetch paginated targets (only those created_by effectiveUser)
  async function fetchTargets(pageToFetch = 1, limit = 10, uid = null) {
    setLoadingTargets(true);
    try {
      const offset = (pageToFetch - 1) * limit;
      const params = { limit, offset };
      if (uid) params.created_by = uid;

      const res = await TMS_API.trainingPartnerTargets.list(params);
      const data = res?.data ?? res;
      const results = data?.results ?? res?.results ?? [];

      // hydrate partner name & plan name from our maps (fallback to embedded fields)
      const hydrated = results.map((t) => {
        const partnerObj = partnersMap[t.partner] || (t.partner_obj || null);
        const planObj = plansMap[t.training_plan] || (t.training_plan_obj || null);
        return {
          ...t,
          partner_name: partnerObj?.name || t.partner_name || (partnerObj && (partnerObj.name)) || String(t.partner),
          training_plan_name: planObj?.training_name || t.training_plan_name || null,
        };
      });

      setTargets(hydrated);
      setTotalTargets(data?.count ?? res?.count ?? 0);

    } catch (err) {
      console.error("fetchTargets", err);
      setTargets([]);
      setTotalTargets(0);
    } finally {
      setLoadingTargets(false);
    }
  }

  // Refresh button: force re-fetch of APIs and update cache
  async function handleRefresh() {
    setRefreshing(true);
    try {
      const uid = effectiveUserId;
      // refetch everything and save into cache
      await fetchKpis(uid, true);
      // after kpis/partners/plans updated, fetch paginated targets so table is consistent
      await fetchTargets(page, pageSize, uid);
      setUsingCache(false);
    } catch (e) {
      console.error("dashboard refresh failed", e);
    } finally {
      setRefreshing(false);
    }
  }

  // small helper to compute progress column
  function computeProgress(t) {
    const achieved = t.achieved_count ?? t.achieved_batches ?? t.achieved ?? null;
    const target = t.target_count ?? null;
    if (achieved == null || target == null || target === 0) return "—";
    const pct = Math.round((Number(achieved) / Number(target)) * 100);
    return `${achieved}/${target} (${pct}%)`;
  }

  // UI variables
  const totalPages = Math.max(1, Math.ceil(totalTargets / pageSize));
  const cardStyle = { background: "#fff", borderRadius: 8, padding: 18, boxShadow: "0 2px 8px rgba(10,20,40,0.04)", minWidth: 160 };
  const small = { color: "#6c757d", fontSize: 13 };

  // render partner cell: prefer partner_name set on target, otherwise map lookup
  function renderPartnerName(t) {
    if (t.partner_name) return t.partner_name;
    const pid = t.partner;
    if (partnersMap && partnersMap[pid]) return partnersMap[pid].name || String(pid);
    return String(pid);
  }

  return (
    <div className="app-shell">
      <TmsLeftNav />
      <div className="main-area">
        <TopNav left={<div className="app-title">Pragati Setu — TMS (SMMU)</div>} />

        <main className="dashboard-main" style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "20px auto", padding: "0 16px" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>SMMU — Training Management</h2>
              <div style={{ marginLeft: "auto", color: "#6c757d", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 13 }}>{user?.first_name ? `Welcome, ${user.first_name}` : "Welcome"}</div>
                <button className="btn" onClick={handleRefresh} disabled={refreshing} style={{ padding: "6px 10px", borderRadius: 6 }}>
                  {refreshing ? "Refreshing…" : (usingCache ? "Refresh (reload APIs)" : "Refresh")}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
              <div style={cardStyle}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{loadingKpis ? "…" : animTargets}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>My Partner Targets</div>
                <div style={small}>Targets created by you</div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{loadingKpis ? "…" : animPlans}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Training Plans</div>
                <div style={small}>Available modules (theme-specific)</div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{loadingKpis ? "…" : animThemes}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Training Themes</div>
                <div style={small}>Theme categories</div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{loadingKpis ? "…" : animPartners}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>Training Partners</div>
                <div style={small}>Registered partners</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
              <div style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 1px 0 rgba(10,20,40,0.03)" }}>
                <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => navigate("/tms/smmu/partner-targets")} className="btn" style={{ background: "#0b2540", color: "#fff", padding: "8px 12px", borderRadius: 6 }}>
                    Create Partner Targets
                  </button>
                  <button onClick={() => navigate("/tms/training-plans")} className="btn" style={{ padding: "8px 12px", borderRadius: 6 }}>
                    Training Plans
                  </button>
                  <button onClick={() => navigate("/tms/training-themes")} className="btn" style={{ padding: "8px 12px", borderRadius: 6 }}>
                    Training Themes
                  </button>
                  <button onClick={() => navigate("/tms/smmu/batches")} className="btn" style={{ padding: "8px 12px", borderRadius: 6 }}>
                    All Training Batches
                  </button>
                </div>

                <div style={{ marginTop: 16 }}>
                  <h4 style={{ margin: "8px 0" }}>Recent activity</h4>
                  <div style={small}>No recent activity tracked yet — use the Create Partner Targets screen to assign targets to partners.</div>
                </div>
              </div>

              <aside style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 1px 0 rgba(10,20,40,0.03)" }}>
                <h4 style={{ marginTop: 0 }}>My Assigned Targets</h4>
                <div style={{ fontSize: 13, color: "#6c757d", marginBottom: 12 }}>Paginated list of targets created by you (progress = targets vs achieved).</div>

                <div style={{ maxHeight: 360, overflow: "auto", borderTop: "1px solid #f1f3f5", paddingTop: 8 }}>
                  {loadingTargets ? (
                    <div style={{ padding: 12, color: "#6c757d" }}>Loading targets…</div>
                  ) : targets.length ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #eef1f4" }}>
                          <th style={{ padding: "8px 6px" }}>Partner</th>
                          <th style={{ padding: "8px 6px" }}>Scope</th>
                          <th style={{ padding: "8px 6px", width: 120 }}>FY</th>
                          <th style={{ padding: "8px 6px", width: 140 }}>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {targets.map((t) => (
                          <tr key={t.id} style={{ borderBottom: "1px solid #fbfbfb" }}>
                            <td style={{ padding: "8px 6px" }}>{renderPartnerName(t)}</td>
                            <td style={{ padding: "8px 6px" }}>
                              {t.target_type}
                              {t.target_type === "MODULE" && (t.training_plan_name || (plansMap[t.training_plan] && plansMap[t.training_plan].training_name)) ? ` — ${t.training_plan_name || plansMap[t.training_plan].training_name}` : t.theme ? ` — ${t.theme}` : ""}
                              {t.target_type === "DISTRICT" && t.district_name ? ` — ${t.district_name}` : ""}
                            </td>
                            <td style={{ padding: "8px 6px" }}>{t.financial_year || "—"}</td>
                            <td style={{ padding: "8px 6px" }}>{computeProgress(t)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: 12, color: "#6c757d" }}>No assigned targets.</div>
                  )}
                </div>

                {/* pagination */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
                  <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "6px 8px", borderRadius: 6 }}>
                    Prev
                  </button>
                  <div style={small}>Page {page} / {totalPages}</div>
                  <button className="btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: "6px 8px", borderRadius: 6 }}>
                    Next
                  </button>
                  <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ marginLeft: "auto", padding: 6 }}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
