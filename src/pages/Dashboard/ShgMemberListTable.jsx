// src/pages/Dashboard/ShgMemberListTable.jsx
import React from "react";

export default function ShgMemberListTable({
  rows,
  meta,
  loading,
  error,
  selectedShg,
  search,
  ordering,
  pldStatus,
  onSearchChange,
  onOrderingChange,
  onPldStatusChange,
  onApplyFilters,
  onPageChange,
  onClickMember,
}) {
  return (
    <div>
      <h3>Members in Selected SHG</h3>
      <div className="filters-row">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search member name / code"
          className="input"
        />
        <select
          className="input"
          value={ordering}
          onChange={(e) => onOrderingChange(e.target.value)}
        >
          <option value="">Order by…</option>
          <option value="member_name">Name (A-Z)</option>
          <option value="-member_name">Name (Z-A)</option>
        </select>
        <label
          style={{ display: "flex", alignItems: "center", gap: 4 }}
          className="small-muted"
        >
          <input
            type="checkbox"
            checked={pldStatus === "1"}
            onChange={(e) => onPldStatusChange(e.target.checked ? "1" : "")}
          />
          Potential Lakhpati Didis in SHG
        </label>
        <button
          className="btn-sm btn-outline"
          onClick={onApplyFilters}
          disabled={!selectedShg}
        >
          Apply
        </button>
      </div>

      {loading ? (
        <div className="table-spinner">
          <span>Loading members…</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : !selectedShg ? (
        <p className="muted">Select an SHG to see its members.</p>
      ) : (
        <div>
          <table className="table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Member Code</th>
                <th>Mobile</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.member_code}>
                  <td>{m.member_name}</td>
                  <td>{m.member_code}</td>
                  <td>{m.mobile || m.mobile_no || "-"}</td>
                  <td>
                    <button
                      className="btn-sm btn-outline"
                      onClick={() => onClickMember(m)}
                    >
                      View Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta && meta.total > meta.page_size && (
            <div className="pagination">
              <button
                disabled={meta.page <= 1}
                onClick={() => onPageChange(meta.page - 1)}
                className="btn-sm btn-flat"
              >
                Prev
              </button>
              <span>
                Page {meta.page} of {Math.ceil(meta.total / meta.page_size)}
              </span>
              <button
                disabled={meta.page * meta.page_size >= meta.total}
                onClick={() => onPageChange(meta.page + 1)}
                className="btn-sm btn-flat"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
