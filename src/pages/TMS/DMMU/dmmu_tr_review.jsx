// src/pages/TMS/DMMU/dmmu_tr_review.jsx
import React from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";

export default function DmmuTrReviewPlaceholder() {
  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={<div className="app-title">Pragati Setu — DMMU TR Review</div>}
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "20px auto" }}>
            <div style={{ background: "#fff", padding: 18, borderRadius: 8 }}>
              <h2>DMMU — Training Request Review</h2>
              <p className="muted">
                Placeholder for DMMU TR review workflow. This route should be
                used for handling PENDING training requests.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
