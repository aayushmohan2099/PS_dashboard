// src/pages/LDMS/DMMU/dmmu_ldms_dashboard.jsx
import React, { useState } from "react";
import DmmuBlockMap from "./dmmu_dashboard_blk_map";
import BlockMap from "../BMMU/bmmu_dashboard_blk_map";
import Meetings from "../BMMU/bmmu_dashboard_meetings";
import DemandAnalytics from "../DMMU/dmmu_dashboard_demand_analytics";
import SupportBenefitExt from "../DMMU/dmmu_dashboard_support_benefit_ext";

/* ==================================================
   DMMU – DISTRICT → BLOCK → VILLAGE DRILLDOWN
================================================== */

export default function DmmuLdmsDashboard() {
  /* ---------------- STATE ---------------- */
  const [blockId, setBlockId] = useState(null);

  /* ---------------- HANDLERS ---------------- */
  const openBlock = (id) => setBlockId(id);
  const backToDistrict = () => setBlockId(null);

  /* ---------------- RENDER ---------------- */
  return (
    <div className="dmmu-ldms-dashboard">
      {/* ==================================================
         CARD 1 – DISTRICT / BLOCK MAP
      ================================================== */}
      <div className="ldms-grid-row one-col">
        <div className="ldms-card">
          <div className="header-bar">
            {blockId ? (
              <button className="back-btn" onClick={backToDistrict}>
                ← Back to District
              </button>
            ) : (
              <h3>District-wise Analytics (Block View)</h3>
            )}
          </div>

          {!blockId && <DmmuBlockMap onBlockSelect={openBlock} />}
          {blockId && <BlockMap blockId={blockId} />}
        </div>
      </div>

      {/* ==================================================
         CARD 2 – MEETINGS
      ================================================== */}
      <div className="ldms-grid-row one-col">
        <div className="ldms-card">
          <h3>DLCC Meetings</h3>
          <Meetings />
        </div>
      </div>

      {/* ==================================================
         CARD 3 – DEMAND ANALYTICS
      ================================================== */}
      <div className="ldms-grid-row one-col">
        <div className="ldms-card">
          <h3>Demand Analytics</h3>
          <DemandAnalytics />
        </div>
      </div>

      {/* ==================================================
         CARD 4 – SUPPORT / BENEFIT COVERAGE
      ================================================== */}
      <div className="ldms-grid-row one-col">
        <div className="ldms-card">
          <h3>Support Benefit Coverage</h3>
          <SupportBenefitExt />
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .dmmu-ldms-dashboard {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ldms-card {
          background: #ffffff;
          border: 2px solid #ce0000b0;
          box-shadow: 0 8px 35px rgba(163, 19, 19, 0.25);
          border-radius: 12px;
          padding: 12px;
          min-height: 220px;
        }

        .header-bar {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }

        .ldms-card h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 700;
          color: #400b0b;
        }

        .back-btn {
          background: transparent;
          border: none;
          font-weight: 700;
          color: #8b1d1d;
          cursor: pointer;
          font-size: 14px;
        }

        .back-btn:hover {
          text-decoration: underline;
        }

        .placeholder {
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: #9b1c1c;
          background: #fff5f5;
          border: 1px dashed #e5b3b3;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
