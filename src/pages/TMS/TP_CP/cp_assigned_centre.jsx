// src/pages/TMS/TP_CP/cp_assigned_centre.jsx
import React from "react";
import TmsLeftNav from "../layout/tms_LeftNav";
import TopNav from "../../../components/layout/TopNav";

export default function CpAssignedCentre() {
  return (
    <div className="app-shell">
      <TmsLeftNav />
      <div className="main-area">
        <TopNav />
        <main style={{ padding: 18 }}>
          <h2>Contact Person – Centre Details</h2>
          <p>
            This is a placeholder page for assigned centre details. Implement
            centre view here.
          </p>
        </main>
      </div>
    </div>
  );
}
