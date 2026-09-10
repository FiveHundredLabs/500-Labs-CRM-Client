export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'TEAM_MEMBER' | 'FINANCE';

export type ContactStatus = 
  | 'NEW'
  | 'FOLLOW_UP'
  | 'ANSWERED'
  | 'NOT_ANSWERED'
  | 'PHONE_OFF'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'SAVED_CONTACTS';

export type OrderStatus =
  | 'DRAFT'
  | 'PREPARED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'REJECTED'
  | 'RETURNED'
  | 'CANCELLED';

export type EmailNotificationStatus = 'SENT' | 'SKIPPED' | 'FAILED';

export type DeliveryMethod = 'POST' | 'ROYAL_COURIER';

export interface Team {
  id: string;
  name: string;
  code: string;
  brandColor: string; // Hex color for branding
  accentColor: string;
  logoText: string;
  logo?: string | null;
  contactEmail: string;
  contactPhone: string;
  address: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string; // e.g., 'usr_admin', 'usr_sup_01'
  username: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  teamId: string | null; // null for ADMIN & FINANCE if multi-team
  supervisorId: string | null; // null for ADMIN, FINANCE, SUPERVISOR
  phone: string;
  avatarUrl?: string | null;
  nic?: string;
  dateOfBirth?: string;
  joiningDate: string;
  joinedDate?: string; // Read-only alias for joiningDate
  salary?: number; // Base salary in LKR
  monthlyGoal?: number; // Monthly sales target in LKR (default 25,000)
  incentiveAmount?: number; // Calculated incentive amount
  isActive: boolean;
  createdAt: string;
  team?: Team | null;
}

export interface SalesAnalysisMember {
  id: string;
  fullName: string;
  teamId?: string | null;
  role: UserRole | string;
  username: string;
}

