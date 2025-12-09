// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import DashboardHome from "./pages/Dashboard/DashboardHome";
import ProtectedRoute from "./routes/ProtectedRoute";

// tiny placeholder landing for /tms — replace later with a full TMS landing or redirect
function TmsLanding() {
  return (
    <div className="app-shell">
      {/* LeftNav will automatically switch to the TMS left nav because pathname starts with /tms */}
      <main className="dashboard-main center">
        <div className="card">
          <h2>TMS — Landing</h2>
          <p className="muted">Training Management module landing — choose a TMS link from the left nav.</p>
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
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/dashboard/*" element={<DashboardHome />} />

        {/* TMS stub routes — landing + wildcard.
            Replace TmsLanding with your real TMS entry or per-role redirects when ready. */}
        <Route path="/tms" element={<TmsLanding />} />
        <Route path="/tms/*" element={<TmsLanding />} />
      </Route>

      <Route path="*" element={<div>404</div>} />
    </Routes>
  );
}
