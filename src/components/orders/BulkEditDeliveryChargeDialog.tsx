import React, { useState, useEffect } from 'react';
import type { Order, Customer } from '../../models/domain';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Truck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export interface BulkEditOrderLeadItem {
  customer: Customer;
  order: Order;
}

export interface BulkEditDeliveryChargeDialogProps {
  isOpen: boolean;
  items: BulkEditOrderLeadItem[];
  onClose: () => void;
  onSave: (
    updates: { orderId: string; codCharge: number; remarks?: string }[],
    commonRemarks?: string
  ) => Promise<any>;
}

const PRESETS = [0, 200, 250, 300, 350, 400, 500];
const MAX_LIMIT = 20;

export const BulkEditDeliveryChargeDialog: React.FC<BulkEditDeliveryChargeDialogProps> = ({
  isOpen,
  items,
  onClose,
  onSave,
}) => {
  const [deliveryFee, setDeliveryFee] = useState<string>('350');
  const [remarks, setRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDeliveryFee('350');
      setRemarks('');
    }
  }, [isOpen]);

  const count = items.length;
  const isExceeded = count > MAX_LIMIT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (count === 0) {
      toast.error('No orders selected.');
      return;
    }

    if (isExceeded) {
      toast.error(`Maximum ${MAX_LIMIT} orders allowed. You currently have ${count} selected.`);
      return;
    }

    const feeNum = parseFloat(deliveryFee);
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      toast.error('Please enter a valid non-negative delivery fee.');
      return;
    }

    const updates = items.map((it) => ({
      orderId: it.order.id,
      codCharge: feeNum,
      remarks: remarks.trim() || undefined,
    }));

    setIsSaving(true);
    try {
      await onSave(updates, remarks.trim() || undefined);
      onClose();
    } catch {
      // Notification handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Edit Delivery Fee"
      description={`Apply delivery fee to ${count} selected order${count === 1 ? '' : 's'}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Limit Warning (Only if > 20) */}
        {isExceeded && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Limit Exceeded:</strong> Maximum {MAX_LIMIT} orders allowed at one time. Currently selected:{' '}
              <strong>{count}</strong>. Please close and select {MAX_LIMIT} or fewer orders.
            </span>
          </div>
        )}

        {/* Delivery Fee Card with Presets */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Delivery Fee (LKR)</span>
            </label>
            <span className="text-xs text-slate-500">
              Applies to all {count} orders
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-36">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                LKR
              </span>
              <input
                type="number"
                min="0"
                step="10"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="350"
                className="w-full pl-12 pr-3 py-2 text-sm font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                autoFocus
                required
              />
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {PRESETS.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setDeliveryFee(String(amt))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    deliveryFee === String(amt)
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {amt === 0 ? 'Free' : amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Optional Note */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Note / Reason (Optional)
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Standard rate, free delivery promo..."
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSaving}
            disabled={count === 0 || isExceeded}
            className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-bold"
          >
            {isExceeded ? `Exceeds 20 Limit` : `Update ${count} Orders`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
