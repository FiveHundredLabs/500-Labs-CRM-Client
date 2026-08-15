import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { UserRole } from '../../models/domain';
import { LoadingState } from '../shared/LoadingState';

export interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  const { hasRole } = usePermissions();

  if (loading) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <LoadingState rows={5} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    // Redirect based on active role
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'SUPERVISOR') return <Navigate to="/supervisor/dashboard" replace />;
    if (user.role === 'TEAM_MEMBER') return <Navigate to="/member/dashboard" replace />;
    if (user.role === 'FINANCE') return <Navigate to="/finance/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
