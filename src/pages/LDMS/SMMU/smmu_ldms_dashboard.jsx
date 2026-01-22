// src/pages/LDMS/SMMU/smmu_ldms_dashboard.jsx
import React, { useEffect, useState } from "react";
import SmmuUpMap from "./smmu_up_map";
import DmmuBlockMap from "../DMMU/dmmu_dashboard_blk_map";
import BlockMap from "../BMMU/bmmu_dashboard_blk_map";
import SmmuMeetings from "./smmu_dashboard_meetings";
import SmmuDemandAnalytics from "./smmu_dashboard_demand_fulfill";
import { LOOKUP_API } from "../../../api/axios";
import { getCached, setCached } from "../../../utils/storage";

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

  /* ---------------- MEETINGS FILTER STATE ---------------- */
  const [meetDistrictId, setMeetDistrictId] = useState(null);
  const [meetBlockId, setMeetBlockId] = useState(null);
  const [meetBlocks, setMeetBlocks] = useState([]);
  const [loadingMeetBlocks, setLoadingMeetBlocks] = useState(false);

  const loadMeetBlocks = async (distId) => {
    setLoadingMeetBlocks(true);
    setMeetBlocks([]);

    const cacheKey = `lookup:blocks:${distId}`;
    const cached = getCached(cacheKey);
    if (cached) {
      setMeetBlocks(cached);
      setLoadingMeetBlocks(false);
      return;
    }

    const res = await LOOKUP_API.blocks.list({
      district_id: distId,
      page_size: 80,
    });

    const data = res?.data?.results || [];
    setMeetBlocks(data);
    setCached(cacheKey, data);
    setLoadingMeetBlocks(false);
  };

  const onMeetDistrictChange = async (id) => {
    if (!id) {
      setMeetDistrictId(null);
      setMeetBlockId(null);
      setMeetBlocks([]);
      return;
    }

    setMeetDistrictId(Number(id));
    setMeetBlockId(null);
    await loadMeetBlocks(Number(id));
  };

  const onMeetBlockChange = (id) => {
    setMeetBlockId(id ? Number(id) : null);
  };

  /* ==================================================
     RENDER
  ================================================== */
  return (
    <div className="smmu-ldms-dashboard">
      {/* ==================================================
         CARD 1 – MAP + FILTERS
      ================================================== */}
      <div className="ldms-card">
        {/* ---------------- FILTER BAR ---------------- */}
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

          <button className="refresh-btn" onClick={goToState} title="Refresh">
            ⟳
          </button>
        </div>

        {/* ---------------- MAP CONTENT ---------------- */}
        {!districtId && <SmmuUpMap onDistrictSelect={openDistrictFromMap} />}

        {districtId && !blockId && (
          <DmmuBlockMap
            districtId={districtId}
            onBlockSelect={openBlockFromMap}
          />
        )}

        {blockId && <BlockMap blockId={blockId} />}
      </div>

      {/* ==================================================
         CARD 2 – MEETINGS
      ================================================== */}
      <div className="ldms-card">
        <h3>District / Block Level Coordination Meetings</h3>

        {/* -------- MEETINGS FILTER BAR -------- */}
        <div className="filter-bar">
          <select
            value={meetDistrictId || ""}
            onChange={(e) => onMeetDistrictChange(e.target.value)}
          >
            <option value="">Select District</option>
            {districts.map((d) => (
              <option key={d.district_id} value={d.district_id}>
                {d.district_name_en}
              </option>
            ))}
          </select>

          <select
            value={meetBlockId || ""}
            disabled={!meetDistrictId || loadingMeetBlocks}
            onChange={(e) => onMeetBlockChange(e.target.value)}
          >
            {!meetDistrictId && <option>Select District first</option>}
            {loadingMeetBlocks && <option>Loading blocks…</option>}
            {!loadingMeetBlocks &&
              meetBlocks.map((b) => (
                <option key={b.block_id} value={b.block_id}>
                  {b.block_name_en}
                </option>
              ))}
          </select>
        </div>

        {/* -------- MEETINGS ANALYTICS -------- */}
        <SmmuMeetings
          districts={districts}
          blocks={meetBlocks}
          districtId={meetDistrictId}
          blockId={meetBlockId}
        />
      </div>

      {/* ==================================================
         CARD 3 – SCHEME ANALYTICS
      ================================================== */}
      <div className="ldms-card">
        <h3>Scheme wise Support Analytics</h3>
        <SmmuDemandAnalytics />
      </div>

      {/* ==================================================
         CARD 4 – SUPPORT / BENEFIT COVERAGE
      ================================================== */}
      <div className="ldms-card">
        <h3>Support Benefit Coverage</h3>
        <div className="placeholder">Coming Soon</div>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .smmu-ldms-dashboard {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ldms-card {
          background: #ffffff;
          border: 2px solid #ce0000b0;
          box-shadow: 0 8px 35px rgba(163, 19, 19, 0.35);
          border-radius: 12px;
          padding: 12px;
          min-height: 220px;
        }

        .ldms-card h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 700;
          color: #400b0b;
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

        .placeholder {
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          color: #9b1c1c;
          background: #fff5f5;
          border: 1px dashed #e5b3b3;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
