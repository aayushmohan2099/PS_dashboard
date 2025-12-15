import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api, { TMS_API } from "../../../api/axios";

/* ---------------- helpers ---------------- */

function generateThUrid() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let body = "";
  for (let i = 0; i < 11; i++) {
    body += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TH_${body}`;
}

export default function TpCreateCP() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { cpId } = useParams();
  const isEditMode = Boolean(cpId);

  /* ---------------- STATES ---------------- */

  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
  });

  const [cpForm, setCpForm] = useState({
    name: "",
    mobile_number: "",
    email: "",
    address: "",
  });

  const [masterUserId, setMasterUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  /* ---------------- PREFILL (EDIT MODE) ---------------- */

  useEffect(() => {
    if (!isEditMode) return;

    async function preload() {
      setLoading(true);
      try {
        const cpResp =
          await TMS_API.trainingPartnerContactPersons.retrieve(cpId);
        const cp = cpResp.data;

        setCpForm({
          name: cp.name || "",
          mobile_number: cp.mobile_number || "",
          email: cp.email || "",
          address: cp.address || "",
        });

        setMasterUserId(cp.master_user);

        if (cp.master_user) {
          const userResp = await api.get(`/lookups/users/${cp.master_user}/`);

          setUserForm({
            username: userResp.data.username || "",
            password: userResp.data.password || "",
          });
        }
      } catch (e) {
        console.error(e);
        alert("Failed to load Contact Person");
      } finally {
        setLoading(false);
      }
    }

    preload();
  }, [cpId, isEditMode]);

  /* ---------------- CREATE / UPDATE USER ---------------- */

  async function handleUserSubmit() {
    setStatus(isEditMode ? "Updating user…" : "Creating user…");

    try {
      if (isEditMode) {
        await api.put(`/lookups/users/${masterUserId}/`, {
          ...userForm,
          updated_by: user.id,
          pass_updated_by: user.id,
        });
      } else {
        const resp = await api.post("/lookups/users/create/", {
          username: userForm.username,
          password: userForm.password,
          role: 11,
          TH_urid: generateThUrid(),
          is_active: 1,
          is_suspended: 0,
          is_locked: 0,
          created_by: user.id,
        });

        setMasterUserId(resp.data.id);
      }

      setStatus("User saved successfully ✓");
    } catch (e) {
      console.error(e);
      alert("User operation failed");
    }
  }

  /* ---------------- CREATE / UPDATE CP ---------------- */

  async function handleCPSubmit() {
    setStatus(
      isEditMode ? "Updating contact person…" : "Creating contact person…"
    );

    try {
      if (isEditMode) {
        await TMS_API.trainingPartnerContactPersons.update(cpId, {
          ...cpForm,
          updated_by: user.id,
        });
      } else {
        const tpResp = await TMS_API.trainingPartners.list({
          search: user.id,
          fields: "id",
        });

        const tpId = tpResp?.data?.results?.[0]?.id;

        await TMS_API.trainingPartnerContactPersons.create({
          ...cpForm,
          partner: tpId,
          master_user: masterUserId,
          created_by: user.id,
        });
      }

      setStatus("Contact Person saved successfully ✓");
    } catch (e) {
      console.error(e);
      alert("Contact Person operation failed");
    }
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">
              Pragati Setu — {isEditMode ? "Edit" : "Create"} Contact Person
            </div>
          }
        />

        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {loading ? (
              <p>Loading contact person…</p>
            ) : (
              <>
                <h3>Login Details</h3>

                <input
                  className="input"
                  placeholder="Username"
                  value={userForm.username}
                  onChange={(e) =>
                    setUserForm({ ...userForm, username: e.target.value })
                  }
                />

                <input
                  type="text"
                  className="input"
                  placeholder="Password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  style={{ marginTop: 8 }}
                />

                <button className="btn" onClick={handleUserSubmit}>
                  {isEditMode ? "Update User" : "Create User"}
                </button>

                <hr style={{ margin: "24px 0" }} />

                <h3>Contact Person Details</h3>

                <input
                  className="input"
                  placeholder="Name"
                  value={cpForm.name}
                  onChange={(e) =>
                    setCpForm({ ...cpForm, name: e.target.value })
                  }
                />

                <input
                  className="input"
                  placeholder="Mobile"
                  value={cpForm.mobile_number}
                  onChange={(e) =>
                    setCpForm({ ...cpForm, mobile_number: e.target.value })
                  }
                />

                <input
                  className="input"
                  placeholder="Email"
                  value={cpForm.email}
                  onChange={(e) =>
                    setCpForm({ ...cpForm, email: e.target.value })
                  }
                />

                <textarea
                  className="input"
                  placeholder="Address"
                  value={cpForm.address}
                  onChange={(e) =>
                    setCpForm({ ...cpForm, address: e.target.value })
                  }
                />

                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <button className="btn" onClick={handleCPSubmit}>
                    {isEditMode
                      ? "Update Contact Person"
                      : "Create Contact Person"}
                  </button>
                </div>

                {status && (
                  <div style={{ marginTop: 10, fontSize: 13 }}>{status}</div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
