import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../../contexts/AuthContext";
import { LOOKUP_API, LDMS_API } from "../../../api/axios";
import api from "../../../api/axios";

/**
 * Report Filters Header
 */
export default function ReportHeader({ onFetch }) {
  const { user } = useContext(AuthContext) || {};
  const role = user?.role_id;

  const isBMMU = role === 1;
  const isDMMU = role === 2;
  const isSMMU = role === 3;

  /* ---------------- UI state ---------------- */
  const [activeTab, setActiveTab] = useState("Geography");
  const [applied, setApplied] = useState({});
  const [loading, setLoading] = useState({});
  const [fetching, setFetching] = useState(false);

  /* ---------------- geo ids ---------------- */
  const [districtId, setDistrictId] = useState(null);
  const [blockId, setBlockId] = useState(null);

  /* ---------------- data ---------------- */
  const [mandals, setMandals] = useState([]);
  const [districtCategories, setDistrictCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [panchayats, setPanchayats] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [bucketTypes, setBucketTypes] = useState([]);

  /* ---------------- helpers ---------------- */
  const busy = (k, v) => setLoading((p) => ({ ...p, [k]: v }));

  const apply = (key, value, label) => {
    if (!value) return;
    setApplied((p) => ({ ...p, [key]: { value, label } }));
  };

  const remove = (key) => {
    setApplied((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
  };

  const fetchReport = async () => {
    setFetching(true);
    const params = Object.fromEntries(
      Object.entries(applied).map(([k, v]) => [k, v.value]),
    );
    onFetch?.(params);
    setTimeout(() => setFetching(false), 400);
  };

  /* ---------------- user geoscope ---------------- */
  useEffect(() => {
    if (!user?.id) return;

    api
      .get(`/lookups/user-geoscope/${encodeURIComponent(user.id)}/`)
      .then((res) => {
        if (isBMMU) {
          const blk = res?.data?.blocks?.[0];
          if (blk) {
            setBlockId(blk);
            busy("panchayats", true);
            LOOKUP_API.panchayats
              .retrieve(blk, { page_size: 5000 })
              .then((r) => setPanchayats(r.data?.results || []))
              .finally(() => busy("panchayats", false));
          }
        }

        if (isDMMU) {
          const dist = res?.data?.districts?.[0];
          if (dist) {
            setDistrictId(dist);
            busy("blocks", true);
            LOOKUP_API.blocks
              .retrieve(dist)
              .then((r) => setBlocks(r.data?.results || []))
              .finally(() => busy("blocks", false));
          }
        }
      });
  }, [user, isBMMU, isDMMU]);

  /* ---------------- initial loads ---------------- */
  useEffect(() => {
    if (isSMMU) {
      busy("mandals", true);
      LOOKUP_API.mandals
        .list({ page_size: 200 })
        .then((r) => setMandals(r.data?.results || []))
        .finally(() => busy("mandals", false));

      busy("districtCategories", true);
      LOOKUP_API.district_categories
        .list()
        .then((r) => setDistrictCategories(r.data?.results || []))
        .finally(() => busy("districtCategories", false));

      busy("districts", true);
      LOOKUP_API.districts
        .list({ page_size: 100 })
        .then((r) => setDistricts(r.data?.results || []))
        .finally(() => busy("districts", false));
    }

    LDMS_API.departments().then((r) => setDepartments(r.data?.results || []));

    LDMS_API.SBTypes.list().then((r) => setBucketTypes(r.data?.results || []));
  }, [isSMMU]);

  /* ---------------- UI ---------------- */
  return (
    <div className="report-header">
      {/* Tabs */}
      <div className="tabs">
        {[
          "Geography",
          "Department",
          "Scheme",
          "Support Bucket",
          "Beneficiary",
        ].map((t) => (
          <button
            key={t}
            className={activeTab === t ? "active" : ""}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Geography */}
      {activeTab === "Geography" && (
        <div className="filters">
          {isSMMU && (
            <>
              <select
                onChange={(e) =>
                  apply(
                    "mandal_id",
                    e.target.value,
                    e.target.options[e.target.selectedIndex].text,
                  )
                }
              >
                <option>Mandals</option>
                {mandals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <select
                onChange={(e) =>
                  apply(
                    "dc_id",
                    e.target.value,
                    e.target.options[e.target.selectedIndex].text,
                  )
                }
              >
                <option>District Category</option>
                {districtCategories.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                onChange={(e) => {
                  const id = e.target.value;
                  apply(
                    "district_id",
                    id,
                    e.target.options[e.target.selectedIndex].text,
                  );
                  busy("blocks", true);
                  LOOKUP_API.blocks
                    .retrieve(id)
                    .then((r) => setBlocks(r.data?.results || []))
                    .finally(() => busy("blocks", false));
                }}
              >
                <option>District</option>
                {districts.map((d) => (
                  <option key={d.district_id} value={d.district_id}>
                    {d.district_name_en}
                  </option>
                ))}
              </select>
            </>
          )}

          {(isSMMU || isDMMU) && (
            <select
              disabled={loading.blocks}
              onChange={(e) => {
                const id = e.target.value;
                apply(
                  "block_id",
                  id,
                  e.target.options[e.target.selectedIndex].text,
                );
                busy("panchayats", true);
                LOOKUP_API.panchayats
                  .retrieve(id, { page_size: 5000 })
                  .then((r) => setPanchayats(r.data?.results || []))
                  .finally(() => busy("panchayats", false));
              }}
            >
              <option>Block</option>
              {blocks.map((b) => (
                <option key={b.block_id} value={b.block_id}>
                  {b.block_name_en}
                </option>
              ))}
            </select>
          )}

          <select
            disabled={loading.panchayats}
            onChange={(e) =>
              apply(
                "panchayat_id",
                e.target.value,
                e.target.options[e.target.selectedIndex].text,
              )
            }
          >
            <option>Panchayat</option>
            {panchayats.map((p) => (
              <option key={p.panchayat_id} value={p.panchayat_id}>
                {p.panchayat_name_en}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Department */}
      {activeTab === "Department" && (
        <div className="filters">
          <select
            onChange={(e) => {
              const id = e.target.value;
              apply(
                "department_id",
                id,
                e.target.options[e.target.selectedIndex].text,
              );
              LDMS_API.schemes({ department: id }).then((r) =>
                setSchemes(r.data?.results || []),
              );
            }}
          >
            <option>Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Scheme */}
      {activeTab === "Scheme" && (
        <div className="filters">
          <select
            onChange={(e) =>
              apply(
                "scheme_id",
                e.target.value,
                e.target.options[e.target.selectedIndex].text,
              )
            }
          >
            <option>Scheme</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            onChange={(e) => apply("scope", e.target.value, e.target.value)}
          >
            <option>Scope</option>
            <option value="CENTRAL">CENTRAL</option>
            <option value="STATE">STATE</option>
          </select>

          <select
            onChange={(e) => apply("funding", e.target.value, e.target.value)}
          >
            <option>Funding</option>
            <option>100% GOI</option>
            <option>50% GOI, 50% UPGOV</option>
            <option>60% GOI, 40% UPGOV</option>
            <option>90% GOI, 10% UPGOV</option>
            <option>GOI, UPGOV</option>
            <option>100% UPGOV</option>
          </select>

          <select
            onChange={(e) =>
              apply("contact_point", e.target.value, e.target.value)
            }
          >
            <option>Contact Point</option>
            <option>District Agriculture Officer (DAO)</option>
            <option>Deputy Director Agriculture (DDA)</option>
            <option>District Horticulture Officer (DHO)</option>
            <option>District PM-FME Cell</option>
            <option>District Industries Centre (DIC)</option>
            <option>Assistant Director (Fisheries)</option>
            <option>Chief Veterinary Officer (CVO), District Lead Bank Manager (LDM) </option>
            <option>Chief Veterinary Officer (CVO)</option>
            <option>District Animal Husbandry Officer </option>
            <option>Chief Development Officer (CDO)</option>
            <option>Chief Development Officer (CDO), Deputy Dairy Development Officer</option>
            <option>District Programme Coordinator (DPC – MGNREGA), District Magistrate (DM), Chief Development Officer (CDO)</option>
            <option>District Programme Coordinator (Rural Housing/PMAY-G), Project Director, DRDA / PD, Rural Development Agency, Block Development Officer (BDO)</option>
            <option>Mission Director, UPSRLM, Chief Development Officer (CDO), District Mission Unit (DMU), Block Mission Management Units (BMMUs)</option>
            <option>Nodal Department, District Nodal Officer</option>
            <option>Chief Development Officer (CDO), Block Development Officer (BDO)</option>
            <option>Mandi Samiti office/Secretary, Divisional Deputy Director</option>
            <option>Principal of agriculture college, Divisional Deputy Director</option>
            <option>Mandi Samiti office/Secretary</option>
            <option>District Horticulture Officer, District Development Manager (DDM)</option>
            <option>District Development Manager (DDM)</option>
            <option>District Development Manager (DDM), UPSRLM DMMU</option>
            <option>General Manager / CEO, District Milk Union (cooperative)</option>
            <option>District Cooperative Officer / ARCS</option>
            <option>Chief Development Officer (CDO), District Agriculture Officer (DAO)</option>
            <option>District Water & Sanitation Mission (DWSM) office</option>
            <option>District Youth Welfare & PRD Office</option>
            <option>District/Regional Youth welfare Officer</option>
            <option>Mandi Secretary / Senior Agriculture Marketing Inspector</option>
            <option>District level AGMARK Lab (where available) and Marketing Officer</option>
            <option>Export Promotion Bureau (EPB) nodal officer</option>
            <option>Office of Chairman, District Ganga Committee</option>
            <option>District Panchayat Raj Officer (DPRO), District Nodal Officer RGSA</option>
            <option>Executive Engineer / District Minor Irrigation Officer (DMI/EE, Minor Irrigation)</option>
            <option>District Sericulture Office (DSO), Block Development Office (BDO)</option>
          </select>
        </div>
      )}

      {/* Support Bucket */}
      {activeTab === "Support Bucket" && (
        <div className="filters">
          <select
            onChange={(e) =>
              apply(
                "bucket_type",
                e.target.value,
                e.target.options[e.target.selectedIndex].text,
              )
            }
          >
            <option>Bucket Type</option>
            {bucketTypes.map((b) => (
              <option key={b.id} value={b.bucket_type}>
                {b.bucket_type}
              </option>
            ))}
          </select>

          <input
            type="date"
            onChange={(e) =>
              apply("approval_date", e.target.value, e.target.value)
            }
          />
        </div>
      )}

      {/* Beneficiary */}
      {activeTab === "Beneficiary" && (
        <div className="filters">
          <select onChange={(e) => apply("pld_status", e.target.value, "PLD")}>
            <option>PLD</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>

          <select
            onChange={(e) =>
              apply("designation", e.target.value, e.target.value)
            }
          >
            <option>Designation</option>
            <option>President</option>
            <option>Treasurer</option>
            <option>Secretary</option>
          </select>

          <select
            onChange={(e) => apply("religion", e.target.value, e.target.value)}
          >
            <option>Religion</option>
            <option>HINDU</option>
            <option>MUSLIM</option>
            <option>OTHER</option>
          </select>

          <select
            onChange={(e) =>
              apply("marital_status", e.target.value, e.target.value)
            }
          >
            <option>Marital Status</option>
            <option>MARRIED</option>
            <option>WIDOW/WIDOWER</option>
            <option>DIVORCED</option>
          </select>

          <select
            onChange={(e) =>
              apply("social_category", e.target.value, e.target.value)
            }
          >
            <option>Social Category</option>
            <option>SC</option>
            <option>ST</option>
            <option>OBC</option>
            <option>GENERAL</option>
            <option>OTHER</option>
          </select>
        </div>
      )}

      {/* Applied */}
      <div className="applied">
        {Object.entries(applied).map(([k, v]) => (
          <span key={k} className="pill">
            {v.label}
            <b onClick={() => remove(k)}>✕</b>
          </span>
        ))}
      </div>

      {/* Fetch */}
      <div className="fetch-row">
        <button onClick={fetchReport} disabled={fetching}>
          {fetching ? <span className="loader" /> : "Fetch Report"}
        </button>
      </div>

      <style>{`
        /* ================= REPORT HEADER ================= */
        .report-header {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* ================= TABS ================= */
        .tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .tabs button {
          padding: 6px 14px;
          border-radius: 18px;
          border: 1px solid #c62828;
          background: #fff;
          color: #7f1d1d;
          cursor: pointer;
          transition: 0.2s;
        }

        .tabs button.active {
          background: #c62828;
          color: #fff;
        }

        /* ================= FILTERS ================= */
        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          animation: fade 0.2s ease;
        }

        select,
        input,
        input[type="date"] {
          min-width: 180px;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        /* ================= APPLIED FILTER PILLS ================= */
        .applied {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pill {
          background: #fee2e2;
          color: #7f1d1d;
          padding: 4px 10px;
          border-radius: 14px;
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .pill b {
          cursor: pointer;
          color: #c62828;
        }

        /* ================= FETCH ROW ================= */
        .fetch-row {
          display: flex;
          justify-content: center;
        }

        .fetch-row button {
          background: #c62828;
          color: #fff;
          padding: 8px 18px;
          border-radius: 8px;
          cursor: pointer;
        }

        /* ================= LOADER ================= */
        .loader {
          width: 14px;
          height: 14px;
          border: 2px solid #fff;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* ================= ANIMATIONS ================= */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes fade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
