// src/pages/LDMS/Support Map/sup_cap_comps/SCRecor.jsx
import React, { useEffect, useState } from "react";
import {
  FaLayerGroup,
  FaRupeeSign,
  FaClipboard,
  FaChalkboardTeacher,
  FaInfoCircle,
  FaUserCheck,
  FaPhoneAlt,
} from "react-icons/fa";
import { LDMS_API, TMS_API } from "../../../../api/axios";

export default function SCRecor({ selectedScheme, supportData, onChange }) {
  const {
    bucketType,
    customBucket,
    benefitName,
    benefitAmount,
    description,
    trainingTheme,
    trainingPlan,
  } = supportData;

  function update(field, value) {
    onChange((prev) => ({ ...prev, [field]: value }));
  }

  const [themes, setThemes] = useState([]);
  const [plans, setPlans] = useState([]);

  /* -------- Fetch Training Themes -------- */
  useEffect(() => {
    if (bucketType === "Training") {
      TMS_API.trainingThemes
        .list()
        .then((res) => setThemes(res.data.results || []))
        .catch(() => setThemes([]));
    } else {
      setThemes([]);
      setPlans([]);
    }
  }, [bucketType]);

  /* -------- Fetch Training Plans -------- */
  useEffect(() => {
    if (trainingTheme) {
      TMS_API.trainingPlans
        .list({ theme: trainingTheme })
        .then((res) => setPlans(res.data.results || []))
        .catch(() => setPlans([]));
    }
  }, [trainingTheme]);
  if (!selectedScheme) {
    return (
      <div className="sc-empty">
        Please select a Department and Scheme first.
      </div>
    );
  }

  return (
    <div className="sc-record">
      {/* ---------------- Left Form ---------------- */}
      <div className="sc-form">
        <div className="sc-field">
          <label>
            <FaLayerGroup /> Support Bucket Type
          </label>
          <select
            value={bucketType}
            onChange={(e) => update("bucketType", e.target.value)}
          >
            <option value="">Select Support Bucket</option>
            <option value="Subsidy">Subsidy</option>
            <option value="Grant">Grant</option>
            <option value="Debt">Debt (Credit)</option>
            <option value="Training">Training</option>
            <option value="Others">Others</option>
          </select>
        </div>

        {bucketType === "Others" && (
          <div className="sc-field">
            <label>
              <FaClipboard /> Specify Support Type
            </label>
            <input
              type="text"
              placeholder="Enter support bucket type"
              value={customBucket}
              onChange={(e) => update("customBucket", e.target.value)}
            />
          </div>
        )}

        {/* -------- Non Training Fields -------- */}
        {bucketType && bucketType !== "Training" && (
          <>
            <div className="sc-field">
              <label>
                <FaClipboard /> Benefit Provided
              </label>
              <input
                type="text"
                placeholder="Describe benefit provided"
                value={benefitName}
                onChange={(e) => update("benefitName", e.target.value)}
              />
            </div>

            <div className="sc-field">
              <label>
                <FaRupeeSign /> Benefit Amount
              </label>
              <input
                type="number"
                placeholder="Enter amount (₹)"
                value={benefitAmount}
                onChange={(e) => update("benefitAmount", e.target.value)}
              />
            </div>

            <div className="sc-field">
              <label>Description (Optional)</label>
              <textarea
                rows="3"
                placeholder="Additional details..."
                value={description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
          </>
        )}

        {/* -------- Training Fields -------- */}
        {bucketType === "Training" && (
          <>
            <div className="sc-field">
              <label>
                <FaChalkboardTeacher /> Theme of Training
              </label>
              <select
                value={trainingTheme}
                onChange={(e) => update("trainingTheme", e.target.value)}
              >
                <option value="">Select Training Theme</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.theme_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sc-field">
              <label>
                <FaClipboard /> Training Plan
              </label>
              <select
                disabled={!trainingTheme}
                value={trainingPlan}
                onChange={(e) => update("trainingPlan", e.target.value)}
              >
                <option value="">Select Training Plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.training_name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* ---------------- Right Scheme Info ---------------- */}
      <div className="sc-scheme-info">
        <div className="sc-info-card">
          <h4>
            <FaInfoCircle /> Tip
          </h4>
          <ul>
            <li>
              Selected scheme is of <b>{selectedScheme.scope}</b> scope.
            </li>
            <li>
              Selected scheme is <b>{selectedScheme.funding}</b> funded.
            </li>
          </ul>
        </div>

        <div className="sc-info-card">
          <h4>
            <FaUserCheck /> Beneficiary Eligibility Criteria
          </h4>
          <p>{selectedScheme.elligibility}</p>
        </div>

        <div className="sc-contact">
          <FaPhoneAlt />
          Contact Point: <b>{selectedScheme.contact_point}</b>
        </div>
      </div>

      {/* ---------------- Styles ---------------- */}
      <style>{`
        .sc-record {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 18px;
        }

        .sc-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .sc-field label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #7a0c0c;
          margin-bottom: 6px;
        }

        .sc-field input,
        .sc-field select,
        .sc-field textarea {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-size: 14px;
        }

        .sc-field input:focus,
        .sc-field select:focus,
        .sc-field textarea:focus {
          outline: none;
          border-color: #b91c1c;
          box-shadow: 0 0 0 1px rgba(185, 28, 28, 0.25);
        }

        .sc-scheme-info {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .sc-info-card {
          background: #fff;
          border: 1px solid #f1f1f1;
          border-left: 5px solid #b91c1c;
          border-radius: 10px;
          padding: 12px;
        }

        .sc-info-card h4 {
          margin: 0 0 6px;
          color: #7a0c0c;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sc-info-card ul {
          padding-left: 18px;
          margin: 0;
        }

        .sc-info-card p {
          margin: 0;
          line-height: 1.6;
        }

        .sc-contact {
          border: 1px dashed #b91c1c;
          border-radius: 10px;
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #7a0c0c;
        }

        .sc-empty {
          color: #9ca3af;
          font-style: italic;
        }

        @media (max-width: 1024px) {
          .sc-record {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
