// src/pages/LDMS/Report/ldms_reports.jsx
import React, { useState } from "react";
import ReportHeader from "./report_header";
import ReportBody from "./report_body";
import ExportReport from "./export_report";

export default function LdmsReports() {
  const [filters, setFilters] = React.useState({});

  return (
    <div className="bmmu-ldms-dashboard">
      {/* Row 1 */}
      <div className="ldms-grid-row one-col">
        <div className="ldms-card">
          <h3>Report Filters / Constraints</h3>
          <ReportHeader onFetch={setFilters} />
        </div>
      </div>

      {/* Row 2 */}
      <div className="ldms-grid-row one-col">
        <div className="ldms-card">
          <h3>Report Table</h3>
          <ReportBody filters={filters} />
        </div>

        {/* Export Button */}
        <ExportReport filters={filters} />
      </div>

      {/* ---- styles ---- */}
      <style>{`
        .bmmu-ldms-dashboard {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ldms-grid-row {
          display: grid;
          gap: 16px;
        }

        .ldms-grid-row.two-col {
          grid-template-columns: 1fr 1fr;
        }

        .ldms-grid-row.one-col {
          grid-template-columns: 1fr;
        }

        .ldms-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px;
          min-height: 220px;
          overflow-x: hidden;                 
        }

        .ldms-card h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 700;
          color: #400b0b;
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
