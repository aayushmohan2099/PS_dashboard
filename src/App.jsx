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

// New TMS workflow screens
import CreateTrainingRequest from "./pages/TMS/tms_create_tr";
import TrainingRequestList from "./pages/TMS/TRs/training_req_list";
import BmmuCreateTrainingPlan from "./pages/TMS/BMMU/bmmu_create_training_plan";

// tiny placeholder landing for /tms
function TmsLanding() {
  return (
    <div className="app-shell">
      <main className="dashboard-main center">
        <div className="card">
          <h2>TMS — Landing</h2>
          <p className="muted">
            Training Management module landing — choose a TMS link from the left nav.
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

        {/* SMMU Partner Target Creation */}
        <Route path="/tms/smmu/partner-targets" element={<SmmuCreatePartnerTargets />} />

        {/* NEW: Create Training Request */}
        <Route path="/tms/create-training-request" element={<CreateTrainingRequest />} />

        {/* NEW: View Training Requests List */}
        <Route path="/tms/training-requests" element={<TrainingRequestList />} />

        {/* NEW: BMMU propose training plan */}
        <Route path="/tms/bmmu/create-training-plan" element={<BmmuCreateTrainingPlan />} />

        {/* Catch-all for unknown TMS paths */}
        <Route path="/tms/*" element={<TmsLanding />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<div>404</div>} />
    </Routes>
  );
}
