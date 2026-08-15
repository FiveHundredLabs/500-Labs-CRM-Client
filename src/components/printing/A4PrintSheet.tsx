import React from 'react';
import { Order, Customer } from '../../models/domain';
import { DeliveryLabel } from './DeliveryLabel';

export interface A4PrintSheetProps {
  orders: Order[];
  customersMap: Record<string, Customer>;
}

export const A4PrintSheet: React.FC<A4PrintSheetProps> = ({ orders, customersMap }) => {
  // Chunk into groups of 4 labels per A4 Landscape page
  const pages: Order[][] = [];
  for (let i = 0; i < orders.length; i += 4) {
    pages.push(orders.slice(i, i + 4));
  }

  return (
    <div className="print-container">
      {pages.map((pageOrders, pageIdx) => (
        <div
          key={pageIdx}
          className="w-[297mm] h-[210mm] p-2 bg-white grid grid-cols-2 grid-rows-2 gap-2 page-break-after-always print:w-full print:h-screen print:m-0"
          style={{ boxSizing: 'border-box' }}
        >
          {pageOrders.map((order) => (
            <DeliveryLabel
              key={order.id}
              order={order}
              customer={customersMap[order.customerId]}
            />
          ))}

          {/* Fill remaining slots if fewer than 4 */}
          {Array.from({ length: 4 - pageOrders.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="w-[148mm] h-[105mm] border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 text-xs font-mono print:border-transparent"
            >
              [Empty Label Position]
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
