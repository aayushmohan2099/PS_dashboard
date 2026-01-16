// src/pages/LDMS/BMMU/bmmu_dashboard_support_benefit_ext.jsx
// src/pages/LDMS/BMMU/bmmu_dashboard_support_benefit_ext.jsx
import React, { useMemo, useState } from "react";
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
  BarChart,
  Bar,
  LabelList,
} from "recharts";

/**
 * BMMU – Support & Benefit Extension (Hypothetical)
 * Theme: White + Red
 */

export default function SupportBenefitExt() {
  /* ---------------------------
     Constants
  --------------------------- */
  const SUPPORT_TYPES = [
    "Subsidy",
    "Grant",
    "Credit Linkages",
    "Trainings",
    "Raw Materials",
    "Infrastructure",
  ];

  const DEPARTMENTS = [
    "Rural Development",
    "Agriculture",
    "Animal Husbandry",
    "MSME",
    "Horticulture",
    "Skill Development",
    "Women & Child Welfare",
  ];

  const SCHEMES = [
    "UPSRLM Subsidy Scheme",
    "Mukhyamantri Swarozgar Yojana",
    "NRLM Credit Support",
    "State Infrastructure Aid",
    "Rural Enterprise Grant",
  ];

  const TRAININGS = [
    "Enterprise Development Training",
    "Financial Literacy Module",
    "Agri Business Training",
    "Skill Upgradation Program",
    "Market Readiness Workshop",
  ];

  /* ---------------------------
     Department Selector
  --------------------------- */
  const [department, setDepartment] = useState(DEPARTMENTS[0]);

  /* ---------------------------
     PIE: Needs vs Support
  --------------------------- */
  const pieData = [
    { name: "Subsidy", value: 22 },
    { name: "Grant", value: 18 },
    { name: "Credit Linkages", value: 20 },
    { name: "Trainings", value: 16 },
    { name: "Raw Materials", value: 14 },
    { name: "Infrastructure", value: 10 },
  ];

  const PIE_COLORS = [
    "#b71c1c",
    "#000000",
    "#075025",
    "#ff8a80",
    "#ffcdd2",
    "#81c784",
  ];

  /* ---------------------------
     AREA: Department-wise %
  --------------------------- */
  const areaData = useMemo(
    () =>
      DEPARTMENTS.map((d, i) => ({
        department: d,
        percentage: Math.floor(20 + ((i * 33) % 53)), // max 53%
      })),
    []
  );

  /* ---------------------------
     BAR: Support Type % (Dept-wise)
  --------------------------- */
  const barData = useMemo(
    () =>
      SUPPORT_TYPES.map((s, i) => ({
        name: s,
        value: Math.floor(18 + ((i * 29) % 53)),
      })),
    [department]
  );

  /* ---------------------------
     TABLE DATA
  --------------------------- */
  const tableData = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => {
      const type = SUPPORT_TYPES[i % SUPPORT_TYPES.length];
      const isTraining = type === "Trainings";

      return {
        sn: i + 1,
        type,
        scheme: isTraining
          ? TRAININGS[i % TRAININGS.length]
          : SCHEMES[i % SCHEMES.length],
        amount: Math.floor(20000 + ((i * 13789) % 80000)),
        plan: i % 2 === 0 ? "AEP" : "VPRP",
      };
    });
  }, []);

  const totalAmount = tableData.reduce((a, b) => a + b.amount, 0);

  return (
    <div className="ldms-support-analytics">
      {/* ================= PIE ================= */}
      <div className="ldms-chart-card">
        <h4>Needs vs Support Extension</h4>

        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="45%"
              cy="50%"
              outerRadius={120}
              label={({ value }) => `${value}%`}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} />
            <Legend align="right" />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* ================= AREA ================= */}
      <div className="ldms-chart-card">
        <h4>Department-wise Support Coverage (%)</h4>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={areaData}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c62828" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#c62828" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Area
              type="monotone"
              dataKey="percentage"
              stroke="#c62828"
              fill="url(#areaGrad)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ================= BAR + TABLE ================= */}
      <div className="ldms-bottom-grid">
        {/* -------- BAR -------- */}
        <div className="ldms-chart-card">
          <div className="chart-header">
            <h4>Support Type Distribution (%)</h4>

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} barCategoryGap={26}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="value" fill="#c62828" barSize={26}>
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v) => `${v}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* -------- TABLE -------- */}
        <div className="ldms-chart-card">
          <h4>Support Benefit Details</h4>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Support Type</th>
                  <th>Scheme / Training Module</th>
                  <th>Benefit Amount (₹)</th>
                  <th>Plan</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((r) => (
                  <tr key={r.sn}>
                    <td>{r.sn}</td>
                    <td>{r.type}</td>
                    <td>{r.scheme}</td>
                    <td>{r.amount.toLocaleString()}</td>
                    <td>{r.plan}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3">Total</td>
                  <td colSpan="2">₹ {totalAmount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .ldms-support-analytics {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .ldms-bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .ldms-chart-card {
          background: #ffffff;
          border: 1px solid #f1c0c0;
          border-radius: 12px;
          padding: 14px 16px;
        }

        .ldms-chart-card h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 700;
          color: #c62828;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        select {
          padding: 4px 8px;
          font-size: 12px;
          border-radius: 6px;
          border: 1px solid #f1c0c0;
          color: #8b1d1d;
          background: #ffffff;
        }

        .table-wrap {
          max-height: 420px;
          overflow-y: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        /* 🔴 FIXED HEADER OVERRIDE */
        .table-wrap thead th {
          background: #c62828;
          color: #ffffff;
          padding: 10px 8px;
          font-weight: 700;
        }

        td {
          padding: 8px;
          border-bottom: 1px solid #e5e7eb;
        }

        tfoot {
          position: sticky;
          bottom: 0;
          background: #fdecea;
          font-weight: 700;
        }

        @media (max-width: 1024px) {
          .ldms-bottom-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
