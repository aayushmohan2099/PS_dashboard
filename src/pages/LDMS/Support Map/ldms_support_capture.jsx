// src/pages/LDMS/Support Map/ldms_support_capture.jsx
import React from "react";

export default function SupportCapture() {
  return (
    <div className="bmmu-ldms-dashboard">
      {/* Row 1 */}
      <div className="ldms-grid-row two-col">
        <div className="ldms-card">
          <h3>Support Capture Header</h3>
          {/* <SCHeader /> */}
        </div>
        <div className="ldms-card">
          <h3>Support Capture Records</h3>
          {/* <SCRecor /> */}
        </div>
      </div>

      {/* Row 2 */}
      <div className="ldms-grid-row two-col">
        <div className="ldms-card">
          <h3>Support Capture Department Scheme</h3>
          {/* <SCDepSche /> */}
        </div>
        <div className="ldms-card">
          <h3>Support Capture PLDs</h3>
          {/* <SCPLDs /> */}
        </div>
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
        }

        .ldms-card h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 700;
          color: #0b2540;
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
