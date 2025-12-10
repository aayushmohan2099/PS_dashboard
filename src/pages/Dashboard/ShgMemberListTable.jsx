// src/pages/Dashboard/ShgMemberListTable.jsx
import React, { useEffect, useState, useMemo } from "react";
import { EPSAKHI_API } from "../../api/axios";

// Cache for SHG member lists per (shgCode + filters)
const shgMembersCache = new Map();

function calculateAge(dob) {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Member list for a selected SHG.
 *
 * Props:
 *  - shg                 (object)  -> must contain shg_code or code
 *  - onSelectMember(member) -> called when user clicks "View Detail" (legacy)
 *  - onToggleMember(member, checked) -> called for checkbox selection/unselection (new)
 *  - selectedMemberCodes  (Set|Array) -> optional controlled selection (member_code values)
 *  - selectedMemberCode   -> optional single-code highlight (backwards compatibility)
 *
 * Notes:
 *  - When checkbox is checked we call both `onToggleMember(member, true)` and also `onSelectMember(member)` (to maintain existing behavior that expects a full member object).
 *  - When checkbox is unchecked we call `onToggleMember(member, false)`.
 */
export default function ShgMemberListTable({
  shg,
  onSelectMember,
  onToggleMember,
  selectedMemberCodes,
  selectedMemberCode, // legacy single highlight prop
}) {
  const shgCode = shg?.code || shg?.shg_code;
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, page_size: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("");
  const [onlyPld, setOnlyPld] = useState(false); // working PLD filter
  const [reloadToken, setReloadToken] = useState(0);

  // internal selected set (if parent doesn't control selection)
  const [internalSelected, setInternalSelected] = useState(() => new Set());

  // compute a Set from selectedMemberCodes prop for quick lookup
  const controlledSelectedSet = useMemo(() => {
    if (!selectedMemberCodes) return null;
    if (selectedMemberCodes instanceof Set) return selectedMemberCodes;
    if (Array.isArray(selectedMemberCodes)) return new Set(selectedMemberCodes.map(String));
    // fallback: single code string
    return new Set([String(selectedMemberCodes)]);
  }, [selectedMemberCodes]);

  // helper: is a given member considered selected (controlled -> prop, else internal)
  function isMemberSelected(member) {
    const code = member?.member_code || member?.lokos_member_code || member?.id;
    if (!code) return false;
    if (controlledSelectedSet) return controlledSelectedSet.has(String(code));
    return internalSelected.has(String(code));
  }

  async function load(page = 1, { force = false } = {}) {
    if (!shgCode) return;

    const pageSize = meta.page_size || 20;
    const cacheKey = JSON.stringify({
      shgCode,
      page,
      page_size: pageSize,
      search: search || "",
      ordering: ordering || "",
      onlyPld: !!onlyPld,
    });

    if (!force && shgMembersCache.has(cacheKey)) {
      const cached = shgMembersCache.get(cacheKey);
      setRows(cached.rows || []);
      setMeta(cached.meta || { page, page_size: pageSize, total: 0 });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await EPSAKHI_API.upsrlmShgMembers(shgCode, {
        page,
        page_size: pageSize,
        search: search || undefined,
        ordering: ordering || undefined,
        pld_status: onlyPld ? "true" : undefined,
      });

      const payload = res?.data || {};
      const data = Array.isArray(payload.data) ? payload.data : [];
      const m = payload.meta || {
        page,
        page_size: pageSize,
        total: data.length,
      };

      const newMeta = {
        page: m.page || page,
        page_size: m.page_size || pageSize,
        total: m.total ?? m.count ?? data.length,
      };

      setRows(data);
      setMeta(newMeta);
      shgMembersCache.set(cacheKey, { rows: data, meta: newMeta });
    } catch (e) {
      console.error("Failed to load SHG members", e?.response?.data || e.message || e);
      setError(e?.response?.data?.detail || e.message || "Failed to load SHG members from UPSRLM.");
    } finally {
      setLoading(false);
    }
  }

  // reload whenever shg / filters / reloadToken change
  useEffect(() => {
    setRows([]);
    setMeta({ page: 1, page_size: 20, total: 0 });
    // reset internal selection when shg changes
    setInternalSelected(new Set());
    if (shgCode) {
      load(1, { force: reloadToken > 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shgCode, search, ordering, onlyPld, reloadToken]);

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

  // Toggle handler when user checks/unchecks a row
  function handleToggleRow(member, checked) {
    const code = member?.member_code || member?.lokos_member_code || member?.id;
    if (!code) return;

    // if parent controls selection via selectedMemberCodes prop, just call callback
    if (controlledSelectedSet) {
      if (onToggleMember) onToggleMember(member, !!checked);
      // also keep legacy callback for add
      if (checked && onSelectMember) onSelectMember(member);
      return;
    }

    // otherwise maintain internal state
    setInternalSelected((prev) => {
      const copy = new Set(prev);
      if (checked) copy.add(String(code));
      else copy.delete(String(code));
      return copy;
    });

    // call callbacks
    if (onToggleMember) onToggleMember(member, !!checked);
    if (checked && onSelectMember) onSelectMember(member);
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="header-row space-between">
        <div>
          <h3>
            Members in SHG:{" "}
            <span style={{ color: "#111827" }}>
              {shg.shg_name || shg.name || shg.shg_code || shg.code}
            </span>
          </h3>
        </div>
        <button
          className="btn-sm btn-flat"
          onClick={() => setReloadToken((t) => t + 1)}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="filters-row" style={{ gap: 8 }}>
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
          <option value="dob">Age (Youngest first)</option>
          <option value="-dob">Age (Oldest first)</option>
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
          Only working PLD status
        </label>
        <button
          className="btn-sm btn-outline"
          onClick={() => load(1, { force: true })}
        >
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
            <table className="table table-compact">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>{" "}</th>
                  <th>Member Name</th>
                  <th>Member Code</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Marital Status</th>
                  <th>Designation</th>
                  <th>Mobile</th>
                  <th>Religion</th>
                  <th>Social Category</th>
                  <th>Aadhaar No</th>
                  <th>Aadhaar Verified</th>
                  <th>PLD Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const code = m.member_code || m.lokos_member_code || m.id;
                  const isSelected =
                    (selectedMemberCode && code && selectedMemberCode === code) ||
                    isMemberSelected(m);

                  const age = calculateAge(m.dob);
                  const phone =
                    (Array.isArray(m.member_phones) &&
                      m.member_phones.find((p) => p.is_default)?.phone_no) ||
                    (Array.isArray(m.member_phones) && m.member_phones[0]?.phone_no) ||
                    m.mobile ||
                    m.phone_no ||
                    "-";

                  const designation =
                    (Array.isArray(m.member_designations) &&
                      m.member_designations[0]?.designation) ||
                    "";

                  return (
                    <tr
                      key={code || `${m.member_name}-${Math.random()}`}
                      className={isSelected ? "row-selected" : ""}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={(e) => handleToggleRow(m, e.target.checked)}
                        />
                      </td>

                      <td>{m.member_name || "-"}</td>
                      <td>{code || "-"}</td>
                      <td>{age || "-"}</td>
                      <td>{m.gender || "-"}</td>
                      <td>{m.marital_status || "-"}</td>
                      <td>{designation || "-"}</td>
                      <td>{phone}</td>
                      <td>{m.religion || "-"}</td>
                      <td>{m.social_category || "-"}</td>
                      <td>{m.aadhar_no || "-"}</td>
                      <td>{m.aadhar_verified ? "Yes" : "No"}</td>
                      <td>{m.pld_status ? "Yes" : "No"}</td>
                      <td>
                        {/* Legacy action kept for backward compatibility */}
                        <button
                          className="btn-sm btn-outline"
                          onClick={() => onSelectMember && onSelectMember(m)}
                        >
                          View Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && meta.total > meta.page_size && (
            <div className="pagination" style={{ marginTop: 8 }}>
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
