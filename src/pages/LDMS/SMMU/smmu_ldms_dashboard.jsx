import React, { useEffect, useState } from "react";
import SmmuUpMap from "./smmu_up_map";
import DmmuBlockMap from "../DMMU/dmmu_dashboard_blk_map";
import BlockMap from "../BMMU/bmmu_dashboard_blk_map";
import { LOOKUP_API } from "../../../api/axios";
import {
  getCached,
  setCached,
  clearAppCacheOnly,
} from "../../../utils/storage";

/* ==================================================
   SMMU – FILTER BASED DRILLDOWN
   State → District → Block
================================================== */

export default function SmmuLdmsDashboard() {
  /* ---------------- STATE ---------------- */
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);

  const [districtId, setDistrictId] = useState(null);
  const [blockId, setBlockId] = useState(null);

  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  /* ==================================================
     LOAD DISTRICTS (CACHED)
  ================================================== */
  useEffect(() => {
    const cached = getCached("lookup:districts");
    if (cached) {
      setDistricts(cached);
      setLoadingDistricts(false);
      return;
    }

    LOOKUP_API.districts
      .list({ page_size: 80 })
      .then((res) => {
        const data = res?.data?.results || [];
        setDistricts(data);
        setCached("lookup:districts", data);
      })
      .finally(() => setLoadingDistricts(false));
  }, []);

  /* ==================================================
     LOAD BLOCKS WHEN DISTRICT CHANGES (CACHED)
  ================================================== */
  const loadBlocks = async (distId) => {
    setLoadingBlocks(true);
    setBlocks([]);

    const cacheKey = `lookup:blocks:${distId}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setBlocks(cached);
      setLoadingBlocks(false);
      return;
    }

    const res = await LOOKUP_API.blocks.list({
      district_id: distId,
      page_size: 80,
    });

    const data = res?.data?.results || [];
    setBlocks(data);
    setCached(cacheKey, data);
    setLoadingBlocks(false);
  };

  /* ==================================================
     FILTER HANDLERS
  ================================================== */
  const onDistrictChange = async (id) => {
    if (!id) {
      setDistrictId(null);
      setBlockId(null);
      setBlocks([]);
      return;
    }

    setDistrictId(Number(id));
    setBlockId(null);
    await loadBlocks(Number(id));
  };

  const onBlockChange = (id) => {
    setBlockId(id ? Number(id) : null);
  };

  /* ==================================================
     MAP → FILTER SYNC
  ================================================== */
  const openDistrictFromMap = async (id) => {
    setDistrictId(id);
    setBlockId(null);
    await loadBlocks(id);
  };

  const openBlockFromMap = (id) => {
    setBlockId(id);
  };

  /* ==================================================
     RETURN TO STATE
  ================================================== */
  const goToState = () => {
    setDistrictId(null);
    setBlockId(null);
    setBlocks([]);
  };

  /* ==================================================
     RENDER
  ================================================== */
  return (
    <div className="smmu-ldms-dashboard">
      <div className="ldms-card">
        {/* ================= FILTER BAR ================= */}
        <div className="filter-bar">
          {(districtId || blockId) && (
            <button className="back-btn" onClick={goToState}>
              ← Back to State
            </button>
          )}

          <select
            value={districtId || ""}
            onChange={(e) => onDistrictChange(e.target.value)}
          >
            <option value="">
              {loadingDistricts ? "Loading districts…" : "Select District"}
            </option>
            {districts.map((d) => (
              <option key={d.district_id} value={d.district_id}>
                {d.district_name_en}
              </option>
            ))}
          </select>

          <select
            value={blockId || ""}
            disabled={!districtId || loadingBlocks}
            onChange={(e) => onBlockChange(e.target.value)}
          >
            {!districtId && <option>Select District first</option>}
            {loadingBlocks && <option>Loading blocks…</option>}
            {!loadingBlocks &&
              blocks.map((b) => (
                <option key={b.block_id} value={b.block_id}>
                  {b.block_name_en}
                </option>
              ))}
          </select>

          <button
            className="refresh-btn"
            onClick={goToState}
            title="Refresh cache"
          >
            ⟳
          </button>
        </div>

        {/* ================= CONTENT ================= */}
        {!districtId && <SmmuUpMap onDistrictSelect={openDistrictFromMap} />}

        {districtId && !blockId && (
          <DmmuBlockMap
            districtId={districtId}
            onBlockSelect={openBlockFromMap}
          />
        )}

        {blockId && <BlockMap blockId={blockId} />}
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .smmu-ldms-dashboard {
          display: flex;
          flex-direction: column;
        }

        .ldms-card {
          background: #ffffff;
          border: 2px solid #ce0000b0;
          box-shadow: 0 8px 35px rgba(163, 19, 19, 0.35);
          border-radius: 12px;
          padding: 12px;
          min-height: 600px;
        }

        /* -------- FILTER BAR -------- */
        .filter-bar {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 12px;
        }

        .filter-bar select {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #b71c1c;
          font-weight: 600;
          min-width: 220px;
        }

        .back-btn {
          background: transparent;
          border: none;
          font-weight: 700;
          color: #8b1d1d;
          cursor: pointer;
        }

        .back-btn:hover {
          text-decoration: underline;
        }

        .refresh-btn {
          margin-left: auto;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          background: #c62828;
          color: #fff;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
