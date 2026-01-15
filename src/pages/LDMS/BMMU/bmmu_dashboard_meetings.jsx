// src/pages/LDMS/BMMU/bmmu_dashboard_meetings.jsx
import React from "react";

export default function Meetings() {
  // Hypothetical placeholder data
  const meetings = [
    {
      date: "12 Jan 2026",
      type: "Block Review Meeting",
      participants: 28,
      status: "Completed",
    },
    {
      date: "18 Jan 2026",
      type: "SHG Mobilization Meeting",
      participants: 42,
      status: "Completed",
    },
    {
      date: "25 Jan 2026",
      type: "Lakhpati Didi Progress Review",
      participants: 35,
      status: "Scheduled",
    },
    {
      date: "30 Jan 2026",
      type: "Convergence Planning Meeting",
      participants: 20,
      status: "Cancelled",
    },
  ];

  return (
    <div className="ldms-table-wrapper">
      <table className="ldms-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Meeting Type</th>
            <th>Participants</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((m, idx) => (
            <tr key={idx}>
              <td>{m.date}</td>
              <td>{m.type}</td>
              <td>{m.participants}</td>
              <td>
                <span className={`ldms-status-badge ${m.status.toLowerCase()}`}>
                  {m.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* -------- STYLES -------- */}
      <style>{`
        :root {
          --ldms-red: #c62828;
          --ldms-red-light: #fdecea;
          --ldms-border: #f1c0c0;
          --ldms-text-dark: #1f2937;
          --ldms-text-muted: #6b7280;
        }

        .ldms-table-wrapper {
          overflow-x: auto;
        }

        .ldms-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
          color: var(--ldms-text-dark);
        }

        .ldms-table th,
        .ldms-table td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }

        .ldms-table th {
          background: var(--ldms-red-light);
          color: var(--ldms-red);
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .ldms-table tr:hover td {
          background: #fff5f5;
        }

        /* Status badges */
        .ldms-status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .ldms-status-badge.completed {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .ldms-status-badge.scheduled {
          background: #e3f2fd;
          color: #1565c0;
        }

        .ldms-status-badge.cancelled {
          background: #fdecea;
          color: var(--ldms-red);
        }
      `}</style>
    </div>
  );
}
