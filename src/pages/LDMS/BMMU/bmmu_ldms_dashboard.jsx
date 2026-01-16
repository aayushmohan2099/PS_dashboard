// bmmu_ldms_dashboard.jsx
import React from "react";

import BlockMap from "./bmmu_dashboard_blk_map";
import Meetings from "./bmmu_dashboard_meetings";
import DemandAnalytics from "./bmmu_dashboard_demand_analytics";
import SupportBenefitExt from "./bmmu_dashboard_support_benefit_ext";

export default function BmmuLdmsDashboard() {
  return (
    <div className="bmmu-ldms-dashboard">
      {/* Row 1 */}
      <div className="ldms-grid-row one-col">
        <div className="ldms-card">
          <h3>Village Level Analytics</h3>
          <BlockMap />
        </div>
      </div>

      {/* Row 2 */}
      <div className="ldms-grid-row one-col">
        <div className="ldms-card">
          <h3>BLCC Meetings</h3>
          <Meetings />
        </div>
      </div>

      {/* Row 3 */}
      <div className="ldms-grid-row one-col">
        <div className="ldms-card">
          <h3>Demand Analytics</h3>
          <DemandAnalytics />
        </div>
      </div>

      {/* Row 4 */}
      <div className="ldms-grid-row one-col">
        <div className="ldms-card">
          <h3>Support Benefit Map</h3>
          <SupportBenefitExt />
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
