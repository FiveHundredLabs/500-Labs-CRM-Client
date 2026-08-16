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
  OrderStatus,
} from '../../models/domain';
import { STORAGE_KEYS, getStoredItem, setStoredItem, delay } from './mockStore';

export class MockTeamRepository implements ITeamRepository {
  async getAll(): Promise<Team[]> {
    await delay();
    return getStoredItem<Team>(STORAGE_KEYS.TEAMS, []);
  }

  async getById(id: string): Promise<Team | null> {
    await delay();
    const teams = getStoredItem<Team>(STORAGE_KEYS.TEAMS, []);
    return teams.find((t) => t.id === id) || null;
  }
}

export class MockUserRepository implements IUserRepository {
  async getAll(): Promise<User[]> {
    await delay();
    return getStoredItem<User>(STORAGE_KEYS.USERS, []);
  }

  async getById(id: string): Promise<User | null> {
    await delay();
    const users = getStoredItem<User>(STORAGE_KEYS.USERS, []);
    return users.find((u) => u.id === id) || null;
  }

  async getByEmail(email: string): Promise<User | null> {
    await delay();
    const users = getStoredItem<User>(STORAGE_KEYS.USERS, []);
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase()) || null;
  }

  async getByRole(role: UserRole): Promise<User[]> {
    await delay();
    const users = getStoredItem<User>(STORAGE_KEYS.USERS, []);
    return users.filter((u) => u.role === role);
  }

  async getByTeamId(teamId: string): Promise<User[]> {
    await delay();
    const users = getStoredItem<User>(STORAGE_KEYS.USERS, []);
    return users.filter((u) => u.teamId === teamId);
  }

  async getBySupervisorId(supervisorId: string): Promise<User[]> {
    await delay();
    const users = getStoredItem<User>(STORAGE_KEYS.USERS, []);
    return users.filter((u) => u.supervisorId === supervisorId);
  }

  async create(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    await delay();
    const users = getStoredItem<User>(STORAGE_KEYS.USERS, []);
    const newUser: User = {
      ...userData,
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    setStoredItem(STORAGE_KEYS.USERS, users);
    return newUser;
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    await delay();
    const users = getStoredItem<User>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('User not found');
    const updated = { ...users[index], ...updates };
    users[index] = updated;
    setStoredItem(STORAGE_KEYS.USERS, users);

    const rawCurr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (rawCurr) {
      try {
        const parsed = JSON.parse(rawCurr);
        if (parsed && parsed.id === id) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
        }
      } catch (e) {}
    }

    return updated;
  }

  async disable(id: string): Promise<void> {
    await delay();
    const users = getStoredItem<User>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex((u) => u.id === id);
    if (index !== -1) {
      users[index].isActive = false;
      setStoredItem(STORAGE_KEYS.USERS, users);
    }
  }
}

export class MockContactRepository implements IContactRepository {
  async getAll(): Promise<Contact[]> {
    await delay();
    return getStoredItem<Contact>(STORAGE_KEYS.CONTACTS, []);
  }

  async getById(id: string): Promise<Contact | null> {
    await delay();
    const contacts = getStoredItem<Contact>(STORAGE_KEYS.CONTACTS, []);
    return contacts.find((c) => c.id === id) || null;
  }

  async getByTeamId(teamId: string): Promise<Contact[]> {
    await delay();
    const contacts = getStoredItem<Contact>(STORAGE_KEYS.CONTACTS, []);
    return contacts.filter((c) => c.teamId === teamId);
  }

  async getByMemberId(memberId: string): Promise<Contact[]> {
    await delay();
    const contacts = getStoredItem<Contact>(STORAGE_KEYS.CONTACTS, []);
    return contacts.filter((c) => c.allocatedToId === memberId);
  }

  async getByPhone(phone: string): Promise<Contact | null> {
    await delay();
    const contacts = getStoredItem<Contact>(STORAGE_KEYS.CONTACTS, []);
    return contacts.find((c) => c.phone.trim() === phone.trim()) || null;
  }

