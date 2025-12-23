// src/pages/Dashboard/MemberDetailPanel.jsx
import React, { useEffect, useState } from "react";
import { EPSAKHI_API } from "../../api/axios";

// Cache for member detail keyed by (shgCode + memberCode)
const memberDetailCache = new Map();

function boolText(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

/**
 * Shows full member detail from UPSRLM using upsrlm-shg-members:
 *   GET /upsrlm-shg-members/<shg_code>/?search=<member_code>
 *
 * Props:
 *  - shgCode
 *  - memberCode
 */
export default function MemberDetailPanel({ shgCode, memberCode }) {
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!shgCode || !memberCode) {
      setRecord(null);
      setError("");
      setReloadToken(0);
      return;
    }

    let cancelled = false;

    async function load() {
      const force = reloadToken > 0;
      const cacheKey = `${shgCode}:${memberCode}`;

      setLoading(true);
      setError("");

      try {
        if (!force && memberDetailCache.has(cacheKey)) {
          const cached = memberDetailCache.get(cacheKey);
          if (!cancelled) {
            setRecord(cached);
          }
          return;
        }

        const res = await EPSAKHI_API.upsrlmShgMembers(shgCode, {
          page: 1,
          page_size: 50,
          search: memberCode,
        });

        const payload = res?.data || {};
        const data = Array.isArray(payload.data) ? payload.data : [];
        const first = data[0] || null;

        if (!cancelled) {
          setRecord(first);
          if (!first) {
            setError(
              "No member record found for this member code in the selected SHG."
            );
          }
        }
        memberDetailCache.set(cacheKey, first);
      } catch (e) {
        console.error(
          "Failed to load member detail from UPSRLM",
          e?.response?.data || e.message || e
        );
        if (!cancelled) {
          setError(
            e?.response?.data?.detail ||
              e.message ||
              "Failed to fetch member detail from UPSRLM."
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
  }, [shgCode, memberCode, reloadToken]);

  return (
    <div className="card soft" style={{ marginTop: 16 }}>
      <div className="header-row space-between">
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>
          Beneficiary Detail
        </h3>
        {memberCode && (
          <button
            className="btn-sm btn-flat"
            disabled={loading}
            onClick={() => setReloadToken((t) => t + 1)}
          >
            Refresh
          </button>
        )}
      </div>

      {!memberCode ? (
        <p className="muted">Click on a member to see full detail.</p>
      ) : loading ? (
        <div className="table-spinner">
          <span>Loading beneficiary detail…</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger" style={{ marginTop: 8 }}>
          {error}
        </div>
      ) : !record ? (
        <p className="muted">No detail available for this member.</p>
      ) : (
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>{record.member_name || "Member"}</strong>{" "}
            {record.member_code && (
              <span className="small-muted">
                (Code: {record.member_code})
              </span>
            )}
          </div>

          <div className="table-wrapper">
            <table
              className="table table-compact"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <tbody>
                <tr>
                  <td style={{ width: "30%", fontWeight: 600 }}>DOB</td>
                  <td>{record.dob || "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Gender</td>
                  <td>{record.gender || "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Marital Status</td>
                  <td>{record.marital_status || "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Father / Husband</td>
                  <td>{record.relation_name || "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Religion</td>
                  <td>{record.religion || "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Social Category</td>
                  <td>{record.social_category || "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Education</td>
                  <td>{record.education || "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Aadhaar Verified</td>
                  <td>{boolText(record.aadhar_verified)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>PLD Status</td>
                  <td>{boolText(record.pld_status)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Joining Date</td>
                  <td>{record.joining_date || "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Created By</td>
                  <td>{record.created_by || "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Created Date</td>
                  <td>{record.created_date || "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Updated By</td>
                  <td>{record.updated_by || "-"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Updated Date</td>
                  <td>{record.updated_date || "-"}</td>
                </tr>

                {/* Address */}
                <tr>
                  <td style={{ fontWeight: 600 }}>Address</td>
                  <td>
                    {Array.isArray(record.member_addresses) &&
                    record.member_addresses.length > 0 ? (
                      <>
                        {record.member_addresses[0].village_name || "-"},{" "}
                        {record.member_addresses[0].panchayat_name || "-"},{" "}
                        {record.member_addresses[0].block_name || "-"},{" "}
                        {record.member_addresses[0].district_name || "-"} (
                        {record.member_addresses[0].state_name || "-"})
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>

                {/* Phones */}
                <tr>
                  <td style={{ fontWeight: 600 }}>Mobile</td>
                  <td>
                    {Array.isArray(record.member_phones) &&
                    record.member_phones.length > 0
                      ? record.member_phones[0].phone_no
                      : "-"}
                  </td>
                </tr>

                {/* Bank */}
                <tr>
                  <td style={{ fontWeight: 600 }}>Bank Account</td>
                  <td>
                    {Array.isArray(record.member_banks) &&
                    record.member_banks.length > 0 ? (
                      <>
                        {record.member_banks[0].bank_name || "-"} /{" "}
                        {record.member_banks[0].bank_branch_name || "-"} –{" "}
                        {record.member_banks[0].account_no || "-"}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>

                {/* Designations */}
                <tr>
                  <td style={{ fontWeight: 600 }}>Designation</td>
                  <td>
                    {Array.isArray(record.member_designations) &&
                    record.member_designations.length > 0 ? (
                      record.member_designations
                        .map((d) => d.designation)
                        .join(", ")
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
