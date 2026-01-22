// src/pages/LDMS/SMMU/smmu_dashboard_meetings.jsx
import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

/* ==================================================
   SMMU – MEETINGS ANALYTICS
   District (DLCC) → Block (BLCC)
================================================== */

export default function SmmuMeetings({
  districts = [],
  blocks = [],
  districtId,
  blockId,
}) {
  const [fy, setFy] = useState("2025-26");

  /* -----------------------------
     Hypothetical Monthly Data
  ----------------------------- */
  const DLCC_DATA = {
    "2025-26": [
      { month: "Apr", meetings: 5, moms: 2 },
      { month: "May", meetings: 7, moms: 4 },
      { month: "Jun", meetings: 6, moms: 3 },
      { month: "Jul", meetings: 8, moms: 5 },
      { month: "Aug", meetings: 9, moms: 6 },
      { month: "Sep", meetings: 7, moms: 4 },
      { month: "Oct", meetings: 10, moms: 6 },
      { month: "Nov", meetings: 8, moms: 5 },
      { month: "Dec", meetings: 6, moms: 3 },
    ],
    "2026-27": [
      { month: "Apr", meetings: 6, moms: 3 },
      { month: "May", meetings: 8, moms: 5 },
      { month: "Jun", meetings: 7, moms: 4 },
      { month: "Jul", meetings: 9, moms: 6 },
      { month: "Aug", meetings: 11, moms: 8 },
      { month: "Sep", meetings: 9, moms: 6 },
      { month: "Oct", meetings: 12, moms: 7 },
      { month: "Nov", meetings: 10, moms: 6 },
      { month: "Dec", meetings: 8, moms: 5 },
    ],
  };

  const BLCC_DATA = {
    "2025-26": [
      { month: "Apr", meetings: 1, moms: 1 },
      { month: "May", meetings: 2, moms: 1 },
      { month: "Jun", meetings: 1, moms: 0 },
      { month: "Jul", meetings: 2, moms: 1 },
      { month: "Aug", meetings: 3, moms: 2 },
      { month: "Sep", meetings: 2, moms: 1 },
      { month: "Oct", meetings: 3, moms: 2 },
      { month: "Nov", meetings: 2, moms: 1 },
      { month: "Dec", meetings: 1, moms: 1 },
    ],
    "2026-27": [
      { month: "Apr", meetings: 2, moms: 1 },
      { month: "May", meetings: 3, moms: 2 },
      { month: "Jun", meetings: 2, moms: 1 },
      { month: "Jul", meetings: 3, moms: 2 },
      { month: "Aug", meetings: 4, moms: 3 },
      { month: "Sep", meetings: 3, moms: 2 },
      { month: "Oct", meetings: 4, moms: 3 },
      { month: "Nov", meetings: 3, moms: 2 },
      { month: "Dec", meetings: 2, moms: 1 },
    ],
  };

  /* -----------------------------
     Decide Active Scope
  ----------------------------- */
  const scopeLabel = blockId
    ? "Block Level BLCC Meetings"
    : districtId
      ? "District Level DLCC Meetings"
      : "Select District to View Meetings";

  const chartData = useMemo(() => {
    if (!districtId) return [];
    return blockId ? BLCC_DATA[fy] : DLCC_DATA[fy];
  }, [districtId, blockId, fy]);

  return (
    <div className="ldms-meetings-analytics">
      {/* -------- HEADER -------- */}
      <div className="ldms-meetings-header">
        <h4>{scopeLabel}</h4>

        <div className="ldms-fy-wrapper">
          <span>FY</span>
          <select
            value={fy}
            onChange={(e) => setFy(e.target.value)}
            className="ldms-fy-select"
          >
            <option value="2025-26">2025–26</option>
            <option value="2026-27">2026–27</option>
          </select>
        </div>
      </div>

      {/* -------- CHART -------- */}
      {!districtId ? (
        <div className="empty-state">
          Please select a district to view meetings data.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />

            {/* Meetings */}
            <Bar dataKey="meetings" fill="#c62828" radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="meetings"
                position="top"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fill: "#400b0b",
                }}
              />
            </Bar>

            {/* MoMs */}
            <Bar dataKey="moms" fill="#f4b4b8" radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="moms"
                position="top"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fill: "#6b0f0f",
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* -------- STYLES -------- */}
      <style>{`
        .ldms-meetings-analytics {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ldms-meetings-header {
          display: flex;
          align-items: center;
        }

        .ldms-meetings-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #c62828;
        }

        .ldms-fy-wrapper {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ldms-fy-wrapper span {
          font-size: 12px;
          font-weight: 600;
        }

        .ldms-fy-select {
          border: 1px solid #f1c0c0;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 6px;
          height: 26px;
        }

        .empty-state {
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
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
