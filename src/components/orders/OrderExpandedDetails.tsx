import React from 'react';
import type { Order, OrderStatus } from '../../models/domain';
import { formatCurrency } from '../../utils/currency';
import { getAmountToCollect, getCodCharge, getProductSalesValue } from '../../utils/orderAmounts';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import {
  MessageSquare,
  History,
  CheckCheck,
  XCircle,
  Edit3,
  PlusCircle,
  Printer,
  ShieldAlert,
  Clock,
  Lock,
  RotateCcw,
  Truck,
} from 'lucide-react';

export interface OrderExpandedDetailsProps {
  order: Order;
  onViewHistory: (order: Order) => void;
  onOpenStatusModal: (order: Order, defaultNewStatus: OrderStatus) => void;
  onOpenRemarkModal: (order: Order) => void;
  onPrintSlip: (order: Order) => void;
  onInspectDamages?: (order: Order) => void;
  onOpenRejectionModal?: (order: Order) => void;
  onOpenReplacementModal?: (order: Order) => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const OrderExpandedDetails: React.FC<OrderExpandedDetailsProps> = ({
  order,
  onViewHistory,
  onOpenStatusModal,
  onOpenRemarkModal,
  onPrintSlip,
  onInspectDamages,
  onOpenRejectionModal,
  onOpenReplacementModal,
}) => {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'SUPERVISOR';
  const isAdmin = user?.role === 'ADMIN';

  const productSalesValue = getProductSalesValue(order);
  const codCharge = getCodCharge(order);
  const amountToCollect = getAmountToCollect(order);

  const isDelivered = order.status === 'DELIVERED';
  const isRejected = order.status === 'REJECTED';
  const statusTime = isDelivered
    ? (order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.updatedAt).getTime())
    : isRejected
    ? (order.rejectedAt ? new Date(order.rejectedAt).getTime() : new Date(order.updatedAt).getTime())
    : 0;
  const remainingReviewMs = (isDelivered || isRejected) ? statusTime + SEVEN_DAYS_MS - Date.now() : 0;
  const isPast7Days = (isDelivered || isRejected) ? remainingReviewMs <= 0 : false;
  const isWithin7Days = !isPast7Days;

  const days = Math.floor(remainingReviewMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingReviewMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const reviewWindowText = isPast7Days
    ? '7-Day Review Period Expired'
    : days > 0
    ? `${days}d ${hours}h review window remaining`
    : `${hours}h review window remaining`;

  const activeRejection =
    order.rejectionRequests?.find((r) => r.status === 'PENDING') ||
    (order.activeRejectionRequest?.status === 'PENDING' ? order.activeRejectionRequest : null);
  const latestRejection = order.rejectionRequests?.[0] || order.activeRejectionRequest;
  const orderDamagedItems = Array.isArray(order.damagedItems)
    ? order.damagedItems
    : Array.isArray(order.rejectionRequests?.[0]?.damagedItems)
    ? (order.rejectionRequests?.[0]?.damagedItems as any[])
    : [];

  return (
    <div
      className="mt-2.5 pt-2.5 border-t border-slate-200/80 space-y-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Items Description & Amount Breakdown */}
      <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-700 space-y-1">
        <div className="font-semibold text-slate-900 flex justify-between items-center gap-2">
          <span className="truncate">{order.itemsDescription}</span>
          <span className="font-mono text-emerald-700 font-bold shrink-0">
            {formatCurrency(amountToCollect)}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[11px] text-slate-600 border-t border-slate-200/60 pt-1">
          <span>Product Value: <strong className="font-mono text-slate-900">{formatCurrency(productSalesValue)}</strong></span>
          <span>COD / Delivery: <strong className="font-mono text-slate-900">{formatCurrency(codCharge)}</strong></span>
          <span>Amount to Collect: <strong className="font-mono text-slate-900">{formatCurrency(amountToCollect)}</strong></span>
        </div>
        {order.remarks && order.remarks.trim() !== '' ? (
          <div className="text-[11px] text-slate-600 italic border-t border-slate-200/60 pt-1 mt-1 flex items-start gap-1">
            <MessageSquare className="w-3 h-3 shrink-0 text-amber-500 mt-0.5" />
            <span className="line-clamp-2">"{order.remarks}"</span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 italic pt-0.5">
            No remark recorded
          </div>
        )}
      </div>

      {/* Replacement Order Indicator */}
      {order.isReplacement && (
        <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs space-y-1">
          <div className="flex items-center justify-between font-semibold text-purple-950">
            <span className="flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
              Replacement Order (Linked to #{order.parentOrder?.orderNumber || 'Parent Order'})
            </span>
            <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded-full">
              LKR 0 Product Price
            </span>
          </div>
          <p className="text-[11px] text-purple-800">
            Fulfills damaged goods replacement while keeping original order #{order.parentOrder?.orderNumber || ''} sales and payment records intact.
          </p>
        </div>
      )}

      {/* 7-Day Review Window & Approval Status Banner */}
      {(isDelivered || isRejected) && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-semibold text-amber-900">{reviewWindowText}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {order.activeReplacementRequest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                ⏳ Replacement Request Pending Admin Approval
              </span>
            )}
            {activeRejection && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                ⏳ Status Change ({activeRejection.fromStatus || order.status} → {activeRejection.toStatus || 'REJECTED'}) Pending Admin Approval
              </span>
            )}
            {!activeRejection && latestRejection?.status === 'REJECTED' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                Status Change Request Declined by Admin
              </span>
            )}
            {isPast7Days && !isAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                <Lock className="w-3 h-3 text-slate-400" />
                Review Period Closed (7 Days Expired)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons Slot */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onViewHistory(order)}
          className="text-[11px] sm:text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="w-3.5 h-3.5 text-slate-700" />}
            onClick={() => onPrintSlip(order)}
            className="text-[11px] sm:text-xs py-1 px-2 sm:px-2.5 text-slate-700 bg-white hover:bg-slate-100 border-slate-300 cursor-pointer h-7 font-medium"
            title="Print Slip"
          >
            Print Slip
          </Button>

