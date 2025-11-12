// src/components/layout/TopNav.jsx
import React from 'react';

export default function TopNav({ left, right }) {
  return (
    <div className="topnav">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}
