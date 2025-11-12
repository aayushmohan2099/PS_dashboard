// src/components/ui/Button.jsx
import React from 'react';
export default function Button({ children, onClick, type='button', className='' }) {
  return <button type={type} onClick={onClick} className={className}>{children}</button>;
}