  async create(contactData: Omit<Contact, 'id' | 'updatedAt'>): Promise<Contact> {
    await delay();
    const contacts = getStoredItem<Contact>(STORAGE_KEYS.CONTACTS, []);
    const now = new Date().toISOString();
    const newContact: Contact = {
      ...contactData,
      id: `cnt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      updatedAt: now,
    };
    contacts.push(newContact);
    setStoredItem(STORAGE_KEYS.CONTACTS, contacts);
    return newContact;
  }

  async createMany(contactsData: Array<Omit<Contact, 'id' | 'updatedAt'>>): Promise<Contact[]> {
    await delay();
    const contacts = getStoredItem<Contact>(STORAGE_KEYS.CONTACTS, []);
    const now = new Date().toISOString();
    const created: Contact[] = contactsData.map((cd, index) => ({
      ...cd,
      id: `cnt_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`,
      updatedAt: now,
    }));
    contacts.push(...created);
    setStoredItem(STORAGE_KEYS.CONTACTS, contacts);
    return created;
  }

  async update(id: string, updates: Partial<Contact>): Promise<Contact> {
    await delay();
    const contacts = getStoredItem<Contact>(STORAGE_KEYS.CONTACTS, []);
    const index = contacts.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Contact not found');
    const updated = { ...contacts[index], ...updates, updatedAt: new Date().toISOString() };
    contacts[index] = updated;
    setStoredItem(STORAGE_KEYS.CONTACTS, contacts);
    return updated;
  }

  async updateManyStatus(ids: string[], status: ContactStatus): Promise<void> {
    await delay();
    const contacts = getStoredItem<Contact>(STORAGE_KEYS.CONTACTS, []);
    const now = new Date().toISOString();
    let changed = false;
    contacts.forEach((c) => {
      if (ids.includes(c.id)) {
        c.status = status;
        c.updatedAt = now;
        changed = true;
      }
    });
    if (changed) setStoredItem(STORAGE_KEYS.CONTACTS, contacts);
  }
}

export class MockAllocationRepository implements IAllocationRepository {
  async getAll(): Promise<ContactAllocation[]> {
    await delay();
    return getStoredItem<ContactAllocation>(STORAGE_KEYS.ALLOCATIONS, []);
  }

  async getByBatchId(batchId: string): Promise<ContactAllocation[]> {
    await delay();
    const allocations = getStoredItem<ContactAllocation>(STORAGE_KEYS.ALLOCATIONS, []);
    return allocations.filter((a) => a.allocationBatchId === batchId);
  }

  async getByMemberId(memberId: string): Promise<ContactAllocation[]> {
    await delay();
    const allocations = getStoredItem<ContactAllocation>(STORAGE_KEYS.ALLOCATIONS, []);
    return allocations.filter((a) => a.teamMemberId === memberId);
  }

  async createMany(allocationsData: Array<Omit<ContactAllocation, 'id'>>): Promise<ContactAllocation[]> {
    await delay();
    const allocations = getStoredItem<ContactAllocation>(STORAGE_KEYS.ALLOCATIONS, []);
    const created: ContactAllocation[] = allocationsData.map((ad, idx) => ({
      ...ad,
      id: `alc_${Date.now()}_${idx}`,
    }));
    allocations.push(...created);
    setStoredItem(STORAGE_KEYS.ALLOCATIONS, allocations);
    return created;
  }
}

export class MockCallLogRepository implements ICallLogRepository {
  async getAll(): Promise<CallLog[]> {
    await delay();
    return getStoredItem<CallLog>(STORAGE_KEYS.CALL_LOGS, []);
  }

  async getByContactId(contactId: string): Promise<CallLog[]> {
    await delay();
    const logs = getStoredItem<CallLog>(STORAGE_KEYS.CALL_LOGS, []);
    return logs.filter((l) => l.contactId === contactId);
  }

  async getByMemberId(memberId: string): Promise<CallLog[]> {
    await delay();
    const logs = getStoredItem<CallLog>(STORAGE_KEYS.CALL_LOGS, []);
    return logs.filter((l) => l.teamMemberId === memberId);
  }

  async getByTeamId(teamId: string): Promise<CallLog[]> {
    await delay();
    const logs = getStoredItem<CallLog>(STORAGE_KEYS.CALL_LOGS, []);
    return logs.filter((l) => l.teamId === teamId);
  }

  async create(logData: Omit<CallLog, 'id'>): Promise<CallLog> {
    await delay();
    const logs = getStoredItem<CallLog>(STORAGE_KEYS.CALL_LOGS, []);
    const newLog: CallLog = {
      ...logData,
      id: `cll_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };
    logs.push(newLog);
    setStoredItem(STORAGE_KEYS.CALL_LOGS, logs);
    return newLog;
  }

  async update(id: string, updates: Partial<CallLog>): Promise<CallLog> {
    await delay();
    const logs = getStoredItem<CallLog>(STORAGE_KEYS.CALL_LOGS, []);
    const idx = logs.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Call log not found');
    const updated = { ...logs[idx], ...updates };
    logs[idx] = updated;
    setStoredItem(STORAGE_KEYS.CALL_LOGS, logs);
    return updated;
  }
}

export class MockCustomerRepository implements ICustomerRepository {
  async getAll(): Promise<Customer[]> {
    await delay();
    return getStoredItem<Customer>(STORAGE_KEYS.CUSTOMERS, []);
  }

