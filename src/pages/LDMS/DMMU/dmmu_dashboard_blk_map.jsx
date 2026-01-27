// src/pages/LDMS/DMMU/dmmu_dashboard_blk_map.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../../../contexts/AuthContext";
import api, { LDMS_API } from "../../../api/axios";

/**
 * DMMU – District Block Map + Analytics Table
 *
 * BEHAVIOR:
 * - If `districtId` prop is provided → use it
 * - Else → resolve district from logged-in user
 */
export default function DmmuBlockMap({
  districtId: propDistrictId,
  onBlockSelect,
}) {
  const { user } = useContext(AuthContext) || {};

  /* ------------------ STATE ------------------ */
  const [districtId, setDistrictId] = useState(propDistrictId || null);
  const [districtName, setDistrictName] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [analyticsCache, setAnalyticsCache] = useState({});
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  const [MapComponent, setMapComponent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef(null);

  /* ---------------------------
     STEP 1: Resolve district_id
     Priority:
       1. propDistrictId
       2. logged-in user district
  --------------------------- */
  useEffect(() => {
    if (propDistrictId) {
      setDistrictId(propDistrictId);
      return;
    }

    if (!user?.id) return;

    api
      .get(`/lookups/user-geoscope/${encodeURIComponent(user.id)}/`)
      .then((res) => {
        const dist = res?.data?.districts?.[0];
        if (dist) setDistrictId(dist);
      })
      .catch((e) => console.error("Failed to resolve user district", e));
  }, [propDistrictId, user?.id]);

  /* ---------------------------
     STEP 2: Get district name
  --------------------------- */
  useEffect(() => {
    if (!districtId) return;

    setDistrictName(null);
    setMapComponent(null);
    setBlocks([]);
    setAnalyticsCache({});

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
    STEP 3+4: Get ALL blocks + analytics (SINGLE CALL)
  --------------------------- */
  useEffect(() => {
    if (!districtId) return;

    let cancelled = false;
    setLoading(true);

    // reset state (same behavior as before)
    setBlocks([]);
    setAnalyticsCache({});

    LDMS_API.upsrlmAnalytics({
      district_id: districtId,
      detail: 1,
    })
      .then((res) => {
        if (cancelled) return;

        const apiBlocks = res?.data?.blocks || [];

        // 1️⃣ Populate blocks (for map + table structure)
        setBlocks(
          apiBlocks.map((b) => ({
            block_id: b.block_id,
            block_name_en: b.block_name,
          }))
        );

        // 2️⃣ Populate analytics cache (exact shape UI expects)
        const cache = {};
        apiBlocks.forEach((b) => {
          cache[b.block_id] = {
            block_name: b.block_name,
            totals: {
              total_vos: b.total_vos,
              total_clfs: b.total_clfs,
              total_shgs: b.total_shgs,
              total_rural_hh: b.total_rural_hh,
              total_hh_under_shgs: b.total_hh_under_shgs,
            },
            updated_at: b.updated_at,
          };
        });

        setAnalyticsCache(cache);
      })
      .catch((e) => {
        console.error("District block analytics failed", e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [districtId]);

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
            onSelect={(data) => {
              if (data?.id && onBlockSelect) {
                onBlockSelect(Number(data.id));
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
            <div>Rural Households: {tooltipData.totals?.total_rural_hh ?? "—"}</div>      
            <div>Households under SHGs: {tooltipData.totals?.total_hh_under_shgs ?? "—"}</div>   
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
              <th>Rural HouseHolds</th>
              <th>Households under SHGs</th>                            
            </tr>
          </thead>
          <tbody>
            {tableData.map((b, i) => (
              <tr
                key={b.block_id}
                className="clickable-row"
                onClick={() => {
                  if (onBlockSelect) onBlockSelect(b.block_id);
                }}
              >
                <td>{i + 1}</td>
                <td>{b.block_name_en}</td>
                <td>{b.analytics?.totals?.total_vos ?? "—"}</td>
                <td>{b.analytics?.totals?.total_clfs ?? "—"}</td>
                <td>{b.analytics?.totals?.total_shgs ?? "—"}</td>
                <td>{b.analytics?.totals?.total_rural_hh ?? "—"}</td>       
                <td>{b.analytics?.totals?.total_hh_under_shgs ?? "—"}</td>                 
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
          border: 2px solid #af0000;
          border-radius: 12px;
          padding: 8px;
          background: #ffffff;
          height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
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

        .clickable-row {
          cursor: pointer;
        }
        .clickable-row:hover {
          background: #fdecea;
        }

        .table-section {
          border: 2px solid #af0000;
          border-radius: 12px;
          overflow-y: auto;
          background: #ffffff;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #af0000;
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
