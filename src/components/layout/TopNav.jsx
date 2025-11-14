// src/components/layout/TopNav.jsx
import React from 'react';

export default function TopNav({ left = null, right = null }) {
  // try to read cached geoscope for contextual title
  let geo = null;
  try {
    geo = JSON.parse(localStorage.getItem('ps_user_geoscope') || 'null');
  } catch (e) {
    geo = null;
  }

  let scopeLabel = '';
  if (geo) {
    if (geo.role === 'bmmu' && Array.isArray(geo.blocks) && geo.blocks.length > 0) {
      scopeLabel = `Block: ${geo.blocks[0]}`;
    } else if ((geo.role === 'dmmu' || geo.role === 'dcnrlm') && Array.isArray(geo.districts) && geo.districts.length > 0) {
      scopeLabel = `District: ${geo.districts[0]}`;
    } else if (geo.role) {
      scopeLabel = geo.role.toUpperCase();
    }
  }

  return (
    <header className="topnav">
      <div className="topnav-left">
        {left || <div className="app-title">Pragati Setu — Dashboard</div>}
        {scopeLabel && <div style={{marginLeft:12, fontSize:13, color:'#666'}}>{scopeLabel}</div>}
      </div>
      <div className="topnav-right">
        {right || (
          <>
            <button className="btn btn-ghost" title="Toggle analytics">Analytics</button>
            <div className="topnav-user">Welcome</div>
          </>
        )}
      </div>
    </header>
  );
}
