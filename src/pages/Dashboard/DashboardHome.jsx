// src/pages/Dashboard/DashboardHome.jsx
import React, { useContext } from 'react';
import LeftNav from '../../components/layout/LeftNav';
import { AuthContext } from '../../contexts/AuthContext';

export default function DashboardHome() {
  const { user, logout } = useContext(AuthContext);
  return (
    <div className="dashboard">
      <LeftNav />
      <main className="dashboard-main">
        <header className="header-row">
          <div>
            <h2>Dashboard</h2>
            <div className="small-muted">Welcome {user?.username || 'User'}</div>
            <div className="small-muted">Role: {user?.role_name || user?.role || '—'}</div>
          </div>
          <div>
            <button onClick={logout}>Logout</button>
          </div>
        </header>
        <section>
          <p>Blank dashboard area (placeholder for TMS, Enterprise Sakhi etc.)</p>
        </section>
      </main>
    </div>
  );
}
