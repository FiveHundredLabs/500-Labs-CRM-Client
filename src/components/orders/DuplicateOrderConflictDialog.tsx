import React from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { StatusBadge } from '../shared/StatusBadge';
import { formatCurrency } from '../../utils/currency';
import type { Order, Customer, User } from '../../models/domain';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Phone,
  User as UserIcon,
  ShoppingBag,
  Info,
  MapPin,
  XCircle,
} from 'lucide-react';

export interface DuplicateOrderConflictInfo {
  phone: string;
  customerName?: string;
  hasDuplicateActiveOrders: boolean;
  activeDuplicateOrders: Order[];
  hasPreviousDeliveredOrder: boolean;
  previousDeliveredOrders: Order[];
  hasPreviousRejectedOrder?: boolean;
  previousRejectedOrders?: Order[];
  allOrdersForPhone: Order[];
}

interface DuplicateOrderConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrder: Order | null;
  conflictInfo: DuplicateOrderConflictInfo | null;
  customersMap: Record<string, Customer>;
  membersMap: Record<string, User>;
  onUpdateStatus?: (order: Order, newStatus: any, remark: string) => Promise<boolean>;
  onCancelOrder?: (order: Order) => void;
}

export const DuplicateOrderConflictDialog: React.FC<DuplicateOrderConflictDialogProps> = ({
  isOpen,
  onClose,
  currentOrder,
  conflictInfo,
  customersMap,
  membersMap,
  onCancelOrder,
}) => {
  if (!conflictInfo) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Duplicate Orders &amp; History for Phone"
      description={`Inspecting all orders associated with mobile number ${conflictInfo.phone}`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Header Warning Banner */}
        {conflictInfo.hasDuplicateActiveOrders ? (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-950 text-xs shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold text-amber-900">
                ⚠ Multiple Active Orders Detected for This Phone Number
              </strong>
              <p className="mt-0.5 text-amber-800">
                This phone number currently has {conflictInfo.activeDuplicateOrders.length + (currentOrder && ['DRAFT', 'PREPARED', 'DISPATCHED'].includes(currentOrder.status) ? 1 : 0)} active orders in process. Please review side-by-side below before dispatching. No orders have been automatically modified or cancelled.
              </p>
            </div>
          </div>
        ) : conflictInfo.hasPreviousDeliveredOrder ? (
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3 text-indigo-950 text-xs shadow-2xs">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold text-indigo-900">
                ℹ Previous Delivered Order Found for This Customer
              </strong>
              <p className="mt-0.5 text-indigo-800">
                This customer previously received {conflictInfo.previousDeliveredOrders.length} delivered order(s). Review previous package history below.
              </p>
            </div>
          </div>
        ) : conflictInfo.hasPreviousRejectedOrder ? (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-950 text-xs shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold text-rose-900">
                ⚠️ Previous Rejected Order Found for This Customer
              </strong>
              <p className="mt-0.5 text-rose-800">
                This phone number previously had {conflictInfo.previousRejectedOrders?.length || 1} rejected order(s). Review previous rejection remarks and items below before proceeding.
              </p>
            </div>
          </div>
        ) : null}

        {/* Contact Phone & Customer Summary */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600" />
            <span className="font-mono font-bold text-slate-900 text-sm">{conflictInfo.phone}</span>
          </div>
          {conflictInfo.customerName && (
            <div className="flex items-center gap-1.5 text-slate-700">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold">{conflictInfo.customerName}</span>
            </div>
          )}
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full">
            {conflictInfo.allOrdersForPhone.length} Total Orders Found
          </span>
        </div>

        {/* Orders Comparison List */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {conflictInfo.allOrdersForPhone.map((ord) => {
            const isThisOrder = currentOrder?.id === ord.id;
            const cust = customersMap[ord.customerId] || (ord as any).customer;
            const rep = membersMap[ord.teamMemberId] || (ord as any).teamMember;
            const isActive = ['DRAFT', 'PREPARED', 'DISPATCHED'].includes(ord.status);
            const isDelivered = ord.status === 'DELIVERED';

            return (
              <div
                key={ord.id}
                className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                  isThisOrder
                    ? 'border-2 border-blue-500 bg-blue-50/40 shadow-xs'
                    : isActive
                    ? 'border-amber-300 bg-amber-50/30'
                    : isDelivered
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Top Row: Order Number & Badges */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      #{ord.orderNumber}
                    </span>
                    {isThisOrder && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                        Current Selected
                      </span>
                    )}
                    {isActive && !isThisOrder && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                        Concurrent Active Order
                      </span>
                    )}
                    {isDelivered && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        Previously Delivered
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge type="order" status={ord.status} />
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(ord.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Sales Representative:</span>
                    <strong className="text-slate-900">{rep?.fullName || 'Sales Rep'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Order Date:</span>
                    <span>{format(new Date(ord.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Package Items:</span>
                    <strong className="text-slate-800">{ord.itemsDescription || 'Package Order'}</strong>
                  </div>
                </div>

                {/* Customer Address & Remarks */}
                {cust?.address && (
                  <div className="text-[11px] text-slate-500 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span className="truncate">{cust.address} {cust.city ? `(${cust.city})` : ''}</span>
                  </div>
                )}

                {(ord as any).statusRemark && (
                  <div className="text-[11px] p-2 bg-white border border-slate-200 rounded-lg text-slate-700 italic">
                    Note: "{(ord as any).statusRemark}"
                  </div>
                )}

                {/* Cancel duplicate order button if active */}
                {isActive && onCancelOrder && (
                  <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onCancelOrder(ord)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 rounded-md text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel This Duplicate Order</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="primary" size="sm" onClick={onClose} className="cursor-pointer">
            Close &amp; Return to Orders
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
