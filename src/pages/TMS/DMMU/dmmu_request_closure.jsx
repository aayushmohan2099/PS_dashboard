// src/pages/TMS/DMMU/dmmu_request_closure.jsx
import React from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";

export default function DmmuRequestClosurePlaceholder() {
  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">Pragati Setu — DMMU Request Closure</div>
          }
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "20px auto" }}>
            <div style={{ background: "#fff", padding: 18, borderRadius: 8 }}>
              <h2>DMMU — Request Closure</h2>
              <p className="muted">
                Placeholder for DMMU request closure screen (for REVIEW -
                closure).
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
