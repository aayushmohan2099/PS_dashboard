// src/pages/Dashboard/DashboardHome.jsx
import React, { useContext, useEffect, useState } from 'react';
import LeftNav from '../../components/layout/LeftNav';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../api/axios';
import LoadingModal from '../../components/ui/LoadingModal';

export default function DashboardHome() {
  const { user, logout } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(null);

  useEffect(() => {
    // fetch beneficiaries based on user geoscope once user present
    if (user && user.id) {
      fetchForUser(user.id, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchForUser(userId, pageNum = 1) {
    setLoading(true);
    setBeneficiaries([]);
    setHeaders([]);
    try {
      // 1) get user geoscope
      const geoRes = await api.get(`/lookups/user-geoscope/${userId}/`);
      const geo = geoRes.data || {};
      // determine which endpoint to call for beneficiaries:
      // prefer block(s) -> first block; else district -> first district
      let listRes = null;
      if (Array.isArray(geo.blocks) && geo.blocks.length > 0) {
        const blockId = geo.blocks[0];
        listRes = await api.get(`/lookups/beneficiaries/by-block/${blockId}/`, {
          params: { page: pageNum, page_size: pageSize }
        });
      } else if (Array.isArray(geo.districts) && geo.districts.length > 0) {
        const districtId = geo.districts[0];
        listRes = await api.get(`/lookups/beneficiaries/by-district/${districtId}/`, {
          params: { page: pageNum, page_size: pageSize }
        });
      } else {
        // no scope; try generic beneficiaries endpoint (if available)
        listRes = await api.get(`/lookups/beneficiary-list/`, { params: { page: pageNum, page_size: pageSize } });
      }

      // Normalize response: DRF pagination may return {count, next, previous, results}
      const data = listRes?.data;
      let items = [];
      if (Array.isArray(data)) {
        items = data;
        setTotalCount(items.length);
      } else if (data && Array.isArray(data.results)) {
        items = data.results;
        setTotalCount(data.count ?? null);
      } else if (data && Array.isArray(data.data)) {
        items = data.data;
        setTotalCount(data.count ?? null);
      } else {
        // If backend returns object like {items: [...]}
        items = data || [];
      }

      setBeneficiaries(items);

      // derive headers (union of keys)
      const hdrSet = new Set();
      items.forEach(it => {
        if (it && typeof it === 'object') {
          Object.keys(it).forEach(k => hdrSet.add(k));
        }
      });
      setHeaders(Array.from(hdrSet));
    } catch (e) {
      console.error('Dashboard fetch error', e);
      alert('Failed to load beneficiaries: ' + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  }

  const handlePageChange = (newPage) => {
    setPage(newPage);
    if (user && user.id) fetchForUser(user.id, newPage);
  };

  return (
    <div className="dashboard">
      <LeftNav />
      <main className="dashboard-main">
        <LoadingModal open={loading} title="Loading data" message="Fetching beneficiaries for your area..." />
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
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <h3>Beneficiaries</h3>
            <div className="small-muted">Showing page {page}{ totalCount ? ` — ${totalCount} total` : '' }</div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {headers.length === 0 && <th>No data</th>}
                  {headers.map(h => <th key={h}>{h.replace(/_/g,' ').toUpperCase()}</th>)}
                </tr>
              </thead>
              <tbody>
                {beneficiaries.length === 0 && (
                  <tr><td colSpan={Math.max(1, headers.length)} style={{padding:20}}>No beneficiaries found for your area.</td></tr>
                )}
                {beneficiaries.map((row, i) => (
                  <tr key={i}>
                    {headers.map(h => {
                      const val = row[h];
                      // print nested objects as JSON short string
                      const display = (val && typeof val === 'object') ? JSON.stringify(val) : (val === null ? '' : String(val));
                      return <td key={h}>{display}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* simple pagination */}
          <div className="pagination">
            <button onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page <= 1}>Prev</button>
            <div style={{alignSelf:'center'}}>Page {page}</div>
            <button onClick={() => handlePageChange(page + 1)}>Next</button>
          </div>
        </section>
      </main>
    </div>
  );
}
