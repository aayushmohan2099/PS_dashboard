import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api, { TMS_API } from "../../../api/axios";

/* ---------------- cache keys ---------------- */

const CACHE_KEY = "tms_tp_centres_cache_v1";
const TP_SELF_PARTNER_KEY = "tms_self_partner_id_v1";

/* ---------------- helpers ---------------- */

function normalizeMediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://66.116.207.88/")) {
    return url.replace("http://66.116.207.88/", "http://66.116.207.88:8088/");
  }
  return url;
}

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

/* ================= IMAGE LIGHTBOX ================= */

function ImageLightbox({ src, onClose }) {
  if (!src) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={src}
        alt="Preview"
        style={{
          maxWidth: "90%",
          maxHeight: "90%",
          borderRadius: 6,
        }}
      />
    </div>
  );
}

/* ================= VIEW MODAL ================= */

function CentreViewModal({ open, data, onClose }) {
  const [zoomImg, setZoomImg] = useState(null);
  const printRef = useRef();

  if (!open || !data) return null;

  const {
    venue_name,
    serial_number,
    centre_type,
    venue_address,
    district,
    block,
    panchayat,
    village,
    security_arrangements,
    toilets_bathrooms,
    power_water_facility,
    medical_kit,
    open_space,
    field_visit_facility,
    transport_facility,
    dining_facility,
    other_details,
    training_hall_count,
    training_hall_capacity,
    rooms = [],
    submissions = [],
  } = data;

  function handlePrint() {
    const printContents = printRef.current.innerHTML;
    const w = window.open("", "", "width=1000,height=800");
    w.document.write(`
      <html>
        <head>
          <title>Centre Details</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            td, th { border: 1px solid #ccc; padding: 8px; }
            h2, h3 { margin-top: 24px; }
            img { max-width: 180px; margin: 6px; }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          overflow: "auto",
        }}
      >
        <div
          style={{
            background: "#fff",
            maxWidth: 1000,
            margin: "40px auto",
            borderRadius: 10,
            padding: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>{venue_name}</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-outline" onClick={handlePrint}>
                🖨 Print / Save PDF
              </button>
              <button className="btn-outline" onClick={onClose}>
                Back
              </button>
            </div>
          </div>

          <div ref={printRef}>
            <h3>Basic Information</h3>
            <table>
              <tbody>
                <tr>
                  <td>Serial Number</td>
                  <td>{serial_number}</td>
                </tr>
                <tr>
                  <td>Centre Type</td>
                  <td>{centre_type}</td>
                </tr>
                <tr>
                  <td>Address</td>
                  <td>{venue_address}</td>
                </tr>
                <tr>
                  <td>Location</td>
                  <td>
                    {district?.district_name_en} / {block?.block_name_en}
                    <br />
                    {panchayat?.panchayat_name_en} /{" "}
                    {village?.village_name_english}
                  </td>
                </tr>
              </tbody>
            </table>

            <h3>Facilities</h3>
            <table>
              <tbody>
                <tr>
                  <td>Security</td>
                  <td>{security_arrangements}</td>
                </tr>
                <tr>
                  <td>Toilets</td>
                  <td>{toilets_bathrooms}</td>
                </tr>
                <tr>
                  <td>Power & Water</td>
                  <td>{power_water_facility}</td>
                </tr>
                <tr>
                  <td>Medical Kit</td>
                  <td>{medical_kit ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <td>Open Space</td>
                  <td>{open_space ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <td>Field Visit</td>
                  <td>{field_visit_facility ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <td>Transport</td>
                  <td>{transport_facility ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <td>Dining</td>
                  <td>{dining_facility ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <td>Other</td>
                  <td>{other_details || "-"}</td>
                </tr>
              </tbody>
            </table>

            <h3>Training Halls</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Capacity</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id}>
                    <td>{r.room_name}</td>
                    <td>{r.room_capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>Media</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {submissions.map((m) => {
                const src = normalizeMediaUrl(m.file);
                return (
                  <div key={m.id} style={{ textAlign: "center" }}>
                    <img
                      src={src}
                      alt={m.category}
                      style={{ height: 100, cursor: "pointer" }}
                      onClick={() => setZoomImg(src)}
                    />
                    <div style={{ fontSize: 12 }}>{m.category}</div>
                    <a href={src} download>
                      Download
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <ImageLightbox src={zoomImg} onClose={() => setZoomImg(null)} />
    </>
  );
}

/* ================= MAIN ================= */

export default function TpCentreList() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [viewLoadingId, setViewLoadingId] = useState(null);
  const [centres, setCentres] = useState(() => loadCache()?.payload || []);
  const [search, setSearch] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);

  async function fetchCentres(force = false) {
    if (!user?.id) return;
    setLoading(true);
    try {
      const partnerId = await resolveTrainingPartnerIdForUser(user.id);
      if (!partnerId) return;

      const resp = await TMS_API.trainingPartnerCentres.list({
        partner: partnerId,
        page_size: 500,
      });

      const items = resp?.data?.results || [];
      setCentres(items);
      saveCache(items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCentres(refreshToken > 0);
    // eslint-disable-next-line
  }, [refreshToken]);

  async function handleViewCentre(id) {
    setViewLoadingId(id);
    const resp = await api.get(`/tms/training-partner-centres/${id}/detail/`);
    setViewData(resp.data);
    setViewOpen(true);
    setViewLoadingId(null);
  }

  const filtered = useMemo(
    () =>
      centres.filter((c) =>
        c.venue_name?.toLowerCase().includes(search.toLowerCase())
      ),
    [centres, search]
  );

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
            {/* HEADER BAR */}
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

            {/* TABLE */}
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>Centre Name</th>
                  <th>Type</th>
                  <th>Training Halls</th>
                  <th>Action</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>Loading…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No centres found</td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id}>
                      <td>{c.serial_number}</td>
                      <td>{c.venue_name}</td>
                      <td>{c.centre_type}</td>
                      <td>{c.training_hall_count}</td>
                      <td>
                        <button
                          className="btn-sm btn-flat"
                          disabled={viewLoadingId === c.id}
                          onClick={() => handleViewCentre(c.id)}
                        >
                          {viewLoadingId === c.id ? "Opening…" : "View"}
                        </button>{" "}
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
        </main>
      </div>

      <CentreViewModal
        open={viewOpen}
        data={viewData}
        onClose={() => setViewOpen(false)}
      />
    </div>
  );
}
