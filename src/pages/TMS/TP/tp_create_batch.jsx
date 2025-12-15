// src/pages/TMS/TP/tp_create_batch.jsx
import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api, { TMS_API, LOOKUP_API } from "../../../api/axios"; // shared axios instance with interceptors [web:39][web:40]

/* =========================================================
   CONSTANTS & LIMITS
========================================================= */

const PARTICIPANT_PAGE_SIZE = 10;
const MAX_BATCH_PARTICIPANTS = 50;

/* =========================================================
   HELPERS (FROM TP CENTRE LIST)
========================================================= */

function normalizeMediaUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://66.116.207.88/")) {
    return url.replace("http://66.116.207.88/", "http://66.116.207.88:8088/");
  }
  return url;
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

/* =========================================================
   OTHER UTILITIES
========================================================= */

function rand5() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out.toUpperCase();
}

function generateBatchCode(blockName, districtName) {
  const blk = (blockName || "").substring(0, 3).toUpperCase();
  const dis = (districtName || "").substring(0, 3).toUpperCase();

  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);

  return `${blk}-${dis}-${mm}${yy}-${rand5()}`;
}

function calcEndDate(startDate, days) {
  if (!startDate || !days) return null;
  const d = new Date(startDate);
  d.setDate(d.getDate() + Number(days) - 1);
  return d.toISOString().split("T")[0];
}

function isParticipantFree(p) {
  return !p.remarks || p.remarks.trim() === "";
}

/* =========================================================
   PARTICIPANT TABLE (PER TR)
========================================================= */

