import React, { useState } from 'react';
import type { Order, Customer, OrderStatus } from '../../models/domain';
import { Dialog } from '../ui/Dialog';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

export interface OrderStatusChangeDialogProps {
  order: Order | null;
  defaultNewStatus: OrderStatus;
  customersMap: Record<string, Customer>;
  onClose: () => void;
  onConfirm: (targetOrder: Order, newStatus: OrderStatus, remark: string) => Promise<boolean>;
}

export const OrderStatusChangeDialog: React.FC<OrderStatusChangeDialogProps> = ({
  order,
  defaultNewStatus,
  customersMap,
  onClose,
  onConfirm,
}) => {
  const [targetNewStatus, setTargetNewStatus] = useState<OrderStatus>(defaultNewStatus);
  const [statusRemark, setStatusRemark] = useState(order?.remarks || '');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingStatus(true);
    try {
      const success = await onConfirm(order, targetNewStatus, statusRemark);
      if (success) {
        onClose();
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const customer = customersMap[order.customerId];

  return (
    <Dialog
      isOpen={!!order}
      onClose={onClose}
      title={`Update Status: Order #${order.orderNumber}`}
      description={`Transition order for ${customer?.fullName || 'Customer'} to ${targetNewStatus}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
          <div className="font-semibold text-slate-900">
            Current Status: <span className="text-amber-700 font-bold">DISPATCHED</span>
          </div>
          <div className="text-slate-600">
            New Target Status:{' '}
            <span
              className={
                targetNewStatus === 'DELIVERED'
                  ? 'text-emerald-700 font-bold'
                  : 'text-red-700 font-bold'
              }
            >
              {targetNewStatus}
            </span>
          </div>
        </div>

        <Select
          label="Target Status *"
          value={targetNewStatus}
          onChange={(e) => setTargetNewStatus(e.target.value as OrderStatus)}
          options={[
            { value: 'DELIVERED', label: 'Delivered to Customer' },
            { value: 'REJECTED', label: 'Rejected / Refused by Customer' },
          ]}
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Optional Remark / Delivery Notes
          </label>
          <textarea
            rows={3}
            value={statusRemark}
            onChange={(e) => setStatusRemark(e.target.value)}
            placeholder="e.g. Delivered and signed by customer, or Customer refused payment..."
            className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isUpdatingStatus}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isUpdatingStatus}
            className={
              targetNewStatus === 'DELIVERED'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-red-600 hover:bg-red-500'
            }
          >
            Confirm Status Change
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
