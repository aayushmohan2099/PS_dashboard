import React, { useEffect, useState } from "react";
import { EPSAKHI_API } from "../../api/axios";
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

/**
 * Member list for a selected SHG.
 * - Uses /upsrlm-shg-members/<shg_code>/
 * - Correct pagination based on backend meta: { meta: { page, page_size, total }, data: [...] }
 *
 * Props:
 *  - shg        (object)  -> must contain shg_code
 *  - onSelectMember(member) -> called when user clicks "View Detail"
 *  - selectedMemberCode      -> optional, for highlight
 */

// helper: calculate age from dob ("YYYY-MM-DD")
function calculateAge(dob) {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return age >= 0 ? age : "";
}

export default function ShgMemberListTable({
  shg,
  onSelectMember,
  selectedMemberCode,
}) {
  const shgCode = shg?.code;
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, page_size: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("");
  const [onlyPld, setOnlyPld] = useState(false); // Potential Lakhpati Didis

  async function load(page = 1) {
    if (!shgCode) return;
    setLoading(true);
    setError("");
    try {
      const res = await EPSAKHI_API.upsrlmShgMembers(shgCode, {
        page,
        page_size: meta.page_size || 20,
        search: search || undefined,
        ordering: ordering || undefined,
        // pld_status filter expected by backend
        pld_status: onlyPld ? true : undefined,
      });

      const payload = res?.data || {};
      const data = Array.isArray(payload.data) ? payload.data : [];
      const m = payload.meta || {
        page,
        page_size: meta.page_size || 20,
        total: data.length,
      };

      setRows(data);
      setMeta(m);
    } catch (e) {
      console.error(
        "Failed to load SHG members",
        e?.response?.data || e.message || e
      );
      setError(
        e?.response?.data?.detail ||
          e.message ||
          "Failed to load SHG members from UPSRLM."
      );
    } finally {
      setLoading(false);
    }
  }

  // reload whenever shg / filters change
  useEffect(() => {
    setRows([]);
    setMeta({ page: 1, page_size: 20, total: 0 });
    if (shgCode) {
      load(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shgCode, search, ordering, onlyPld]);

  if (!shgCode) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <p className="muted">Select an SHG to view its members.</p>
      </div>
    );
  }

  const totalPages =
    meta && meta.page_size > 0
      ? Math.max(1, Math.ceil((meta.total || 0) / meta.page_size))
      : 1;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="header-row">
        <div>
          <h3>
            Members in SHG:{" "}
            <span style={{ color: "#111827" }}>
              {shg.shg_name || shg.shg_code}
            </span>
          </h3>
        </div>
      </div>

      <div className="filters-row">
        <input
          type="text"
          className="input"
          placeholder="Search member name / code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={ordering}
          onChange={(e) => setOrdering(e.target.value)}
        >
          <option value="">Order by…</option>
          <option value="member_name">Name (A–Z)</option>
          <option value="-member_name">Name (Z–A)</option>
        </select>
        <label
          className="small-muted"
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <input
            type="checkbox"
            checked={onlyPld}
            onChange={(e) => setOnlyPld(e.target.checked)}
          />
          Potential Lakhpati Didis in SHG
        </label>
        <button className="btn-sm btn-outline" onClick={() => load(1)}>
          Apply
        </button>
      </div>

      {loading ? (
        <div className="table-spinner">
          <span>Loading members…</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger" style={{ marginTop: 8 }}>
          {error}
        </div>
      ) : rows.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>
          No members found for this SHG.
        </p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Member Code</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Marital Status</th>
                  <th>Designation</th>
                  <th>Phone</th>
                  <th>Religion</th>
                  <th>Social Category</th>
                  <th>Aadhaar No</th>
                  <th>Aadhaar Verified</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const code = m.member_code || m.lokos_member_code || m.id;

                  // age
                  const age = calculateAge(m.dob);

                  // designation(s)
                  const designation =
                    Array.isArray(m.member_designations) &&
                    m.member_designations.length > 0
                      ? m.member_designations
                          .map((d) => d.designation)
                          .filter(Boolean)
                          .join(", ")
                      : "-";

                  // phone from member_phones (default or first), fallback to mobile fields
                  let phone = "-";
                  if (
                    Array.isArray(m.member_phones) &&
                    m.member_phones.length > 0
                  ) {
                    const def =
                      m.member_phones.find((p) => p.is_default) ||
                      m.member_phones[0];
                    phone = def.phone_no ?? "-";
                  } else {
                    phone = m.mobile || m.phone_no || "-";
                  }

                  const isSelected =
                    selectedMemberCode &&
                    code &&
                    selectedMemberCode === code;

                  return (
                    <tr
                      key={code || `${m.member_name}-${Math.random()}`}
                      className={isSelected ? "row-selected" : ""}
                    >
                      <td>{m.member_name || "-"}</td>
                      <td>{m.member_code || m.lokos_member_code || "-"}</td>
                      <td>{age !== "" ? age : "-"}</td>
                      <td>{m.gender || "-"}</td>
                      <td>{m.marital_status || "-"}</td>
                      <td>{designation}</td>
                      <td>{phone}</td>
                      <td>{m.religion || "-"}</td>
                      <td>{m.social_category || "-"}</td>
                      <td>{m.aadhar_no || "-"}</td>
                      <td>{m.aadhar_verified ? "Yes" : "No"}</td>
                      <td>
                        <button
                          className="btn-sm btn-outline"
                          onClick={() => onSelectMember && onSelectMember(m)}
                          style={{ transition: "0.5s" }}
                          onMouseEnter={(e) => (e.currentTarget.querySelector("svg").style.color = "blue")}
                          onMouseLeave={(e) => (e.currentTarget.querySelector("svg").style.color = "black")}

                        ><FontAwesomeIcon icon={faEye} />
                        </button>                        
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && meta.total > meta.page_size && (
            <div className="pagination">
              <button
                className="btn-sm btn-flat"
                disabled={meta.page <= 1}
                onClick={() => load(meta.page - 1)}
              >
                Prev
              </button>
              <span>
                Page {meta.page} of {totalPages}
              </span>
              <button
                className="btn-sm btn-flat"
                disabled={meta.page >= totalPages}
                onClick={() => load(meta.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
