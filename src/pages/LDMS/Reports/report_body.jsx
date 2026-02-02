// src/pages/LDMS/Report/report_body.jsx
import React, { useEffect, useState, useMemo } from "react";
import { LDMS_API } from "../../../api/axios";

/**
 * ReportBody
 * - Displays Recorded Beneficiary Report
 * - Client-side pagination (1000 rows/page)
 * - Optimized for very large datasets
 */
export default function ReportBody({ filters }) {
  /* ---------------- state ---------------- */
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 1000;

  /* ---------------- fetch data ---------------- */
  useEffect(() => {
    if (!filters || Object.keys(filters).length === 0) {
      setData([]);
      return;
    }

    setLoading(true);
    setPage(1);

    LDMS_API.BenefReport(filters)
      .then((res) => {
        setData(res.data || []);
      })
      .catch((e) => {
        console.error("Failed to load report", e);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [filters]);

  /* ---------------- pagination ---------------- */
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  const pageData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [data, page]);

  /* ---------------- helpers ---------------- */
  const col = (v) => (v === null || v === "" ? "—" : v);

  /* ---------------- UI ---------------- */
  return (
    <div className="report-body">
      {/* Loader */}
      {loading && (
        <div className="table-loader">
          <span className="spinner" />
          <span>Loading report data…</span>
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="empty">
          No data available. Apply filters and click Fetch.
        </div>
      )}

      {!loading && data.length > 0 && (
        <>
          {/* Meta */}
          <div className="meta">
            <b>Total Records:</b> {data.length.toLocaleString()} &nbsp; | &nbsp;
            <b>Page:</b> {page} / {totalPages}
          </div>

          {/* Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>PLD</th>
                  <th>Member Name</th>
                  <th>SHG Code</th>
                  <th>Member Code</th>
                  <th>Designation</th>
                  <th>Phone</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Religion</th>
                  <th>Marital Status</th>
                  <th>Relation Name</th>
                  <th>Social Category</th>
                  <th>Education</th>
                  <th>Address</th>
                  <th>District</th>
                  <th>Block</th>
                  <th>Panchayat</th>
                  <th>Village</th>
                  <th>Department</th>
                  <th>Scheme</th>
                  <th>Scheme Code</th>
                  <th>Bucket</th>
                  <th>Benefit</th>
                  <th>Description</th>
                  <th>Training Theme</th>
                  <th>Training Plan</th>
                  <th>Approval Date</th>
                  <th>Approved By</th>
                </tr>
              </thead>

              <tbody>
                {pageData.map((r, i) => (
                  <tr key={i}>
                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>{col(r.pld_status)}</td>
                    <td>{col(r.member_name)}</td>
                    <td>{col(r.lokos_shg_code)}</td>
                    <td>{col(r.lokos_member_code)}</td>
                    <td>{col(r.designation)}</td>
                    <td>{col(r.mobile)}</td>
                    <td>{col(r.age)}</td>
                    <td>{col(r.gender)}</td>
                    <td>{col(r.religion)}</td>
                    <td>{col(r.marital_status)}</td>
                    <td>{col(r.father_husband_name)}</td>
                    <td>{col(r.social_category)}</td>
                    <td>{col(r.education)}</td>
                    <td>{col(r.address)}</td>
                    <td>{col(r.district_name_en)}</td>
                    <td>{col(r.block_name_en)}</td>
                    <td>{col(r.panchayat_name_en)}</td>
                    <td>{col(r.village_name_english)}</td>
                    <td>{col(r.department_name)}</td>
                    <td>{col(r.scheme_name)}</td>
                    <td>{col(r.scheme_code)}</td>
                    <td>{col(r.bucket_type)}</td>
                    <td>{col(r.benefit_name)}</td>
                    <td>{col(r.benefit_description)}</td>
                    <td>{col(r.training_theme)}</td>
                    <td>{col(r.training_plan)}</td>
                    <td>{col(r.approval_date)}</td>
                    <td>{col(r.approved_by)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(1)}>
              ⏮
            </button>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              ◀
            </button>
            <span>Page {page}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              ▶
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >
              ⏭
            </button>
          </div>
        </>
      )}

      {/* ---------------- styles ---------------- */}
      <style>{`
        .report-body {
          display: flex;
          flex-direction: column;   
          gap: 12px;
        }

        .meta {
          font-size: 14px;
          color: #7f1d1d;
        }

        .table-wrap {
        max-height: 60vh;
        max-width: 100%;
        overflow-x: auto;     /* ⬅ horizontal scroll lives HERE */
        overflow-y: auto;     /* ⬅ vertical scroll lives HERE */
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        position: relative;
        }

        table {
        border-collapse: collapse;
        min-width: 2200px;   /* keeps wide table */
        width: max-content; /* ⬅ prevents forcing parent width */
        font-size: 13px;
        }

        thead th {
          position: sticky;
          top: 0;
          background: #c62828;
          color: #fff;
          padding: 8px;
          white-space: nowrap;
          z-index: 2;
        }

        tbody td {
          padding: 6px 8px;
          border-bottom: 1px solid #f1f1f1;
          white-space: nowrap;
        }

        tbody tr:nth-child(even) {
          background: #fff5f5;
        }

        tbody tr:hover {
          background: #fee2e2;
        }

        .pagination {
          display: flex;
          justify-content: center;
          gap: 8px;
          align-items: center;
        }

        .pagination button {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #c62828;
          background: #fff;
          cursor: pointer;
        }

        .pagination button:disabled {
          opacity: 0.4;
          background: #c62828;
          cursor: not-allowed;
        }

        .table-loader {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          padding: 40px;
          color: #7f1d1d;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 3px solid #c62828;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .empty {
          padding: 40px;
          text-align: center;
          color: #9f1239;
        }

        .table-wrap::-webkit-scrollbar {
        height: 10px;
        }

        .table-wrap::-webkit-scrollbar-thumb {
        background: #c62828;
        border-radius: 6px;
        }

        .table-wrap::-webkit-scrollbar-track {
        background: #fee2e2;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
