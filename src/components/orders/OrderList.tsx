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
  onOpenReplacementModal?: (order: Order) => void;
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
  onOpenReplacementModal?: (order: Order) => void;
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
  onOpenReplacementModal,
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
      onOpenReplacementModal={onOpenReplacementModal}
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
  onOpenReplacementModal,
}) => {
  const selectedSet = React.useMemo(() => new Set(selectedOrderIds), [selectedOrderIds]);
  const [renderLimit, setRenderLimit] = React.useState(48);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setRenderLimit(48);
  }, [filteredOrders]);

  React.useEffect(() => {
    if (renderLimit >= filteredOrders.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRenderLimit((prev) => Math.min(prev + 48, filteredOrders.length));
        }
      },
      { rootMargin: '300px' }
    );

    const target = sentinelRef.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
      observer.disconnect();
    };
  }, [renderLimit, filteredOrders.length]);

  if (filteredOrders.length === 0) {
    return (
      <EmptyState
        title="No orders found"
        description="No order records match your current filter, date, and search criteria."
      />
    );
  }

  const visibleOrders = filteredOrders.slice(0, renderLimit);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {visibleOrders.map((order) => {
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
              onOpenReplacementModal={onOpenReplacementModal}
            />
          );
        })}
      </div>

      {renderLimit < filteredOrders.length && (
        <div ref={sentinelRef} className="py-4 text-center">
          <button
            type="button"
            onClick={() => setRenderLimit((prev) => Math.min(prev + 48, filteredOrders.length))}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Showing {renderLimit} of {filteredOrders.length} orders (Scroll to load more)
          </button>
        </div>
      )}
    </>
  );
});
