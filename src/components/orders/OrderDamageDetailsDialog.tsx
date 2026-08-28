import React from 'react';
import type { Order } from '../../models/domain';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { ShieldAlert, Package, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export interface OrderDamageDetailsDialogProps {
  order: Order | null;
  onClose: () => void;
}

export const OrderDamageDetailsDialog: React.FC<OrderDamageDetailsDialogProps> = ({
  order,
  onClose,
}) => {
  if (!order) return null;

  const markedDate = order.rejectedAt || order.updatedAt || order.createdAt;
  const formattedDate = format(new Date(markedDate), 'MMM dd, yyyy');

  const damagedItems = order.damagedItems || [];

  return (
    <Dialog
      isOpen={!!order}
      onClose={onClose}
      title={`Order #${order.orderNumber} - Damage Details`}
      description={`Status: ${order.status} | Marked On: ${formattedDate}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Status Info Banner */}
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span className="font-bold text-rose-950">
              Delivery Return &amp; Transit Damage Record
            </span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            {order.status}
          </span>
        </div>

        {/* Reported Damaged Items Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-slate-500" />
            <span>Reported Damaged Items:</span>
          </h4>

          {damagedItems.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg italic">
              {order.remarks && order.remarks.trim() !== ''
                ? `Damage Remark: "${order.remarks}"`
                : 'Customer return marked as damaged during status update.'}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-center">Quantity</th>
                    <th className="py-2.5 px-3">Reason / Courier Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {damagedItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-900 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.productName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-700">
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">
                        {item.reason || order.remarks || 'Customer return damaged in transit'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {order.remarks && order.remarks.trim() !== '' && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Order Note:</span>
            <p className="text-slate-700 italic">"{order.remarks}"</p>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
