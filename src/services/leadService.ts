import {
  customerRepository,
  contactRepository,
  orderRepository,
  deliveryStatusHistoryRepository,
} from '../repositories';
import { User } from '../models/domain';
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

      // 1. Update Contact status to DISPATCHED
      if (customer.contactId) {
        await contactRepository.update(customer.contactId, { status: 'DISPATCHED' });
      }

      // 2. Check existing order or create new order with status DISPATCHED
      const existingOrders = await orderRepository.getByCustomerId(customerId);
      if (existingOrders.length > 0) {
        const latestOrder = existingOrders[existingOrders.length - 1];
        if (latestOrder.status !== 'DISPATCHED' && latestOrder.status !== 'DELIVERED') {
          await OrderService.updateOrderStatus(latestOrder.id, 'DISPATCHED', actor, 'Dispatched via Interested Leads billing print');
        }
      } else {
        const allOrders = await orderRepository.getAll();
        const orderNumber = `ORD-2026-${String(allOrders.length + 1).padStart(3, '0')}`;
        const newOrder = await orderRepository.create({
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

        await deliveryStatusHistoryRepository.create({
          orderId: newOrder.id,
          previousStatus: null,
          newStatus: 'DISPATCHED',
          remarks: 'Order created and dispatched from Interested Leads workflow.',
          actorUserId: actor.id,
        });
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
}
