import {
  MockTeamRepository,
  MockUserRepository,
  MockContactRepository,
  MockAllocationRepository,
  MockCallLogRepository,
  MockCustomerRepository,
  MockOrderRepository,
  MockDeliveryStatusHistoryRepository,
  MockActivityLogRepository,
  MockExpenseRepository,
  MockEmailNotificationRepository,
  MockProductRepository,
  MockStockActivityLogRepository,
  MockApprovalRequestRepository,
  MockPettyCashRepository,
} from './mock/mockRepositories';

// Export instantiated repositories.
// When connecting to PostgreSQL API later, simply replace `new MockUserRepository()` with `new ApiUserRepository()`!
export const teamRepository = new MockTeamRepository();
export const userRepository = new MockUserRepository();
export const contactRepository = new MockContactRepository();
export const allocationRepository = new MockAllocationRepository();
export const callLogRepository = new MockCallLogRepository();
export const customerRepository = new MockCustomerRepository();
export const orderRepository = new MockOrderRepository();
export const deliveryStatusHistoryRepository = new MockDeliveryStatusHistoryRepository();
export const activityLogRepository = new MockActivityLogRepository();
export const expenseRepository = new MockExpenseRepository();
export const emailNotificationRepository = new MockEmailNotificationRepository();
export const productRepository = new MockProductRepository();
export const stockActivityLogRepository = new MockStockActivityLogRepository();
export const approvalRequestRepository = new MockApprovalRequestRepository();
export const pettyCashRepository = new MockPettyCashRepository();

