// src/pages/TMS/tms_create_tr.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useContext,
  useRef,
  useCallback,
} from "react";
import LeftNav from "../../components/layout/LeftNav";
import TopNav from "../../components/layout/TopNav";
import { AuthContext } from "../../contexts/AuthContext";
import { TMS_API, LOOKUP_API, EPSAKHI_API } from "../../api/axios";
import ShgListTable from "../Dashboard/ShgListTable";
import ShgMemberListTable from "../Dashboard/ShgMemberListTable";

const TRP_SCOPE_CACHE = "tms_trp_user_scope_v1";
const TRAIN_PLAN_CACHE = "tms_training_plans_cache_v1";
const GEOSCOPE_KEY = "ps_user_geoscope";
const MASTER_TRAINERS_CACHE = "tms_master_trainers_cache_v1";
const TRAINING_THEMES_CACHE = "tms_training_themes_cache_v1";
const BLOCK_TO_DISTRICT_CACHE = "tms_block_to_district_v1";

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

/* ---------- TrainerRow: memoized single row to avoid mass re-renders ---------- */
const TrainerRow = React.memo(function TrainerRow({
  row,
  isSelected,
  onToggle,
}) {
  // stable checkbox handler per row
  const handleChange = useCallback(
    (e) => {
      if (typeof onToggle === "function") onToggle(row, e.target.checked);
    },
    [onToggle, row]
  );

  return (
    <tr key={row.id} className={isSelected ? "row-selected" : ""}>
      <td>
        <input type="checkbox" checked={!!isSelected} onChange={handleChange} />
      </td>
      <td>{row.full_name || row.name || "-"}</td>
      <td>{row.designation || "-"}</td>
      <td>{row.empanel_block || "-"}</td>
      <td>{row.empanel_district || "-"}</td>
      <td>{row.mobile_no || "-"}</td>
    </tr>
  );
});

/* ---------- MasterTrainerList: lightweight trainer listing with checkbox selection
   Parent must pass preloadedTrainers (array). This component is memoized to reduce re-renders. */
