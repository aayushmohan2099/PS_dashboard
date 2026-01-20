import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { AuthContext } from "../../../contexts/AuthContext";
import { LDMS_API } from "../../../api/axios";
import UPMap from "../UP Map/UPMap";

/* --------------------------------------------------
   Small helper for animated numbers
-------------------------------------------------- */
function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Number(value || 0);
    if (end === 0) {
      setDisplay(0);
      return;
    }

    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const current = Math.floor(progress * end);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

/* ==================================================
   SMMU – UP STATE MAP + ANALYTICS
================================================== */
export default function SmmuUpMap({ onDistrictSelect }) {
  const { user } = useContext(AuthContext) || {};

  /* ------------------ STATE ------------------ */
  const [districts, setDistricts] = useState([]);
  const [stateTotals, setStateTotals] = useState(null);
  const [hoveredDistrictId, setHoveredDistrictId] = useState(null);
  const [loading, setLoading] = useState(true);

  const mapContainerRef = useRef(null);
  const tableContainerRef = useRef(null);
  const rowRefs = useRef({});

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  /* ---------------------------
     STEP 1: Load STATE TOTALS
  --------------------------- */
  useEffect(() => {
    LDMS_API.upsrlmAnalytics({ state_total: 1 })
      .then((res) => setStateTotals(res?.data?.state))
      .catch((e) => console.error("State totals failed", e));
  }, []);

  /* ---------------------------
     STEP 2: Load DISTRICT TOTALS (ONE CALL)
  --------------------------- */
  useEffect(() => {
    setLoading(true);

    LDMS_API.upsrlmAnalytics({ districts_total: 1 })
      .then((res) => {
        setDistricts(res?.data?.districts || []);
      })
      .catch((e) => {
        console.error("District totals failed", e);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  /* ---------------------------
     TOOLTIP DATA
  --------------------------- */
  const tooltipData = useMemo(() => {
    if (!hoveredDistrictId) return null;
    return districts.find((d) => d.district_id === hoveredDistrictId);
  }, [hoveredDistrictId, districts]);

  /* ---------------------------
     AUTO-SCROLL TABLE ON MAP HOVER
  --------------------------- */
  useEffect(() => {
    if (!hoveredDistrictId) return;

    const row = rowRefs.current[hoveredDistrictId];
    const container = tableContainerRef.current;

    if (row && container) {
      row.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [hoveredDistrictId]);

  /* ---------------------------
     LOADER
  --------------------------- */
  if (loading) {
    return <div>Loading State Analytics…</div>;
  }

  return (
    <div className="smmu-wrapper">
      {/* ================= KPI CARDS ================= */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Total VOs</div>
          <div className="kpi-value">
            <AnimatedNumber value={stateTotals?.total_vos} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total CLFs</div>
          <div className="kpi-value">
            <AnimatedNumber value={stateTotals?.total_clfs} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total SHGs</div>
          <div className="kpi-value">
            <AnimatedNumber value={stateTotals?.total_shgs} />
          </div>
        </div>
      </div>

      {/* ================= MAP + TABLE ================= */}
      <div className="smmu-map-layout">
        {/* ============ MAP ============ */}
        <div
          className="map-section"
          ref={mapContainerRef}
          onMouseMove={(e) => {
            const rect = mapContainerRef.current?.getBoundingClientRect();
            if (!rect) return;
            setMousePos({
              x: e.clientX - rect.left + 14,
              y: e.clientY - rect.top + 14,
            });
          }}
        >
          <UPMap
            onHover={(data) => {
              setHoveredDistrictId(data ? Number(data.id) : null);
            }}
            onDistrictSelect={onDistrictSelect}
          />

          {tooltipData && (
            <div
              className="map-tooltip"
              style={{
                left: mousePos.x,
                top: mousePos.y,
              }}
            >
              <strong>{tooltipData.district_name}</strong>
              <div>VOs: {tooltipData.total_vos}</div>
              <div>CLFs: {tooltipData.total_clfs}</div>
              <div>SHGs: {tooltipData.total_shgs}</div>
            </div>
          )}
        </div>

        {/* ============ TABLE ============ */}
        <div className="table-section" ref={tableContainerRef}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>District</th>
                <th>VOs</th>
                <th>CLFs</th>
                <th>SHGs</th>
              </tr>
            </thead>
            <tbody>
              {districts.map((d, i) => (
                <tr
                  key={d.district_id}
                  ref={(el) => (rowRefs.current[d.district_id] = el)}
                  className={
                    hoveredDistrictId === d.district_id ? "active-row" : ""
                  }
                >
                  <td>{i + 1}</td>
                  <td>{d.district_name}</td>
                  <td>{d.total_vos}</td>
                  <td>{d.total_clfs}</td>
                  <td>{d.total_shgs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .smmu-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* KPI */
        .kpi-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .kpi-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 16px;
          border: 2px solid #af0000;
        }

        .kpi-label {
          font-size: 13px;
          font-weight: 600;
          color: #000000;
        }

        .kpi-value {
          font-size: 26px;
          font-weight: 700;
          color: #a10d0d;
        }

        /* MAP + TABLE */
        .smmu-map-layout {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 16px;
        }

        .map-section {
          position: relative;
          height: 520px;
          border: 2px solid #af0000;
          border-radius: 12px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .map-tooltip {
          position: absolute;
          background: #ffffff;
          border: 1px solid #c01515;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          color: #a10d0d;
          pointer-events: none;
          z-index: 50;
          min-width: 150px;
        }

        .table-section {
          border: 2px solid #af0000;
          border-radius: 12px;
          background: #ffffff;
          max-height: 520px;
          overflow-y: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          position: sticky;
          top: 0;
          background: #c62828;
          color: #ffffff;
          padding: 8px;
        }

        td {
          padding: 8px;
          border-bottom: 1px solid #e5e7eb;
        }

        .active-row {
          background: #fde3e3;
          font-weight: 600;
        }

        /* show ~13 rows before scroll */
        tbody tr {
          height: 36px;
        }

        @media (max-width: 1024px) {
          .smmu-map-layout {
            grid-template-columns: 1fr;
          }
          .kpi-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
