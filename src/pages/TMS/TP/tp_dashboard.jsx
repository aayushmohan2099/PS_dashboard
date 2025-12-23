// src/pages/TMS/TP/tp_dashboard.jsx
import React from "react";

export default function TpDashboard() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h2>Training Partner Dashboard</h2>

      <div className="muted" style={{ marginBottom: 16 }}>
        Overview of training centres, contact persons, training requests and
        batches.
      </div>

      {/* Phase 1 placeholders */}
      <div className="grid grid-2" style={{ gap: 16 }}>
        <div className="card">
          <h4>Training Centres</h4>
          <p className="muted">
            Register and manage training centres with infrastructure details.
          </p>
          <span className="badge badge-outline">Coming next</span>
        </div>

        <div className="card">
          <h4>Contact Persons</h4>
          <p className="muted">
            Create and manage centre-level contact person accounts.
          </p>
          <span className="badge badge-outline">Coming next</span>
        </div>

        <div className="card">
          <h4>Training Requests</h4>
          <p className="muted">
            View assigned training requests and initiate batch creation.
          </p>
          <span className="badge badge-outline">Live</span>
        </div>

        <div className="card">
          <h4>Batches</h4>
          <p className="muted">
            Create single or combined batches, attach centres and propose to
            DMMU.
          </p>
          <span className="badge badge-outline">Coming next</span>
        </div>
      </div>
    </div>
  );
}
