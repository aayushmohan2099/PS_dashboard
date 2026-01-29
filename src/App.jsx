// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import DashboardHome from "./pages/Dashboard/DashboardHome";
import ProtectedRoute from "./routes/ProtectedRoute";

// TMS dashboards
import BmmuTmsDashboard from "./pages/TMS/BMMU/bmmu_tms_dashboard";
import DmmuTmsDashboard from "./pages/TMS/DMMU/dmmu_tms_dashboard";
import SmmuTmsDashboard from "./pages/TMS/SMMU/smmu_tms_dashboard";
import SmmuCreatePartnerTargets from "./pages/TMS/SMMU/smmu_create_tp_targets";
import TpDashboard from "./pages/TMS/TP/tp_dashboard";
import MtDashboard from "./pages/TMS/MT/mt_dashboard";
import CpDashboard from "./pages/TMS/TP_CP/cp_dashboard";
import CpBatchList from "./pages/TMS/TP_CP/cp_batch_list";
import CpBatchDetail from "./pages/TMS/TP_CP/cp_batch_detail";
import CpAdPerBatchEkyc from "./pages/TMS/TP_CP/attendance/cpad_per_batch_ekyc";
import CpAdPerBatch from "./pages/TMS/TP_CP/attendance/cpad_per_batch";
import CpBatchClosure from "./pages/TMS/TP_CP/cp_batch_closure";

// Training Partner screens
import TpCentreList from "./pages/TMS/TP/tp_centre_list";
import TpCentreRegistration from "./pages/TMS/TP/tp_centre_registration";
import TpListCP from "./pages/TMS/TP/tp_list_cp";
import TpCreateCP from "./pages/TMS/TP/tp_create_cp";
import TpCpAssignment from "./pages/TMS/TP/tp_cp_assignment";
import TpTrainingRequestClosure from "./pages/TMS/TP/tp_tr_closure";
import TpCreateBatch from "./pages/TMS/TP/tp_create_batch";

// New TMS workflow screens
import CreateTrainingRequest from "./pages/TMS/tms_create_tr";
import TrainingRequestList from "./pages/TMS/TRs/training_req_list";
import TrainingRequestDetail from "./pages/TMS/TRs/training_req_detail";
import TrainingBatchList from "./pages/TMS/TRs/training_batch_list";
import TrainingBatchDetail from "./pages/TMS/TRs/training_batch_detail";
import BatchCertificate from "./pages/TMS/TRs/batch_certificate";

import BmmuCreateTrainingPlan from "./pages/TMS/BMMU/bmmu_create_training_plan";

import DmmuTrReview from "./pages/TMS/DMMU/dmmu_tr_review";
import DmmuRequestClosure from "./pages/TMS/DMMU/dmmu_request_closure";

// LDMS Dashboards
import LdmsLayout from "./pages/LDMS/Layout/LdmsLayout";
import BmmuLdmsDashboard from "./pages/LDMS/BMMU/bmmu_ldms_dashboard";
import BlockMap from "./pages/LDMS/BMMU/bmmu_dashboard_blk_map";
import DmmuLdmsDashboard from "./pages/LDMS/DMMU/dmmu_ldms_dashboard";
import DmmuBlockMap from "./pages/LDMS/DMMU/dmmu_dashboard_blk_map";
import SmmuLdmsDashboard from "./pages/LDMS/SMMU/smmu_ldms_dashboard";
import SupportCapture from "./pages/LDMS/Support Map/ldms_support_capture";
import DemandAnalytics from "./pages/LDMS/Demand Analytics/da_container";
import BLCCMeetings from "./pages/LDMS/BMMU/bmmu_BLCC_meetings";
import SchemeDictionary from "./pages/LDMS/scheme_dict";
import SupPLDList from "./pages/LDMS/Support Map/SupPLDList";
import SupPLDDetail from "./pages/LDMS/Support Map/SupPLDDetail";
import SupportBucketList from "./pages/LDMS/Support Map/record_support_list";
import RecordSupportDetail from "./pages/LDMS/Support Map/record_support_detail";
import DmmuLdmsApprove from "./pages/LDMS/DMMU/dmmu_ldms_approve";
import LdmsReports from "./pages/LDMS/Reports/ldms_reports";

