import React from "react";
import ps_logo from "../../assets/PS_TRANS.png";
import bdoLogo from "../../assets/BDO_Logo.png";
/**
 * Footer
 * LokOS-style footer adapted for Pragati Setu
 * Images intentionally left as placeholders
 */

export default function Footer() {
  return (
    <footer className="ps-footer">

      {/* ===== TOP FOOTER ===== */}
      <div className="ps-footer-top">

        {/* COLUMN 1 */}
        <div className="footer-col brand">
          <div className="footer-logo">
            <img src={ps_logo} alt="Pragati Setu Logo" className="ps-logo" />
            <span className="brand-name">Pragati Setu</span>
          </div>

          <p className="brand-desc">
            Pragati Setu is a unified digital platform for monitoring,
            analytics, and governance, empowering Self Help Groups and
            rural institutions across Uttar Pradesh.
          </p>

          <div className="social-icons">
            <span className="icon">f</span>
            <span className="icon">x</span>
            <span className="icon">▶</span>
          </div>

          <p className="updated">Last Updated: 26 Jan, 2026</p>
        </div>

        {/* COLUMN 2 */}
        <div className="footer-col">
          <h4>Pragati Setu</h4>
          <ul>
            <li>About Pragati Setu</li>
            <li>About UPSRLM</li>
            <li>Contact Us</li>
            <li className="section-gap">Dashboards</li>
            <li>Pragati Setu Outreach</li>
            <li>Lakhpati Didi Impact</li>
            <li>CLF Performance</li>
            <li>Community Funds</li>
          </ul>
        </div>

        {/* COLUMN 3 */}
        <div className="footer-col">
          <h4>Our Services</h4>
          <ul>
            <li>Beneficiary Management System</li>
            <li>Training Management System</li>
            <li>Enterprise Sakhi</li>
            <li>Lakhpati Didi</li>
            <li>Monitoring & Analytics</li>
          </ul>
        </div>

        {/* COLUMN 4 */}
        <div className="footer-col">
          <h4>Help & Support</h4>
          <ul>
            <li>Application Information</li>
            <li>Release Notes</li>
            <li>Frequently Asked Questions</li>
            <li>What’s New</li>

            <li className="section-gap"><strong>Legal Info</strong></li>
            <li>Advisory & Guidelines</li>
            <li>Copyright Policy</li>
          </ul>
        </div>

        {/* COLUMN 5 */}
        <div className="footer-col right">
          <img src={bdoLogo} alt="BDO Logo" style={{ width: '80px', marginTop: '20px' }} />
          <div className="powered-by">
            <p>
              Powered by<br />
              BDO India LLP<br />
              All rights reserved. 
            </p>
          </div>
        </div>

      </div>

      {/* ===== BOTTOM BAR ===== */}
      <div className="ps-footer-bottom">
        <span>
          © 2026 – Copyright UPSRLM.
          Powered by BDO India LLP | Government of Uttar Pradesh.
          All rights reserved.
        </span>

        <div className="footer-links">
          <a href="#">Disclaimer</a>
          <a href="#">Terms & Conditions</a>
          <a href="#">Privacy Policy</a>
        </div>
      </div>

      {/* ===== STYLES ===== */}
      <style>{`
        .ps-footer {
          background: #ffffff;
          color: #334155;
          font-size: 14px;
        }

        .ps-footer-top {
          max-width: 1400px;
          margin: 0 auto;
          padding: 60px 24px;
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr;
          gap: 40px;
          align-items: left;
          text-align: left;
        }

        .footer-col h4 {
          font-size: 16px;
          margin-bottom: 16px;
          font-weight: 700;
        }

        .footer-col ul {
          list-style: none;
          padding: 0;
        }

        .footer-col li {
          margin-bottom: 10px;
          opacity: 0.85;
          cursor: pointer;
        }

        .footer-col li:hover {
          opacity: 1;
          text-decoration: underline;
        }

        .section-gap {
          margin-top: 16px;
        }

        /* BRAND */
        .footer-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .ps-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }

        .brand-name {
          font-size: 20px;
          font-weight: 800;
        }

        .brand-desc {
          line-height: 1.6;
          opacity: 0.85;
          margin-bottom: 16px;
        }

        .social-icons {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #1e293b;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          cursor: pointer;
        }

        .updated {
          font-size: 12px;
          opacity: 0.7;
        }

        /* RIGHT COL */
        .right {
          text-align: left;
        }

        .di-placeholder,
        .playstore-placeholder {
          width: 160px;
          height: 48px;
          background: #1e293b;
          border-radius: 6px;
          display: flex;
          align-items: left;
          justify-content: left;
          margin: 12px 0;
          font-size: 12px;
        }

        /* BOTTOM BAR */
        .ps-footer-bottom {
          border-top: 1px solid #334155;
          padding: 18px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
          font-size: 13px;
          opacity: 0.9;
        }
        .footer-links {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }          
        .footer-links a {
          color: #334155;
          text-decoration: none;
          font-weight: 500;
        }

        .footer-links a:hover {
          text-decoration: underline;
        }

        .powered-by p {
          font-size: 13px;
          opacity: 0.9;
          margin-top: 2px;
        }

        /* RESPONSIVE */
        @media (max-width: 1100px) {
          .ps-footer-top {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 600px) {
          .ps-footer-top {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </footer>
  );
}