          {order.status === 'DISPATCHED' && (
            <>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
                onClick={() => onOpenStatusModal(order, 'DELIVERED')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs py-1 px-2 sm:px-2.5 cursor-pointer h-7 font-semibold shadow-2xs"
              >
                Delivered
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<XCircle className="w-3.5 h-3.5" />}
                onClick={() => onOpenStatusModal(order, 'REJECTED')}
                className="text-[11px] sm:text-xs py-1 px-2 sm:px-2.5 cursor-pointer h-7 font-semibold shadow-2xs"
              >
                Rejected
              </Button>
            </>
          )}

          {/* Delivered Order Transitions: Move to Rejected / Move to Dispatch / Request Replacement */}
          {isDelivered && (isWithin7Days || isAdmin) && (isSupervisor || isAdmin) && (
            <>
              {!order.activeReplacementRequest && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw className="w-3.5 h-3.5 text-purple-600" />}
                  onClick={() => onOpenReplacementModal?.(order)}
                  className="text-[11px] sm:text-xs py-1 px-2 sm:px-2.5 cursor-pointer h-7 font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border-purple-300"
                  title="Submit damaged product replacement request (Admin approval required)"
                >
                  Request Replacement
                </Button>
              )}
              {!activeRejection && isWithin7Days && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<RotateCcw className="w-3.5 h-3.5 text-amber-600" />}
                    onClick={() => onOpenStatusModal(order, 'REJECTED')}
                    className="text-[11px] sm:text-xs py-1 px-2 sm:px-2.5 cursor-pointer h-7 font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300"
                    title="Move delivered order to Rejected (requires Admin approval)"
                  >
                    Move to Rejected
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Truck className="w-3.5 h-3.5 text-blue-600" />}
                    onClick={() => onOpenStatusModal(order, 'DISPATCHED')}
                    className="text-[11px] sm:text-xs py-1 px-2 sm:px-2.5 cursor-pointer h-7 font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-300"
                    title="Move delivered order back to Dispatch (requires Admin approval)"
                  >
                    Move to Dispatch
                  </Button>
                </>
              )}
            </>
          )}

          {/* Rejected Order Transitions: Move to Delivered / Move to Dispatch (Within 7 Days) */}
          {isRejected && isWithin7Days && !activeRejection && (isSupervisor || isAdmin) && (
            <>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
                onClick={() => onOpenStatusModal(order, 'DELIVERED')}
                className="text-[11px] sm:text-xs py-1 px-2 sm:px-2.5 cursor-pointer h-7 font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
                title="Move rejected order to Delivered (requires Admin approval)"
              >
                Move to Delivered
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Truck className="w-3.5 h-3.5 text-blue-600" />}
                onClick={() => onOpenStatusModal(order, 'DISPATCHED')}
                className="text-[11px] sm:text-xs py-1 px-2 sm:px-2.5 cursor-pointer h-7 font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-300"
                title="Move rejected order to Dispatch (requires Admin approval)"
              >
                Move to Dispatch
              </Button>
            </>
          )}

          {((orderDamagedItems && orderDamagedItems.length > 0) || (order.remarks && order.remarks.toLowerCase().includes('damage'))) && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-rose-600" />}
              onClick={() => onInspectDamages?.(order)}
              className="text-[11px] sm:text-xs py-1 px-2 sm:px-2.5 text-rose-800 bg-rose-50 hover:bg-rose-100 border-rose-200 cursor-pointer h-7"
            >
              Damage Details
            </Button>
          )}

          {(order.status === 'DELIVERED' || order.status === 'REJECTED') && (
            !(isDelivered && isPast7Days && isSupervisor) ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={
                  order.remarks && order.remarks.trim() !== '' ? (
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  )
                }
                onClick={() => onOpenRemarkModal(order)}
                className="text-[11px] sm:text-xs py-1 px-2 sm:px-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300 cursor-pointer h-7"
              >
                {order.remarks && order.remarks.trim() !== '' ? 'Edit Remark' : 'Add Remark'}
              </Button>
            ) : (
              <span
                className="text-[10px] text-slate-400 font-medium flex items-center gap-1 px-2 py-1 bg-slate-100 rounded border border-slate-200 cursor-not-allowed h-7"
                title="Remarks locked after 7 days for delivered orders"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                Remarks Locked
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
};