export interface Contact {
  id: string; // e.g., 'cnt_001'
  code?: string; // Unique contact code e.g. 'CTC-001', 'LEAD-9821'
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
  callLogs?: CallLog[];
  customers?: Customer[];
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

export interface DuplicatePhoneOrderHistory {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  deliveredAt?: string | null;
  rejectedAt?: string | null;
  remarks?: string | null;
  itemsDescription: string;
  teamMemberName?: string;
}

export interface DuplicatePhoneIntelligence {
  phone: string;
  assignedMemberName: string;
  teamName: string;
  allocatedAt?: string | null;
  lastCalledAt?: string | null;
  lastCallStatus?: ContactStatus | string | null;
  lastCallRemarks?: string | null;
  lastCustomerName?: string | null;
  deliveryAddress?: string | null;
  city?: string | null;
  previousOrders: DuplicatePhoneOrderHistory[];
}

export interface DuplicatePhoneCheckResult {
  exists: boolean;
  isOwnedBySelf: boolean;
  message?: string;
  contact?: Contact;
  intelligence?: DuplicatePhoneIntelligence;
}

export interface CallLog {
  id: string; // e.g., 'cll_001'
  contactId: string;
  teamMemberId: string;
  teamId: string;
  status: ContactStatus;
  direction?: 'OUTBOUND' | 'INBOUND';
  customerName?: string;
  customerAddress?: string;
  customerEmail?: string;
  city?: string;
  secondaryMobile?: string;
  deliveryMethod?: DeliveryMethod;
  deliveryNote?: string;
  selectedPackage?: 'ADULT' | 'KIDS' | 'BOTH' | 'NONE' | string;
  selectedProductId?: string;
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
  contactPhone?: string;
  contact?: {
    id: string;
    phone: string;
    secondaryMobile?: string;
    city?: string;
    status?: string;
  };
}

export interface Customer {
  id: string; // e.g., 'cst_001'
  contactId: string;
  code?: string;
  fullName: string;
  phone: string;
  secondaryMobile?: string;
  city?: string;
  address: string;
  email?: string;
  deliveryMethod?: DeliveryMethod;
  deliveryNote?: string;
  teamId: string;
  responsibleTeamMemberId: string;
  supervisorId: string;
  team?: Team;
  contact?: Contact;
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

export interface OrderItem {
  id?: string;
  orderId?: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  createdAt?: string;
}

export interface Order {
  id: string; // e.g., 'ord_001'
  orderNumber: string; // e.g., 'ORD-2026-001'
  publicSlipToken?: string;
  customerId: string;
  teamId: string;
  teamMemberId: string; // Responsible Team Member
  supervisorId: string;
  status: OrderStatus;
  deliveryMethod?: DeliveryMethod;
  deliveryNote?: string;
  itemsDescription: string;
  selectedPackage?: 'ADULT' | 'KIDS' | 'BOTH' | string;
  selectedProductId?: string;
  adultQty?: number;
  adultUnitPrice?: number;
  adultSubtotal?: number;
  kidsQty?: number;
  kidsUnitPrice?: number;
  kidsSubtotal?: number;
  totalPackageValue?: number;
  codCharge?: number | null;
  codAmount?: number;
  amountToCollect?: number;
  productSalesValue?: number;
  totalAmount: number;
  currency: string;
  remarks?: string;
  deliveredAt?: string;
  rejectedAt?: string;
  damagedItems?: { productId?: string; productName: string; quantity: number; reason?: string }[];
  items?: OrderItem[];
  dispatchHistory?: OrderDispatchRecord[];
  previousDispatchInfo?: PreviousDispatchInfo;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  team?: Team;
}

export interface ParcelSlipTeam {
  name: string;
  code?: string;
  logo?: string | null;
  address?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

export interface ParcelSlipCustomer {
  fullName: string;
  phone: string;
  secondaryMobile?: string | null;
  secondaryPhone?: string | null;
  address: string;
  code?: string | null;
  contactCode?: string | null;
}

export interface ParcelSlipItem {
  productName: string;
  quantity: number;
}

export interface ParcelSlipData {
  publicSlipToken: string;
  orderNumber: string;
  orderDate: string;
  itemsDescription: string;
  paymentMethod?: string | null;
  codAmount?: number | string | null;
  codCharge?: number | string | null;
  amountToCollect?: number | string | null;
  productSalesValue?: number | string | null;
  totalAmount: number | string;
  currency?: string;
  contactCode?: string | null;
  customer: ParcelSlipCustomer;
  team: ParcelSlipTeam;
  items?: ParcelSlipItem[];
}

export interface DeliveryStatusHistory {
  id: string; // e.g., 'dsh_001'
  orderId: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  remarks?: string;
  damagedItems?: { productId?: string; productName: string; quantity: number; reason?: string }[];
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
  | 'ORDER_CANCELLED'
  | 'LEAD_CANCELLED'
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

export type ExpenseChangeRequestAction = 'EDIT' | 'DELETE';
export type ExpenseChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'PETTY_CASH';

export interface ExpenseCategory {
  id: string; // e.g., 'cat_001'
  name: string; // 'Petty Cash', 'Postal Charges', 'Transport', 'Printing', 'Other'
  isCustom: boolean;
  description?: string;
}

export interface ExpenseChangeRequest {
  id: string;
  expenseId: string;
  action: ExpenseChangeRequestAction;
  originalValues: Record<string, any>;
  requestedValues?: Record<string, any> | null;
  reason: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  status: ExpenseChangeRequestStatus;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  expense?: Expense;
}

export interface Expense {
  id: string; // e.g., 'exp_001'
  categoryId: string;
  categoryName: string;
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  remarks: string;
  paymentMethod?: PaymentMethod | null;
  notes?: string | null;
  pettyCashRef?: string | null;
  createdBy: string; // Finance User ID
  createdByName: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  changeRequests?: ExpenseChangeRequest[];
  hasPendingChangeRequest?: boolean;
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

export type BatchStatus = 'ACTIVE' | 'DEPLETED' | 'QUARANTINED' | 'EXPIRED' | 'DAMAGED';
export type PricingMode = 'GLOBAL' | 'BATCH_SPECIFIC';

export interface StockBatch {
  id: string; // e.g. UUID
  batchNumber: string; // e.g. "BAT-20260828-001"
  productId: string;
  teamId: string;
  initialQuantity: number;
  remainingQuantity: number;
  reservedQuantity: number;
  unitCostPrice: number; // Acquisition cost for THIS batch (e.g. Rs. 450, Rs. 500)
  batchSellingPrice?: number | null; // Optional batch-specific price (e.g. Rs. 550, Rs. 600)
  status: BatchStatus;
  supplierName?: string | null;
  invoiceNumber?: string | null;
  receivedDate: string;
  expiryDate?: string | null;
  approvalRequestId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPriceHistory {
  id: string;
  productId: string;
  teamId: string;
  oldSellingPrice: number;
  newSellingPrice: number;
  oldCostPrice?: number | null;
  newCostPrice?: number | null;
  reason: string;
  changedById: string;
  changedByName: string;
  approvalRequestId?: string | null;
  effectiveDate: string;
}

export interface Product {
  id: string; // e.g., 'prod_001'
  name: string;
  code: string; // SKU
  teamId: string;
  category?: string;
  currentStock: number;
  allocatedStock?: number; // Stock reserved for PREPARED orders
  dispatchedStock?: number; // Stock in transit
  soldStock?: number; // Successfully delivered stock
  damagedStock?: number; // Damaged units quarantined / not calculated in sellable stock
  minStockThreshold: number;
  costPrice: number; // Reference LKR cost
  sellingPrice: number; // Active catalog LKR price
  isActive: boolean;
  batches?: StockBatch[];
  priceHistory?: ProductPriceHistory[];
  team?: Team;
  createdAt: string;
  updatedAt: string;
}

export interface StockActivityLog {
  id: string; // e.g., 'skl_001'
  productId: string;
  productName: string;
  teamId: string;
  action: 'ADD' | 'REMOVE' | 'ADJUST' | 'PRICE_CHANGE' | 'ALLOCATE' | 'DISPATCH' | 'DELIVER' | 'RETURN_RESTOCK' | 'RETURN_DAMAGE' | 'CANCEL_DEALLOCATE' | 'CANCEL_RESTOCK' | string;
  quantity: number;
  previousStock: number;
  newStock: number;
  previousCostPrice?: number;
  newCostPrice?: number;
  previousSellingPrice?: number;
  newSellingPrice?: number;
  performedById?: string;
  performedBy?: string; // User ID
  performedByName: string;
  approvalRequestId?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
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
  unitCostPrice?: number; // Batch cost (e.g. Rs. 500)
  proposedSellingPrice?: number; // Proposed price (e.g. Rs. 600)
  pricingMode?: PricingMode;
  batchNumber?: string;
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
  unitCostPrice?: number; // Batch cost (e.g. Rs. 500)
  proposedSellingPrice?: number; // Proposed selling price (e.g. Rs. 600)
  pricingMode?: PricingMode; // GLOBAL vs BATCH_SPECIFIC
  batchNumber?: string;
  supplierName?: string;
  invoiceNumber?: string;
  expiryDate?: string;
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

export interface PettyCashAllocation {
  id: string;
  allocationCode: string; // e.g. 'PC-0001'
  walletId: string;
  teamId?: string | null;
  amount: number;
  usedAmount: number;
  remainingAmount: number;
  reason: string;
  allocatedById: string;
  allocatedByName: string;
  remarks?: string | null;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  transactions?: PettyCashTransaction[]; // Linked expense transactions
}

export interface PettyCashTransaction {
  id: string; // e.g., 'pct_001'
  transactionType: 'ALLOCATION' | 'EXPENSE';
  allocationId?: string | null; // Linked PettyCashAllocation ID
  reason: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  userId: string;
  userName: string;
  teamId?: string | null;
  remainingBalance: number;
  createdAt: string;
  allocation?: PettyCashAllocation | null;
}

// ─── Finance Analytics Types ──────────────────────────────────────────────────

export interface FinanceDashboardStats {
  salesRevenue: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalStockValue: number;
  totalOrders: number;
  deliveredCount: number;
  pettyCash: {
    allocatedAmount: number;
    usedAmount: number;
    remainingBalance: number;
  };
  pettyCashExpensesTotal: number;
  expenseByCategory: Record<string, number>;
}

export interface IncomeStatementData {
  revenue: {
    salesRevenue: number;
    otherIncome: number;
    totalRevenue: number;
  };
  cogs: number;
  grossProfit: number;
  operatingExpenses: {
    breakdown: Record<string, number>;
    totalOperatingExpenses: number;
    pettyCashExpenses: number;
    pettyCashBreakdown: Record<string, number>;
    totalAllExpenses: number;
  };
  netProfit: number;
  orderCount: number;
}

export interface CashFlowData {
  inflows: {
    salesCollections: number;
    otherIncome: number;
    totalInflows: number;
    details: Array<{ date: string; description: string; amount: number }>;
  };
  outflows: {
    operatingExpenses: number;
    pettyCashUsage: number;
    totalOutflows: number;
    expenseDetails: Array<{ date: string; description: string; amount: number }>;
  };
  netCashFlow: number;
}

export interface FinanceFSRData {
  period: { startDate?: string; endDate?: string };
  summary: {
    totalRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    totalOperatingExpenses: number;
    netProfit: number;
    netCashFlow: number;
  };
  incomeStatement: IncomeStatementData;
  cashFlow: CashFlowData;
  pettyCash: { allocatedAmount: number; usedAmount: number; remainingBalance: number } | null;
  generatedAt: string;
}

export interface InventoryReportItem {
  id: string;
  name: string;
  code: string;
  teamId?: string;
  teamName?: string;
  category?: string;
  currentStock: number;
  soldStock: number;
  damagedStock?: number;
  costPrice: number;
  sellingPrice: number;
  stockValue: number;
  salesRevenue: number;
  salesQuantity: number;
  cogs: number;
  grossProfit: number;
  margin: string;
  activeBatches: number;
}

export interface SalesReportPeriodData {
  period: string;
  revenue: number;
  orderCount: number;
  cogs: number;
  grossProfit: number;
}

export interface CityDeliveryData {
  city: string;
  total: number;
  delivered: number;
  pending: number;
  cancelled: number;
  revenue: number;
}

export interface ExpenseReportData {
  total: number;
  byCategory: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  byDate: Record<string, number>;
  monthlyTrend: Record<string, number>;
  expenses: Array<{
    id: string;
    date: string;
    category: string;
    amount: number;
    paymentMethod?: string;
    remarks: string;
    notes?: string;
    createdByName: string;
    createdAt: string;
  }>;
}

export interface TeamTargetTier {
  id?: string;
  targetId?: string;
  minPercentage: number; // e.g. 80, 100, 120
  allowanceAmount: number; // e.g. 10000, 20000, 35000
  title?: string;
  isUnlocked?: boolean;
  unlockedMembersCount?: number;
}

export interface MemberSalesPerformance {
  id: string;
  fullName: string;
  username: string;
  email: string;
  actualSales: number;
  achievementPercentage: number;
  unlockedAllowance: number;
  highestUnlockedTier?: TeamTargetTier | null;
  ordersCount: number;
}

export interface TeamSalesTarget {
  id: string;
  teamId: string;
  month: string; // YYYY-MM (Effective start month)
  targetAmount: number; // Monthly sales goal in LKR per member
  notes?: string;
  evaluatedMonth?: string; // Currently evaluated month
  isInheritedStandingTarget?: boolean; // True if carrying over from an earlier month
  effectiveFromMonth?: string;
  team?: {
    id: string;
    name: string;
    code: string;
    brandColor?: string;
  };
  tiers: TeamTargetTier[];
  actualSales?: number;
  achievementPercentage?: number;
  unlockedAllowance?: number;
  highestUnlockedTier?: TeamTargetTier | null;
  membersCount?: number;
  totalAchieversCount?: number;
  memberBreakdowns?: MemberSalesPerformance[];
  createdAt?: string;
  updatedAt?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERVISOR TEAM GOAL & INCENTIVE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export interface SupervisorTargetTier {
  id?: string;
  targetId?: string;
  minPercentage: number;
  allowanceAmount: number;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupervisorMemberBreakdown {
  id: string;
  fullName: string;
  username: string;
  actualSales: number;
  ordersCount: number;
}

export interface SupervisorSalesTarget {
  id: string;
  supervisorId: string;
  month: string; // YYYY-MM
  targetAmount: number; // Collective team goal in LKR
  notes?: string;
  evaluatedMonth?: string;
  isInheritedStandingTarget?: boolean;
  effectiveFromMonth?: string;
  supervisor?: {
    id: string;
    fullName: string;
    username: string;
    teamId?: string | null;
    team?: { id: string; name: string; code: string; brandColor?: string } | null;
  };
  tiers: SupervisorTargetTier[];
  totalTeamSales?: number;
  achievementPercentage?: number;
  unlockedAllowance?: number;
  highestUnlockedTier?: SupervisorTargetTier | null;
  membersCount?: number;
  memberBreakdowns?: SupervisorMemberBreakdown[];
  createdAt?: string;
  updatedAt?: string;
}
