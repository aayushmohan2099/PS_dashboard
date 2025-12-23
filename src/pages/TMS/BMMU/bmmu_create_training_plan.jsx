// src/pages/TMS/BMMU/bmmu_create_training_plan.jsx
import React from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";

export default function BmmuCreateTrainingPlanPlaceholder() {
  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav left={<div className="app-title">Pragati Setu — Propose Training Plan</div>} />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 900, margin: "20px auto" }}>
            <div style={{ background: "#fff", padding: 18, borderRadius: 8 }}>
              <h2>Propose Training Plan</h2>
              <p className="muted">Placeholder: page to propose a new training plan. Implement the form here later.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
