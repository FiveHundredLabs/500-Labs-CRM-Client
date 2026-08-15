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

/**
 * ApiUserRepository Stub
 * Replace MockRepository with these classes once PostgreSQL backend REST/GraphQL API is live.
 */
export class ApiUserRepository implements IUserRepository {
  async getAll(): Promise<User[]> {
    throw new Error('API Repository not connected yet. Use MockUserRepository.');
  }
  async getById(_id: string): Promise<User | null> {
    throw new Error('API Repository not connected yet. Use MockUserRepository.');
  }
  async getByEmail(_email: string): Promise<User | null> {
    throw new Error('API Repository not connected yet. Use MockUserRepository.');
  }
  async getByRole(_role: UserRole): Promise<User[]> {
    throw new Error('API Repository not connected yet. Use MockUserRepository.');
  }
  async getByTeamId(_teamId: string): Promise<User[]> {
    throw new Error('API Repository not connected yet. Use MockUserRepository.');
  }
  async getBySupervisorId(_supervisorId: string): Promise<User[]> {
    throw new Error('API Repository not connected yet. Use MockUserRepository.');
  }
  async create(_userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    throw new Error('API Repository not connected yet. Use MockUserRepository.');
  }
  async update(_id: string, _updates: Partial<User>): Promise<User> {
    throw new Error('API Repository not connected yet. Use MockUserRepository.');
  }
  async disable(_id: string): Promise<void> {
    throw new Error('API Repository not connected yet. Use MockUserRepository.');
  }
}
