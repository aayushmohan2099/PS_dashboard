// src/pages/Home.jsx
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import ps_logo from "../assets/PS_TRANS.png";
import up_logo from "../assets/upgov_logo.jpg";
import nav_logo from "../assets/top_nav_banner.png";
import HeroLayout from "./HeroComponents/HeroLayout.jsx";
import Footer from "../components/layout/Footer.jsx";

export default function Home() {

  /* ================= FONT SIZE CONTROLS ================= */
  const setFontScale = (scale) => {
    document.documentElement.style.setProperty("--font-scale", scale);
  };

  useEffect(() => {
    // default font scale
    setFontScale(1);
  }, []);

  return (
    <div className="home-shell">

      {/* ================= ACCESSIBILITY HEADER ================= */}
      <header className="gov-header">
        <div className="gov-header-inner">

          {/* LEFT : LOGO + TEXT */}
          <div className="gov-header-left">
            <img src={up_logo} alt="Government Logo" className="gov-logo" />
            <span className="gov-text">Government Of Uttar Pradesh</span>
          </div>

          {/* RIGHT : ACCESSIBILITY CONTROLS */}
          <div className="gov-header-right">
            <button onClick={() => setFontScale(0.9)}>A-</button>
            <button onClick={() => setFontScale(1)}>A</button>
            <button onClick={() => setFontScale(1.1)}>A+</button>

            <span className="divider">|</span>

            <button className="lang-btn">English</button>
            <span className="divider">|</span>
            <button className="lang-btn">हिंदी</button>
          </div>
        </div>
      </header>

      {/* ================= TOP NAV ================= */}
      <nav className="home-topnav">
        <div className="topnav-inner">

          {/* LEFT : PRAGATI SETU LOGO */}
          <div className="topnav-left">
            <img src={nav_logo} alt="Pragati Setu" className="nav-logo" />
          </div>

          {/* RIGHT : MENUS */}
          <ul className="topnav-menu">

            {/* ABOUT US */}
            <li className="menu-item dropdown">
              <span>
                About Us <span className="arrow">▾</span>
              </span>
              <ul className="dropdown-menu">
                <li>
                  <a href="https://srlm.up.gov.in/en" target="_blank" rel="noreferrer">
                    UPSRLM
                  </a>
                </li>
                <li>Pragati Setu</li>
              </ul>
            </li>

            {/* OUR SERVICES */}
            <li className="menu-item dropdown">
              <span>
                Our Services <span className="arrow">▾</span>
              </span>
              <ul className="dropdown-menu">
                <li>Beneficiary Profiling</li>
                <li>User Management</li>
                <li>Training Management (TMS)</li>
                <li>Lakhpati Didi (LDMS)</li>
                <li>Enterprise Tracking (SU-Sakhi)</li>
                <li>Monitoring and Analytics</li>
              </ul>
            </li>

            {/* DASHBOARDS */}
            <li className="menu-item dropdown">
              <span>
                Dashboards <span className="arrow">▾</span>
              </span>
              <ul className="dropdown-menu">
                <li>Pragati Setu</li>
                <li>Power BI Analytics</li>
              </ul>
            </li>

            {/* REPORT */}
            <li className="menu-item">
              <span>Report</span>
              <ul className="dropdown-menu single">
                <li>Coming Soon</li>
              </ul>
            </li>

            {/* RESOURCE CENTRE */}
            <li className="menu-item dropdown">
              <span>
                Resource Centre <span className="arrow">▾</span>
              </span>
              <ul className="dropdown-menu">
                <li>User Manual</li>
                <li>Frequently Asked Questions</li>
                <li>What’s New</li>
              </ul>
            </li>

            {/* LOGIN BUTTON */}
            <li className="menu-item">
              <Link to="/login" className="cta-login">
                <span>LOGIN</span>
                <span className="arrow-wrap">
                  <svg width="52px" height="34px" viewBox="0 0 66 43">
                    <g fill="none">
                      <path className="one" d="M40.15 3.89L43.97.14 65.69 20.78c.39.39.39 1.02 0 1.41L43.97 42.86 40.15 39.11 56.99 21.86z" fill="#fff"/>
                      <path className="two" d="M20.15 3.89L23.97.14 45.69 20.78c.39.39.39 1.02 0 1.41L23.97 42.86 20.15 39.11 36.99 21.86z" fill="#fff"/>
                      <path className="three" d="M.15 3.89L3.97.14 25.69 20.78c.39.39.39 1.02 0 1.41L3.97 42.86.15 39.11 16.99 21.86z" fill="#fff"/>
                    </g>
                  </svg>
                </span>
              </Link>
            </li>

          </ul>
        </div>
      </nav>


      {/* ================= HERO SECTION ================= */}
      <main className="home-hero">
        <div className="hero-inner">
          <HeroLayout />
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="home-footer">
        <Footer />
      </footer>

      {/* ================= STYLES ================= */}
      <style>{`
        /* ===== Root shell ===== */
        .home-shell {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #ffffff;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* ================= GLOBAL FONT SCALING ================= */
        :root {
          --font-scale: 1;
        }

        body {
          font-size: calc(16px * var(--font-scale));
        }

        /* ================= GOV HEADER ================= */
        .gov-header {
          background: #0f172a; /* #fd7301 */
          color: #fff;
          font-size: 14px;
        }

        .gov-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 16px;
        }

        /* LEFT */
        .gov-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          margin-left: 350px; 
        }

        .gov-logo {
          height: 35px;
          border-radius: 25px;
          border: 2px solid #0f172a;
          width: auto;
        }

        .gov-text {
          font-size: 15px;
        }

        /* RIGHT */
        .gov-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-right: 350px; 
        }

        .gov-header-right button {
          background: transparent;
          border: none;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 4px;
        }

        .gov-header-right button:hover {
          text-decoration: underline;
        }

        .divider {
          opacity: 0.7;
          padding: 0 4px;
        }

        .lang-btn {
          font-weight: 500;
        }

        /* ======= TOP NAV ======== */
        .home-topnav {
          background: #ffffff;
          border-bottom: none;                    
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15); 
          position: relative;                     
          z-index: 50;                            
        }

        .topnav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 24px;
        }

        /* LEFT */
        .topnav-left {
          margin-left: 38px;
        }

        .nav-logo {
          height: 72px;
        }

        /* RIGHT MENU */
        .topnav-menu {
          list-style: none;
          display: flex;
          align-items: center;
          gap: 28px;
          margin-right: 10px;
          padding: 0;
        }

        /* MENU ITEMS */
        .menu-item {
          position: relative;
          font-weight: 600;
          color: #0f172a;
          cursor: pointer;
        }

        /* TEXT + ARROW */
        .menu-item span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .arrow {
          transition: transform 0.3s ease;
        }

        /* DROPDOWN */
        .dropdown-menu {
          position: absolute;
          top: 130%;
          left: 0;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          min-width: 240px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px);
          transition: all 0.25s ease;
          z-index: 100;
          list-style: none;     
          padding-left: 0;             
        }

        .dropdown-menu li {
          padding: 10px 14px;
          font-size: 14px;
          white-space: nowrap;
        }

        .dropdown-menu li:hover {
          background: #f1f5f9;
        }

        .dropdown-menu li::marker {
          content: none;
        }

        /* SHOW DROPDOWN */
        .menu-item:hover .dropdown-menu {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        /* ARROW ROTATE */
        .menu-item:hover .arrow {
          transform: rotate(180deg);
        }

        /* LINKS */
        .dropdown-menu a {
          text-decoration: none;
          color: #0f172a;
        }

        /* LOGIN BUTTON */
        .login-btn {
          background: #0f172a;
          color: #ffffff;
          padding: 8px 18px;
          border-radius: 4px;
          text-decoration: none;
          font-weight: 700;
        }

        .login-btn:hover {
          opacity: 0.9;
        }

        /* ===== ANIMATED LOGIN CTA ===== */
        .cta-login {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 22px;
          background: #0f172a;
          color: #fff;
          font-weight: 800;
          font-size: 14px;
          text-decoration: none;
          transform: skewX(-15deg);
          box-shadow: 5px 5px 0 #000;
          transition: all 0.4s ease;
        }

        .cta-login span {
          transform: skewX(15deg);
          display: inline-flex;
          alignwrk-items: center;
        }

        .cta-login:hover {
          box-shadow: 8px 8px 0 #fd7301;
        }

        .arrow-wrap {
          transition: margin-right 0.4s ease;
        }

        .cta-login:hover .arrow-wrap {
          margin-right: 18px;
        }

        /* SVG ARROWS */
        .cta-login path.one {
          transform: translateX(-60%);
          transition: 0.4s;
        }

        .cta-login path.two {
          transform: translateX(-30%);
          transition: 0.5s;
        }

        .cta-login:hover path.one,
        .cta-login:hover path.two {
          transform: translateX(0);
        }

        .cta-login:hover path.one {
          animation: arrowPulse 1s infinite 0.4s;
        }

        .cta-login:hover path.two {
          animation: arrowPulse 1s infinite 0.2s;
        }

        .cta-login:hover path.three {
          animation: arrowPulse 1s infinite;
        }

        /* COLOR PULSE */
        @keyframes arrowPulse {
          0% { fill: #ffffff; }
          50% { fill: #fd7301; }
          100% { fill: #ffffff; }
        }

        /* ===== HERO ===== */
        .home-hero {
          width: 100%;
          overflow-x: visible;
        }

        .hero-inner {
          width: 100%;
        }

        /* ===== FOOTER ===== */
        .home-footer {
          text-align: center;
          font-size: 28px;
          font-weight: 800;
          border-top: 2px solid #334155;
        }
      `}</style>
    </div>
  );
}
