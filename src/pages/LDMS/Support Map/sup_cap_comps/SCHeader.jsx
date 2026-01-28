import React, { useEffect, useState } from "react";
import {
  FaUniversity,
  FaProjectDiagram,
  FaInfoCircle,
  FaClipboardList,
} from "react-icons/fa";
import { LDMS_API } from "../../../../api/axios";

export default function SCHeader({ onSchemeSelect, selectedScheme }) {
  const [departments, setDepartments] = useState([]);
  const [schemes, setSchemes] = useState([]);

  const [selectedDept, setSelectedDept] = useState("");
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingScheme, setLoadingScheme] = useState(false);

  /* ---------------- Fetch Departments ---------------- */
  useEffect(() => {
    setLoadingDept(true);
    LDMS_API.departments()
      .then((res) => setDepartments(res.data.results || []))
      .finally(() => setLoadingDept(false));
  }, []);

  /* ---------------- Sync Dept when editing ---------------- */
  useEffect(() => {
    if (!selectedScheme || !departments.length) return;

    // Match scheme's department to department list
    const dept = departments.find(
      (d) =>
        d.id === selectedScheme.department ||
        d.code === selectedScheme.department ||
        d.name === selectedScheme.department ||
        d.id === selectedScheme.department?.id,
    );

    if (dept) {
      setSelectedDept(dept.id);
    }
  }, [selectedScheme, departments]);

  /* ---------------- Fetch Schemes when Dept changes ---------------- */
  useEffect(() => {
    if (!selectedDept) {
      setSchemes([]);
      return;
    }

    setLoadingScheme(true);
    LDMS_API.schemes({ department: selectedDept })
      .then((res) => setSchemes(res.data.results || []))
      .finally(() => setLoadingScheme(false));
  }, [selectedDept]);

  return (
    <div className="sc-header">
      {/* -------- Selectors Row -------- */}
      <div className="sc-row">
        {/* Department */}
        <div className="sc-field">
          <label>
            <FaUniversity /> Department
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">
              {loadingDept ? "Loading departments..." : "Select Department"}
            </option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Scheme */}
        <div className="sc-field">
          <label>
            <FaProjectDiagram /> Scheme
          </label>
          <select
            value={selectedScheme?.id || ""}
            disabled={!selectedDept || loadingScheme}
            onChange={(e) => {
              const scheme = schemes.find(
                (s) => s.id === Number(e.target.value),
              );
              onSchemeSelect?.(scheme);
            }}
          >
            <option value="">
              {loadingScheme ? "Loading schemes..." : "Select Scheme"}
            </option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* -------- Scheme Details -------- */}
      {selectedScheme && (
        <div className="sc-details">
          <div className="sc-detail-card">
            <div className="sc-detail-label">
              <FaClipboardList /> Scheme Code
            </div>
            <div className="sc-detail-value">{selectedScheme.code || "—"}</div>
          </div>

          <div className="sc-detail-card wide">
            <div className="sc-detail-label">
              <FaInfoCircle /> Key Assistance
            </div>
            <div className="sc-detail-value">
              {selectedScheme.assistance || "—"}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Styles ---------------- */}
      <style>{`
        .sc-header {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .sc-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .sc-field label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #7a0c0c;
          margin-bottom: 6px;
        }

        .sc-field select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-size: 14px;
          background: #fff;
        }

        .sc-field select:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .sc-field select:focus {
          outline: none;
          border-color: #b91c1c;
          box-shadow: 0 0 0 1px rgba(185, 28, 28, 0.25);
        }

        .sc-details {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 16px;
        }

        .sc-detail-card {
          background: #fff;
          border: 1px solid #f1f1f1;
          border-left: 5px solid #b91c1c;
          border-radius: 10px;
          padding: 12px 14px;
        }

        .sc-detail-card.wide {
          grid-column: span 1;
        }

        .sc-detail-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #7a0c0c;
          margin-bottom: 6px;
        }

        .sc-detail-value {
          font-size: 14px;
          line-height: 1.6;
          color: #374151;
        }

        @media (max-width: 1024px) {
          .sc-row,
          .sc-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
