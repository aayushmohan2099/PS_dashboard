// src/pages/TMS/SMMU/smmu_tms_dashboard.jsx
import React from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";

export default function SmmuTmsDashboard() {
  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav left={<div className="app-title">Pragati Setu — TMS (SMMU)</div>} />
        <main className="dashboard-main" style={{ padding: 18 }}>
          <div className="card">
            <h1>SMMU — Training Management</h1>
            <p className="muted">Placeholder dashboard for SMMU users. Replace with state-level TMS widgets (state KPIs, bulk actions).</p>
          </div>
        </main>
      </div>
    </div>
  );
}
