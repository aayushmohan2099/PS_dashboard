// src/pages/TMS/DMMU/dmmu_tms_dashboard.jsx
import React, { useEffect, useState, useContext, useRef } from "react";
import TmsLeftNav from "../layout/tms_LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API, LOOKUP_API } from "../../../api/axios";
import { useNavigate } from "react-router-dom";

const GEOSCOPE_KEY = "ps_user_geoscope";
const DASHBOARD_CACHE_KEY = "tms_dmmu_dashboard_cache_v1";

/**
 * Get district_id from user's geoscope
 */
async function getDistrictIdFromGeoscope(user) {
  try {
    // Try cache first
    const raw = localStorage.getItem(GEOSCOPE_KEY);
    if (raw) {
      const geoscope = JSON.parse(raw);
      if (geoscope?.districts?.[0]) {
        return geoscope.districts[0];
      }
    }

    // Fetch fresh geoscope
    if (user?.id) {
      const res = await LOOKUP_API.userGeoscopeByUserId(user.id);
      const geoscope = res?.data || res;
      if (geoscope?.districts?.[0]) {
        localStorage.setItem(GEOSCOPE_KEY, JSON.stringify(geoscope));
        return geoscope.districts[0];
      }
    }
  } catch (e) {
    console.warn("Geoscope fetch failed:", e);
  }
  return null;
}

/**
 * Animated number counter (same as SMMU)
 */
function useAnimatedNumber(toVal, ms = 900) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof toVal !== "number" || Number.isNaN(toVal)) {
      setDisplay(toVal);
      return;
    }
    if (display === toVal && startedRef.current) return;

    const start = Date.now();
    const duration = ms;
    const from = Number(display) || 0;
    startedRef.current = true;

    function step() {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = Math.sqrt(t);
      const current = Math.round(from + (toVal - from) * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(toVal);
      }
    }
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [toVal, display]);

  return display;
}

