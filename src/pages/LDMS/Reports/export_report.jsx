// src/pages/LDMS/Report/export_report.jsx
import React, { useState } from "react";
import api from "../../../api/axios";

/**
 * ExportReport
 * - Floating export button
 * - Downloads Excel (.xlsx)
 * - Uses same filters as report
 */
export default function ExportReport({ filters }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!filters || Object.keys(filters).length === 0) {
      alert("Please apply filters before exporting.");
      return;
    }

    try {
      setExporting(true);

      const response = await api.get("/ldms/reports/recorded-beneficiaries/", {
        params: {
          ...filters,
          export: "excel", // 👈 backend switch
        },
        responseType: "blob", // 🔑 IMPORTANT
      });

      /* -------- create file -------- */
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `LDMS_Recorded_Beneficiaries_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
      alert("Failed to export report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="export-fab">
        <button onClick={handleExport} disabled={exporting}>
          {exporting ? <span className="mini-loader" /> : "Export Excel"}
        </button>
      </div>

      <style>{`
        /* ================= FLOATING EXPORT BUTTON ================= */
        .export-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 999;
        }

        .export-fab button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #c62828;
          color: #fff;
          border: none;
          padding: 12px 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 6px 16px rgba(0,0,0,0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .export-fab button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(0,0,0,0.35);
        }

        .export-fab button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* ================= MINI LOADER ================= */
        .mini-loader {
          width: 14px;
          height: 14px;
          border: 2px solid #fff;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
