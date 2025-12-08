// src/pages/Dashboard/ShgListTable.jsx
import React from "react";

export default function ShgListTable({
  rows,
  meta,
  loading,
  error,
  search,
  ordering,
  onSearchChange,
  onOrderingChange,
  onApplyFilters,
  onPageChange,
  selectedShgCode,
  onSelectShg,
}) {
  return (
    <div style={{ flex: 1.3, minWidth: 0 }}>
      <div className="filters-row">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search SHG name / code"
          className="input"
        />
        <select
          className="input"
          value={ordering}
          onChange={(e) => onOrderingChange(e.target.value)}
        >
          <option value="">Order by…</option>
          <option value="shg_name">SHG Name (A-Z)</option>
          <option value="-shg_name">SHG Name (Z-A)</option>
          <option value="village_name">Village (A-Z)</option>
          <option value="-village_name">Village (Z-A)</option>
        </select>
        <button className="btn-sm btn-outline" onClick={onApplyFilters}>
          Apply
        </button>
      </div>

      {loading ? (
        <div className="table-spinner">
          <span>Loading SHGs…</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>SHG Name</th>
                <th>SHG Code</th>
                <th>Village</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((shg, idx) => (
                <tr
                  key={shg.shg_code || `${shg.shg_name || "shg"}-${idx}`}
                  className={
                    selectedShgCode === shg.shg_code ? "row-selected" : ""
                  }
                >
                  <td>{shg.shg_name}</td>
                  <td>{shg.shg_code}</td>
                  <td>{shg.village_name}</td>
                  <td>
                    <button
                      className="btn-sm btn-outline"
                      onClick={() => onSelectShg(shg)}
                    >
                      View Members
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
        </>
      )}
    </div>
  );
}
