// src/pages/LDMS/BMMU/bmmu_dashboard_support_benefit_ext.jsx
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function SupportBenefitExt() {
  // -----------------------------
  // Hypothetical / Random Data
  // -----------------------------

  const pieData = [
    { name: "Financial Support", value: 280 },
    { name: "Asset Support", value: 190 },
    { name: "Training Support", value: 240 },
    { name: "Market Linkage", value: 160 },
  ];

  const areaData = [
    { month: "Jan", benefits: 90 },
    { month: "Feb", benefits: 130 },
    { month: "Mar", benefits: 180 },
    { month: "Apr", benefits: 220 },
    { month: "May", benefits: 260 },
  ];

  const COLORS = ["#c62828", "#ef5350", "#ff8a80", "#ffcdd2"];

  return (
    <div className="ldms-support-analytics">
      {/* ---------------- PIE CHART ---------------- */}
      <div className="ldms-chart-card">
        <h4>Support Type Distribution</h4>

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

      {/* ---------------- AREA CHART ---------------- */}
      <div className="ldms-chart-card">
        <h4>Monthly Benefit Extension</h4>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={areaData}>
            <defs>
              <linearGradient id="benefitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c62828" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#c62828" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend align="right" verticalAlign="top" />
            <Area
              type="monotone"
              dataKey="benefits"
              stroke="#c62828"
              fill="url(#benefitGradient)"
              strokeWidth={2}
            />
          </AreaChart>
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

        .ldms-support-analytics {
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
