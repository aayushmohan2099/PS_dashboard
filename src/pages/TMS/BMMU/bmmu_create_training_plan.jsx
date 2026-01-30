// src/pages/TMS/BMMU/bmmu_create_training_plan.jsx
import React, { useEffect, useState, useRef, useContext } from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../layout/tms_TopNav";

export default function BmmuCreateTrainingPlanPlaceholder() {
  const [navCollapsed, setNavCollapsed] = useState(false);
  return (
    <div className="app-shell">
      <LeftNav
        collapsed={navCollapsed}
        onToggle={() => setNavCollapsed((v) => !v)}
      />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu — Propose Training Plan
            </div>
          }
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 900, margin: "20px auto" }}>
            <div style={{ background: "#fff", padding: 18, borderRadius: 8 }}>
              <h2>Propose Training Plan</h2>
              <p className="muted">
                Placeholder: page to propose a new training plan. Implement the
                form here later.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
