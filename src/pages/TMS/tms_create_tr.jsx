// src/pages/TMS/tms_create_tr.jsx
import React, { useEffect, useMemo, useState, useContext, useRef } from "react";
import LeftNav from "../../components/layout/LeftNav";
import TopNav from "../../components/layout/TopNav";
import { AuthContext } from "../../contexts/AuthContext";
import { TMS_API, LOOKUP_API, EPSAKHI_API } from "../../api/axios";
import ShgListTable from "../Dashboard/ShgListTable";
import ShgMemberListTable from "../Dashboard/ShgMemberListTable";

const TRP_SCOPE_CACHE = "tms_trp_user_scope_v1";
const TRAIN_PLAN_CACHE = "tms_training_plans_cache_v1";
const GEOSCOPE_KEY = "ps_user_geoscope";

/* ---------- small helpers ---------- */
function loadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    localStorage.removeItem(key);
    return null;
  }
}
function saveJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    // ignore
  }
}
function getRoleKeyFromUser(user) {
  if (!user) return "";
  const id = Number(user.role_id ?? user.role);
  if (!Number.isNaN(id)) {
    if (id === 1) return "bmmu";
    if (id === 2) return "dmmu";
    if (id === 3) return "smmu";
    if (id === 4) return "training_partner";
  }
  const rn = (user.role_name || "").toLowerCase();
  if (rn.includes("bmmu")) return "bmmu";
  if (rn.includes("dmmu")) return "dmmu";
  if (rn.includes("smmu") || rn.includes("state_mission")) return "smmu";
  return "";
}

/* ---------- small embedded components ---------- */

