// src/components/ui/FormError.jsx
import React from 'react';
export default function FormError({ message }) {
  if (!message) return null;
  return <div className="error">{message}</div>;
}
