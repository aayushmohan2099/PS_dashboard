// src/utils/roleUtils.js
export const ROLE_ID_MAP = {
  1: "bmmu",
  2: "dmmu",
  3: "smmu",
  4: "training_partner",
  5: "crp_ld",
  6: "crp_ep",
  7: "master_trainer",
  8: "state_admin",
  9: "pmu_admin",
  10: "dcnrlm",
  11: "tp_contact_person",
};

/**
 * Return canonical role key (string) for a user or geoscope object.
 * Prefers numeric id (user.role_id || user.role) then role_name or geoscope.role.
 * Returns empty string if unknown.
 */
export function getCanonicalRole(obj = {}) {
  if (!obj) return "";

  // 1) numeric role id (user.role_id || user.role)
  const candidateId = Number(obj.role_id ?? obj.role);
  if (!Number.isNaN(candidateId) && ROLE_ID_MAP[candidateId]) {
    return ROLE_ID_MAP[candidateId];
  }

  // 2) if obj.role is an object {id:.., name:..}:
  if (obj.role && typeof obj.role === "object") {
    const id = Number(obj.role.id);
    if (!Number.isNaN(id) && ROLE_ID_MAP[id]) return ROLE_ID_MAP[id];
    const nm = (obj.role.name || "").toString().toLowerCase();
    if (nm) return nm;
  }

  // 3) string role_name / role
  const nameStr = (obj.role_name || obj.role || "").toString().toLowerCase();
  if (nameStr) {
    if (nameStr.includes("bmmu")) return "bmmu";
    if (nameStr.includes("dmmu")) return "dmmu";
    if (nameStr.includes("smmu") || nameStr.includes("state_mission")) return "smmu";
    if (nameStr.includes("training_partner")) return "training_partner";
    if (nameStr.includes("master_trainer")) return "master_trainer";
    if (nameStr.includes("dcnrlm")) return "dcnrlm";
    if (nameStr.includes("contact") || nameStr.includes("tp_cp") || nameStr.includes("tp_contact")) return "tp_contact_person";
    if (nameStr.includes("crp_ep")) return "crp_ep";
    if (nameStr.includes("crp_ld")) return "crp_ld";
    if (nameStr.includes("state_admin")) return "state_admin";
    if (nameStr.includes("pmu_admin")) return "pmu_admin";
  }

  // 4) fallback: try geoscope in localStorage
  try {
    const geo = JSON.parse(window.localStorage.getItem("ps_user_geoscope") || "null");
    if (geo?.role) return getCanonicalRole(geo);
  } catch (e) {}

  return "";
}

/**
 * Small helper to convert canonical key -> numeric id (useful when your admin UI
 * needs to post role id to backend).
 */
export function canonicalToId(key) {
  const found = Object.entries(ROLE_ID_MAP).find(([, v]) => v === key);
  return found ? Number(found[0]) : null;
}
