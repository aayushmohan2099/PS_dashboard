// src/pages/TMS/TP_CP/cp_batch_closure.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TmsLeftNav from "../layout/tms_LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api from "../../../api/axios";

function fmtDate(iso) {
  try {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN");
  } catch {
    return iso || "-";
  }
}

// simple YYYY-MM-DD traverser
function addDaysISO(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// map dropdown label -> BatchMedia CATEGORY_CHOICES value
const CATEGORY_OPTIONS = [
  { value: "FOODING", label: "Fooding" },
  { value: "CLASS", label: "Classroom" },
  { value: "TRAINING", label: "Pictures with Ongoing Training" },
  { value: "PARTICIPANTS", label: "Pictures with all Participants" },
  { value: "ATTENDANCE", label: "Pictures while Attendance" },
  { value: "OTHER", label: "Other" },
];

export default function CpBatchClosure() {
  const { user } = useContext(AuthContext) || {};
  const { id: batchId } = useParams(); // /tms/cp/batch-closure/:id
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [loadingBatch, setLoadingBatch] = useState(false);

  // closure request existence
  const [checkingClosure, setCheckingClosure] = useState(false);
  const [closureExists, setClosureExists] = useState(false);

  // mediaRows is a map: dateStr -> array of rows
  const [mediaByDate, setMediaByDate] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("Submitting closure request…");

  // costing form
  const [centreCost, setCentreCost] = useState("");
  const [hostelCost, setHostelCost] = useState("");
  const [foodingCost, setFoodingCost] = useState("");
  const [dressesCost, setDressesCost] = useState("");
  const [studyMaterialCost, setStudyMaterialCost] = useState("");

  const totalCost = useMemo(() => {
    const n = (v) => (v ? parseFloat(v) || 0 : 0);
    const sum =
      n(centreCost) +
      n(hostelCost) +
      n(foodingCost) +
      n(dressesCost) +
      n(studyMaterialCost);
    return sum.toFixed(2);
  }, [centreCost, hostelCost, foodingCost, dressesCost, studyMaterialCost]);

  // compute date list from batch start_date to end_date
  const dateList = useMemo(() => {
    if (!batch?.start_date || !batch?.end_date) return [];
    const start = batch.start_date; // assume YYYY-MM-DD
    const end = batch.end_date;
    if (!start || !end || start > end) return [];
    const dates = [];
    let cursor = start;
    while (cursor <= end) {
      dates.push(cursor);
      cursor = addDaysISO(cursor, 1);
    }
    return dates;
  }, [batch?.start_date, batch?.end_date]);

  // initialize media rows per date (1 blank row each)
  useEffect(() => {
    if (!dateList.length) return;
    setMediaByDate((prev) => {
      const next = { ...prev };
      dateList.forEach((d) => {
        if (!next[d] || !next[d].length) {
          next[d] = [
            {
              id: Date.now() + Math.random(),
              category: "OTHER",
              file: null,
              notes: "",
            },
          ];
        }
      });
      return next;
    });
  }, [dateList]);

  async function fetchBatch() {
    if (!batchId) return;
    setLoadingBatch(true);
    try {
      const resp = await api.get(`/tms/batches/${batchId}/detail/`);
      setBatch(resp?.data || null);
    } catch (e) {
      console.error("cp batch closure: fetch batch failed", e);
      setBatch(null);
    } finally {
      setLoadingBatch(false);
    }
  }

  // check if closure request already exists for this batch
  async function checkExistingClosure() {
    if (!batchId) return;
    setCheckingClosure(true);
    try {
      const resp = await api.get(
        `/tms/batch-closure-requests/?batch=${batchId}`
      );
      const results = resp?.data?.results || [];
      setClosureExists(results.length > 0);
    } catch (e) {
      console.error("cp batch closure: check existing closure failed", e);
      setClosureExists(false);
    } finally {
      setCheckingClosure(false);
    }
  }

  useEffect(() => {
    fetchBatch();
    checkExistingClosure();
  }, [batchId]);

  function handleAddMediaRow(dateStr) {
    setMediaByDate((prev) => {
      const rows = prev[dateStr] || [];
      return {
        ...prev,
        [dateStr]: [
          ...rows,
          {
            id: Date.now() + Math.random(),
            category: "OTHER",
            file: null,
            notes: "",
          },
        ],
      };
    });
  }

  function handleRemoveMediaRow(dateStr, rowId) {
    setMediaByDate((prev) => {
      const rows = prev[dateStr] || [];
      const filtered = rows.filter((r) => r.id !== rowId);
      return {
        ...prev,
        [dateStr]: filtered.length ? filtered : [],
      };
    });
  }

  function handleMediaChange(dateStr, rowId, field, value) {
    setMediaByDate((prev) => {
      const rows = prev[dateStr] || [];
      const updated = rows.map((r) =>
        r.id === rowId ? { ...r, [field]: value } : r
      );
      return { ...prev, [dateStr]: updated };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!batchId || !user?.id) return;

    // simple validation: at least one media row with file OR some costing
    const hasAnyFile = Object.values(mediaByDate || {})
      .flat()
      .some((r) => r.file);
    const hasAnyCost =
      centreCost ||
      hostelCost ||
      foodingCost ||
      dressesCost ||
      studyMaterialCost;

    if (!hasAnyFile && !hasAnyCost) {
      alert(
        "Please upload at least one media file or enter costing details before submitting."
      );
      return;
    }

    setSubmitting(true);
    setSubmitMsg("Uploading media…");

    try {
      // 1) POST all batch-media
      const mediaPayloads = [];
      for (const dateStr of dateList) {
        const rows = mediaByDate[dateStr] || [];
        for (const r of rows) {
          if (!r.file) continue; // skip empty rows
          const formData = new FormData();
          formData.append("batch", batchId);
          formData.append("date", dateStr);
          formData.append("category", r.category || "OTHER");
          formData.append("file", r.file);
          if (r.notes) formData.append("notes", r.notes);
          // NEW fields
          formData.append("created_by", String(user.id));
          formData.append("is_active", "1");
          mediaPayloads.push(formData);
        }
      }

      for (const fd of mediaPayloads) {
        await api.post("/tms/batch-media/", fd);
      }

      // 2) POST costing (even if all zeros, if user touched costing)
      setSubmitMsg("Saving batch costing…");

      const n = (v) => (v ? parseFloat(v) || 0 : 0);
      const payloadCost = {
        batch: batchId,
        centre_cost: n(centreCost).toFixed(2),
        hostel_cost: n(hostelCost).toFixed(2),
        fooding_cost: n(foodingCost).toFixed(2),
        dresses_cost: n(dressesCost).toFixed(2),
        study_material_cost: n(studyMaterialCost).toFixed(2),
        total_cost: parseFloat(totalCost || "0").toFixed(2),
        // NEW fields
        created_by: user.id,
        is_active: 1,
      };

      const costResp = await api.post(
        "/tms/tp-batch-cost-breakups/",
        payloadCost
      );
      const costId = costResp?.data?.id;
      if (!costId) {
        throw new Error("Could not create batch costing record.");
      }

      // 3) POST closure request
      setSubmitMsg("Creating closure request…");

      await api.post("/tms/batch-closure-requests/", {
        batch: batchId,
        batch_costing: costId,
        certificates_issued: false,
        // NEW fields
        created_by: user.id,
        is_active: 1,
      });

      alert("Batch closure request submitted successfully.");
      navigate(-1);
    } catch (e) {
      console.error("cp batch closure submit failed", e);
      alert(
        "Failed to submit batch closure request. Please check inputs and try again."
      );
    } finally {
      setSubmitting(false);
      setSubmitMsg("Submitting closure request…");
    }
  }

  const heading =
    batch && batch.code
      ? `Batch Closure Request for Batch #${batch.code}`
      : `Batch Closure Request for Batch #${batchId}`;

  return (
    <div className="app-shell">
      <TmsLeftNav />
      <div className="main-area">
        <TopNav left={<div className="app-title">{heading}</div>} />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <h2 style={{ margin: 0 }}>{heading}</h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate(-1)}
                >
                  Back
                </button>
              </div>
            </div>

            {loadingBatch && !batch ? (
              <div className="table-spinner">Loading batch details…</div>
            ) : !batch ? (
              <div className="muted">
                Batch not found. Please go back and try again.
              </div>
            ) : checkingClosure ? (
              <div className="table-spinner">Checking closure status…</div>
            ) : closureExists ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 8,
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  fontSize: 14,
                }}
              >
                A closure request has already been submitted for this batch. You
                cannot send another closure request from this screen.
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Batch summary */}
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    borderRadius: 8,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div>
                    <strong>Batch Code:</strong>{" "}
                    <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
                      {batch.code}
                    </span>
                  </div>
                  <div>
                    <strong>Status:</strong> {batch.status}
                  </div>
                  <div>
                    <strong>Start Date:</strong> {fmtDate(batch.start_date)}{" "}
                    &nbsp;|&nbsp;
                    <strong>End Date:</strong> {fmtDate(batch.end_date)}
                  </div>
                </div>

                {/* 1. Batch Media section */}
                <div
                  style={{
                    marginBottom: 20,
                    padding: 16,
                    borderRadius: 8,
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Batch Media</h3>
                  <p className="muted" style={{ fontSize: 13 }}>
                    Upload photos or a PDF for each day of the batch. Use the
                    category dropdown to tag each media item appropriately.
                  </p>

                  {dateList.length === 0 ? (
                    <div className="muted">
                      No date range available for this batch.
                    </div>
                  ) : (
                    dateList.map((dateStr) => {
                      const rows = mediaByDate[dateStr] || [];
                      return (
                        <div
                          key={dateStr}
                          style={{
                            marginBottom: 16,
                            padding: 12,
                            borderRadius: 6,
                            background: "#f9fafb",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <strong>{fmtDate(dateStr)}</strong>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ marginLeft: "auto" }}
                              onClick={() => handleAddMediaRow(dateStr)}
                            >
                              + Add Media
                            </button>
                          </div>

                          {rows.length === 0 ? (
                            <div className="muted" style={{ fontSize: 13 }}>
                              No media rows yet. Click &quot;Add Media&quot; to
                              add the first item.
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 8,
                              }}
                            >
                              {rows.map((row) => (
                                <div
                                  key={row.id}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "160px minmax(0, 1fr) 120px",
                                    gap: 8,
                                    alignItems: "center",
                                    padding: 8,
                                    borderRadius: 4,
                                    background: "#ffffff",
                                    border: "1px solid #e5e7eb",
                                  }}
                                >
                                  <div>
                                    <label
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        marginBottom: 4,
                                        display: "block",
                                      }}
                                    >
                                      Category
                                    </label>
                                    <select
                                      value={row.category || "OTHER"}
                                      onChange={(e) =>
                                        handleMediaChange(
                                          dateStr,
                                          row.id,
                                          "category",
                                          e.target.value
                                        )
                                      }
                                      style={{
                                        width: "100%",
                                        fontSize: 13,
                                        padding: "4px 6px",
                                      }}
                                    >
                                      {CATEGORY_OPTIONS.map((opt) => (
                                        <option
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        marginBottom: 4,
                                        display: "block",
                                      }}
                                    >
                                      File &amp; Notes
                                    </label>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 4,
                                      }}
                                    >
                                      <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) =>
                                          handleMediaChange(
                                            dateStr,
                                            row.id,
                                            "file",
                                            e.target.files?.[0] || null
                                          )
                                        }
                                      />
                                      <textarea
                                        rows={2}
                                        placeholder="Notes (optional)…"
                                        value={row.notes || ""}
                                        onChange={(e) =>
                                          handleMediaChange(
                                            dateStr,
                                            row.id,
                                            "notes",
                                            e.target.value
                                          )
                                        }
                                        style={{
                                          fontSize: 12,
                                          resize: "vertical",
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div style={{ textAlign: "right" }}>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline"
                                      onClick={() =>
                                        handleRemoveMediaRow(dateStr, row.id)
                                      }
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2. Batch Costing section */}
                <div
                  style={{
                    marginBottom: 20,
                    padding: 16,
                    borderRadius: 8,
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Batch Costing</h3>
                  <p className="muted" style={{ fontSize: 13 }}>
                    Enter the total cost for each head. The total batch cost is
                    calculated automatically.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        Total Centre Maintenance Cost
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={centreCost}
                        onChange={(e) => setCentreCost(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        Hostel Charges
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={hostelCost}
                        onChange={(e) => setHostelCost(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        Total Fooding Cost
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={foodingCost}
                        onChange={(e) => setFoodingCost(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        Total Dresses Cost
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={dressesCost}
                        onChange={(e) => setDressesCost(e.target.value)}
                        className="form-control"
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          marginBottom: 4,
                          display: "block",
                        }}
                      >
                        Study Material Charges
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={studyMaterialCost}
                        onChange={(e) => setStudyMaterialCost(e.target.value)}
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid #e5e7eb",
                    }}
                  >
                    <strong>Total Batch Cost:</strong>{" "}
                    <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
                      ₹ {totalCost}
                    </span>
                  </div>
                </div>

                {/* Submit */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => navigate(-1)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={submitting}
                  >
                    {submitting
                      ? submitMsg || "Submitting closure request…"
                      : "Submit Closure Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>

        {submitting && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15,23,42,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 8,
                padding: "16px 24px",
                minWidth: 260,
                textAlign: "center",
                boxShadow: "0 10px 25px rgba(15,23,42,0.25)",
              }}
            >
              <div
                className="spinner-border"
                role="status"
                style={{ width: 24, height: 24, marginBottom: 8 }}
              >
                <span className="visually-hidden">Loading…</span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Submitting Closure Request
              </div>
              <div style={{ fontSize: 13, color: "#4b5563" }}>{submitMsg}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
