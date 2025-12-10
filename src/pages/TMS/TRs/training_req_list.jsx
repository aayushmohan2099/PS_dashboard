// src/pages/TMS/TRs/training_req_list.jsx
import React from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";

export default function TrainingRequestListPlaceholder() {
  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav left={<div className="app-title">Pragati Setu — Training Requests</div>} />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "20px auto" }}>
            <div style={{ background: "#fff", padding: 18, borderRadius: 8 }}>
              <h2>Training Requests</h2>
              <p className="muted">Placeholder list of training requests. Replace with your list / table component.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
