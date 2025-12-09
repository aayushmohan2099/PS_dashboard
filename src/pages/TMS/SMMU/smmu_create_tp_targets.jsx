// src/pages/TMS/SMMU/smmu_create_tp_targets.jsx
import React, { useEffect, useState, useContext, useMemo } from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API, LOOKUP_API } from "../../../api/axios";
import { getAccessToken } from "../../../utils/storage"; // used for JWT decode display

const GEOSCOPE_KEY = "ps_user_geoscope";
const PLANS_CACHE_KEY = "tms_plans_cache_v1";

/** Small JWT decoder (non-crypto) to inspect payload client-side */
function decodeJwt(token = "") {
  try {
    const parts = (token || "").split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch (e) {
    return null;
  }
}

export default function SmmuCreatePartnerTargets() {
  const { user } = useContext(AuthContext) || {};

  // resolved ids
  const [effectiveUserId, setEffectiveUserId] = useState(null);
  const [tokenUserId, setTokenUserId] = useState(null);
  const accessToken = getAccessToken();

  // lists and state
  const [themes, setThemes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [partners, setPartners] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [searchQ, setSearchQ] = useState("");
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [loading, setLoading] = useState({
    themes: false,
    plans: false,
    partners: false,
    districts: false,
    targets: false,
    refresh: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  const [editingTarget, setEditingTarget] = useState(null);

  const [form, setForm] = useState({
    partner_id: "",
    target_type: "MODULE",
    training_plan_id: "",
    district_id: "",
    theme: "",
    target_count: "",
    financial_year: "2023-24",
    notes: "",
  });

  const [assignedTargets, setAssignedTargets] = useState([]);
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedPageSize, setAssignedPageSize] = useState(10);
  const [assignedTotal, setAssignedTotal] = useState(0);

  // map helpers
  const plansById = useMemo(() => {
    const m = {};
    plans.forEach((p) => (m[p.id] = p));
    return m;
  }, [plans]);

  const partnersById = useMemo(() => {
    const m = {};
    partners.forEach((p) => (m[p.id] = p));
    return m;
  }, [partners]);

  // assigned plan -> target info map (for highlighting)
  const assignedPlanMap = useMemo(() => {
    // map planId -> { partnerId, partnerName, targetId }
    const m = {};
    assignedTargets.forEach((t) => {
      const pid = t.training_plan || t.training_plan_id || null;
      if (!pid) return;
      m[pid] = {
        partnerId: t.partner,
        partnerName: partnersById[t.partner]?.name || t.partner_name || null,
        targetId: t.id,
      };
    });
    return m;
  }, [assignedTargets, partnersById]);

  // decode token on mount (to show token's user)
  useEffect(() => {
    if (accessToken) {
      const decoded = decodeJwt(accessToken);
      const tid = decoded?.user_id ?? decoded?.user ?? decoded?.sub ?? null;
      setTokenUserId(tid != null ? String(tid) : null);
    } else {
      setTokenUserId(null);
    }
  }, [accessToken]);

  // Resolve effective user id (try user object then geoscope -> DashboardHome pattern)
  async function resolveUserId() {
    const candidate = user?.id ?? user?.user_id ?? user?.TH_urid ?? null;
    if (candidate) {
      setEffectiveUserId(candidate);
      return candidate;
    }

    try {
      const raw = window.localStorage.getItem(GEOSCOPE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.user_id) {
          setEffectiveUserId(parsed.user_id);
          return parsed.user_id;
        }
      }
    } catch (e) {
      // ignore corrupted localStorage
    }

    const uid = user?.id ?? user?.user_id ?? null;
    if (uid) {
      try {
        setLoading((s) => ({ ...s, refresh: true }));
        const res = await LOOKUP_API.userGeoscopeByUserId(uid);
        const payload = res?.data ?? res;
        if (payload) {
          try {
            window.localStorage.setItem(GEOSCOPE_KEY, JSON.stringify(payload));
          } catch (e) {}
          if (payload.user_id) {
            setEffectiveUserId(payload.user_id);
            return payload.user_id;
          }
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading((s) => ({ ...s, refresh: false }));
      }
    }

    setEffectiveUserId(uid);
    return uid;
  }

  // On mount: try to load cached plans; fetch other small lists and assigned targets
  useEffect(() => {
    (async () => {
      await resolveUserId();

      // load plans cache if present
      const cacheRaw = localStorage.getItem(PLANS_CACHE_KEY);
      if (cacheRaw) {
        try {
          const parsed = JSON.parse(cacheRaw);
          if (parsed && Array.isArray(parsed.plans)) {
            setPlans(parsed.plans);
            setThemes(parsed.themes || []);
            console.debug("Loaded plans/themes from cache");
          }
        } catch (e) {
          console.warn("plans cache corrupted, ignoring", e);
          localStorage.removeItem(PLANS_CACHE_KEY);
        }
      } else {
        // no cache: fetch themes & plans now (first-time)
        await fetchThemesAndPlans(); // also writes cache on success
      }

      // fetch partners/districts and assigned targets (for highlighting)
      await Promise.all([fetchPartners(), fetchDistricts(), fetchAssignedTargetsForHighlight()]);
      // fetch paginated assigned targets for right panel
      await fetchAssignedTargets(1, assignedPageSize);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered plans when search changes
  useEffect(() => {
    const q = (searchQ || "").trim().toLowerCase();
    setFilteredPlans(
      plans.filter((p) => {
        const txt = `${p.training_name || ""} ${p.type_of_training || ""} ${p.level_of_training || ""} ${p.theme_name || ""}`.toLowerCase();
        return !q || txt.includes(q);
      })
    );
  }, [plans, searchQ]);

  // refresh assigned targets when page changes
  useEffect(() => {
    fetchAssignedTargets(assignedPage, assignedPageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedPage, assignedPageSize]);

  async function loadInitial() {
    setLoading((s) => ({ ...s, refresh: true }));
    try {
      await Promise.all([fetchThemesAndPlans(true), fetchPartners(), fetchDistricts(), fetchAssignedTargetsForHighlight()]);
      await fetchAssignedTargets(1, assignedPageSize);
    } finally {
      setLoading((s) => ({ ...s, refresh: false }));
    }
  }

  /**
   * Fetch themes + plans and write to cache.
   * If `force=false` this is same as before; if `force=true` will re-run regardless.
   */
  async function fetchThemesAndPlans(force = false) {
    setLoading((s) => ({ ...s, themes: true, plans: true }));
    try {
      // If we already have plans in state and force===false, skip (caller chooses)
      if (!force && plans && plans.length > 0) {
        setLoading((s) => ({ ...s, themes: false, plans: false }));
        return;
      }

      const expert = effectiveUserId || user?.id || user?.user_id || null;
      const themesResp = await TMS_API.trainingThemes.list({ expert, limit: 200 });
      const themesData = themesResp?.data ?? themesResp;
      const themeResults = themesData?.results || [];
      setThemes(themeResults);

      const collected = [];
      for (const th of themeResults) {
        try {
          const pResp = await TMS_API.trainingPlans.list({ theme: th.id, limit: 500 });
          const pData = pResp?.data ?? pResp;
          const pResults = pData?.results || [];
          pResults.forEach((p) => {
            collected.push({
              id: p.id,
              training_name: p.training_name,
              type_of_training: p.type_of_training,
              level_of_training: p.level_of_training,
              no_of_days: p.no_of_days,
              theme_id: th.id,
              theme_name: th.theme_name,
              raw: p,
            });
          });
        } catch (e) {
          console.warn("fetchPlans for theme", th?.id, e);
        }
      }
      setPlans(collected);

      // write cache
      try {
        localStorage.setItem(PLANS_CACHE_KEY, JSON.stringify({ ts: Date.now(), themes: themeResults, plans: collected }));
      } catch (e) {
        console.warn("Failed to write plans cache", e);
      }
    } catch (err) {
      console.error("fetchThemesAndPlans", err);
      setThemes([]);
      setPlans([]);
    } finally {
      setLoading((s) => ({ ...s, themes: false, plans: false }));
    }
  }

  async function fetchPartners() {
    setLoading((s) => ({ ...s, partners: true }));
    try {
      const res = await TMS_API.trainingPartners.list({ limit: 500 });
      const data = res?.data ?? res;
      setPartners(data?.results || []);
    } catch (err) {
      console.error("fetchPartners", err);
      setPartners([]);
    } finally {
      setLoading((s) => ({ ...s, partners: false }));
    }
  }

  async function fetchDistricts() {
    setLoading((s) => ({ ...s, districts: true }));
    try {
      const res = await LOOKUP_API.districts.list({ limit: 500 });
      const data = res?.data ?? res;
      setDistricts(data?.results || []);
    } catch (err) {
      console.warn("fetchDistricts", err);
      setDistricts([]);
    } finally {
      setLoading((s) => ({ ...s, districts: false }));
    }
  }

  /**
   * Fetch a paginated list for the right-hand assigned list (paged)
   */
  async function fetchAssignedTargets(page = 1, pageSize = 10) {
    setLoading((s) => ({ ...s, targets: true }));
    try {
      const offset = (page - 1) * pageSize;
      const res = await TMS_API.trainingPartnerTargets.list({ limit: pageSize, offset });
      const data = res?.data ?? res;
      const results = data?.results || [];
      const hydrated = results.map((t) => {
        const partnerObj = partnersById[t.partner] || t.partner_obj || null;
        const planObj = plansById[t.training_plan] || t.training_plan_obj || null;
        return {
          ...t,
          partner_name: partnerObj?.name || t.partner_name || "",
          training_plan_name: planObj?.training_name || t.training_plan_name || null,
        };
      });
      setAssignedTargets(hydrated); // this is paginated list for UI
      setAssignedTotal(data?.count || 0);
    } catch (err) {
      console.error("fetchAssignedTargets", err);
      setAssignedTargets([]);
      setAssignedTotal(0);
    } finally {
      setLoading((s) => ({ ...s, targets: false }));
    }
  }

  /**
   * Fetch all assigned targets (large limit) to build highlight map.
   * This is separate because paginated assignedTargets is used by the right panel.
   */
  async function fetchAssignedTargetsForHighlight() {
    try {
      const res = await TMS_API.trainingPartnerTargets.list({ limit: 10000, offset: 0 });
      const data = res?.data ?? res;
      const results = data?.results || [];
      // hydrate partner name where available
      const hydrated = results.map((t) => {
        const partnerObj = partnersById[t.partner] || t.partner_obj || null;
        const planObj = plansById[t.training_plan] || t.training_plan_obj || null;
        return {
          ...t,
          partner_name: partnerObj?.name || t.partner_name || "",
          training_plan_name: planObj?.training_name || t.training_plan_name || null,
        };
      });
      setAssignedTargets((prev) => {
        // keep paginated assignedTargets separate — we'll merge paginated results by re-calling fetchAssignedTargets
        // but for highlighting we set a separate internal state: we'll temporarily use assignedTargets state since UI uses it for both.
        // NOTE: we keep full list in a hidden ref by setting assignedTargetsFull; but to keep change minimal we will set a dedicated state below.
        return hydrated; // this temporarily sets full list for assignedPlanMap; caller will re-fetch paginated list separately
      });
    } catch (err) {
      console.warn("fetchAssignedTargetsForHighlight failed", err);
    }
  }

  // handle field changes
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));

    if (name === "training_plan_id") {
      const plan = plans.find((p) => String(p.id) === String(value));
      if (plan && plan.theme_name) {
        setForm((f) => ({ ...f, theme: plan.theme_name }));
      }
    }
  }

  // plan click: select plan unless it's assigned to another partner
  function onPlanClick(plan) {
    const assigned = assignedPlanMap[plan.id];
    // if assigned to other partner and not editing that target, block
    if (assigned && (!editingTarget || editingTarget.training_plan !== plan.id)) {
      // show a gentle message
      setMessage({ type: "error", text: `This module is already assigned to ${assigned.partnerName || "another partner"}.` });
      return;
    }

    setForm((f) => ({
      ...f,
      training_plan_id: plan.id,
      target_type: "MODULE",
      theme: plan.theme_name || "",
    }));
    setEditingTarget(null);
    setMessage(null);
    // keep console debug for devs
    console.debug("Selected plan:", plan.id, plan.training_name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editAssignedTarget(target) {
    setEditingTarget(target);
    setForm({
      partner_id: target.partner || target.partner_id || "",
      target_type: target.target_type || "MODULE",
      training_plan_id: target.training_plan || target.training_plan_id || "",
      district_id: target.district || target.district_id || "",
      theme: target.theme || "",
      target_count: target.target_count != null ? String(target.target_count) : "",
      financial_year: target.financial_year || "2023-24",
      notes: target.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMessage(null);
  }

  function resetForm() {
    setEditingTarget(null);
    setForm({
      partner_id: "",
      target_type: "MODULE",
      training_plan_id: "",
      district_id: "",
      theme: "",
      target_count: "",
      financial_year: "2023-24",
      notes: "",
    });
    setMessage(null);
  }

  function buildPayloadForSubmit(uid) {
    const p = {
      partner: Number(form.partner_id),
      target_type: form.target_type,
      target_count: Number(form.target_count),
      financial_year: form.financial_year,
      notes: form.notes || null,
    };
    if (form.training_plan_id) p.training_plan = Number(form.training_plan_id);
    if (form.district_id) p.district = Number(form.district_id);
    if (form.theme) p.theme = form.theme;

    // still try multi-variant created_by fields (but backend may ignore)
    if (uid != null) {
      p.created_by = uid;
      p.updated_by = uid;
    }
    return p;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);

    if (!form.partner_id) return setMessage({ type: "error", text: "Select partner" });
    if (!form.target_type) return setMessage({ type: "error", text: "Select target type" });
    if (!form.financial_year) return setMessage({ type: "error", text: "Select financial year" });
    if (form.target_count === "" || Number.isNaN(Number(form.target_count)) || Number(form.target_count) < 0)
      return setMessage({ type: "error", text: "Enter valid batch count" });

    if (form.target_type === "MODULE") {
      if (!form.training_plan_id) return setMessage({ type: "error", text: "Select module for MODULE target" });
      if (!form.district_id) return setMessage({ type: "error", text: "Select district for MODULE target" });
    }
    if (form.target_type === "DISTRICT" && !form.district_id) return setMessage({ type: "error", text: "Select district for DISTRICT target" });

    setSaving(true);
    try {
      const uid = effectiveUserId ?? (await resolveUserId());
      const payload = buildPayloadForSubmit(uid);

      console.debug("CREATE/PATCH payload (client):", payload);
      if (editingTarget && editingTarget.id) {
        payload.updated_by = uid;
        console.debug("PATCH payload:", payload);
        const res = await TMS_API.trainingPartnerTargets.partialUpdate(editingTarget.id, payload);
        console.debug("PATCH response:", res);
        setMessage({ type: "success", text: "Target updated" });
        setRecentActivity((r) => [`${new Date().toLocaleString()}: Updated ${editingTarget.id}`, ...r].slice(0, 12));
      } else {
        console.debug("CREATE payload:", payload);
        const res = await TMS_API.trainingPartnerTargets.create(payload);
        console.debug("CREATE response:", res);
        setMessage({ type: "success", text: "Target created" });
        setRecentActivity((r) => [`${new Date().toLocaleString()}: Created`, ...r].slice(0, 12));
      }

      // After save: re-fetch assigned highlight map and paginated targets
      await Promise.all([fetchAssignedTargetsForHighlight(), fetchAssignedTargets(assignedPage, assignedPageSize)]);
      setEditingTarget(null);
    } catch (err) {
      console.error("save target", err);
      const errText = (err?.response?.data && JSON.stringify(err.response.data)) || err?.message || String(err);
      setMessage({ type: "error", text: errText });
    } finally {
      setSaving(false);
    }
  }

  function progressForTarget(t) {
    const achieved = t.achieved_count ?? t.achieved_batches ?? t.achieved ?? null;
    const target = t.target_count ?? null;
    if (achieved == null || target == null || target === 0) return "—";
    const pct = Math.round((Number(achieved) / Number(target)) * 100);
    return `${achieved} / ${target} (${pct}%)`;
  }

  // Refresh: force re-run of all api calls and update cache
  async function handleRefresh() {
    setLoading((s) => ({ ...s, refresh: true }));
    try {
      await Promise.all([fetchThemesAndPlans(true), fetchPartners(), fetchDistricts(), fetchAssignedTargetsForHighlight()]);
      await fetchAssignedTargets(assignedPage, assignedPageSize);
      setMessage({ type: "success", text: "Refreshed" });
    } catch (e) {
      console.error("refresh", e);
      setMessage({ type: "error", text: "Refresh failed" });
    } finally {
      setLoading((s) => ({ ...s, refresh: false }));
    }
  }

  // styles: now plan list and form sit horizontally (responsive)
  const styles = {
    container: { maxWidth: 1200, margin: "20px auto", padding: "0 16px" },
    layoutRow: {
      display: "flex",
      gap: 20,
      alignItems: "flex-start",
      flexWrap: "wrap",
    },
    planColumn: { flex: "1 1 640px", minWidth: 320 },
    formColumn: { width: 420, minWidth: 300 },
    card: { background: "#fff", borderRadius: 6, padding: 16, boxShadow: "0 1px 0 rgba(10,20,40,0.03)" },
    planList: { maxHeight: "62vh", overflow: "auto", borderRadius: 6, background: "#fbfdff", padding: 6 },
    assignedList: { maxHeight: "38vh", overflow: "auto", marginTop: 8, borderTop: "1px solid #f1f3f5", paddingTop: 8 },
    formControl: { width: "100%", padding: "8px 10px", border: "1px solid #dfe4e8", borderRadius: 4, boxSizing: "border-box", fontSize: 14, background: "#fff" },
    formSelect: { width: "100%", padding: "8px 10px", border: "1px solid #dfe4e8", borderRadius: 4, boxSizing: "border-box", fontSize: 14, background: "#fff", height: 40 },
    btnPrimary: { padding: "10px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 600, background: "#0b2540", color: "#fff" },
    btnSecondary: { padding: "10px 12px", borderRadius: 6, border: "1px solid #dfe4e8", cursor: "pointer", fontWeight: 600, background: "#fff", color: "#0b2540" },
    smallMuted: { color: "#6c757d", fontSize: 13 },
    badge: { display: "inline-block", fontSize: 12, padding: "3px 8px", borderRadius: 999, background: "#eef6ff", color: "#0b2540", marginLeft: 8 },
    assignedRowMuted: { background: "#f7f9fb", color: "#7b8794" },
  };

  const totalPages = Math.max(1, Math.ceil(assignedTotal / assignedPageSize));
  function gotoPrevPage() {
    if (assignedPage > 1) setAssignedPage((p) => p - 1);
  }
  function gotoNextPage() {
    if (assignedPage < totalPages) setAssignedPage((p) => p + 1);
  }

  const showDistrictRow = form.target_type === "DISTRICT" || form.target_type === "MODULE";
  const showModuleRow = form.target_type === "MODULE";
  const showThemeRow = form.target_type === "THEME";

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav left={<div className="app-title">Pragati Setu — TMS (SMMU)</div>} />
        <main style={{ padding: 18 }}>
          <div style={styles.container}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{editingTarget ? `Edit Target #${editingTarget.id}` : "Create Partner Targets"}</h3>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn" onClick={handleRefresh} disabled={loading.refresh} style={{ padding: "8px 10px", borderRadius: 6 }}>
                  {loading.refresh ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>

            <div style={styles.layoutRow}>
              {/* Left: plans */}
              <div style={{ ...styles.card, ...styles.planColumn }}>
                <div style={styles.smallMuted}>{editingTarget ? "Editing mode — change fields and Save." : "Click a module row to prefill the form on the right."}</div>

                <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
                  <input placeholder="Filter modules by name / type / level" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} style={{ ...styles.formControl, flex: 1 }} aria-label="Search modules" />
                </div>

                <div style={styles.planList} role="table" aria-label="Training plans">
                  {loading.plans ? (
                    <div style={{ padding: 14, color: "#6c757d" }}>Loading modules…</div>
                  ) : filteredPlans.length ? (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #eef1f4" }}>
                          <th style={{ padding: "8px 6px", width: 70 }}>ID</th>
                          <th style={{ padding: "8px 6px" }}>Training name</th>
                          <th style={{ padding: "8px 6px", width: 120 }}>Type</th>
                          <th style={{ padding: "8px 6px", width: 140 }}>Level</th>
                          <th style={{ padding: "8px 6px", width: 90 }}>Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlans.map((p) => {
                          const assigned = assignedPlanMap[p.id];
                          const isAssigned = Boolean(assigned);
                          const isAssignedToThisEditingTarget = editingTarget && (editingTarget.training_plan === p.id || String(editingTarget.training_plan) === String(p.id));
                          const rowClickable = !isAssigned || isAssignedToThisEditingTarget;
                          return (
                            <tr
                              key={p.id}
                              role="row"
                              tabIndex={0}
                              onClick={() => rowClickable && onPlanClick(p)}
                              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && rowClickable && onPlanClick(p)}
                              style={{
                                cursor: rowClickable ? "pointer" : "not-allowed",
                                borderBottom: "1px solid #fbfbfb",
                                background: isAssigned && !isAssignedToThisEditingTarget ? "#fbfcfe" : "transparent",
                                color: isAssigned && !isAssignedToThisEditingTarget ? "#7b8794" : undefined,
                              }}
                            >
                              <td style={{ padding: "8px 6px", fontWeight: 700 }}>{p.id}</td>
                              <td style={{ padding: "8px 6px", display: "flex", alignItems: "center", gap: 8 }}>
                                <span>{p.training_name}</span>
                                {isAssigned && (
                                  <span style={styles.badge} title={`Assigned to ${assigned.partnerName || "partner"}`}>
                                    Assigned{assigned.partnerName ? ` — ${assigned.partnerName}` : ""}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "8px 6px" }}>{p.type_of_training || "—"}</td>
                              <td style={{ padding: "8px 6px" }}>{p.level_of_training || "—"}</td>
                              <td style={{ padding: "8px 6px" }}>{p.no_of_days != null ? p.no_of_days : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: 24, textAlign: "center", color: "#6c757d" }}>{themes.length ? "No modules found for your assigned themes." : "No themes found for your SMMU user."}</div>
                  )}
                </div>
              </div>

              {/* Right: form + assigned list */}
              <aside style={{ ...styles.card, ...styles.formColumn }}>
                <div style={styles.smallMuted}>Choose partner, select target type and scope, enter batch count and financial year, then Save.</div>

                <form id="targetForm" onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Training Partner</label>
                    <select name="partner_id" value={form.partner_id} onChange={handleChange} style={styles.formSelect} required>
                      <option value="">-- select partner --</option>
                      {partners.map((tp) => (<option key={tp.id} value={tp.id}>{tp.name}</option>))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Target type</label>
                    <select name="target_type" value={form.target_type} onChange={handleChange} style={styles.formSelect} required>
                      <option value="MODULE">Module (module + district)</option>
                      <option value="DISTRICT">District (district only)</option>
                      <option value="THEME">Theme (theme-wise)</option>
                    </select>
                  </div>

                  {showModuleRow && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Module / Training plan</label>
                      <select name="training_plan_id" value={form.training_plan_id} onChange={handleChange} style={styles.formSelect}>
                        <option value="">-- select module --</option>
                        {plans.map((m) => {
                          const assigned = assignedPlanMap[m.id];
                          const isAssigned = Boolean(assigned);
                          const isAssignedToThisEditingTarget = editingTarget && (editingTarget.training_plan === m.id || String(editingTarget.training_plan) === String(m.id));
                          return (
                            <option key={m.id} value={m.id} disabled={isAssigned && !isAssignedToThisEditingTarget}>
                              {m.training_name}{isAssigned ? ` — Assigned to ${assigned.partnerName || "partner"}` : ""}
                            </option>
                          );
                        })}
                      </select>
                      <div style={{ fontSize: 13, color: "#6c757d", marginTop: 6 }}>Tip: click a module row on the left to auto-select it here.</div>
                    </div>
                  )}

                  {showDistrictRow && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>District</label>
                      <select name="district_id" value={form.district_id} onChange={handleChange} style={styles.formSelect}>
                        <option value="">-- select district --</option>
                        {districts.length ? districts.map((d) => (<option key={d.district_id || d.id} value={d.district_id || d.id}>{d.district_name_en || d.name}</option>)) : <option value="">(No districts loaded — check endpoint)</option>}
                      </select>
                    </div>
                  )}

                  {showThemeRow && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Theme (optional)</label>
                      <div style={{ background: "#f8f9fa", padding: 8, borderRadius: 4, border: "1px solid #e9ecef" }}>{form.theme || "(inferred on save)"}</div>
                      <div style={{ fontSize: 13, color: "#6c757d", marginTop: 6 }}>For THEME targets, theme will be auto-inferred from your SMMU assignment or the selected module.</div>
                    </div>
                  )}

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Batch count (target)</label>
                    <input type="number" name="target_count" min="0" value={form.target_count} onChange={handleChange} style={styles.formControl} required />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Financial year</label>
                    <select name="financial_year" value={form.financial_year} onChange={handleChange} style={styles.formSelect} required>
                      <option value="">-- select financial year --</option>
                      <option>2021-22</option>
                      <option>2022-23</option>
                      <option>2023-24</option>
                      <option>2024-25</option>
                      <option>2025-26</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Notes (finance / rationale)</label>
                    <textarea name="notes" value={form.notes} onChange={handleChange} style={{ ...styles.formControl, height: 80 }} placeholder="Optional notes for finance or rationale" />
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="submit" disabled={saving} style={{ ...styles.btnPrimary, flex: 1 }}>
                      {saving ? (editingTarget ? "Updating..." : "Saving...") : editingTarget ? "Update Target" : "Save Target"}
                    </button>
                    <button type="button" onClick={resetForm} style={{ ...styles.btnSecondary, flex: 1 }}>
                      Reset
                    </button>
                  </div>

                  {message && <div style={{ marginTop: 12, color: message.type === "error" ? "#d9534f" : "#28a745" }}>{message.text}</div>}
                </form>

                <div style={styles.assignedList}>
                  <h6 style={{ margin: "8px 0" }}>Assigned targets</h6>
                  <div style={{ fontSize: 13, color: "#6c757d", marginBottom: 8 }}>Click a target to edit it.</div>

                  <div style={{ maxHeight: 240, overflow: "auto" }}>
                    {loading.targets ? (
                      <div style={{ padding: 12, color: "#6c757d" }}>Loading targets…</div>
                    ) : assignedTargets.length ? (
                      assignedTargets.slice(0, 50).map((t) => (
                        <div key={t.id} style={{ padding: 8, borderBottom: "1px solid #f3f6fb", display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.partner_name || (t.partner_obj && t.partner_obj.name) || t.partner}</div>
                            <div style={{ fontSize: 13, color: "#6c757d" }}>{t.target_type} — {t.training_plan_name || (t.training_plan && t.training_plan.training_name) || t.theme || ""}</div>
                            <div style={{ fontSize: 13, color: "#6c757d" }}>FY: {t.financial_year || "—"}</div>
                          </div>
                          <div style={{ textAlign: "right", minWidth: 120 }}>
                            <div style={{ fontSize: 13 }}>{progressForTarget(t)}</div>
                            <div style={{ marginTop: 6 }}>
                              <button className="btn" onClick={() => editAssignedTarget(t)} style={{ padding: "6px 8px", borderRadius: 6 }}>Edit</button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: 12, color: "#6c757d" }}>No targets found.</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                    <button className="btn" onClick={gotoPrevPage} disabled={assignedPage <= 1} style={{ padding: "6px 8px", borderRadius: 6 }}>Prev</button>
                    <div style={{ fontSize: 13, color: "#6c757d" }}>Page {assignedPage} / {Math.max(1, Math.ceil(assignedTotal / assignedPageSize))}</div>
                    <button className="btn" onClick={gotoNextPage} disabled={assignedPage >= Math.max(1, Math.ceil(assignedTotal / assignedPageSize))} style={{ padding: "6px 8px", borderRadius: 6 }}>Next</button>
                    <select value={assignedPageSize} onChange={(e) => { setAssignedPageSize(Number(e.target.value)); setAssignedPage(1); }} style={{ marginLeft: "auto", padding: 6 }}>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <h6 style={{ margin: "8px 0" }}>Recent activity</h6>
                  <div style={{ color: "#6c757d", fontSize: 13 }}>
                    {recentActivity.length ? (<ul style={{ marginTop: 6 }}>{recentActivity.map((r, i) => <li key={i} style={{ fontSize: 13 }}>{r}</li>)}</ul>) : "No recent actions yet."}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
