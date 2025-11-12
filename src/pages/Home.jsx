// src/pages/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="page-container">
      <h1>Welcome to Pragati Setu</h1>
      <p>Short tagline or description.</p>
      <Link to="/login"><button>Go to Login</button></Link>
    </div>
  );
}
