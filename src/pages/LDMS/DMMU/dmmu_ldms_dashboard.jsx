// src/pages/LDMS/DMMU/dmmu_ldms_dashboard.jsx
import React, { useState } from "react";
import DmmuBlockMap from "./dmmu_dashboard_blk_map";
import BlockMap from "../BMMU/bmmu_dashboard_blk_map";

/* ==================================================
   DMMU – DISTRICT → BLOCK → VILLAGE DRILLDOWN
================================================== */

export default function DmmuLdmsDashboard() {
  /* ---------------- STATE ---------------- */
  const [blockId, setBlockId] = useState(null);

  /* ---------------- HANDLERS ---------------- */
  const openBlock = (id) => {
    setBlockId(id);
  };

  const backToDistrict = () => {
    setBlockId(null);
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="dmmu-ldms-dashboard">
      <div className="ldms-card">
        {/* ================= HEADER ================= */}
        <div className="header-bar">
          {blockId ? (
            <button className="back-btn" onClick={backToDistrict}>
              ← Back to District
            </button>
          ) : (
            <h3>District-wise Analytics (Block View)</h3>
          )}
        </div>

        {/* ================= CONTENT ================= */}
        {!blockId && <DmmuBlockMap onBlockSelect={openBlock} />}

        {blockId && <BlockMap blockId={blockId} />}
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
          min-height: 600px;
        }

        .header-bar {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }

        .header-bar h3 {
          margin: 0;
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
      `}</style>
    </div>
  );
}
