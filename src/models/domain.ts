export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'TEAM_MEMBER' | 'FINANCE';

export type ContactStatus = 
  | 'NEW'
  | 'ANSWERED'
  | 'NOT_ANSWERED'
  | 'PHONE_OFF'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'REJECTED';

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
  joinedDate?: string; // Read-only alias for joiningDate
  salary?: number; // Base salary in LKR
  monthlyGoal?: number; // Monthly sales target in LKR (default 25,000)
  incentiveAmount?: number; // Calculated incentive amount
  isActive: boolean;
  createdAt: string;
}

export interface Contact {
  id: string; // e.g., 'cnt_001'
  phone: string;
  status: ContactStatus;
  teamId: string;
  importedAt: string;
  importedBy: string; // supervisor User ID or team member who added
  addedBy?: string; // User ID who added this contact number
  addedByName?: string; // Name of user who added
  importBatchId: string; // Batch ID
  isAllocated: boolean;
  allocatedToId: string | null; // teamMember User ID
  allocatedAt: string | null;
  allocationBatchId: string | null;
  autoAllocatedTo?: string | null; // Auto-allocated team member User ID
  allocationSource?: 'SELF_ADDED' | 'SUPERVISOR_ALLOCATED' | 'BULK_IMPORT' | string;
  isSelfAdded?: boolean;
  city?: string;
  secondaryMobile?: string;
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
  isSelfAdded?: boolean;
  allocationSource?: 'SELF_ADDED' | 'SUPERVISOR_ALLOCATED' | 'BULK_IMPORT' | string;
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
  city?: string;
  secondaryMobile?: string;
  selectedPackage?: 'ADULT' | 'KIDS' | 'BOTH' | 'NONE' | string;
  adultQty?: number;
  adultUnitPrice?: number;
  adultSubtotal?: number;
  kidsQty?: number;
  kidsUnitPrice?: number;
  kidsSubtotal?: number;
  totalPackageValue?: number;
  codAmount?: number;
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
  secondaryMobile?: string;
  city?: string;
  address: string;
  email?: string;
  teamId: string;
  responsibleTeamMemberId: string;
  supervisorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreviousDispatchInfo {
  hasPreviousDispatch: boolean;
  lastDispatchDate?: string;
  lastOrderRef?: string;
  packageSummary?: string;
  codAmount?: number;
  lastStatus?: OrderStatus;
}

export interface OrderDispatchRecord {
  id: string;
  dispatchDate: string;
  dispatchStatus: OrderStatus;
  orderRef?: string;
  packageSummary?: string;
  codAmount?: number;
  deliveredAt?: string;
  rejectedAt?: string;
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
  selectedPackage?: 'ADULT' | 'KIDS' | 'BOTH' | string;
  adultQty?: number;
  adultUnitPrice?: number;
  adultSubtotal?: number;
  kidsQty?: number;
  kidsUnitPrice?: number;
  kidsSubtotal?: number;
  totalPackageValue?: number;
  codAmount?: number;
  totalAmount: number;
  currency: string;
  remarks?: string;
  deliveredAt?: string;
  rejectedAt?: string;
  dispatchHistory?: OrderDispatchRecord[];
  previousDispatchInfo?: PreviousDispatchInfo;
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

export type ActivityAction = 
  | 'LOGIN'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DISABLED'
  | 'NUMBER_ADDED'
  | 'CONTACT_IMPORTED'
  | 'CONTACT_ALLOCATED'
  | 'CALL_COMPLETED'
  | 'STATUS_CHANGED'
  | 'INTERESTED_CREATED'
  | 'CUSTOMER_CREATED'
  | 'ORDER_CREATED'
  | 'ORDER_PRINTED'
  | 'ORDER_PREPARED'
  | 'ORDER_DISPATCHED'
  | 'DELIVERY_STATUS_CHANGED'
  | 'EMAIL_NOTIFICATION_SENT'
  | 'EXPENSE_CREATED'
  | 'STOCK_REQUESTED'
  | 'STOCK_APPROVED'
  | 'STOCK_REJECTED'
  | 'PRICE_CHANGE_REQUESTED'
  | 'PRICE_CHANGE_APPROVED'
  | 'PRICE_CHANGE_REJECTED'
  | 'PETTY_CASH_ALLOCATED'
  | 'PETTY_CASH_EXPENSE';

export interface ActivityLog {
  id: string; // e.g., 'act_001'
  userId: string;
  userRole: UserRole;
  userName: string;
  teamId?: string;
  action: ActivityAction;
  entityType: 'User' | 'Contact' | 'Allocation' | 'CallLog' | 'Customer' | 'Order' | 'Expense' | 'Email' | 'Product' | 'Approval' | 'PettyCash';
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

export interface Product {
  id: string; // e.g., 'prd_001'
  teamId: string; // 'team_001' (Team Alpha), 'team_002' (Team Beta)
  name: string; // e.g., 'Adult Package', 'Kids Package', 'Product A'
  code: string; // e.g., 'PKG-ADULT', 'PKG-KIDS'
  category?: string;
  currentStock: number;
  minStockThreshold: number; // Configurable low-stock alert limit (e.g., 10)
  costPrice: number; // LKR
  sellingPrice: number; // LKR
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockActivityLog {
  id: string; // e.g., 'skl_001'
  productId: string;
  productName: string;
  teamId: string;
  action: 'ADD' | 'REMOVE' | 'ADJUST' | 'PRICE_CHANGE';
  quantity: number;
  previousStock: number;
  newStock: number;
  previousCostPrice?: number;
  newCostPrice?: number;
  previousSellingPrice?: number;
  newSellingPrice?: number;
  performedBy: string; // User ID
  performedByName: string;
  approvalRequestId?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export type ApprovalType = 
  | 'STOCK_ADDITION'
  | 'PRODUCT_COST_PRICE_CHANGE'
  | 'PRODUCT_SELLING_PRICE_CHANGE';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalRequestItem {
  productId: string;
  productName: string;
  quantity: number;
  oldStock?: number;
  newStock?: number;
}

export interface ApprovalRequest {
  id: string; // e.g., 'apr_001'
  requestType: ApprovalType;
  requestedById: string;
  requestedByName: string;
  teamId: string;
  productId: string;
  productName: string;
  items?: ApprovalRequestItem[]; // Multi-product stock addition items
  oldValue?: number; // Previous stock or previous cost/selling price
  newValue?: number; // Proposed new stock addition or new cost/selling price
  quantity?: number; // Requested stock addition quantity
  reason: string;
  status: ApprovalStatus;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedDate?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface PettyCashWallet {
  id: string; // e.g., 'wallet_main'
  teamId?: string;
  allocatedAmount: number;
  usedAmount: number;
  remainingBalance: number;
  updatedAt: string;
}

export interface PettyCashTransaction {
  id: string; // e.g., 'pct_001'
  transactionType: 'ALLOCATION' | 'EXPENSE';
  reason: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  userId: string;
  userName: string;
  remainingBalance: number;
  createdAt: string;
}

