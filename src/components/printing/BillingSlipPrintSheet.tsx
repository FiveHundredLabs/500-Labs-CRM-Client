import React from 'react';
import { Customer, Order, Team, User } from '../../models/domain';
import { A6BillingSlip } from './A6BillingSlip';

export interface LeadPrintItem {
  customer: Customer;
  responsibleUser?: User;
  order?: Order;
  team?: Team | Pick<Team, 'id' | 'name' | 'code'>;
}

export interface BillingSlipPrintSheetProps {
  items: LeadPrintItem[];
}

export const BillingSlipPrintSheet: React.FC<BillingSlipPrintSheetProps> = ({ items }) => {
  return (
    <div className="print-billing-container">
      {items.map((item) => (
        <div
          key={item.order?.id || item.customer.id}
          className="billing-slip-page w-[148mm] h-[105mm] bg-white overflow-hidden"
          style={{ boxSizing: 'border-box', breakAfter: 'page', pageBreakAfter: 'always' }}
        >
          <A6BillingSlip
            customer={item.customer}
            responsibleUser={item.responsibleUser}
            order={item.order}
            team={item.team}
          />
        </div>
      ))}
    </div>
  );
};
