// src/pages/LDMS/SMMU/smmu_dashboard_demand_fulfill.jsx
import React, { useEffect, useMemo, useState } from "react";
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
import { LDMS_API } from "../../../api/axios";

/* ==================================================
   SMMU – STATE LEVEL DEMAND ANALYTICS
   Department → Schemes
================================================== */

export default function SmmuDemandAnalytics() {
  /* ---------------- STATE ---------------- */
  const [departments, setDepartments] = useState([]);
  const [schemes, setSchemes] = useState([]);

  const [selectedDept, setSelectedDept] = useState(null);
  const [fy, setFy] = useState("2024-25");

  const surveyYears = ["2022-23", "2023-24", "2024-25"];

  /* ---------------- LOAD DEPARTMENTS ---------------- */
  useEffect(() => {
    LDMS_API.departments()
      .then((res) => setDepartments(res?.data?.results || []))
      .catch(() => setDepartments([]));
  }, []);

  /* ---------------- LOAD SCHEMES BY DEPARTMENT ---------------- */
  useEffect(() => {
    if (!selectedDept) {
      setSchemes([]);
      return;
    }

    LDMS_API.schemes({ department: selectedDept })
      .then((res) => setSchemes(res?.data?.results || []))
      .catch(() => setSchemes([]));
  }, [selectedDept]);

  /* ---------------- PIE DATA (SCHEME-WISE) ---------------- */
  const pieData = useMemo(() => {
    if (!schemes.length) return [];

    // hypothetical distribution
    return schemes.map((s, i) => ({
      name: s.name,
      value: 10 + ((i * 7) % 30), // deterministic fake %
    }));
  }, [schemes]);

  const PIE_COLORS = [
    "#b71c1c",
    "#2e7d32",
    "#283593",
    "#6a1b9a",
    "#ef6c00",
    "#00838f",
  ];

  /* ---------------- BAR DATA (ALL DEPARTMENTS) ---------------- */
  const barData = useMemo(() => {
    return departments.map((d, i) => ({
      name: d.name,
      value: 45 + ((i * 11) % 40), // hypothetical %
    }));
  }, [departments, fy]);

  return (
    <div className="ldms-analytics">
      {/* ================= PIE ================= */}
      <div className="ldms-chart-card">
        <div className="chart-header">
          <h4>Department-wise Scheme Support (%)</h4>

          <select
            value={selectedDept || ""}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {!selectedDept ? (
          <div className="empty-state">Select a department to view schemes</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="45%"
                cy="50%"
                outerRadius={110}
                label={({ value }) => `${value}%`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>

              <Tooltip formatter={(v) => `${v}%`} />
              <Legend align="right" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ================= BAR ================= */}
      <div className="ldms-chart-card">
        <div className="chart-header">
          <h4>Department-wise Support Coverage (%)</h4>

          <div className="year-select">
            <span>FY:</span>
            <select value={fy} onChange={(e) => setFy(e.target.value)}>
              {surveyYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={barData} barCategoryGap={30}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="value" fill="#c62828" barSize={28}>
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v) => `${v}%`}
                style={{ fontSize: 11, fontWeight: 700, fill: "#400b0b" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .ldms-analytics {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .ldms-chart-card {
          background: #ffffff;
          border: 1px solid #f1c0c0;
          border-radius: 12px;
          padding: 16px 18px;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #c62828;
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

        .year-select {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #8b1d1d;
        }

        .empty-state {
          height: 240px;
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
