// src/pages/LDMS/DMMU/dmmu_dashboard_meetings.jsx
import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Meetings() {
  const [fy, setFy] = useState("2025-26");

  // -----------------------------
  // Hypothetical Data (FY-wise)
  // -----------------------------
  const DATA = {
    "2025-26": [
      { month: "Apr", meetings: 6, moms: 1 },
      { month: "May", meetings: 8, moms: 7 },
      { month: "Jun", meetings: 7, moms: 0 },
      { month: "Jul", meetings: 9, moms: 3 },
      { month: "Aug", meetings: 10, moms: 4 },
      { month: "Sep", meetings: 8, moms: 7 },
      { month: "Oct", meetings: 11, moms: 1 },
      { month: "Nov", meetings: 9, moms: 6 },
      { month: "Dec", meetings: 7, moms: 3 },
    ],
    "2026-27": [
      { month: "Apr", meetings: 7, moms: 2 },
      { month: "May", meetings: 9, moms: 4 },
      { month: "Jun", meetings: 8, moms: 1 },
      { month: "Jul", meetings: 10, moms: 4 },
      { month: "Aug", meetings: 12, moms: 9 },
      { month: "Sep", meetings: 10, moms: 4 },
      { month: "Oct", meetings: 13, moms: 3 },
      { month: "Nov", meetings: 11, moms: 1 },
      { month: "Dec", meetings: 9, moms: 5 },
    ],
  };

  return (
    <div className="ldms-meetings-analytics">
      {/* -------- HEADER -------- */}
      <div className="ldms-meetings-header">
        <div className="ldms-fy-wrapper">
          <span>Financial Year</span>
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
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={DATA[fy]}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="meetings"
            name="Meetings Held"
            fill="#c62828"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="moms"
            name="MoMs Uploaded"
            fill="#ffcdd2"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* -------- STYLES -------- */}
      <style>{`
        :root {
          --ldms-red: #c62828;
          --ldms-red-light: #fdecea;
          --ldms-border: #f1c0c0;
          --ldms-text-dark: #1f2937;
          --ldms-text-muted: #6b7280;
        }

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
          color: var(--ldms-red);
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
          color: var(--ldms-text-dark);
          white-space: nowrap;
        }

        .ldms-fy-select {
          border: 1px solid var(--ldms-border);
          background: #ffffff;
          color: var(--ldms-text-dark);
          font-size: 12px;
          padding: 2px 6px;           /* compact */
          border-radius: 6px;
          cursor: pointer;
          height: 26px;
        }

        .ldms-fy-select:focus {
          outline: none;
          border-color: var(--ldms-red);
        }
      `}</style>
    </div>
  );
}

/* -----------------------------
   Custom Tooltip (Smooth)
------------------------------ */
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const meetings = payload.find((p) => p.dataKey === "meetings")?.value ?? 0;
    const moms = payload.find((p) => p.dataKey === "moms")?.value ?? 0;

    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #f1c0c0",
          borderRadius: 8,
          padding: "8px 10px",
          fontSize: 12,
          boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
          transition: "all 0.2s ease",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div>
          Meetings held: <strong>{meetings}</strong>
        </div>
        <div>
          MoMs uploaded: <strong>{moms}</strong>
        </div>
      </div>
    );
  }

  return null;
}
