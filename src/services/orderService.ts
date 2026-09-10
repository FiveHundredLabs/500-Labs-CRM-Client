import {
  orderRepository,
  customerRepository,
  contactRepository,
  callLogRepository,
  deliveryStatusHistoryRepository,
  emailNotificationRepository,
  productRepository,
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

  static async createOrder(
    input: CreateOrderInput,
    responsibleMember: User,
    supervisorId: string,
    teamId: string
  ): Promise<Order> {
    const newOrder = await orderRepository.create({
      customerId: input.customerId,
      teamId,
      teamMemberId: responsibleMember.id,
      supervisorId,
      status: 'DRAFT',
      itemsDescription: input.itemsDescription,
      totalAmount: input.totalAmount,
      currency: input.currency || 'LKR',
      remarks: input.remarks,
    });

    // Save DeliveryStatusHistory for Initial Creation
    await deliveryStatusHistoryRepository.create({
      orderId: newOrder.id,
      previousStatus: null,
      newStatus: 'DRAFT',
      remarks: 'Order placed by tele-calling specialist',
      actorUserId: responsibleMember.id,
    });

    // Log ActivityLog
    await ActivityLogService.logAction({
      userId: responsibleMember.id,
      userRole: responsibleMember.role,
      userName: responsibleMember.fullName,
      teamId,
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: newOrder.id,
      description: `Created Order #${newOrder.orderNumber} for customer (${input.totalAmount} LKR)`,
    });

    return newOrder;
  }

  static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    actor: User,
    remarks?: string,
    damagedItems?: { productId?: string; productName: string; quantity: number; reason?: string }[]
  ): Promise<Order> {
    const order = await orderRepository.getById(orderId);
    if (!order) throw new Error('Order not found');

    const previousStatus = order.status;
    if (previousStatus === newStatus && (!damagedItems || damagedItems.length === 0)) return order;

    const damagedProductIds = damagedItems
      ?.filter((item) => item.productId)
      .map((item) => item.productId as string);

    const updatedOrder = await orderRepository.updateStatus(orderId, newStatus, remarks, damagedProductIds, damagedItems);

    // Save DeliveryStatusHistory
    await deliveryStatusHistoryRepository.create({
      orderId,
      previousStatus,
      newStatus,
      remarks: remarks || `Status changed to ${newStatus}`,
      actorUserId: actor.id,
    });

    // Synchronize Contact and CallLog statuses for the team member view
    try {
      const customer = await customerRepository.getById(order.customerId);
      const contactStatusMap: Partial<Record<OrderStatus, any>> = {
        PREPARED: 'INTERESTED',
        DELIVERED: 'DELIVERED',
        REJECTED: 'REJECTED',
        CANCELLED: 'CANCELLED',
        DISPATCHED: 'DISPATCHED',
      };
      const newContactStatus = contactStatusMap[newStatus];
      if (customer && newContactStatus) {
        if (customer.contactId) {
          await contactRepository.update(customer.contactId, { status: newContactStatus });
        }
      }
    } catch {
      // Non-fatal sync
    }

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

    // Email notification disabled for now

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
    actor: User,
    damagedItems?: { orderId?: string; productId?: string; productName: string; quantity: number; reason?: string }[]
  ): Promise<number> {
    let count = 0;
    for (const orderId of orderIds) {
      const orderSpecificDamaged = damagedItems
        ? damagedItems.filter((d) => !d.orderId || d.orderId === orderId)
        : undefined;
      await this.updateOrderStatus(
        orderId,
        newStatus,
        actor,
        undefined,
        orderSpecificDamaged && orderSpecificDamaged.length > 0 ? orderSpecificDamaged : undefined
      );
      count++;
    }
    return count;
  }

  static async getOrderHistory(orderId: string) {
    return deliveryStatusHistoryRepository.getByOrderId(orderId);
  }

  static async updateDeliveryCharge(
    orderId: string,
    codCharge: number,
    remarks?: string
  ): Promise<Order> {
    return orderRepository.updateDeliveryCharge(orderId, codCharge, remarks);
  }
}
