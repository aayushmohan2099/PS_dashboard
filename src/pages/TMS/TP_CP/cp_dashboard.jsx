// src/pages/TMS/TP_CP/cp_dashboard.jsx
import React from "react";

export default function CpDashboard() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h2>Contact Person Dashboard</h2>

      <div className="muted" style={{ marginBottom: 16 }}>
        Centre-level coordination for batches, logistics and attendance.
      </div>

      <div className="card">
        <h4>My Centres</h4>
        <p className="muted">
          Training centres you are mapped to will be visible here.
        </p>
        <span className="badge badge-outline">Coming next</span>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h4>Batch Schedules</h4>
        <p className="muted">Upcoming and ongoing batches for your centres.</p>
        <span className="badge badge-outline">Coming next</span>
      </div>
    </div>
  );
}
