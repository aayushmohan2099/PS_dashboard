// src/pages/TMS/TP_CP/cp_dashboard.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TmsLeftNav from "../layout/tms_LeftNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api, { TMS_API } from "../../../api/axios";

/* ---------------- cache keys ---------------- */

const CP_ROOT_CACHE_KEY = "tms_cp_dashboard_cache_v1";
const CP_CENTRE_CACHE_KEY = "tms_cp_centre_cache_v1";
const CP_BATCHES_CACHE_KEY = "tms_cp_batches_cache_v1";

/* ---------------- helpers ---------------- */

function normalizeMediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://66.116.207.88/")) {
    return url.replace("http://66.116.207.88/", "http://66.116.207.88:8088/");
  }
  return url;
}

function loadJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveJson(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), payload }));
  } catch {}
}

function fmtDate(iso) {
  try {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN");
  } catch {
    return iso || "-";
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

/* ================= MAIN DASHBOARD ================= */

export default function CpDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loadingCentreChain, setLoadingCentreChain] = useState(false);
  const [cpRecord, setCpRecord] = useState(null);
  const [centreLink, setCentreLink] = useState(null);
  const [centre, setCentre] = useState(
    () => loadJson(CP_CENTRE_CACHE_KEY)?.payload || null
  );

  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batches, setBatches] = useState(
    () => loadJson(CP_BATCHES_CACHE_KEY)?.payload || []
  );

  // load root cache (CP + link + centreId)
  useEffect(() => {
    if (!user?.id) return;
    const cached = loadJson(CP_ROOT_CACHE_KEY);
    if (cached?.payload?.cpRecord) {
      setCpRecord(cached.payload.cpRecord);
      setCentreLink(cached.payload.centreLink || null);
    } else {
      fetchCentreChain(false);
    }
  }, [user?.id]);

  async function fetchCentreChain(force = false) {
    if (!user?.id) return;
    if (!force && cpRecord && centreLink) return;

    setLoadingCentreChain(true);
    try {
      // 1) contact person
      const cpResp = await api.get(
        `/tms/training-partner-contact-persons/?master_user=${user.id}`
      );
      const cp = cpResp?.data?.results?.[0] || null;
      setCpRecord(cp);

      if (!cp) {
        saveJson(CP_ROOT_CACHE_KEY, { cpRecord: null, centreLink: null });
        setCentre(null);
        setBatches([]);
        return;
      }

      // 2) centre link
      const linkResp = await api.get(
        `/tms/tpcp-centre-links/?contact_person=${cp.id}`
      );
      const link = linkResp?.data?.results?.[0] || null;
      setCentreLink(link);

      // 3) centre detail
      if (link?.allocated_centre) {
        const centreResp = await api.get(
          `/tms/training-partner-centres/${link.allocated_centre}/detail/`
        );
        const centreData = centreResp?.data || null;
        setCentre(centreData);
        saveJson(CP_CENTRE_CACHE_KEY, centreData);
      } else {
        setCentre(null);
      }

      // cache root
      saveJson(CP_ROOT_CACHE_KEY, { cpRecord: cp, centreLink: link });
    } catch (e) {
      console.error("CP centre chain load failed", e);
    } finally {
      setLoadingCentreChain(false);
    }
  }

  async function handleRefreshCentre() {
    // clear caches related to centre chain
    try {
      localStorage.removeItem(CP_ROOT_CACHE_KEY);
      localStorage.removeItem(CP_CENTRE_CACHE_KEY);
    } catch {}
    setCpRecord(null);
    setCentreLink(null);
    setCentre(null);
    fetchCentreChain(true);
  }

  async function handleViewCentre() {
    if (!centre?.id) return;
    setViewLoading(true);
    try {
      const resp = await api.get(
        `/tms/training-partner-centres/${centre.id}/detail/`
      );
      setViewData(resp.data);
      setViewOpen(true);
    } catch (e) {
      console.error("cp view centre failed", e);
    } finally {
      setViewLoading(false);
    }
  }

  async function fetchBatches(force = false) {
    if (!centre?.id) return;
    if (!force) {
      const cached = loadJson(CP_BATCHES_CACHE_KEY);
      if (cached?.payload) {
        setBatches(cached.payload || []);
        return;
      }
    }
    setBatchesLoading(true);
    try {
      const resp = await TMS_API.batches.list({
        centre: centre.id,
        page_size: 500,
      });
      const items = resp?.data?.results || [];
      setBatches(items);
      saveJson(CP_BATCHES_CACHE_KEY, items);
    } catch (e) {
      console.error("cp batches fetch failed", e);
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }

  useEffect(() => {
    if (centre?.id) {
      fetchBatches(false);
    }
  }, [centre?.id]);

  const hasCentre = !!centre;
  const cpName =
    cpRecord?.name || user?.first_name || user?.username || "Contact Person";

  const ongoingBatches = useMemo(
    () => batches.filter((b) => (b.status || "").toUpperCase() === "ONGOING"),
    [batches]
  );

  return (
    <div className="app-shell">
      <TmsLeftNav />
      <div className="main-area">
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2 style={{ marginTop: 8 }}>Welcome, {cpName}</h2>
            <div className="muted" style={{ marginBottom: 16 }}>
              Centre-level coordination for batches, logistics, attendance and
              media.
            </div>

            {/* My Centre section */}
            <div
              className="card"
              style={{ marginBottom: 20, padding: 18, borderRadius: 8 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 10,
                  gap: 8,
                }}
              >
                <h3 style={{ margin: 0 }}>My Centre</h3>
                <button
                  className="btn btn-sm"
                  style={{ marginLeft: "auto" }}
                  onClick={handleRefreshCentre}
                  disabled={loadingCentreChain}
                >
                  {loadingCentreChain ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              {loadingCentreChain ? (
                <div className="table-spinner">
                  Loading your contact person and centre mapping…
                </div>
              ) : !cpRecord ? (
                <div className="muted">
                  No Contact Person mapping found for this user.
                </div>
              ) : !centreLink || !hasCentre ? (
                <div className="muted">
                  No centre is currently linked to your Contact Person profile.
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Centre Name:</strong> {centre.venue_name}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Address:</strong> {centre.venue_address}
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Type:</strong> {centre.centre_type} &nbsp;|&nbsp;
                    <strong>Halls:</strong> {centre.training_hall_count}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button
                      className="btn"
                      onClick={handleViewCentre}
                      disabled={viewLoading}
                    >
                      {viewLoading ? "Opening…" : "View Centre Details"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Batch schedules section */}
            <div
              className="card"
              style={{ padding: 18, borderRadius: 8, marginBottom: 20 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <h3 style={{ margin: 0 }}>Batch Schedules for My Centre</h3>
                <button
                  className="btn btn-sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    try {
                      localStorage.removeItem(CP_BATCHES_CACHE_KEY);
                    } catch {}
                    fetchBatches(true);
                  }}
                  disabled={batchesLoading || !hasCentre}
                >
                  {batchesLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
              <div className="muted" style={{ marginBottom: 8 }}>
                Upcoming and ongoing batches scheduled at your centre.
              </div>

              {!hasCentre ? (
                <div className="muted">
                  Link a centre to your Contact Person profile to see batches.
                </div>
              ) : batchesLoading ? (
                <div className="table-spinner">
                  Loading batches for your centre…
                </div>
              ) : batches.length === 0 ? (
                <div className="muted">No batches found for this centre.</div>
              ) : (
                <div style={{ maxHeight: 420, overflow: "auto" }}>
                  <table className="table table-compact">
                    <thead>
                      <tr>
                        <th>S.No.</th>
                        <th>Batch Code</th>
                        <th>Status</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Type</th>
                        <th>Participants</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((b, idx) => (
                        <tr key={b.id}>
                          <td>{idx + 1}</td>
                          <td>{b.code}</td>
                          <td>{b.status}</td>
                          <td>{fmtDate(b.start_date)}</td>
                          <td>{fmtDate(b.end_date)}</td>
                          <td>{b.batch_type}</td>
                          <td>
                            {Array.isArray(b.beneficiary)
                              ? b.beneficiary.length
                              : "-"}
                          </td>
                          <td>
                            <button
                              className="btn-sm btn-flat"
                              onClick={() =>
                                navigate(`/tms/cp/batch-detail/${b.id}`)
                              }
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {ongoingBatches.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 6,
                    background: "#ecfdf5",
                    border: "1px solid #bbf7d0",
                    fontSize: 13,
                  }}
                >
                  <strong>Note:</strong> You have {ongoingBatches.length}{" "}
                  ongoing batch(es). Use the View Button to start attendance and
                  eKYC verification.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <CentreViewModal
        open={viewOpen}
        data={viewData || centre}
        onClose={() => setViewOpen(false)}
      />
    </div>
  );
}
