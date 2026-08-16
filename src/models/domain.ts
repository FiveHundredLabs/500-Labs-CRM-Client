export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'TEAM_MEMBER' | 'FINANCE';

export type ContactStatus = 
  | 'NEW'
  | 'ANSWERED'
  | 'NOT_ANSWERED'
  | 'PHONE_OFF'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'DISPATCHED'
  | 'DELIVERED';

export type OrderStatus =
  | 'DRAFT'
  | 'PREPARED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'REJECTED'
  | 'RETURNED';

export type EmailNotificationStatus = 'SENT' | 'SKIPPED' | 'FAILED';

export interface Team {
  id: string; // e.g., 'team_001', 'team_002'
  name: string; // 'Brand Alpha', 'Brand Beta'
  code: string; // 'ALPHA', 'BETA'
  brandColor: string; // Hex color for branding
  accentColor: string;
  logoText: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  createdAt: string;
}

export interface User {
  id: string; // e.g., 'usr_admin', 'usr_sup_01'
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  teamId: string | null; // null for ADMIN & FINANCE if multi-team
  supervisorId: string | null; // null for ADMIN, FINANCE, SUPERVISOR
  city: string;
  phone: string;
  avatarUrl?: string;
  nic?: string;
  dateOfBirth?: string;
  joiningDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface Contact {
  id: string; // e.g., 'cnt_001'
  phone: string;
  status: ContactStatus;
  teamId: string;
  importedAt: string;
  importedBy: string; // supervisor User ID
  importBatchId: string; // Batch ID
  isAllocated: boolean;
  allocatedToId: string | null; // teamMember User ID
  allocatedAt: string | null;
  allocationBatchId: string | null;
  attemptCount: number;
  lastCalledAt: string | null;
  isFollowUp?: boolean; // Starred for Follow-Up List
  updatedAt: string;
}

export interface ContactAllocation {
  id: string; // e.g., 'alc_001'
  allocationBatchId: string;
  contactId: string;
  teamMemberId: string; // User ID
  supervisorId: string; // User ID
  teamId: string;
  allocatedAt: string;
}

export interface CallLog {
  id: string; // e.g., 'cll_001'
  contactId: string;
  teamMemberId: string;
  teamId: string;
  status: ContactStatus;
  customerName?: string;
  customerAddress?: string;
  customerEmail?: string;
  remarks?: string;
  callDurationSeconds?: number;
  isFollowUp?: boolean; // Starred for Follow-Up List
  calledAt: string;
}

export interface Customer {
  id: string; // e.g., 'cst_001'
  contactId: string;
  fullName: string;
  phone: string;
  address: string;
  email?: string;
  teamId: string;
  responsibleTeamMemberId: string;
  supervisorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string; // e.g., 'ord_001'
  orderNumber: string; // e.g., 'ORD-2026-001'
  customerId: string;
  teamId: string;
  teamMemberId: string; // Responsible Team Member
  supervisorId: string;
  status: OrderStatus;
  itemsDescription: string;
  totalAmount: number;
  currency: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryStatusHistory {
  id: string; // e.g., 'dsh_001'
  orderId: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  remarks?: string;
  actorUserId: string; // User ID who changed status
  createdAt: string;
}

export interface ActivityLog {
  id: string; // e.g., 'act_001'
  userId: string;
  userRole: UserRole;
  userName: string;
  teamId?: string;
  action: 
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_DISABLED'
    | 'CONTACT_IMPORTED'
    | 'CONTACT_ALLOCATED'
    | 'CALL_COMPLETED'
    | 'CUSTOMER_CREATED'
    | 'ORDER_CREATED'
    | 'ORDER_PRINTED'
    | 'ORDER_PREPARED'
    | 'ORDER_DISPATCHED'
    | 'DELIVERY_STATUS_CHANGED'
    | 'EMAIL_NOTIFICATION_SENT'
    | 'EXPENSE_CREATED';
  entityType: 'User' | 'Contact' | 'Allocation' | 'CallLog' | 'Customer' | 'Order' | 'Expense' | 'Email';
  entityId: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string; // e.g., 'cat_001'
  name: string; // 'Petty Cash', 'Postal Charges', 'Transport', 'Printing', 'Other'
  isCustom: boolean;
  description?: string;
}

export interface Expense {
  id: string; // e.g., 'exp_001'
  categoryId: string;
  categoryName: string;
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  remarks: string;
  createdBy: string; // Finance User ID
  createdByName: string;
  createdAt: string;
}

export interface EmailNotification {
  id: string; // e.g., 'eml_001'
  orderId: string;
  customerId: string;
  recipientEmail: string | null;
  notificationType: 'DELIVERY_CONFIRMATION';
  status: EmailNotificationStatus;
  reason?: string;
  sentAt: string;
}