export default function DmmuTmsDashboard() {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const [districtId, setDistrictId] = useState(null);
  const [kpis, setKpis] = useState({
    totalBeneficiaries: 0,
    totalTrainers: 0,
    totalTrainings: 0,
    totalPlds: 0,
  });
  const [loadingKpis, setLoadingKpis] = useState(true);

  // Animated displays
  const animBeneficiaries = useAnimatedNumber(kpis.totalBeneficiaries);
  const animTrainers = useAnimatedNumber(kpis.totalTrainers);
  const animTrainings = useAnimatedNumber(kpis.totalTrainings);
  const animPlds = useAnimatedNumber(kpis.totalPlds);

  // Cache control
  const [usingCache, setUsingCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load district and dashboard data on mount
  useEffect(() => {
    loadDashboardData();
  }, [user]);

  async function loadDashboardData() {
    const district = await getDistrictIdFromGeoscope(user);
    setDistrictId(district);

    if (!district) {
      setLoadingKpis(false);
      return;
    }

    // Try cache first
    const cacheRaw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (cacheRaw) {
      try {
        const parsed = JSON.parse(cacheRaw);
        if (parsed.districtId === district && parsed.kpis) {
          setKpis(parsed.kpis);
          setUsingCache(true);
          setLoadingKpis(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem(DASHBOARD_CACHE_KEY);
      }
    }

    // Fetch fresh data
    await fetchKpis(district, true);
  }

  async function fetchKpis(district, saveCache = false) {
    setLoadingKpis(true);
    try {
      console.log("Fetching KPIs for district:", district);

      // Parallel API calls for all metrics
      const [beneficiariesRes, trainersRes, trainingsRes, pldsRes] =
        await Promise.all([
          TMS_API.trainingRequestBeneficiaries.list({ district, page_size: 1 }),
          TMS_API.trainingRequestTrainers.list({ district, page_size: 1 }),
          TMS_API.trainingRequests.list({ district, page_size: 1 }),
          TMS_API.trainingRequestBeneficiaries.list({
            district,
            pld_status: "YES",
            page_size: 1,
          }),
        ]);

      const newKpis = {
        totalBeneficiaries: beneficiariesRes?.data?.count || 0,
        totalTrainers: trainersRes?.data?.count || 0,
        totalTrainings: trainingsRes?.data?.count || 0,
        totalPlds: pldsRes?.data?.count || 0,
      };

      setKpis(newKpis);

      if (saveCache) {
        try {
          localStorage.setItem(
            DASHBOARD_CACHE_KEY,
            JSON.stringify({
              ts: Date.now(),
              districtId: district,
              kpis: newKpis,
            })
          );
          setUsingCache(true);
        } catch (e) {
          console.warn("Cache save failed:", e);
        }
      }

      console.log("✅ KPIs loaded:", newKpis);
    } catch (err) {
      console.error("fetchKpis failed:", err);
    } finally {
      setLoadingKpis(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      if (districtId) {
        await fetchKpis(districtId, true);
        setUsingCache(false);
      }
    } catch (e) {
      console.error("Refresh failed:", e);
    } finally {
      setRefreshing(false);
    }
  }

  const cardStyle = {
    background: "#fff",
    borderRadius: 8,
    padding: 24,
    boxShadow: "0 4px 12px rgba(10,20,40,0.08)",
    minWidth: 180,
    textAlign: "center",
  };
  const numberStyle = {
    fontSize: 36,
    fontWeight: 700,
    color: "#1a1a1a",
    lineHeight: 1.2,
  };
  const labelStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginTop: 8,
  };
  const small = { color: "#6c757d", fontSize: 13 };

  return (
    <div className="app-shell">
      <TmsLeftNav />
      <div className="main-area">
        <TopNav
          left={<div className="app-title">Pragati Setu — TMS (DMMU)</div>}
        />

        <main className="dashboard-main" style={{ padding: 18 }}>
          <div
            style={{ maxWidth: 1200, margin: "20px auto", padding: "0 16px" }}
          >
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h2 style={{ margin: 0 }}>
                DMMU Dashboard
                {districtId && (
                  <span
                    style={{
                      color: "#6c757d",
                      fontWeight: 400,
                      fontSize: 16,
                      marginLeft: 12,
                    }}
                  >
                    — District #{districtId}
                  </span>
                )}
              </h2>
              <div
                style={{
                  marginLeft: "auto",
                  color: "#6c757d",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 13 }}>
                  {user?.first_name ? `Welcome, ${user.first_name}` : "Welcome"}
                </div>
                <button
                  className="btn"
                  onClick={handleRefresh}
                  disabled={refreshing || !districtId}
                  style={{ padding: "8px 16px", borderRadius: 6 }}
                >
                  {refreshing
                    ? "Refreshing…"
                    : usingCache
                      ? "Refresh Data"
                      : "Updated"}
                </button>
              </div>
            </div>

            {/* KPIs Grid - Animate until ALL loaded */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 20,
                marginBottom: 32,
              }}
            >
              <div style={cardStyle}>
                <div style={numberStyle}>
                  {loadingKpis ? "…" : animBeneficiaries}
                </div>
                <div style={labelStyle}>Total Beneficiaries</div>
                <div style={small}>Trained in district</div>
              </div>

              <div style={cardStyle}>
                <div style={numberStyle}>
                  {loadingKpis ? "…" : animTrainers}
                </div>
                <div style={labelStyle}>Total Trainers</div>
                <div style={small}>Trained in district</div>
              </div>

              <div style={cardStyle}>
                <div style={numberStyle}>
                  {loadingKpis ? "…" : animTrainings}
                </div>
                <div style={labelStyle}>Total Trainings</div>
                <div style={small}>Requests in district</div>
              </div>

              <div style={cardStyle}>
                <div style={numberStyle}>{loadingKpis ? "…" : animPlds}</div>
                <div style={labelStyle}>PLDs Trained</div>
                <div style={small}>
                  Potential Lakhpatis trained in your District
                </div>
              </div>
            </div>

            {/* Quick Actions + Notes */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 380px",
                gap: 24,
              }}
            >
              {/* Quick Actions */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: "0 4px 12px rgba(10,20,40,0.06)",
                }}
              >
                <h3 style={{ marginTop: 0, color: "#1a1a1a" }}>
                  Quick Actions
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  <button
                    onClick={() => navigate("/tms/training-requests")}
                    className="btn"
                    style={{
                      background: "#0b2540",
                      color: "#fff",
                      padding: "12px 20px",
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                  >
                    View All Training Requests
                  </button>
                  <button
                    onClick={() => navigate("/tms/batches-list")}
                    className="btn"
                    style={{ padding: "12px 20px", borderRadius: 8 }}
                  >
                    District Batches
                  </button>
                  <button
                    onClick={() => navigate("/tms/dmmu/requests")}
                    className="btn"
                    style={{ padding: "12px 20px", borderRadius: 8 }}
                  >
                    Pending Approvals
                  </button>
                </div>

                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 20,
                    borderTop: "1px solid #f1f3f5",
                  }}
                >
                  <h4 style={{ margin: "0 0 12px 0", color: "#374151" }}>
                    Notes
                  </h4>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 20,
                      color: "#6c757d",
                      fontSize: 14,
                    }}
                  >
                    <li>Review pending training requests from BMMUs</li>
                    <li>Monitor batch progress across blocks</li>
                    <li>Verify PLD completion rates</li>
                    <li>Approve/reject training plans</li>
                  </ul>
                </div>
              </div>

              {/* Recent Activity / Stats Sidebar */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: "0 4px 12px rgba(10,20,40,0.06)",
                }}
              >
                <h4 style={{ marginTop: 0, color: "#1a1a1a" }}>
                  District Overview
                </h4>
                <div
                  style={{
                    fontSize: 13,
                    color: "#6c757d",
                    lineHeight: 1.5,
                    marginBottom: 20,
                  }}
                >
                  District #{districtId || "Loading..."} — {kpis.totalTrainings}{" "}
                  active trainings
                  {kpis.totalBeneficiaries > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "12px 16px",
                        background: "#f0f9ff",
                        borderRadius: 6,
                        borderLeft: "3px solid #0ea5e9",
                      }}
                    >
                      <strong>PLD Coverage:</strong>{" "}
                      {Math.round(
                        (kpis.totalPlds / kpis.totalBeneficiaries) * 100
                      ) || 0}
                      %
                      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>
                        {kpis.totalPlds}/{kpis.totalBeneficiaries} beneficiaries
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: "1px solid #f1f3f5", paddingTop: 16 }}>
                  <h5
                    style={{
                      margin: "0 0 12px 0",
                      color: "#374151",
                      fontSize: 14,
                    }}
                  >
                    Quick Links
                  </h5>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <button
                      className="btn btn-outline"
                      style={{
                        padding: "10px",
                        textAlign: "left",
                        borderRadius: 6,
                      }}
                      onClick={() => navigate("/tms/dmmu/batches")}
                    >
                      → View District Batches
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{
                        padding: "10px",
                        textAlign: "left",
                        borderRadius: 6,
                      }}
                      onClick={() => navigate("/tms/training-requests")}
                    >
                      → Pending Requests ({kpis.totalTrainings})
                    </button>
                    <button
                      className="btn btn-outline"
                      style={{
                        padding: "10px",
                        textAlign: "left",
                        borderRadius: 6,
                      }}
                      onClick={() => navigate("/tms/training-requests")}
                    >
                      → All Requests
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
