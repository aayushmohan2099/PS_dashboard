// src/pages/TMS/BMMU/bmmu_tms_dashboard.jsx
import React from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";

export default function BmmuTmsDashboard() {
  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav left={<div className="app-title">Pragati Setu — TMS (BMMU)</div>} />
        <main className="dashboard-main" style={{ padding: 18 }}>
          <div className="card">
            <h1>BMMU — Training Management</h1>
            <p className="muted">Placeholder dashboard for BMMU users. Replace with actual widgets (batches, trainers, pending approvals).</p>
          </div>
        </main>
      </div>
    </div>
  );
}
