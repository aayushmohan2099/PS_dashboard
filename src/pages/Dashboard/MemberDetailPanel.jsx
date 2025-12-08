// src/pages/Dashboard/MemberDetailPanel.jsx
import React, { useEffect, useState } from "react";
import { EPSAKHI_API } from "../../api/axios";

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

  useEffect(() => {
    if (!shgCode || !memberCode) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setRecord(null);

      try {
        const res = await EPSAKHI_API.upsrlmShgMembers(shgCode, {
          page: 1,
          page_size: 50,
          search: memberCode,
        });

        const payload = res?.data || {};
        const data = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload.results)
          ? payload.results
          : [];
        const first = data[0] || null;

        if (!cancelled) {
          setRecord(first);
          if (!first) {
            setError(
              "No member record found for this member code in the selected SHG."
            );
          }
        }
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
  }, [shgCode, memberCode]);

  if (!memberCode) {
    return (
      <div className="card soft" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Beneficiary Detail</h3>
        <p className="muted">Click on a member to see full detail.</p>
      </div>
    );
  }

  const d = record || {};
  const memberAddresses =
    (Array.isArray(d.member_addresses) && d.member_addresses) || [];
  const memberBanks =
    (Array.isArray(d.member_banks) && d.member_banks) || [];
  const memberPhones =
    (Array.isArray(d.member_phones) && d.member_phones) || [];
  const memberDesignations =
    (Array.isArray(d.member_designations) && d.member_designations) || [];

  const firstAddress = memberAddresses[0] || null;
  const firstBank = memberBanks[0] || null;

  const boolText = (v) => {
    if (v === null || v === undefined || v === "") return "-";
    const yes =
      v === true ||
      v === 1 ||
      v === "1" ||
      String(v).toLowerCase() === "true" ||
      String(v).toLowerCase() === "yes";
    const no =
      v === false ||
      v === 0 ||
      v === "0" ||
      String(v).toLowerCase() === "false" ||
      String(v).toLowerCase() === "no";
    if (yes) return "Yes";
    if (no) return "No";
    return String(v);
  };

  return (
    <div className="card soft" style={{ marginTop: 16 }}>
      <h3 style={{ marginTop: 0 }}>Beneficiary Detail</h3>

      {loading ? (
        <div className="table-spinner">
          <span>Loading beneficiary detail…</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : !record ? (
        <p className="muted">No detail available for this member.</p>
      ) : (
        <div style={{ marginTop: 8 }}>
          {/* Header */}
          <div style={{ marginBottom: 8 }}>
            <strong>{d.member_name || "Member"}</strong>{" "}
            {d.member_code && (
              <span className="small-muted">
                (Code: {d.member_code}
                {d.nic_member_code ? `, NIC: ${d.nic_member_code}` : ""})
              </span>
            )}
          </div>

          {/* BASIC INFO */}
          <h4 style={{ marginTop: 12 }}>Basic Information</h4>
          <table className="table table-compact">
            <tbody>
              <tr>
                <td style={{ width: "38%" }}>
                  <strong>Member Name</strong>
                </td>
                <td>{d.member_name || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Member Code</strong>
                </td>
                <td>{d.member_code || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>NIC Member Code</strong>
                </td>
                <td>{d.nic_member_code || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>DOB</strong>
                </td>
                <td>{d.dob || d.DOB || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Gender</strong>
                </td>
                <td>{d.gender || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Marital Status</strong>
                </td>
                <td>{d.marital_status || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Father / Husband Type</strong>
                </td>
                <td>{d.father_husband || d.father_husband_type || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Relation Name</strong>
                </td>
                <td>{d.relation_name || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Joining Date</strong>
                </td>
                <td>{d.joining_date || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Education</strong>
                </td>
                <td>{d.education || "-"}</td>
              </tr>
            </tbody>
          </table>

          {/* SOCIO-ECONOMIC INFO */}
          <h4 style={{ marginTop: 16 }}>Socio-economic Information</h4>
          <table className="table table-compact">
            <tbody>
              <tr>
                <td style={{ width: "38%" }}>
                  <strong>Religion</strong>
                </td>
                <td>{d.religion || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Social Category</strong>
                </td>
                <td>{d.social_category || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>BPL</strong>
                </td>
                <td>{d.bpl || d.BPL || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>PIP Category</strong>
                </td>
                <td>{d.pip_category || d.PIP_CATEGORY || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>PLD Status</strong>
                </td>
                <td>{boolText(d.pld_status)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Aadhaar Verified</strong>
                </td>
                <td>{boolText(d.aadhar_verified)}</td>
              </tr>
            </tbody>
          </table>

          {/* ADDRESS INFO */}
          <h4 style={{ marginTop: 16 }}>Address & Location</h4>
          {firstAddress ? (
            <table className="table table-compact">
              <tbody>
                <tr>
                  <td style={{ width: "38%" }}>
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
                  <td style={{ width: "38%" }}>
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
                  <td>{firstBank.account_open_date || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>IFSC</strong>
                  </td>
                  <td>{firstBank.ifsc_code || "-"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Is Default Account</strong>
                  </td>
                  <td>{boolText(firstBank.is_default_account)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="muted">No bank information available.</p>
          )}

          {/* PHONES & DESIGNATIONS */}
          <h4 style={{ marginTop: 16 }}>Phones & Designations</h4>
          <div className="flex" style={{ gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <h5 style={{ marginTop: 0 }}>Phones</h5>
              {memberPhones.length === 0 ? (
                <p className="muted">No phone numbers available.</p>
              ) : (
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>Phone Number</th>
                      <th>Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberPhones.map((p, idx) => (
                      <tr key={p.member_phone_details_id || idx}>
                        <td>{p.phone_no || "-"}</td>
                        <td>{boolText(p.is_default)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h5 style={{ marginTop: 0 }}>Designations in SHG</h5>
              {memberDesignations.length === 0 ? (
                <p className="muted">No designation information available.</p>
              ) : (
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>Designation</th>
                      <th>Signatory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberDesignations.map((dsg, idx) => (
                      <tr key={dsg.member_code || idx}>
                        <td>{dsg.designation || "-"}</td>
                        <td>{boolText(dsg.is_signatory)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* META INFO */}
          <h4 style={{ marginTop: 16 }}>Meta Information</h4>
          <table className="table table-compact">
            <tbody>
              <tr>
                <td style={{ width: "38%" }}>
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
                  <strong>Member ID</strong>
                </td>
                <td>{d.member_id || d.MEMBER_ID || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Member GUID</strong>
                </td>
                <td>{d.member_guid || d.MEMBER_GUID || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>State MIS ID</strong>
                </td>
                <td>{d.state_mis_id || "-"}</td>
              </tr>
              <tr>
                <td>
                  <strong>Token</strong>
                </td>
                <td>{d.token || "-"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
