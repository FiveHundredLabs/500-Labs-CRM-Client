import {
  customerRepository,
  contactRepository,
  orderRepository,
  deliveryStatusHistoryRepository,
} from '../repositories';
import { User, Order } from '../models/domain';
import { ActivityLogService } from './activityLogService';
import { OrderService } from './orderService';

export class LeadService {
  /**
   * Transition selected Interested Leads to DISPATCHED status.
   * Updates contact status, creates/updates order to DISPATCHED, and logs activities.
   */
  static async dispatchInterestedLeads(customerIds: string[], actor: User): Promise<number> {
    let count = 0;

    for (const customerId of customerIds) {
      const customer = await customerRepository.getById(customerId);
      if (!customer) continue;

      // 1. Check existing order or create new order with status DISPATCHED
      const existingOrders = await orderRepository.getByCustomerId(customerId);
      if (existingOrders.length > 0) {
        const sorted = [...existingOrders].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const targetOrder = sorted.find((o) => o.status === 'PREPARED') || sorted[0];
        if (targetOrder.status !== 'DISPATCHED' && targetOrder.status !== 'DELIVERED') {
          await OrderService.updateOrderStatus(targetOrder.id, 'DISPATCHED', actor, 'Dispatched via Interested Leads billing print');
        }
      } else {
        const allOrders = await orderRepository.getAll();
        const orderNumber = `ORD-2026-${String(allOrders.length + 1).padStart(3, '0')}`;
        await orderRepository.create({
          orderNumber,
          customerId: customer.id,
          teamId: customer.teamId,
          teamMemberId: customer.responsibleTeamMemberId,
          supervisorId: customer.supervisorId,
          status: 'DISPATCHED',
          itemsDescription: 'Interested Lead Standard Package x1',
          totalAmount: 5990.00,
          currency: 'LKR',
          remarks: 'Auto-generated order upon Interested Lead billing dispatch',
        });
        if (customer.contactId) {
          await contactRepository.update(customer.contactId, { status: 'DISPATCHED' });
        }
      }

      // 3. Log Activity
      await ActivityLogService.logAction({
        userId: actor.id,
        userRole: actor.role,
        userName: actor.fullName,
        teamId: customer.teamId,
        action: 'ORDER_DISPATCHED',
        entityType: 'Customer',
        entityId: customer.id,
        description: `Dispatched billing slip for ${customer.fullName} (${customer.phone})`,
      });

      count++;
    }

    return count;
  }

  /**
   * Cancel an Interested Lead and any associated orders (or a specific duplicate order).
   */
  static async cancelInterestedLead(
    customerId: string,
    reason: string,
    actor: User,
    specificOrderId?: string
  ): Promise<boolean> {
    const customer = await customerRepository.getById(customerId);
    if (!customer) return false;

    // 1. If specificOrderId is given, cancel only that order
    if (specificOrderId) {
      await OrderService.updateOrderStatus(
        specificOrderId,
        'CANCELLED',
        actor,
        reason || 'Cancelled duplicate order by supervisor'
      );
    } else {
      // Update any existing active Orders for this customer to CANCELLED
      const existingOrders = await orderRepository.getByCustomerId(customerId);
      let orderCancelled = false;
      for (const ord of existingOrders) {
        if (['DRAFT', 'PREPARED', 'DISPATCHED'].includes(ord.status)) {
          await OrderService.updateOrderStatus(
            ord.id,
            'CANCELLED',
            actor,
            reason || 'Cancelled duplicate/unwanted lead by supervisor'
          );
          orderCancelled = true;
        }
      }

      // 2. If no active orders were cancelled, update contact directly
      if (!orderCancelled && customer.contactId) {
        await contactRepository.update(customer.contactId, { status: 'CANCELLED' });
      }
    }

    // 3. Log Activity
    await ActivityLogService.logAction({
      userId: actor.id,
      userRole: actor.role,
      userName: actor.fullName,
      teamId: customer.teamId,
      action: 'ORDER_CANCELLED',
      entityType: 'Customer',
      entityId: customer.id,
      description: `Supervisor cancelled interested lead/order for ${customer.fullName} (${customer.phone}): ${reason || 'Duplicate review'}`,
    });

    return true;
  }

  /**
   * Find an editable interested lead order for a contact.
   * Returns the order only if:
   * - order.teamMemberId === memberId
   * - order.status === 'PREPARED'
   * - Matches contactId or phone
   */
  static async getEditableInterestedOrder(
    contactId: string,
    memberId: string,
    phone?: string
  ): Promise<Order | null> {
    try {
      const orders = await orderRepository.getAll();
      const match = orders.find((o) => {
        const isMember = o.teamMemberId === memberId;
        const isPrepared = o.status === 'PREPARED';
        const isContactMatch =
          o.customer?.contactId === contactId ||
          o.customer?.contact?.id === contactId ||
          (phone && o.customer?.phone === phone);
        return isMember && isPrepared && isContactMatch;
      });
      return match || null;
    } catch (err) {
      console.error('Failed to get editable interested order:', err);
      return null;
    }
  }

  /**
   * Find a rejected order to reactivate for a contact.
   * Returns the order only if:
   * - order.teamMemberId === memberId
   * - order.status === 'REJECTED'
   * - Matches contactId or phone
   */
  static async getRejectedOrderForReactivation(
    contactId: string,
    memberId: string,
    phone?: string
  ): Promise<Order | null> {
    try {
      const orders = await orderRepository.getAll();
      const match = orders.find((o) => {
        const isMember = o.teamMemberId === memberId;
        const isRejected = o.status === 'REJECTED';
        const isContactMatch =
          o.customer?.contactId === contactId ||
          o.customer?.contact?.id === contactId ||
          (phone && o.customer?.phone === phone);
        return isMember && isRejected && isContactMatch;
      });
      return match || null;
    } catch (err) {
      console.error('Failed to get rejected order for reactivation:', err);
      return null;
    }
  }
}