/* MasterTrainerList: lightweight trainer listing with checkbox selection */
function MasterTrainerList({ filters = {}, onToggleTrainer, selectedIds = new Set() }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, page_size: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [designation, setDesignation] = useState(filters.designation || "");
  const [reloadToken, setReloadToken] = useState(0);

  async function load(page = 1) {
    setLoading(true);
    try {
      const page_size = meta.page_size || 20;
      const params = {
        page,
        page_size,
        designation: designation || undefined,
        empanel_district: filters.district || undefined,
        empanel_block: filters.block || undefined,
      };
      const res = await TMS_API.masterTrainers.list(params);
      const payload = res?.data ?? res ?? {};
      const data = payload.results || payload.data || [];
      const total = payload.count ?? payload.meta?.total ?? data.length;
      const pageFromResp = payload.meta?.page ?? page;
      setRows(data);
      setMeta({ page: pageFromResp, page_size, total });
    } catch (e) {
      console.error("load trainers", e);
      setRows([]);
      setMeta({ page: 1, page_size: 20, total: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designation, filters.district, filters.block, reloadToken]);

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.page_size || 20)));

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="header-row space-between">
        <div>
          <h3>Master Trainers</h3>
          <p className="muted" style={{ marginTop: 4 }}>Select trainers for this request.</p>
        </div>
        <div>
          <button className="btn-sm btn-flat" onClick={() => setReloadToken((t) => t + 1)} disabled={loading}>Refresh</button>
        </div>
      </div>

      <div className="filters-row" style={{ gap: 8 }}>
        <select className="input" value={designation} onChange={(e) => setDesignation(e.target.value)}>
          <option value="">All designations</option>
          <option value="BRP">BRP</option>
          <option value="DRP">DRP</option>
          <option value="SRP">SRP</option>
        </select>
      </div>

      {loading ? (
        <div className="table-spinner">Loading trainers…</div>
      ) : rows.length === 0 ? (
        <p className="muted">No trainers found.</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Block</th>
                  <th>District</th>
                  <th>Mobile</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const id = r.id;
                  const isSel = selectedIds.has(id);
                  return (
                    <tr key={id} className={isSel ? "row-selected" : ""}>
                      <td>
                        <input type="checkbox" checked={isSel} onChange={(e) => onToggleTrainer && onToggleTrainer(r, e.target.checked)} />
                      </td>
                      <td>{r.full_name || r.name || "-"}</td>
                      <td>{r.designation || "-"}</td>
                      <td>{r.empanel_block || "-"}</td>
                      <td>{r.empanel_district || "-"}</td>
                      <td>{r.mobile_no || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && meta.total > meta.page_size && (
            <div className="pagination" style={{ marginTop: 8 }}>
              <button className="btn-sm btn-flat" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>Prev</button>
              <span>Page {meta.page} of {totalPages}</span>
              <button className="btn-sm btn-flat" disabled={meta.page >= totalPages} onClick={() => load(meta.page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- main component ---------- */

export default function CreateTrainingRequest() {
  const { user } = useContext(AuthContext) || {};
  const roleKey = getRoleKeyFromUser(user);

  const geoscopeCached = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(GEOSCOPE_KEY) || "null");
    } catch (e) {
      return null;
    }
  }, []);

  const [blockId, setBlockId] = useState(geoscopeCached?.blocks?.[0] ?? geoscopeCached?.block_id ?? null);
  const [districtId, setDistrictId] = useState(geoscopeCached?.districts?.[0] ?? geoscopeCached?.district_id ?? null);

  // cached lists & allowed IDs
  const [allowedTrainingIds, setAllowedTrainingIds] = useState([]);
  const [plans, setPlans] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState({ scopes: false, plans: false, partners: false });

  // selection & form state
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [form, setForm] = useState({
    training_type: "BENEFICIARY",
    level: "BLOCK",
    partner: "",
    notes: "",
  });

  // participants selection
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState([]); // normalized rows
  const savedMemberResponses = useRef(new Map()); // key => full saved member response
  const [selectedTrainersMap, setSelectedTrainersMap] = useState(new Map()); // id -> detail
  const savedTrainerResponses = useRef(new Map());

  // participant sub-stepper
  const [step, setStep] = useState(1); // 1 plan,2 participants,3 review
  const steps = [
    { id: 1, title: "Choose Plan" },
    { id: 2, title: "Select Participants" },
    { id: 3, title: "Review & Submit" },
  ];

  // For beneficiary flow: inner participant steps (SHG -> Members)
  const [participantSubStep, setParticipantSubStep] = useState(1); // 1 = SHG list, 2 = member list

  // For forcing member-table reload when same SHG selected repeatedly
  const [memberListReloadToken, setMemberListReloadToken] = useState(0);

  // Partner auto-assignment flag (true if auto-assigned from partner-targets)
  const [autoPartnerAssigned, setAutoPartnerAssigned] = useState(false);

  // Preview modal + submission progress/results
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSummary, setSubmitSummary] = useState(null); // { trId, successes, failures: [{row, error}], rawResponse }

  /* ---------- load allowed training ids (trp-user-scopes) ---------- */
  useEffect(() => {
    (async () => {
      if (!user) return;
      const roleId = user.role_id ?? user.role;
      const cache = loadJson(TRP_SCOPE_CACHE) || {};
      if (cache.roleId === roleId && cache.allowedTrainingIds) {
        setAllowedTrainingIds(cache.allowedTrainingIds);
      } else {
        setLoading((s) => ({ ...s, scopes: true }));
        try {
          const res = await TMS_API.trpUserScopes.list({ user_role_id: roleId, limit: 500 });
          const payload = res?.data ?? res ?? {};
          const rows = payload.results || payload.data || [];
          const ids = Array.from(new Set(rows.map((r) => r.training_id).filter(Boolean)));
          setAllowedTrainingIds(ids);
          saveJson(TRP_SCOPE_CACHE, { ts: Date.now(), roleId, allowedTrainingIds: ids });
        } catch (e) {
          console.error("trp-user-scopes failed", e);
        } finally {
          setLoading((s) => ({ ...s, scopes: false }));
        }
      }
    })();
  }, [user]);

  /* ---------- load plans for allowed training ids (cached) ---------- */
  useEffect(() => {
    (async () => {
      if (!allowedTrainingIds || allowedTrainingIds.length === 0) {
        setPlans([]);
        return;
      }
      const planCache = loadJson(TRAIN_PLAN_CACHE) || {};
      const cachedList = Array.isArray(planCache.ids) ? planCache.ids : [];
      const hasAll = allowedTrainingIds.every((id) => cachedList.includes(id));
      if (hasAll && planCache.plans) {
        setPlans(planCache.plans);
        return;
      }
      setLoading((s) => ({ ...s, plans: true }));
      try {
        const collected = [];
        for (const tid of allowedTrainingIds) {
          try {
            const resp = await TMS_API.trainingPlans.retrieve(tid);
            const p = resp?.data ?? resp ?? null;
            if (p) collected.push(p);
          } catch (e) {
            console.warn("training plan detail failed", tid, e);
          }
        }
        collected.sort((a, b) => {
          const na = (a.training_name || a.name || "").toString().toLowerCase();
          const nb = (b.training_name || b.name || "").toString().toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return (a.id || 0) - (b.id || 0);
        });
        setPlans(collected);
        saveJson(TRAIN_PLAN_CACHE, { ts: Date.now(), ids: allowedTrainingIds, plans: collected });
      } catch (e) {
        console.error("fetch plans failed", e);
        setPlans([]);
      } finally {
        setLoading((s) => ({ ...s, plans: false }));
      }
    })();
  }, [allowedTrainingIds]);

  /* ---------- partners (full list for non-BMMU or display) ---------- */
  useEffect(() => {
    (async () => {
      setLoading((s) => ({ ...s, partners: true }));
      try {
        const res = await TMS_API.trainingPartners.list({ limit: 500 });
        const payload = res?.data ?? res ?? {};
        const list = payload.results || payload.data || [];
        setPartners(list);
      } catch (e) {
        console.error("partners fetch failed", e);
        setPartners([]);
      } finally {
        setLoading((s) => ({ ...s, partners: false }));
      }
    })();
  }, []);

  /* ---------- handlers ---------- */

  // When a plan is selected, also try to auto-resolve partner (via partner-targets) for BMMU users.
  async function handlePlanSelect(plan) {
    setSelectedPlan(plan);
    setSelectedTheme(null);
    setAutoPartnerAssigned(false);

    // fetch theme detail (if present)
    if (plan?.theme) {
      try {
        const resp = await TMS_API.trainingThemes.retrieve(plan.theme);
        const t = resp?.data ?? resp ?? null;
        setSelectedTheme(t);
      } catch (e) {
        setSelectedTheme(null);
      }
    }

    // If BMMU, attempt to find partner via partner targets for this plan
    if (roleKey === "bmmu" && plan?.id) {
      try {
        // call partner-target endpoint
        // endpoint: /tms/training-partner-targets/?training_plan=<id>
        const resp = await TMS_API.trainingPartnerTargets.list({ training_plan: plan.id, limit: 1 });
        const payload = resp?.data ?? resp ?? {};
        const results = payload.results || payload.data || [];
        if (Array.isArray(results) && results.length > 0) {
          const partnerId = results[0].partner;
          if (partnerId) {
            setForm((f) => ({ ...f, partner: String(partnerId) }));
            setAutoPartnerAssigned(true);
          }
        } else {
          // no partner-target found; clear any auto assignment
          setAutoPartnerAssigned(false);
        }
      } catch (e) {
        console.warn("failed to fetch training-partner-targets", e);
        setAutoPartnerAssigned(false);
      }
    } else {
      // non-BMMU: clear any auto-assign
      setAutoPartnerAssigned(false);
    }

    // reset participant selection substep
    setParticipantSubStep(1);
    // do not wipe beneficiaries/trainers to avoid surprising the user
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  // SHG member selection: add member object (full response saved in savedMemberResponses)
  function addSelectedMember(memberObj) {
    const lokos_shg_code = memberObj.shg_code || memberObj.lokos_shg_code || memberObj.shgCode || (memberObj.shg && (memberObj.shg.shg_code || memberObj.shg.code));
    const lokos_member_code = memberObj.member_code || memberObj.lokos_member_code || memberObj.memberCode || memberObj.id;
    const key = `${lokos_shg_code}|${lokos_member_code}`;
    savedMemberResponses.current.set(key, memberObj);

    setSelectedBeneficiaries((prev) => {
      const exists = prev.some((p) => String(p.lokos_member_code) === String(lokos_member_code) && String(p.lokos_shg_code) === String(lokos_shg_code));
      if (exists) return prev;
      const normalized = {
        lokos_shg_code,
        lokos_member_code,
        member_name: memberObj.member_name || memberObj.name || "",
        age: memberObj.age || null,
        gender: memberObj.gender || "",
        pld_status: memberObj.pld_status || memberObj.pldStatus || "",
        mobile: (memberObj.member_phones && memberObj.member_phones[0]?.phone_no) || memberObj.mobile || memberObj.phone_no || "",
        address: memberObj.address || "",
        social_category: memberObj.social_category || "",
        religion: memberObj.religion || "",
      };
      return [...prev, normalized];
    });
  }

  function removeSelectedBeneficiary(lokos_member_code, lokos_shg_code) {
    // normalize keys as string for matching
    const mcode = lokos_member_code ?? "";
    const scode = lokos_shg_code ?? "";
    setSelectedBeneficiaries((prev) => prev.filter((b) => !(String(b.lokos_member_code) === String(mcode) && String(b.lokos_shg_code) === String(scode))));
    // also remove savedMemberResponses entry
    try {
      const key = `${scode}|${mcode}`;
      savedMemberResponses.current.delete(key);
    } catch (e) {
      // ignore
    }
  }

  // trainer selection: onToggleTrainer(trainerObj, add)
  async function onToggleTrainer(trainerObj, add) {
    const id = trainerObj.id;
    if (add) {
      if (!savedTrainerResponses.current.has(id)) {
        try {
          const resp = await TMS_API.masterTrainers.retrieve(id);
          const payload = resp?.data ?? resp ?? trainerObj;
          savedTrainerResponses.current.set(id, payload);
        } catch (e) {
          // fallback to shallow object
          savedTrainerResponses.current.set(id, trainerObj);
        }
      }
      setSelectedTrainersMap((m) => {
        const copy = new Map(m);
        copy.set(id, savedTrainerResponses.current.get(id));
        return copy;
      });
    } else {
      setSelectedTrainersMap((m) => {
        const copy = new Map(m);
        copy.delete(id);
        return copy;
      });
    }
  }

  function removeSelectedTrainer(id) {
    setSelectedTrainersMap((m) => {
      const copy = new Map(m);
      copy.delete(id);
      return copy;
    });
  }

  /* ---------- stepper helpers ---------- */
  function goToNext() {
    setStep((s) => Math.min(3, s + 1));
  }
  function goToPrev() {
    setStep((s) => Math.max(1, s - 1));
  }
  function jumpToStep(n) {
    setStep(n);
  }

  /* ---------- preview and submit ---------- */

  // build final payload to show in preview
  function buildPreviewPayload() {
    const payload = {
      training_plan: selectedPlan?.id ?? null,
      partner: form.partner ? Number(form.partner) : null,
      training_type: form.training_type,
      level: form.level,
      notes: form.notes || null,
      created_by: user?.id ?? user?.user_id ?? null,
      beneficiaries_count: form.training_type === "BENEFICIARY" ? selectedBeneficiaries.length : 0,
      trainers_count: form.training_type === "TRAINER" ? selectedTrainersMap.size : 0,
    };
    return payload;
  }

  // open preview modal
  function openPreview() {
    if (!selectedPlan) return alert("Select a training plan first.");

    // for BMMU: partner may be auto-assigned — allow if auto assigned
    if (!form.partner && !(roleKey === "bmmu" && autoPartnerAssigned)) return alert("Select partner.");

    if (form.training_type === "BENEFICIARY" && selectedBeneficiaries.length === 0) return alert("Select beneficiaries.");
    if (form.training_type === "TRAINER" && selectedTrainersMap.size === 0) return alert("Select trainers.");
    setPreviewOpen(true);
  }

  // final submit: create training request, then create child rows with per-row error handling
  async function confirmAndSubmit() {
    setSubmitting(true);
    setSubmitSummary(null);

    try {
      // create training request
      const trPayload = {
        training_plan: selectedPlan.id,
        partner: form.partner ? Number(form.partner) : null,
        training_type: form.training_type,
        level: form.level,
        notes: form.notes || null,
        created_by: user?.id ?? user?.user_id ?? null,
      };

      const trResp = await TMS_API.trainingRequests.create(trPayload);
      const trObj = trResp?.data ?? trResp;
      const trId = trObj?.id;
      if (!trId) throw new Error("Training request created but id missing");

      // child rows creation with per-row error collection
      const successes = [];
      const failures = [];

      if (form.training_type === "BENEFICIARY") {
        // iterate beneficiaries
        for (const b of selectedBeneficiaries) {
          const key = `${b.lokos_shg_code}|${b.lokos_member_code}`;
          const raw = savedMemberResponses.current.get(key) || {};
          const bPayload = {
            training: trId,
            lokos_shg_code: b.lokos_shg_code,
            lokos_member_code: b.lokos_member_code,
            member_name: raw.member_name || b.member_name,
            age: raw.age ?? b.age,
            gender: raw.gender || b.gender,
            designation: raw.designation || "",
            pld_status: raw.pld_status || b.pld_status || "",
            social_category: raw.social_category || b.social_category || "",
            religion: raw.religion || b.religion || "",
            mobile: raw.mobile || b.mobile || "",
            email: raw.email || "",
            education: raw.education || "",
            address: raw.address || b.address || "",
            district: raw.district_id || raw.district || null,
            block: raw.block_id || raw.block || null,
            panchayat: raw.panchayat_id || raw.panchayat || null,
            village: raw.village_id || raw.village || null,
            remarks: raw.remarks || "",
            created_by: user?.id ?? user?.user_id ?? null,
          };

          try {
            const resp = await TMS_API.trainingRequestBeneficiaries.create(bPayload);
            successes.push({ type: "beneficiary", row: b, resp: resp?.data ?? resp });
          } catch (e) {
            const msg = (e?.response?.data && JSON.stringify(e.response.data)) || e?.message || String(e);
            failures.push({ type: "beneficiary", row: b, error: msg });
            console.error("beneficiary create failed", bPayload, e);
          }
        }
      } else {
        // trainers
        for (const [tid, detail] of selectedTrainersMap.entries()) {
          const tPayload = {
            training: trId,
            trainer: tid,
            full_name: detail.full_name || detail.name || "",
            mobile_no: detail.mobile_no || detail.mobile || "",
            aadhaar_no: detail.aadhaar_no || detail.aadhaar || "",
            district: detail.empanel_district || null,
            block: detail.empanel_block || null,
            remarks: "",
            created_by: user?.id ?? user?.user_id ?? null,
          };
          try {
            const resp = await TMS_API.trainingRequestTrainers.create(tPayload);
            successes.push({ type: "trainer", row: detail, resp: resp?.data ?? resp });
          } catch (e) {
            const msg = (e?.response?.data && JSON.stringify(e.response.data)) || e?.message || String(e);
            failures.push({ type: "trainer", row: detail, error: msg });
            console.error("trainer create failed", tPayload, e);
          }
        }
      }

      setSubmitSummary({ trId, successes, failures });
    } catch (e) {
      console.error("create training request failed", e);
      setSubmitSummary({ trId: null, successes: [], failures: [{ type: "training_request", error: (e?.response?.data && JSON.stringify(e.response.data)) || e?.message || String(e) }] });
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- small UI helpers ---------- */
  const selectedTrainerList = Array.from(selectedTrainersMap.values());
  const selectedPlanTitle = selectedPlan && (selectedPlan.training_name || selectedPlan.training_plan_name || selectedPlan.trainingTitle || selectedPlan.name || `Plan ${selectedPlan.id}`);

  /* ---------- render ---------- */
  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav left={<div className="app-title">Pragati Setu — Create Training Request</div>} />

        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1200, margin: "20px auto", padding: "0 12px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Create Training Request</h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.removeItem(TRP_SCOPE_CACHE);
                    localStorage.removeItem(TRAIN_PLAN_CACHE);
                    window.location.reload();
                  }}
                >
                  Refresh & Reload
                </button>
              </div>
            </div>

            {/* Stepper */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
              {steps.map((s) => (
                <div
                  key={s.id}
                  onClick={() => jumpToStep(s.id)}
                  style={{
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: s.id === step ? "#0b2540" : "#f5f7fa",
                    color: s.id === step ? "#fff" : "#0b2540",
                    fontWeight: s.id === step ? 700 : 600,
                  }}
                >
                  {s.title}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
              {/* LEFT column */}
              <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                {/* Step content */}
                {step === 1 && (
                  <>
                    <h3 style={{ marginTop: 0 }}>1 — Choose Training Plan</h3>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Training Plan (allowed for your role)</label>
                      <select
                        className="input"
                        value={selectedPlan?.id || ""}
                        onChange={(e) => {
                          const id = e.target.value;
                          const pl = plans.find((p) => String(p.id) === String(id));
                          handlePlanSelect(pl || null);
                        }}
                      >
                        <option value="">-- select training plan --</option>
                        {plans.map((p) => {
                          const title = p.training_name || p.training_plan_name || p.trainingTitle || p.name || `Plan ${p.id}`;
                          return (
                            <option key={p.id} value={p.id}>
                              {title} {p.level_of_training ? `(${p.level_of_training})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {selectedPlan ? (
                      <div style={{ marginTop: 12, padding: 12, border: "1px solid #eef2f6", borderRadius: 6 }}>
                        <h3 style={{ margin: "6px 0" }}>{selectedPlanTitle}</h3>
                        <div style={{ color: "#6c757d", marginBottom: 8 }}>{selectedPlan.training_objective || selectedPlan.description || ""}</div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <div><strong>Duration:</strong> {selectedPlan.no_of_days ?? "—"} days</div>
                          <div><strong>Type:</strong> {selectedPlan.type_of_training || "—"}</div>
                          <div><strong>Level:</strong> {selectedPlan.level_of_training || "—"}</div>
                          <div><strong>Theme:</strong> {selectedPlan.theme_name || selectedTheme?.theme_name || "—"}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="muted">Select a training plan to preview details and choose participants.</div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn" onClick={() => goToNext()} disabled={!selectedPlan}>Next</button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <h3 style={{ marginTop: 0 }}>2 — Select Participants</h3>
                        <div className="muted">Choose beneficiaries (SHGs) or trainers depending on selection.</div>
                      </div>
                      <div>
                        <button className="btn btn-outline" onClick={goToPrev}>Back</button>
                        <button className="btn" style={{ marginLeft: 8 }} onClick={() => goToNext()}>Next</button>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, margin: "12px 0", alignItems: "center" }}>
                      <label style={{ fontWeight: 700 }}>Applicable For</label>
                      <select value={form.training_type} onChange={(e) => setForm({ ...form, training_type: e.target.value })}>
                        <option value="BENEFICIARY">Beneficiary</option>
                        <option value="TRAINER">Master Trainer</option>
                      </select>

                      <label style={{ fontWeight: 700, marginLeft: 12 }}>Level</label>
                      <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                        <option value="BLOCK">Block</option>
                        <option value="DISTRICT">District</option>
                        <option value="STATE">State</option>
                      </select>
                    </div>

                    {/* Render beneficiary vs trainer flows */}
                    {form.training_type === "BENEFICIARY" ? (
                      <>
                        {/* sub-stepper for beneficiary flow */}
                        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                          <div
                            onClick={() => setParticipantSubStep(1)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              background: participantSubStep === 1 ? "#0b2540" : "#f5f7fa",
                              color: participantSubStep === 1 ? "#fff" : "#0b2540",
                              cursor: "pointer",
                            }}
                          >
                            1 — SHG list
                          </div>
                          <div
                            onClick={() => setParticipantSubStep(2)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              background: participantSubStep === 2 ? "#0b2540" : "#f5f7fa",
                              color: participantSubStep === 2 ? "#fff" : "#0b2540",
                              cursor: "pointer",
                            }}
                          >
                            2 — Members
                          </div>
                        </div>

                        {participantSubStep === 1 && (
                          <div>
                            <h4>SHG list</h4>
                            <div style={{ fontSize: 13, color: "#6c757d", marginBottom: 8 }}>
                              Select an SHG to view members. After selecting an SHG, go to "Members" sub-step to pick members (or click a SHG member directly to jump).
                            </div>

                            <ShgListTable
                              blockId={blockId}
                              onSelectShg={(shg) => {
                                // go to member sub-step and notify member area
                                setParticipantSubStep(2);
                                // send event to member area
                                window.dispatchEvent(new CustomEvent("ps:select-shg", { detail: { shg } }));
                                // also bump reload token in case same SHG clicked multiple times
                                setMemberListReloadToken((t) => t + 1);
                              }}
                            />
                          </div>
                        )}

                        {participantSubStep === 2 && (
                          <div>
                            <h4>Members (selected SHG)</h4>
                            <div style={{ fontSize: 13, color: "#6c757d", marginBottom: 8 }}>
                              Use PLD filter, search and pagination inside the member list. Check members to add them to selection.
                            </div>
                            <MemberListArea
                              onToggleMember={(member, checked) => {
                                // normalize member codes
                                const lokos_shg_code = member.shg_code || member.lokos_shg_code || member.shg?.shg_code || member.shg?.code;
                                const lokos_member_code = member.member_code || member.lokos_member_code || member.id;
                                if (checked) {
                                  addSelectedMember(member);
                                } else {
                                  removeSelectedBeneficiary(lokos_member_code, lokos_shg_code);
                                }
                              }}
                              reloadToken={memberListReloadToken}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <MasterTrainerList
                            filters={{
                              block: roleKey === "bmmu" ? blockId : undefined,
                              district: roleKey === "dmmu" ? districtId : undefined,
                              designation: roleKey === "bmmu" ? "BRP" : undefined,
                            }}
                            onToggleTrainer={onToggleTrainer}
                            selectedIds={new Set(Array.from(selectedTrainersMap.keys()))}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                {step === 3 && (
                  <>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <h3 style={{ marginTop: 0 }}>3 — Review & Submit</h3>
                        <div className="muted">Preview payload and confirm submission.</div>
                      </div>
                      <div>
                        <button className="btn btn-outline" onClick={goToPrev}>Back</button>
                        <button className="btn" style={{ marginLeft: 8 }} onClick={openPreview}>Preview & Confirm</button>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: "block", fontWeight: 700 }}>Training Plan</label>
                      <div style={{ padding: 8, background: "#f8fafc", borderRadius: 6 }}>{selectedPlan ? selectedPlanTitle : "(none selected)"}</div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: "block", fontWeight: 700 }}>Partner</label>

                      {/* If BMMU and partner auto-assigned, show partner but disabled */}
                      {roleKey === "bmmu" && autoPartnerAssigned ? (
                        <div style={{ padding: 8, background: "#fbfdff", borderRadius: 6 }}>
                          {partners.find((p) => String(p.id) === String(form.partner))?.name || `Partner ID ${form.partner}`}
                        </div>
                      ) : (
                        <select name="partner" value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })} className="input" disabled={roleKey === "bmmu" && autoPartnerAssigned}>
                          <option value="">-- select partner --</option>
                          {partners.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <h4>Selected Participants</h4>
                      {form.training_type === "BENEFICIARY" ? (
                        selectedBeneficiaries.length === 0 ? (
                          <p className="muted">No beneficiaries selected.</p>
                        ) : (
                          <div className="table-wrapper" style={{ maxHeight: 220, overflow: "auto" }}>
                            <table className="table table-compact">
                              <thead>
                                <tr>
                                  <th>SHG</th>
                                  <th>Member</th>
                                  <th>Member Code</th>
                                  <th>Age</th>
                                  <th>PLD</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedBeneficiaries.map((b, idx) => (
                                  <tr key={`${b.lokos_shg_code}|${b.lokos_member_code}|${idx}`}>
                                    <td>{b.lokos_shg_code}</td>
                                    <td>{b.member_name}</td>
                                    <td>{b.lokos_member_code}</td>
                                    <td>{b.age ?? "—"}</td>
                                    <td>{b.pld_status || "—"}</td>
                                    <td>
                                      <button className="btn-sm btn-flat" onClick={() => removeSelectedBeneficiary(b.lokos_member_code, b.lokos_shg_code)}>
                                        Remove
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      ) : selectedTrainerList.length === 0 ? (
                        <p className="muted">No trainers selected.</p>
                      ) : (
                        <div className="table-wrapper" style={{ maxHeight: 220, overflow: "auto" }}>
                          <table className="table table-compact">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Designation</th>
                                <th>District</th>
                                <th>Block</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedTrainerList.map((t) => (
                                <tr key={t.id}>
                                  <td>{t.full_name || t.name}</td>
                                  <td>{t.designation || "-"}</td>
                                  <td>{t.empanel_district || "-"}</td>
                                  <td>{t.empanel_block || "-"}</td>
                                  <td>
                                    <button className="btn-sm btn-flat" onClick={() => removeSelectedTrainer(t.id)}>Remove</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* RIGHT column */}
              <aside style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                <h3 style={{ marginTop: 0 }}>Request Summary</h3>
                <div style={{ fontSize: 13, color: "#6c757d", marginBottom: 8 }}>Quick summary and actions.</div>

                <div style={{ marginBottom: 12 }}>
                  <strong>Plan:</strong>
                  <div style={{ padding: 8, background: "#fbfdff", borderRadius: 6 }}>{selectedPlan ? selectedPlanTitle : "—"}</div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <strong>Type:</strong> {form.training_type}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <strong>Participants:</strong> {form.training_type === "BENEFICIARY" ? `${selectedBeneficiaries.length} beneficiaries` : `${selectedTrainersMap.size} trainers`}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={openPreview}>Preview & Confirm</button>
                  <button className="btn btn-outline" onClick={() => { setSelectedBeneficiaries([]); setSelectedTrainersMap(new Map()); }}>Clear Selections</button>
                </div>

                {submitSummary && (
                  <div style={{ marginTop: 16, padding: 8, borderRadius: 6, border: "1px solid #f1f3f5", background: "#fff" }}>
                    <h4 style={{ margin: "6px 0" }}>Last submission</h4>
                    {submitSummary.trId ? <div>Training Request ID: <strong>{submitSummary.trId}</strong></div> : <div style={{ color: "#b03a2e" }}>Training request failed to create.</div>}
                    <div>Successes: {submitSummary.successes?.length ?? 0}</div>
                    <div>Failures: {submitSummary.failures?.length ?? 0}</div>
                    {submitSummary.failures?.length > 0 && (
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ cursor: "pointer" }}>Show errors</summary>
                        <ul>
                          {submitSummary.failures.map((f, i) => (
                            <li key={i}><strong>{f.type}</strong>: {f.error || JSON.stringify(f.row)}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </aside>
            </div>
          </div>
        </main>
      </div>

      {/* Preview / Confirm modal */}
      {previewOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{ width: 920, maxHeight: "88vh", overflow: "auto", background: "#fff", borderRadius: 8, padding: 18 }}>
            <h3>Preview Training Request</h3>
            <div style={{ color: "#6c757d", marginBottom: 12 }}>Review payload below. Confirm to submit.</div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <h4>Request payload</h4>
                <pre style={{ background: "#f7fafc", padding: 12, borderRadius: 6, fontSize: 13 }}>
{JSON.stringify(buildPreviewPayload(), null, 2)}
                </pre>
              </div>

              <div style={{ width: 360 }}>
                <h4>Participants</h4>
                {form.training_type === "BENEFICIARY" ? (
                  selectedBeneficiaries.length === 0 ? <p className="muted">No beneficiaries</p> : (
                    <div style={{ maxHeight: 420, overflow: "auto" }}>
                      <table className="table table-compact">
                        <thead><tr><th>SHG</th><th>Member</th><th>Code</th></tr></thead>
                        <tbody>
                          {selectedBeneficiaries.map((b, i) => (
                            <tr key={`${b.lokos_shg_code}|${b.lokos_member_code}|${i}`}>
                              <td>{b.lokos_shg_code}</td>
                              <td>{b.member_name}</td>
                              <td>{b.lokos_member_code}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : selectedTrainerList.length === 0 ? <p className="muted">No trainers</p> : (
                  <div style={{ maxHeight: 420, overflow: "auto" }}>
                    <table className="table table-compact">
                      <thead><tr><th>Name</th><th>Designation</th></tr></thead>
                      <tbody>
                        {selectedTrainerList.map((t) => (
                          <tr key={t.id}>
                            <td>{t.full_name || t.name}</td>
                            <td>{t.designation || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn btn-outline" onClick={() => setPreviewOpen(false)} disabled={submitting}>Cancel</button>
              <button
                className="btn"
                onClick={async () => {
                  await confirmAndSubmit();
                  setPreviewOpen(false);
                }}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* After submission summary modal (if needed) */}
      {submitSummary && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 9998
        }}>
          <div style={{ width: 760, background: "#fff", borderRadius: 8, padding: 18 }}>
            <h3>Submission Result</h3>
            <div style={{ marginBottom: 8 }}>
              {submitSummary.trId ? (
                <div>Training Request created: <strong>{submitSummary.trId}</strong></div>
              ) : (
                <div style={{ color: "#b03a2e" }}>Failed to create training request</div>
              )}
            </div>

            <div>Child rows succeeded: {submitSummary.successes?.length ?? 0}</div>
            <div>Child rows failed: {submitSummary.failures?.length ?? 0}</div>

            {submitSummary.failures?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4>Errors</h4>
                <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #f1f3f5", padding: 8, borderRadius: 6 }}>
                  <ul>
                    {submitSummary.failures.map((f, i) => (
                      <li key={i}><strong>{f.type}</strong>: {f.error || JSON.stringify(f.row)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn btn-outline" onClick={() => setSubmitSummary(null)}>Close</button>
              <button className="btn" onClick={() => {
                // user may want to keep selection and try again — we keep selections intact
                setSubmitSummary(null);
              }}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- MemberListArea: wrapper that listens to ps:select-shg event ---------- */
function MemberListArea({ onSelectMember, onToggleMember, reloadToken = 0 }) {
  const [selectedShg, setSelectedShg] = useState(null);

  useEffect(() => {
    function handler(e) {
      if (e?.detail?.shg) {
        setSelectedShg(e.detail.shg);
      }
    }
    window.addEventListener("ps:select-shg", handler);
    return () => window.removeEventListener("ps:select-shg", handler);
  }, []);

  // If reloadToken changes, re-render / remount table by changing key (handled below)
  if (!selectedShg) {
    return <div className="muted">Select an SHG from the left to view members.</div>;
  }

  // Provide both shg and shgId and a stable key (id or shg_code) to ShgMemberListTable so it reliably fetches rows.
  const stableKey = selectedShg.id ?? selectedShg.shg_code ?? selectedShg.shgCode ?? JSON.stringify(selectedShg);

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <strong>SHG:</strong> {selectedShg.shg_name || selectedShg.name || selectedShg.shg_code}
      </div>

      {/* key includes reloadToken to force remount when same SHG reselected */}
      <div key={`${stableKey}::${reloadToken}`}>
        <ShgMemberListTable
          shg={selectedShg}
          shgId={selectedShg.id ?? selectedShg.shg_code}
          onSelectMember={(m) => onSelectMember && onSelectMember(m)}
          onToggleMember={(m, checked) => {
            // If parent supplied onToggleMember, call it.
            if (onToggleMember) return onToggleMember(m, checked);
            // fallback (shouldn't be needed): toggle by calling onSelectMember for checked
            if (checked) onSelectMember && onSelectMember(m);
            else {
              const lokos_shg_code = m.shg_code || m.lokos_shg_code || selectedShg.shg_code;
              const lokos_member_code = m.member_code || m.lokos_member_code || m.id;
              // Attempt to remove using DOM-accessible helper via event (not ideal). Better: parent provides onToggleMember.
              window.dispatchEvent(new CustomEvent("ps:member-removed", { detail: { lokos_member_code, lokos_shg_code } }));
            }
          }}
        />
      </div>
    </div>
  );
}