  async getById(id: string): Promise<Customer | null> {
    await delay();
    const customers = getStoredItem<Customer>(STORAGE_KEYS.CUSTOMERS, []);
    return customers.find((c) => c.id === id) || null;
  }

  async getByContactId(contactId: string): Promise<Customer | null> {
    await delay();
    const customers = getStoredItem<Customer>(STORAGE_KEYS.CUSTOMERS, []);
    return customers.find((c) => c.contactId === contactId) || null;
  }

  async getByTeamId(teamId: string): Promise<Customer[]> {
    await delay();
    const customers = getStoredItem<Customer>(STORAGE_KEYS.CUSTOMERS, []);
    return customers.filter((c) => c.teamId === teamId);
  }

  async getBySupervisorId(supervisorId: string): Promise<Customer[]> {
    await delay();
    const customers = getStoredItem<Customer>(STORAGE_KEYS.CUSTOMERS, []);
    return customers.filter((c) => c.supervisorId === supervisorId);
  }

  async getByMemberId(memberId: string): Promise<Customer[]> {
    await delay();
    const customers = getStoredItem<Customer>(STORAGE_KEYS.CUSTOMERS, []);
    return customers.filter((c) => c.responsibleTeamMemberId === memberId);
  }

  async create(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    await delay();
    const customers = getStoredItem<Customer>(STORAGE_KEYS.CUSTOMERS, []);
    const now = new Date().toISOString();
    const newCustomer: Customer = {
      ...customerData,
      id: `cst_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
    };
    customers.push(newCustomer);
    setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
    return newCustomer;
  }

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    await delay();
    const customers = getStoredItem<Customer>(STORAGE_KEYS.CUSTOMERS, []);
    const idx = customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Customer not found');
    const updated = { ...customers[idx], ...updates, updatedAt: new Date().toISOString() };
    customers[idx] = updated;
    setStoredItem(STORAGE_KEYS.CUSTOMERS, customers);
    return updated;
  }
}

export class MockOrderRepository implements IOrderRepository {
  async getAll(): Promise<Order[]> {
    await delay();
    return getStoredItem<Order>(STORAGE_KEYS.ORDERS, []);
  }

  async getById(id: string): Promise<Order | null> {
    await delay();
    const orders = getStoredItem<Order>(STORAGE_KEYS.ORDERS, []);
    return orders.find((o) => o.id === id) || null;
  }

  async getByCustomerId(customerId: string): Promise<Order[]> {
    await delay();
    const orders = getStoredItem<Order>(STORAGE_KEYS.ORDERS, []);
    return orders.filter((o) => o.customerId === customerId);
  }

  async getByTeamId(teamId: string): Promise<Order[]> {
    await delay();
    const orders = getStoredItem<Order>(STORAGE_KEYS.ORDERS, []);
    return orders.filter((o) => o.teamId === teamId);
  }

  async getBySupervisorId(supervisorId: string): Promise<Order[]> {
    await delay();
    const orders = getStoredItem<Order>(STORAGE_KEYS.ORDERS, []);
    return orders.filter((o) => o.supervisorId === supervisorId);
  }

  async getByMemberId(memberId: string): Promise<Order[]> {
    await delay();
    const orders = getStoredItem<Order>(STORAGE_KEYS.ORDERS, []);
    return orders.filter((o) => o.teamMemberId === memberId);
  }

  async create(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    await delay();
    const orders = getStoredItem<Order>(STORAGE_KEYS.ORDERS, []);
    const now = new Date().toISOString();
    const newOrder: Order = {
      ...orderData,
      id: `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
    };
    orders.push(newOrder);
    setStoredItem(STORAGE_KEYS.ORDERS, orders);
    return newOrder;
  }

  async updateStatus(id: string, status: OrderStatus, remarks?: string): Promise<Order> {
    await delay();
    const orders = getStoredItem<Order>(STORAGE_KEYS.ORDERS, []);
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Order not found');
    const updated = {
      ...orders[idx],
      status,
      remarks: remarks !== undefined ? remarks : orders[idx].remarks,
      updatedAt: new Date().toISOString(),
    };
    orders[idx] = updated;
    setStoredItem(STORAGE_KEYS.ORDERS, orders);
    return updated;
  }
}

export class MockDeliveryStatusHistoryRepository implements IDeliveryStatusHistoryRepository {
  async getAll(): Promise<DeliveryStatusHistory[]> {
    await delay();
    return getStoredItem<DeliveryStatusHistory>(STORAGE_KEYS.DELIVERY_HISTORIES, []);
  }

