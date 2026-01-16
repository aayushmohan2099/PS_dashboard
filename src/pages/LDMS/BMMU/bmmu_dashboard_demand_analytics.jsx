// src/pages/LDMS/BMMU/bmmu_dashboard_demand_analytics.jsx
import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
} from "recharts";

/**
 * BMMU – Demand Analytics (Hypothetical)
 * Theme: White + Red (LDMS)
 */

export default function DemandAnalytics() {
  /* ---------------------------
     Survey Year Selectors
  --------------------------- */
  const [vprpYear, setVprpYear] = useState("2024");
  const [aepYear, setAepYear] = useState("2024");

  const surveyYears = ["2022", "2023", "2024"];

  /* ---------------------------
     PIE: PLD Registration Status
     (Better colors + spacing)
  --------------------------- */
  const pieData = [
    { name: "Enrolled under AEP", value: 34 },
    { name: "Enrolled under VPRP", value: 46 },
    { name: "Not enrolled in any Plan", value: 20 },
  ];

  const PIE_COLORS = ["#b71c1c", "#298f29", "#130103"];

  /* ---------------------------
     BAR: VPRP (Percentages)
  --------------------------- */
  const vprpBarData = useMemo(
    () => [
      { name: "Livelihood Support", count: 82 },
      { name: "Skill Training", count: 68 },
      { name: "Credit Linkage", count: 54 },
      { name: "Market Access", count: 46 },
      { name: "Govt Scheme Mapping", count: 61 },
    ],
    [vprpYear]
  );

  /* ---------------------------
     BAR: AEP (Percentages)
  --------------------------- */
  const aepBarData = useMemo(
    () => [
      { name: "Agri Enterprise", count: 78 },
      { name: "Dairy & Livestock", count: 64 },
      { name: "Handicraft", count: 52 },
      { name: "Food Processing", count: 59 },
      { name: "Retail & Trade", count: 71 },
    ],
    [aepYear]
  );

  return (
    <div className="ldms-analytics">
      {/* ================= PIE ================= */}
      <div className="ldms-chart-card">
        <h4>PLD Enrollment Status (%)</h4>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="45%"
              cy="50%"
              outerRadius={100}
              label={({ value }) => `${value}%`}
            >
              {pieData.map((_, index) => (
                <Cell key={index} fill={PIE_COLORS[index]} />
              ))}
            </Pie>

            <Tooltip formatter={(v) => `${v}%`} />
            <Legend align="right" />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ================= BAR SECTION ================= */}
      <div className="ldms-bar-grid">
        {/* -------- VPRP -------- */}
        <div className="ldms-chart-card">
          <div className="chart-header">
            <h4>VPRP Demand Analytics (%)</h4>

            <div className="year-select">
              <span>Survey Year:</span>
              <select
                value={vprpYear}
                onChange={(e) => setVprpYear(e.target.value)}
              >
                {surveyYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={vprpBarData} barCategoryGap={28}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="count" fill="#c62828" barSize={24}>
                <LabelList
                  dataKey="count"
                  position="top"
                  formatter={(v) => `${v}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* -------- AEP -------- */}
        <div className="ldms-chart-card">
          <div className="chart-header">
            <h4>AEP Demand Analytics (%)</h4>

            <div className="year-select">
              <span>Survey Year:</span>
              <select
                value={aepYear}
                onChange={(e) => setAepYear(e.target.value)}
              >
                {surveyYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={aepBarData} barCategoryGap={28}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="count" fill="#c62828" barSize={24}>
                <LabelList
                  dataKey="count"
                  position="top"
                  formatter={(v) => `${v}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .ldms-analytics {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .ldms-bar-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .ldms-chart-card {
          background: #ffffff;
          border: 1px solid #f1c0c0;
          border-radius: 12px;
          padding: 16px 18px;
        }

        .ldms-chart-card h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #c62828;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .year-select {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #8b1d1d;
          font-weight: 600;
        }

        select {
          padding: 4px 8px;
          font-size: 12px;
          border-radius: 6px;
          border: 1px solid #f1c0c0;
          color: #8b1d1d;
          background: #ffffff;
          cursor: pointer;
        }

        @media (max-width: 1024px) {
          .ldms-bar-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
