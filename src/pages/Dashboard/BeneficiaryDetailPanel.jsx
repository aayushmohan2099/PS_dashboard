// src/pages/Dashboard/BeneficiaryDetailPanel.jsx
import React from "react";

export default function BeneficiaryDetailPanel({ detail, loading, error }) {
  if (loading) {
    return (
      <div className="table-spinner">
        <span>Loading detail…</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!detail) {
    return <p className="muted">Click on a member to see full detail.</p>;
  }

  const basic = detail.basic || {};
  const shg = detail.shg || {};
  const epsakhi = detail.epsakhi || {};

  return (
    <div className="card soft" style={{ padding: 12 }}>
      <h4 style={{ marginTop: 0 }}>{basic.member_name || "Member"}</h4>
      <p className="muted" style={{ marginTop: 0 }}>
        Member Code: <strong>{basic.member_code}</strong>
      </p>

      <div className="flex" style={{ gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h5>Basic</h5>
          <ul className="detail-list">
            <li>
              <strong>SHG Code:</strong>{" "}
              {basic.lokos_shg_code || shg.shg_code || "-"}
            </li>
            <li>
              <strong>Mobile:</strong> {basic.mobile_no || "-"}
            </li>
            <li>
              <strong>District:</strong>{" "}
              {basic.district_name || shg.district_name || "-"}
            </li>
            <li>
              <strong>Block:</strong>{" "}
              {basic.block_name || shg.block_name || "-"}
            </li>
            <li>
              <strong>Village:</strong>{" "}
              {basic.village_name || shg.village_name || "-"}
            </li>
          </ul>
        </div>

        <div style={{ flex: 1 }}>
          <h5>Enterprise / TMS linkage</h5>
          {epsakhi && Object.keys(epsakhi).length > 0 ? (
            <ul className="detail-list">
              <li>
                <strong>Recorded Beneficiary ID:</strong>{" "}
                {epsakhi.recorded_benef_id || "-"}
              </li>
              <li>
                <strong>Enterprise Name:</strong>{" "}
                {epsakhi.enterprise_name || "-"}
              </li>
              <li>
                <strong>Enterprise Type:</strong>{" "}
                {epsakhi.enterprise_type || "-"}
              </li>
              <li>
                <strong>Training Received:</strong>{" "}
                {epsakhi.is_training_received ? "Yes" : "No"}
              </li>
            </ul>
          ) : (
            <p className="muted">No TMS / enterprise detail linked yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
