// dmmu_ldms_dashboard.jsx
import React from "react";
import DmmuBlockMap from "./dmmu_dashboard_blk_map";

export default function DmmuLdmsDashboard() {
  return (
    <div className="dmmu-ldms-dashboard">
      {/* ================= ROW 1 ================= */}
      <div className="ldms-grid-row one-col">
        <div className="ldms-card">
          <h3>Block-wise Analytics (District View)</h3>
          <DmmuBlockMap />
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .dmmu-ldms-dashboard {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ldms-grid-row {
          display: grid;
          gap: 16px;
        }

        .ldms-grid-row.two-col {
          grid-template-columns: 1.2fr 1fr;
        }

        .ldms-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px;
          min-height: 520px;
        }

        .ldms-card h3 {
          margin: 0 0 10px 0;
          font-size: 20px;
          font-weight: 700;
          color: #0b2540;
        }

        @media (max-width: 1024px) {
          .ldms-grid-row.two-col {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
