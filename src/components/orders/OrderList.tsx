import React from 'react';
import type { Order, Customer, User, OrderStatus } from '../../models/domain';
import { OrderCard } from './OrderCard';
import { EmptyState } from '../shared/EmptyState';
import type { DuplicateOrderConflictInfo } from './DuplicateOrderConflictDialog';

export interface OrderListProps {
  filteredOrders: Order[];
  customersMap: Record<string, Customer>;
  membersMap: Record<string, User>;
  selectedOrderIds: string[];
  orderConflictMap?: Record<string, DuplicateOrderConflictInfo>;
  onToggleSelectCard: (id: string) => void;
  onViewHistory: (order: Order) => void;
  onOpenStatusModal: (order: Order, defaultNewStatus: OrderStatus) => void;
  onOpenRemarkModal: (order: Order) => void;
  onPrintSlip: (order: Order) => void;
  onInspectDuplicateOrders?: (order: Order, conflictInfo: DuplicateOrderConflictInfo) => void;
  onInspectDamages?: (order: Order) => void;
  onOpenRejectionModal?: (order: Order) => void;
}

interface OrderListItemProps {
  order: Order;
  customer?: Customer;
  handledByMember?: User;
  conflictInfo?: DuplicateOrderConflictInfo;
  isSelected: boolean;
  onToggleSelectCard: (id: string) => void;
  onViewHistory: (order: Order) => void;
  onOpenStatusModal: (order: Order, defaultNewStatus: OrderStatus) => void;
  onOpenRemarkModal: (order: Order) => void;
  onPrintSlip: (order: Order) => void;
  onInspectDuplicateOrders?: (order: Order, conflictInfo: DuplicateOrderConflictInfo) => void;
  onInspectDamages?: (order: Order) => void;
  onOpenRejectionModal?: (order: Order) => void;
}

const OrderListItem = React.memo<OrderListItemProps>(({
  order,
  customer,
  handledByMember,
  conflictInfo,
  isSelected,
  onToggleSelectCard,
  onViewHistory,
  onOpenStatusModal,
  onOpenRemarkModal,
  onPrintSlip,
  onInspectDuplicateOrders,
  onInspectDamages,
  onOpenRejectionModal,
}) => {
  const handleToggle = React.useCallback(() => {
    onToggleSelectCard(order.id);
  }, [onToggleSelectCard, order.id]);

  return (
    <OrderCard
      order={order}
      customer={customer}
      handledByMember={handledByMember}
      conflictInfo={conflictInfo}
      isSelected={isSelected}
      onToggleSelect={handleToggle}
      onViewHistory={onViewHistory}
      onOpenStatusModal={onOpenStatusModal}
      onOpenRemarkModal={onOpenRemarkModal}
      onPrintSlip={onPrintSlip}
      onInspectDuplicateOrders={onInspectDuplicateOrders}
      onInspectDamages={onInspectDamages}
      onOpenRejectionModal={onOpenRejectionModal}
    />
  );
});

export const OrderList: React.FC<OrderListProps> = React.memo(({
  filteredOrders,
  customersMap,
  membersMap,
  selectedOrderIds,
  orderConflictMap,
  onToggleSelectCard,
  onViewHistory,
  onOpenStatusModal,
  onOpenRemarkModal,
  onPrintSlip,
  onInspectDuplicateOrders,
  onInspectDamages,
  onOpenRejectionModal,
}) => {
  const selectedSet = React.useMemo(() => new Set(selectedOrderIds), [selectedOrderIds]);

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
        const isSelected = selectedSet.has(order.id);
        const conflictInfo = orderConflictMap ? orderConflictMap[order.id] : undefined;

        return (
          <OrderListItem
            key={order.id}
            order={order}
            customer={customer}
            handledByMember={member}
            conflictInfo={conflictInfo}
            isSelected={isSelected}
            onToggleSelectCard={onToggleSelectCard}
            onViewHistory={onViewHistory}
            onOpenStatusModal={onOpenStatusModal}
            onOpenRemarkModal={onOpenRemarkModal}
            onPrintSlip={onPrintSlip}
            onInspectDuplicateOrders={onInspectDuplicateOrders}
            onInspectDamages={onInspectDamages}
            onOpenRejectionModal={onOpenRejectionModal}
          />
        );
      })}
    </div>
  );
});
