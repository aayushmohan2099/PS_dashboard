// src/pages/LDMS/Layout/ldms_footer.jsx
import React from "react";

export default function LdmsFooter() {
  return (
    <footer className="ldms-footer">
      <div className="ldms-footer-inner">
        <span className="ldms-footer-left">
          © {new Date().getFullYear()} Pragati Setu
        </span>
        <span className="ldms-footer-right">
          Lakhpati Didi Management System (LDMS)
        </span>
      </div>

      <style>{`
        :root {
          --ldms-red: #c62828;
          --ldms-border: #f1c0c0;
          --ldms-text-muted: #6b7280;
        }

        .ldms-footer {
          flex-shrink: 0;
          height: 44px;
          background: #ffffff;
          border-top: 2px solid var(--ldms-red);
          display: flex;
          align-items: center;
          padding: 0 20px;
          font-size: 12px;
          color: var(--ldms-text-muted);
        }

        .ldms-footer-inner {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ldms-footer-left {
          font-weight: 600;
        }

        .ldms-footer-right {
          font-weight: 500;
          color: #374151;
        }

        /* Mobile-safe */
        @media (max-width: 768px) {
          .ldms-footer-inner {
            flex-direction: column;
            gap: 4px;
            align-items: flex-start;
          }
        }
      `}</style>
    </footer>
  );
}
