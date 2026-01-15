// bmmu_dashboard_blk_map.jsx
import React from "react";

export default function BlockMap() {
  return (
    <div className="ldms-map-placeholder">
      <div className="map-box">🗺️ Block Map Placeholder</div>

      <style>{`
        .ldms-map-placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-box {
          width: 100%;
          height: 180px;
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #64748b;
          background: #f8fafc;
        }
      `}</style>
    </div>
  );
}
