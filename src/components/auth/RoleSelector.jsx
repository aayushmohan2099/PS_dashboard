// src/components/auth/RoleSelector.jsx
import React from 'react';

export const ADMIN_ROLES = [
  { id: 'state_admin', label: 'STATE IT ADMIN' },
  { id: 'bmmu', label: 'BMMU' },
  { id: 'dmmu', label: 'DMMU' },
  { id: 'dcnrlm', label: 'DCNRLM' },
  { id: 'smmu', label: 'SMMU' },
  { id: 'pmu_admin', label: 'PMU IT ADMIN' },
];

export const GENERAL_ROLES = [
  { id: 'training_partner', label: 'TRAINING PARTNER' },
  { id: 'master_trainer', label: 'MASTER TRAINER' },
  { id: 'crp_ep', label: 'ENTERPRISE CRP' },
  { id: 'crp_ld', label: 'LAKHPATI CRP' },
];

export default function RoleSelector({ userType = 'Admin', value = '', onChange = () => {} }) {
  const roles = userType === 'Admin' ? ADMIN_ROLES : GENERAL_ROLES;
  return (
    <select value={value} onChange={(e)=>onChange(e.target.value)}>
      <option value="">Select role</option>
      {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
    </select>
  );
}
