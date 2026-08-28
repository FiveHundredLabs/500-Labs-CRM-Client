import React from 'react';
import type { Order, Customer, User, OrderStatus } from '../../models/domain';
import { OrderCard } from './OrderCard';
import { EmptyState } from '../shared/EmptyState';

export interface OrderListProps {
  filteredOrders: Order[];
  customersMap: Record<string, Customer>;
  membersMap: Record<string, User>;
  selectedOrderIds: string[];
  onToggleSelectCard: (id: string) => void;
  onViewHistory: (order: Order) => void;
  onOpenStatusModal: (order: Order, defaultNewStatus: OrderStatus) => void;
  onOpenRemarkModal: (order: Order) => void;
  onPrintBillingSlip: (order: Order) => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  filteredOrders,
  customersMap,
  membersMap,
  selectedOrderIds,
  onToggleSelectCard,
  onViewHistory,
  onOpenStatusModal,
  onOpenRemarkModal,
  onPrintBillingSlip,
}) => {
  if (filteredOrders.length === 0) {
    return (
      <EmptyState
        title="No orders found"
        description="No order records match your current filter, date, and search criteria."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      {filteredOrders.map((order) => {
        const customer = customersMap[order.customerId];
        const member = membersMap[order.teamMemberId];
        const isSelected = selectedOrderIds.includes(order.id);

        return (
          <OrderCard
            key={order.id}
            order={order}
            customer={customer}
            handledByMember={member}
            isSelected={isSelected}
            onToggleSelect={() => onToggleSelectCard(order.id)}
            onViewHistory={onViewHistory}
            onOpenStatusModal={onOpenStatusModal}
            onOpenRemarkModal={onOpenRemarkModal}
            onPrintBillingSlip={onPrintBillingSlip}
          />
        );
      })}
    </div>
  );
};
