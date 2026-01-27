import React from "react";
import SlideShow from "./HeroSlideshow";
import Info from "./HeroPSInfo";
import app_section from "../../assets/Hero/SCRPEP/section.png";
import Services from "./HeroPSServices";
import FAQ from "./HeroFAQs";
import faqBg from "../../assets/Hero/faq_bg.png";
import Contact from "./HeroContactUs";
import conBg from "../../assets/Hero/con_us_bg.png";

/**
 * HeroLayout
 * Full landing-page content container
 */

export default function HeroLayout() {
  return (
    <div className="hero-layout">

      {/* ================= HERO SLIDESHOW (FULL BLEED) ================= */}
      <section className="hero-slideshow-section">
        <SlideShow />
      </section>

      {/* ================= PRAGATI SETU INFO ================= */}
      <section className="hero-section hero-info">
        <Info />
      </section>

      {/* ================= CRP APPLICATION ================= */}
      <section className="hero-section hero-crp">
      <div className="hero-crp-image">
        <img src={app_section} alt="Pragati Setu Overview" />
      </div>
      </section>

      {/* ================= OUR SERVICES ================= */}
      <section className="hero-section hero-services">
        <Services />
      </section>

      {/* ================= WHAT’S NEW =================
      <section className="hero-section hero-whats-new">
        <h2 className="hero-heading">What’s New</h2>
        <p className="hero-placeholder">
          Latest updates, announcements, and releases.
        </p>
      </section> */}

      {/* ================= FAQs ================= */}
      <section className="hero-section hero-faq">
        <FAQ />
      </section>

      {/* ================= CONTACT US ================= */}
      <section className="hero-section hero-contact">
        <Contact />
      </section>

      {/* ================= STYLES ================= */}
      <style>{`
        /* ===== HERO LAYOUT ===== */
        .hero-layout {
          display: flex;
          flex-direction: column;
        }

        /* ===== SLIDESHOW SECTION ===== */
        .hero-slideshow-section {
          justify-content: center;
          align-items: center;
          padding: 0;
          margin: 0;
          overflow: hidden;
        }

        /* ===== CONTENT SECTIONS ===== */
        .hero-section {
          padding: 64px 0px;
          background: #ffffff;
        }

        .hero-heading {
          font-size: 32px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 16px;
        }

        .hero-placeholder {
          font-size: 16px;
          color: #475569;
          max-width: 800px;
          line-height: 1.6;
        }

        /* ===== CRP APPLICATION IMAGE ===== */
        .hero-crp-image {
          height: 700px;
          display: flex;
          justify-content: center;
          overflow: hidden;
        }

        /* ===== FAQ SECTION BACKGROUND ===== */
        .hero-faq {
          background-image: url(${faqBg});
          background-size: cover;
          background-position: center;
        }
        
        /* ===== CONTACT US SECTION BACKGROUND ===== */
        .hero-contact {
          background-image: url(${conBg});
          background-size: cover;
          background-position: center;
        } 

      `}</style>
    </div>
  );
}
