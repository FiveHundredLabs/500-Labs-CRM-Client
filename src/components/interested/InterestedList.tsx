import React from 'react';
import type { Customer, User, Order } from '../../models/domain';
import { CustomerCard } from '../customer/CustomerCard';
import { EmptyState } from '../shared/EmptyState';
import { Sparkles, Truck, AlertTriangle, Info, FileText, Mail } from 'lucide-react';
import { format } from 'date-fns';
import type { DuplicateOrderConflictInfo } from '../orders/DuplicateOrderConflictDialog';

export interface InterestedListProps {
  filteredCustomers: Customer[];
  membersMap: Record<string, User>;
  ordersMap?: Record<string, Order[]>;
  interestedConflictMap?: Record<string, DuplicateOrderConflictInfo>;
  selectedIds: string[];
  onToggleSelectCard: (id: string) => void;
  onInspectDuplicateOrders?: (conflictInfo: DuplicateOrderConflictInfo) => void;
}

export const InterestedList: React.FC<InterestedListProps> = ({
  filteredCustomers,
  membersMap,
  ordersMap = {},
  interestedConflictMap = {},
  selectedIds,
  onToggleSelectCard,
  onInspectDuplicateOrders,
}) => {
  if (filteredCustomers.length === 0) {
    return (
      <EmptyState
        title="No interested leads found"
        description="No leads with status INTERESTED match the selected filters."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      {filteredCustomers.map((customer) => {
        const member = membersMap[customer.responsibleTeamMemberId];
        const isSelected = selectedIds.includes(customer.id);
        const formattedDate = format(new Date(customer.createdAt), 'MMM dd');
        const conflictInfo = interestedConflictMap[customer.id];

        // Check for orders
        const custOrders = ordersMap[customer.id] || [];
        const currentOrder = custOrders[0];
        const deliveryMethod = currentOrder?.deliveryMethod || customer.deliveryMethod || 'POST';
        const deliveryNote = currentOrder?.deliveryNote || customer.deliveryNote;

        const previousOrder = custOrders.find((o) =>
          ['DISPATCHED', 'DELIVERED', 'REJECTED', 'RETURNED'].includes(o.status)
        );

        const previousDispatchContent = (
          <div className="space-y-1 mt-1">
            {/* Interested Order Items & COD Amount Summary */}
            {currentOrder && (
              <div className="flex items-center justify-between gap-1 text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 min-w-0">
                <span className="font-semibold text-slate-800 truncate" title={currentOrder.itemsDescription}>
                  📦 {currentOrder.itemsDescription || 'Package Order'}
                </span>
                <span className="font-mono font-bold text-emerald-700 shrink-0">
                  COD: LKR {(currentOrder.totalAmount || 0).toLocaleString()}
                </span>
              </div>
            )}

            {/* Compact Highlighted Delivery Note */}
            {deliveryNote && (
              <div className="flex items-center gap-1 text-[10px] bg-amber-50/90 border border-amber-200 text-amber-950 rounded px-1.5 py-0.5 min-w-0">
                <FileText className="w-3 h-3 text-amber-700 shrink-0" />
                <span className="font-bold text-amber-900 shrink-0">Note:</span>
                <span className="truncate italic text-slate-700">"{deliveryNote}"</span>
              </div>
            )}

            {/* Early Duplicate Active Orders Warning Badge */}
            {conflictInfo?.hasDuplicateActiveOrders && (
              <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] space-y-0.5">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>⚠️ Duplicate Active Orders ({conflictInfo.activeDuplicateOrders.length})</span>
                  </span>
                  {onInspectDuplicateOrders && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectDuplicateOrders(conflictInfo);
                      }}
                      className="px-1 py-0.2 rounded text-[9.5px] font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-all"
                    >
                      Compare
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Early Previous Delivered Order Notice Badge */}
            {conflictInfo?.hasPreviousDeliveredOrder && !conflictInfo?.hasDuplicateActiveOrders && !conflictInfo?.hasPreviousRejectedOrder && (
              <div className="p-1.5 rounded bg-indigo-500/10 border border-indigo-500/25 text-[10px] space-y-0.5">
                <div className="flex items-center justify-between font-bold text-indigo-900">
                  <span className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span>ℹ️ Past Delivery: #{conflictInfo.previousDeliveredOrders[0].orderNumber}</span>
                  </span>
                  {onInspectDuplicateOrders && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectDuplicateOrders(conflictInfo);
                      }}
                      className="px-1 py-0.2 rounded text-[9.5px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all"
                    >
                      History
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Early Previous Rejected Order Notice Badge */}
            {conflictInfo?.hasPreviousRejectedOrder && !conflictInfo?.hasDuplicateActiveOrders && (
              <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-[10px] space-y-0.5">
                <div className="flex items-center justify-between font-bold text-rose-900">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                    <span>⚠️ Past Order Rejected: #{conflictInfo.previousRejectedOrders?.[0]?.orderNumber}</span>
                  </span>
                  {onInspectDuplicateOrders && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectDuplicateOrders(conflictInfo);
                      }}
                      className="px-1 py-0.2 rounded text-[9.5px] font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-all"
                    >
                      History
                    </button>
                  )}
                </div>
              </div>
            )}

            {previousOrder && !conflictInfo && (
              <div className="p-1 rounded bg-amber-50/90 border border-amber-200 text-[9.5px] flex items-center justify-between text-slate-700">
                <span className="flex items-center gap-1 font-semibold text-amber-900">
                  <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                  Prev #{previousOrder.orderNumber} ({previousOrder.status})
                </span>
                <span>{format(new Date(previousOrder.createdAt), 'MMM dd')}</span>
              </div>
            )}
          </div>
        );

        return (
          <CustomerCard
            key={customer.id}
            isSelected={isSelected}
            onToggleSelect={() => onToggleSelectCard(customer.id)}
            customerName={customer.fullName}
            orderNumber={currentOrder?.orderNumber}
            badge={
              <div className="flex items-center gap-1">
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
                <span className="inline-flex items-center justify-center gap-0.5 shrink-0 whitespace-nowrap text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                  Interested
                </span>
              </div>
            }
            phone={customer.phone}
            contactCode={customer.code}
            address={customer.address}
            handledByMember={member}
            dateString={formattedDate}
            middleContent={previousDispatchContent}
          />
        );
      })}
    </div>
  );
};

