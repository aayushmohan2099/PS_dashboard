import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api, { TMS_API } from "../../../api/axios";

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

/* ================= VIEW MODAL ================= */

function CPViewModal({ open, cp, onClose }) {
  const [userDetail, setUserDetail] = useState(null);
  const [centres, setCentres] = useState([]);

  useEffect(() => {
    if (!cp) return;

    async function loadDetails() {
      if (cp.master_user) {
        const u = await api.get(`/lookups/users/${cp.master_user}/`);
        setUserDetail(u.data);
      }

      const links = await TMS_API.tpcpCentreLinks.list({
        contact_person: cp.id,
      });

      const centreIds =
        links?.data?.results?.map((x) => x.allocated_centre) || [];

      const centreDetails = [];
      for (const cid of centreIds) {
        const c = await api.get(`/tms/training-partner-centres/${cid}/detail/`);
        centreDetails.push(c.data);
      }
      setCentres(centreDetails);
    }

    loadDetails();
  }, [cp]);

  if (!open || !cp) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: 900 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h3>Contact Person Details</h3>
          <button className="btn-outline" onClick={onClose}>
            Back
          </button>
        </div>

        <h4>Basic Details</h4>
        <table className="table table-compact">
          <tbody>
            <tr>
              <td>Name</td>
              <td>{cp.name}</td>
            </tr>
            <tr>
              <td>Mobile</td>
              <td>{cp.mobile_number || "-"}</td>
            </tr>
            <tr>
              <td>Email</td>
              <td>{cp.email || "-"}</td>
            </tr>
            <tr>
              <td>Address</td>
              <td>{cp.address || "-"}</td>
            </tr>
          </tbody>
        </table>

        <h4>Login Details</h4>
        <table className="table table-compact">
          <tbody>
            <tr>
              <td>Username</td>
              <td>{userDetail?.username || "-"}</td>
            </tr>
            <tr>
              <td>Status</td>
              <td>{userDetail?.is_active ? "Active" : "Inactive"}</td>
            </tr>
          </tbody>
        </table>

        <h4>Assigned Centres</h4>
        {centres.length === 0 ? (
          <p>No centres assigned</p>
        ) : (
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Serial</th>
                <th>Centre</th>
                <th>Location</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {centres.map((c) => (
                <tr key={c.id}>
                  <td>{c.serial_number}</td>
                  <td>{c.venue_name}</td>
                  <td>
                    {c.district?.district_name_en} / {c.block?.block_name_en}
                    <br />
                    {c.panchayat?.panchayat_name_en} /{" "}
                    {c.village?.village_name_english}
                  </td>
                  <td>{c.venue_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ================= MAIN ================= */

export default function TpListCP() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [cps, setCps] = useState([]);
  const [viewCp, setViewCp] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    async function loadCPs() {
      if (!user?.id) return;
      setLoading(true);

      const tpId = await resolveTrainingPartnerIdForUser(user.id);
      if (!tpId) return;

      const resp = await TMS_API.trainingPartnerContactPersons.list({
        partner: tpId,
        page_size: 200,
      });

      setCps(resp?.data?.results || []);
      setLoading(false);
    }

    loadCPs();
  }, [user]);

  async function handleDelete(cp) {
    const ok = window.confirm(
      `Are you sure you want to delete "${cp.name}"?\n\nThis will also DISABLE their login.`
    );
    if (!ok) return;

    setDeletingId(cp.id);

    try {
      // 1. Soft delete CP
      await TMS_API.trainingPartnerContactPersons.destroy(cp.id);

      // 2. Deactivate linked master user
      if (cp.master_user) {
        await api.patch(`/lookups/users/${cp.master_user}/`, {
          is_active: 0,
          deleted_by: user.id,
        });
      }

      // 3. Update UI
      setCps((prev) => prev.filter((x) => x.id !== cp.id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete contact person");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={<div className="app-title">Pragati Setu — Contact Persons</div>}
        />

        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Contact Persons</h2>

              <button
                className="btn btn-primary"
                style={{ marginLeft: "auto" }}
                onClick={() => navigate("/tms/tp/cp/create")}
              >
                + Create Contact Person
              </button>
            </div>

            <table className="table table-compact">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>User ID</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5}>Loading…</td>
                  </tr>
                ) : cps.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No contact persons found</td>
                  </tr>
                ) : (
                  cps.map((cp, i) => (
                    <tr key={cp.id}>
                      <td>{i + 1}</td>
                      <td>{cp.name}</td>
                      <td>{cp.mobile_number || "-"}</td>
                      <td>{cp.master_user || "-"}</td>
                      <td>
                        <button
                          className="btn-sm btn-flat"
                          onClick={() => setViewCp(cp)}
                        >
                          View
                        </button>{" "}
                        <button
                          className="btn-sm btn-flat"
                          onClick={() => navigate(`/tms/tp/cp/edit/${cp.id}`)}
                        >
                          Edit
                        </button>{" "}
                        <button
                          className="btn-sm btn-danger"
                          disabled={deletingId === cp.id}
                          onClick={() => handleDelete(cp)}
                        >
                          {deletingId === cp.id ? "Deleting…" : "Delete"}
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

      <CPViewModal
        open={!!viewCp}
        cp={viewCp}
        onClose={() => setViewCp(null)}
      />
    </div>
  );
}
