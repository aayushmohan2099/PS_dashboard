// src/api/axios.js
import axios from "axios";
import {
  getAccessToken,
  getRefreshToken,
  setAuth,
  clearAuth,
  getApiHeaders,
} from "../utils/storage";

// ------------------------
// Axios instance
// ------------------------

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {},
});

// ------------------------
// Helpers
// ------------------------

function isAuthUrl(url = "") {
  return url.startsWith("/auth/") || url.includes("/auth/");
}

function isLookupUrl(url = "") {
  return url.startsWith("/lookups/") || url.includes("/lookups/");
}

// ------------------------
// Request interceptor
// ------------------------

api.interceptors.request.use(
  (config) => {
    const url = config.url || "";
    config.headers = config.headers || {};
    config.withCredentials = true;

    const auth = isAuthUrl(url);
    const lookup = isLookupUrl(url);

    // LOOKUPS: only X-API headers, NO Authorization
    if (lookup) {
      // remove any Authorization if present
      delete config.headers["Authorization"];

      const apiHdrs = (getApiHeaders && getApiHeaders()) || {};
      const apiId =
        apiHdrs.apiId || apiHdrs["X-API-ID"] || "TH_EPS.BDOuser_test.co.in";
      const apiKey =
        apiHdrs.apiKey ||
        apiHdrs["X-API-KEY"] ||
        "wFR8IpSeNMawCF4RPLXit1POGuQAJTSmRexBBOwO";

      config.headers["X-API-ID"] = apiId;
      config.headers["X-API-KEY"] = apiKey;

      return config;
    }

    // AUTH: no Authorization, no X-API
    if (auth) {
      delete config.headers["Authorization"];
      delete config.headers["X-API-ID"];
      delete config.headers["X-API-KEY"];
      return config;
    }

    // OTHER API endpoints: Bearer token, no X-API
    delete config.headers["X-API-ID"];
    delete config.headers["X-API-KEY"];

    const token = getAccessToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    } else {
      delete config.headers["Authorization"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ------------------------
// Response interceptor (401 → refresh + retry)
// ------------------------

let isRefreshing = false;
let refreshPromise = null;

/**
 * Call /auth/refresh/ using cookies (ps_refresh).
 * Store new access token via setAuth (keeps refresh from storage if present).
 */
async function performRefresh() {
  if (!refreshPromise) {
    isRefreshing = true;
    const client = axios.create({
      baseURL,
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });

    refreshPromise = client
      .post("/auth/refresh/")
      .then((res) => {
        const data = res?.data || {};
        const newAccess = data.access || data.access_token || null;
        const existingRefresh = getRefreshToken();
        if (newAccess) {
          setAuth({
            access: newAccess,
            refresh: existingRefresh || data.refresh || null,
            user: data.user || null,
          });
        }
        return newAccess;
      })
      .catch((err) => {
        clearAuth();
        throw err;
      })
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig = error?.config;

    if (!originalConfig) {
      return Promise.reject(error);
    }

    const status = error?.response?.status;
    const url = originalConfig.url || "";

    // If not unauthorized, just bubble up
    if (status !== 401) {
      return Promise.reject(error);
    }

    // Avoid infinite loop
    if (originalConfig._retry) {
      clearAuth();
      return Promise.reject(error);
    }

    const auth = isAuthUrl(url);
    const lookup = isLookupUrl(url);

    // Do not auto-refresh for auth or lookup endpoints
    if (auth || lookup) {
      clearAuth();
      return Promise.reject(error);
    }

    try {
      originalConfig._retry = true;
      const newAccess = await performRefresh();

      if (newAccess) {
        originalConfig.headers = originalConfig.headers || {};
        originalConfig.headers["Authorization"] = `Bearer ${newAccess}`;
      }

      return api(originalConfig);
    } catch (e) {
      return Promise.reject(e);
    }
  }
);

// ------------------------
// Generic CRUD factory for DRF viewsets
// ------------------------

export function makeCrud(basePath) {
  const path = basePath.endsWith("/") ? basePath : `${basePath}/`;

  // NOTE: return several common aliases so callers across the app
  // can use either `list`/`retrieve` or `detail`/`get` etc.
  return {
    // List collection: GET /resource/?params
    list: (params) => api.get(path, { params }),

    // Retrieve single: GET /resource/:id/
    retrieve: (id, params) =>
      api.get(`${path}${encodeURIComponent(id)}/`, { params }),

    // alias common name 'detail' used in some components
    detail: (id, params) =>
      api.get(`${path}${encodeURIComponent(id)}/`, { params }),

    // alias 'get' for convenience
    get: (id, params) =>
      api.get(`${path}${encodeURIComponent(id)}/`, { params }),

    // Create: POST /resource/
    create: (data) => api.post(path, data),

    // Update (full): PUT /resource/:id/
    update: (id, data) => api.put(`${path}${encodeURIComponent(id)}/`, data),

    // Partial update: PATCH /resource/:id/
    partialUpdate: (id, data) =>
      api.patch(`${path}${encodeURIComponent(id)}/`, data),

    // Destroy: DELETE /resource/:id/
    destroy: (id) => api.delete(`${path}${encodeURIComponent(id)}/`),
  };
}

// ------------------------
// AUTH APIS
// ------------------------

export const AUTH_API = {
  login: (data) => api.post("/auth/login/", data),
  refresh: () => api.post("/auth/refresh/"), // cookie-based
  logout: () => api.post("/auth/logout/"),
  crpRequestOtp: (data) => api.post("/auth/crp-request-otp/", data),
  crpVerifyOtp: (data) => api.post("/auth/crp-verify-otp/", data),
};

// ------------------------
// LOOKUP / CORE APIS
// ------------------------
//
// These map to core.api.views_lookups + UPSRLM proxy views + geo-scope.
//

export const LOOKUP_API = {
  // Master geo units (via DRF router)
  states: makeCrud("/lookups/states/"),
  districts: makeCrud("/lookups/districts/"),
  blocks: makeCrud("/lookups/blocks/"),
  block_detail: makeCrud("/lookups/blocks/detail/"),
  panchayats: makeCrud("/lookups/panchayats/"),
  panchayat_detail: makeCrud("/lookups/panchayats/detail/"),
  villages: makeCrud("/lookups/villages/"),
  village_detail: makeCrud("/lookups/villages/detail/"),
  users: makeCrud("/lookups/users/"),

  // SHG / VO / CLF master lists (DB backed)
  clfList: makeCrud("/lookups/clf-list/"),
  voList: makeCrud("/lookups/vo-list/"),
  shgList: makeCrud("/lookups/shg-list/"),

  // Beneficiary list under SHG (view)
  // GET /lookups/beneficiary-list/?shg_code=... OR /lookups/beneficiary-list/<shg_code>/
  beneficiaryList: (params) =>
    api.get("/lookups/beneficiary-list/", { params }),
  beneficiaryListByShg: (shgCode, params) =>
    api.get(`/lookups/beneficiary-list/${encodeURIComponent(shgCode)}/`, {
      params,
    }),

  // Beneficiary detail and related master tables
  beneficiaryDetail: (memberCode, params) =>
    api.get(`/lookups/beneficiary-detail/${encodeURIComponent(memberCode)}/`, {
      params,
    }),

  // CLF / VO / SHG detail + members/etc (master_* tables)
  clfDetail: (clfCode, params) =>
    api.get(`/lookups/clf-detail/${encodeURIComponent(clfCode)}/`, { params }),
  clfMembers: (clfCode, params) =>
    api.get(`/lookups/clf-members/${encodeURIComponent(clfCode)}/`, {
      params,
    }),
  clfPanchayats: (clfCode, params) =>
    api.get(`/lookups/clf-panchayats/${encodeURIComponent(clfCode)}/`, {
      params,
    }),
  clfVillages: (clfCode, params) =>
    api.get(`/lookups/clf-villages/${encodeURIComponent(clfCode)}/`, {
      params,
    }),
  clfVos: (clfCode, params) =>
    api.get(`/lookups/clf-vos/${encodeURIComponent(clfCode)}/`, { params }),

  voDetail: (voCode, params) =>
    api.get(`/lookups/vo-detail/${encodeURIComponent(voCode)}/`, { params }),
  voMembers: (voCode, params) =>
    api.get(`/lookups/vo-members/${encodeURIComponent(voCode)}/`, { params }),
  voPanchayats: (voCode, params) =>
    api.get(`/lookups/vo-panchayats/${encodeURIComponent(voCode)}/`, {
      params,
    }),
  voVillages: (voCode, params) =>
    api.get(`/lookups/vo-villages/${encodeURIComponent(voCode)}/`, {
      params,
    }),
  voShgs: (voCode, params) =>
    api.get(`/lookups/vo-shgs/${encodeURIComponent(voCode)}/`, { params }),

  shgDetail: (shgCode, params) =>
    api.get(`/lookups/shg-detail/${encodeURIComponent(shgCode)}/`, {
      params,
    }),
  shgMembers: (shgCode, params) =>
    api.get(`/lookups/shg-members/${encodeURIComponent(shgCode)}/`, { params }),

  // ------------------------
  // UPSRLM + APISetu proxies
  // (core.api.upsrlm_views)
  // ------------------------

  // CLF via UPSRLM
  upsrlmClfList: (blockId, params) =>
    api.get(`/lookups/upsrlm-clf-list/${encodeURIComponent(blockId)}/`, {
      params,
    }),
  upsrlmClfDetail: (clfCode, params) =>
    api.get(`/lookups/upsrlm-clf-detail/${encodeURIComponent(clfCode)}/`, {
      params,
    }),
  upsrlmClfPanchayats: (clfCode, params) =>
    api.get(`/lookups/upsrlm-clf-panchayats/${encodeURIComponent(clfCode)}/`, {
      params,
    }),
  upsrlmClfMembers: (clfCode, params) =>
    api.get(`/lookups/upsrlm-clf-members/${encodeURIComponent(clfCode)}/`, {
      params,
    }),
  upsrlmClfVillages: (clfCode, params) =>
    api.get(`/lookups/upsrlm-clf-villages/${encodeURIComponent(clfCode)}/`, {
      params,
    }),

  // VO via UPSRLM
  upsrlmVoList: (blockId, params) =>
    api.get(`/lookups/upsrlm-vo-list/${encodeURIComponent(blockId)}/`, {
      params,
    }),
  upsrlmVoDetail: (voCode, params) =>
    api.get(`/lookups/upsrlm-vo-detail/${encodeURIComponent(voCode)}/`, {
      params,
    }),
  upsrlmVoPanchayats: (voCode, params) =>
    api.get(`/lookups/upsrlm-vo-panchayats/${encodeURIComponent(voCode)}/`, {
      params,
    }),
  upsrlmVoMembers: (voCode, params) =>
    api.get(`/lookups/upsrlm-vo-members/${encodeURIComponent(voCode)}/`, {
      params,
    }),
  upsrlmVoVillages: (voCode, params) =>
    api.get(`/lookups/upsrlm-vo-villages/${encodeURIComponent(voCode)}/`, {
      params,
    }),
  upsrlmVoShgs: (voCode, params) =>
    api.get(`/lookups/upsrlm-vo-shgs/${encodeURIComponent(voCode)}/`, {
      params,
    }),

  // SHG via UPSRLM (list/details/members)
  upsrlmShgList: (blockId, params) =>
    api.get(`/upsrlm-shg-list/${encodeURIComponent(blockId)}/`, {
      params,
    }),
  upsrlmShgDetail: (shgCode, params) =>
    api.get(`/upsrlm-shg-detail/${encodeURIComponent(shgCode)}/`, { params }),
  upsrlmShgMembers: (shgCode, params) =>
    api.get(`/upsrlm-shg-members/${encodeURIComponent(shgCode)}/`, { params }),

  // ------------------------
  // Geo-scope mapping by user
  // ------------------------

  // GET /lookups/user-geoscope/<user_id>/
  userGeoscopeByUserId: (userId, params) =>
    api.get(`/lookups/user-geoscope/${encodeURIComponent(userId)}/`, {
      params,
    }),
};

// ------------------------
// epSakhi APIS
// ------------------------
//
// These map to epSakhi.api.urls viewsets and custom views.
//

export const EPSAKHI_API = {
  // CRP master + mapping
  crp: makeCrud("/epsakhi/crps/"),
  crpPanchayatMap: makeCrud("/epsakhi/crp-panchayat-mapping/"),

  // BeneficiaryRecorded + related enterprise forms
  beneficiaryRecorded: makeCrud("/epsakhi/beneficiary-recorded/"),
  existingEnterprise: makeCrud("/epsakhi/existing-enterprises/"),
  newEnterprise: makeCrud("/epsakhi/new-enterprises/"),
  enterpriseLoanDetails: makeCrud("/epsakhi/enterprise-loan-details/"),
  enterpriseSupportDetails: makeCrud("/epsakhi/enterprise-support-details/"),
  enterpriseTrainingReqs: makeCrud("/epsakhi/enterprise-training-reqs/"),
  enterpriseMedia: makeCrud("/epsakhi/enterprise-media/"),
  enterpriseProducts: makeCrud("/epsakhi/enterprise-products/"),
  enterpriseTypes: makeCrud("/epsakhi/enterprise-types/"),
  noEnterpriseForms: makeCrud("/epsakhi/no-enterprise-forms/"),
  noEnterpriseWages: makeCrud("/epsakhi/no-enterprise-wages/"),

  // ------------------------
  // Custom epSakhi views
  // ------------------------

  // Beneficiaries under SHG (LokOS) → BeneficiaryRecorded join
  // GET /epsakhi/beneficiary-recorded/by-shg/<shg_code>/
  beneficiaryRecordedByShg: (shgCode, params) =>
    api.get(
      `/epsakhi/beneficiary-recorded/by-shg/${encodeURIComponent(shgCode)}/`,
      { params }
    ),

  // Detail by member code
  // GET /epsakhi/beneficiary-recorded/by-member/<member_code>/
  beneficiaryRecordedByMember: (memberCode, params) =>
    api.get(
      `/epsakhi/beneficiary-recorded/by-member/${encodeURIComponent(
        memberCode
      )}/`,
      { params }
    ),

  // CRP → Panchayats linkage
  // POST /epsakhi/crp/<id>/link-panchayats/
  crpLinkPanchayats: (crpId, data) =>
    api.post(
      `/epsakhi/crp/${encodeURIComponent(crpId)}/link-panchayats/`,
      data
    ),

  // GET /epsakhi/crp/<id>/panchayats/
  crpPanchayats: (crpId, params) =>
    api.get(`/epsakhi/crp/${encodeURIComponent(crpId)}/panchayats/`, {
      params,
    }),

  // CRP detail by LokOS member code
  crpDetailByMember: (memberCode, params) =>
    api.get(`/epsakhi/crp/by-member/${encodeURIComponent(memberCode)}/`, {
      params,
    }),

  // CRP detail by MasterUser (login) id
  crpDetailByUserId: (userId, params) =>
    api.get(`/epsakhi/crp/by-user-id/${encodeURIComponent(userId)}/`, {
      params,
    }),

  // Panchayats under CRP (by CRP id or user id)
  // GET /epsakhi/panchayats-under-crp/<crp_id>/
  panchayatsUnderCrp: (crpId, params) =>
    api.get(`/epsakhi/panchayats-under-crp/${encodeURIComponent(crpId)}/`, {
      params,
    }),

  // GET /epsakhi/panchayats-under-crp/id/<user_id>/
  panchayatsUnderCrpByUserId: (userId, params) =>
    api.get(`/epsakhi/panchayats-under-crp/id/${encodeURIComponent(userId)}/`, {
      params,
    }),

  // UPSRLM SHG wrappers used by app (epSakhi views wrapping core UPSRLM)
  // GET /epsakhi/upsrlm-shg-list/<block_id>/
  upsrlmShgList: (blockId, params) =>
    api.get(`/upsrlm-shg-list/${encodeURIComponent(blockId)}/`, {
      params,
    }),
  // GET /epsakhi/upsrlm-shg-detail/<shg_code>/
  upsrlmShgDetail: (shgCode, params) =>
    api.get(`/upsrlm-shg-detail/${encodeURIComponent(shgCode)}/`, {
      params,
    }),
  // GET /epsakhi/upsrlm-shg-members/<shg_code>/
  upsrlmShgMembers: (shgCode, params) =>
    api.get(`/upsrlm-shg-members/${encodeURIComponent(shgCode)}/`, {
      params,
    }),

  // Export endpoints for reporting, etc (if present)
  // You can hang any future custom epSakhi URLs here.
};

// ------------------------
// TMS APIS (Training Management System)
// ------------------------
//
// These map to TMS.api.urls router viewsets + dashboard views.
//

export const TMS_API = {
  // 1. Master / configuration viewsets
  trainingThemes: makeCrud("/tms/training-themes/"),
  trainingSubThemes: makeCrud("/tms/training-subthemes/"),
  trainingCategories: makeCrud("/tms/training-categories/"),
  trainingTypologies: makeCrud("/tms/training-typologies/"),
  trainingTypes: makeCrud("/tms/training-types/"),
  trainingTopics: makeCrud("/tms/training-topics/"),
  tpcpCentreDetails: makeCrud("/tms/tpcp_to_centre/details/"),
  trainingPlans: makeCrud("/tms/training-plans/"),

  // Master trainer + certificates
  masterTrainers: makeCrud("/tms/master-trainers/"),
  masterTrainerCertificates: makeCrud("/tms/master-trainer-certificates/"),

  // Training partner master + related
  trainingPartners: makeCrud("/tms/training-partners/"),
  trainingPartnerBanks: makeCrud("/tms/training-partner-banks/"),
  trainingPartnerContactPersons: makeCrud(
    "/tms/training-partner-contact-persons/"
  ),
  trainingPartnerCentres: makeCrud("/tms/training-partner-centres/"),
  trainingPartnerCentreRooms: makeCrud("/tms/training-partner-centre-rooms/"),
  tpcpCentreLinks: makeCrud("/tms/tpcp-centre-links/"),
  trainingPartnerSubmissions: makeCrud("/tms/training-partner-submissions/"),
  trainingPartnerTargets: makeCrud("/tms/training-partner-targets/"),

  // TRP user scope mapping
  trpUserScopes: makeCrud("/tms/trp-user-scopes/"),

  // Training Request workflow
  trainingRequests: makeCrud("/tms/training-requests/"),
  trBeneficiaries: makeCrud("/tms/training-request-beneficiaries/"),
  trTrainers: makeCrud("/tms/training-request-trainers/"),

  // For BMMU TMS Dashboard
  trainingRequestBeneficiaries: makeCrud(
    "/tms/training-request-beneficiaries/"
  ),
  trainingRequestTrainers: makeCrud("/tms/training-request-trainers/"),

  // Batch workflow
  batches: makeCrud("/tms/batches/"),
  batchschedule: makeCrud("/tms/batch-schedules/"),
  batchMasterTrainers: makeCrud("/tms/batch-master-trainers/"),
  batchBeneficiaries: makeCrud("/tms/batch-beneficiaries/"),
  batchTrainers: makeCrud("/tms/batch-trainers/"),
  batchEkyc: makeCrud("/tms/batch-ekyc/"),
  batchAttendance: makeCrud("/tms/batch-attendance/"),
  participantAttendance: makeCrud("/tms/participant-attendance/"),
  tpBatchCostBreakups: makeCrud("/tms/tp-batch-cost-breakups/"),
  batchCosts: makeCrud("/tms/batch-costs/"),
  batchMedia: makeCrud("/tms/batch-media/"),
  batchClosureRequests: makeCrud("/tms/batch-closure-requests/"),
  trClosures: makeCrud("/tms/tr-closures/"),
  batchParticipantCertificates: makeCrud(
    "/tms/batch-participant-certificates/"
  ),

  // ------------------------
  // Dashboards / reports
  // ------------------------

  bmmu: {
    dashboard: (params) => api.get("/tms/bmmu/dashboard/", { params }),
    trainingsList: (params) => api.get("/tms/bmmu/trainings-list/", { params }),
    requests: (params) => api.get("/tms/bmmu/requests/", { params }),
    requestDetail: (requestId, params) =>
      api.get(`/tms/bmmu/requests/${encodeURIComponent(requestId)}/`, {
        params,
      }),
    batchesForRequest: (requestId, params) =>
      api.get(`/tms/bmmu/requests/${encodeURIComponent(requestId)}/batches/`, {
        params,
      }),
    batchDetail: (batchId, params) =>
      api.get(`/tms/bmmu/batches/${encodeURIComponent(batchId)}/`, { params }),
    batchAttendanceByDate: (batchId, params) =>
      api.get(
        `/tms/bmmu/batches/${encodeURIComponent(batchId)}/attendance-by-date/`,
        { params }
      ),
  },

  smmu: {
    dashboard: (params) => api.get("/tms/smmu/dashboard/", { params }),
    requests: (params) => api.get("/tms/smmu/requests/", { params }),
    requestDetail: (requestId, params) =>
      api.get(`/tms/smmu/requests/${encodeURIComponent(requestId)}/`, {
        params,
      }),
    partnerTargets: (params) =>
      api.get("/tms/smmu/partner-targets/", { params }),
  },

  dmmu: {
    dashboard: (params) => api.get("/tms/dmmu/dashboard/", { params }),
    requests: (params) => api.get("/tms/dmmu/requests/", { params }),
    requestDetail: (requestId, params) =>
      api.get(`/tms/dmmu/requests/${encodeURIComponent(requestId)}/`, {
        params,
      }),
    batchDetail: (batchId, params) =>
      api.get(`/tms/dmmu/batches/${encodeURIComponent(batchId)}/detail/`, {
        params,
      }),
    batchAttendanceByDate: (batchId, params) =>
      api.get(
        `/tms/dmmu/batches/${encodeURIComponent(batchId)}/attendance-by-date/`,
        { params }
      ),
  },
};

// ------------------------
// NEW API add-on Section
// ------------------------

// ------------------------
// Default export
// ------------------------

export default api;
