// src/pages/Dashboard/ModulePlaceholder.jsx
import React from 'react';

export default function ModulePlaceholder({ title='Module' }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="small-muted">Placeholder content for {title} module.</p>
    </div>
  );
}
