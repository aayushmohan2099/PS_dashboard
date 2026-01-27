import React, { useEffect, useState } from "react";

import img1 from "../../assets/Hero/ss_img_1.png";
import img2 from "../../assets/Hero/ss_img_2.png";
import img3 from "../../assets/Hero/ss_img_3.png";
import img4 from "../../assets/Hero/ss_img_4.png";

export default function SlideShow() {
  const images = [img1, img2, img3, img4];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, 6000); // smoother pacing

    return () => clearInterval(timer);
  }, [images.length]);

  const goNext = () => setActive((prev) => (prev + 1) % images.length);
  const goPrev = () => setActive((prev) => (prev - 1 + images.length) % images.length);

  const prevIndex = (active - 1 + images.length) % images.length;
  const nextIndex = (active + 1) % images.length;

  return (
    <div className="hero-slideshow">

      {/* LEFT ARROW */}
      <button className="nav-arrow left" onClick={goPrev}>
        ❮
      </button>

      {/* RIGHT ARROW */}
      <button className="nav-arrow right" onClick={goNext}>
        ❯
      </button>

      {/* PREVIOUS (LEFT BLUR) */}
      <img src={images[prevIndex]} className="hero-slide side left" alt="" />

      {/* ACTIVE (CENTER) */}
      <img src={images[active]} className="hero-slide center" alt="" />

      {/* NEXT (RIGHT BLUR) */}
      <img src={images[nextIndex]} className="hero-slide side right" alt="" />

      {/* PAGINATION */}
      <div className="pagination">
        {images.map((_, i) => (
          <span
            key={i}
            className={`dot ${i === active ? "active" : ""}`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>

      <style>{`
        .hero-slideshow {
          width: 100%;
          max-width: 1100px;
          height: 520px;
          margin: 0 auto;
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow: visible;
        }

        /* SLIDES */
        .hero-slide {
          position: absolute;
          top: 0;
          max-height: 100%;
          object-fit: contain;
          transition: 
            opacity 0.9s ease,
            transform 1.2s cubic-bezier(0.22, 1, 0.36, 1),
            filter 1s ease;
          pointer-events: none;
        }

        .hero-slide.center {
          position: relative;
          z-index: 3;
          opacity: 1;
          transform: scale(0.9);
          filter: none;
        }

        .hero-slide.side {
          width: 100%;
          opacity: 0.35;
          filter: blur(6px);
          z-index: 1;
        }

        .hero-slide.side.left {
          left: -52%;
          top: 15%;
        }

        .hero-slide.side.right {
          right: -52%;
          top: 15%;
        }

        /* ARROWS */
        .nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(253, 115, 1, 0.9);
          color: #fff;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          z-index: 10;
          transition: all 0.3s ease;
        }

        .nav-arrow:hover {
          background: #fd7301;
          box-shadow: 0 0 14px rgba(253, 115, 1, 0.6);
          transform: translateY(-50%) scale(1.1);
        }

        .nav-arrow.left {
          left: -170px;
        }

        .nav-arrow.right {
          right: -180px;
        }

        /* PAGINATION */
        .pagination {
          position: absolute;
          bottom: -28px;
          display: flex;
          gap: 10px;
          z-index: 10;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #cbd5e1;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .dot.active {
          background: #fd7301;
          transform: scale(1.3);
        }

        .dot:hover {
          background: #fd7301;
        }

        /* MOBILE */
        @media (max-width: 768px) {
          .hero-slide.side {
            display: none;
          }

          .nav-arrow {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
