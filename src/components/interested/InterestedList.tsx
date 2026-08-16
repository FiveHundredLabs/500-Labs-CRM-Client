import React from 'react';
import type { Customer, User } from '../../models/domain';
import { CustomerCard } from '../customer/CustomerCard';
import { EmptyState } from '../shared/EmptyState';
import { Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export interface InterestedListProps {
  filteredCustomers: Customer[];
  membersMap: Record<string, User>;
  selectedIds: string[];
  onToggleSelectCard: (id: string) => void;
}

export const InterestedList: React.FC<InterestedListProps> = ({
  filteredCustomers,
  membersMap,
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
          />
        );
      })}
    </div>
  );
};
