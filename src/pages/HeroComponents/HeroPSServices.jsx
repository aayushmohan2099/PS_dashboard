import React from "react";

/**
 * HeroPSServices
 * 4 flip cards – Front: Image | Back: Description
 * Hover to flip
 */

import bmsImg from "../../assets/Hero/Services/bms.png";
import tmsImg from "../../assets/Hero/Services/tms.png";
import esmImg from "../../assets/Hero/Services/esm.png";
import ldmsImg from "../../assets/Hero/Services/ldms.png";

import bmsLogo from "../../assets/bms_logo.png";
import tmsLogo from "../../assets/tms_logo.png";
import esmLogo from "../../assets/ems_logo.png";
import ldmsLogo from "../../assets/ldms_logo.png";

export default function HeroPSServices() {
  const services = [
    {
      title: "Beneficiary Management System",
      image: bmsImg,
      logo: bmsLogo,
      description:
        "Capturing livelihood data to enable skill-based employment and financial inclusion. Empowering SHG women through structured data, targeted training, and continuous livelihood monitoring across the State."
    },
    {
      title: "Training Management System",
      image: tmsImg,
      logo: tmsLogo,
      description:
        "Monitoring capacity building at Block, District, and State level. Identifying skill gaps, delivering focused trainings, and tracking outcomes to build resilient rural livelihoods."
    },
    {
      title: "Enterprise Sakhi Management System",
      image: esmImg,
      logo: esmLogo,
      description:
        "Enterprise Mapping & Beneficiary Management. Monitoring government support and village-level enterprises, mapping assistance, tracking enterprises, spreading awareness, and encouraging new women-led ventures across rural UP."
    },
    {
      title: "Lakhpati Didi Management System",
      image: ldmsImg,
      logo: ldmsLogo,
      description:
        "From Potential to Lakhpati Didi. Tracking growth, income, and enterprise success, supporting SHG women in their journey with real-time progress tracking and outcome-based upliftment."
    }
  ];

  return (
    <div className="ps-services">

      <h2 className="ps-services-heading">
        <span className="serv-our">Our</span>{" "}
        <span className="serv-services">Services</span>
      </h2>

      <div className="ps-services-grid">
        {services.map((service, index) => (
          <div className="card" key={index}>
            <div className="card-inner">

              {/* FRONT */}
              <div className="card-front">

                {/* LOGO + TITLE STRIP */}
                <div className="card-header">
                  <img src={service.logo} alt={`${service.title} Logo`} />
                  <span>{service.title}</span>
                </div>

                {/* MAIN IMAGE */}
                <div className="card-image">
                  <img src={service.image} alt={service.title} />
                </div>

              </div>

              {/* BACK */}
              <div className="card-back">
                <p>{service.description}</p>
              </div>

            </div>
          </div>
        ))}
      </div>

      <style>{`
        /* ===== SECTION ===== */
        .ps-services {
          max-width: 1500px;
          margin: 0 auto;
          text-align: center;
        }

        .ps-services-heading {
          font-size: 40px;
          font-weight: 800;
          margin-bottom: 48px;
        }

        .serv-our {
          color: #0f172a;
        }

        .serv-services {
          color: #fd7301;
        }

        /* ===== GRID ===== */
        .ps-services-grid {
          display: flex;
          justify-content: center;
          gap: 36px;
          flex-wrap: wrap;
        }

        /* ===== CARD ===== */
        .card {
          width: 300px;           
          height: 380px;
          perspective: 1000px;
        }

        .card-inner {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.9s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card:hover .card-inner {
          transform: rotateY(180deg);
        }

        .card-front,
        .card-back {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* ===== FRONT ===== */
        .card-front {
          background: #ffffff;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
        }

        /* 🔶 LOGO + TITLE STRIP */
        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 2px solid #fd7301;   /* 👈 ORANGE BORDER */
          border-top: 2px solid #fd7301;
          background: #fff7ed;
        }

        .card-header img {
          width: 60px;
          height: auto;
        }

        .card-header span {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          text-align: left;
        }

        /* IMAGE AREA */
        .card-image {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .card-image img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        /* ===== BACK ===== */
        .card-back {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: #ffffff;
          padding: 26px;
          font-size: 14.5px;
          line-height: 1.65;
          transform: rotateY(180deg);
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: left;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 1200px) {
          .card {
            width: 340px;
            height: 360px;
          }
        }

        @media (max-width: 768px) {
          .ps-services-grid {
            gap: 24px;
          }
        }
      `}</style>
    </div>
  );
}
