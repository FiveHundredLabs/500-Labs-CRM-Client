import React from 'react';
import type { Order, OrderStatus } from '../../models/domain';
import { formatCurrency } from '../../utils/currency';
import { Button } from '../ui/Button';
import { MessageSquare, History, CheckCheck, XCircle, Edit3, PlusCircle, Printer, ShieldAlert } from 'lucide-react';

export interface OrderExpandedDetailsProps {
  order: Order;
  onViewHistory: (order: Order) => void;
  onOpenStatusModal: (order: Order, defaultNewStatus: OrderStatus) => void;
  onOpenRemarkModal: (order: Order) => void;
  onPrintBillingSlip: (order: Order) => void;
  onInspectDamages?: (order: Order) => void;
}

export const OrderExpandedDetails: React.FC<OrderExpandedDetailsProps> = ({
  order,
  onViewHistory,
  onOpenStatusModal,
  onOpenRemarkModal,
  onPrintBillingSlip,
  onInspectDamages,
}) => {
  return (
    <div
      className="mt-2.5 pt-2.5 border-t border-slate-200/80 space-y-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Items Description & LKR Total Amount */}
      <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-700 space-y-1">
        <div className="font-semibold text-slate-900 flex justify-between items-center gap-2">
          <span className="truncate">{order.itemsDescription}</span>
          <span className="font-mono text-emerald-700 font-bold shrink-0">
            {formatCurrency(order.totalAmount)}
          </span>
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
          {order.deliveryMethod !== 'ROYAL_COURIER' && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Printer className="w-3.5 h-3.5 text-slate-700" />}
              onClick={() => onPrintBillingSlip(order)}
              className="text-[11px] sm:text-xs py-1 px-2 sm:px-2.5 text-slate-700 bg-white hover:bg-slate-100 border-slate-300 cursor-pointer h-7"
            >
              COD Slip
            </Button>
          )}

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

          {((order.damagedItems && order.damagedItems.length > 0) || (order.remarks && order.remarks.toLowerCase().includes('damage'))) && (
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
          )}
        </div>
      </div>
    </div>
  );
};
