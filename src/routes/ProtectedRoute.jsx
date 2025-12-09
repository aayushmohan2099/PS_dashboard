// src/routes/ProtectedRoute.jsx
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getCanonicalRole } from '../utils/roleUtils';

export default function ProtectedRoute({ allowedRoles = null, redirectTo = '/login' }) {
  const { isAuthenticated, user } = useContext(AuthContext);

  if (!isAuthenticated) return <Navigate to={redirectTo} replace />;

  if (allowedRoles && user) {
    const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // numeric allowed roles (numbers or numeric strings)
    const allowedNums = allowed
      .map(a => (typeof a === 'string' && /^\d+$/.test(a) ? Number(a) : a))
      .filter(a => typeof a === 'number' && !Number.isNaN(a))
      .map(Number);

    // string allowed roles (canonical keys)
    const allowedKeys = allowed
      .filter(a => typeof a === 'string' && isNaN(Number(a)))
      .map(s => String(s).toLowerCase());

    // check user numeric role id
    const userRoleId = Number(user.role_id ?? user.role);
    if (!Number.isNaN(userRoleId) && allowedNums.includes(userRoleId)) {
      return <Outlet />;
    }

    // check canonical key match
    const userKey = getCanonicalRole(user);
    if (userKey && allowedKeys.includes(userKey)) {
      return <Outlet />;
    }

    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
