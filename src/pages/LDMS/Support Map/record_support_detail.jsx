// src/pages/LDMS/Support Map/record_support_detail.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FaUniversity,
  FaProjectDiagram,
  FaClipboardList,
  FaUsers,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaSearch,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { LDMS_API } from "../../../api/axios";
import LoadingModal from "../../../components/ui/LoadingModal";

export default function RecordSupportDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const PAGE_SIZE = 10;

  const [searchTerm, setSearchTerm] = useState("");
  const [pldFilter, setPldFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadDetail() {
      try {
        setLoading(true);
        const res = await LDMS_API.BucketApprovals.retrieve(
          `${id}/full-detail`,
        );
        setData(res.data);
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  if (loading || !data) {
    return (
      <LoadingModal
        open
        title="Loading Support Map"
        message="Fetching complete support details…"
      />
    );
  }

  const { support_bucket } = data;
  const isTraining = support_bucket?.training_support;

  const beneficiaries = support_bucket?.recorded_benefs || [];

  const filteredData = beneficiaries.filter((b) => {
    const q = searchTerm.toLowerCase();

    const matchesSearch =
      b.member_name?.toLowerCase().includes(q) ||
      b.lokos_shg_code?.includes(q) ||
      b.mobile?.includes(q);

    const matchesPLD = pldFilter === "ALL" || b.pld_status === pldFilter;

    return matchesSearch && matchesPLD;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));

  const pagedData = filteredData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="rsd-page">
      {/* ================= Department & Scheme ================= */}
      <section className="card">
        <h3>
          <FaUniversity /> Department & Scheme
        </h3>
        <div className="grid">
          <div>
            <b>Department</b>
            <span>{support_bucket.department.name}</span>
          </div>
          <div>
            <b>Scheme</b>
            <span>{support_bucket.scheme.name}</span>
          </div>
          <div>
            <b>Scheme Code</b>
            <span>{support_bucket.scheme.code || "-"}</span>
          </div>
          <div>
            <b>Scope</b>
            <span>{support_bucket.scheme.scope}</span>
          </div>
          <div>
            <b>Funding</b>
            <span>{support_bucket.scheme.funding}</span>
          </div>
          <div>
            <b>Contact Point</b>
            <span>{support_bucket.scheme.contact_point}</span>
          </div>
        </div>
      </section>
      {/* ================= Support Bucket ================= */}
      <section className="card">
        <h3>
          <FaProjectDiagram /> Support Bucket
        </h3>
        <div className="grid">
          <div>
            <b>Bucket Type</b>
            <span>{support_bucket.bucket_type.bucket_type}</span>
          </div>
          <div>
            <b>Benefit Name</b>
            <span>{support_bucket.benefit_name || "-"}</span>
          </div>
          <div>
            <b>Benefit Amount</b>
            <span>{support_bucket.benefit_amount || "-"}</span>
          </div>
          <div className="full">
            <b>Description</b>
            <span>{support_bucket.benefit_description || "-"}</span>
          </div>
        </div>
      </section>
      {/* ================= Training Section (Conditional) ================= */}
      {isTraining && (
        <section className="card training">
          <h3>
            <FaChalkboardTeacher /> Training Details
          </h3>
          <div className="grid">
            <div>
              <b>Theme</b>
              <span>
                {support_bucket.training_support.training_theme.theme_name}
              </span>
            </div>
            <div>
              <b>Training Name</b>
              <span>
                {support_bucket.training_support.training_plan.training_name}
              </span>
            </div>
            <div>
              <b>Type</b>
              <span>
                {support_bucket.training_support.training_plan.type_of_training}
              </span>
            </div>
            <div>
              <b>Level</b>
              <span>
                {
                  support_bucket.training_support.training_plan
                    .level_of_training
                }
              </span>
            </div>
            <div>
              <b>No. of Days</b>
              <span>
                {support_bucket.training_support.training_plan.no_of_days}
              </span>
            </div>
          </div>
        </section>
      )}
      {/* ================= Beneficiaries ================= */}
      <section className="card">
        <h3>
          <FaUsers /> Beneficiaries ({support_bucket.recorded_benefs.length})
        </h3>

        {/* ---- Filters ---- */}
        <div className="ben-filters">
          <div className="search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search by name, SHG code or mobile…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="filter">
            <FaFilter />
            <select
              value={pldFilter}
              onChange={(e) => {
                setPldFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All</option>
              <option value="Yes">PLD Only</option>
              <option value="No">Non-PLD</option>
            </select>
          </div>
        </div>

        {/* ---- Table ---- */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Member Name</th>
                <th>SHG Code</th>
                <th>Designation</th>
                <th>Gender</th>
                <th>Category</th>
                <th>Education</th>
                <th>Age</th>
                <th>Mobile</th>
                <th>PLD</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.map((b, i) => (
                <tr key={b.id} className={b.pld_status === "Yes" ? "pld" : ""}>
                  <td>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                  <td>{b.member_name}</td>
                  <td>{b.lokos_shg_code}</td>
                  <td>{b.designation || "-"}</td>
                  <td>{b.gender}</td>
                  <td>{b.social_category}</td>
                  <td>{b.education}</td>
                  <td>{b.age}</td>
                  <td>{b.mobile || "-"}</td>
                  <td>
                    {b.pld_status === "Yes" && (
                      <FaCheckCircle className="pld-icon" />
                    )}
                    {b.pld_status}
                  </td>
                </tr>
              ))}

              {!pagedData.length && (
                <tr>
                  <td colSpan="10" className="empty">
                    No beneficiaries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ---- Pagination ---- */}
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <FaChevronLeft /> Prev
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next <FaChevronRight />
          </button>
        </div>
      </section>
      {/* ================= Styles ================= */}
      <style>{`
        .rsd-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px;
        }

        h3 {
          margin: 0 0 12px;
          color: #7a0c0c;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .grid .full {
          grid-column: span 3;
        }

        b {
          display: block;
          font-size: 12px;
          color: #6b7280;
        }

        span {
          font-weight: 600;
          color: #111827;
        }

        .training {
          border-left: 4px solid #7a0c0c;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        th, td {
          padding: 8px 10px;
          border-bottom: 1px solid #f1f1f1;
          white-space: nowrap;
        }

        th {
          color: #7a0c0c;
          font-weight: 700;
        }

        tr.pld {
          background: #f0fdf4;
        }

        .pld-icon {
          color: #16a34a;
          margin-right: 4px;
        }

        .ben-filters {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .search,
        .filter {
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #e5e7eb;
          padding: 6px 8px;
          border-radius: 8px;
          background: #fff;
        }

        .search input,
        .filter select {
          border: none;
          outline: none;
          font-size: 13px;
        }

        .pagination {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }

        .pagination button {
          background: #7a0c0c;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 4px 10px;
          cursor: pointer;
        }

        .pagination button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .empty {
          text-align: center;
          padding: 14px;
          color: #6b7280;
        }
          
        @media (max-width: 1024px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .grid .full {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}
