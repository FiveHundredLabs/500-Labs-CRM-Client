import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const RoleLanding: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'SUPERVISOR') return <Navigate to="/supervisor/dashboard" replace />;
  if (user?.role === 'TEAM_MEMBER') return <Navigate to="/member/dashboard" replace />;
  if (user?.role === 'FINANCE') return <Navigate to="/finance/dashboard" replace />;

  return <Navigate to="/login" replace />;
};
