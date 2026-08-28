import React, { useState } from 'react';
import type { Order, Customer, User, OrderStatus } from '../../models/domain';
import { CustomerCard } from '../customer/CustomerCard';
import { StatusBadge } from '../shared/StatusBadge';
import { OrderExpandedDetails } from './OrderExpandedDetails';
import type { DuplicateOrderConflictInfo } from './DuplicateOrderConflictDialog';
import { ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';

export interface OrderCardProps {
  order: Order;
  customer?: Customer;
  handledByMember?: User;
  conflictInfo?: DuplicateOrderConflictInfo;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewHistory: (order: Order) => void;
  onOpenStatusModal: (order: Order, defaultNewStatus: OrderStatus) => void;
  onOpenRemarkModal: (order: Order) => void;
  onInspectDuplicateOrders?: (order: Order, conflictInfo: DuplicateOrderConflictInfo) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  customer,
  handledByMember,
  conflictInfo,
  isSelected,
  onToggleSelect,
  onViewHistory,
  onOpenStatusModal,
  onOpenRemarkModal,
  onInspectDuplicateOrders,
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
        <div className="space-y-2">
          {/* Active Duplicate Orders Warning Banner - Only shown while order is active, hidden after delivery */}
          {order.status !== 'DELIVERED' && order.status !== 'REJECTED' && conflictInfo?.hasDuplicateActiveOrders && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onInspectDuplicateOrders?.(order, conflictInfo);
              }}
              className="p-1.5 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 rounded-lg flex items-center justify-between text-[10px] sm:text-[11px] text-amber-950 font-semibold cursor-pointer transition-colors shadow-2xs"
              title="Click to inspect all active orders for this phone number"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="truncate">
                  ⚠ Duplicate Active Orders ({conflictInfo.activeDuplicateOrders.length + 1} orders)
                </span>
              </div>
              <span className="text-[10px] text-amber-900 underline font-bold shrink-0 ml-1">
                Compare &gt;
              </span>
            </div>
          )}

          {/* Previous Delivered Order Found Banner - Only shown while order is active */}
          {order.status !== 'DELIVERED' && order.status !== 'REJECTED' && !conflictInfo?.hasDuplicateActiveOrders && conflictInfo?.hasPreviousDeliveredOrder && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onInspectDuplicateOrders?.(order, conflictInfo);
              }}
              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center justify-between text-[10px] sm:text-[11px] text-indigo-950 font-semibold cursor-pointer transition-colors shadow-2xs"
              title="Click to view previously delivered orders for this customer"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">
                  ℹ Previous Delivered Order Found (#{conflictInfo.previousDeliveredOrders[0]?.orderNumber})
                </span>
              </div>
              <span className="text-[10px] text-indigo-700 underline font-bold shrink-0 ml-1">
                History &gt;
              </span>
            </div>
          )}

          {isExpanded && (
            <OrderExpandedDetails
              order={order}
              onViewHistory={onViewHistory}
              onOpenStatusModal={onOpenStatusModal}
              onOpenRemarkModal={onOpenRemarkModal}
            />
          )}
        </div>
      }
    />
  );
};
