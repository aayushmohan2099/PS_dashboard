// src/routes/validators.jsx
// Small helpers used across forms (expand as needed)
export function required(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}
