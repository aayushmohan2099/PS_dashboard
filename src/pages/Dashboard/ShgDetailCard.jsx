// src/pages/Dashboard/ShgDetailCard.jsx
import React, { useEffect, useState } from "react";
import { LOOKUP_API } from "../../api/axios";

/**
 * Shows SHG detail using:
 *   GET /upsrlm-shg-detail/<shg_code>/
 *
 * Props:
 *  - shg (object) -> must contain shg_code, shg_name, village_name etc.
 */
export default function ShgDetailCard({ shg }) {
  // Prefer shg.shg_code coming from /upsrlm-shg-list/, but fall back safely
  const shgCode = shg?.shg_code || shg?.nic_shg_code || shg?.code;
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shgCode) {
      setDetail(null);
      setError("");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setDetail(null);

      try {
        const res = await LOOKUP_API.upsrlmShgDetail(shgCode, {});
        const payload = res?.data || {};
        const data = payload.data || payload;
        if (!cancelled) {
          setDetail(data || null);
        }
      } catch (e) {
        console.error("SHG detail failed", e?.response?.data || e.message || e);
        if (!cancelled) {
          setError(
            e?.response?.data?.detail ||
              e.message ||
              "Failed to load SHG detail from UPSRLM."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [shgCode]);

  if (!shgCode) {
    return null;
  }

  const d = detail || {};
  const firstAddress =
    Array.isArray(d.shg_addresses) && d.shg_addresses.length > 0
      ? d.shg_addresses[0]
      : null;
  const firstBank =
    Array.isArray(d.shg_banks) && d.shg_banks.length > 0
      ? d.shg_banks[0]
      : null;

  return (
    <div className="card soft" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>
        SHG Detail –{" "}
        <span style={{ color: "#111827" }}>
          {d.shg_name || shg.shg_name || shg.shg_code || shgCode}
        </span>
      </h3>

      {loading ? (
        <div className="table-spinner">
          <span>Loading SHG detail…</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : !detail ? (
        <p className="muted">No detail available for this SHG.</p>
      ) : (
        <>
          {/* BASIC INFO */}
          <h4 style={{ marginTop: 12 }}>Basic Information</h4>
          <table className="table table-compact">
            <tbody>
              <tr>
                <td>
                  <strong>SHG Name</strong>
                </td>
                <td>{d.shg_name || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>SHG Code</strong>
                </td>
                <td>{d.shg_code || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>NIC SHG Code</strong>
                </td>
                <td>{d.nic_shg_code || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>SHG Type</strong>
                </td>
                <td>{d.shg_type || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Social Category</strong>
                </td>
                <td>{d.social_category || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Special SHG</strong>
                </td>
                <td>{d.special_shg ? "Yes" : "No"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Formation Date</strong>
                </td>
                <td>{d.formation_date || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Co-option Date</strong>
                </td>
                <td>{d.cooption_date || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Meeting Frequency</strong>
                </td>
                <td>{d.meeting_frequency || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>PFMS Verified</strong>
                </td>
                <td>{d.pfms_verified ? "Yes" : "No"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Is Complete</strong>
                </td>
                <td>{d.is_complete === "1" ? "Yes" : d.is_complete || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Bookkeeper ID</strong>
                </td>
                <td>{d.bookkeeper_id || "-"}</td>
              </tr>
            </tbody>
          </table>

          {/* CLF / VO INFO */}
          <h4 style={{ marginTop: 16 }}>CLF & VO Information</h4>
          <table className="table table-compact">
            <tbody>
              <tr>
                <td>
                  <strong>CLF Name</strong>
                </td>
                <td>{d.clf_name || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>CLF Code</strong>
                </td>
                <td>{d.clf_code || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>CLF ID</strong>
                </td>
                <td>{d.clf_id || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>VO Name</strong>
                </td>
                <td>{d.vo_name || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>VO Code</strong>
                </td>
                <td>{d.vo_code || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>VO ID</strong>
                </td>
                <td>{d.vo_id || "-"}</td>
              </tr>
            </tbody>
          </table>

          {/* ADDRESS INFO */}
          <h4 style={{ marginTop: 16 }}>Address & Location</h4>
          {firstAddress ? (
            <table className="table table-compact">
              <tbody>
                <tr>
                  <td>
                    <strong>Village</strong>
                  </td>
                  <td>{firstAddress.village_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Gram Panchayat</strong>
                  </td>
                  <td>{firstAddress.panchayat_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Block</strong>
                  </td>
                  <td>{firstAddress.block_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>District</strong>
                  </td>
                  <td>{firstAddress.district_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>State</strong>
                  </td>
                  <td>{firstAddress.state_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>PIN Code</strong>
                  </td>
                  <td>{firstAddress.postal_code || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Address Line 1</strong>
                  </td>
                  <td>{firstAddress.address_line1 || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Address Line 2</strong>
                  </td>
                  <td>{firstAddress.address_line2 || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Latitude</strong>
                  </td>
                  <td>{d.latitude || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Longitude</strong>
                  </td>
                  <td>{d.longitude || "-"}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="muted">No address information available.</p>
          )}

          {/* BANK INFO */}
          <h4 style={{ marginTop: 16 }}>Primary Bank Account</h4>
          {firstBank ? (
            <table className="table table-compact">
              <tbody>
                <tr>
                  <td>
                    <strong>Bank Name</strong>
                  </td>
                  <td>{firstBank.bank_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Branch</strong>
                  </td>
                  <td>{firstBank.bank_branch_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Account Number</strong>
                  </td>
                  <td>{firstBank.account_no || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Account Opening Date</strong>
                  </td>
                  <td>{firstBank.account_opening_date || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>IFSC</strong>
                  </td>
                  <td>{firstBank.ifsc_code || firstBank.pfms_ifsc_code || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>PFMS Account Holder Name</strong>
                  </td>
                  <td>{firstBank.pfms_account_holder_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>LokOS Account Holder Name</strong>
                  </td>
                  <td>{firstBank.lokos_account_holder_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>PFMS Vendor Code</strong>
                  </td>
                  <td>{firstBank.pfms_vendor_code || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>PFMS Verification</strong>
                  </td>
                  <td>
                    {firstBank.pfms_verification === 1
                      ? "Verified"
                      : firstBank.pfms_verification ?? "-"}
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Is Default Account</strong>
                  </td>
                  <td>{firstBank.is_default ? "Yes" : "No"}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="muted">No bank account information available.</p>
          )}

          {/* META INFO */}
          <h4 style={{ marginTop: 16 }}>Meta Information</h4>
          <table className="table table-compact">
            <tbody>
              <tr>
                <td>
                  <strong>Created By</strong>
                </td>
                <td>{d.created_by || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Created Date</strong>
                </td>
                <td>{d.created_date || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Updated By</strong>
                </td>
                <td>{d.updated_by || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Updated Date</strong>
                </td>
                <td>{d.updated_date || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>GUID</strong>
                </td>
                <td>{d.guid || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>UUID</strong>
                </td>
                <td>{d.uuid || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>State MIS ID</strong>
                </td>
                <td>{d.state_mis_id || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Internal ID</strong>
                </td>
                <td>{d.id || "-"}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
