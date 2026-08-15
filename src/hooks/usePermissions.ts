import { useAuth } from './useAuth';
import { Permission, hasPermission } from '../config/permissions';
import { UserRole } from '../models/domain';

export const usePermissions = () => {
  const { user, role } = useAuth();

  const can = (permission: Permission): boolean => {
    if (!user || !role) return false;
    return hasPermission(role, permission);
  };

  const hasRole = (allowedRoles: UserRole | UserRole[]): boolean => {
    if (!role) return false;
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.includes(role);
    }
    return role === allowedRoles;
  };

  return {
    can,
    hasRole,
    userRole: role,
  };
};
