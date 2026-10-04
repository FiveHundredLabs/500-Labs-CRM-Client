import {
  Team,
  User,
  Contact,
  ContactAllocation,
  CallLog,
  Customer,
  Order,
  DeliveryStatusHistory,
  ActivityLog,
  ExpenseCategory,
  Expense,
  EmailNotification,
  UserRole,
  ContactStatus,
  Product,
  StockActivityLog,
  ApprovalRequest,
  PettyCashWallet,
  PettyCashTransaction,
  ApprovalStatus,
  TeamSalesTarget,
  TeamTargetTier,
  DuplicatePhoneCheckResult,
  SupervisorSalesTarget,
  SupervisorTargetTier,
  PaymentMethod,
  SalesAnalysisMember,
} from '../../models/domain';

export interface ExpenseWritePayload {
  categoryId: string;
  categoryName: string;
  amount: number;
  expenseDate: string;
  remarks: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  pettyCashRef?: string;
}

export type ExpenseUpdatePayload = Partial<ExpenseWritePayload>;

export interface PettyCashExpensePayload {
  amount: number;
  reason: string;
  category?: string;
  description: string;
  date: string;
  allocationId: string;
  teamId?: string;
}

export type ApprovalRequestCreatePayload = Omit<
  ApprovalRequest,
  'id' | 'createdAt' | 'status' | 'requestedById' | 'requestedByName'
> &
  Partial<Pick<ApprovalRequest, 'requestedById' | 'requestedByName'>>;

