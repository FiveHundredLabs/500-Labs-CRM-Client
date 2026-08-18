import React from 'react';
import type { Customer, User, Order } from '../../models/domain';
import { CustomerCard } from '../customer/CustomerCard';
import { EmptyState } from '../shared/EmptyState';
import { Sparkles, Truck } from 'lucide-react';
import { format } from 'date-fns';

export interface InterestedListProps {
  filteredCustomers: Customer[];
  membersMap: Record<string, User>;
  ordersMap?: Record<string, Order[]>;
  selectedIds: string[];
  onToggleSelectCard: (id: string) => void;
}

export const InterestedList: React.FC<InterestedListProps> = ({
  filteredCustomers,
  membersMap,
  ordersMap = {},
  selectedIds,
  onToggleSelectCard,
}) => {
  if (filteredCustomers.length === 0) {
    return (
      <EmptyState
        title="No interested leads found"
        description="No leads with status INTERESTED match the selected team member or search filter."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      {filteredCustomers.map((customer) => {
        const member = membersMap[customer.responsibleTeamMemberId];
        const isSelected = selectedIds.includes(customer.id);
        const formattedDate = format(new Date(customer.createdAt), 'MMM dd');

        // Check for previous dispatches
        const custOrders = ordersMap[customer.id] || [];
        const previousOrder = custOrders.find((o) =>
          ['DISPATCHED', 'DELIVERED', 'REJECTED', 'RETURNED'].includes(o.status)
        );

        const previousDispatchContent = previousOrder ? (
          <div className="mt-1.5 p-1.5 rounded-lg bg-amber-50/90 border border-amber-200 text-[10px] space-y-0.5">
            <div className="flex items-center justify-between font-bold text-amber-900">
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                Previous Dispatch
              </span>
              <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800">
                #{previousOrder.orderNumber}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>Status: <strong className="font-semibold text-slate-900">{previousOrder.status}</strong></span>
              <span>{format(new Date(previousOrder.createdAt), 'MMM dd, yyyy')}</span>
            </div>
            <div className="text-slate-600 truncate">
              Item: {previousOrder.itemsDescription}
            </div>
            {previousOrder.totalAmount > 0 && (
              <div className="font-medium text-slate-800">
                COD: LKR {previousOrder.totalAmount.toLocaleString()}
              </div>
            )}
          </div>
        ) : null;

        return (
          <CustomerCard
            key={customer.id}
            isSelected={isSelected}
            onToggleSelect={() => onToggleSelectCard(customer.id)}
            customerName={customer.fullName}
            badge={
              <span className="inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                Interested
              </span>
            }
            phone={customer.phone}
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

