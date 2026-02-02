import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../../contexts/AuthContext";
import { LOOKUP_API, LDMS_API } from "../../../api/axios";
import api from "../../../api/axios";

/**
 * Report Filters Header (FULL)
 */
export default function ReportHeader({ onFiltersChange }) {
  const { user } = useContext(AuthContext) || {};
  const role = user?.role_id;

  const isBMMU = role === 1;
  const isDMMU = role === 2;
  const isSMMU = role === 3;

  /* -------------------- UI state -------------------- */
  const [activeTab, setActiveTab] = useState("Geography");
  const [applied, setApplied] = useState({});
  const [loading, setLoading] = useState({});

  /* -------------------- data -------------------- */
  const [mandals, setMandals] = useState([]);
  const [districtCategories, setDistrictCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [panchayats, setPanchayats] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [schemes, setSchemes] = useState([]);

  const [bucketTypes, setBucketTypes] = useState([]);

  /* -------------------- helpers -------------------- */
  const busy = (k, v) =>
    setLoading((p) => ({ ...p, [k]: v }));

  const apply = (key, value, label) => {
    const next = { ...applied, [key]: { value, label } };
    setApplied(next);
    onFiltersChange?.(
      Object.fromEntries(
        Object.entries(next).map(([k, v]) => [k, v.value]),
      ),
    );
  };

  const remove = (key) => {
    const next = { ...applied };
    delete next[key];
    setApplied(next);
    onFiltersChange?.(
      Object.fromEntries(
        Object.entries(next).map(([k, v]) => [k, v.value]),
      ),
    );
  };

  /* -------------------- initial loads -------------------- */
  useEffect(() => {
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

    LDMS_API.departments().then((r) =>
      setDepartments(r.data?.results || []),
    );

    LDMS_API.SBTypes.list().then((r) =>
      setBucketTypes(r.data?.results || []),
    );
  }, []);

  /* -------------------- cascades -------------------- */
  const loadBlocks = (districtId) => {
    busy("blocks", true);
    LOOKUP_API.blocks
      .retrieve(districtId)
      .then((r) => setBlocks(r.data?.results || []))
      .finally(() => busy("blocks", false));
  };

  const loadPanchayats = (blockId) => {
    busy("panchayats", true);
    LOOKUP_API.panchayats
      .retrieve(blockId, { page_size: 5000 })
      .then((r) => setPanchayats(r.data?.results || []))
      .finally(() => busy("panchayats", false));
  };

  const loadSchemes = (deptId) => {
    busy("schemes", true);
    LDMS_API.schemes({ department: deptId })
      .then((r) => setSchemes(r.data?.results || []))
      .finally(() => busy("schemes", false));
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="report-header">
      {/* TABS */}
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

      {/* ---------------- Geography ---------------- */}
      {activeTab === "Geography" && (
        <div className="filters">
          {!isBMMU && (
            <select
              disabled={loading.mandals}
              onChange={(e) =>
                apply("mandal_id", e.target.value, e.target.options[e.target.selectedIndex].text)
              }
            >
              <option>Mandals</option>
              {mandals.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}

          {!isBMMU && (
            <select
              disabled={loading.districtCategories}
              onChange={(e) =>
                apply("dc_id", e.target.value, e.target.options[e.target.selectedIndex].text)
              }
            >
              <option>District Category</option>
              {districtCategories.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {!isBMMU && (
            <select
              disabled={loading.districts}
              onChange={(e) => {
                apply(
                  "district_id",
                  e.target.value,
                  e.target.options[e.target.selectedIndex].text,
                );
                loadBlocks(e.target.value);
              }}
            >
              <option>District</option>
              {districts.map((d) => (
                <option
                  key={d.district_id}
                  value={d.district_id}
                >
                  {d.district_name_en}
                </option>
              ))}
            </select>
          )}

          {!isBMMU && (
            <select
              disabled={loading.blocks}
              onChange={(e) => {
                apply("block_id", e.target.value, e.target.options[e.target.selectedIndex].text);
                loadPanchayats(e.target.value);
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
            disabled={loading.panchayats && !isBMMU}
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
              <option
                key={p.panchayat_id}
                value={p.panchayat_id}
              >
                {p.panchayat_name_en}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ---------------- Department ---------------- */}
      {activeTab === "Department" && (
        <div className="filters">
          <select
            onChange={(e) => {
              const id = e.target.value;
              const name = e.target.options[e.target.selectedIndex].text;         
                   
              apply(
                "department_id",
                id,
                name,
              );
              loadSchemes(e.target.value);
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

      {/* ---------------- Scheme ---------------- */}
      {activeTab === "Scheme" && (
        <div className="filters">
          <select
            disabled={loading.schemes}
            onChange={(e) =>
              apply("scheme_id", e.target.value, e.target.options[e.target.selectedIndex].text)
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
            onChange={(e) => apply("scope", e.target.value, e.target.options[e.target.selectedIndex].text)}
          >
            <option>Scope</option>
            <option value="CENTRAL">CENTRAL</option>
            <option value="STATE">STATE</option>
          </select>

          <select
            onChange={(e) =>
              apply("funding", e.target.value, e.target.options[e.target.selectedIndex].text)
            }
          >
            <option>Funding</option>
            <option>100% GOI</option>
            <option>50% GOI, 50% UPGOV</option>
            <option>100% UPGOV</option>
          </select>

          <select
            onChange={(e) =>
              apply(
                "contact_point",
                e.target.value,
                e.target.options[e.target.selectedIndex].text,
              )
            }
          >
            <option>Contact Point</option>
            <option>District Agriculture Officer (DAO)</option>
            <option>Deputy Director Agriculture (DDA)</option>
          </select>
        </div>
      )}

      {/* ---------------- Support Bucket ---------------- */}
      {activeTab === "Support Bucket" && (
        <div className="filters">
          <select
            disabled={loading.bucketTypes}
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
          <span>Approval Date : </span>
          <input
            type="date"
            onChange={(e) =>
              apply(
                "approval_date",
                e.target.value,
                e.target.value,
              )
            }
          />
        </div>
      )}

      {/* ---------------- Beneficiary ---------------- */}
      {activeTab === "Beneficiary" && (
        <div className="filters">
          <select
            onChange={(e) =>
              apply("pld_status", e.target.value, "PLD")
            }
          >
            <option>PLD</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>

          <select
            onChange={(e) =>
              apply(
                "designation",
                e.target.value,
                e.target.options[e.target.selectedIndex].text,
              )
            }
          >
            <option>Designation</option>
            <option>President</option>
            <option>Treasurer</option>
            <option>Secretary</option>
          </select>

          <select
            onChange={(e) =>
              apply("religion", e.target.value, e.target.options[e.target.selectedIndex].text)
            }
          >
            <option>Religion</option>
            <option>HINDU</option>
            <option>MUSLIM</option>
            <option>OTHER</option>
          </select>

          <select
            onChange={(e) =>
              apply(
                "marital_status",
                e.target.value,
                e.target.options[e.target.selectedIndex].text,
              )
            }
          >
            <option>Marital Status</option>
            <option>MARRIED</option>
            <option>WIDOW/WIDOWER</option>
            <option>DIVORCED</option>
          </select>

          <select
            onChange={(e) =>
              apply(
                "social_category",
                e.target.value,
                e.target.options[e.target.selectedIndex].text,
              )
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

      {/* ---------------- Applied ---------------- */}
      <div className="applied">
        {Object.entries(applied).map(([k, v]) => (
          <span key={k} className="pill">
            {v.label}
            <b onClick={() => remove(k)}>✕</b>
          </span>
        ))}
      </div>

      {/* ---------------- Styles ---------------- */}
      <style>{`
        .report-header { display: flex; flex-direction: column; gap: 12px; }
        .tabs { display: flex; gap: 8px; }
        .tabs button {
          padding: 6px 14px;
          border-radius: 18px;
          border: 1px solid #e11d48;
          background: white;
          color: #7f1d1d;
          cursor: pointer;
          transition: 0.2s;
        }
        .tabs button.active {
          background: #e11d48;
          color: white;
        }
        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          animation: fade 0.2s ease;
        }
        select, input[type="date"] {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          min-width: 180px;
        }
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
        .pill b { cursor: pointer; color: #b91c1c; }
        @keyframes fade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
