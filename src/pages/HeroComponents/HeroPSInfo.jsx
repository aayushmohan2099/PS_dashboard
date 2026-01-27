import React from "react";
import aboutImg from "../../assets/Hero/About/ps_diag.png";

export default function Info() {
  return (
    <div className="aboutus-wrapper">
      
      {/* LEFT : TEXT */}
      <div className="aboutus-left">
        <h2 className="aboutus-title">
          Purpose of Pragati Setu <br />
          <span>Bridging Progress and Prosperity</span>
        </h2>

        <p className="aboutus-text">
        Pragati Setu is a comprehensive digital platform developed to strengthen and streamline the management of <b>Self-Help Group (SHG)–related activities across Uttar Pradesh.</b> The platform acts as a digital bridge between rural women, Self Help Groups and government systems, enabling transparent, data-driven, and efficient governance.
        </p>

        <p className="aboutus-text">
        Designed to support the vision of sustainable livelihoods and women-led development, Pragati Setu enables systematic recording and <b>monitoring of beneficiary profiles, SHG enterprises, financial inclusion activities, and progress indicators at the grassroots level.</b> By replacing fragmented and paper-based processes with a unified digital system, the platform ensures accuracy, accountability, and timely decision-making.
        </p>

        <p className="aboutus-text">
        Through Pragati Setu, government departments gain a consolidated view of SHG performance and enterprise growth, enabling targeted interventions, effective resource allocation, and improved policy implementation. The platform empowers rural women by connecting their collective efforts to institutional support mechanisms, thereby fostering inclusive growth, economic self-reliance, and long-term prosperity.
        </p>

        <button className="aboutus-btn">Know More</button>
      </div>

      {/* RIGHT : IMAGE */}
      <div className="aboutus-right">
        <img src={aboutImg} alt="Pragati Setu Overview" />
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .aboutus-wrapper {
          max-width: 1500px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 48px;
          align-items: center;
        }

        /* LEFT */
        .aboutus-title {
          font-size: 38px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 20px;
          line-height: 1.2;
          
        }

        .aboutus-title span {
          color: #fd7301;
        }

        .aboutus-text {
          font-size: 16px;
          color: #334155;
          line-height: 1.7;
          margin-bottom: 18px;
          max-width: 560px;
        }

        .aboutus-btn {
          margin-top: 12px;
          background: #fd7301;
          color: #ffffff;
          border: none;
          padding: 12px 26px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .aboutus-btn:hover {
          background: #e86500;
          box-shadow: 0 6px 18px rgba(253, 115, 1, 0.35);
        }

        /* RIGHT */
        .aboutus-right {
          display: flex;
          justify-content: center;
        }

        .aboutus-right img {
          max-width: 800px;
          height: auto;
        }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .aboutus-wrapper {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .aboutus-text {
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>
    </div>
  );
}
