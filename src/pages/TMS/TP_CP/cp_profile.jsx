// src/pages/TMS/TP_CP/cp_profile.jsx
import React from "react";
import TopNav from "../../../components/layout/TopNav";
import LeftNav from "../layout/tms_LeftNav";

export default function CpProfile() {
  return (
    <div className="app-shell">
      <LeftNav />
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
