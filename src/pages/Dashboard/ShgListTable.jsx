// src/pages/Dashboard/ShgListTable.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

/**
 * SHG list for a given block.
 * - Uses /upsrlm-shg-list/<block_id>/
 * - Correct pagination – supports both {data, meta} and {results, count} shapes.
 *
 * Props:
 *  - blockId           (required)
 *  - onSelectShg(shg)  -> called when user clicks "View Members"
 *  - selectedShgCode   -> optional, to highlight current selection
 */
export default function ShgListTable({ blockId, onSelectShg, selectedShgCode }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, page_size: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("");

  async function load(page = 1) {
    if (!blockId) return;
    setLoading(true);
    setError("");

    try {
      const res = await api.get(
        `/upsrlm-shg-list/${encodeURIComponent(blockId)}/`,
        {
          params: {
            page,
            page_size: meta.page_size || 20,
            search: search || undefined,
            ordering: ordering || undefined,
          },
        }
      );

      const payload = res?.data || {};

      // Support both shapes:
      // 1) {"data":[...],"meta":{page,page_size,total}}
      // 2) {"results":[...],"count":N}
      const data =
        Array.isArray(payload.data) && payload.data.length
          ? payload.data
          : Array.isArray(payload.results)
          ? payload.results
          : [];

      const totalFromMeta = payload.meta?.total;
      const totalFromCount = typeof payload.count === "number" ? payload.count : data.length;

      const newMeta = {
        page: payload.meta?.page ?? page,
        page_size: payload.meta?.page_size ?? meta.page_size ?? 20,
        total: totalFromMeta ?? totalFromCount,
      };

      setRows(data);
      setMeta(newMeta);
    } catch (e) {
      console.error("Failed to load SHG list", e?.response?.data || e.message || e);
      setError(
        e?.response?.data?.detail ||
          e.message ||
          "Failed to load SHG list from UPSRLM."
      );
    } finally {
      setLoading(false);
    }
  }

  // reload on block / filters change
  useEffect(() => {
    setRows([]);
    setMeta({ page: 1, page_size: 20, total: 0 });
    if (blockId) {
      load(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, search, ordering]);

  const totalPages =
    meta && meta.page_size > 0
      ? Math.max(1, Math.ceil((meta.total || 0) / meta.page_size))
      : 1;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="header-row">
        <div>
          <h2>Self Help Groups (SHGs)</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            List of SHGs fetched from UPSRLM for the selected block. Use search
            and ordering to narrow down.
          </p>
        </div>
      </div>

      <div className="filters-row">
        <input
          type="text"
          className="input"
          placeholder="Search SHG name / code / village"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          value={ordering}
          onChange={(e) => setOrdering(e.target.value)}
        >
          <option value="">Order by…</option>
          <option value="shg_name">SHG Name (A–Z)</option>
          <option value="-shg_name">SHG Name (Z–A)</option>
          <option value="village_name">Village (A–Z)</option>
          <option value="-village_name">Village (Z–A)</option>
        </select>
        <button className="btn-sm btn-outline" onClick={() => load(1)}>
          Apply
        </button>
      </div>

      {loading ? (
        <div className="table-spinner">
          <span>Loading SHGs…</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger" style={{ marginTop: 8 }}>
          {error}
        </div>
      ) : rows.length === 0 ? (
        <p className="muted" style={{ marginTop: 8 }}>
          No SHGs found for this block.
        </p>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>SHG Name</th>
                  <th>SHG Code</th>
                  <th>SHG Type</th>
                  <th>Social Category</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((shg, idx) => {
                  const code =
                    shg.shg_code || shg.code || shg.id || `${shg.shg_name}-${idx}`;
                  const isSelected =
                    selectedShgCode && selectedShgCode === shg.shg_code;
                  return (
                    <tr
                      key={code}
                      className={isSelected ? "row-selected" : ""}
                    >
                      <td>{shg.shg_name || shg.name || "-"}</td>
                      <td>{shg.shg_code || shg.code || "-"}</td>
                      <td>{shg.shgType || "-"}</td>
                      <td>{shg.socialCategory}</td>
                      <td>                   
                        <button
                          className="btn-sm btn-outline"
                          onClick={() => onSelectShg && onSelectShg(shg)}
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
