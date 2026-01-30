// src/pages/LDMS/Support Map/ldms_support_capture.jsx
import React, { useState, useEffect } from "react";
import SCHeader from "./sup_cap_comps/SCHeader";
import SCRecor from "./sup_cap_comps/SCRecor";
import SCDepSche from "./sup_cap_comps/SCDepSche";
import SCPLDs from "./sup_cap_comps/SCPLDs";
import SCSubmitDock from "./sup_cap_comps/SCSubmitDock";
import { useParams } from "react-router-dom";
import { LDMS_API } from "../../../api/axios";
import LoadingModal from "../../../components/ui/LoadingModal";

export default function SupportCapture() {
  const [loading, setLoading] = useState(false);
  const { supportApprovalId } = useParams();
  const isEditMode = Boolean(supportApprovalId);
  const [supportData, setSupportData] = useState({
    bucketType: "",
    customBucket: "",
    benefitName: "",
    benefitAmount: "",
    description: "",
    trainingTheme: "",
    trainingPlan: "",
  });
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState([]);
  useEffect(() => {
    if (!isEditMode) return;

    async function loadDraft() {
      try {
        setLoading(true);
        const res = await LDMS_API.BucketApprovals.retrieve(
          `${supportApprovalId}/full-detail`,
        );

        const sb = res.data.support_bucket;

        // 1️⃣ Scheme
        setSelectedScheme(sb.scheme);

        // 2️⃣ Support data
        setSupportData({
          bucketType: sb.bucket_type.bucket_type,
          customBucket: "",
          benefitName: sb.benefit_name || "",
          benefitAmount: sb.benefit_amount || "",
          description: sb.benefit_description || "",
          trainingTheme: sb.training_support?.training_theme?.id || "",
          trainingPlan: sb.training_support?.training_plan?.id || "",
        });

        // 3️⃣ Beneficiaries
        setSelectedBeneficiaries(
          sb.recorded_benefs.map((b) => ({
            member: b,
            shg: {
              code: b.lokos_shg_code,
              districtId: b.district_id,
              blockId: b.block_id,
              panchayatId: b.panchayat_id,
              villageId: b.village_id,
            },
          })),
        );
      } finally {
        setLoading(false);
      }
    }

    loadDraft();
  }, [isEditMode, supportApprovalId]);
  if (loading) {
    return (
      <LoadingModal
        open
        title="Loading Draft Support Map"
        message="Fetching draft details…"
      />
    );
  }
  return (
    <div className="bmmu-ldms-dashboard">
      {/* Row 1 */}
      <div className="ldms-grid-row two-col">
        <div className="ldms-card">
          <h3>Step 1: Selecting Department and Schemes</h3>
          <SCHeader
            selectedScheme={selectedScheme}
            onSchemeSelect={setSelectedScheme}
          />
        </div>
        <div className="ldms-card">
          <h3>Step 2: Choosing Support Bucket</h3>
          <SCRecor
            selectedScheme={selectedScheme}
            supportData={supportData}
            onChange={setSupportData}
          />
        </div>
      </div>

      {/* Row 2 */}
      <div className="ldms-grid-row two-col">
        <div className="ldms-card">
          <h3>Step 3: Select Supported Beneficiaries</h3>
          <SCDepSche onSelectionChange={setSelectedBeneficiaries} />
        </div>
        <div className="ldms-card">
          <h3>Mapped Beneficiaries</h3>
          <SCPLDs
            beneficiaries={selectedBeneficiaries}
            onRemove={(memberCode) =>
              setSelectedBeneficiaries((prev) =>
                prev.filter((b) => b.member.member_code !== memberCode),
              )
            }
          />
        </div>
        <SCSubmitDock
          department={selectedScheme?.department}
          scheme={selectedScheme}
          supportData={supportData}
          beneficiaries={selectedBeneficiaries}
          editMode={isEditMode}
          supportApprovalId={supportApprovalId}
        />
      </div>

      {/* ---- styles ---- */}
      <style>{`
        .bmmu-ldms-dashboard {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ldms-grid-row {
          display: grid;
          gap: 16px;
        }

        .ldms-grid-row.two-col {
          grid-template-columns: 1fr 1fr;
        }

        .ldms-grid-row.one-col {
          grid-template-columns: 1fr;
        }

        .ldms-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 12px;
          min-height: 220px;
        }

        .ldms-card h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 700;
          color: #400b0b;
        }

        @media (max-width: 1024px) {
          .ldms-grid-row.two-col {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
