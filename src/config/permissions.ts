import { UserRole } from '../models/domain';

export type Permission =
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.disable'
  | 'contacts.view'
  | 'contacts.import'
  | 'contacts.allocate'
  | 'contacts.call'
  | 'customers.view'
  | 'orders.view'
  | 'orders.create'
  | 'orders.print'
  | 'orders.updateStatus'
  | 'reports.team'
  | 'reports.system'
  | 'finance.view'
  | 'finance.createExpense'
  | 'activity.view';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'users.view',
    'users.create',
    'users.edit',
    'users.disable',
    'contacts.view',
    'customers.view',
    'orders.view',
    'orders.create',
    'orders.print',
    'orders.updateStatus',
    'reports.team',
    'reports.system',
    'finance.view',
    'activity.view',
  ],
  SUPERVISOR: [
    'users.view',
    'users.create',
    'users.edit',
    'users.disable',
    'contacts.view',
    'contacts.import',
    'contacts.allocate',
    'customers.view',
    'orders.view',
    'orders.create',
    'orders.print',
    'orders.updateStatus',
    'reports.team',
    'activity.view',
  ],
  TEAM_MEMBER: [
    'contacts.view',
    'contacts.call',
    'customers.view',
    'orders.view',
  ],
  FINANCE: [
    'finance.view',
    'finance.createExpense',
    'orders.view',
    'reports.system',
  ],
};

export const hasPermission = (role: UserRole | undefined, permission: Permission): boolean => {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};
