import React, { useState } from 'react';
import type { Order, Customer } from '../../models/domain';
import { useAuth } from '../../hooks/useAuth';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { AlertTriangle, Lock } from 'lucide-react';

export interface OrderRemarkDialogProps {
  order: Order | null;
  customersMap: Record<string, Customer>;
  onClose: () => void;
  onConfirm: (order: Order, remarkText: string) => Promise<boolean>;
}

export const OrderRemarkDialog: React.FC<OrderRemarkDialogProps> = ({
  order,
  customersMap,
  onClose,
  onConfirm,
}) => {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'SUPERVISOR';
  const isDelivered = order?.status === 'DELIVERED';
  const deliveredTime = order?.deliveredAt
    ? new Date(order.deliveredAt).getTime()
    : order?.updatedAt
    ? new Date(order.updatedAt).getTime()
    : Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const isLocked = isDelivered && isSupervisor && (Date.now() - deliveredTime > SEVEN_DAYS_MS);

  const [remarkText, setRemarkText] = useState(order?.remarks || '');
  const [isSavingRemark, setIsSavingRemark] = useState(false);

  if (!order) return null;

  const customer = customersMap[order.customerId];
  const isEditing = Boolean(order.remarks && order.remarks.trim() !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRemark(true);
    try {
      const success = await onConfirm(order, remarkText);
      if (success) {
        onClose();
      }
    } finally {
      setIsSavingRemark(false);
    }
  };

  return (
    <Dialog
      isOpen={!!order}
      onClose={onClose}
      title={`${isEditing ? 'Edit' : 'Add'} Remark: Order #${order.orderNumber}`}
      description={`Customer: ${customer?.fullName || 'Customer'}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isLocked && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2">
            <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Remarks Locked (7-Day Review Period Expired)</div>
              <p className="text-[11px] text-rose-800 mt-0.5">
                The 7-day review window for this delivered order has expired. Supervisors cannot modify remarks on delivered orders after 7 days.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Order Remark
          </label>
          <textarea
            rows={3}
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            disabled={isLocked}
            placeholder={isLocked ? 'Remarks locked after 7-day review window expired.' : 'Enter order remark or delivery details...'}
            className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSavingRemark}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSavingRemark}
            disabled={isSavingRemark || isLocked}
          >
            Save Remark
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
