import React, { useEffect, useState, useContext } from "react";
import { FaEye, FaEdit } from "react-icons/fa";
import { LDMS_API, LOOKUP_API } from "../../../api/axios";
import { AuthContext } from "../../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SupportBucketList() {
  const { user } = useContext(AuthContext) || {};
  const [blockId, setBlockId] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const navigate = useNavigate();

  /* -------- Load Block ID -------- */
  useEffect(() => {
    async function loadGeoscope() {
      try {
        setLoadingGeo(true);
        if (!user?.id) return;

        const res = await LOOKUP_API.userGeoscopeByUserId(user.id);
        const blocks = res?.data?.blocks || [];
        if (blocks.length) setBlockId(blocks[0]);
      } finally {
        setLoadingGeo(false);
      }
    }
    loadGeoscope();
  }, [user?.id]);

  /* -------- Fetch Bucket Approvals -------- */
  useEffect(() => {
    if (!blockId) return;

    async function loadBuckets() {
      try {
        setLoading(true);
        const res = await LDMS_API.BucketApprovals.list({
          block_id: blockId,
        });
        setRows(res?.data?.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadBuckets();
  }, [blockId]);

  function renderStatus(status) {
    return (
      <span className={`status-pill ${status?.toLowerCase()}`}>{status}</span>
    );
  }

  return (
    <div className="sb-list">
      <h2>Support Buckets</h2>

      {loadingGeo || loading ? (
        <p className="muted">Loading support buckets…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No support buckets found.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Creation Date</th>
                <th>Approval Status</th>
                <th>Rejection Reason</th>
                <th>Approval Date</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id}>
                  <td>{idx + 1}</td>
                  <td>
                    {r.created_at
                      ? new Date(r.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td>{renderStatus(r.approval_status)}</td>
                  <td>{r.rejection_reason || "-"}</td>
                  <td>
                    {r.approval_date
                      ? new Date(r.approval_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/ldms/support-map-detail/${r.id}`)
                        }
                        className="icon-btn"
                        title="View Support Map"
                      >
                        <FaEye />
                      </button>

                      {r.approval_status === "DRAFT" && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/ldms/support-map/edit/${r.id}`)
                          }
                          className="icon-btn edit"
                          title="Edit Draft"
                        >
                          <FaEdit />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- styles ---- */}
      <style>{`
        .sb-list {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px;
        }

        .sb-list h2 {
          margin: 0 0 12px;
          color: #400b0b;
          font-weight: 700;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        thead {
          background: #fafafa;
        }

        th,
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #f1f1f1;
          text-align: left;
          white-space: nowrap;
        }

        th {
          font-weight: 700;
          color: #7a0c0c;
        }

        tr:hover {
          background: #fff7f7;
        }

        .status-pill {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          display: inline-block;
        }

        .status-pill.draft {
          background: #fef3c7;
          color: #92400e;
        }

        .status-pill.pending {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-pill.approved {
          background: #dcfce7;
          color: #166534;
        }

        .status-pill.rejected {
          background: #fee2e2;
          color: #7f1d1d;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #fff;
          color: #7a0c0c;
          cursor: pointer;
        }

        .icon-btn:hover {
          background: #7a0c0c;
          color: #fff;
        }

        .icon-btn.edit {
          color: #92400e;
        }

        .icon-btn.edit:hover {
          background: #92400e;
          color: #fff;
        }

        .muted {
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
