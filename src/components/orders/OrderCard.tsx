import React, { useState } from 'react';
import type { Order, Customer, User, OrderStatus } from '../../models/domain';
import { CustomerCard } from '../customer/CustomerCard';
import { StatusBadge } from '../shared/StatusBadge';
import { OrderExpandedDetails } from './OrderExpandedDetails';
import type { DuplicateOrderConflictInfo } from './DuplicateOrderConflictDialog';
import { ChevronDown, ChevronUp, AlertTriangle, Info, FileText, Mail, Truck, Clock, ShieldAlert, Banknote, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
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
  onPrintSlip: (order: Order) => void;
  onInspectDuplicateOrders?: (order: Order, conflictInfo: DuplicateOrderConflictInfo) => void;
  onInspectDamages?: (order: Order) => void;
  onOpenRejectionModal?: (order: Order) => void;
  onOpenReplacementModal?: (order: Order) => void;
}

export const OrderCard: React.FC<OrderCardProps> = React.memo(({
  order,
  customer,
  handledByMember,
  conflictInfo,
  isSelected,
  onToggleSelect,
  onViewHistory,
  onOpenStatusModal,
  onOpenRemarkModal,
  onPrintSlip,
  onInspectDuplicateOrders,
  onInspectDamages,
  onOpenRejectionModal,
  onOpenReplacementModal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeRejection =
    order.rejectionRequests?.find((r) => r.status === 'PENDING') ||
    (order.activeRejectionRequest?.status === 'PENDING' ? order.activeRejectionRequest : null);
  const latestRejection = order.rejectionRequests?.[0] || order.activeRejectionRequest;
  const orderDamagedItems = Array.isArray(order.damagedItems)
    ? order.damagedItems
    : Array.isArray(order.rejectionRequests?.[0]?.damagedItems)
    ? (order.rejectionRequests?.[0]?.damagedItems as any[])
    : [];

  const isDeliveredOrRejected = order.status === 'DELIVERED' || order.status === 'REJECTED';
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const statusTime = order.status === 'DELIVERED'
    ? (order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.updatedAt).getTime())
    : order.status === 'REJECTED'
    ? (order.rejectedAt ? new Date(order.rejectedAt).getTime() : new Date(order.updatedAt).getTime())
    : 0;
  const remainingReviewMs = isDeliveredOrRejected ? statusTime + SEVEN_DAYS_MS - Date.now() : 0;
  const isPast7Days = isDeliveredOrRejected ? remainingReviewMs <= 0 : false;
  const daysRemaining = Math.floor(remainingReviewMs / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor((remainingReviewMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const reviewRemainingText =
    daysRemaining > 0 ? `${daysRemaining}d ${hoursRemaining}h` : `${hoursRemaining}h`;

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
          {deliveryMethod === 'CASH_ON_HAND' || order.isCashOnHand ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Banknote className="w-2.5 h-2.5 text-emerald-600" />
              Cash On Hand
            </span>
          ) : deliveryMethod === 'ROYAL_COURIER' ? (
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
          {order.isReplacement && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
              <RotateCcw className="w-2.5 h-2.5 text-purple-600" />
              Replacement
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
          {/* Cash on Hand Verification State Banner */}
          {order.isCashOnHand && order.cashOnHandStatus && (
            <div
              className={`p-1.5 rounded-lg flex items-center justify-between text-[10px] sm:text-[11px] font-semibold border ${
                order.cashOnHandStatus === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                  : order.cashOnHandStatus === 'DECLINED'
                  ? 'bg-rose-50 text-rose-950 border-rose-200'
                  : 'bg-amber-50 text-amber-950 border-amber-200'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Banknote className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">
                  {order.cashOnHandStatus === 'APPROVED' && '✓ Cash Handover Verified & Approved by Admin'}
                  {order.cashOnHandStatus === 'PENDING' && '⏳ Cash Handover Awaiting Admin Verification'}
                  {order.cashOnHandStatus === 'DECLINED' && '✕ Cash Handover Declined - Order Reverted'}
                </span>
              </div>
            </div>
          )}

          {/* Active Duplicate Orders Warning Banner - Only shown while order is active, hidden after delivery */}
          {order.status !== 'DELIVERED' && order.status !== 'REJECTED' && !order.isReplacement && conflictInfo?.hasDuplicateActiveOrders && (
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
          {order.status !== 'DELIVERED' && order.status !== 'REJECTED' && !order.isReplacement && !conflictInfo?.hasDuplicateActiveOrders && conflictInfo?.hasPreviousDeliveredOrder && (
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
          {((orderDamagedItems && orderDamagedItems.length > 0) || (order.remarks && order.remarks.toLowerCase().includes('damage'))) && (
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
                  ⚠️ {orderDamagedItems.length > 0 ? `${orderDamagedItems.reduce((s, i) => s + (i.quantity || 0), 0)} Item(s) Damaged` : 'Damaged Goods Reported'}
                </span>
              </div>
              <span className="text-[10px] text-rose-700 underline font-bold shrink-0 ml-1">
                View Damage &gt;
              </span>
            </div>
          )}

          {/* Delivered & Rejected Status Transition Approval Banners */}
          {isDeliveredOrRejected && activeRejection && (
            <div className="p-1.5 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-[10px] sm:text-[11px] text-amber-950 font-semibold shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="truncate">⏳ Status Change ({activeRejection.fromStatus || order.status} → {activeRejection.toStatus || 'REJECTED'}) Pending Admin Approval</span>
              </div>
            </div>
          )}

          {isDeliveredOrRejected && !activeRejection && latestRejection?.status === 'REJECTED' && (
            <div className="p-1.5 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-between text-[10px] sm:text-[11px] text-slate-700 font-semibold shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">Status Change Request Declined by Admin</span>
              </div>
            </div>
          )}

          {isDeliveredOrRejected && !activeRejection && latestRejection?.status !== 'REJECTED' && (
            <div className="flex items-center gap-1 px-1 text-[10px] text-amber-800 font-medium">
              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
              <span>{isPast7Days ? 'Review period expired' : `${reviewRemainingText} review window`}</span>
            </div>
          )}

          {/* Replacement Order Banner */}
          {order.isReplacement && (
            <div className="p-1.5 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-purple-950">
              <div className="flex items-center gap-1.5 min-w-0">
                <RotateCcw className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">
                  Free Replacement for #{order.parentOrder?.orderNumber || 'Parent Order'}
                </span>
              </div>
              <span className="text-[10px] text-purple-700 font-bold shrink-0 ml-1">
                LKR 0 Product Price
              </span>
            </div>
          )}

          {/* Delivered Order Active Replacement Requests / Replacements */}
          {order.status === 'DELIVERED' && order.activeReplacementRequest && (
            <div className="p-1.5 bg-purple-50 border border-purple-300 rounded-lg flex items-center justify-between text-[10px] sm:text-[11px] text-purple-950 font-semibold shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">⏳ Replacement Request Awaiting Admin Approval</span>
              </div>
            </div>
          )}

          {order.status === 'DELIVERED' && !order.activeReplacementRequest && order.replacements && order.replacements.length > 0 && (
            <div className="p-1.5 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between text-[10px] sm:text-[11px] text-purple-950 font-semibold shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">✓ Replacement Active (#{order.replacements[0].orderNumber})</span>
              </div>
            </div>
          )}

          {isExpanded && (
            <OrderExpandedDetails
              order={order}
              onViewHistory={onViewHistory}
              onOpenStatusModal={onOpenStatusModal}
              onOpenRemarkModal={onOpenRemarkModal}
              onPrintSlip={onPrintSlip}
              onInspectDamages={onInspectDamages}
              onOpenRejectionModal={onOpenRejectionModal}
              onOpenReplacementModal={onOpenReplacementModal}
            />
          )}
        </div>
      }
    />
  );
});
