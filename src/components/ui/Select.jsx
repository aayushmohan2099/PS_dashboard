// src/components/ui/Select.jsx
import React from 'react';
export default function Select({ label, children, ...rest }) {
  return (
    <div className="form-row">
      {label && <label>{label}</label>}
      <select {...rest}>{children}</select>
    </div>
  );
}
