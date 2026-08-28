import React, { useState } from 'react';
import type { Order, Customer, User, OrderStatus } from '../../models/domain';
import { CustomerCard } from '../customer/CustomerCard';
import { StatusBadge } from '../shared/StatusBadge';
import { OrderExpandedDetails } from './OrderExpandedDetails';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

export interface OrderCardProps {
  order: Order;
  customer?: Customer;
  handledByMember?: User;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewHistory: (order: Order) => void;
  onOpenStatusModal: (order: Order, defaultNewStatus: OrderStatus) => void;
  onOpenRemarkModal: (order: Order) => void;
  onPrintBillingSlip: (order: Order) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  customer,
  handledByMember,
  isSelected,
  onToggleSelect,
  onViewHistory,
  onOpenStatusModal,
  onOpenRemarkModal,
  onPrintBillingSlip,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedDate = format(
    new Date(order.updatedAt || order.createdAt),
    'MMM dd'
  );

  return (
    <CustomerCard
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      customerName={customer ? customer.fullName : 'Customer'}
      orderNumber={order.orderNumber}
      badge={
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge type="order" status={order.status} className="shrink-0 text-[10px]" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0"
            aria-label={isExpanded ? 'Collapse order details' : 'Expand order details'}
            title={isExpanded ? 'Collapse order details' : 'Expand order details'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-blue-600 font-bold" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500 hover:text-slate-700" />
            )}
          </button>
        </div>
      }
      phone={customer?.phone || 'N/A'}
      address={customer?.address || 'No address specified'}
      handledByMember={handledByMember}
      dateString={formattedDate}
      middleContent={
        isExpanded ? (
          <OrderExpandedDetails
            order={order}
            onViewHistory={onViewHistory}
            onOpenStatusModal={onOpenStatusModal}
            onOpenRemarkModal={onOpenRemarkModal}
            onPrintBillingSlip={onPrintBillingSlip}
          />
        ) : null
      }
    />
  );
};
