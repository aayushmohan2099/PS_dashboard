// src/components/ui/LoadingModal.jsx
import React from 'react';
import '/src/styles.css'; // local CSS augmentation, base styles in src/styles.css

export default function LoadingModal({ open = false, title = 'Loading', message = 'Please wait...' }) {
  if (!open) return null;
  return (
    <div className="ps-modal-backdrop">
      <div className="ps-modal-square">
        <div className="ps-spinner" aria-hidden="true" />
        <h3 className="ps-modal-title">{title}</h3>
        <div className="ps-modal-message">{message}</div>
      </div>
    </div>
  );
}
