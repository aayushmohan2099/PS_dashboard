// src/pages/TMS/TP/tp_centre_list.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API, LOOKUP_API } from "../../../api/axios";

/* ---------------- cache keys ---------------- */

const CACHE_KEY = "tms_tp_centres_cache_v1";
const TP_SELF_PARTNER_KEY = "tms_self_partner_id_v1";

/* ---------------- helpers ---------------- */

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

function saveCache(payload) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), payload })
    );
  } catch {}
}

/* ---------------- partner resolver ---------------- */

async function resolveTrainingPartnerIdForUser(userId) {
  if (!userId) return null;

  try {
    const cached = localStorage.getItem(TP_SELF_PARTNER_KEY);
    if (cached) return Number(cached);
  } catch {}

  try {
    const resp = await TMS_API.trainingPartners.list({
      search: userId,
      fields: "id",
    });
    const pid = resp?.data?.results?.[0]?.id || null;

    if (pid) {
      localStorage.setItem(TP_SELF_PARTNER_KEY, String(pid));
    }
    return pid;
  } catch {
    return null;
  }
}

/* ===================================================== */

export default function TpCentreList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [centres, setCentres] = useState(() => loadCache()?.payload || []);
  const [search, setSearch] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  /* ---------------- lookups ---------------- */

  const [districtMap, setDistrictMap] = useState({});
  const [blockMap, setBlockMap] = useState({});
  const [panchayatMap, setPanchayatMap] = useState({});
  const [villageMap, setVillageMap] = useState({});

  /* ---------------- lookup preload ---------------- */

  async function preloadLookups() {
    try {
      const [d, b, p, v] = await Promise.all([
        LOOKUP_API.districts.list({ page_size: 1000 }),
        LOOKUP_API.blocks.list({ page_size: 2000 }),
        LOOKUP_API.panchayats.list({ page_size: 5000 }),
        LOOKUP_API.villages.list({ page_size: 10000 }),
      ]);

      setDistrictMap(
        Object.fromEntries((d?.data?.results || []).map((x) => [x.id, x.name]))
      );
      setBlockMap(
        Object.fromEntries((b?.data?.results || []).map((x) => [x.id, x.name]))
      );
      setPanchayatMap(
        Object.fromEntries((p?.data?.results || []).map((x) => [x.id, x.name]))
      );
      setVillageMap(
        Object.fromEntries((v?.data?.results || []).map((x) => [x.id, x.name]))
      );
    } catch (e) {
      console.warn("Failed to preload lookups", e);
    }
  }

  /* ---------------- fetch centres ---------------- */

  async function fetchCentres(force = false) {
    if (!user?.id) return;

    setLoading(true);
    try {
      if (!force) {
        const cached = loadCache();
        if (cached?.payload?.length) {
          setCentres(cached.payload);
          setLoading(false);
          return;
        }
      }

      const partnerId = await resolveTrainingPartnerIdForUser(user.id);
      if (!partnerId) {
        setCentres([]);
        setLoading(false);
        return;
      }

      const resp = await TMS_API.trainingPartnerCentres.list({
        partner: partnerId,
        page_size: 500,
      });

      const items = resp?.data?.results || [];
      setCentres(items);
      saveCache(items);
    } catch (e) {
      console.error("Failed to fetch TP centres", e);
      setCentres([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    preloadLookups();
    fetchCentres(refreshToken > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  /* ---------------- filtered view ---------------- */

  const filtered = useMemo(() => {
    return centres.filter((c) =>
      c.venue_name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [centres, search]);

  /* ===================================================== */

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">Pragati Setu — Training Centres</div>
          }
        />

        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            {/* -------- header -------- */}
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>My Training Centres</h2>

              <input
                placeholder="Search by centre name…"
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginLeft: "auto", maxWidth: 260 }}
              />

              <button
                className="btn"
                onClick={() => {
                  localStorage.removeItem(CACHE_KEY);
                  setRefreshToken((t) => t + 1);
                }}
              >
                Refresh
              </button>

              <button
                className="btn btn-primary"
                onClick={() => navigate("/tms/tp/centre/new")}
              >
                + Register New Centre
              </button>
            </div>

            {/* -------- table -------- */}
            <div style={{ background: "#fff", borderRadius: 8 }}>
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Centre Name</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Halls</th>
                    <th>Facilities</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7}>Loading centres…</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No centres found</td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td>{c.venue_name}</td>
                        <td style={{ fontSize: 13 }}>
                          {districtMap[c.district] || "-"} /{" "}
                          {blockMap[c.block] || "-"}
                          <br />
                          {panchayatMap[c.panchayat] || "-"} /{" "}
                          {villageMap[c.village] || "-"}
                        </td>
                        <td>{c.centre_type || "-"}</td>
                        <td>
                          {c.training_hall_count || 0} halls (
                          {c.training_hall_capacity || "-"})
                        </td>
                        <td style={{ fontSize: 13 }}>
                          🚑 {c.medical_kit ? "Yes" : "No"} | 🍽{" "}
                          {c.dining_facility ? "Yes" : "No"}
                        </td>
                        <td>
                          <button
                            className="btn-sm btn-flat"
                            onClick={() => navigate(`/tms/tp/centre/${c.id}`)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
