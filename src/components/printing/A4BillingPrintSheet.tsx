import React from 'react';
import { Customer, User, Order } from '../../models/domain';
import { A6BillingSlip } from './A6BillingSlip';

export interface LeadPrintItem {
  customer: Customer;
  responsibleUser?: User;
  order?: Order;
}

export interface A4BillingPrintSheetProps {
  items: LeadPrintItem[];
}

export const A4BillingPrintSheet: React.FC<A4BillingPrintSheetProps> = ({ items }) => {
  // Chunk into pages of 4 slips per A4 Landscape sheet
  const pages: LeadPrintItem[][] = [];
  for (let i = 0; i < items.length; i += 4) {
    pages.push(items.slice(i, i + 4));
  }

  return (
    <div className="print-billing-container">
      {pages.map((pageItems, pageIdx) => (
        <div
          key={pageIdx}
          className="w-[297mm] h-[210mm] p-2 bg-white grid grid-cols-2 grid-rows-2 gap-2 page-break-after-always print:w-full print:h-screen print:m-0 print:p-2"
          style={{ boxSizing: 'border-box', breakAfter: 'page', pageBreakAfter: 'always' }}
        >
          {pageItems.map((item) => (
            <A6BillingSlip
              key={item.customer.id}
              customer={item.customer}
              responsibleUser={item.responsibleUser}
              order={item.order}
            />
          ))}

          {/* Fill remaining slots if fewer than 4 on the sheet */}
          {Array.from({ length: 4 - pageItems.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="w-[148mm] h-[105mm] border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-300 text-xs font-mono print:border-transparent shrink-0"
              style={{ boxSizing: 'border-box' }}
            >
              <div className="font-bold text-slate-300 uppercase tracking-wider">[ EMPTY A6 BILLING SLIP POSITION ]</div>
              <div className="text-[10px] text-slate-300 mt-1">4 Slips / A4 Landscape Grid</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
