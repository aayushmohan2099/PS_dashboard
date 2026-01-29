// src/pages/LDMS/Support Map/record_support_list.jsx
import React, { useEffect, useState, useContext, useMemo } from "react";
import {
  FaEye,
  FaEdit,
  FaFilter,
  FaMapMarkedAlt,
  FaCheckCircle,
} from "react-icons/fa";
import { LDMS_API, LOOKUP_API } from "../../../api/axios";
import { AuthContext } from "../../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const STATUS_ALL = ["DRAFT", "PENDING", "APPROVED", "REJECTED"];
const STATUS_NO_DRAFT = ["PENDING", "APPROVED", "REJECTED"];

export default function SupportBucketList() {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const role = user?.role_id;
  const isBMMU = role == 1;
  const isDMMU = role == 2;
  const isSMMU = role == 3;

  const [districtId, setDistrictId] = useState(null);
  const [blockId, setBlockId] = useState(null);

  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);

  const [onlyAspirational, setOnlyAspirational] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ---------- Resolve District for DMMU ---------- */
  useEffect(() => {
    if (!isDMMU || !user?.id) return;

    LOOKUP_API.userGeoscopeByUserId(user.id)
      .then((res) => {
        const dist = res?.data?.districts?.[0];
        if (dist) setDistrictId(dist);
      })
      .catch(console.error);
  }, [isDMMU, user?.id]);

  /* ---------- Load Districts for SMMU ---------- */
  useEffect(() => {
    if (!isSMMU) return;

    LOOKUP_API.districts
      .list({ page_size: 80 })
      .then((res) => setDistricts(res?.data?.results || []))
      .catch(console.error);
  }, [isSMMU]);

  /* ---------- Load Blocks ---------- */
  useEffect(() => {
    if (!districtId || typeof districtId !== "number") return;

    LOOKUP_API.blocks
      .retrieve(districtId)
      .then((res) => {
        let data = res?.data?.results || [];
        if (onlyAspirational) {
          data = data.filter((b) => b.is_aspirational === 1);
        }
        setBlocks(data);
      })
      .catch((e) =>
        console.error("Failed to load blocks for district", districtId, e),
      );
  }, [districtId, onlyAspirational]);

  /* ---------- BMMU Block Auto Resolve ---------- */
  useEffect(() => {
    if (!isBMMU || !user?.id) return;

    LOOKUP_API.userGeoscopeByUserId(user.id)
      .then((res) => {
        const blk = res?.data?.blocks?.[0];
        if (blk) setBlockId(blk);
      })
      .catch(console.error);
  }, [isBMMU, user?.id]);

  /* ---------- Fetch Buckets ---------- */
  useEffect(() => {
    if (!blockId) return;

    setLoading(true);
    LDMS_API.BucketApprovals.list({ block_id: blockId })
      .then((res) => {
        let data = res?.data?.results || [];

        if (!isBMMU) {
          data = data.filter((r) => r.approval_status !== "DRAFT");
        }

        if (statusFilter !== "ALL") {
          data = data.filter((r) => r.approval_status === statusFilter);
        }

        setRows(data);
      })
      .finally(() => setLoading(false));
  }, [blockId, statusFilter, isBMMU]);

  const statusOptions = useMemo(
    () => (isBMMU ? STATUS_ALL : STATUS_NO_DRAFT),
    [isBMMU],
  );

  const renderStatus = (s) => (
    <span className={`status-pill ${s?.toLowerCase()}`}>{s}</span>
  );

  return (
    <div className="sb-container">
      <header className="sb-header">
        <FaMapMarkedAlt />
        <h2>Support Bucket Approvals</h2>
      </header>

      {/* ---- Filters ---- */}
      <div className="filters">
        {isSMMU && (
          <select onChange={(e) => setDistrictId(Number(e.target.value))}>
            <option value="">Select District</option>
            {districts.map((d) => (
              <option key={d.district_id} value={d.district_id}>
                {d.district_name_en}
              </option>
            ))}
          </select>
        )}

        {(isDMMU || isSMMU) && (
          <select onChange={(e) => setBlockId(e.target.value)}>
            <option value="">Select Block</option>
            {blocks.map((b) => (
              <option key={b.block_id} value={b.block_id}>
                {b.block_name_en}
              </option>
            ))}
          </select>
        )}

        {(isDMMU || isSMMU) && (
          <label className="aspirational">
            <input
              type="checkbox"
              checked={onlyAspirational}
              onChange={(e) => setOnlyAspirational(e.target.checked)}
            />
            Aspirational Blocks
          </label>
        )}

        <div className="status-filter">
          <FaFilter />
          <select onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ---- Table ---- */}
      {loading ? (
        <p className="muted">Loading approvals…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No approval requests found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Created On</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Approved On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>{renderStatus(r.approval_status)}</td>
                <td>{r.rejection_reason || "-"}</td>
                <td>
                  {r.approval_date
                    ? new Date(r.approval_date).toLocaleDateString()
                    : "-"}
                </td>
                <td className="actions">
                  <button
                    onClick={() => navigate(`/ldms/support-map-detail/${r.id}`)}
                  >
                    <FaEye />
                  </button>
                  {isBMMU && r.approval_status === "DRAFT" && (
                    <button
                      className="edit"
                      onClick={() => navigate(`/ldms/support-map/edit/${r.id}`)}
                    >
                      <FaEdit />
                    </button>
                  )}
                  {/* MAI YAHA THA 29-01-2026 */}
                  {isDMMU && r.approval_status === "PENDING" && (
                    <button
                      className="edit"
                      onClick={() => navigate(`/ldms/support-map/edit/${r.id}`)}
                    >
                      <FaEdit />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ---- Styles ---- */}
      <style>{`
        .sb-container {
          background:#fff;
          border-radius:14px;
          padding:16px;
          border:1px solid #e5e7eb;
        }

        .sb-header {
          display:flex;
          align-items:center;
          gap:10px;
          color:#7a0c0c;
        }

        .filters {
          display:flex;
          gap:12px;
          flex-wrap:wrap;
          margin:14px 0;
        }

        select {
          padding:8px 12px;
          border-radius:8px;
          border:1px solid #e5e7eb;
        }

        .aspirational {
          display:flex;
          align-items:center;
          gap:6px;
          font-weight:600;
          color:#7a0c0c;
        }

        table {
          width:100%;
          border-collapse:collapse;
        }

        th, td {
          padding:10px;
          border-bottom:1px solid #f1f1f1;
        }

        th {
          background:#fafafa;
          color:#7a0c0c;
        }

        .status-pill {
          padding:4px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:700;
        }

        .status-pill.pending { background:#dbeafe; color:#1e40af; }
        .status-pill.approved { background:#dcfce7; color:#166534; }
        .status-pill.rejected { background:#fee2e2; color:#7f1d1d; }
        .status-pill.draft { background:#fef3c7; color:#92400e; }

        .actions button {
          margin-right:6px;
          border:none;
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:8px;
          width:36px;
          height:36px;
          cursor:pointer;
          color:#7a0c0c;
        }

        .actions button:hover {
          background:#7a0c0c;
          color:#fff;
        }

        .actions .edit:hover {
          background:#92400e;
        }

        .muted {
          color:#9ca3af;
          font-style:italic;
        }
      `}</style>
    </div>
  );
}
