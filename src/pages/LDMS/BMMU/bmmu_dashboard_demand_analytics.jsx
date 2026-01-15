// src/pages/LDMS/BMMU/bmmu_dashboard_demand_analytics.jsx
import React from "react";
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
} from "recharts";

export default function DemandAnalytics() {
  // -----------------------------
  // Hypothetical / Random Data
  // -----------------------------

  const pieData = [
    { name: "Livelihood Support", value: 320 },
    { name: "Skill Training", value: 210 },
    { name: "Credit Linkage", value: 180 },
    { name: "Market Access", value: 140 },
  ];

  const barData = [
    { category: "Jan", demands: 120 },
    { category: "Feb", demands: 180 },
    { category: "Mar", demands: 260 },
    { category: "Apr", demands: 220 },
    { category: "May", demands: 300 },
  ];

  const COLORS = ["#c62828", "#ef5350", "#ff8a80", "#ffcdd2"];

  return (
    <div className="ldms-analytics">
      {/* ---------------- PIE CHART ---------------- */}
      <div className="ldms-chart-card">
        <h4>Demand Distribution</h4>

        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="40%"
              cy="50%"
              outerRadius={80}
              label
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip />
            <Legend layout="vertical" align="right" verticalAlign="middle" />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ---------------- BAR CHART ---------------- */}
      <div className="ldms-chart-card">
        <h4>Monthly Demand Trend</h4>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Legend align="right" verticalAlign="top" />
            <Bar dataKey="demands" fill="#c62828" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ---------------- STYLES ---------------- */}
      <style>{`
        :root {
          --ldms-red: #c62828;
          --ldms-red-light: #fdecea;
          --ldms-border: #f1c0c0;
          --ldms-text-dark: #1f2937;
        }

        .ldms-analytics {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ldms-chart-card {
          background: #ffffff;
          border: 1px solid var(--ldms-border);
          border-radius: 10px;
          padding: 12px 16px;
        }

        .ldms-chart-card h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 700;
          color: var(--ldms-red);
        }
      `}</style>
    </div>
  );
}
