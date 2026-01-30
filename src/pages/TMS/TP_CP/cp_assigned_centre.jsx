// src/pages/TMS/TP_CP/cp_assigned_centre.jsx
import React, { useContext, useEffect, useState } from "react";
import TmsLeftNav from "../layout/tms_LeftNav";
import TopNav from "../layout/tms_TopNav";

export default function CpAssignedCentre() {
  const [navCollapsed, setNavCollapsed] = useState(false);
  return (
    <div className="app-shell">
      <TmsLeftNav
        collapsed={navCollapsed}
        onToggle={() => setNavCollapsed((v) => !v)}
      />
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