function ParticipantTable({
  trId,
  title,
  cache,
  setCache,
  selected,
  setSelected,
  trainingType,
  batchKey,
  usedIdsAcrossBatches,
  blockNamesCache,
  setBlockNamesCache,
  markBatchTouched,
}) {
  const pageData = cache[trId];
  if (!pageData) return null;

  const { list, page } = pageData;
  const availableList = list.filter((p) => !usedIdsAcrossBatches.has(p.id));

  const start = (page - 1) * PARTICIPANT_PAGE_SIZE;
  const slice = availableList.slice(start, start + PARTICIPANT_PAGE_SIZE);

  function toggle(p) {
    if (!isParticipantFree(p)) return;
    setSelected((prev) => {
      const perBatch = prev[batchKey] || {};
      const curr = perBatch[trId] || [];
      const exists = curr.find((x) => x.id === p.id);
      const nextForTr = exists
        ? curr.filter((x) => x.id !== p.id)
        : [...curr, p];
      return {
        ...prev,
        [batchKey]: {
          ...perBatch,
          [trId]: nextForTr,
        },
      };
    });
    markBatchTouched(batchKey);
  }

  const selectedForBatch = selected[batchKey] || {};

  async function ensureBlockName(blockId) {
    if (!blockId || blockNamesCache[blockId]) return;
    try {
      const resp = await LOOKUP_API.block_detail.retrieve(blockId, {
        fields: "block_name_en",
      });
      const name = resp?.data?.block_name_en || "";
      setBlockNamesCache((prev) => ({ ...prev, [blockId]: name }));
    } catch {
      setBlockNamesCache((prev) => ({ ...prev, [blockId]: "" }));
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h4>{title}</h4>

      <table className="table table-compact">
        <thead>
          <tr>
            <th />
            <th>Name</th>
            <th>Mobile</th>
            <th>Block</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {slice.map((p) => {
            const blockId =
              trainingType === "BENEFICIARY" ? p.block : p.block;
            if (blockId) {
              ensureBlockName(blockId);
            }
            const blockName = blockId ? blockNamesCache[blockId] || "" : "";

            return (
              <tr key={p.id}>
                <td>
                  <input
                    type="checkbox"
                    disabled={!isParticipantFree(p)}
                    checked={(selectedForBatch[trId] || []).some(
                      (x) => x.id === p.id
                    )}
                    onChange={() => toggle(p)}
                  />
                </td>
                <td>{p.full_name || p.member_name}</td>
                <td>{p.mobile_no || p.mobile}</td>
                <td>{blockName || "-"}</td>
                <td>{p.remarks || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn-sm"
          disabled={page === 1}
          onClick={() =>
            setCache((c) => ({
              ...c,
              [trId]: { ...pageData, page: page - 1 },
            }))
          }
        >
          ◀ Prev
        </button>
        <button
          className="btn-sm"
          disabled={start + PARTICIPANT_PAGE_SIZE >= availableList.length}
          onClick={() =>
            setCache((c) => ({
              ...c,
              [trId]: { ...pageData, page: page + 1 },
            }))
          }
        >
          Next ▶
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   COMBINED PARTICIPANT SELECTOR
========================================================= */

function CombinedParticipantSelector({
  trainingReq,
  participantCache,
  setParticipantCache,
  selectedParticipants,
  setSelectedParticipants,
  batchKey,
  usedIdsAcrossBatches,
  blockNamesCache,
  setBlockNamesCache,
  markBatchTouched,
}) {
  const [blocks, setBlocks] = useState([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [loadingTRs, setLoadingTRs] = useState(false);
  const [blockTRs, setBlockTRs] = useState([]);
  const [loadingTRParticipants, setLoadingTRParticipants] = useState({});

  const districtId = trainingReq?.district?.district_id;
  const baseTrainingPlanId = trainingReq?.training_plan?.id;
  const baseStatus = trainingReq?.status;
  const baseType = trainingReq?.training_type;
  const openedTRId = trainingReq?.id;

  useEffect(() => {
    if (!districtId) return;
    setLoadingBlocks(true);
    LOOKUP_API.blocks
      .retrieve(districtId, { page_size: 100 })
      .then((r) => setBlocks(r?.data?.results || []))
      .finally(() => setLoadingBlocks(false));
  }, [districtId]);

  async function loadTRsForBlock(blockId) {
    if (!blockId || !baseTrainingPlanId || !baseType || !baseStatus) return;
    setLoadingTRs(true);
    try {
      const resp = await api.get("/tms/training-requests/", {
        params: {
          block: blockId,
          training_plan: baseTrainingPlanId,
          status: baseStatus,
          training_type: baseType,
        },
      });
      const results = (resp?.data?.results || []).filter(
        (tr) => tr.id !== openedTRId
      );
      setBlockTRs(results);
    } finally {
      setLoadingTRs(false);
    }
  }

  async function loadParticipantsForTR(tr) {
    if (participantCache[tr.id]) return;
    setLoadingTRParticipants((s) => ({ ...s, [tr.id]: true }));
    try {
      const resp = await api.get(`/tms/training-requests/${tr.id}/detail/`);
      const list =
        baseType === "BENEFICIARY"
          ? resp.data.beneficiary_registrations
          : resp.data.trainer_registrations;
      setParticipantCache((old) => ({
        ...old,
        [tr.id]: {
          list: list.filter(isParticipantFree),
          page: 1,
          total: list.length,
        },
      }));
    } finally {
      setLoadingTRParticipants((s) => ({ ...s, [tr.id]: false }));
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h4>Select Participants from other Blocks</h4>
      <p>
        Use this only to fill batch size after selecting from current Training
        Request.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <label>Block</label>
          <select
            className="input"
            value={selectedBlockId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedBlockId(val);
              setBlockTRs([]);
              if (val) loadTRsForBlock(val);
            }}
          >
            <option value="">-- Select Block --</option>
            {loadingBlocks ? (
              <option>Loading…</option>
            ) : (
              blocks.map((b) => (
                <option key={b.block_id} value={b.block_id}>
                  {b.block_name_en}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {loadingTRs ? (
        <p>Searching Training Requests…</p>
      ) : blockTRs.length === 0 ? (
        <p>No Training Requests found for this block.</p>
      ) : (
        <div style={{ marginTop: 8 }}>
          <h5>Training Requests in selected block</h5>
          <table className="table table-compact">
            <thead>
              <tr>
                <th>TR ID</th>
                <th>Block</th>
                <th>Participants</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {blockTRs.map((tr) => (
                <tr key={tr.id}>
                  <td>{tr.id}</td>
                  <td>{tr.block?.block_name_en}</td>
                  <td>
                    {baseType === "BENEFICIARY"
                      ? tr.beneficiary_count
                      : tr.trainer_count}
                  </td>
                  <td>
                    <button
                      className="btn-sm"
                      disabled={loadingTRParticipants[tr.id]}
                      onClick={() => loadParticipantsForTR(tr)}
                    >
                      {loadingTRParticipants[tr.id]
                        ? "Loading…"
                        : "Select Participants"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {blockTRs.map((tr) =>
            participantCache[tr.id] ? (
              <ParticipantTable
                key={tr.id}
                trId={tr.id}
                title={`Participants of TR #${tr.id}`}
                cache={participantCache}
                setCache={setParticipantCache}
                selected={selectedParticipants}
                setSelected={setSelectedParticipants}
                trainingType={baseType}
                batchKey={batchKey}
                usedIdsAcrossBatches={usedIdsAcrossBatches}
                blockNamesCache={blockNamesCache}
                setBlockNamesCache={setBlockNamesCache}
                markBatchTouched={markBatchTouched}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PREVIEW MODAL
========================================================= */

function PreviewModal({ open, payload, onClose, onConfirm, disabled }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 900 }}>
        <h3>Preview Batch Creation Payload</h3>

        <pre
          style={{
            maxHeight: 400,
            overflow: "auto",
            background: "#111",
            color: "#0f0",
            padding: 12,
            fontSize: 12,
          }}
        >
          {JSON.stringify(payload, null, 2)}
        </pre>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn-outline" onClick={onClose}>
            Back
          </button>
          <button
            className="btn btn-primary"
            disabled={disabled}
            onClick={onConfirm}
          >
            Propose to DMMU
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SUBMIT SECTION + EXECUTION
========================================================= */

function BatchSubmitSection({
  disabled,
  trainingReq,
  batches,
  participantSelections,
  user,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [payload, setPayload] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function buildPayload() {
    const batchItems = batches.map((b) => {
      const perBatchSel = participantSelections[b.key] || {};
      const allParticipants = Object.values(perBatchSel).flat();

      const batchPayload = {
        request: trainingReq.id,
        centre: b.centre.id,
        batch_type: b.batchType,
        start_date: b.startDate,
        end_date: b.endDate,
        status: "PENDING",
        code: generateBatchCode(
          trainingReq.block?.block_name_en,
          trainingReq.district?.district_name_en
        ),
        created_by: user.id,
      };

      const participantPayload = allParticipants.map((p) => ({
        id: p.id,
        tr: p.training,
      }));

      return {
        batch: batchPayload,
        participants: participantPayload,
      };
    });

    return { batches: batchItems };
  }

  async function execute() {
    setSubmitting(true);
    try {
      for (const item of payload.batches) {
        const { batch, participants } = item;

        const b = await TMS_API.batches.create(batch);

        for (const p of participants) {
          if (trainingReq.training_type === "BENEFICIARY") {
            await TMS_API.batchBeneficiaries.create({
              batch: b.data.id,
              beneficiary: p.id,
              created_by: user.id,
            });
          } else {
            await TMS_API.batchTrainers.create({
              batch: b.data.id,
              trainer: p.id,
              created_by: user.id,
            });
          }

          await api.patch(
            `/tms/${
              trainingReq.training_type === "BENEFICIARY"
                ? "training-request-beneficiaries"
                : "training-request-trainers"
            }/${p.id}/`,
            {
              remarks: `COMBINED WITH TR - ${trainingReq.id}`,
            }
          );
        }
      }

      const hasCombined = batches.some((b) => b.batchType === "COMBINED");

      const baseList =
        trainingReq.training_type === "BENEFICIARY"
          ? trainingReq.beneficiary_registrations
          : trainingReq.trainer_registrations;
      const baseIds = baseList.filter(isParticipantFree).map((x) => x.id);

      const allSelectedFromThisTR = Object.values(participantSelections)
        .flatMap((perBatch) => Object.values(perBatch).flat())
        .filter((p) => p.training === trainingReq.id)
        .map((p) => p.id);

      let shouldUpdateTRStatus = true;

      if (hasCombined) {
        shouldUpdateTRStatus =
          baseIds.length > 0 &&
          baseIds.every((id) => allSelectedFromThisTR.includes(id));
      }

      if (shouldUpdateTRStatus) {
        await api.patch(`/tms/training-requests/${trainingReq.id}/`, {
          status: "PENDING",
          updated_by: user.id,
        });
      }

      alert("Batches proposed to DMMU successfully");
      window.location.href = "/tms/training-requests";
    } catch (e) {
      console.error(e);
      alert("Failed to create batches");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="btn btn-primary"
        disabled={disabled}
        onClick={() => {
          const p = buildPayload();
          setPayload(p);
          setPreviewOpen(true);
        }}
      >
        Preview All Created Batches
      </button>

      <PreviewModal
        open={previewOpen}
        payload={payload}
        disabled={submitting}
        onClose={() => setPreviewOpen(false)}
        onConfirm={execute}
      />
    </>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function TpCreateBatch() {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const requestId = id;

  const [loadingTR, setLoadingTR] = useState(true);
  const [trainingReq, setTrainingReq] = useState(null);
  const [themeName, setThemeName] = useState("");

  const [participantCache, setParticipantCache] = useState({});

  const [batches, setBatches] = useState([
    {
      key: "batch-1",
      title: "Batch 1",
      batchType: "",
      centre: null,
      startDate: "",
      endDate: "",
      expanded: true,
      errors: [],
      touched: false,
    },
  ]);

  const [participantSelections, setParticipantSelections] = useState({});

  const [loadingCentres, setLoadingCentres] = useState(false);
  const [centres, setCentres] = useState([]);
  const [centrePreview, setCentrePreview] = useState(null);
  const [viewLoadingId, setViewLoadingId] = useState(null);

  const [globalErrors, setGlobalErrors] = useState([]);

  const [blockNamesCache, setBlockNamesCache] = useState({});

  useEffect(() => {
    async function loadTR() {
      setLoadingTR(true);
      try {
        const r = await api.get(`/tms/training-requests/${requestId}/detail/`);
        setTrainingReq(r.data);

        if (r.data.training_plan?.theme) {
          const t = await api.get(
            `/tms/training-themes/${r.data.training_plan.theme}/`
          );
          setThemeName(t.data.theme_name);
        }

        const seed = {};
        const list =
          r.data.training_type === "BENEFICIARY"
            ? r.data.beneficiary_registrations
            : r.data.trainer_registrations;

        seed[requestId] = {
          list: list.filter(isParticipantFree),
          page: 1,
          total: list.length,
        };
        setParticipantCache(seed);
      } finally {
        setLoadingTR(false);
      }
    }

    loadTR();
  }, [requestId]);

  useEffect(() => {
    if (!user?.id) return;

    async function loadCentres() {
      setLoadingCentres(true);
      try {
        const tp = await TMS_API.trainingPartners.list({
          search: user.id,
          fields: "id",
        });
        const tpId = tp?.data?.results?.[0]?.id;
        if (!tpId) return;

        const c = await TMS_API.trainingPartnerCentres.list({
          partner: tpId,
          page_size: 500,
        });
        setCentres(c?.data?.results || []);
      } finally {
        setLoadingCentres(false);
      }
    }

    loadCentres();
  }, [user]);

  const usedIdsAcrossBatches = useMemo(() => {
    const ids = new Set();
    Object.values(participantSelections).forEach((perBatch) => {
      Object.values(perBatch).forEach((arr) => {
        arr.forEach((p) => ids.add(p.id));
      });
    });
    return ids;
  }, [participantSelections]);

  useEffect(() => {
    // recalc errors for each batch based on current batch fields + selections
    setBatches((prev) =>
      prev.map((b) => {
        const perBatchSel = participantSelections[b.key] || {};
        const count = Object.values(perBatchSel).flat().length;
        const errs = [];

        if (!b.batchType) errs.push("Batch Type not selected");
        if (count === 0) errs.push("No participants selected");
        if (count > MAX_BATCH_PARTICIPANTS)
          errs.push("Participant limit exceeded (50 max)");
        if (!b.centre) errs.push("Centre not selected");
        if (!b.startDate) errs.push("Start date not selected");

        return { ...b, errors: errs };
      })
    );
  }, [participantSelections, centres.length, trainingReq, JSON.stringify(batches.map(b => ({
    key: b.key,
    batchType: b.batchType,
    centreId: b.centre?.id || null,
    startDate: b.startDate,
  })))]);

  useEffect(() => {
    const hasAnyErrors = batches.some(
      (b) => b.touched && b.errors.length > 0
    );
    setGlobalErrors(hasAnyErrors ? ["Please resolve errors in all batches"] : []);
  }, [batches]);

  function updateBatch(key, patch, markTouched = false) {
    setBatches((prev) =>
      prev.map((b) =>
        b.key === key
          ? { ...b, ...patch, touched: markTouched ? true : b.touched }
          : b
      )
    );
  }

  function markBatchTouched(key) {
    setBatches((prev) =>
      prev.map((b) =>
        b.key === key ? { ...b, touched: true } : b
      )
    );
  }

  function addBatch() {
    const idx = batches.length + 1;
    setBatches((prev) => [
      ...prev,
      {
        key: `batch-${idx}`,
        title: `Batch ${idx}`,
        batchType: "",
        centre: null,
        startDate: "",
        endDate: "",
        expanded: true,
        errors: [],
        touched: false,
      },
    ]);
  }

  function removeBatch(key) {
    if (batches.length === 1) return;
    setBatches((prev) => prev.filter((b) => b.key !== key));
    setParticipantSelections((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  async function handleViewCentre(id) {
    setViewLoadingId(id);
    try {
      const d = await api.get(
        `/tms/training-partner-centres/${id}/detail/`
      );
      setCentrePreview(d.data);
    } finally {
      setViewLoadingId(null);
    }
  }

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav left={<div className="app-title">Create Batches</div>} />

        <main style={{ padding: 18 }}>
          {loadingTR ? (
            <p>Loading Training Request…</p>
          ) : !trainingReq ? (
            <p>Training Request not found</p>
          ) : (
            <>
              <div className="card">
                <h3>{trainingReq.training_plan.training_name}</h3>
                <p>
                  Theme: <b>{themeName}</b>
                </p>
                <p>
                  Type: <b>{trainingReq.training_type}</b> | Level:{" "}
                  <b>{trainingReq.level}</b> | Status:{" "}
                  <b>{trainingReq.status}</b>
                </p>
                <p>
                  Location:{" "}
                  <b>
                    {trainingReq.district?.district_name_en} /{" "}
                    {trainingReq.block?.block_name_en}
                  </b>
                </p>
              </div>

              <div style={{ marginTop: 16, marginBottom: 8 }}>
                <button className="btn" onClick={addBatch}>
                  + Add Batch
                </button>
              </div>

              {batches.map((batch) => {
                const perBatchSel = participantSelections[batch.key] || {};
                const selectedList = Object.values(perBatchSel).flat();
                const count = selectedList.length;

                return (
                  <div
                    key={batch.key}
                    className="card"
                    style={{ marginTop: 12 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        updateBatch(batch.key, { expanded: !batch.expanded })
                      }
                    >
                      <h4 style={{ margin: 0, flex: 1 }}>
                        {batch.title}{" "}
                        <span style={{ fontSize: 12 }}>
                          ({count} participants)
                        </span>
                      </h4>
                      {batches.length > 1 && (
                        <button
                          className="btn-sm btn-outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBatch(batch.key);
                          }}
                        >
                          Delete
                        </button>
                      )}
                      <span style={{ marginLeft: 8 }}>
                        {batch.expanded ? "▲" : "▼"}
                      </span>
                    </div>

                    {batch.expanded && (
                      <div style={{ marginTop: 12 }}>
                        <div className="card" style={{ marginTop: 8 }}>
                          <label>Batch Type</label>
                          <select
                            className="input"
                            value={batch.batchType}
                            onChange={(e) =>
                              updateBatch(
                                batch.key,
                                { batchType: e.target.value },
                                true
                              )
                            }
                          >
                            <option value="">-- Select --</option>
                            <option value="SEPARATE">Separate</option>
                            <option value="COMBINED">Combined</option>
                          </select>
                        </div>

                        <ParticipantTable
                          trId={requestId}
                          title="Participants from this Training Request"
                          cache={participantCache}
                          setCache={setParticipantCache}
                          selected={participantSelections}
                          setSelected={setParticipantSelections}
                          trainingType={trainingReq.training_type}
                          batchKey={batch.key}
                          usedIdsAcrossBatches={usedIdsAcrossBatches}
                          blockNamesCache={blockNamesCache}
                          setBlockNamesCache={setBlockNamesCache}
                          markBatchTouched={markBatchTouched}
                        />

                        {selectedList.length > 0 && (
                          <div className="card" style={{ marginTop: 12 }}>
                            <h4>Selected Participants for this Batch</h4>
                            <table className="table table-compact">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Mobile</th>
                                  <th>TR ID</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedList.map((p) => (
                                  <tr key={`${p.training}-${p.id}`}>
                                    <td>{p.full_name || p.member_name}</td>
                                    <td>{p.mobile_no || p.mobile}</td>
                                    <td>{p.training}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {batch.batchType === "COMBINED" && (
                          <CombinedParticipantSelector
                            trainingReq={trainingReq}
                            participantCache={participantCache}
                            setParticipantCache={setParticipantCache}
                            selectedParticipants={participantSelections}
                            setSelectedParticipants={setParticipantSelections}
                            batchKey={batch.key}
                            usedIdsAcrossBatches={usedIdsAcrossBatches}
                            blockNamesCache={blockNamesCache}
                            setBlockNamesCache={setBlockNamesCache}
                            markBatchTouched={markBatchTouched}
                          />
                        )}

                        <div className="card" style={{ marginTop: 16 }}>
                          <h4>Allot Centre</h4>

                          {loadingCentres ? (
                            <p>Loading centres…</p>
                          ) : centres.length === 0 ? (
                            <p>No centres found. Please register a centre first.</p>
                          ) : (
                            <table className="table table-compact">
                              <thead>
                                <tr>
                                  <th />
                                  <th>Serial</th>
                                  <th>Centre</th>
                                  <th>Type</th>
                                  <th>Training Halls</th>
                                  <th />
                                </tr>
                              </thead>
                              <tbody>
                                {centres.map((c) => (
                                  <tr key={c.id}>
                                    <td>
                                      <input
                                        type="radio"
                                        checked={batch.centre?.id === c.id}
                                        onChange={() =>
                                          updateBatch(
                                            batch.key,
                                            { centre: c },
                                            true
                                          )
                                        }
                                      />
                                    </td>
                                    <td>{c.serial_number}</td>
                                    <td
                                      style={{ cursor: "pointer" }}
                                      onClick={() => handleViewCentre(c.id)}
                                    >
                                      {c.venue_name}
                                    </td>
                                    <td>{c.centre_type}</td>
                                    <td>{c.training_hall_count}</td>
                                    <td>
                                      <button
                                        className="btn-sm btn-flat"
                                        disabled={viewLoadingId === c.id}
                                        onClick={() => handleViewCentre(c.id)}
                                      >
                                        {viewLoadingId === c.id
                                          ? "Opening…"
                                          : "View"}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>

                        <div className="card" style={{ marginTop: 16 }}>
                          <label>Start Date</label>
                          <input
                            type="date"
                            className="input"
                            value={batch.startDate}
                            onChange={(e) => {
                              const sd = e.target.value;
                              const ed = trainingReq?.training_plan?.no_of_days
                                ? calcEndDate(
                                    sd,
                                    trainingReq.training_plan.no_of_days
                                  )
                                : "";
                              updateBatch(
                                batch.key,
                                {
                                  startDate: sd,
                                  endDate: ed,
                                },
                                true
                              );
                            }}
                          />
                          {batch.endDate && (
                            <p>
                              End Date: <b>{batch.endDate}</b>
                            </p>
                          )}
                        </div>

                        {batch.touched && batch.errors.length > 0 && (
                          <div className="card" style={{ marginTop: 16 }}>
                            <h4>Cannot proceed for this batch</h4>
                            <ul>
                              {batch.errors.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {globalErrors.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                  <h4>Overall issues</h4>
                  <ul>
                    {globalErrors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <BatchSubmitSection
                  disabled={globalErrors.length > 0}
                  trainingReq={trainingReq}
                  batches={batches}
                  participantSelections={participantSelections}
                  user={user}
                />
              </div>
            </>
          )}
        </main>
      </div>

      <CentreViewModal
        open={!!centrePreview}
        data={centrePreview}
        onClose={() => setCentrePreview(null)}
      />
    </div>
  );
}
