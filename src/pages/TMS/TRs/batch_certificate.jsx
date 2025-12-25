// src/pages/TMS/TRs/batch_certificate.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeftNav from "../../../components/layout/LeftNav";
import TopNav from "../../../components/layout/TopNav";
import { AuthContext } from "../../../contexts/AuthContext";
import api, { LOOKUP_API, TMS_API } from "../../../api/axios";
import { getCanonicalRole } from "../../../utils/roleUtils";
import JSZip from "jszip";
import { Document, Packer, Paragraph, TextRun } from "docx";
const CERT_CACHE_KEY = "tms_batch_certificate_cache_v1";

function getCacheKey(batchId) {
  return `${CERT_CACHE_KEY}_${batchId}`;
}

function saveCache(batchId, payload) {
  try {
    localStorage.setItem(
      getCacheKey(batchId),
      JSON.stringify({ ts: Date.now(), payload })
    );
  } catch {}
}

function loadCache(batchId) {
  try {
    const raw = localStorage.getItem(getCacheKey(batchId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function BatchCertificate() {
  const { user } = useContext(AuthContext) || {};
  const { id: batchId } = useParams();
  const role = getCanonicalRole(user || {});
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [batchDetail, setBatchDetail] = useState(null);
  const [closureRow, setClosureRow] = useState(null);
  const [reportRow, setReportRow] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [certificateData, setCertificateData] = useState(null);
  const [generating, setGenerating] = useState(false);

  const didRunRef = useRef(false);

  const requestLevel = batchDetail?.request?.level || null;
  const isBMMU = role === "bmmu";
  const isDMMU = role === "dmmu";
  const isSMMU = role === "smmu";
  const hasCertificatesIssued = !!closureRow?.certificates_issued;
  const canGenerateAtBlock =
    isBMMU && requestLevel === "BLOCK" && !hasCertificatesIssued;
  const canGenerateAtDistrict =
    isDMMU && requestLevel === "DISTRICT" && !hasCertificatesIssued;

  /* ---------------- fetchers ---------------- */

  async function fetchBatchDetail() {
    if (!batchId) return null;
    try {
      const resp = await api.get(`/tms/batches/${batchId}/detail/`);
      return resp?.data || null;
    } catch (e) {
      console.error("fetch batch detail failed", e);
      return null;
    }
  }

  async function fetchClosureRow() {
    if (!batchId) return null;
    try {
      const resp = await api.get(
        `/tms/batch-closure-requests/?batch=${batchId}&page_size=1`
      );
      return resp?.data?.results?.[0] || null;
    } catch (e) {
      console.error("fetch closure failed", e);
      return null;
    }
  }

  async function fetchReportRow() {
    if (!batchId) return null;
    try {
      const resp = await api.get(
        `/tms/batch-reports/?batch=${batchId}&page_size=1`
      );
      return resp?.data?.results?.[0] || null;
    } catch (e) {
      console.error("fetch report failed", e);
      return null;
    }
  }

  async function fetchTrainingPlan(trainingPlanId) {
    if (!trainingPlanId) return null;
    try {
      const resp = await api.get(
        `/tms/training-plans/${trainingPlanId}/detail/`
      );
      return resp?.data || null;
    } catch (e) {
      console.error("fetch training plan failed", e);
      return null;
    }
  }

  async function fetchUserGeoscope(userId) {
    if (!userId) return null;
    try {
      const resp = await api.get(`/lookups/user-geoscope/${userId}`);
      return resp?.data || null;
    } catch (e) {
      console.error("fetch user geoscope failed", e);
      return null;
    }
  }

  async function fetchBlock(blockId) {
    if (!blockId) return null;
    try {
      const resp = await LOOKUP_API.blocks.list({
        search: blockId,
        page_size: 1,
      });
      return resp?.data?.results?.[0] || null;
    } catch (e) {
      console.error("fetch block failed", e);
      return null;
    }
  }

  async function fetchDistrict(districtId) {
    if (!districtId) return null;
    try {
      const resp = await LOOKUP_API.districts.list({
        search: districtId,
        page_size: 1,
      });
      return resp?.data?.results?.[0] || null;
    } catch (e) {
      console.error("fetch district failed", e);
      return null;
    }
  }

  async function fetchDMMUser(districtId) {
    if (!districtId) return null;
    try {
      const resp = await api.get(
        `/lookups/user-geoscope/?district_id=${districtId}&block_id=null`
      );
      const userIds = resp?.data?.user_ids || [];
      if (userIds.length >= 2) {
        const dmmUserId = userIds[1];
        return await fetchUserGeoscope(dmmUserId);
      }
      return null;
    } catch (e) {
      console.error("fetch DMM user failed", e);
      return null;
    }
  }

  async function fetchExpertUser(expertId) {
    if (!expertId) return null;
    try {
      const resp = await LOOKUP_API.users.detail(expertId);
      return resp?.data || null;
    } catch (e) {
      console.error("fetch expert user failed", e);
      return null;
    }
  }

  /* ==================== SIMPLIFIED DOCX DOWNLOAD ==================== */
  async function downloadCertificateDocx() {
    if (!certificateData) return;

    try {
      // Determine which template to use
      const templatePath =
        requestLevel === "BLOCK"
          ? "../../../assets/TMS/BlockBatchCertificateFormat.docx"
          : "../../../assets/TMS/DistrictBatchCertificateFormat.docx";

      // Fetch the template from public folder
      const response = await fetch(templatePath);
      if (!response.ok) throw new Error(`Template not found: ${templatePath}`);

      const arrayBuffer = await response.arrayBuffer();

      // Use JSZip only
      const zip = new JSZip();
      await zip.loadAsync(arrayBuffer);

      // Get document.xml
      const docXmlPath = "word/document.xml";
      if (!zip.file(docXmlPath)) throw new Error("Invalid DOCX template");

      const docXml = await zip.file(docXmlPath).async("text");

      // Replace ALL placeholders with actual values
      let updatedXml = docXml
        .replace(/<username>/g, certificateData.username || "-")
        .replace(/<today_date>/g, certificateData.today_date || "-")
        .replace(/<financial_year>/g, certificateData.financial_year || "-")
        .replace(
          /<training_plan__theme__theme_name>/g,
          certificateData.training_plan__theme__theme_name || "-"
        )
        .replace(
          /<training_request__training_type>/g,
          certificateData.training_request__training_type || "-"
        )
        .replace(
          /<training_plan__no_of_days>/g,
          certificateData.training_plan__no_of_days || "-"
        )
        .replace(
          /<training_plan__type_of_training>/g,
          certificateData.training_plan__type_of_training || "-"
        )
        .replace(
          /<batch__start_date>/g,
          certificateData.batch__start_date || "-"
        )
        .replace(/<batch__end_date>/g, certificateData.batch__end_date || "-")
        .replace(
          /<training_request__level>/g,
          certificateData.training_request__level || "-"
        )
        .replace(
          /<count_BatchBeneficiary>/g,
          certificateData.count_BatchBeneficiary || "0"
        )
        .replace(
          /<count_BatchTrainer>/g,
          certificateData.count_BatchTrainer || "0"
        )
        .replace(
          /<BatchMasterTrainer_name>/g,
          certificateData.BatchMasterTrainer_name || "-"
        )
        .replace(/<block_name_en>/g, certificateData.block_name_en || "-")
        .replace(/<district_name_en>/g, certificateData.district_name_en || "-")
        .replace(/<dist_user>/g, certificateData.dist_user || "-")
        .replace(/<expert_name>/g, certificateData.expert_name || "-")
        .replace(/<theme_name>/g, certificateData.theme_name || "-")
        .replace(
          /<training_plan__name>/g,
          certificateData.training_plan__name || "-"
        );

      // Update the XML in ZIP
      zip.file(docXmlPath, updatedXml);

      // Generate new DOCX
      const modifiedArrayBuffer = await zip.generateAsync({
        type: "arraybuffer",
        compression: "DEFLATE",
      });

      // Download
      const blob = new Blob([modifiedArrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Batch_Certificate_${batchId}_${requestLevel}_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("✅ Certificate downloaded successfully!");
    } catch (e) {
      console.error("download docx failed", e);
      alert(
        `❌ Download failed: ${e.message}\n\nMake sure template files are in public/Assets/TMS/`
      );
    }
  }

  /* ---------------- generate certificate data ---------------- */

  async function generateCertificateData() {
    if (!batchDetail) return;

    setGenerating(true);
    try {
      const trainingPlanId = batchDetail.request?.training_plan;
      const trainingPlan = await fetchTrainingPlan(trainingPlanId);

      const countBatchBeneficiary =
        batchDetail.beneficiary_participations?.length || 0;
      const countBatchTrainer = batchDetail.trainer_participations?.length || 0;

      const masterTrainerNames =
        batchDetail.master_trainers
          ?.map((mt) => mt.full_name)
          ?.filter(Boolean)
          ?.join(", ") || "-";

      const reqCreatedById = batchDetail.request?.created_by;
      const reqCreatorGeo = await fetchUserGeoscope(reqCreatedById);
      const username = reqCreatorGeo?.username || "-";

      let blockInfo = null,
        districtInfo = null,
        distUser = null,
        expertUser = null,
        themeName = null;

      if (requestLevel === "BLOCK") {
        const blockId = reqCreatorGeo?.blocks?.[0];
        blockInfo = await fetchBlock(blockId);
        const districtId = blockInfo?.district_id;
        districtInfo = await fetchDistrict(districtId);
        distUser = await fetchDMMUser(districtId);
      } else if (requestLevel === "DISTRICT") {
        const districtId = reqCreatorGeo?.districts?.[0];
        districtInfo = await fetchDistrict(districtId);
        themeName = trainingPlan?.theme?.theme_name || "-";
        const expertId = trainingPlan?.theme?.expert;
        expertUser = await fetchExpertUser(expertId);
      }

      const todayDate = new Date().toLocaleDateString("hi-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const data = {
        username,
        today_date: todayDate,
        financial_year: financialYear,
        training_plan__theme__theme_name:
          trainingPlan?.theme?.theme_name || "-",
        training_request__training_type:
          batchDetail.request?.training_type || "-",
        training_plan__no_of_days: trainingPlan?.no_of_days || "-",
        training_plan__type_of_training: trainingPlan?.type_of_training || "-",
        training_plan__name: trainingPlan?.training_name || "-",
        batch__start_date: batchDetail.start_date || "-",
        batch__end_date: batchDetail.end_date || "-",
        training_request__level: requestLevel || "-",
        count_BatchBeneficiary: countBatchBeneficiary,
        count_BatchTrainer: countBatchTrainer,
        BatchMasterTrainer_name: masterTrainerNames,
        block_name_en: blockInfo?.block_name_en || "-",
        district_name_en: districtInfo?.district_name_en || "-",
        dist_user: distUser?.username || "-",
        expert_name: expertUser?.full_name || expertUser?.username || "-",
        theme_name: themeName || "-",
      };

      setCertificateData(data);
      setShowFinancialModal(false);
      setShowPreviewModal(true);
    } catch (e) {
      console.error("generate certificate data failed", e);
      alert("Failed to generate certificate data");
    } finally {
      setGenerating(false);
    }
  }

  /* ---------------- FIXED loadAll ---------------- */
  async function loadAll() {
    if (!batchId || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const cached = loadCache(batchId);
      if (cached && !refreshToken) {
        const payload = cached.payload || {};
        setBatchDetail(payload.batchDetail || null);
        setClosureRow(payload.closureRow || null);
        setReportRow(payload.reportRow || null);
        setLoading(false);
        return;
      }

      const detail = await fetchBatchDetail();
      setBatchDetail(detail);

      const closureResult = await fetchClosureRow();
      setClosureRow(closureResult);

      let reportResult = null;
      if (closureResult?.certificates_issued) {
        reportResult = await fetchReportRow();
        setReportRow(reportResult);
      }

      saveCache(batchId, {
        batchDetail: detail,
        closureRow: closureResult,
        reportRow: reportResult,
      });
    } catch (e) {
      console.error("loadAll failed", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    if (didRunRef.current && refreshToken === 0) return;
    didRunRef.current = true;
    loadAll();
  }, [batchId, user?.id, refreshToken]);

  /* ---------------- upload handler ---------------- */
  async function handleUploadSignedPdf(file) {
    if (!file || !batchId) return;
    setUploading(true);
    setUploadError("");

    try {
      let currentReport = reportRow;
      if (!currentReport) {
        const createResp = await api.post("/tms/batch-reports/", {
          batch: batchId,
          status: "DRAFT",
        });
        currentReport = createResp?.data;
        setReportRow(currentReport);
      }

      if (!currentReport?.id) throw new Error("Unable to create batch report");

      const formData = new FormData();
      formData.append("report_file", file);

      const oldStatus = currentReport.status || "DRAFT";
      let newStatus = oldStatus;
      if (isBMMU) newStatus = "BMM_SIGNED";
      else if (isDMMU) newStatus = "DMM_SIGNED";
      else if (isSMMU && oldStatus === "DMM_SIGNED") newStatus = "SMM_SIGNED";

      formData.append("status", newStatus);

      const patchResp = await api.patch(
        `/tms/batch-reports/${currentReport.id}/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setReportRow(patchResp?.data);

      if (!closureRow?.certificates_issued && closureRow?.id) {
        await api.patch(`/tms/batch-closure-requests/${closureRow.id}/`, {
          certificates_issued: true,
        });
        setClosureRow({ ...closureRow, certificates_issued: true });
      }
    } catch (e) {
      console.error("upload failed", e);
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function renderUploadButton() {
    return (
      <label
        className="btn-sm btn-flat"
        style={{ cursor: uploading ? "not-allowed" : "pointer" }}
      >
        {uploading ? "Uploading..." : "Upload Signed PDF"}
        <input
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadSignedPdf(file);
            e.target.value = "";
          }}
        />
      </label>
    );
  }

  function renderReportTable() {
    if (!reportRow) return <div>No report available.</div>;

    const status = reportRow.status || "DRAFT";
    const fileUrl = reportRow.report_file;
    const canUpload =
      isBMMU ||
      (isDMMU && status !== "DRAFT") ||
      (isSMMU && status === "DMM_SIGNED");

    return (
      <table className="table table-compact">
        <thead>
          <tr>
            <th>Status</th>
            <th>Action</th>
            {canUpload && <th>Upload</th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{status}</td>
            <td>
              {fileUrl ? (
                <button
                  className="btn-sm btn-flat"
                  onClick={() => window.open(fileUrl, "_blank")}
                >
                  View PDF
                </button>
              ) : (
                "-"
              )}
            </td>
            {canUpload && <td>{renderUploadButton()}</td>}
          </tr>
        </tbody>
      </table>
    );
  }

  /* ==================== CERTIFICATE PREVIEW (HTML) ==================== */
  function renderCertificatePreview() {
    if (!certificateData) return null;

    const isBlockLevel = requestLevel === "BLOCK";

    return (
      <div
        style={{
          fontFamily: '"Noto Sans Devanagari", Georgia, serif',
          fontSize: 14,
          lineHeight: 1.8,
          color: "#000",
          backgroundColor: "#f9f9f9",
          padding: 40,
          margin: 0,
          minHeight: "1000px",
          position: "relative",
        }}
      >
        {/* Watermark Effect */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-45deg)",
            fontSize: 120,
            fontWeight: "bold",
            color: "rgba(0,0,0,0.03)",
            pointerEvents: "none",
            zIndex: 0,
            whiteSpace: "nowrap",
          }}
        >
          PRAGATI SETU
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 30,
              borderBottom: "2px solid #000",
              paddingBottom: 15,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
              प्रमाण पत्र
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Pragati Setu - Training Management System
            </div>
          </div>

          {/* From Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: "bold", marginBottom: 5 }}>प्रेषक,</div>
            <div style={{ marginLeft: 20 }}>
              <div>{certificateData.username}</div>
              <div>
                {isBlockLevel
                  ? certificateData.block_name_en
                  : certificateData.district_name_en}
                ।
              </div>
            </div>
          </div>

          {/* Date */}
          <div style={{ marginBottom: 20 }}>
            <strong>दिनांक :</strong> {certificateData.today_date}
          </div>

          {/* Subject */}
          <div
            style={{
              marginBottom: 25,
              textAlign: "justify",
              fontWeight: "500",
            }}
          >
            <strong>विषय :</strong> वित्तीय वर्ष{" "}
            {certificateData.financial_year} के अन्तर्गत{" "}
            {certificateData.training_plan__theme__theme_name} (
            {certificateData.training_request__training_type}) प्रशिक्षण कराये
            गये के सम्बन्ध में।
          </div>

          {/* Certificate Body */}
          <div style={{ textAlign: "justify", marginBottom: 25 }}>
            <p>
              यह प्रमाणित किया जाता है कि संबंधित प्रतिभागीयों ने{" "}
              <strong>
                {certificateData.training_plan__theme__theme_name} (
                {certificateData.training_request__training_type})
              </strong>{" "}
              शीर्षक{" "}
              <strong>
                {certificateData.training_plan__no_of_days} दिवसीय{" "}
                {certificateData.training_plan__type_of_training}
              </strong>{" "}
              प्रशिक्षण कार्यक्रम में वित्तीय वर्ष{" "}
              <strong>{certificateData.financial_year}</strong> के अंतर्गत
              सफलतापूर्वक सहभागिता की है।
            </p>

            <p>
              उक्त प्रशिक्षण कार्यक्रम का आयोजन दिनांक{" "}
              <strong>{certificateData.batch__start_date}</strong> से{" "}
              <strong>{certificateData.batch__end_date}</strong> तक{" "}
              <strong>
                {certificateData.training_request__level} –{" "}
                {isBlockLevel
                  ? certificateData.block_name_en
                  : certificateData.district_name_en}
              </strong>{" "}
              में किया गया।
            </p>

            <p>
              यह प्रशिक्षण उ०प्र० राज्य ग्रामीण आजीविका मिशन (UPSRLM) के
              दिशा-निर्देशों के अंतर्गत आयोजित किया गया, जिसमें{" "}
              <strong>{certificateData.training_plan__name}</strong>, नेतृत्व
              क्षमता विकास, संस्थागत सुदृढ़ीकरण एवं सामुदायिक विकास से संबंधित
              विषयों पर प्रशिक्षण प्रदान किया गया।
            </p>

            <p>
              प्रशिक्षण के दौरान प्रतिभागीयों द्वारा संतोषजनक सहभागिता एवं
              सक्रिय योगदान किया गया।
            </p>

            <p>
              यह प्रमाण पत्र प्रशिक्षण में सफल सहभागिता के उपरांत निर्गत किया जा
              रहा है।
            </p>
          </div>

          {/* Counts and Trainers */}
          <div
            style={{
              marginBottom: 30,
              padding: 15,
              backgroundColor: "#f0f0f0",
              borderRadius: 4,
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <strong>कुल प्रतिभागियों की संख्या :</strong>{" "}
              {certificateData.count_BatchBeneficiary} /{" "}
              {certificateData.count_BatchTrainer}
            </div>
            <div>
              <strong>प्रशिक्षण बैच के मास्टर ट्रेनर :</strong>{" "}
              {certificateData.BatchMasterTrainer_name}
            </div>
          </div>

          {/* Signatories - Block Level */}
          {isBlockLevel && (
            <>
              <div style={{ marginBottom: 40, marginTop: 50 }}>
                <div style={{ marginBottom: 25 }}>
                  <div
                    style={{
                      textDecoration: "underline",
                      fontWeight: "bold",
                      marginBottom: 10,
                    }}
                  >
                    प्रथम जारीकर्ता (BLOCK LEVEL)
                  </div>
                  <table style={{ width: "100%", fontSize: 13 }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "40%", fontWeight: "bold" }}>
                          जारीकर्ता पदनाम
                        </td>
                        <td>{certificateData.username}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>कार्यालय</td>
                        <td>{certificateData.block_name_en}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>निर्गमन तिथि</td>
                        <td>{certificateData.today_date}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>
                          अधिकृत हस्ताक्षरकर्ता
                        </td>
                        <td>
                          अधिकृत अधिकारी
                          <br />
                          UPSRLM / जिला प्रशासन
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <div
                    style={{
                      textDecoration: "underline",
                      fontWeight: "bold",
                      marginBottom: 10,
                    }}
                  >
                    द्वितीय जारीकर्ता (DISTRICT LEVEL)
                  </div>
                  <table style={{ width: "100%", fontSize: 13 }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "40%", fontWeight: "bold" }}>
                          जारीकर्ता पदनाम
                        </td>
                        <td>{certificateData.dist_user}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>कार्यालय</td>
                        <td>{certificateData.district_name_en}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>निर्गमन तिथि</td>
                        <td>{certificateData.today_date}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>
                          अधिकृत हस्ताक्षरकर्ता
                        </td>
                        <td>
                          अधिकृत अधिकारी
                          <br />
                          UPSRLM / जिला प्रशासन
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Signatories - District Level */}
          {!isBlockLevel && (
            <>
              <div style={{ marginBottom: 40, marginTop: 50 }}>
                <div style={{ marginBottom: 25 }}>
                  <div
                    style={{
                      textDecoration: "underline",
                      fontWeight: "bold",
                      marginBottom: 10,
                    }}
                  >
                    प्रथम जारीकर्ता (DISTRICT LEVEL)
                  </div>
                  <table style={{ width: "100%", fontSize: 13 }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "40%", fontWeight: "bold" }}>
                          जारीकर्ता पदनाम
                        </td>
                        <td>{certificateData.username}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>कार्यालय</td>
                        <td>{certificateData.district_name_en}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>निर्गमन तिथि</td>
                        <td>{certificateData.today_date}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>
                          अधिकृत हस्ताक्षरकर्ता
                        </td>
                        <td>
                          अधिकृत अधिकारी
                          <br />
                          UPSRLM / जिला प्रशासन
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <div
                    style={{
                      textDecoration: "underline",
                      fontWeight: "bold",
                      marginBottom: 10,
                    }}
                  >
                    द्वितीय जारीकर्ता (STATE LEVEL)
                  </div>
                  <table style={{ width: "100%", fontSize: 13 }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "40%", fontWeight: "bold" }}>
                          जारीकर्ता पदनाम
                        </td>
                        <td>{certificateData.expert_name}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>कार्यालय</td>
                        <td>{certificateData.theme_name}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>निर्गमन तिथि</td>
                        <td>{certificateData.today_date}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: "bold" }}>
                          अधिकृत हस्ताक्षरकर्ता
                        </td>
                        <td>
                          अधिकृत अधिकारी
                          <br />
                          UPSRLM / जिला प्रशासन
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 50,
              paddingTop: 20,
              borderTop: "1px solid #ccc",
              textAlign: "center",
              fontSize: 11,
              color: "#666",
            }}
          >
            <div>Generated by Pragati Setu - Training Management System</div>
            <div>
              PRERNA Initiative, Uttar Pradesh State Rural Livelihoods Mission
              (UPSRLM)
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- main UI ---------------- */
  const headerTitle = batchDetail?.code
    ? `Batch Certificate — ${batchDetail.code}`
    : "Batch Certificate";

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="app-title">Pragati Setu — Batch Certificate</div>
          }
        />
        <main style={{ padding: 18 }}>
          <div style={{ maxWidth: 1000, margin: "20px auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>{headerTitle}</h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button className="btn-secondary" onClick={() => navigate(-1)}>
                  Back
                </button>
                <button
                  className="btn"
                  onClick={() => setRefreshToken((t) => t + 1)}
                >
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>
            ) : !batchDetail ? (
              <div style={{ padding: 40 }}>Unable to load batch details.</div>
            ) : (
              <>
                {/* Batch Info */}
                <div
                  style={{
                    background: "#fff",
                    padding: 16,
                    borderRadius: 8,
                    marginBottom: 20,
                  }}
                >
                  <h3>Batch Details</h3>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                    <div>
                      <strong>Code:</strong> {batchDetail.code}
                    </div>
                    <div>
                      <strong>Status:</strong> {batchDetail.status}
                    </div>
                    <div>
                      <strong>Level:</strong> {requestLevel}
                    </div>
                    <div>
                      <strong>Dates:</strong> {batchDetail.start_date} to{" "}
                      {batchDetail.end_date}
                    </div>
                  </div>
                </div>

                {/* Main Content */}
                <div
                  style={{ background: "#fff", padding: 20, borderRadius: 8 }}
                >
                  <h3>Batch Closure Certificate</h3>

                  {hasCertificatesIssued ? (
                    renderReportTable()
                  ) : isSMMU ? (
                    <div>
                      Signed certificates will be available soon. Contact
                      appropriate authorities.
                    </div>
                  ) : canGenerateAtBlock || canGenerateAtDistrict ? (
                    <div>
                      <button
                        className="btn"
                        onClick={() => setShowFinancialModal(true)}
                        disabled={generating}
                        style={{ marginBottom: 12 }}
                      >
                        {generating
                          ? "Generating..."
                          : "Generate Batch Certificate"}
                      </button>

                      {renderUploadButton()}
                    </div>
                  ) : (
                    <div>
                      Signed certificates will be available soon. Contact
                      appropriate authorities.
                    </div>
                  )}

                  {uploadError && (
                    <div
                      style={{ color: "#dc2626", marginTop: 12, fontSize: 13 }}
                    >
                      {uploadError}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Financial Year Modal */}
            {showFinancialModal && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.5)",
                  zIndex: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => setShowFinancialModal(false)}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: 24,
                    borderRadius: 8,
                    minWidth: 400,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3>Select Financial Year</h3>
                  <select
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 12,
                      margin: "12px 0",
                      borderRadius: 4,
                      border: "1px solid #d1d5db",
                    }}
                  >
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26">2025-26</option>
                    <option value="2026-27">2026-27</option>
                  </select>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      justifyContent: "flex-end",
                      marginTop: 20,
                    }}
                  >
                    <button
                      className="btn-secondary"
                      onClick={() => setShowFinancialModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn"
                      onClick={generateCertificateData}
                      disabled={generating}
                    >
                      {generating ? "Generating..." : "Generate Certificate"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Certificate Preview Modal */}
            {showPreviewModal && certificateData && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.7)",
                  zIndex: 1000,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  overflow: "auto",
                  paddingTop: 20,
                  paddingBottom: 20,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 8,
                    maxWidth: 900,
                    width: "95%",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                  }}
                >
                  {/* Header with Actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: 20,
                      borderBottom: "1px solid #e5e7eb",
                      position: "sticky",
                      top: 0,
                      background: "#fff",
                      zIndex: 10,
                    }}
                  >
                    <h3 style={{ margin: 0 }}>Batch Certificate Preview</h3>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn"
                        onClick={() => downloadCertificateDocx()}
                        style={{ marginRight: 8 }}
                      >
                        📥 Download DOCX
                      </button>
                      <button className="btn" onClick={() => window.print()}>
                        🖨️ Print / Save as PDF
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setShowPreviewModal(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Certificate Content */}
                  <div
                    style={{
                      padding: 0,
                      maxHeight: "calc(100vh - 120px)",
                      overflow: "auto",
                    }}
                  >
                    {renderCertificatePreview()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
