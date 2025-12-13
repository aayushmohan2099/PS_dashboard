// src/pages/TMS/MT/mt_dashboard.jsx
import React from "react";

export default function MtDashboard() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h2>Master Trainer Dashboard</h2>

      <div className="muted" style={{ marginBottom: 16 }}>
        View assigned batches, training schedules and attendance
        responsibilities.
      </div>

      <div className="card">
        <h4>Assigned Batches</h4>
        <p className="muted">
          Batches where you are mapped as Master Trainer will appear here.
        </p>
        <span className="badge badge-outline">Coming next</span>
      </div>
    </div>
  );
}
