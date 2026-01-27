// src/pages/LDMS/DMMU/dmmu_dashboard_blk_map.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../../../contexts/AuthContext";
import api, { LDMS_API } from "../../../api/axios";

/**
 * DMMU – District Block Map + Analytics Table
 * JSX driven | Tooltip based | Incremental loading
 */

export default function DmmuBlockMap() {
  const { user } = useContext(AuthContext) || {};

  /* ------------------ STATE ------------------ */
  const [districtId, setDistrictId] = useState(null);
  const [districtName, setDistrictName] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [analyticsCache, setAnalyticsCache] = useState({});
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  const [MapComponent, setMapComponent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const mapContainerRef = useRef(null);

  /* ---------------------------
     STEP 1: Get district_id
  --------------------------- */
  useEffect(() => {
    if (!user?.id) return;

    api
      .get(`/lookups/user-geoscope/${encodeURIComponent(user.id)}/`)
      .then((res) => {
        const dist = res?.data?.districts?.[0];
        if (dist) setDistrictId(dist);
      });
  }, [user?.id]);

  /* ---------------------------
     STEP 2: Get district name
  --------------------------- */
  useEffect(() => {
    if (!districtId) return;

    api
      .get(`/lookups/districts/${districtId}`, {
        params: { fields: "district_name_en" },
      })
      .then((res) => {
        const name = res?.data?.district_name_en;
        if (name) setDistrictName(name.toUpperCase());
      });
  }, [districtId]);

  /* ---------------------------
     STEP 3: Get ALL blocks
  --------------------------- */
  useEffect(() => {
    if (!districtId) return;

    api
      .get(`/lookups/blocks/${districtId}`, {
        params: { page_size: 100 },
      })
      .then((res) => {
        setBlocks(res?.data?.results || []);
      });
  }, [districtId]);

  /* ---------------------------
     STEP 4: Fetch analytics (INCREMENTAL)
  --------------------------- */
  useEffect(() => {
    if (!blocks.length) return;

    setLoading(true);

    blocks.forEach(async (b) => {
      try {
        const res = await LDMS_API.upsrlmAnalytics({
          block_id: b.block_id,
        });

        setAnalyticsCache((prev) => ({
          ...prev,
          [b.block_id]: res.data,
        }));
      } catch (e) {
        console.error("Analytics failed for", b.block_id);
      }
    });

    setLoading(false);
  }, [blocks]);

  /* ---------------------------
     STEP 5: Load JSX District Map
  --------------------------- */
  useEffect(() => {
    if (!districtName) return;

    const loadMap = async () => {
      try {
        const module = await import(
          `../District Maps/${districtName}/${districtName}.jsx`
        );
        setMapComponent(() => module.default);
      } catch (err) {
        console.error("District map not found:", districtName, err);
      }
    };

    loadMap();
  }, [districtName]);

  /* ---------------------------
     TOOLTIP DATA
  --------------------------- */
  const tooltipData =
    hoveredBlockId && analyticsCache[hoveredBlockId]
      ? analyticsCache[hoveredBlockId]
      : null;

  /* ---------------------------
     TABLE DATA
  --------------------------- */
  const tableData = useMemo(() => {
    return blocks.map((b) => ({
      ...b,
      analytics: analyticsCache[b.block_id],
    }));
  }, [blocks, analyticsCache]);

  /* ---------------------------
     LOADER
  --------------------------- */
  if (loading && !MapComponent) {
    return <div>Loading District Map…</div>;
  }

  return (
    <div className="dmmu-map-layout">
      {/* ================= LEFT ================= */}
      <div
        className="map-section"
        ref={mapContainerRef}
        onMouseMove={(e) => {
          const rect = mapContainerRef.current?.getBoundingClientRect();
          if (!rect) return;

          setMousePos({
            x: e.clientX - rect.left + 12,
            y: e.clientY - rect.top + 12,
          });
        }}
      >
        {MapComponent && (
          <MapComponent
            onHover={(data) => {
              if (!data) {
                setHoveredBlockId(null);
              } else {
                setHoveredBlockId(Number(data.id));
              }
            }}
          />
        )}

        {tooltipData && (
          <div
            className="map-tooltip"
            style={{
              left: mousePos.x,
              top: mousePos.y,
            }}
          >
            <strong>{tooltipData.block_name}</strong>
            <div>VOs: {tooltipData.totals?.total_vos ?? "—"}</div>
            <div>CLFs: {tooltipData.totals?.total_clfs ?? "—"}</div>
            <div>SHGs: {tooltipData.totals?.total_shgs ?? "—"}</div>
          </div>
        )}
      </div>

      {/* ================= RIGHT ================= */}
      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Block</th>
              <th>VOs</th>
              <th>CLFs</th>
              <th>SHGs</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((b, i) => (
              <tr key={b.block_id}>
                <td>{i + 1}</td>
                <td>{b.block_name_en}</td>
                <td>{b.analytics?.totals?.total_vos ?? "—"}</td>
                <td>{b.analytics?.totals?.total_clfs ?? "—"}</td>
                <td>{b.analytics?.totals?.total_shgs ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .dmmu-map-layout {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 16px;
        }

        .map-section {
          position: relative;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 8px;
          background: #ffffff;
          height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-tooltip {
          position: absolute;
          background: #ffffff;
          border: 1px solid #c62828;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          color: #b71c1c;
          pointer-events: none;
          z-index: 50;
          min-width: 140px;
        }

        .table-section {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow-y: auto;
          background: #ffffff;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #c62828;
          color: #ffffff;
          padding: 8px;
        }

        td {
          padding: 8px;
          border-bottom: 1px solid #e5e7eb;
        }

        @media (max-width: 1024px) {
          .dmmu-map-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