// tiny placeholder landing for /tms
function TmsLanding() {
  return (
    <div className="app-shell">
      <main className="dashboard-main center">
        <div className="card">
          <h2>TMS — Landing</h2>
          <p className="muted">
            Training Management module landing — choose a TMS link from the left
            nav.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        {/* Main Dashboard */}
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/dashboard/*" element={<DashboardHome />} />

        {/* ----- TMS Routes ----- */}
        <Route path="/tms" element={<TmsLanding />} />

        {/* Dashboards */}
        <Route path="/tms/bmmu/dashboard" element={<BmmuTmsDashboard />} />
        <Route path="/tms/dmmu/dashboard" element={<DmmuTmsDashboard />} />
        <Route path="/tms/smmu/dashboard" element={<SmmuTmsDashboard />} />
        <Route path="/tms/tp/dashboard" element={<TpDashboard />}></Route>
        <Route path="/tms/mt/dashboard" element={<MtDashboard />}></Route>
        <Route path="/tms/cp/dashboard" element={<CpDashboard />}></Route>

        {/* SMMU Partner Target Creation */}
        <Route
          path="/tms/smmu/partner-targets"
          element={<SmmuCreatePartnerTargets />}
        />

        {/* NEW: Create Training Request */}
        <Route
          path="/tms/create-training-request"
          element={<CreateTrainingRequest />}
        />

        {/* NEW: View Training Requests List */}
        <Route
          path="/tms/training-requests"
          element={<TrainingRequestList />}
        />
        <Route path="/tms/tr-detail/:id" element={<TrainingRequestDetail />} />

        {/* NEW: BMMU propose training plan */}
        <Route
          path="/tms/bmmu/create-training-plan"
          element={<BmmuCreateTrainingPlan />}
        />

        <Route path="/tms/dmmu/tr-review/:id" element={<DmmuTrReview />} />
        <Route
          path="/tms/dmmu/tr-closure/:id"
          element={<DmmuRequestClosure />}
        />

        {/* Catch-all for unknown TMS paths */}
        <Route path="/tms/*" element={<TmsLanding />} />
      </Route>

      {/* Training Partner paths */}
      <Route path="/tms/tp/centre-list" element={<TpCentreList />} />

      <Route path="/tms/tp/centre/new" element={<TpCentreRegistration />} />

      <Route
        path="/tms/tp/centre/:centreId"
        element={<TpCentreRegistration />}
      />

      <Route
        path="/tms/tp/tr-closure/:id"
        element={<TpTrainingRequestClosure />}
      />

      <Route path="/tms/tp/batches/create/:id" element={<TpCreateBatch />} />

      <Route path="/tms/batches-list/" element={<TrainingBatchList />} />
      <Route path="/tms/batches-list/:id/" element={<TrainingBatchList />} />
      <Route path="/tms/batch-detail/:id" element={<TrainingBatchDetail />} />

      <Route path="/tms/tp/cp-list" element={<TpListCP />} />

      <Route path="/tms/tp/cp/create" element={<TpCreateCP />} />
      <Route path="/tms/tp/cp/edit/:cpId" element={<TpCreateCP />} />
      <Route path="/tms/tp/cp/assign" element={<TpCpAssignment />} />

      <Route path="/tms/cp/batch-detail/:id" element={<CpBatchDetail />} />

      <Route
        path="/tms/cp/batch-attendance-ekyc/:id"
        element={<CpAdPerBatchEkyc />}
      />

      <Route path="/tms/cp/batch-attendance/:id" element={<CpAdPerBatch />} />

      <Route path="/tms/cp/batch-list" element={<CpBatchList />} />

      <Route path="/tms/cp/batch-closure/:id" element={<CpBatchClosure />} />

      <Route path="/tms/batch-certificate/:id" element={<BatchCertificate />} />

      {/* ----- LDMS Routes (GLOBAL LAYOUT APPLIED) ----- */}
      <Route element={<ProtectedRoute />}>
        <Route path="/ldms" element={<LdmsLayout />}>
          {/* BMMU Routes */}
          <Route path="bmmu/dashboard" element={<BmmuLdmsDashboard />} />
          <Route path="bmmu/blcc-meetings" element={<BLCCMeetings />} />
          {/* DMMU Routes */}
          <Route path="dmmu/dashboard" element={<DmmuLdmsDashboard />} />
          <Route
            path="dmmu/approve-support/:id"
            element={<DmmuLdmsApprove />}
          />
          {/* SMMU Routes */}
          <Route path="smmu/dashboard" element={<SmmuLdmsDashboard />} />
          {/* Global Routes */}
          <Route path="support-capture" element={<SupportCapture />} />
          <Route
            path="support-map/edit/:supportApprovalId"
            element={<SupportCapture />}
          />
          <Route path="scheme-dictionary" element={<SchemeDictionary />} />
          <Route path="demand-analytics" element={<DemandAnalytics />} />
          <Route path="support-map-list" element={<SupportBucketList />} />
          <Route
            path="support-map-detail/:id"
            element={<RecordSupportDetail />}
          />
          <Route path="supported-pld-list" element={<SupPLDList />} />
          <Route
            path="supported-pld-list/detail/:pldId"
            element={<SupPLDDetail />}
          />
          <Route path="reports" element={<LdmsReports />} />
          
          {/* future LDMS pages */}
          {/* <Route path="support-mapping" element={<SupportMapping />} /> */}
          {/* <Route path="analytics" element={<LdmsAnalytics />} /> */}
        </Route>
      </Route>

      <Route path="/ldms/dash-block/:blockId" element={<BlockMap />} />
      <Route
        path="/ldms/dash-district/:districtId"
        element={<DmmuBlockMap />}
      />

      {/* 404 */}
      <Route path="*" element={<div>404</div>} />
    </Routes>
  );
}
