import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API, LOOKUP_API } from "../../../api/axios";

/* ===================== CONSTANTS ===================== */

const STEPS = ["Basic", "Address", "Facilities", "Rooms", "Media"];
const EMPTY_ROOM = { room_name: "", room_capacity: 20 };
const EMPTY_MEDIA = { category: "OTHER", file: null, notes: "", id: null };

/* ===================== CONFIRM MODAL ===================== */

function ConfirmModal({ open, payload, onClose, onConfirm, submitting }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 900 }}>
        <h3>
          Confirm Training Centre{" "}
          {payload?.centreId ? "Update" : "Registration"}
        </h3>

        {submitting ? (
          <div style={{ padding: 30, textAlign: "center" }}>
            <strong>Registering Your Centre, Please Wait…</strong>
          </div>
        ) : (
          <>
            <pre style={{ maxHeight: 350, overflow: "auto", fontSize: 12 }}>
              {JSON.stringify(payload, null, 2)}
            </pre>
            <div style={{ textAlign: "right", marginTop: 12 }}>
              <button className="btn-outline" onClick={onClose}>
                Edit
              </button>{" "}
              <button className="btn" onClick={onConfirm}>
                Confirm Submission
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===================== MAIN ===================== */

export default function TpCentreRegistration() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { centreId } = useParams(); // 👈 EDIT MODE

  const isEdit = Boolean(centreId);

  const [step, setStep] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ===================== LOOKUPS ===================== */

  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [panchayats, setPanchayats] = useState([]);
  const [villages, setVillages] = useState([]);

  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingPanchayats, setLoadingPanchayats] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  /* ===================== FORM STATE ===================== */

  const [centre, setCentre] = useState({
    serial_number: "",
    venue_name: "",
    centre_type: "",
    venue_address: "",
    district: "",
    block: "",
    panchayat: "",
    village: "",
    security_arrangements: "",
    toilets_bathrooms: 1,
    power_water_facility: "",
    medical_kit: false,
    open_space: false,
    field_visit_facility: false,
    transport_facility: false,
    dining_facility: false,
    other_details: "",
    training_hall_count: 1,
    training_hall_capacity: 20,
  });

  const [rooms, setRooms] = useState([{ ...EMPTY_ROOM }]);
  const [media, setMedia] = useState([{ ...EMPTY_MEDIA }]);

  /* ===================== LOAD DISTRICTS ===================== */

  useEffect(() => {
    LOOKUP_API.districts
      .list({ page_size: 100 })
      .then((r) => setDistricts(r?.data?.results || []));
  }, []);

  /* ===================== LOAD EDIT DATA ===================== */

  useEffect(() => {
    if (!isEdit) return;

    async function loadCentre() {
      const c = await TMS_API.trainingPartnerCentres.retrieve(centreId);
      const centreData = c.data;

      setCentre({
        ...centreData,
        district: centreData.district || "",
        block: centreData.block || "",
        panchayat: centreData.panchayat || "",
        village: centreData.village || "",
      });

      const r = await TMS_API.trainingPartnerCentreRooms.list({
        centre: centreId,
      });
      setRooms(
        r.data.results.map((x) => ({
          id: x.id,
          room_name: x.room_name,
          room_capacity: x.room_capacity,
        }))
      );

      const m = await TMS_API.trainingPartnerSubmissions.list({
        centre: centreId,
      });
      setMedia(
        m.data.results.map((x) => ({
          id: x.id,
          category: x.category,
          file: null,
          notes: x.notes || "",
          existing_url: x.file,
        }))
      );
    }

    loadCentre();
  }, [centreId, isEdit]);

  /* ===================== CASCADING LOOKUPS ===================== */

  useEffect(() => {
    if (!centre.district) return;
    setLoadingBlocks(true);
    LOOKUP_API.blocks
      .retrieve(centre.district, { page_size: 100 })
      .then((r) => setBlocks(r?.data?.results || []))
      .finally(() => setLoadingBlocks(false));
  }, [centre.district]);

  useEffect(() => {
    if (!centre.block) return;
    setLoadingPanchayats(true);
    LOOKUP_API.panchayats
      .retrieve(centre.block, { page_size: 100 })
      .then((r) => setPanchayats(r?.data?.results || []))
      .finally(() => setLoadingPanchayats(false));
  }, [centre.block]);

  useEffect(() => {
    if (!centre.panchayat) return;
    setLoadingVillages(true);
    LOOKUP_API.villages
      .retrieve(centre.panchayat, { page_size: 100 })
      .then((r) => setVillages(r?.data?.results || []))
      .finally(() => setLoadingVillages(false));
  }, [centre.panchayat]);

  /* ===================== SUBMIT ===================== */

  async function handleConfirmSubmit() {
    setSubmitting(true);
    try {
      const tp = await TMS_API.trainingPartners.list({
        search: user.id,
        fields: "id",
      });
      const partnerId = tp?.data?.results?.[0]?.id;
      if (!partnerId) throw new Error("Training Partner not found");

      const centrePayload = {
        ...centre,
        partner: partnerId,
        created_by: user.id,
        toilets_bathrooms: Number(centre.toilets_bathrooms),
        training_hall_count: Number(centre.training_hall_count),
        training_hall_capacity: Number(centre.training_hall_capacity),
      };

      const centreResp = isEdit
        ? await TMS_API.trainingPartnerCentres.update(centreId, centrePayload)
        : await TMS_API.trainingPartnerCentres.create(centrePayload);

      const finalCentreId = centreResp.data.id;

      for (const r of rooms) {
        if (!r.room_name) continue;

        if (r.id) {
          await TMS_API.trainingPartnerCentreRooms.update(r.id, r);
        } else {
          await TMS_API.trainingPartnerCentreRooms.create({
            ...r,
            centre: finalCentreId,
            created_by: user.id,
          });
        }
      }

      for (const m of media) {
        if (m.id || !m.file) continue;

        const fd = new FormData();
        fd.append("partner", partnerId);
        fd.append("centre", finalCentreId);
        fd.append("category", m.category);
        fd.append("file", m.file);
        fd.append("created_by", user.id);
        if (m.notes) fd.append("notes", m.notes);

        await TMS_API.trainingPartnerSubmissions.create(fd);
      }

      alert(
        `Training Centre ${isEdit ? "updated" : "registered"} successfully`
      );
      navigate("/tms/tp/centre-list");
    } catch (e) {
      console.error(e);
      alert("Failed to submit centre");
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  /* ===================== TABLE HELPERS ===================== */

  const row = (key, label, field) => (
    <tr key={key}>
      <td style={{ border: "1px solid #ccc", padding: 8, width: "30%" }}>
        <label>{label}</label>
      </td>
      <td style={{ border: "1px solid #ccc", padding: 8 }}>{field}</td>
    </tr>
  );

  const table = (rows, key) => (
    <table
      key={key}
      style={{
        width: "100%",
        borderCollapse: "collapse",
        border: "1px solid #ccc",
        marginBottom: 20,
      }}
    >
      <tbody>{rows}</tbody>
    </table>
  );

  /* ===================== RENDER ===================== */

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu —{" "}
              {isEdit ? "Edit Training Centre" : "New Training Centre"}
            </div>
          }
        />

        <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
          <div className="stepper">
            {STEPS.map((s, i) => (
              <button
                key={s}
                className={i === step ? "step active" : "step"}
                onClick={() => setStep(i)}
              >
                {i + 1}. {s}
              </button>
            ))}
          </div>

          {/* ===================== BASIC ===================== */}
          {step === 0 &&
            table(
              [
                row(
                  "sn",
                  "Serial Number",
                  <input
                    value={centre.serial_number}
                    onChange={(e) =>
                      setCentre({ ...centre, serial_number: e.target.value })
                    }
                  />
                ),
                row(
                  "name",
                  "Centre Name",
                  <input
                    value={centre.venue_name}
                    onChange={(e) =>
                      setCentre({ ...centre, venue_name: e.target.value })
                    }
                  />
                ),
                row(
                  "type",
                  "Centre Type",
                  <select
                    value={centre.centre_type}
                    onChange={(e) =>
                      setCentre({ ...centre, centre_type: e.target.value })
                    }
                  >
                    <option value="">Select</option>
                    <option value="PRIVATE">Private</option>
                    <option value="GOVERNMENT">Government</option>
                    <option value="LODGE">Lodge</option>
                    <option value="RENTED">Rented</option>
                    <option value="OTHERS">Others</option>
                  </select>
                ),
              ],
              "basic"
            )}

          {/* ===================== ADDRESS ===================== */}
          {step === 1 &&
            table(
              [
                row(
                  "addr",
                  "Centre Address",
                  <input
                    value={centre.venue_address}
                    onChange={(e) =>
                      setCentre({ ...centre, venue_address: e.target.value })
                    }
                  />
                ),
                row(
                  "dist",
                  "District",
                  <select
                    value={centre.district}
                    onChange={(e) =>
                      setCentre({ ...centre, district: e.target.value })
                    }
                  >
                    <option value="">Select District</option>
                    {districts.map((d) => (
                      <option key={d.district_id} value={d.district_id}>
                        {d.district_name_en}
                      </option>
                    ))}
                  </select>
                ),
                row(
                  "block",
                  "Block",
                  loadingBlocks ? (
                    "Loading…"
                  ) : (
                    <select
                      value={centre.block}
                      onChange={(e) =>
                        setCentre({ ...centre, block: e.target.value })
                      }
                    >
                      <option value="">Select Block</option>
                      {blocks.map((b) => (
                        <option key={b.block_id} value={b.block_id}>
                          {b.block_name_en}
                        </option>
                      ))}
                    </select>
                  )
                ),
                row(
                  "pan",
                  "Panchayat",
                  loadingPanchayats ? (
                    "Loading…"
                  ) : (
                    <select
                      value={centre.panchayat}
                      onChange={(e) =>
                        setCentre({ ...centre, panchayat: e.target.value })
                      }
                    >
                      <option value="">Select Panchayat</option>
                      {panchayats.map((p) => (
                        <option key={p.panchayat_id} value={p.panchayat_id}>
                          {p.panchayat_name_en}
                        </option>
                      ))}
                    </select>
                  )
                ),
                row(
                  "vill",
                  "Village",
                  loadingVillages ? (
                    "Loading…"
                  ) : (
                    <select
                      value={centre.village}
                      onChange={(e) =>
                        setCentre({ ...centre, village: e.target.value })
                      }
                    >
                      <option value="">Select Village</option>
                      {villages.map((v) => (
                        <option key={v.village_id} value={v.village_id}>
                          {v.village_name_english}
                        </option>
                      ))}
                    </select>
                  )
                ),
              ],
              "address"
            )}

          {/* ===================== FACILITIES ===================== */}
          {step === 2 &&
            table(
              [
                row(
                  "sec",
                  "Security Arrangements",
                  <input
                    value={centre.security_arrangements}
                    onChange={(e) =>
                      setCentre({
                        ...centre,
                        security_arrangements: e.target.value,
                      })
                    }
                  />
                ),
                row(
                  "toilet",
                  "Total Toilets / Bathrooms",
                  <input
                    type="number"
                    min="1"
                    value={centre.toilets_bathrooms}
                    onChange={(e) =>
                      setCentre({
                        ...centre,
                        toilets_bathrooms: e.target.value,
                      })
                    }
                  />
                ),
                row(
                  "power",
                  "Power / Water Availability",
                  <select
                    value={centre.power_water_facility}
                    onChange={(e) =>
                      setCentre({
                        ...centre,
                        power_water_facility: e.target.value,
                      })
                    }
                  >
                    <option value="">Select</option>
                    <option value="REGULAR">Regular</option>
                    <option value="LIMITED">Limited</option>
                    <option value="SCARCE">Scarce</option>
                  </select>
                ),
                ...[
                  ["medical_kit", "Medical Kit Available"],
                  ["open_space", "Open Space Available"],
                  ["field_visit_facility", "Field Visit Facility"],
                  ["transport_facility", "Transport Facility"],
                  ["dining_facility", "Dining Facility"],
                ].map(([k, label]) =>
                  row(
                    k,
                    label,
                    <>
                      <label>
                        <input
                          type="radio"
                          checked={centre[k] === true}
                          onChange={() => setCentre({ ...centre, [k]: true })}
                        />{" "}
                        Yes
                      </label>{" "}
                      <label>
                        <input
                          type="radio"
                          checked={centre[k] === false}
                          onChange={() => setCentre({ ...centre, [k]: false })}
                        />{" "}
                        No
                      </label>
                    </>
                  )
                ),
                row(
                  "other",
                  "Other Details",
                  <textarea
                    value={centre.other_details}
                    onChange={(e) =>
                      setCentre({ ...centre, other_details: e.target.value })
                    }
                  />
                ),
              ],
              "facilities"
            )}

          {/* ===================== ROOMS ===================== */}
          {step === 3 && (
            <>
              {table(
                [
                  row(
                    "hc",
                    "Total Training Halls",
                    <input
                      type="number"
                      min="1"
                      value={centre.training_hall_count}
                      onChange={(e) =>
                        setCentre({
                          ...centre,
                          training_hall_count: e.target.value,
                        })
                      }
                    />
                  ),
                  row(
                    "cap",
                    "Avg Training Hall Capacity",
                    <input
                      type="number"
                      min="1"
                      value={centre.training_hall_capacity}
                      onChange={(e) =>
                        setCentre({
                          ...centre,
                          training_hall_capacity: e.target.value,
                        })
                      }
                    />
                  ),
                ],
                "rooms-main"
              )}

              {rooms.map((r, i) =>
                table(
                  [
                    row(
                      `rn_${i}`,
                      "Hall Name",
                      <input
                        value={r.room_name}
                        onChange={(e) => {
                          const c = [...rooms];
                          c[i].room_name = e.target.value;
                          setRooms(c);
                        }}
                      />
                    ),
                    row(
                      `rc_${i}`,
                      "Hall Capacity",
                      <input
                        type="number"
                        min="1"
                        value={r.room_capacity}
                        onChange={(e) => {
                          const c = [...rooms];
                          c[i].room_capacity = e.target.value;
                          setRooms(c);
                        }}
                      />
                    ),
                    row(
                      `rd_${i}`,
                      "Action",
                      <button
                        className="btn-danger"
                        onClick={() =>
                          setRooms(rooms.filter((_, idx) => idx !== i))
                        }
                      >
                        Delete
                      </button>
                    ),
                  ],
                  `room_${i}`
                )
              )}

              <button
                className="btn"
                onClick={() => setRooms([...rooms, { ...EMPTY_ROOM }])}
              >
                + Add Room
              </button>
            </>
          )}

          {/* ===================== MEDIA ===================== */}
          {step === 4 && (
            <>
              {media.map((m, i) =>
                table(
                  [
                    row(
                      `mc_${i}`,
                      "Media Category",
                      <select
                        value={m.category}
                        onChange={(e) => {
                          const c = [...media];
                          c[i].category = e.target.value;
                          setMedia(c);
                        }}
                      >
                        {[
                          "FOODING",
                          "TOILET",
                          "CENTRE_FRONT",
                          "HOSTEL",
                          "CCTV_SECURITY",
                          "ACTIVITY_HALL",
                          "OTHER",
                        ].map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    ),
                    row(
                      `mf_${i}`,
                      "Upload File",
                      <input
                        type="file"
                        onChange={(e) => {
                          const c = [...media];
                          c[i].file = e.target.files[0];
                          setMedia(c);
                        }}
                      />
                    ),
                    row(
                      `mn_${i}`,
                      "Notes",
                      <input
                        value={m.notes}
                        onChange={(e) => {
                          const c = [...media];
                          c[i].notes = e.target.value;
                          setMedia(c);
                        }}
                      />
                    ),
                    row(
                      `md_${i}`,
                      "Action",
                      <button
                        className="btn-danger"
                        onClick={() =>
                          setMedia(media.filter((_, idx) => idx !== i))
                        }
                      >
                        Delete
                      </button>
                    ),
                  ],
                  `media_${i}`
                )
              )}

              <button
                className="btn"
                onClick={() => setMedia([...media, { ...EMPTY_MEDIA }])}
              >
                + Add Media
              </button>
            </>
          )}

          {/* ===================== ACTIONS ===================== */}
          <div style={{ textAlign: "right", marginTop: 20 }}>
            {step > 0 && (
              <button className="btn-outline" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}{" "}
            {step < STEPS.length - 1 ? (
              <button className="btn" onClick={() => setStep(step + 1)}>
                Next
              </button>
            ) : (
              <button
                className="btn"
                disabled={submitting}
                onClick={() => setConfirmOpen(true)}
              >
                Register Centre
              </button>
            )}
          </div>
        </main>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmOpen}
        payload={{ centre, rooms, media, centreId }}
        submitting={submitting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  );
}
