// src/pages/LDMS/Support Map/sup_cap_comps/SCPLDs.jsx
import React, { useState, useMemo } from "react";
import {
  FaUser,
  FaUsers,
  FaMapMarkerAlt,
  FaTrash,
  FaRupeeSign,
} from "react-icons/fa";

const PAGE_SIZE = 8;

function calculateAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function SCPLDs({ beneficiaries = [], onRemove }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(beneficiaries.length / PAGE_SIZE));

  const pageData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return beneficiaries.slice(start, start + PAGE_SIZE);
  }, [beneficiaries, page]);

  if (!beneficiaries.length) {
    return <p className="muted">No beneficiaries selected yet.</p>;
  }

  return (
    <div className="scplds">
      <div className="scplds-header">
        <FaUsers />
        Selected Beneficiaries ({beneficiaries.length})
      </div>

      <div className="scplds-list">
        {pageData.map(({ member, shg }) => {
          const age = calculateAge(member.dob);
          const designation =
            member.member_designations?.[0]?.designation || "-";
          const isPLD = !!member.pld_status;

          return (
            <div
              key={member.member_code}
              className={`scplds-card ${isPLD ? "pld" : ""}`}
            >
              <div className="scplds-main">
                <div className="scplds-name">
                  <FaUser />
                  {member.member_name}
                </div>

                <div className="scplds-meta">
                  <span>
                    <b>Member Code:</b> {member.member_code}
                  </span>
                  <span>
                    <b>SHG:</b> {shg?.name} ({shg?.code})
                  </span>
                  <span>
                    <b>Designation:</b> {designation}
                  </span>
                  <span>
                    <b>Gender:</b> {member.gender || "-"}
                  </span>
                  <span>
                    <b>Age:</b> {age ?? "-"}
                  </span>
                  <span>
                    <b>Social Category:</b> {member.social_category || "-"}
                  </span>
                  <span>
                    <b>Religion:</b> {member.religion || "-"}
                  </span>
                  <span>
                    <b>PLD Status:</b> {isPLD ? "Yes" : "No"}
                  </span>
                </div>

                <div className="scplds-location">
                  <FaMapMarkerAlt />
                  District: {shg?.districtId}, Block: {shg?.blockId}, Panchayat:{" "}
                  {shg?.panchayatId}, Village: {shg?.villageId}
                </div>
              </div>

              {isPLD && (
                <div className="pld-badge">
                  <FaRupeeSign /> PLD
                </div>
              )}

              {onRemove && (
                <button
                  className="scplds-remove"
                  onClick={() => onRemove(member.member_code)}
                  title="Remove beneficiary"
                >
                  <FaTrash />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* -------- Pagination -------- */}
      <div className="scplds-pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>

      {/* ---- styles ---- */}
      <style>{`
        .scplds {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .scplds-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: #7a0c0c;
        }

        .scplds-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .scplds-card {
          position: relative;
          display: flex;
          justify-content: space-between;
          border: 1px solid #f1f1f1;
          border-left: 5px solid #b91c1c;
          border-radius: 10px;
          padding: 10px 12px;
          background: #fff;
        }

        .scplds-card.pld {
          border-left-color: #15803d;
          background: #f0fdf4;
        }

        .pld-badge {
          position: absolute;
          top: 8px;
          right: 36px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 700;
          color: #15803d;
          background: #dcfce7;
          padding: 4px 8px;
          border-radius: 999px;
        }

        .scplds-name {
          font-weight: 700;
          color: #400b0b;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .scplds-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 6px;
          font-size: 13px;
          margin-top: 6px;
        }

        .scplds-location {
          margin-top: 6px;
          font-size: 12px;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .scplds-remove {
          background: none;
          border: none;
          color: #b91c1c;
          cursor: pointer;
        }

        .scplds-remove:hover {
          color: #7a0c0c;
        }

        .scplds-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }

        .scplds-pagination button {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          background: #b90000;
          cursor: pointer;
        }

        .scplds-pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .muted {
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
