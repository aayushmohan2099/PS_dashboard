// src/pages/TMS/TRs/training_batch_list.jsx
import React from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";

export default function TrainingBatchList() {
  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">Pragati Setu — Training Batches</div>
          }
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "20px auto" }}>
            <div style={{ background: "#fff", padding: 18, borderRadius: 8 }}>
              <h2>Training Batches</h2>
              <p className="muted">
                Placeholder — batches list will appear here. Navigate from a
                Training Request's "View Batches" button.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
