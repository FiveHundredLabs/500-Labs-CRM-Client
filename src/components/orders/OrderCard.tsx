import React, { useState } from 'react';
import type { Order, Customer, User, OrderStatus } from '../../models/domain';
import { CustomerCard } from '../customer/CustomerCard';
import { StatusBadge } from '../shared/StatusBadge';
import { OrderExpandedDetails } from './OrderExpandedDetails';
import type { DuplicateOrderConflictInfo } from './DuplicateOrderConflictDialog';
import { ChevronDown, ChevronUp, AlertTriangle, Info, FileText, Mail, Truck } from 'lucide-react';
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
  onPrintBillingSlip: (order: Order) => void;
  onInspectDuplicateOrders?: (order: Order, conflictInfo: DuplicateOrderConflictInfo) => void;
  onInspectDamages?: (order: Order) => void;
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
  onPrintBillingSlip,
  onInspectDuplicateOrders,
  onInspectDamages,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedDate = format(
    new Date(order.updatedAt || order.createdAt),
    'MMM dd'
  );

  const deliveryMethod = order.deliveryMethod || customer?.deliveryMethod || 'POST';
  const deliveryNote = order.deliveryNote || customer?.deliveryNote;

  return (
    <CustomerCard
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      customerName={customer ? customer.fullName : 'Customer'}
      orderNumber={order.orderNumber}
      badge={
        <div className="flex items-center gap-1 shrink-0">
          {deliveryMethod === 'ROYAL_COURIER' ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              <Truck className="w-2.5 h-2.5 text-purple-600" />
              Royal
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <Mail className="w-2.5 h-2.5 text-blue-600" />
              Post
            </span>
          )}
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
              <ChevronUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 hover:text-slate-700" />
            )}
          </button>
        </div>
      }
      phone={customer?.phone || 'N/A'}
      contactCode={customer?.code}
      address={customer?.address || 'No address specified'}
      handledByMember={handledByMember}
      dateString={formattedDate}
      middleContent={
        <div className="space-y-1 mt-1">
          {/* Compact Highlighted Delivery Note */}
          {deliveryNote && (
            <div className="flex items-center gap-1 text-[10px] bg-amber-50/90 border border-amber-200 text-amber-950 rounded px-1.5 py-0.5 min-w-0">
              <FileText className="w-3 h-3 text-amber-700 shrink-0" />
              <span className="font-bold text-amber-900 shrink-0">Note:</span>
              <span className="truncate italic text-slate-700">"{deliveryNote}"</span>
            </div>
          )}
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

          {/* Damaged Return / Transit Damage Logged Banner */}
          {((order.damagedItems && order.damagedItems.length > 0) || (order.remarks && order.remarks.toLowerCase().includes('damage'))) && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onInspectDamages?.(order);
              }}
              className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center justify-between text-[10px] sm:text-[11px] text-rose-950 font-semibold cursor-pointer transition-colors shadow-2xs"
              title="Click to view reported damage details for this order"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="truncate">
                  ⚠️ {order.damagedItems && order.damagedItems.length > 0 ? `${order.damagedItems.reduce((s, i) => s + i.quantity, 0)} Item(s) Damaged` : 'Damaged Goods Reported'}
                </span>
              </div>
              <span className="text-[10px] text-rose-700 underline font-bold shrink-0 ml-1">
                View Damage &gt;
              </span>
            </div>
          )}

          {isExpanded && (
            <OrderExpandedDetails
              order={order}
              onViewHistory={onViewHistory}
              onOpenStatusModal={onOpenStatusModal}
              onOpenRemarkModal={onOpenRemarkModal}
              onPrintBillingSlip={onPrintBillingSlip}
              onInspectDamages={onInspectDamages}
            />
          )}
        </div>
      }
    />
  );
};
