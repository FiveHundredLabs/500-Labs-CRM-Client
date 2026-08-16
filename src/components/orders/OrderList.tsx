import React from 'react';
import type { Order, Customer, User, OrderStatus } from '../../models/domain';
import { CustomerCard } from '../customer/CustomerCard';
import { StatusBadge } from '../shared/StatusBadge';
import { EmptyState } from '../shared/EmptyState';
import { Button } from '../ui/Button';
import { MessageSquare, History, CheckCheck, XCircle, Edit3, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';

export interface OrderListProps {
  filteredOrders: Order[];
  customersMap: Record<string, Customer>;
  membersMap: Record<string, User>;
  selectedOrderIds: string[];
  onToggleSelectCard: (id: string) => void;
  onViewHistory: (order: Order) => void;
  onOpenStatusModal: (order: Order, defaultNewStatus: OrderStatus) => void;
  onOpenRemarkModal: (order: Order) => void;
}

export const OrderList: React.FC<OrderListProps> = ({
  filteredOrders,
  customersMap,
  membersMap,
  selectedOrderIds,
  onToggleSelectCard,
  onViewHistory,
  onOpenStatusModal,
  onOpenRemarkModal,
}) => {
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
        const isSelected = selectedOrderIds.includes(order.id);
        const formattedDate = format(
          new Date(order.updatedAt || order.createdAt),
          'MMM dd'
        );

        return (
          <CustomerCard
            key={order.id}
            isSelected={isSelected}
            onToggleSelect={() => onToggleSelectCard(order.id)}
            customerName={customer ? customer.fullName : 'Customer'}
            orderNumber={order.orderNumber}
            badge={<StatusBadge type="order" status={order.status} className="shrink-0 text-[10px]" />}
            phone={customer?.phone || 'N/A'}
            address={customer?.address || 'No address specified'}
            handledByMember={member}
            dateString={formattedDate}
            middleContent={
              <div className="mt-1 p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-[10px] sm:text-[11px] text-slate-700 space-y-0.5">
                <div className="font-semibold text-slate-900 flex justify-between items-center">
                  <span className="truncate">{order.itemsDescription}</span>
                  <span className="font-mono text-emerald-700 font-bold ml-1.5 shrink-0">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>
                {order.remarks && order.remarks.trim() !== '' ? (
                  <div className="text-[10px] text-slate-600 italic border-t border-slate-200/60 pt-1 mt-1 flex items-start gap-1">
                    <MessageSquare className="w-2.5 h-2.5 shrink-0 text-amber-500 mt-0.5" />
                    <span className="line-clamp-2">"{order.remarks}"</span>
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-400 italic pt-0.5">
                    No remark recorded
                  </div>
                )}
              </div>
            }
            actionButtons={
              <>
                <button
                  type="button"
                  onClick={() => onViewHistory(order)}
                  className="text-[10px] text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <History className="w-3 h-3" />
                  <span>History</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {order.status === 'DISPATCHED' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCheck className="w-3 h-3" />}
                        onClick={() => onOpenStatusModal(order, 'DELIVERED')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] py-1 px-2 cursor-pointer h-7"
                      >
                        Delivered
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<XCircle className="w-3 h-3" />}
                        onClick={() => onOpenStatusModal(order, 'REJECTED')}
                        className="text-[10px] py-1 px-2 cursor-pointer h-7"
                      >
                        Rejected
                      </Button>
                    </>
                  )}

                  {(order.status === 'DELIVERED' || order.status === 'REJECTED') && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={
                        order.remarks && order.remarks.trim() !== '' ? (
                          <Edit3 className="w-3 h-3 text-blue-600" />
                        ) : (
                          <PlusCircle className="w-3 h-3 text-emerald-600" />
                        )
                      }
                      onClick={() => onOpenRemarkModal(order)}
                      className="text-[10px] py-1 px-2 text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300 cursor-pointer"
                    >
                      {order.remarks && order.remarks.trim() !== '' ? 'Edit Remark' : 'Add Remark'}
                    </Button>
                  )}
                </div>
              </>
            }
          />
        );
      })}
    </div>
  );
};
