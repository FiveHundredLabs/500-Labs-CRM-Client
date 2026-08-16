import React, { useState } from 'react';
import type { Order, Customer } from '../../models/domain';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

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
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Order Remark
          </label>
          <textarea
            rows={3}
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Enter order remark or delivery details..."
            className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all"
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
          >
            Save Remark
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
