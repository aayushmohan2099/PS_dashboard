// src/pages/Dashboard/ShgDetailCard.jsx
import React, { useEffect, useState } from "react";
import { LOOKUP_API } from "../../api/axios";

// Cache for SHG detail keyed by shg_code
const shgDetailCache = new Map();

/**
 * Shows SHG detail using:
 *   GET /upsrlm-shg-detail/<shg_code>/
 *
 * Props:
 *  - shg (object) -> must contain shg_code, shg_name, village_name etc.
 */
export default function ShgDetailCard({ shg }) {
  const shgCode = shg?.code || shg?.shg_code;
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0); // increments when Refresh is clicked

  useEffect(() => {
    if (!shgCode) {
      setDetail(null);
      setError("");
      setReloadToken(0);
      return;
    }

    let cancelled = false;

    async function load() {
      const force = reloadToken > 0;
      const cacheKey = shgCode;

      setLoading(true);
      setError("");

      try {
        // Use cache if not forcing
        if (!force && shgDetailCache.has(cacheKey)) {
          const cached = shgDetailCache.get(cacheKey);
          if (!cancelled) {
            setDetail(cached);
          }
          return;
        }

        const res = await LOOKUP_API.upsrlmShgDetail(shgCode, {});
        const payload = res?.data || {};
        const data = payload.data || payload || null;

        if (!cancelled) {
          setDetail(data);
        }
        shgDetailCache.set(cacheKey, data);
      } catch (e) {
        console.error(
          "SHG detail failed",
          e?.response?.data || e.message || e
        );
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
  }, [shgCode, reloadToken]);

  if (!shgCode) {
    return null;
  }

  const effective = detail || {};
  const addr =
    (Array.isArray(effective.shg_addresses) &&
      effective.shg_addresses[0]) ||
    {};
  const bank =
    (Array.isArray(effective.shg_banks) && effective.shg_banks[0]) || {};

  return (
    <div className="card soft" style={{ marginTop: 16 }}>
      <div className="header-row space-between" style={{ marginBottom: 8 }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>
          SHG Detail –{" "}
          <span style={{ color: "#111827" }}>
            {effective.shg_name || shg.shg_name || shg.shg_code}
          </span>
        </h3>
        <button
          className="btn-sm btn-flat"
          onClick={() => setReloadToken((t) => t + 1)}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

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
          <div className="table-wrapper">
            <table className="table table-compact">
              <tbody>
                <tr>
                  <td>
                    <strong>SHG Name</strong>
                  </td>
                  <td>{effective.shg_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>SHG Code</strong>
                  </td>
                  <td>{effective.shg_code || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>SHG Type</strong>
                  </td>
                  <td>{effective.shg_type || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Social Category</strong>
                  </td>
                  <td>{effective.social_category || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Formation Date</strong>
                  </td>
                  <td>{effective.formation_date || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Meeting Frequency</strong>
                  </td>
                  <td>{effective.meeting_frequency || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Village</strong>
                  </td>
                  <td>{addr.village_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Panchayat</strong>
                  </td>
                  <td>{addr.panchayat_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Block</strong>
                  </td>
                  <td>{addr.block_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>District</strong>
                  </td>
                  <td>{addr.district_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Bank Name</strong>
                  </td>
                  <td>{bank.bank_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Branch</strong>
                  </td>
                  <td>{bank.bank_branch_name || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Account No.</strong>
                  </td>
                  <td>{bank.account_no || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>IFSC</strong>
                  </td>
                  <td>{bank.ifsc_code || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>PFMS Verified</strong>
                  </td>
                  <td>{effective.pfms_verified ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Updated By</strong>
                  </td>
                  <td>{effective.updated_by || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Updated Date</strong>
                  </td>
                  <td>{effective.updated_date || "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
