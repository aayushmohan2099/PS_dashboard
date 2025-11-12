// src/routes/ProtectedRoute.jsx
import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function ProtectedRoute({ allowedRoles = null, redirectTo = '/login' }) {
  const { isAuthenticated, user } = useContext(AuthContext);

  if (!isAuthenticated) return <Navigate to={redirectTo} replace />;

  if (allowedRoles && user) {
    // Determine role id or role name from user
    // Backend returns role as numeric id in user.role, and role_name as user.role_name
    const roleId = (typeof user.role === 'number') ? user.role : (user.role && user.role.id) || null;
    const roleName = user.role_name || (user.role && user.role.name) || null;

    const allowed = allowedRoles.map(r => (typeof r === 'string' && /^\d+$/.test(r) ? Number(r) : r));

    const allowedById = allowed.some(ar => typeof ar === 'number' && roleId === ar);
    const allowedByName = allowed.some(ar => typeof ar === 'string' && roleName && roleName.toLowerCase() === ar.toLowerCase());

    if (!(allowedById || allowedByName)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}