  async getByOrderId(orderId: string): Promise<DeliveryStatusHistory[]> {
    await delay();
    const histories = getStoredItem<DeliveryStatusHistory>(STORAGE_KEYS.DELIVERY_HISTORIES, []);
    return histories.filter((h) => h.orderId === orderId);
  }

  async create(historyData: Omit<DeliveryStatusHistory, 'id' | 'createdAt'>): Promise<DeliveryStatusHistory> {
    await delay();
    const histories = getStoredItem<DeliveryStatusHistory>(STORAGE_KEYS.DELIVERY_HISTORIES, []);
    const newHistory: DeliveryStatusHistory = {
      ...historyData,
      id: `dsh_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    histories.push(newHistory);
    setStoredItem(STORAGE_KEYS.DELIVERY_HISTORIES, histories);
    return newHistory;
  }
}

export class MockActivityLogRepository implements IActivityLogRepository {
  async getAll(): Promise<ActivityLog[]> {
    await delay();
    const logs = getStoredItem<ActivityLog>(STORAGE_KEYS.ACTIVITY_LOGS, []);
    return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getByUserId(userId: string): Promise<ActivityLog[]> {
    await delay();
    const logs = getStoredItem<ActivityLog>(STORAGE_KEYS.ACTIVITY_LOGS, []);
    return logs.filter((l) => l.userId === userId);
  }

  async getByEntity(entityType: string, entityId: string): Promise<ActivityLog[]> {
    await delay();
    const logs = getStoredItem<ActivityLog>(STORAGE_KEYS.ACTIVITY_LOGS, []);
    return logs.filter((l) => l.entityType === entityType && l.entityId === entityId);
  }

  async create(logData: Omit<ActivityLog, 'id' | 'createdAt'>): Promise<ActivityLog> {
    await delay();
    const logs = getStoredItem<ActivityLog>(STORAGE_KEYS.ACTIVITY_LOGS, []);
    const newLog: ActivityLog = {
      ...logData,
      id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    logs.push(newLog);
    setStoredItem(STORAGE_KEYS.ACTIVITY_LOGS, logs);
    return newLog;
  }
}

export class MockExpenseRepository implements IExpenseRepository {
  async getAll(): Promise<Expense[]> {
    await delay();
    return getStoredItem<Expense>(STORAGE_KEYS.EXPENSES, []);
  }

  async getCategories(): Promise<ExpenseCategory[]> {
    await delay();
    return getStoredItem<ExpenseCategory>(STORAGE_KEYS.EXPENSE_CATEGORIES, []);
  }

  async create(expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    await delay();
    const expenses = getStoredItem<Expense>(STORAGE_KEYS.EXPENSES, []);
    const newExpense: Expense = {
      ...expenseData,
      id: `exp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    expenses.push(newExpense);
    setStoredItem(STORAGE_KEYS.EXPENSES, expenses);
    return newExpense;
  }

  async createCategory(categoryData: Omit<ExpenseCategory, 'id'>): Promise<ExpenseCategory> {
    await delay();
    const categories = getStoredItem<ExpenseCategory>(STORAGE_KEYS.EXPENSE_CATEGORIES, []);
    const newCategory: ExpenseCategory = {
      ...categoryData,
      id: `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };
    categories.push(newCategory);
    setStoredItem(STORAGE_KEYS.EXPENSE_CATEGORIES, categories);
    return newCategory;
  }
}

export class MockEmailNotificationRepository implements IEmailNotificationRepository {
  async getAll(): Promise<EmailNotification[]> {
    await delay();
    return getStoredItem<EmailNotification>(STORAGE_KEYS.EMAIL_NOTIFICATIONS, []);
  }

  async getByCustomerId(customerId: string): Promise<EmailNotification[]> {
    await delay();
    const list = getStoredItem<EmailNotification>(STORAGE_KEYS.EMAIL_NOTIFICATIONS, []);
    return list.filter((e) => e.customerId === customerId);
  }

  async getByOrderId(orderId: string): Promise<EmailNotification[]> {
    await delay();
    const list = getStoredItem<EmailNotification>(STORAGE_KEYS.EMAIL_NOTIFICATIONS, []);
    return list.filter((e) => e.orderId === orderId);
  }

  async create(data: Omit<EmailNotification, 'id' | 'sentAt'>): Promise<EmailNotification> {
    await delay();
    const list = getStoredItem<EmailNotification>(STORAGE_KEYS.EMAIL_NOTIFICATIONS, []);
    const newRecord: EmailNotification = {
      ...data,
      id: `eml_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sentAt: new Date().toISOString(),
    };
    list.push(newRecord);
    setStoredItem(STORAGE_KEYS.EMAIL_NOTIFICATIONS, list);
    return newRecord;
  }
}
