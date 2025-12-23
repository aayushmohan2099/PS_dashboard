// src/pages/TMS/TP/tp_cp_assignment.jsx
import React, { useContext, useEffect, useState } from "react";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import { TMS_API } from "../../../api/axios";

/* ---------------- TP resolver ---------------- */

const TP_SELF_PARTNER_KEY = "tms_self_partner_id_v1";

async function resolveTrainingPartnerIdForUser(userId) {
  if (!userId) return null;

  const cached = localStorage.getItem(TP_SELF_PARTNER_KEY);
  if (cached) return Number(cached);

  const resp = await TMS_API.trainingPartners.list({
    search: userId,
    fields: "id",
  });

  const pid = resp?.data?.results?.[0]?.id || null;
  if (pid) localStorage.setItem(TP_SELF_PARTNER_KEY, String(pid));
  return pid;
}

/* ================= ASSIGN MODAL ================= */

function AssignModal({
  open,
  onClose,
  onSave,
  initialData,
  contactPersons,
  centres,
  loadingCP,
  loadingCentres,
}) {
  const [form, setForm] = useState({
    contact_person: "",
    allocated_centre: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        contact_person: initialData.contact_person?.id || "",
        allocated_centre: initialData.allocated_centre?.id || "",
      });
    } else {
      setForm({ contact_person: "", allocated_centre: "" });
    }
  }, [initialData]);

  if (!open) return null;

  async function handleSubmit() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          maxWidth: 520,
          margin: "120px auto",
          borderRadius: 10,
          padding: 20,
        }}
      >
        <h3>
          {initialData ? "Edit Assignment" : "Assign Centre to Contact Person"}
        </h3>

        {/* CONTACT PERSON */}
        <label>Contact Person</label>
        {loadingCP ? (
          <p style={{ fontSize: 13 }}>Loading contact persons…</p>
        ) : (
          <select
            className="input"
            disabled={saving}
            value={form.contact_person}
            onChange={(e) =>
              setForm({ ...form, contact_person: e.target.value })
            }
          >
            <option value="">Select Contact Person</option>
            {contactPersons.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.name}
              </option>
            ))}
          </select>
        )}

        {/* CENTRE */}
        <label style={{ marginTop: 12 }}>Centre</label>
        {loadingCentres ? (
          <p style={{ fontSize: 13 }}>Loading centres…</p>
        ) : (
          <select
            className="input"
            disabled={saving}
            value={form.allocated_centre}
            onChange={(e) =>
              setForm({ ...form, allocated_centre: e.target.value })
            }
          >
            <option value="">Select Centre</option>
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.venue_name}
              </option>
            ))}
          </select>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn" disabled={saving} onClick={handleSubmit}>
            {saving
              ? initialData
                ? "Updating…"
                : "Assigning…"
              : initialData
                ? "Update"
                : "Assign"}
          </button>

          <button className="btn-outline" disabled={saving} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= MAIN ================= */

export default function TpCpAssignment() {
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);

  const [contactPersons, setContactPersons] = useState([]);
  const [centres, setCentres] = useState([]);
  const [loadingCP, setLoadingCP] = useState(false);
  const [loadingCentres, setLoadingCentres] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  async function loadAll() {
    if (!user?.id) return;

    setLoading(true);
    setLoadingCP(true);
    setLoadingCentres(true);

    const tpId = await resolveTrainingPartnerIdForUser(user.id);
    if (!tpId) return;

    const [linksResp, cpResp, centreResp] = await Promise.all([
      TMS_API.tpcpCentreDetails.list(),
      TMS_API.trainingPartnerContactPersons.list({ partner: tpId }),
      TMS_API.trainingPartnerCentres.list({ partner: tpId }),
    ]);

    setLinks(linksResp?.data?.results || []);
    setContactPersons(cpResp?.data?.results || []);
    setCentres(centreResp?.data?.results || []);

    setLoading(false);
    setLoadingCP(false);
    setLoadingCentres(false);
  }

  useEffect(() => {
    loadAll();
  }, [user]);

  async function handleSave(form) {
    if (editRow) {
      await TMS_API.tpcpCentreLinks.update(editRow.id, {
        ...form,
        updated_by: user.id,
      });
    } else {
      await TMS_API.tpcpCentreLinks.create({
        ...form,
        created_by: user.id,
      });
    }

    setModalOpen(false);
    setEditRow(null);
    loadAll();
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this assignment?")) return;
    await TMS_API.tpcpCentreLinks.destroy(id);
    loadAll();
  }

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu — Contact Person Centre Assignment
            </div>
          }
        />

        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>Centre Assignments</h2>

              <button
                className="btn btn-primary"
                style={{ marginLeft: "auto" }}
                onClick={() => {
                  setEditRow(null);
                  setModalOpen(true);
                }}
              >
                + Assign Centre to Contact Person
              </button>
            </div>

            <table className="table table-compact">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Centre</th>
                  <th>Contact Person</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4}>Loading assignments…</td>
                  </tr>
                ) : links.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No assignments found</td>
                  </tr>
                ) : (
                  links.map((l, i) => (
                    <tr key={l.id}>
                      <td>{i + 1}</td>
                      <td>{l.allocated_centre?.venue_name}</td>
                      <td>{l.contact_person?.name}</td>
                      <td>
                        <button
                          className="btn-sm btn-flat"
                          onClick={() => {
                            setEditRow(l);
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </button>{" "}
                        <button
                          className="btn-sm btn-danger"
                          onClick={() => handleDelete(l.id)}
                        >
                          Delete
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

      <AssignModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditRow(null);
        }}
        onSave={handleSave}
        initialData={editRow}
        contactPersons={contactPersons}
        centres={centres}
        loadingCP={loadingCP}
        loadingCentres={loadingCentres}
      />
    </div>
  );
}