const MasterTrainerList = React.memo(function MasterTrainerList({
  filters = {},
  onToggleTrainer,
  selectedIds = new Set(),
  preloadedTrainers = null, // plain array
  preloadReloadToken = 0,
  onRequestReload = null,
}) {
  // trainersCache is array of items
  const [trainersCache, setTrainersCache] = useState(
    Array.isArray(preloadedTrainers) ? preloadedTrainers : []
  );

  // local filters & UI state
  const [loading, setLoading] = useState(false);
  const [designation, setDesignation] = useState(filters.designation || "");
  const [search, setSearch] = useState("");
  const [localReloadToken, setLocalReloadToken] = useState(0);

  // sync when parent changes preloadedTrainers or token
  useEffect(() => {
    if (Array.isArray(preloadedTrainers)) {
      setTrainersCache(preloadedTrainers);
    } else {
      setTrainersCache([]);
    }
    setLocalReloadToken((t) => t + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedTrainers, preloadReloadToken]);

  const filteredRows = useMemo(() => {
    if (!Array.isArray(trainersCache)) return [];
    const s = String(search || "")
      .trim()
      .toLowerCase();
    const dLower = String(designation || "").toLowerCase();
    return trainersCache.filter((t) => {
      if (designation && String(t.designation || "").toLowerCase() !== dLower)
        return false;
      if (
        filters.district &&
        String(t.empanel_district) !== String(filters.district)
      )
        return false;
      if (filters.block && String(t.empanel_block) !== String(filters.block))
        return false;
      if (s.length > 0) {
        const hay =
          `${t.full_name || t.name || ""} ${t.mobile_no || ""} ${t.TH_urid || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [trainersCache, designation, filters.district, filters.block, search]);

  // simple client pagination for display
  const PAGE_SIZE = 10;
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [trainersCache, designation, search]);

  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const rows = filteredRows.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE
  );

  // stable wrapper for reload button to show spinner in this component only
  const handleReload = useCallback(() => {
    if (typeof onRequestReload === "function") {
      setLoading(true);
      Promise.resolve(onRequestReload()).finally(() => setLoading(false));
    }
  }, [onRequestReload]);

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="header-row space-between">
        <div>
          <h3>Master Trainers</h3>
          <p className="muted" style={{ marginTop: 4 }}>
            Select trainers for this request.
          </p>
        </div>
        <div>
          <button
            className="btn-sm btn-flat"
            onClick={handleReload}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="filters-row" style={{ gap: 8 }}>
        <input
          className="input"
          placeholder="Search name / mobile"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value || "");
            setPage(1);
          }}
          style={{ width: 180 }}
        />
        <select
          className="input"
          value={designation}
          onChange={(e) => {
            setDesignation(e.target.value);
            setPage(1);
          }}
        >
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
                  const isSel = selectedIds && selectedIds.has(id);
                  return (
                    <TrainerRow
                      key={id}
                      row={r}
                      isSelected={!!isSel}
                      onToggle={onToggleTrainer}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* client-side pagination controls */}
          {total > PAGE_SIZE && (
            <div className="pagination" style={{ marginTop: 8 }}>
              <button
                className="btn-sm btn-flat"
                disabled={pageSafe <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span>
                Page {pageSafe} of {totalPages}
              </span>
              <button
                className="btn-sm btn-flat"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 13, color: "#6c757d" }}>
              Showing {filteredRows.length} trainers
            </div>
            <div
              style={{ marginLeft: "auto", fontSize: 12, color: "#6c757d" }}
            />
          </div>
        </>
      )}
    </div>
  );
});

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

  // NOTE: we expect user's geoscope to contain districts/blocks arrays or single ids
  const [blockId, setBlockId] = useState(
    geoscopeCached?.blocks?.[0] ?? geoscopeCached?.block_id ?? null
  );
  const [districtId, setDistrictId] = useState(
    geoscopeCached?.districts?.[0] ?? geoscopeCached?.district_id ?? null
  );

  // cached lists & allowed IDs
  const [allowedTrainingIds, setAllowedTrainingIds] = useState([]);
  const [plans, setPlans] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState({
    scopes: false,
    plans: false,
    partners: false,
  });

  // preloaded trainers + themes
  // MASTER_TRAINERS_CACHE shape: { items: [...], page: 1, hasNext: true, district_id: <id|null> }
  const initialMasterCache = loadJson(MASTER_TRAINERS_CACHE) || {
    items: [],
    page: 1,
    hasNext: false,
    district_id: null,
  };
  const [preloadedTrainers, setPreloadedTrainers] = useState(
    initialMasterCache.items || []
  );
  // meta kept for backward compatibility, but we don't paginate server-side anymore
  const [preloadedTrainersMeta, setPreloadedTrainersMeta] = useState({
    page: initialMasterCache.page || 1,
    hasNext: Boolean(initialMasterCache.hasNext),
    district_id:
      typeof initialMasterCache.district_id !== "undefined"
        ? initialMasterCache.district_id
        : null,
  });

  const [preloadThemes, setPreloadThemes] = useState(
    loadJson(TRAINING_THEMES_CACHE) || []
  );
  const [preloadReloadToken, setPreloadReloadToken] = useState(0);

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

  // NEW: selected SHG for members area (direct prop, no CustomEvent)
  const [selectedShgForMembers, setSelectedShgForMembers] = useState(null);
  const [selectedShgLoading, setSelectedShgLoading] = useState(false); // loader when clicking SHG

  // Partner auto-assignment flag (true if auto-assigned from partner-targets)
  const [autoPartnerAssigned, setAutoPartnerAssigned] = useState(false);

  // Preview modal + submission progress/results
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSummary, setSubmitSummary] = useState(null); // { trId, successes, failures: [{row, error}], rawResponse }

  // Preload modal state
  const [preloading, setPreloading] = useState(false);
  const [preloadErrors, setPreloadErrors] = useState([]);

  /* ---------- selectedMemberCodes (controlled selection set for member table) ---------- */
  const selectedMemberCodesSet = useMemo(() => {
    return new Set(
      selectedBeneficiaries.map((b) => String(b.lokos_member_code))
    );
  }, [selectedBeneficiaries]);

  /* ---------- FAST single-list fetch helper (used instead of slow multi-page fetchAllPages) ---------- */
  async function fetchListOnce(listFn, params = {}) {
    // calls listFn(params) once and returns array of items (payload.results or payload.data or array)
    try {
      const resp = await listFn(params);
      const payload = resp?.data ?? resp ?? {};
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload.results)) return payload.results;
      if (Array.isArray(payload.data)) return payload.data;
      return [];
    } catch (e) {
      console.error("fetchListOnce error", e);
      return [];
    }
  }

  /* ---------- helper: resolve district from block (if districtId missing) ---------- */
  async function fetchDistrictFromBlock(block) {
    if (!block) return null;
    try {
      // check cache first
      const mapping = loadJson(BLOCK_TO_DISTRICT_CACHE) || {};
      if (mapping && mapping[String(block)]) {
        return mapping[String(block)];
      }

      // Try direct GET endpoint (common path in your system)
      let resp = null;
      try {
        resp = await LOOKUP_API.get(`/blocks/detail/${block}/`);
      } catch (err) {
        // fallback to namespaced client method if available
        try {
          if (
            LOOKUP_API.blocks &&
            typeof LOOKUP_API.blocks.retrieve === "function"
          ) {
            resp = await LOOKUP_API.blocks.retrieve(block);
          } else if (LOOKUP_API.get) {
            // last-resort: try /lookups/blocks/${block}/
            resp = await LOOKUP_API.get(`/lookups/blocks/${block}/`);
          }
        } catch (err2) {
          resp = null;
        }
      }

      const payload = resp?.data ?? resp ?? null;
      // payload may have .district or .data.district
      let districtIdFound = null;
      if (payload) {
        if (
          payload.district &&
          (payload.district.district_id || payload.district.id)
        ) {
          districtIdFound = payload.district.district_id || payload.district.id;
        } else if (
          payload.data &&
          payload.data.district &&
          (payload.data.district.district_id || payload.data.district.id)
        ) {
          districtIdFound =
            payload.data.district.district_id || payload.data.district.id;
        } else if (payload.district_id) {
          districtIdFound = payload.district_id;
        } else if (payload.data && payload.data.district_id) {
          districtIdFound = payload.data.district_id;
        } else if (payload?.district?.district_id) {
          districtIdFound = payload.district.district_id;
        }
      }

      if (districtIdFound) {
        // cache mapping and return
        const mapping2 = loadJson(BLOCK_TO_DISTRICT_CACHE) || {};
        mapping2[String(block)] = districtIdFound;
        saveJson(BLOCK_TO_DISTRICT_CACHE, mapping2);
        return districtIdFound;
      }
    } catch (e) {
      console.warn("fetchDistrictFromBlock failed", e);
    }
    return null;
  }

  /* ---------- preloadAll: minimal initial load on page open (fast) ---------- */
  async function preloadAll() {
    setPreloading(true);
    setPreloadErrors([]);
    setPreloadReloadToken((f) => f + 1);
    const errors = [];

    try {
      // 1) TRP user scopes (single list)
      let scopes = [];
      try {
        scopes = await fetchListOnce(
          (p) => TMS_API.trpUserScopes.list({ ...p }),
          {
            user_role_id: user?.role_id ?? user?.role,
            limit: 500,
          }
        );
        saveJson(TRP_SCOPE_CACHE, {
          ts: Date.now(),
          roleId: user?.role_id ?? user?.role,
          allowedTrainingIds: scopes.map((r) => r.training_id),
        });
        setAllowedTrainingIds(
          Array.from(new Set(scopes.map((r) => r.training_id).filter(Boolean)))
        );
      } catch (e) {
        console.error("preload trpUserScopes failed", e);
        errors.push("trp-user-scopes failed");
      }

      // 2) Fetch training plans (single list call) and filter locally
      try {
        const allPlans = await fetchListOnce(
          (p) => TMS_API.trainingPlans.list(p),
          { limit: 500 }
        );
        const allowedSet = new Set(
          (scopes || []).map((r) => r.training_id).filter(Boolean)
        );
        // if allowedSet empty, show zero; else filter
        const plansCollected =
          allowedSet.size > 0
            ? allPlans.filter((p) => allowedSet.has(p.id))
            : [];
        plansCollected.sort((a, b) => {
          const na = (a.training_name || a.name || "").toString().toLowerCase();
          const nb = (b.training_name || b.name || "").toString().toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return (a.id || 0) - (b.id || 0);
        });
        setPlans(plansCollected);
        saveJson(TRAIN_PLAN_CACHE, {
          ts: Date.now(),
          ids: Array.from(allowedSet),
          plans: plansCollected,
        });
      } catch (e) {
        console.error("preload training plans failed", e);
        errors.push("training-plans fetch failed");
        setPlans([]);
      }

      // 3) Fetch training themes (cache)
      try {
        const list = await fetchListOnce(
          (p) => TMS_API.trainingThemes.list(p),
          { limit: 500 }
        );
        setPreloadThemes(list || []);
        saveJson(TRAINING_THEMES_CACHE, list || []);
      } catch (e) {
        console.error("preload training themes failed", e);
        setPreloadThemes([]);
      }

      // Note: do NOT fetch master-trainers or partners here to keep initial load fast.
    } catch (e) {
      console.error("preloadAll top-level error", e);
      errors.push("unexpected preload error");
    } finally {
      setPreloadErrors(errors);
      setPreloading(false);
      setPreloadReloadToken((t) => t + 1);
    }
  }

  /**
   * fetchMasterTrainersByDistrict
   *
   * Behaviour per user's request:
   * - Make JUST ONE call to /tms/master-trainers/ with empanel_district=<district_id> when district_id is available.
   * - If district_id isn't known but blockId exists, resolve district via block detail API (fetchDistrictFromBlock) and then call the master-trainers endpoint once with that district.
   * - If a district cannot be resolved (or if no district/block is present), call master-trainers once WITHOUT empanel_district to fetch the first page (unfiltered) and display those trainers.
   * - Cache the single-call result in localStorage under MASTER_TRAINERS_CACHE so subsequent opens can use cache unless force=true.
   */
  async function fetchMasterTrainersByDistrict(force = false) {
    // Load cache
    const cached = loadJson(MASTER_TRAINERS_CACHE);
    const cachedItems =
      cached && Array.isArray(cached.items) ? cached.items : null;
    const cachedDistrictId =
      cached && typeof cached.district_id !== "undefined"
        ? cached.district_id
        : null;

    // If we have a cache that matches our desired district situation and not forcing, reuse it
    const desiredDistrict = districtId ?? null; // null means unfiltered
    if (!force && cachedItems) {
      // cache matches desired district (both null OR equal)
      if (
        (desiredDistrict === null && cachedDistrictId === null) ||
        (desiredDistrict !== null &&
          String(cachedDistrictId) === String(desiredDistrict))
      ) {
        setPreloadedTrainers(cachedItems || []);
        setPreloadedTrainersMeta({
          page: cached.page || 1,
          hasNext: Boolean(cached.hasNext),
          district_id: cachedDistrictId,
        });
        return;
      }
    }

    // If districtId missing but we have blockId, try to resolve
    let effectiveDistrict = districtId ?? null;
    if (!effectiveDistrict && blockId) {
      try {
        const resolved = await fetchDistrictFromBlock(blockId);
        if (resolved) {
          effectiveDistrict = resolved;
          // Update local state so subsequent actions know the district
          setDistrictId(resolved);
        } else {
          // could not resolve — we'll fallback to unfiltered call below
          effectiveDistrict = null;
        }
      } catch (e) {
        console.warn("unable to resolve district from block", e);
        effectiveDistrict = null;
      }
    }

    setPreloading(true);
    try {
      // Build single call params
      const baseParams = { limit: 500 };
      const params = { ...baseParams };
      if (effectiveDistrict) {
        params.empanel_district = effectiveDistrict;
      }

      // Single API call (filtered if district available; unfiltered otherwise)
      let resp;
      try {
        resp = await TMS_API.masterTrainers.list(params);
      } catch (err) {
        // If we attempted a district-filtered call and it failed, attempt an unfiltered call just once as fallback
        if (effectiveDistrict) {
          try {
            resp = await TMS_API.masterTrainers.list(baseParams);
            // mark that this response is unfiltered by setting effectiveDistrict = null
            effectiveDistrict = null;
          } catch (err2) {
            resp = null;
          }
        } else {
          resp = null;
        }
      }

      const payload = resp?.data ?? resp ?? {};
      const items = Array.isArray(payload.results)
        ? payload.results
        : Array.isArray(payload)
          ? payload
          : payload.data || [];

      // Save to state and cache (cache district_id: effectiveDistrict or null)
      setPreloadedTrainers(items || []);
      setPreloadedTrainersMeta({
        page: 1,
        hasNext: false,
        district_id: effectiveDistrict ?? null,
      });
      saveJson(MASTER_TRAINERS_CACHE, {
        ts: Date.now(),
        items: items || [],
        page: 1,
        hasNext: false,
        district_id: effectiveDistrict ?? null,
      });
    } catch (e) {
      console.error("fetchMasterTrainersByDistrict failed", e);
      // On error, try to fall back to any cache if present, else set empty
      const cachedItems2 = loadJson(MASTER_TRAINERS_CACHE)?.items || null;
      if (cachedItems2) {
        setPreloadedTrainers(cachedItems2 || []);
        const c = loadJson(MASTER_TRAINERS_CACHE) || {};
        setPreloadedTrainersMeta({
          page: c.page || 1,
          hasNext: Boolean(c.hasNext),
          district_id: c.district_id,
        });
      } else {
        setPreloadedTrainers([]);
        setPreloadedTrainersMeta({
          page: 1,
          hasNext: false,
          district_id: null,
        });
      }
    } finally {
      setPreloading(false);
    }
  }

  // fetch partners only when required (review step)
  async function fetchPartnersIfNeeded() {
    if (Array.isArray(partners) && partners.length > 0) return;
    try {
      setLoading((s) => ({ ...s, partners: true }));
      const resp = await TMS_API.trainingPartners.list({ limit: 500 });
      const payload = resp?.data ?? resp ?? {};
      const list = payload.results || payload.data || [];
      setPartners(list);
    } catch (e) {
      console.error("fetchPartnersIfNeeded failed", e);
      setPartners([]);
    } finally {
      setLoading((s) => ({ ...s, partners: false }));
    }
  }

  // run minimal preload on mount: training plans, TRP scopes, themes (fast)
  useEffect(() => {
    preloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // memoized selected trainer ids set to avoid recreating on every render
  const selectedTrainerIds = useMemo(
    () => new Set(Array.from(selectedTrainersMap.keys())),
    [selectedTrainersMap]
  );

  // trainer selection: stable useCallback to avoid re-creating handler on each render
  const onToggleTrainer = useCallback(
    async (trainerObj, add) => {
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
    },
    [] // uses refs and setState (stable)
  );

  // when user navigates to participants step (2), load only the APIs needed for the chosen 'Applicable For'
  useEffect(() => {
    if (step === 2) {
      if (form.training_type === "TRAINER") {
        // fetch trainers filtered by user's district (single call, cached)
        fetchMasterTrainersByDistrict(false);
      } else {
        // Beneficiary flow: ShgListTable / ShgMemberListTable fetch on demand
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, form.training_type, districtId, blockId]);

  // when user goes to Review & Submit (step 3), fetch partners if not loaded
  useEffect(() => {
    if (step === 3) {
      fetchPartnersIfNeeded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* ---------- handlers ---------- */

  // When a plan is selected, also try to auto-resolve partner (via partner-targets) for BMMU users.
  async function handlePlanSelect(plan) {
    setSelectedPlan(plan);
    setSelectedTheme(null);
    setAutoPartnerAssigned(false);

    // fetch theme detail (if present) from preloaded themes first
    if (plan?.theme) {
      try {
        const cachedTheme = (preloadThemes || []).find(
          (t) => String(t.id) === String(plan.theme)
        );
        if (cachedTheme) {
          setSelectedTheme(cachedTheme);
        } else {
          const resp = await TMS_API.trainingThemes.retrieve(plan.theme);
          const t = resp?.data ?? resp ?? null;
          setSelectedTheme(t);
        }
      } catch (e) {
        setSelectedTheme(null);
      }
    }

    // If BMMU, attempt to find partner via partner targets for this plan
    if (roleKey === "bmmu" && plan?.id) {
      try {
        const resp = await TMS_API.trainingPartnerTargets.list({
          training_plan: plan.id,
          limit: 1,
        });
        const payload = resp?.data ?? resp ?? {};
        const results = payload.results || payload.data || [];
        if (Array.isArray(results) && results.length > 0) {
          const partnerId = results[0].partner;
          if (partnerId) {
            setForm((f) => ({ ...f, partner: String(partnerId) }));
            setAutoPartnerAssigned(true);
          }
        } else {
          setAutoPartnerAssigned(false);
        }
      } catch (e) {
        console.warn("failed to fetch training-partner-targets", e);
        setAutoPartnerAssigned(false);
      }
    } else {
      setAutoPartnerAssigned(false);
    }

    setParticipantSubStep(1);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  /* ---------- helpers: age + map upsrlm payload to TR beneficiary ---------- */
  function calculateAgeFromDob(dob) {
    if (!dob) return null;
    try {
      const d = new Date(dob);
      if (Number.isNaN(d.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    } catch (e) {
      return null;
    }
  }

  function mapUpsrlmMemberToTrBeneficiary(m, shgCode) {
    if (!m) return {};
    const member = Array.isArray(m?.data) ? m.data[0] || {} : m;

    const member_name =
      member.member_name || member.memberName || member.name || "";
    const member_code =
      member.member_code ||
      member.memberCode ||
      member.lokos_member_code ||
      (member.member_id ? String(member.member_id) : "") ||
      member.nic_member_code ||
      member.member_id ||
      "";

    let pld_status_value = "";
    if (
      member.pld_status === true ||
      String(member.pld_status).toLowerCase() === "true"
    ) {
      pld_status_value = "YES";
    } else if (
      member.pld_status === false ||
      String(member.pld_status).toLowerCase() === "false"
    ) {
      pld_status_value = "NO";
    } else {
      pld_status_value =
        typeof member.pld_status === "string" ? member.pld_status : "";
    }

    let designation = "";
    if (
      Array.isArray(member.member_designations) &&
      member.member_designations.length > 0
    ) {
      designation = Array.from(
        new Set(
          member.member_designations.map((d) => d.designation).filter(Boolean)
        )
      ).join(", ");
      if (!designation && member.member_designations[0]?.designation) {
        designation = member.member_designations[0].designation;
      }
    } else if (member.member_designation) {
      designation = member.member_designation;
    }

    let mobile = "";
    if (
      Array.isArray(member.member_phones) &&
      member.member_phones.length > 0
    ) {
      mobile =
        member.member_phones[0]?.phone_no ||
        member.member_phones[0]?.phone ||
        "";
    } else if (member.phone_no) {
      mobile = member.phone_no;
    } else if (member.mobile) {
      mobile = member.mobile;
    }

    const education = member.education || "";
    const religion = member.religion || "";
    const social_category =
      member.social_category || member.socialCategory || "";

    let address = "";
    let district_id = null;
    let block_id = null;
    let panchayat_id = null;
    let village_id = null;
    if (
      Array.isArray(member.member_addresses) &&
      member.member_addresses.length > 0
    ) {
      const a = member.member_addresses[0];
      const parts = [];
      if (a.address_line1) parts.push(String(a.address_line1).trim());
      if (a.address_line2) parts.push(String(a.address_line2).trim());
      if (a.village_name) parts.push(String(a.village_name).trim());
      if (a.panchayat_name) parts.push(String(a.panchayat_name).trim());
      if (a.block_name) parts.push(String(a.block_name).trim());
      if (a.district_name) parts.push(String(a.district_name).trim());
      address = parts.join(", ");

      district_id = a.district_id
        ? isNaN(Number(a.district_id))
          ? a.district_id
          : Number(a.district_id)
        : null;
      block_id = a.block_id
        ? isNaN(Number(a.block_id))
          ? a.block_id
          : Number(a.block_id)
        : null;
      panchayat_id = a.panchayat_id
        ? isNaN(Number(a.panchayat_id))
          ? a.panchayat_id
          : Number(a.panchayat_id)
        : null;
      village_id = a.village_id
        ? isNaN(Number(a.village_id))
          ? a.village_id
          : Number(a.village_id)
        : null;
    }

    const email = member.email || member.member_email || "";

    const dob = member.dob || member.date_of_birth || member.dob_date || null;
    const age = calculateAgeFromDob(dob) ?? member.age ?? null;

    const gender = member.gender || "";

    return {
      lokos_shg_code:
        shgCode || member.shg_code || (member.shg && member.shg.shg_code) || "",
      shg_code:
        shgCode || member.shg_code || (member.shg && member.shg.shg_code) || "",
      lokos_member_code: member_code,
      member_code: member_code,
      member_name,
      age,
      gender,
      pld_status: pld_status_value,
      designation,
      social_category,
      religion,
      mobile,
      email,
      education,
      address,
      district_id,
      block_id,
      panchayat_id,
      village_id,
      __raw_upsrlm: member,
    };
  }

  /* --- MEMBER DETAIL FETCH (best-effort) --- */
  async function fetchMemberDetailBestEffort(member) {
    const memberCode =
      member.member_code ||
      member.lokos_member_code ||
      member.memberCode ||
      member.id ||
      member.member_id ||
      member.nic_member_code ||
      "";

    const shgCode =
      member.shg_code ||
      member.lokos_shg_code ||
      member.shgCode ||
      (member.shg && (member.shg.shg_code || member.shg.code)) ||
      "";

    const looksDetailed =
      member &&
      (member.age ||
        member.pld_status ||
        member.member_phones ||
        member.member_addresses ||
        member.dob);
    if (looksDetailed) {
      return mapUpsrlmMemberToTrBeneficiary(member, shgCode);
    }

    const attempts = [];

    if (typeof EPSAKHI_API?.upsrlmMemberDetail === "function") {
      attempts.push(() => EPSAKHI_API.upsrlmMemberDetail(shgCode, memberCode));
    }
    if (typeof EPSAKHI_API?.memberDetail === "function") {
      attempts.push(() => EPSAKHI_API.memberDetail(memberCode));
    }
    attempts.push(() =>
      EPSAKHI_API.get(`/upsrlm/shg-members/?search=${memberCode}`)
    );
    attempts.push(() => EPSAKHI_API.get(`/upsrlm/members/${memberCode}/`));
    attempts.push(() =>
      EPSAKHI_API.get(`/upsrlm/members/detail/${memberCode}/`)
    );
    attempts.push(() => EPSAKHI_API.get(`/shg-members/${memberCode}/`));
    attempts.push(() => EPSAKHI_API.get(`/members/${memberCode}/`));

    for (const fn of attempts) {
      try {
        const res = await fn();
        const payload = res?.data ?? res ?? null;
        if (!payload) continue;

        let candidate = null;
        if (Array.isArray(payload.data) && payload.data.length > 0) {
          candidate = payload.data[0];
        } else if (
          Array.isArray(payload.results) &&
          payload.results.length > 0
        ) {
          candidate = payload.results[0];
        } else if (
          payload.member_name ||
          payload.member_code ||
          payload.dob ||
          payload.member_addresses
        ) {
          candidate = payload;
        } else {
          candidate = payload;
        }

        if (candidate) {
          return mapUpsrlmMemberToTrBeneficiary(candidate, shgCode);
        }
      } catch (e) {
        // ignore and continue
      }
    }

    return mapUpsrlmMemberToTrBeneficiary(member, shgCode);
  }

  // SHG member selection: add member object (full response saved in savedMemberResponses)
  function addSelectedMember(memberObj) {
    const lokos_shg_code =
      memberObj.shg_code ||
      memberObj.lokos_shg_code ||
      memberObj.shgCode ||
      (memberObj.shg && (memberObj.shg.shg_code || memberObj.shg.code));
    const lokos_member_code =
      memberObj.member_code ||
      memberObj.lokos_member_code ||
      memberObj.memberCode ||
      memberObj.id;
    const key = `${lokos_shg_code}|${lokos_member_code}`;
    // save full (mapped) response
    savedMemberResponses.current.set(key, memberObj);

    setSelectedBeneficiaries((prev) => {
      const exists = prev.some(
        (p) =>
          String(p.lokos_member_code) === String(lokos_member_code) &&
          String(p.lokos_shg_code) === String(lokos_shg_code)
      );
      if (exists) return prev;
      const normalized = {
        lokos_shg_code,
        lokos_member_code,
        member_name: memberObj.member_name || memberObj.name || "",
        age: memberObj.age ?? memberObj.dob_age ?? null,
        gender: memberObj.gender || "",
        pld_status: memberObj.pld_status || memberObj.pldStatus || "",
        mobile:
          (memberObj.member_phones && memberObj.member_phones[0]?.phone_no) ||
          memberObj.mobile ||
          memberObj.phone_no ||
          memberObj.mobile ||
          "",
        address: memberObj.address || "",
        social_category:
          memberObj.social_category ||
          memberObj.socialCategory ||
          memberObj.social_category ||
          "",
        religion: memberObj.religion || "",
        district_id: memberObj.district_id ?? memberObj.districtId ?? null,
        block_id: memberObj.block_id ?? memberObj.blockId ?? null,
        panchayat_id: memberObj.panchayat_id ?? memberObj.panchayatId ?? null,
        village_id: memberObj.village_id ?? memberObj.villageId ?? null,
        designation: memberObj.designation || "",
        education: memberObj.education || "",
        email: memberObj.email || "",
      };
      return [...prev, normalized];
    });
  }

  function removeSelectedBeneficiary(lokos_member_code, lokos_shg_code) {
    const mcode = lokos_member_code ?? "";
    const scode = lokos_shg_code ?? "";
    setSelectedBeneficiaries((prev) =>
      prev.filter(
        (b) =>
          !(
            String(b.lokos_member_code) === String(mcode) &&
            String(b.lokos_shg_code) === String(scode)
          )
      )
    );
    try {
      const key = `${scode}|${mcode}`;
      savedMemberResponses.current.delete(key);
    } catch (e) {
      // ignore
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
    // include best-effort block/district (may be null)
    const userBlock =
      user?.block_id ??
      user?.blockId ??
      geoscopeCached?.blocks?.[0] ??
      geoscopeCached?.block_id ??
      blockId ??
      null;

    // Use current districtId state if available (this is best-effort for preview)
    const previewDistrict =
      districtId ??
      geoscopeCached?.districts?.[0] ??
      geoscopeCached?.district_id ??
      null;

    const payload = {
      training_plan: selectedPlan?.id ?? null,
      partner: form.partner ? Number(form.partner) : null,
      training_type: form.training_type,
      level: form.level,
      notes: form.notes || null,
      created_by: user?.id ?? user?.user_id ?? null,
      beneficiaries_count:
        form.training_type === "BENEFICIARY" ? selectedBeneficiaries.length : 0,
      trainers_count:
        form.training_type === "TRAINER" ? selectedTrainersMap.size : 0,
      block: userBlock ?? null,
      district: previewDistrict ?? null,
    };
    return payload;
  }

  // open preview modal
  function openPreview() {
    if (!selectedPlan) return alert("Select a training plan first.");

    if (!form.partner && !(roleKey === "bmmu" && autoPartnerAssigned))
      return alert("Select partner.");

    if (
      form.training_type === "BENEFICIARY" &&
      selectedBeneficiaries.length === 0
    )
      return alert("Select beneficiaries.");
    if (form.training_type === "TRAINER" && selectedTrainersMap.size === 0)
      return alert("Select trainers.");
    setPreviewOpen(true);
  }

  // final submit: create training request, then create child rows with per-row error handling
  async function confirmAndSubmit() {
    setSubmitting(true);
    setSubmitSummary(null);

    try {
      // Determine user's block id (prefer explicit user.block, fallbacks)
      const userBlockRaw =
        user?.block_id ??
        user?.blockId ??
        geoscopeCached?.blocks?.[0] ??
        geoscopeCached?.block_id ??
        blockId ??
        null;
      const userBlock =
        typeof userBlockRaw === "string" && userBlockRaw.trim() === ""
          ? null
          : userBlockRaw;

      // Resolve district from block (best-effort)
      let resolvedDistrict = null;
      if (userBlock) {
        try {
          const d = await fetchDistrictFromBlock(userBlock);
          if (d) {
            resolvedDistrict = isNaN(Number(d)) ? d : Number(d);
            // update local district state so UI and subsequent calls may benefit
            setDistrictId(resolvedDistrict);
          }
        } catch (e) {
          console.warn("failed to resolve district for TR payload", e);
        }
      }

      // create training request (include block & district)
      const trPayload = {
        training_plan: selectedPlan.id,
        partner: form.partner ? Number(form.partner) : null,
        training_type: form.training_type,
        level: form.level,
        notes: form.notes || null,
        created_by: user?.id ?? user?.user_id ?? null,
        block: userBlock
          ? isNaN(Number(userBlock))
            ? userBlock
            : Number(userBlock)
          : null,
        district: resolvedDistrict ?? null,
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
            designation: raw.designation || b.designation || "",
            pld_status: raw.pld_status || b.pld_status || "",
            social_category: raw.social_category || b.social_category || "",
            religion: raw.religion || b.religion || "",
            mobile: raw.mobile || b.mobile || "",
            email: raw.email || "",
            education: raw.education || "",
            address: raw.address || b.address || "",
            district: raw.district_id || raw.district || b.district_id || null,
            block: raw.block_id || raw.block || b.block_id || null,
            panchayat:
              raw.panchayat_id || raw.panchayat || b.panchayat_id || null,
            village: raw.village_id || raw.village || b.village_id || null,
            remarks: raw.remarks || "",
            created_by: user?.id ?? user?.user_id ?? null,
          };

          try {
            const resp =
              await TMS_API.trainingRequestBeneficiaries.create(bPayload);
            successes.push({
              type: "beneficiary",
              row: b,
              resp: resp?.data ?? resp,
            });
          } catch (e) {
            const msg =
              (e?.response?.data && JSON.stringify(e.response.data)) ||
              e?.message ||
              String(e);
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
            successes.push({
              type: "trainer",
              row: detail,
              resp: resp?.data ?? resp,
            });
          } catch (e) {
            const msg =
              (e?.response?.data && JSON.stringify(e.response.data)) ||
              e?.message ||
              String(e);
            failures.push({ type: "trainer", row: detail, error: msg });
            console.error("trainer create failed", tPayload, e);
          }
        }
      }

      setSubmitSummary({ trId, successes, failures });
    } catch (e) {
      console.error("create training request failed", e);
      setSubmitSummary({
        trId: null,
        successes: [],
        failures: [
          {
            type: "training_request",
            error:
              (e?.response?.data && JSON.stringify(e.response.data)) ||
              e?.message ||
              String(e),
          },
        ],
      });
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- small UI helpers ---------- */
  const selectedTrainerList = useMemo(
    () => Array.from(selectedTrainersMap.values()),
    [selectedTrainersMap]
  );
  const selectedPlanTitle =
    selectedPlan &&
    (selectedPlan.training_name ||
      selectedPlan.training_plan_name ||
      selectedPlan.trainingTitle ||
      selectedPlan.name ||
      `Plan ${selectedPlan.id}`);

  /* ---------- render ---------- */
  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu — Create Training Request
            </div>
          }
        />

        <main style={{ padding: 18 }}>
          <div
            style={{ maxWidth: 1200, margin: "20px auto", padding: "0 12px" }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>Create Training Request</h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  onClick={() => {
                    // Clear caches and re-run preload (no page reload)
                    localStorage.removeItem(TRP_SCOPE_CACHE);
                    localStorage.removeItem(TRAIN_PLAN_CACHE);
                    localStorage.removeItem(MASTER_TRAINERS_CACHE);
                    localStorage.removeItem(TRAINING_THEMES_CACHE);
                    // re-run minimal preload
                    preloadAll();
                  }}
                >
                  Refresh & Reload
                </button>
              </div>
            </div>

            {/* Stepper */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 16,
                alignItems: "center",
              }}
            >
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 420px",
                gap: 20,
              }}
            >
              {/* LEFT column */}
              <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
                {/* Step content */}
                {step === 1 && (
                  <>
                    <h3 style={{ marginTop: 0 }}>1 — Choose Training Plan</h3>
                    <div style={{ marginBottom: 12 }}>
                      <label
                        style={{
                          display: "block",
                          fontWeight: 700,
                          marginBottom: 6,
                        }}
                      >
                        Training Plan (allowed for your role)
                      </label>
                      <select
                        className="input"
                        value={selectedPlan?.id || ""}
                        onChange={(e) => {
                          const id = e.target.value;
                          const pl = plans.find(
                            (p) => String(p.id) === String(id)
                          );
                          handlePlanSelect(pl || null);
                        }}
                      >
                        <option value="">-- select training plan --</option>
                        {plans.map((p) => {
                          const title =
                            p.training_name ||
                            p.training_plan_name ||
                            p.trainingTitle ||
                            p.name ||
                            `Plan ${p.id}`;
                          return (
                            <option key={p.id} value={p.id}>
                              {title}{" "}
                              {p.level_of_training
                                ? `(${p.level_of_training})`
                                : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {selectedPlan ? (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          border: "1px solid #eef2f6",
                          borderRadius: 6,
                        }}
                      >
                        <h3 style={{ margin: "6px 0" }}>{selectedPlanTitle}</h3>
                        <div style={{ color: "#6c757d", marginBottom: 8 }}>
                          {selectedPlan.training_objective ||
                            selectedPlan.description ||
                            ""}
                        </div>
                        <div
                          style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
                        >
                          <div>
                            <strong>Duration:</strong>{" "}
                            {selectedPlan.no_of_days ?? "—"} days
                          </div>
                          <div>
                            <strong>Type:</strong>{" "}
                            {selectedPlan.type_of_training || "—"}
                          </div>
                          <div>
                            <strong>Level:</strong>{" "}
                            {selectedPlan.level_of_training || "—"}
                          </div>
                          <div>
                            <strong>Theme:</strong>{" "}
                            {selectedPlan.theme_name ||
                              selectedTheme?.theme_name ||
                              "—"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="muted">
                        Select a training plan to preview details and choose
                        participants.
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        className="btn"
                        onClick={() => goToNext()}
                        disabled={!selectedPlan}
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <h3 style={{ marginTop: 0 }}>
                          2 — Select Participants
                        </h3>
                        <div className="muted">
                          Choose beneficiaries (SHGs) or trainers depending on
                          selection.
                        </div>
                      </div>
                      <div>
                        <button className="btn btn-outline" onClick={goToPrev}>
                          Back
                        </button>
                        <button
                          className="btn"
                          style={{ marginLeft: 8 }}
                          onClick={() => goToNext()}
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        margin: "12px 0",
                        alignItems: "center",
                      }}
                    >
                      <label style={{ fontWeight: 700 }}>Applicable For</label>
                      <select
                        value={form.training_type}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((f) => ({ ...f, training_type: val }));
                          // If switching to TRAINER while on participants step, fetch trainers for user's district
                          if (val === "TRAINER" && step === 2) {
                            fetchMasterTrainersByDistrict(true);
                          }
                        }}
                      >
                        <option value="BENEFICIARY">Beneficiary</option>
                        <option value="TRAINER">Master Trainer</option>
                      </select>

                      <label style={{ fontWeight: 700, marginLeft: 12 }}>
                        Level
                      </label>
                      <select
                        value={form.level}
                        onChange={(e) =>
                          setForm({ ...form, level: e.target.value })
                        }
                      >
                        <option value="BLOCK">Block</option>
                        <option value="DISTRICT">District</option>
                        <option value="STATE">State</option>
                      </select>
                    </div>

                    {/* Render beneficiary vs trainer flows */}
                    {form.training_type === "BENEFICIARY" ? (
                      <>
                        {/* sub-stepper for beneficiary flow */}
                        <div
                          style={{ display: "flex", gap: 8, marginBottom: 12 }}
                        >
                          <div
                            onClick={() => setParticipantSubStep(1)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              background:
                                participantSubStep === 1
                                  ? "#0b2540"
                                  : "#f5f7fa",
                              color:
                                participantSubStep === 1 ? "#fff" : "#0b2540",
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
                              background:
                                participantSubStep === 2
                                  ? "#0b2540"
                                  : "#f5f7fa",
                              color:
                                participantSubStep === 2 ? "#fff" : "#0b2540",
                              cursor: "pointer",
                            }}
                          >
                            2 — Members
                          </div>
                        </div>

                        {participantSubStep === 1 && (
                          <div>
                            <h4>SHG list</h4>
                            <div
                              style={{
                                fontSize: 13,
                                color: "#6c757d",
                                marginBottom: 8,
                              }}
                            >
                              Select an SHG to view members. After selecting an
                              SHG, go to member sub-step to pick members (or
                              click a SHG member directly to jump).
                            </div>

                            <ShgListTable
                              blockId={blockId}
                              onSelectShg={(shg) => {
                                setSelectedShgLoading(true);
                                setSelectedShgForMembers(shg);
                                setParticipantSubStep(2);
                                setMemberListReloadToken((t) => t + 1);
                                setTimeout(
                                  () => setSelectedShgLoading(false),
                                  700
                                );
                              }}
                            />
                          </div>
                        )}

                        {participantSubStep === 2 && (
                          <div>
                            <h4>Members (selected SHG)</h4>
                            <div
                              style={{
                                fontSize: 13,
                                color: "#6c757d",
                                marginBottom: 8,
                              }}
                            >
                              Use PLD filter, search and pagination inside the
                              member list. Check members to add them to
                              selection. Once checked, items cannot be unchecked
                              (use Remove in Review step).
                            </div>

                            {selectedShgLoading ? (
                              <div
                                className="table-spinner"
                                style={{ padding: 12 }}
                              >
                                Loading members…
                              </div>
                            ) : (
                              <div className="no-action">
                                <MemberListArea
                                  selectedShg={selectedShgForMembers}
                                  onToggleMember={async (member, checked) => {
                                    const lokos_shg_code =
                                      member.shg_code ||
                                      member.lokos_shg_code ||
                                      member.shg?.shg_code ||
                                      (selectedShgForMembers &&
                                        (selectedShgForMembers.shg_code ||
                                          selectedShgForMembers.code));
                                    const lokos_member_code =
                                      member.member_code ||
                                      member.lokos_member_code ||
                                      member.memberCode ||
                                      member.id;

                                    if (!checked) {
                                      // ignore uncheck attempts
                                      return;
                                    }

                                    const already = selectedBeneficiaries.some(
                                      (p) =>
                                        String(p.lokos_member_code) ===
                                          String(lokos_member_code) &&
                                        String(p.lokos_shg_code) ===
                                          String(lokos_shg_code)
                                    );
                                    if (already) return;

                                    try {
                                      const detail =
                                        await fetchMemberDetailBestEffort(
                                          member
                                        );
                                      const merged = {
                                        ...(detail || {}),
                                        shg_code: lokos_shg_code,
                                        member_code: lokos_member_code,
                                      };
                                      addSelectedMember(merged);
                                    } catch (e) {
                                      addSelectedMember({
                                        ...member,
                                        shg_code: lokos_shg_code,
                                        member_code: lokos_member_code,
                                      });
                                    }
                                  }}
                                  reloadToken={memberListReloadToken}
                                  selectedMemberCodes={selectedMemberCodesSet}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        {/* MasterTrainerList expects parent to have fetched trainers by district */}
                        <MasterTrainerList
                          filters={{ district: districtId }}
                          onToggleTrainer={onToggleTrainer}
                          selectedIds={selectedTrainerIds}
                          preloadedTrainers={preloadedTrainers}
                          preloadReloadToken={preloadReloadToken}
                          onRequestReload={() =>
                            fetchMasterTrainersByDistrict(true)
                          }
                        />
                      </div>
                    )}
                  </>
                )}

                {step === 3 && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <h3 style={{ marginTop: 0 }}>3 — Review & Submit</h3>
                        <div className="muted">
                          Preview payload and confirm submission.
                        </div>
                      </div>
                      <div>
                        <button className="btn btn-outline" onClick={goToPrev}>
                          Back
                        </button>
                        <button
                          className="btn"
                          style={{ marginLeft: 8 }}
                          onClick={openPreview}
                        >
                          Preview & Confirm
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: "block", fontWeight: 700 }}>
                        Training Plan
                      </label>
                      <div
                        style={{
                          padding: 8,
                          background: "#f8fafc",
                          borderRadius: 6,
                        }}
                      >
                        {selectedPlan ? selectedPlanTitle : "(none selected)"}
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: "block", fontWeight: 700 }}>
                        Partner
                      </label>

                      {roleKey === "bmmu" && autoPartnerAssigned ? (
                        <div
                          style={{
                            padding: 8,
                            background: "#fbfdff",
                            borderRadius: 6,
                          }}
                        >
                          {partners.find(
                            (p) => String(p.id) === String(form.partner)
                          )?.name || `Partner ID ${form.partner}`}
                        </div>
                      ) : (
                        <select
                          name="partner"
                          value={form.partner}
                          onChange={(e) =>
                            setForm({ ...form, partner: e.target.value })
                          }
                          className="input"
                          disabled={roleKey === "bmmu" && autoPartnerAssigned}
                        >
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
                          <div
                            className="table-wrapper"
                            style={{ maxHeight: 220, overflow: "auto" }}
                          >
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
                                  <tr
                                    key={`${b.lokos_shg_code}|${b.lokos_member_code}|${idx}`}
                                  >
                                    <td>{b.lokos_shg_code || "—"}</td>
                                    <td>{b.member_name || "—"}</td>
                                    <td>{b.lokos_member_code || "—"}</td>
                                    <td>{b.age ?? "—"}</td>
                                    <td>{b.pld_status || "—"}</td>
                                    <td>
                                      <button
                                        className="btn-sm btn-flat"
                                        onClick={() =>
                                          removeSelectedBeneficiary(
                                            b.lokos_member_code,
                                            b.lokos_shg_code
                                          )
                                        }
                                      >
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
                        <div
                          className="table-wrapper"
                          style={{ maxHeight: 220, overflow: "auto" }}
                        >
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
                                    <button
                                      className="btn-sm btn-flat"
                                      onClick={() =>
                                        removeSelectedTrainer(t.id)
                                      }
                                    >
                                      Remove
                                    </button>
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
              <aside
                style={{ background: "#fff", padding: 16, borderRadius: 8 }}
              >
                <h3 style={{ marginTop: 0 }}>Request Summary</h3>
                <div
                  style={{ fontSize: 13, color: "#6c757d", marginBottom: 8 }}
                >
                  Quick summary and actions.
                </div>

                <div style={{ marginBottom: 12 }}>
                  <strong>Plan:</strong>
                  <div
                    style={{
                      padding: 8,
                      background: "#fbfdff",
                      borderRadius: 6,
                    }}
                  >
                    {selectedPlan ? selectedPlanTitle : "—"}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <strong>Type:</strong> {form.training_type}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <strong>Participants:</strong>{" "}
                  {form.training_type === "BENEFICIARY"
                    ? `${selectedBeneficiaries.length} beneficiaries`
                    : `${selectedTrainersMap.size} trainers`}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={openPreview}>
                    Preview & Confirm
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setSelectedBeneficiaries([]);
                      setSelectedTrainersMap(new Map());
                    }}
                  >
                    Clear Selections
                  </button>
                </div>

                {submitSummary && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 8,
                      borderRadius: 6,
                      border: "1px solid #f1f3f5",
                      background: "#fff",
                    }}
                  >
                    <h4 style={{ margin: "6px 0" }}>Last submission</h4>
                    {submitSummary.trId ? (
                      <div>
                        Training Request ID:{" "}
                        <strong>{submitSummary.trId}</strong>
                      </div>
                    ) : (
                      <div style={{ color: "#b03a2e" }}>
                        Training request failed to create.
                      </div>
                    )}
                    <div>Successes: {submitSummary.successes?.length ?? 0}</div>
                    <div>Failures: {submitSummary.failures?.length ?? 0}</div>
                    {submitSummary.failures?.length > 0 && (
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ cursor: "pointer" }}>
                          Show errors
                        </summary>
                        <ul>
                          {submitSummary.failures.map((f, i) => (
                            <li key={i}>
                              <strong>{f.type}</strong>:{" "}
                              {f.error || JSON.stringify(f.row)}
                            </li>
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
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: 920,
              maxHeight: "88vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 8,
              padding: 18,
            }}
          >
            <h3>Preview Training Request</h3>
            <div style={{ color: "#6c757d", marginBottom: 12 }}>
              Review payload below. Confirm to submit.
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <h4>Request payload</h4>
                <pre
                  style={{
                    background: "#f7fafc",
                    padding: 12,
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  {JSON.stringify(buildPreviewPayload(), null, 2)}
                </pre>
              </div>

              <div style={{ width: 360 }}>
                <h4>Participants</h4>
                {form.training_type === "BENEFICIARY" ? (
                  selectedBeneficiaries.length === 0 ? (
                    <p className="muted">No beneficiaries</p>
                  ) : (
                    <div style={{ maxHeight: 420, overflow: "auto" }}>
                      <table className="table table-compact">
                        <thead>
                          <tr>
                            <th>SHG</th>
                            <th>Member</th>
                            <th>Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBeneficiaries.map((b, i) => (
                            <tr
                              key={`${b.lokos_shg_code}|${b.lokos_member_code}|${i}`}
                            >
                              <td>{b.lokos_shg_code}</td>
                              <td>{b.member_name}</td>
                              <td>{b.lokos_member_code}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : selectedTrainerList.length === 0 ? (
                  <p className="muted">No trainers</p>
                ) : (
                  <div style={{ maxHeight: 420, overflow: "auto" }}>
                    <table className="table table-compact">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Designation</th>
                        </tr>
                      </thead>
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

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 12,
              }}
            >
              <button
                className="btn btn-outline"
                onClick={() => setPreviewOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
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
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
          }}
        >
          <div
            style={{
              width: 760,
              background: "#fff",
              borderRadius: 8,
              padding: 18,
            }}
          >
            <h3>Submission Result</h3>
            <div style={{ marginBottom: 8 }}>
              {submitSummary.trId ? (
                <div>
                  Training Request created:{" "}
                  <strong>{submitSummary.trId}</strong>
                </div>
              ) : (
                <div style={{ color: "#b03a2e" }}>
                  Failed to create training request
                </div>
              )}
            </div>

            <div>
              Child rows succeeded: {submitSummary.successes?.length ?? 0}
            </div>
            <div>Child rows failed: {submitSummary.failures?.length ?? 0}</div>

            {submitSummary.failures?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4>Errors</h4>
                <div
                  style={{
                    maxHeight: 260,
                    overflow: "auto",
                    border: "1px solid #f1f3f5",
                    padding: 8,
                    borderRadius: 6,
                  }}
                >
                  <ul>
                    {submitSummary.failures.map((f, i) => (
                      <li key={i}>
                        <strong>{f.type}</strong>:{" "}
                        {f.error || JSON.stringify(f.row)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 12,
              }}
            >
              <button
                className="btn btn-outline"
                onClick={() => setSubmitSummary(null)}
              >
                Close
              </button>
              <button className="btn" onClick={() => setSubmitSummary(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Preload modal ---------- */}
      {preloading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              width: 520,
              background: "#fff",
              borderRadius: 8,
              padding: 18,
              textAlign: "center",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Loading data…</h3>
            <p style={{ color: "#6c757d" }}>
              Preparing training plans and themes. Master trainers and partners
              are loaded only when needed.
            </p>
            <div style={{ marginTop: 12 }}>
              <div className="table-spinner" style={{ padding: 12 }}>
                Loading…
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <button
                className="btn btn-outline"
                onClick={() => setPreloading(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* If there were non-fatal preload errors, show a dismissible notice */}
      {!preloading && preloadErrors?.length > 0 && (
        <div
          style={{
            position: "fixed",
            right: 12,
            bottom: 12,
            zIndex: 99999,
            background: "#fff4e5",
            border: "1px solid #ffd8a8",
            padding: 12,
            borderRadius: 8,
            maxWidth: 420,
          }}
        >
          <strong>Some data failed to load</strong>
          <div style={{ fontSize: 13, color: "#6c757d", marginTop: 6 }}>
            {preloadErrors.join(", ")}
          </div>
          <div style={{ marginTop: 8, textAlign: "right" }}>
            <button
              className="btn-sm btn-flat"
              onClick={() => setPreloadErrors([])}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Small style to hide the last column (View Detail / Action) only inside MemberListArea wrapper */}
      <style>{`
        /* .no-action wrapper hides the last column (header + cells) of tables within it.
           This keeps other tables intact while removing the "View Detail" action in member list. */
        .no-action .table thead th:last-child,
        .no-action .table tbody td:last-child {
          display: none;
        }
      `}</style>
    </div>
  );
}

/* ---------- MemberListArea: now driven by selectedShg prop (no CustomEvent) ---------- */
function MemberListArea({
  selectedShg,
  onSelectMember,
  onToggleMember,
  reloadToken = 0,
  selectedMemberCodes = null,
}) {
  if (!selectedShg) {
    return (
      <div className="muted">Select an SHG from the left to view members.</div>
    );
  }

  const stableKey =
    selectedShg.id ??
    selectedShg.shg_code ??
    selectedShg.shgCode ??
    JSON.stringify(selectedShg);

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <strong>SHG:</strong>{" "}
        {selectedShg.shg_name || selectedShg.name || selectedShg.shg_code}
      </div>

      <div key={`${stableKey}::${reloadToken}`}>
        <ShgMemberListTable
          shg={selectedShg}
          shgId={selectedShg.id ?? selectedShg.shg_code}
          onSelectMember={(m) => onSelectMember && onSelectMember(m)}
          onToggleMember={(m, checked) => {
            if (onToggleMember) return onToggleMember(m, checked);
            if (checked && onSelectMember) onSelectMember(m);
          }}
          selectedMemberCodes={selectedMemberCodes}
        />
      </div>
    </div>
  );
}
