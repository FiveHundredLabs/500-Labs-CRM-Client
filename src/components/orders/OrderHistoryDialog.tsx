import React from 'react';
import type { Order, DeliveryStatusHistory } from '../../models/domain';
import { Dialog } from '../ui/Dialog';
import { format } from 'date-fns';

export interface OrderHistoryDialogProps {
  order: Order | null;
  historyList: DeliveryStatusHistory[];
  onClose: () => void;
}

export const OrderHistoryDialog: React.FC<OrderHistoryDialogProps> = ({
  order,
  historyList,
  onClose,
}) => {
  if (!order) return null;

  return (
    <Dialog
      isOpen={!!order}
      onClose={onClose}
      title={`Status History - #${order.orderNumber}`}
      maxWidth="md"
    >
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {historyList.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center">
            No delivery status history records found.
          </div>
        ) : (
          historyList.map((h) => (
            <div
              key={h.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
            >
              <div className="flex items-center justify-between font-semibold text-slate-900">
                <span>
                  {h.previousStatus ? `${h.previousStatus} ➔ ` : ''}
                  <span className="text-blue-600 font-bold">{h.newStatus}</span>
                </span>
                <span className="text-slate-400 font-normal text-[11px]">
                  {format(new Date(h.createdAt), 'MMM dd, hh:mm a')}
                </span>
              </div>
              {h.remarks && (
                <div className="text-slate-600 italic text-[11px]">
                  "{h.remarks}"
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
};
