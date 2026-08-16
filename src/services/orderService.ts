import {
  orderRepository,
  customerRepository,
  deliveryStatusHistoryRepository,
  emailNotificationRepository,
} from '../repositories';
import { Order, OrderStatus, User } from '../models/domain';
import { ActivityLogService } from './activityLogService';

export interface CreateOrderInput {
  customerId: string;
  itemsDescription: string;
  totalAmount: number;
  currency?: string;
  remarks?: string;
}

export class OrderService {
  static async getAllOrders(): Promise<Order[]> {
    return orderRepository.getAll();
  }

  static async getOrderById(id: string): Promise<Order | null> {
    return orderRepository.getById(id);
  }

  static async getOrdersByTeam(teamId: string): Promise<Order[]> {
    return orderRepository.getByTeamId(teamId);
  }

  static async getOrdersBySupervisor(supervisorId: string): Promise<Order[]> {
    return orderRepository.getBySupervisorId(supervisorId);
  }

  static async getOrdersByMember(memberId: string): Promise<Order[]> {
    return orderRepository.getByMemberId(memberId);
  }

  static async createOrder(input: CreateOrderInput, actor: User): Promise<Order> {
    const customer = await customerRepository.getById(input.customerId);
    if (!customer) throw new Error('Customer not found');

    const count = (await orderRepository.getAll()).length + 1;
    const orderNumber = `ORD-2026-${String(count).padStart(3, '0')}`;

    const newOrder = await orderRepository.create({
      orderNumber,
      customerId: input.customerId,
      teamId: customer.teamId,
      teamMemberId: customer.responsibleTeamMemberId,
      supervisorId: customer.supervisorId,
      status: 'DRAFT',
      itemsDescription: input.itemsDescription,
      totalAmount: input.totalAmount,
      currency: input.currency || 'LKR',
      remarks: input.remarks,
    });

    // Create initial history record
    await deliveryStatusHistoryRepository.create({
      orderId: newOrder.id,
      previousStatus: null,
      newStatus: 'DRAFT',
      remarks: 'Order created as Draft.',
      actorUserId: actor.id,
    });

    // Log activity
    await ActivityLogService.logAction({
      userId: actor.id,
      userRole: actor.role,
      userName: actor.fullName,
      teamId: customer.teamId,
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: newOrder.id,
      description: `Created Order #${orderNumber} for customer ${customer.fullName} (LKR ${input.totalAmount})`,
    });

    return newOrder;
  }

  static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    actor: User,
    remarks?: string
  ): Promise<Order> {
    const order = await orderRepository.getById(orderId);
    if (!order) throw new Error('Order not found');

    const previousStatus = order.status;
    if (previousStatus === newStatus) return order;

    const updatedOrder = await orderRepository.updateStatus(orderId, newStatus, remarks);

    // Save DeliveryStatusHistory
    await deliveryStatusHistoryRepository.create({
      orderId,
      previousStatus,
      newStatus,
      remarks: remarks || `Status changed to ${newStatus}`,
      actorUserId: actor.id,
    });

    // Log ActivityLog
    const actionType =
      newStatus === 'PREPARED'
        ? 'ORDER_PREPARED'
        : newStatus === 'DISPATCHED'
        ? 'ORDER_DISPATCHED'
        : 'DELIVERY_STATUS_CHANGED';

    await ActivityLogService.logAction({
      userId: actor.id,
      userRole: actor.role,
      userName: actor.fullName,
      teamId: order.teamId,
      action: actionType,
      entityType: 'Order',
      entityId: order.id,
      description: `Updated Order #${order.orderNumber} status from ${previousStatus} to ${newStatus}`,
    });

    // Simulate Email Delivery Confirmation when DELIVERED
    if (newStatus === 'DELIVERED') {
      const customer = await customerRepository.getById(order.customerId);
      if (customer && customer.email && customer.email.trim() !== '') {
        const emailRecord = await emailNotificationRepository.create({
          orderId: order.id,
          customerId: customer.id,
          recipientEmail: customer.email,
          notificationType: 'DELIVERY_CONFIRMATION',
          status: 'SENT',
        });

        await ActivityLogService.logAction({
          userId: actor.id,
          userRole: actor.role,
          userName: actor.fullName,
          teamId: order.teamId,
          action: 'EMAIL_NOTIFICATION_SENT',
          entityType: 'Email',
          entityId: emailRecord.id,
          description: `Delivery Confirmation email notification simulated -> ${customer.email}`,
        });
      } else {
        const emailRecord = await emailNotificationRepository.create({
          orderId: order.id,
          customerId: customer ? customer.id : order.customerId,
          recipientEmail: null,
          notificationType: 'DELIVERY_CONFIRMATION',
          status: 'SKIPPED',
          reason: 'Customer email address was unavailable.',
        });

        await ActivityLogService.logAction({
          userId: actor.id,
          userRole: actor.role,
          userName: actor.fullName,
          teamId: order.teamId,
          action: 'EMAIL_NOTIFICATION_SENT',
          entityType: 'Email',
          entityId: emailRecord.id,
          description: `Delivery Confirmation email skipped: No customer email address.`,
        });
      }
    }

    return updatedOrder;
  }

  static async updateOrderRemark(
    orderId: string,
    remarks: string,
    actor: User
  ): Promise<Order> {
    const order = await orderRepository.getById(orderId);
    if (!order) throw new Error('Order not found');

    const updatedOrder = await orderRepository.updateStatus(orderId, order.status, remarks);

    await deliveryStatusHistoryRepository.create({
      orderId,
      previousStatus: order.status,
      newStatus: order.status,
      remarks: `Remark updated: ${remarks}`,
      actorUserId: actor.id,
    });

    await ActivityLogService.logAction({
      userId: actor.id,
      userRole: actor.role,
      userName: actor.fullName,
      teamId: order.teamId,
      action: 'DELIVERY_STATUS_CHANGED',
      entityType: 'Order',
      entityId: order.id,
      description: `Updated remark for Order #${order.orderNumber}`,
    });

    return updatedOrder;
  }

  static async bulkUpdateOrderStatus(
    orderIds: string[],
    newStatus: OrderStatus,
    actor: User
  ): Promise<number> {
    let count = 0;
    for (const orderId of orderIds) {
      await this.updateOrderStatus(orderId, newStatus, actor);
      count++;
    }
    return count;
  }

  static async getOrderHistory(orderId: string) {
    return deliveryStatusHistoryRepository.getByOrderId(orderId);
  }
}
