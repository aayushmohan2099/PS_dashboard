// src/components/layout/LeftNav.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

export default function LeftNav() {
  return (
    <nav className="left-nav">
      <ul>
        <li><NavLink to="/dashboard/tms">TMS</NavLink></li>
        <li><a href="https://enterprise-sakhi.yourdomain" target="_blank" rel="noreferrer">Enterprise Sakhi App</a></li>
        <li><a href="https://lakhpati-sakhi.yourdomain" target="_blank" rel="noreferrer">Lakhpati Sakhi App</a></li>
        <li><a href="https://ecommerce.yourdomain" target="_blank" rel="noreferrer">E-Commerce Portal</a></li>
      </ul>
    </nav>
  );
}
