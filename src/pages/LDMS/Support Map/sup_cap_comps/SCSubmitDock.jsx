// src/pages/LDMS/Support Map/sup_cap_comps/SCSubmitDock.jsx
import React, { useState, useContext, useEffect } from "react";
import {
  FaPaperPlane,
  FaSave,
  FaChevronUp,
  FaChevronDown,
  FaTrash,
} from "react-icons/fa";
import { LDMS_API, LOOKUP_API } from "../../../../api/axios";
import { AuthContext } from "../../../../contexts/AuthContext";
import LoadingModal from "../../../../components/ui/LoadingModal";

export default function SCSubmitDock({
  department,
  scheme,
  supportData,
  beneficiaries,
  editMode,
  supportApprovalId,
}) {
  const { user } = useContext(AuthContext) || {};
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockId, setBlockId] = useState(null);
  const [loadingText, setLoadingText] = useState("");
  const [showLoader, setShowLoader] = useState(false);
  const [supportBucketId, setSupportBucketId] = useState(null);
  const [sbTypeId, setSbTypeId] = useState(null);
  const [trainingSupportId, setTrainingSupportId] = useState(null);

  /* -------- Load block -------- */
  useEffect(() => {
    async function loadGeoscope() {
      if (!user?.id) return;
      const res = await LOOKUP_API.userGeoscopeByUserId(user.id);
      const blocks = res?.data?.blocks || [];
      if (blocks.length) setBlockId(blocks[0]);
    }
    loadGeoscope();
  }, [user?.id]);

  useEffect(() => {
    if (!editMode || !supportApprovalId) return;

    async function loadEditIds() {
      const res = await LDMS_API.BucketApprovals.retrieve(
        `${supportApprovalId}/full-detail`,
      );

      const sb = res.data.support_bucket;

      setSupportBucketId(sb.id);
      setSbTypeId(sb.bucket_type.id);
      setTrainingSupportId(sb.training_support?.id || null);
    }

    loadEditIds();
  }, [editMode, supportApprovalId]);

  const isTraining = supportData.bucketType === "Training";

  const isReady =
    department &&
    scheme &&
    supportData.bucketType &&
    beneficiaries?.length > 0 &&
    (!isTraining || (supportData.trainingTheme && supportData.trainingPlan));

  async function handleSubmit(mode = "PENDING") {
    try {
      setSubmitting(true);
      setShowLoader(true);

      setLoadingText(
        mode === "DRAFT"
          ? "Saving support map as draft…"
          : "Submitting support map for approval…",
      );

      /* ======================= EDIT MODE ======================= */
      if (editMode) {
        /* 1️⃣ Update SBType */
        await LDMS_API.SBTypes.update(sbTypeId, {
          bucket_type:
            supportData.bucketType === "Others"
              ? supportData.customBucket
              : supportData.bucketType,
          updated_by: user.id,
        });

        /* 2️⃣ Update Support Bucket */
        await LDMS_API.SupportBuckets.update(supportBucketId, {
          benefit_name: supportData.benefitName,
          benefit_amount: supportData.benefitAmount,
          benefit_description: supportData.description || "",
          updated_by: user.id,
        });

        /* 3️⃣ Training Support UPSERT */
        if (supportData.bucketType === "Training") {
          if (trainingSupportId) {
            await LDMS_API.SBTrainings.update(trainingSupportId, {
              training_theme: supportData.trainingTheme,
              training_plan: supportData.trainingPlan,
              updated_by: user.id,
            });
          } else {
            await LDMS_API.SBTrainings.create({
              training_theme: supportData.trainingTheme,
              training_plan: supportData.trainingPlan,
              support_bucket: supportBucketId,
              created_by: user.id,
            });
          }
        }

        /* 4️⃣ Replace Beneficiaries */
        await LDMS_API.recorPLDS.deleteBySupportBucket(supportBucketId);

        await Promise.all(
          beneficiaries.map(({ member, shg }) =>
            LDMS_API.recorPLDS.create({
              lokos_shg_code: shg.code,
              lokos_member_code: member.member_code,
              pld_status: member.pld_status ? "Yes" : "No",
              member_name: member.member_name,
              designation: member.member_designations?.[0]?.designation || "",
              gender: member.gender,
              religion: member.religion,
              marital_status: member.marital_status,
              father_husband_name: member.relation_name,
              social_category: member.social_category,
              education: member.education,
              district_id: shg.districtId,
              block_id: shg.blockId,
              panchayat_id: shg.panchayatId,
              village_id: shg.villageId,
              mobile: member.member_phones?.[0]?.phone_no || "",
              age: member.age,
              support_bucket: supportBucketId,
              created_by: user.id,
            }),
          ),
        );

        /* 5️⃣ Update Approval */
        await LDMS_API.BucketApprovals.update(supportApprovalId, {
          approval_status: mode,
          updated_by: user.id,
        });

        alert(
          mode === "DRAFT"
            ? "Draft updated successfully."
            : "Draft submitted for approval.",
        );
        return;
      }

      /* ---------- 1. SBTypes ---------- */
      const finalBucketType =
        supportData.bucketType === "Others"
          ? supportData.customBucket
          : supportData.bucketType;

      const sbTypeRes = await LDMS_API.SBTypes.create({
        bucket_type: finalBucketType,
        created_by: user.id,
      });

      const sbTypeId = sbTypeRes.data.id;

      /* ---------- 2. Support Bucket ---------- */
      const bucketRes = await LDMS_API.SupportBuckets.create({
        department: department,
        scheme: scheme.id,
        bucket_type: sbTypeId,
        benefit_name: supportData.benefitName,
        benefit_amount: supportData.benefitAmount,
        benefit_description: supportData.description || "",
        created_by: user.id,
      });

      const supportBucketId = bucketRes.data.id;

      /* ---------- 3. Training Support (if needed) ---------- */
      if (supportData.bucketType === "Training") {
        await LDMS_API.SBTrainings.create({
          training_theme: supportData.trainingTheme,
          training_plan: supportData.trainingPlan,
          support_bucket: supportBucketId,
          created_by: user.id,
        });
      }

      function calculateAge(dob) {
        if (!dob) return null;
        const birth = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return age;
      }

      /* ---------- 4. Recorded Beneficiaries ---------- */
      await Promise.all(
        beneficiaries.map(({ member, shg }) =>
          LDMS_API.recorPLDS.create({
            lokos_shg_code: shg.code,
            lokos_member_code: member.member_code,
            pld_status: member.pld_status ? "Yes" : "No",
            member_name: member.member_name,
            designation: member.member_designations?.[0]?.designation || "",
            gender: member.gender,
            religion: member.religion,
            marital_status: member.marital_status,
            father_husband_name: member.relation_name,
            social_category: member.social_category,
            education: member.education,
            district_id: shg.districtId,
            block_id: shg.blockId,
            panchayat_id: shg.panchayatId,
            village_id: shg.villageId,
            mobile: member.member_phones?.[0]?.phone_no || "",
            age: calculateAge(member.dob),
            support_bucket: supportBucketId,
            created_by: user.id,
          }),
        ),
      );

      /* ---------- 5. Bucket Approval ---------- */
      await LDMS_API.BucketApprovals.create({
        support_bucket: supportBucketId,
        approval_status: mode,
        block_id: blockId,
        created_by: user.id,
      });

      if (mode === "DRAFT") {
        alert("+1 Submission saved, please submit from Draft screen!");
        window.location.reload();
      } else {
        alert("Submitted for approval successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong during submission.");
    } finally {
      setSubmitting(false);
      setShowLoader(false);
      setLoadingText("");
    }
  }

  async function handleDelete() {
    if (!supportApprovalId || !supportBucketId || !sbTypeId) return;

    const ok = window.confirm(
      "This will permanently delete the entire Support Map.\n\nThis action CANNOT be undone.\n\nProceed?",
    );
    if (!ok) return;

    try {
      setShowLoader(true);
      setLoadingText("Deleting support map…");

      /* 1️⃣ Delete Bucket Approval */
      await LDMS_API.BucketApprovals.destroy(supportApprovalId);

      /* 2️⃣ Delete Training Support (if any) */
      if (trainingSupportId) {
        await LDMS_API.SBTrainings.destroy(trainingSupportId);
      }

      /* 3️⃣ Delete ALL Recorded Beneficiaries */
      const pldRes = await LDMS_API.recorPLDS.list({
        support_bucket: supportBucketId,
      });

      await Promise.all(
        (pldRes.data.results || []).map((pld) =>
          LDMS_API.recorPLDS.destroy(pld.id),
        ),
      );

      /* 4️⃣ Delete Support Bucket */
      await LDMS_API.SupportBuckets.destroy(supportBucketId);

      /* 5️⃣ Delete SBType */
      await LDMS_API.SBTypes.destroy(sbTypeId);

      alert("Support Map deleted successfully.");
      window.location.href = "/ldms/support-buckets";
    } catch (err) {
      console.error(err);
      alert(
        "Deletion failed.\nSome records may still exist.\nPlease contact administrator.",
      );
    } finally {
      setShowLoader(false);
      setLoadingText("");
    }
  }

  return (
    <div className={`sc-submit-dock ${expanded ? "open" : ""}`}>
      <button className="toggle" onClick={() => setExpanded((v) => !v)}>
        {expanded ? <FaChevronDown /> : <FaChevronUp />}
      </button>

      {expanded && (
        <div className="actions">
          <button
            disabled={!isReady || submitting}
            onClick={() => handleSubmit("DRAFT")}
          >
            <FaSave /> Save
          </button>

          <button
            className="primary"
            disabled={!isReady || submitting}
            onClick={() => handleSubmit("PENDING")}
          >
            <FaPaperPlane /> Submit
          </button>

          {editMode && (
            <button
              className="danger"
              onClick={handleDelete}
              disabled={submitting}
            >
              <FaTrash /> Delete Entirely
            </button>
          )}
        </div>
      )}
      <LoadingModal
        open={showLoader}
        title={submitting ? "Processing Support Map" : "Please wait"}
        message={loadingText || "Please wait…"}
      />
      <style>{`
        .sc-submit-dock {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,.1);
          padding: 10px;
          z-index: 50;
        }

        .toggle {
          background: #7a0c0c;
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 10px;
        }

        .actions button {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #810000;
          cursor: pointer;
        }

        .actions button.primary {
          background: #7a0c0c;
          color: #fff;
          border-color: #7a0c0c;
        }

        .actions button.danger {
          background: #fee2e2;
          color: #7f1d1d;
          border: 1px solid #fecaca;
        }

        .actions button.danger:hover {
          background: #7f1d1d;
          color: #fff;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
