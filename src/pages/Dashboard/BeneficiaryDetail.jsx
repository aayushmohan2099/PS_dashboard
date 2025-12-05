// src/pages/Dashboard/BeneficiaryDetail.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LeftNav from '../../components/layout/LeftNav';
import TopNav from '../../components/layout/TopNav';
import api from '../../api/axios';
import LoadingModal from '../../components/ui/LoadingModal';

export default function BeneficiaryDetail() {
  const { memberCode } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!memberCode) return;
    async function load() {
      setLoading(true);
      try {
        const res = await api.get(
          `/lookups/beneficiary-detail/${encodeURIComponent(memberCode)}/`,
        );
        setData(res?.data || null);
      } catch (e) {
        console.error(
          'Beneficiary detail fetch failed',
          e?.response?.data || e.message || e,
        );
        alert(
          'Failed to fetch beneficiary detail: ' +
            (e.response?.data?.detail || e.message || String(e)),
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [memberCode]);

  return (
    <div className="app-shell">
      <LeftNav />
      <div className="main-area">
        <TopNav
          left={
            <div className="topnav-left">
              <div className="app-title">Pragati Setu</div>
            </div>
          }
          right={
            <div className="topnav-right">
              <button
                onClick={() => navigate(-1)}
                className="btn btn-flat"
              >
                Back
              </button>
            </div>
          }
        />
        <main className="dashboard-main" style={{ padding: 18 }}>
          <LoadingModal
            open={loading}
            title="Loading beneficiary"
            message="Fetching beneficiary details."
          />
          <div className="card">
            <h2>Beneficiary: {memberCode}</h2>
            {!data && !loading && (
              <div className="small-muted">No details available.</div>
            )}
            {data && (
              <div style={{ marginTop: 12 }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                  }}
                >
                  <tbody>
                    {Object.keys(data).map((k) => (
                      <tr
                        key={k}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        <td
                          style={{
                            padding: 8,
                            fontWeight: 700,
                            width: '28%',
                          }}
                        >
                          {k.replace(/_/g, ' ').toUpperCase()}
                        </td>
                        <td style={{ padding: 8 }}>
                          {data[k] && typeof data[k] === 'object'
                            ? JSON.stringify(data[k])
                            : String(data[k])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
