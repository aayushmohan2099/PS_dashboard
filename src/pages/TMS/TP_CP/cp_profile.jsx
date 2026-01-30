// src/pages/TMS/TP_CP/cp_profile.jsx
import React, { useContext, useEffect, useState } from "react";
import TopNav from "../layout/tms_TopNav";
import LeftNav from "../layout/tms_LeftNav";

export default function CpProfile() {
  const [navCollapsed, setNavCollapsed] = useState(false);
  return (
    <div className="app-shell">
      <LeftNav
        collapsed={navCollapsed}
        onToggle={() => setNavCollapsed((v) => !v)}
      />
      <div className="main-area">
        <TopNav />
        <main style={{ padding: 18 }}>
          <h2>Contact Person – My Profile</h2>
          <p>
            This is a placeholder page for CP profile. Implement details here.
          </p>
        </main>
      </div>
    </div>
  );
}
