import React, { useState } from "react";
import { Outlet } from "react-router-dom";

import LdmsLeftNav from "./ldms_leftnav";
import LdmsHeader from "./ldms_header";
import LdmsFooter from "./ldms_footer";

export default function LdmsLayout() {
  const [navCollapsed, setNavCollapsed] = useState(false);

  return (
    <div className="ldms-app-shell">
      {/* ---------------- HEADER ---------------- */}
      <LdmsHeader />

      {/* ---------------- BODY ---------------- */}
      <div className="ldms-body">
        {/* LEFT NAV */}
        <LdmsLeftNav
          collapsed={navCollapsed}
          onToggle={() => setNavCollapsed((v) => !v)}
        />

        {/* MAIN / HERO */}
        <main className="ldms-main">
          <div className="ldms-hero">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ---------------- FOOTER ---------------- */}
      <LdmsFooter />

      {/* ---------------- STYLES ---------------- */}
      <style>{`
        /* App shell */
        .ldms-app-shell {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f8fafc;
          overflow: hidden;
        }

        /* Body */
        .ldms-body {
          display: flex;
          flex: 1;
          min-height: 0; /* CRITICAL: prevents header overlap */
        }

        /* Main content */
        .ldms-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
          background: #ffffff;
        }

        .ldms-hero {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          background: #ffffff;
        }
      `}</style>
    </div>
  );
}