export interface ActivityLogWritePayload {
  action: ActivityLog['action'];
  entityType: ActivityLog['entityType'];
  entityId: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface PageInfo {
  total?: number;
  page?: number;
  limit: number;
  totalPages?: number;
  hasNextPage: boolean;
  hasPreviousPage?: boolean;
  endCursor?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  pageInfo: PageInfo;
}

export interface ContactPaginationParams {
  teamId?: string;
  memberId?: string;
  search?: string;
  tab?: string;
  status?: string;
  isFollowUp?: boolean;
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface CustomerPaginationParams {
  teamId?: string;
  supervisorId?: string;
  memberId?: string;
  search?: string;
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface OrderPaginationParams {
  teamId?: string;
  supervisorId?: string;
  memberId?: string;
  customerId?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface ExpenseSummary {
  totalCount: number;
  totalAmount: number;
  allCount: number;
  byCategory: Record<string, number>;
  byPaymentMethod: Record<string, number>;
}

export interface ExpensePaginationParams {
  dateStart?: string;
  dateEnd?: string;
  categoryId?: string;
  categoryName?: string;
  paymentMethod?: string;
  search?: string;
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface OrderMetrics {
  totalOrdersCount: number;
  totalBookedSales: number;
  dispatchedCount: number;
  dispatchedCODSales: number;
  deliveredCount: number;
  deliveredCODSales: number;
  rejectedCount: number;
  rejectedCODSales: number;
  cancelledCount: number;
  cancelledCODSales: number;
  awaitingDispatchCount: number;
  successRate: number;
}

export interface OrderConflictCheckDto {
  orderIds?: string[];
  customerIds?: string[];
  phones?: string[];
  teamId?: string;
}

export interface ITeamRepository {
  getAll(): Promise<Team[]>;
  getById(id: string): Promise<Team | null>;
  create(team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team>;
  update(id: string, updates: Partial<Team>): Promise<Team>;
}

export interface IUserRepository {
  getAll(): Promise<User[]>;
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  getByRole(role: UserRole): Promise<User[]>;
  getByTeamId(teamId: string): Promise<User[]>;
  getLeaderboard(teamId?: string): Promise<LeaderboardUser[]>;
  getBySupervisorId(supervisorId: string): Promise<User[]>;
  create(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
  updateMe(updates: Partial<User>): Promise<User>;
  disable(id: string): Promise<void>;
}

export interface IContactRepository {
  getAll(): Promise<Contact[]>;
  getById(id: string): Promise<Contact | null>;
  getByTeamId(teamId: string): Promise<Contact[]>;
  getByMemberId(memberId: string): Promise<Contact[]>;
  getByPhone(phone: string): Promise<Contact | null>;
  getCounts(params?: { teamId?: string; memberId?: string; search?: string }): Promise<Record<string, number>>;
  getPaginated(params: ContactPaginationParams): Promise<PaginatedResponse<Contact>>;
  create(contact: Omit<Contact, 'id' | 'updatedAt'>): Promise<Contact>;
  createMany(contacts: Array<Omit<Contact, 'id' | 'updatedAt'>>): Promise<Contact[]>;
  addPersonalNumber(data: { phone: string; memberId: string; teamId: string; city?: string; secondaryMobile?: string; code?: string }): Promise<Contact>;
  checkDuplicate(data: { phone: string; memberId?: string; teamId?: string }): Promise<DuplicatePhoneCheckResult>;
  checkDuplicatesBatch(data: { phones: string[]; memberId?: string; teamId?: string }): Promise<Record<string, DuplicatePhoneCheckResult>>;
  update(id: string, updates: Partial<Contact>): Promise<Contact>;
  updateManyStatus(ids: string[], status: ContactStatus): Promise<void>;
}

export interface IAllocationRepository {
  getAll(): Promise<ContactAllocation[]>;
  getByBatchId(batchId: string): Promise<ContactAllocation[]>;
  getByMemberId(memberId: string): Promise<ContactAllocation[]>;
  createMany(allocations: Array<Omit<ContactAllocation, 'id'>>): Promise<ContactAllocation[]>;
}

export interface ICallLogRepository {
  getAll(): Promise<CallLog[]>;
  getByContactId(contactId: string): Promise<CallLog[]>;
  getByMemberId(memberId: string): Promise<CallLog[]>;
  getByTeamId(teamId: string): Promise<CallLog[]>;
  create(log: Omit<CallLog, 'id'>): Promise<CallLog>;
  update(id: string, updates: Partial<CallLog>): Promise<CallLog>;
}

export interface ICustomerRepository {
  getAll(): Promise<Customer[]>;
  getById(id: string): Promise<Customer | null>;
  getByContactId(contactId: string): Promise<Customer | null>;
  getByTeamId(teamId: string): Promise<Customer[]>;
  getBySupervisorId(supervisorId: string): Promise<Customer[]>;
  getByMemberId(memberId: string): Promise<Customer[]>;
  getPaginated(params: CustomerPaginationParams): Promise<PaginatedResponse<Customer>>;
  create(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer>;
  update(id: string, updates: Partial<Customer>): Promise<Customer>;
}

export interface IOrderRepository {
  getAll(params?: Record<string, any>): Promise<Order[]>;
  getById(id: string): Promise<Order | null>;
  getByCustomerId(customerId: string): Promise<Order[]>;
  getByTeamId(teamId: string): Promise<Order[]>;
  getBySupervisorId(supervisorId: string): Promise<Order[]>;
  getByMemberId(memberId: string): Promise<Order[]>;
  getPaginated(params: OrderPaginationParams): Promise<PaginatedResponse<Order>>;
  getMetrics(params?: { teamId?: string; supervisorId?: string; memberId?: string; startDate?: string; endDate?: string }): Promise<OrderMetrics>;
  checkConflicts(dto: OrderConflictCheckDto): Promise<Record<string, any>>;
  create(order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'> & { orderNumber?: string }): Promise<Order>;
  updateStatus(
    id: string,
    status: any,
    remarks?: string,
    damagedProductIds?: string[],
    damagedItems?: { productId?: string; productName?: string; quantity: number; reason?: string }[],
    actionDate?: string
  ): Promise<Order>;
  updateDeliveryCharge(id: string, codCharge: number, remarks?: string): Promise<Order>;
  bulkUpdateDeliveryCharge(input: BulkUpdateDeliveryChargeInput): Promise<{ success: boolean; count: number; orders: Order[] }>;
}

export interface BulkUpdateDeliveryChargeItem {
  orderId: string;
  codCharge: number;
  remarks?: string;
}

export interface BulkUpdateDeliveryChargeInput {
  updates: BulkUpdateDeliveryChargeItem[];
  commonRemarks?: string;
}

export interface IDeliveryStatusHistoryRepository {
  getAll(): Promise<DeliveryStatusHistory[]>;
  getByOrderId(orderId: string): Promise<DeliveryStatusHistory[]>;
  create(history: Omit<DeliveryStatusHistory, 'id' | 'createdAt'>): Promise<DeliveryStatusHistory>;
}

export interface IActivityLogRepository {
  getAll(): Promise<ActivityLog[]>;
  getByUserId(userId: string): Promise<ActivityLog[]>;
  getRecentWithinMonth(userId?: string): Promise<ActivityLog[]>;
  getMyRecentWithinMonth(): Promise<ActivityLog[]>;
  getByEntity(entityType: string, entityId: string): Promise<ActivityLog[]>;
  create(log: ActivityLogWritePayload): Promise<ActivityLog>;
}

export interface IExpenseRepository {
  getAll(params?: { dateStart?: string; dateEnd?: string; categoryId?: string; categoryName?: string; paymentMethod?: string; search?: string }): Promise<Expense[]>;
  getById(id: string): Promise<Expense | null>;
  getCategories(): Promise<ExpenseCategory[]>;
  getSummary(params?: ExpensePaginationParams): Promise<ExpenseSummary>;
  getPaginated(params: ExpensePaginationParams): Promise<PaginatedResponse<Expense>>;
  create(expense: ExpenseWritePayload): Promise<Expense>;
  createCategory(category: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory>;
  updateCategory(id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory>;
  deleteCategory(id: string): Promise<void>;
  update(id: string, updates: ExpenseUpdatePayload): Promise<Expense>;
  delete(id: string): Promise<void>;
  requestChange(id: string, data: { action: 'EDIT' | 'DELETE'; reason: string; [key: string]: any }): Promise<any>;
  getChangeRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<any[]>;
  reviewChangeRequest(id: string, decision: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<any>;
}

export interface IEmailNotificationRepository {
  getAll(): Promise<EmailNotification[]>;
  getByCustomerId(customerId: string): Promise<EmailNotification[]>;
  getByOrderId(orderId: string): Promise<EmailNotification[]>;
  create(data: Omit<EmailNotification, 'id' | 'sentAt'>): Promise<EmailNotification>;
}

export interface IProductRepository {
  getAll(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  getByTeamId(teamId: string): Promise<Product[]>;
  create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product>;
  update(id: string, updates: Partial<Product>): Promise<Product>;
  updateStock(id: string, stockDelta: number): Promise<Product>;
  reportDamage(id: string, quantity: number, reason?: string, batchId?: string): Promise<Product>;
  delete(id: string): Promise<void>;
}

export interface IStockActivityLogRepository {
  getAll(): Promise<StockActivityLog[]>;
  getByProductId(productId: string): Promise<StockActivityLog[]>;
  getByTeamId(teamId: string): Promise<StockActivityLog[]>;
  create(log: Omit<StockActivityLog, 'id' | 'createdAt'>): Promise<StockActivityLog>;
}

export interface IApprovalRequestRepository {
  getAll(): Promise<ApprovalRequest[]>;
  getById(id: string): Promise<ApprovalRequest | null>;
  getByStatus(status: ApprovalStatus): Promise<ApprovalRequest[]>;
  getByTeamId(teamId: string): Promise<ApprovalRequest[]>;
  create(request: ApprovalRequestCreatePayload): Promise<ApprovalRequest>;
  review(id: string, status: 'APPROVED' | 'REJECTED', reviewedBy: User, rejectionReason?: string): Promise<ApprovalRequest>;
}

export interface IPettyCashRepository {
  getWallet(teamId?: string): Promise<PettyCashWallet>;
  getTransactions(teamId?: string): Promise<PettyCashTransaction[]>;
  getAllocations(teamId?: string): Promise<any[]>;
  getAllocationById(id: string): Promise<any>;
  allocate(amount: number, reason: string, teamId?: string, remarks?: string, date?: string): Promise<any>;
  recordExpense(data: PettyCashExpensePayload): Promise<PettyCashTransaction>;
}

export interface IFinanceRepository {
  getDashboard(startDate?: string, endDate?: string): Promise<any>;
  getIncomeStatement(startDate?: string, endDate?: string): Promise<any>;
  getCashFlow(startDate?: string, endDate?: string): Promise<any>;
  getFSR(startDate?: string, endDate?: string): Promise<any>;
  getExpenseReport(startDate?: string, endDate?: string): Promise<any>;
  getInventoryReport(teamId?: string, startDate?: string, endDate?: string): Promise<any[]>;
  getRealizedSalesReport(startDate?: string, endDate?: string, teamId?: string): Promise<any[]>;
  getSalesReport(period: 'daily' | 'weekly' | 'monthly', startDate?: string, endDate?: string): Promise<any>;
  getCityDeliveryReport(startDate?: string, endDate?: string): Promise<any>;
  getDistrictDeliveryReport(startDate?: string, endDate?: string): Promise<any>;
  getSalesAnalysisMembers(): Promise<SalesAnalysisMember[]>;
  getTeamMemberSalesReport(startDate?: string, endDate?: string, teamId?: string): Promise<any>;
  getContactBatchReport(startDate?: string, endDate?: string, teamId?: string): Promise<any>;
  getSalesAnalysisSummary(params: {
    teamId?: string;
    status?: string;
    package?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<SalesAnalysisSummary>;
}

export interface SalesAnalysisSummary {
  metrics: {
    totalSalesValue: number;
    deliveredValue: number;
    dispatchedValue: number;
    preparedValue: number;
    deliveredCount: number;
    dispatchedCount: number;
    rejectedCount: number;
    totalOrdersCount: number;
    deliverySuccessRate: number;
    averageOrderValue: number;
    totalUnits: number;
    adultUnits: number;
    kidsUnits: number;
  };
  salesTimeline: Array<{ date: string; revenue: number; orders: number; delivered: number }>;
  teamComparison: Array<{ name: string; revenue: number; orders: number; delivered: number }>;
  packageDistribution: Array<{ name: string; value: number; color: string }>;
  orderStatusBreakdown?: Array<{ status: string; count: number; color: string }>;
  totalOrdersCount: number;
}

export interface AdminDashboardSummary {
  kpi: {
    totalGrossSales: number;
    bookedOrdersCount: number;
    dispatchedCount: number;
    deliveredCount: number;
    interestedContactsCount: number;
    totalExpenses: number;
    pendingApprovalsCount?: number;
  };
  teamLeaderboards: Array<{
    team: { id: string; name: string };
    items: Array<{
      id: string;
      rank: number;
      name: string;
      avatarUrl?: string;
      primaryValue: number;
      secondaryValue: number;
      primaryLabel: string;
      secondaryLabel: string;
      unitLabel: string;
    }>;
  }>;
  recentActivities: ActivityLog[];
  pendingApprovals?: ApprovalRequest[];
}

export interface LeaderboardUser extends User {
  deliveredSalesAmount: number;
  deliveredOrdersCount: number;
  totalOrdersCount: number;
}

export interface SupervisorDashboardSummary {
  kpi: {
    totalGrossSales: number;
    totalOrders: number;
    dispatchedOrders: number;
    deliveredOrders: number;
    totalDeliveredSales: number;
    deliveryRate: number;
    interestedContactsCount: number;
    callsCount: number;
    rejectedOrders: number;
    unallocatedContactsCount: number;
  };
  lowStockProducts: Array<{ id: string; name: string; code?: string; currentStock: number; minStockThreshold: number }>;
  leaderboard: Array<{
    rank: number;
    memberId: string;
    memberName: string;
    avatarUrl?: string | null;
    totalOrders?: number;
    dispatchedOrders?: number;
    deliveredOrders: number;
    rejectedOrders?: number;
    deliveryRate?: number;
    totalSalesValue: number;
    allocatedLeads?: number;
    conversionRate?: number;
  }>;
  recentActivities: ActivityLog[];
}

export interface IDashboardRepository {
  getAdminSummary(params?: { startDate?: string; endDate?: string }): Promise<AdminDashboardSummary>;
  getSupervisorSummary(params?: { startDate?: string; endDate?: string; teamId?: string }): Promise<SupervisorDashboardSummary>;
}

export interface ISalesTargetRepository {
  getAll(month?: string, teamId?: string): Promise<TeamSalesTarget[]>;
  getById(id: string): Promise<TeamSalesTarget | null>;
  upsert(target: {
    teamId: string;
    month: string;
    targetAmount: number;
    notes?: string;
    tiers: TeamTargetTier[];
  }): Promise<TeamSalesTarget>;
  update(id: string, updates: Partial<TeamSalesTarget>): Promise<TeamSalesTarget>;
  delete(id: string): Promise<void>;
}

export interface ISupervisorTargetRepository {
  getAll(month?: string, supervisorId?: string): Promise<SupervisorSalesTarget[]>;
  getById(id: string): Promise<SupervisorSalesTarget | null>;
  upsert(target: {
    supervisorId: string;
    month: string;
    targetAmount: number;
    notes?: string;
    tiers: SupervisorTargetTier[];
  }): Promise<SupervisorSalesTarget>;
  update(id: string, updates: Partial<SupervisorSalesTarget>): Promise<SupervisorSalesTarget>;
  delete(id: string): Promise<void>;
}
