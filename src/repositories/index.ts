import {
  ApiTeamRepository,
  ApiUserRepository,
  ApiContactRepository,
  ApiAllocationRepository,
  ApiCallLogRepository,
  ApiCustomerRepository,
  ApiOrderRepository,
  ApiDeliveryStatusHistoryRepository,
  ApiActivityLogRepository,
  ApiExpenseRepository,
  ApiEmailNotificationRepository,
  ApiProductRepository,
  ApiStockActivityLogRepository,
  ApiApprovalRequestRepository,
  ApiPettyCashRepository,
  ApiSalesTargetRepository,
} from './api/apiRepositories';

// All repositories now point to the real NestJS backend API.
// To temporarily switch back to mock data, replace ApiXxxRepository with MockXxxRepository
// and import from './mock/mockRepositories' instead.
export const teamRepository = new ApiTeamRepository();
export const userRepository = new ApiUserRepository();
export const contactRepository = new ApiContactRepository();
export const allocationRepository = new ApiAllocationRepository();
export const callLogRepository = new ApiCallLogRepository();
export const customerRepository = new ApiCustomerRepository();
export const orderRepository = new ApiOrderRepository();
export const deliveryStatusHistoryRepository = new ApiDeliveryStatusHistoryRepository();
export const activityLogRepository = new ApiActivityLogRepository();
export const expenseRepository = new ApiExpenseRepository();
export const emailNotificationRepository = new ApiEmailNotificationRepository();
export const productRepository = new ApiProductRepository();
export const stockActivityLogRepository = new ApiStockActivityLogRepository();
export const approvalRequestRepository = new ApiApprovalRequestRepository();
export const pettyCashRepository = new ApiPettyCashRepository();
export const salesTargetRepository = new ApiSalesTargetRepository();
