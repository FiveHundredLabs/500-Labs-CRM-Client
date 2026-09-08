import apiClient from '../../lib/apiClient';
import {
  ITeamRepository,
  IUserRepository,
  IContactRepository,
  IAllocationRepository,
  ICallLogRepository,
  ICustomerRepository,
  IOrderRepository,
  IDeliveryStatusHistoryRepository,
  IActivityLogRepository,
  IExpenseRepository,
  IEmailNotificationRepository,
  IProductRepository,
  IStockActivityLogRepository,
  IApprovalRequestRepository,
  IPettyCashRepository,
  ISalesTargetRepository,
  ISupervisorTargetRepository,
  IFinanceRepository,
  ExpenseWritePayload,
  ExpenseUpdatePayload,
  PettyCashExpensePayload,
  ApprovalRequestCreatePayload,
  ActivityLogWritePayload,
} from '../interfaces';
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
} from '../../models/domain';

// ─── Helper ──────────────────────────────────────────────────────────────────
// All backend responses are wrapped as { success: true, data: T }
const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

// ─────────────────────────────────────────────────────────────────────────────
// Team
// ─────────────────────────────────────────────────────────────────────────────
export class ApiTeamRepository implements ITeamRepository {
  async getAll(): Promise<Team[]> {
    return unwrap(await apiClient.get<{ data: Team[] }>('/teams'));
  }
  async getById(id: string): Promise<Team | null> {
    try {
      return unwrap(await apiClient.get<{ data: Team }>(`/teams/${id}`));
    } catch {
      return null;
    }
  }
  async create(teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
    return unwrap(await apiClient.post<{ data: Team }>('/teams', teamData));
  }
  async update(id: string, updates: Partial<Team>): Promise<Team> {
    const payload: Partial<Team> = { ...updates };
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    return unwrap(await apiClient.patch<{ data: Team }>(`/teams/${id}`, payload));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────
export class ApiUserRepository implements IUserRepository {
  async getAll(): Promise<User[]> {
    const res = unwrap(await apiClient.get<{ data: any }>('/users')) as any;
    // getAll returns paginated: { items, total } — extract items
    return Array.isArray(res) ? res : res.items ?? res;
  }
  async getById(id: string): Promise<User | null> {
    try {
      return unwrap(await apiClient.get<{ data: User }>(`/users/${id}`));
    } catch {
      return null;
    }
  }
  async getByEmail(email: string): Promise<User | null> {
    try {
      const all = await this.getAll();
      return all.find((u) => u.email === email || u.username === email) ?? null;
    } catch {
      return null;
    }
  }
  async getByRole(role: UserRole): Promise<User[]> {
    const all = await this.getAll();
    return all.filter((u) => u.role === role);
  }
  async getByTeamId(teamId: string): Promise<User[]> {
    try {
      const res = unwrap(
        await apiClient.get<{ data: any }>(`/users?teamId=${teamId}&limit=100`)
      ) as any;
      const items = Array.isArray(res) ? res : res?.items;
      if (Array.isArray(items)) {
        return items;
      }
      return unwrap(
        await apiClient.get<{ data: User[] }>(`/users/leaderboard?teamId=${teamId}`)
      );
    } catch {
      return unwrap(
        await apiClient.get<{ data: User[] }>(`/users/leaderboard?teamId=${teamId}`)
      );
    }
  }
  async getBySupervisorId(supervisorId: string): Promise<User[]> {
    const all = await this.getAll();
    return all.filter((u) => u.supervisorId === supervisorId);
  }
  async create(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const payload: Record<string, any> = {
      username: userData.username || userData.email.split('@')[0],
      email: userData.email.trim().toLowerCase(),
      password: userData.password || 'ChangeThisStrongPassword123!',
      fullName: userData.fullName,
      role: userData.role,
      phone: userData.phone,
      joiningDate: userData.joiningDate ? userData.joiningDate.split('T')[0] : new Date().toISOString().split('T')[0],
    };

    if (userData.teamId && userData.teamId.trim() !== '') {
      payload.teamId = userData.teamId;
    }
    if (userData.supervisorId && userData.supervisorId.trim() !== '') {
      payload.supervisorId = userData.supervisorId;
    }
    if (userData.avatarUrl && userData.avatarUrl.trim() !== '') {
      payload.avatarUrl = userData.avatarUrl;
    }
    if (userData.nic && userData.nic.trim() !== '') {
      payload.nic = userData.nic;
    }
    if (userData.dateOfBirth && userData.dateOfBirth.trim() !== '') {
      payload.dateOfBirth = userData.dateOfBirth.split('T')[0];
    }
    if (typeof userData.salary === 'number') {
      payload.salary = userData.salary;
    }
    if (typeof userData.monthlyGoal === 'number') {
      payload.monthlyGoal = userData.monthlyGoal;
    }

    return unwrap(await apiClient.post<{ data: User }>('/users', payload));
  }
  async update(id: string, updates: Partial<User>): Promise<User> {
    const payload: Record<string, any> = {};
    if (updates.fullName !== undefined) payload.fullName = updates.fullName;
    if (updates.username !== undefined) payload.username = updates.username;
    if (updates.email !== undefined) payload.email = updates.email.trim().toLowerCase();
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.avatarUrl !== undefined) payload.avatarUrl = updates.avatarUrl || null;
    if (updates.nic !== undefined) payload.nic = updates.nic;
    if (updates.dateOfBirth !== undefined) payload.dateOfBirth = updates.dateOfBirth ? updates.dateOfBirth.split('T')[0] : undefined;
    if (updates.joiningDate !== undefined) payload.joiningDate = updates.joiningDate ? updates.joiningDate.split('T')[0] : undefined;
    if (updates.teamId !== undefined) payload.teamId = updates.teamId || undefined;
    if (updates.supervisorId !== undefined) payload.supervisorId = updates.supervisorId || undefined;
    if (updates.salary !== undefined) payload.salary = updates.salary;
    if (updates.monthlyGoal !== undefined) payload.monthlyGoal = updates.monthlyGoal;
    if (updates.password !== undefined && updates.password.trim() !== '') payload.password = updates.password;

    return unwrap(await apiClient.patch<{ data: User }>(`/users/${id}`, payload));
  }
  async updateMe(updates: Partial<User>): Promise<User> {
    const payload: Record<string, any> = {};
    if (updates.fullName !== undefined) payload.fullName = updates.fullName;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.avatarUrl !== undefined) payload.avatarUrl = updates.avatarUrl || null;
    if (updates.dateOfBirth !== undefined) payload.dateOfBirth = updates.dateOfBirth ? updates.dateOfBirth.split('T')[0] : undefined;
    if (updates.password !== undefined && updates.password.trim() !== '') payload.password = updates.password;

    return unwrap(await apiClient.patch<{ data: User }>('/users/me', payload));
  }
  async disable(id: string): Promise<void> {
    await apiClient.patch(`/users/${id}/status`, { isActive: false });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact
// ─────────────────────────────────────────────────────────────────────────────
export class ApiContactRepository implements IContactRepository {
  async getAll(): Promise<Contact[]> {
    return unwrap(await apiClient.get<{ data: Contact[] }>('/contacts'));
  }
  async getById(id: string): Promise<Contact | null> {
    try {
      return unwrap(await apiClient.get<{ data: Contact }>(`/contacts/${id}`));
    } catch {
      return null;
    }
  }
  async getByTeamId(teamId: string): Promise<Contact[]> {
    return unwrap(await apiClient.get<{ data: Contact[] }>(`/contacts?teamId=${teamId}`));
  }
  async getByMemberId(memberId: string): Promise<Contact[]> {
    return unwrap(await apiClient.get<{ data: Contact[] }>(`/contacts?memberId=${memberId}`));
  }
  async getByPhone(phone: string): Promise<Contact | null> {
    try {
      return unwrap(
        await apiClient.get<{ data: Contact }>(`/contacts/lookup/phone?phone=${encodeURIComponent(phone)}&teamId=`)
      );
    } catch {
      return null;
    }
  }
  async create(contact: Omit<Contact, 'id' | 'updatedAt'>): Promise<Contact> {
    return unwrap(await apiClient.post<{ data: Contact }>('/contacts', contact));
  }
  async createMany(contacts: Array<Omit<Contact, 'id' | 'updatedAt'>>): Promise<Contact[]> {
    return unwrap(await apiClient.post<{ data: Contact[] }>('/contacts/bulk', { contacts }));
  }
  async addPersonalNumber(data: {
    phone: string;
    memberId: string;
    teamId: string;
    city?: string;
    secondaryMobile?: string;
    code?: string;
  }): Promise<Contact> {
    return unwrap(await apiClient.post<{ data: Contact }>('/contacts/personal', data));
  }
  async checkDuplicate(data: { phone: string; memberId?: string; teamId?: string }): Promise<DuplicatePhoneCheckResult> {
    return unwrap(await apiClient.post<{ data: DuplicatePhoneCheckResult }>('/contacts/check-duplicate', data));
  }
  async update(id: string, updates: Partial<Contact>): Promise<Contact> {
    const payload: any = { ...updates };
    delete payload.id;
    delete payload.updatedAt;
    return unwrap(await apiClient.patch<{ data: Contact }>(`/contacts/${id}`, payload));
  }
  async updateManyStatus(ids: string[], status: ContactStatus): Promise<void> {
    await apiClient.patch('/contacts/batch-status', { ids, status });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Allocation
// ─────────────────────────────────────────────────────────────────────────────
export class ApiAllocationRepository implements IAllocationRepository {
  async getAll(): Promise<ContactAllocation[]> {
    return unwrap(await apiClient.get<{ data: ContactAllocation[] }>('/allocations'));
  }
  async getByBatchId(batchId: string): Promise<ContactAllocation[]> {
    return unwrap(await apiClient.get<{ data: ContactAllocation[] }>(`/allocations?batchId=${batchId}`));
  }
  async getByMemberId(memberId: string): Promise<ContactAllocation[]> {
    return unwrap(await apiClient.get<{ data: ContactAllocation[] }>(`/allocations?memberId=${memberId}`));
  }
  async createMany(
    allocations: Array<Omit<ContactAllocation, 'id'>>
  ): Promise<ContactAllocation[]> {
    return unwrap(await apiClient.post<{ data: ContactAllocation[] }>('/allocations/bulk', { allocations }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CallLog
// ─────────────────────────────────────────────────────────────────────────────
export class ApiCallLogRepository implements ICallLogRepository {
  async getAll(): Promise<CallLog[]> {
    return unwrap(await apiClient.get<{ data: CallLog[] }>('/call-logs'));
  }
  async getByContactId(contactId: string): Promise<CallLog[]> {
    return unwrap(await apiClient.get<{ data: CallLog[] }>(`/call-logs?contactId=${contactId}`));
  }
  async getByMemberId(memberId: string): Promise<CallLog[]> {
    return unwrap(await apiClient.get<{ data: CallLog[] }>(`/call-logs?memberId=${memberId}`));
  }
  async getByTeamId(teamId: string): Promise<CallLog[]> {
    return unwrap(await apiClient.get<{ data: CallLog[] }>(`/call-logs?teamId=${teamId}`));
  }
  async create(log: Omit<CallLog, 'id'>): Promise<CallLog> {
    return unwrap(await apiClient.post<{ data: CallLog }>('/call-logs', log));
  }
  async update(id: string, updates: Partial<CallLog>): Promise<CallLog> {
    const payload: any = { ...updates };
    delete payload.id;
    return unwrap(await apiClient.patch<{ data: CallLog }>(`/call-logs/${id}`, payload));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer
// ─────────────────────────────────────────────────────────────────────────────
export class ApiCustomerRepository implements ICustomerRepository {
  async getAll(): Promise<Customer[]> {
    return unwrap(await apiClient.get<{ data: Customer[] }>('/customers'));
  }
  async getById(id: string): Promise<Customer | null> {
    try {
      return unwrap(await apiClient.get<{ data: Customer }>(`/customers/${id}`));
    } catch {
      return null;
    }
  }
  async getByContactId(contactId: string): Promise<Customer | null> {
    try {
      return unwrap(await apiClient.get<{ data: Customer }>(`/customers?contactId=${contactId}`));
    } catch {
      return null;
    }
  }
  async getByTeamId(teamId: string): Promise<Customer[]> {
    return unwrap(await apiClient.get<{ data: Customer[] }>(`/customers?teamId=${teamId}`));
  }
  async getBySupervisorId(supervisorId: string): Promise<Customer[]> {
    return unwrap(await apiClient.get<{ data: Customer[] }>(`/customers?supervisorId=${supervisorId}`));
  }
  async getByMemberId(memberId: string): Promise<Customer[]> {
    return unwrap(await apiClient.get<{ data: Customer[] }>(`/customers?memberId=${memberId}`));
  }
  async create(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    return unwrap(await apiClient.post<{ data: Customer }>('/customers', customer));
  }
  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    const payload: any = { ...updates };
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    return unwrap(await apiClient.patch<{ data: Customer }>(`/customers/${id}`, payload));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order
// ─────────────────────────────────────────────────────────────────────────────
export class ApiOrderRepository implements IOrderRepository {
  async getAll(): Promise<Order[]> {
    return unwrap(await apiClient.get<{ data: Order[] }>('/orders'));
  }
  async getById(id: string): Promise<Order | null> {
    try {
      return unwrap(await apiClient.get<{ data: Order }>(`/orders/${id}`));
    } catch {
      return null;
    }
  }
  async getByCustomerId(customerId: string): Promise<Order[]> {
    return unwrap(await apiClient.get<{ data: Order[] }>(`/orders?customerId=${customerId}`));
  }
  async getByTeamId(teamId: string): Promise<Order[]> {
    return unwrap(await apiClient.get<{ data: Order[] }>(`/orders?teamId=${teamId}`));
  }
  async getBySupervisorId(supervisorId: string): Promise<Order[]> {
    return unwrap(await apiClient.get<{ data: Order[] }>(`/orders?supervisorId=${supervisorId}`));
  }
  async getByMemberId(memberId: string): Promise<Order[]> {
    return unwrap(await apiClient.get<{ data: Order[] }>(`/orders?memberId=${memberId}`));
  }
  async create(
    order: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'> & { orderNumber?: string }
  ): Promise<Order> {
    return unwrap(await apiClient.post<{ data: Order }>('/orders', order));
  }
  async updateStatus(id: string, status: any, remarks?: string): Promise<Order> {
    return unwrap(await apiClient.patch<{ data: Order }>(`/orders/${id}/status`, { status, remarks }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DeliveryStatusHistory
// ─────────────────────────────────────────────────────────────────────────────
export class ApiDeliveryStatusHistoryRepository implements IDeliveryStatusHistoryRepository {
  async getAll(): Promise<DeliveryStatusHistory[]> {
    return unwrap(
      await apiClient.get<{ data: DeliveryStatusHistory[] }>('/delivery-status-histories')
    );
  }
  async getByOrderId(orderId: string): Promise<DeliveryStatusHistory[]> {
    return unwrap(
      await apiClient.get<{ data: DeliveryStatusHistory[] }>(
        `/delivery-status-histories?orderId=${orderId}`
      )
    );
  }
  async create(
    history: Omit<DeliveryStatusHistory, 'id' | 'createdAt'>
  ): Promise<DeliveryStatusHistory> {
    return {
      id: `hist_${Date.now()}`,
      orderId: history.orderId,
      previousStatus: history.previousStatus,
      newStatus: history.newStatus,
      remarks: history.remarks,
      actorUserId: history.actorUserId,
      createdAt: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ActivityLog
// ─────────────────────────────────────────────────────────────────────────────
export class ApiActivityLogRepository implements IActivityLogRepository {
  async getAll(): Promise<ActivityLog[]> {
    return unwrap(await apiClient.get<{ data: ActivityLog[] }>('/activity-logs'));
  }
  async getByUserId(userId: string): Promise<ActivityLog[]> {
    return unwrap(
      await apiClient.get<{ data: ActivityLog[] }>(`/activity-logs?userId=${userId}`)
    );
  }
  async getRecentWithinMonth(userId?: string): Promise<ActivityLog[]> {
    const url = userId
      ? `/activity-logs?recent=true&userId=${userId}`
      : '/activity-logs?recent=true';
    return unwrap(await apiClient.get<{ data: ActivityLog[] }>(url));
  }
  async getByEntity(entityType: string, entityId: string): Promise<ActivityLog[]> {
    const all = await this.getAll();
    return all.filter((l) => l.entityType === entityType && l.entityId === entityId);
  }
  async create(log: ActivityLogWritePayload): Promise<ActivityLog> {
    return unwrap(await apiClient.post<{ data: ActivityLog }>('/activity-logs', log));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Expense
// ─────────────────────────────────────────────────────────────────────────────
export class ApiExpenseRepository implements IExpenseRepository {
  async getAll(params?: { dateStart?: string; dateEnd?: string; categoryId?: string }): Promise<Expense[]> {
    return unwrap(await apiClient.get<{ data: Expense[] }>('/expenses', { params }));
  }
  async getById(id: string): Promise<Expense | null> {
    try {
      return unwrap(await apiClient.get<{ data: Expense }>(`/expenses/${id}`));
    } catch {
      return null;
    }
  }
  async getCategories(): Promise<ExpenseCategory[]> {
    return unwrap(await apiClient.get<{ data: ExpenseCategory[] }>('/expenses/categories'));
  }
  async create(expense: ExpenseWritePayload): Promise<Expense> {
    const payload: ExpenseWritePayload = {
      categoryId: expense.categoryId,
      categoryName: expense.categoryName,
      amount: expense.amount,
      expenseDate: expense.expenseDate,
      remarks: expense.remarks,
      paymentMethod: expense.paymentMethod,
      notes: expense.notes,
      pettyCashRef: expense.pettyCashRef,
    };
    return unwrap(await apiClient.post<{ data: Expense }>('/expenses', payload));
  }
  async createCategory(
    category: Omit<ExpenseCategory, 'id'>
  ): Promise<ExpenseCategory> {
    return unwrap(
      await apiClient.post<{ data: ExpenseCategory }>('/expenses/categories', category)
    );
  }
  async updateCategory(id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    return unwrap(
      await apiClient.patch<{ data: ExpenseCategory }>(`/expenses/categories/${id}`, data)
    );
  }
  async deleteCategory(id: string): Promise<void> {
    await apiClient.delete(`/expenses/categories/${id}`);
  }
  async update(id: string, updates: ExpenseUpdatePayload): Promise<Expense> {
    const payload: ExpenseUpdatePayload = {};
    if (updates.categoryId !== undefined) payload.categoryId = updates.categoryId;
    if (updates.categoryName !== undefined) payload.categoryName = updates.categoryName;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.expenseDate !== undefined) payload.expenseDate = updates.expenseDate;
    if (updates.remarks !== undefined) payload.remarks = updates.remarks;
    if (updates.paymentMethod !== undefined) payload.paymentMethod = updates.paymentMethod;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.pettyCashRef !== undefined) payload.pettyCashRef = updates.pettyCashRef;
    return unwrap(await apiClient.patch<{ data: Expense }>(`/expenses/${id}`, payload));
  }
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/expenses/${id}`);
  }
  async requestChange(id: string, data: { action: 'EDIT' | 'DELETE'; reason: string; [key: string]: any }): Promise<any> {
    return unwrap(await apiClient.post<{ data: any }>(`/expenses/${id}/change-request`, data));
  }
  async getChangeRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<any[]> {
    return unwrap(
      await apiClient.get<{ data: any[] }>('/expenses/change-requests', {
        params: status ? { status } : undefined,
      })
    );
  }
  async reviewChangeRequest(id: string, decision: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<any> {
    return unwrap(
      await apiClient.patch<{ data: any }>(`/expenses/change-requests/${id}/review`, {
        decision,
        rejectionReason,
      })
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EmailNotification
// ─────────────────────────────────────────────────────────────────────────────
export class ApiEmailNotificationRepository implements IEmailNotificationRepository {
  async getAll(): Promise<EmailNotification[]> {
    return unwrap(await apiClient.get<{ data: EmailNotification[] }>('/email-notifications'));
  }
  async getByCustomerId(customerId: string): Promise<EmailNotification[]> {
    return unwrap(
      await apiClient.get<{ data: EmailNotification[] }>(
        `/email-notifications?customerId=${customerId}`
      )
    );
  }
  async getByOrderId(orderId: string): Promise<EmailNotification[]> {
    return unwrap(
      await apiClient.get<{ data: EmailNotification[] }>(
        `/email-notifications?orderId=${orderId}`
      )
    );
  }
  async create(
    data: Omit<EmailNotification, 'id' | 'sentAt'>
  ): Promise<EmailNotification> {
    return unwrap(
      await apiClient.post<{ data: EmailNotification }>('/email-notifications', data)
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Product
// ─────────────────────────────────────────────────────────────────────────────
export class ApiProductRepository implements IProductRepository {
  async getAll(): Promise<Product[]> {
    return unwrap(await apiClient.get<{ data: Product[] }>('/products'));
  }
  async getById(id: string): Promise<Product | null> {
    try {
      return unwrap(await apiClient.get<{ data: Product }>(`/products/${id}`));
    } catch {
      return null;
    }
  }
  async getByTeamId(teamId: string): Promise<Product[]> {
    return unwrap(await apiClient.get<{ data: Product[] }>(`/products?teamId=${teamId}`));
  }
  async create(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    return unwrap(await apiClient.post<{ data: Product }>('/products', product));
  }
  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const payload: any = { ...updates };
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.team;
    delete payload.batches;
    delete payload.priceHistory;
    return unwrap(await apiClient.patch<{ data: Product }>(`/products/${id}`, payload));
  }
  async updateStock(id: string, stockDelta: number): Promise<Product> {
    return unwrap(
      await apiClient.patch<{ data: Product }>(`/products/${id}/stock`, { stockDelta })
    );
  }
  async reportDamage(id: string, quantity: number, reason?: string, batchId?: string): Promise<Product> {
    return unwrap(
      await apiClient.post<{ data: Product }>(`/products/${id}/damage`, { quantity, reason, batchId })
    );
  }
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// StockActivityLog
// ─────────────────────────────────────────────────────────────────────────────
export class ApiStockActivityLogRepository implements IStockActivityLogRepository {
  async getAll(): Promise<StockActivityLog[]> {
    return unwrap(await apiClient.get<{ data: StockActivityLog[] }>('/products/stock-logs'));
  }
  async getByProductId(productId: string): Promise<StockActivityLog[]> {
    return unwrap(
      await apiClient.get<{ data: StockActivityLog[] }>(
        `/products/stock-logs?productId=${productId}`
      )
    );
  }
  async getByTeamId(teamId: string): Promise<StockActivityLog[]> {
    return unwrap(
      await apiClient.get<{ data: StockActivityLog[] }>(
        `/products/stock-logs?teamId=${teamId}`
      )
    );
  }
  async create(log: Omit<StockActivityLog, 'id' | 'createdAt'>): Promise<StockActivityLog> {
    throw new Error('Stock logs are created internally by backend operations');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ApprovalRequest
// ─────────────────────────────────────────────────────────────────────────────
export class ApiApprovalRequestRepository implements IApprovalRequestRepository {
  async getAll(): Promise<ApprovalRequest[]> {
    return unwrap(await apiClient.get<{ data: ApprovalRequest[] }>('/approval-requests'));
  }
  async getById(id: string): Promise<ApprovalRequest | null> {
    try {
      return unwrap(await apiClient.get<{ data: ApprovalRequest }>(`/approval-requests/${id}`));
    } catch {
      return null;
    }
  }
  async getByStatus(status: ApprovalStatus): Promise<ApprovalRequest[]> {
    return unwrap(
      await apiClient.get<{ data: ApprovalRequest[] }>(`/approval-requests?status=${status}`)
    );
  }
  async getByTeamId(teamId: string): Promise<ApprovalRequest[]> {
    return unwrap(
      await apiClient.get<{ data: ApprovalRequest[] }>(`/approval-requests?teamId=${teamId}`)
    );
  }
  async create(request: ApprovalRequestCreatePayload): Promise<ApprovalRequest> {
    const { requestedById: _requestedById, requestedByName: _requestedByName, ...payload } = request;
    return unwrap(
      await apiClient.post<{ data: ApprovalRequest }>('/approval-requests', payload)
    );
  }
  async review(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    _reviewedBy: User,
    rejectionReason?: string
  ): Promise<ApprovalRequest> {
    return unwrap(
      await apiClient.patch<{ data: ApprovalRequest }>(`/approval-requests/${id}/review`, {
        status,
        rejectionReason,
      })
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PettyCash
// ─────────────────────────────────────────────────────────────────────────────
export class ApiPettyCashRepository implements IPettyCashRepository {
  async getWallet(teamId?: string): Promise<PettyCashWallet> {
    const url = teamId ? `/petty-cash/wallet?teamId=${teamId}` : '/petty-cash/wallet';
    return unwrap(await apiClient.get<{ data: PettyCashWallet }>(url));
  }
  async getTransactions(teamId?: string): Promise<PettyCashTransaction[]> {
    const url = teamId
      ? `/petty-cash/transactions?teamId=${teamId}`
      : '/petty-cash/transactions';
    return unwrap(
      await apiClient.get<{ data: PettyCashTransaction[] }>(url)
    );
  }
  async getAllocations(teamId?: string): Promise<any[]> {
    const url = teamId
      ? `/petty-cash/allocations?teamId=${teamId}`
      : '/petty-cash/allocations';
    return unwrap(await apiClient.get<{ data: any[] }>(url));
  }
  async getAllocationById(id: string): Promise<any> {
    return unwrap(await apiClient.get<{ data: any }>(`/petty-cash/allocations/${id}`));
  }
  async allocate(amount: number, reason: string, teamId?: string, remarks?: string, date?: string): Promise<any> {
    return unwrap(
      await apiClient.post<{ data: any }>('/petty-cash/allocate', {
        amount,
        reason,
        remarks,
        teamId,
        date,
      })
    );
  }
  async recordExpense(data: PettyCashExpensePayload): Promise<PettyCashTransaction> {
    return unwrap(
      await apiClient.post<{ data: PettyCashTransaction }>('/petty-cash/expense', {
        ...data,
      })
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sales Targets & Incentives
// ─────────────────────────────────────────────────────────────────────────────
export class ApiSalesTargetRepository implements ISalesTargetRepository {
  async getAll(month?: string, teamId?: string): Promise<TeamSalesTarget[]> {
    const params: Record<string, string> = {};
    if (month) params.month = month;
    if (teamId) params.teamId = teamId;
    return unwrap(
      await apiClient.get<{ data: TeamSalesTarget[] }>('/sales-targets', { params })
    );
  }

  async getById(id: string): Promise<TeamSalesTarget | null> {
    try {
      return unwrap(
        await apiClient.get<{ data: TeamSalesTarget }>(`/sales-targets/${id}`)
      );
    } catch {
      return null;
    }
  }

  async upsert(target: {
    teamId: string;
    month: string;
    targetAmount: number;
    notes?: string;
    tiers: TeamTargetTier[];
  }): Promise<TeamSalesTarget> {
    return unwrap(
      await apiClient.post<{ data: TeamSalesTarget }>('/sales-targets', target)
    );
  }

  async update(id: string, updates: Partial<TeamSalesTarget>): Promise<TeamSalesTarget> {
    return unwrap(
      await apiClient.patch<{ data: TeamSalesTarget }>(`/sales-targets/${id}`, updates)
    );
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/sales-targets/${id}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Finance Analytics
// ─────────────────────────────────────────────────────────────────────────────
import type {
  FinanceDashboardStats,
  IncomeStatementData,
  CashFlowData,
  FinanceFSRData,
  InventoryReportItem,
  ExpenseReportData,
  PettyCashAllocation,
  ExpenseChangeRequest,
  SalesAnalysisMember,
} from '../../models/domain';

export class ApiFinanceRepository implements IFinanceRepository {
  private buildParams(startDate?: string, endDate?: string, extra?: Record<string, string>) {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (extra) Object.assign(params, extra);
    return params;
  }

  async getDashboard(startDate?: string, endDate?: string): Promise<FinanceDashboardStats> {
    return unwrap(
      await apiClient.get<{ data: FinanceDashboardStats }>('/finance/dashboard', {
        params: this.buildParams(startDate, endDate),
      })
    );
  }

  async getIncomeStatement(startDate?: string, endDate?: string): Promise<IncomeStatementData> {
    return unwrap(
      await apiClient.get<{ data: IncomeStatementData }>('/finance/income-statement', {
        params: this.buildParams(startDate, endDate),
      })
    );
  }

  async getCashFlow(startDate?: string, endDate?: string): Promise<CashFlowData> {
    return unwrap(
      await apiClient.get<{ data: CashFlowData }>('/finance/cash-flow', {
        params: this.buildParams(startDate, endDate),
      })
    );
  }

  async getFSR(startDate?: string, endDate?: string): Promise<FinanceFSRData> {
    return unwrap(
      await apiClient.get<{ data: FinanceFSRData }>('/finance/fsr', {
        params: this.buildParams(startDate, endDate),
      })
    );
  }

  async getExpenseReport(startDate?: string, endDate?: string): Promise<ExpenseReportData> {
    return unwrap(
      await apiClient.get<{ data: ExpenseReportData }>('/finance/expense-report', {
        params: this.buildParams(startDate, endDate),
      })
    );
  }

  async getInventoryReport(teamId?: string, startDate?: string, endDate?: string): Promise<InventoryReportItem[]> {
    const params: Record<string, string> = {};
    if (teamId && teamId !== 'ALL') params.teamId = teamId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return unwrap(
      await apiClient.get<{ data: InventoryReportItem[] }>('/finance/inventory-report', { params })
    );
  }

  async getRealizedSalesReport(
    startDate?: string,
    endDate?: string,
    teamId?: string,
  ): Promise<any[]> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (teamId && teamId !== 'ALL') params.teamId = teamId;
    return unwrap(
      await apiClient.get<{ data: any[] }>('/finance/realized-sales', { params })
    );
  }

  async getSalesReport(
    period: 'daily' | 'weekly' | 'monthly',
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    return unwrap(
      await apiClient.get<{ data: any }>('/finance/sales-report', {
        params: this.buildParams(startDate, endDate, { period }),
      })
    );
  }

  async getCityDeliveryReport(startDate?: string, endDate?: string): Promise<any> {
    return unwrap(
      await apiClient.get<{ data: any }>('/finance/delivery-report', {
        params: this.buildParams(startDate, endDate),
      })
    );
  }

  async getSalesAnalysisMembers(): Promise<SalesAnalysisMember[]> {
    return unwrap(
      await apiClient.get<{ data: SalesAnalysisMember[] }>('/finance/sales-analysis/members')
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Supervisor Team Goals & Incentives
// ─────────────────────────────────────────────────────────────────────────────
export class ApiSupervisorTargetRepository implements ISupervisorTargetRepository {
  async getAll(month?: string, supervisorId?: string): Promise<SupervisorSalesTarget[]> {
    const params: Record<string, string> = {};
    if (month) params.month = month;
    if (supervisorId) params.supervisorId = supervisorId;
    return unwrap(
      await apiClient.get<{ data: SupervisorSalesTarget[] }>('/supervisor-targets', { params })
    );
  }

  async getById(id: string): Promise<SupervisorSalesTarget | null> {
    try {
      return unwrap(
        await apiClient.get<{ data: SupervisorSalesTarget }>(`/supervisor-targets/${id}`)
      );
    } catch {
      return null;
    }
  }

  async upsert(target: {
    supervisorId: string;
    month: string;
    targetAmount: number;
    notes?: string;
    tiers: SupervisorTargetTier[];
  }): Promise<SupervisorSalesTarget> {
    return unwrap(
      await apiClient.post<{ data: SupervisorSalesTarget }>('/supervisor-targets', target)
    );
  }

  async update(id: string, updates: Partial<SupervisorSalesTarget>): Promise<SupervisorSalesTarget> {
    return unwrap(
      await apiClient.patch<{ data: SupervisorSalesTarget }>(`/supervisor-targets/${id}`, updates)
    );
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/supervisor-targets/${id}`);
  }
}
