import React, { useState, useEffect, useMemo } from 'react';
import type { Order, Customer } from '../../models/domain';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { getProductSalesValue, getCodCharge } from '../../utils/orderAmounts';
import { Truck, AlertCircle, X } from 'lucide-react';
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
  const [activeItems, setActiveItems] = useState<BulkEditOrderLeadItem[]>([]);
  const [chargeInputs, setChargeInputs] = useState<Record<string, string>>({});
  const [bulkAmount, setBulkAmount] = useState<string>('350');
  const [remarks, setRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveItems(items);
      const initialMap: Record<string, string> = {};
      items.forEach((it) => {
        initialMap[it.order.id] = String(getCodCharge(it.order));
      });
      setChargeInputs(initialMap);
      setRemarks('');
      setBulkAmount('350');
    }
  }, [isOpen, items]);

  const count = activeItems.length;
  const isExceeded = count > MAX_LIMIT;

  // Apply amount to all active items
  const handleApplyToAll = (amount: number | string) => {
    const val = String(amount);
    setBulkAmount(val);
    const updated: Record<string, string> = {};
    activeItems.forEach((it) => {
      updated[it.order.id] = val;
    });
    setChargeInputs(updated);
  };

  // Remove single row from batch
  const handleRemove = (orderId: string) => {
    setActiveItems((prev) => prev.filter((it) => it.order.id !== orderId));
  };

  // Live aggregate calculations
  const { totalDelivery, totalCod } = useMemo(() => {
    let deliverySum = 0;
    let pkgSum = 0;

    activeItems.forEach((it) => {
      const pkg = getProductSalesValue(it.order);
      const raw = parseFloat(chargeInputs[it.order.id] ?? '0');
      const valid = Number.isFinite(raw) && raw >= 0 ? raw : 0;
      pkgSum += pkg;
      deliverySum += valid;
    });

    return {
      totalDelivery: deliverySum,
      totalCod: pkgSum + deliverySum,
    };
  }, [activeItems, chargeInputs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (count === 0) {
      toast.error('No orders to update.');
      return;
    }

    if (isExceeded) {
      toast.error(`Maximum ${MAX_LIMIT} orders allowed. Please remove ${count - MAX_LIMIT} orders.`);
      return;
    }

    const updates: { orderId: string; codCharge: number; remarks?: string }[] = [];
    for (const it of activeItems) {
      const raw = parseFloat(chargeInputs[it.order.id] ?? '0');
      if (!Number.isFinite(raw) || raw < 0) {
        toast.error(`Invalid delivery charge for #${it.order.orderNumber}`);
        return;
      }
      updates.push({
        orderId: it.order.id,
        codCharge: raw,
        remarks: remarks.trim() || undefined,
      });
    }

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
      title="Edit Delivery Amount"
      description={`Update delivery charges for ${count} selected order${count === 1 ? '' : 's'}`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Limit Warning (only shows if > 20) */}
        {isExceeded && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Limit Exceeded:</strong> Max {MAX_LIMIT} orders allowed. Please remove{' '}
                <strong>{count - MAX_LIMIT}</strong> order(s) below.
              </span>
            </div>
            <span className="font-bold bg-rose-200/80 px-2 py-0.5 rounded-full text-[11px]">
              {count} / {MAX_LIMIT}
            </span>
          </div>
        )}

        {/* Clean Hero Input Section */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Delivery Fee (LKR)</span>
            </label>
            <span className="text-[11px] text-slate-500">
              Applies to all {count} orders
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                LKR
              </span>
              <input
                type="number"
                min="0"
                step="10"
                value={bulkAmount}
                onChange={(e) => handleApplyToAll(e.target.value)}
                placeholder="350"
                className="w-full pl-12 pr-3 py-2 text-sm font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1">
              {PRESETS.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => handleApplyToAll(amt)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    bulkAmount === String(amt)
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

        {/* Selected Orders List */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
            <span>Selected Orders ({count})</span>
            <span>Package + Delivery = Total COD</span>
          </div>

          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-64 overflow-y-auto bg-white shadow-2xs">
            {count === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No orders in batch
              </div>
            ) : (
              activeItems.map((item, idx) => {
                const { customer, order } = item;
                const pkgValue = getProductSalesValue(order);
                const currentValStr = chargeInputs[order.id] ?? '0';
                const parsedVal = parseFloat(currentValStr);
                const validVal = Number.isFinite(parsedVal) && parsedVal >= 0 ? parsedVal : 0;
                const rowTotal = pkgValue + validVal;

                return (
                  <div
                    key={order.id}
                    className="px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Customer & Order */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {idx + 1}. {customer.fullName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                          #{order.orderNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {customer.phone} {customer.district ? `• ${customer.district}` : ''}
                      </div>
                    </div>

                    {/* Pricing Breakdown: Package + Delivery = COD */}
                    <div className="flex items-center gap-2.5 shrink-0 text-xs">
                      {/* Package Value (Locked) */}
                      <span className="font-mono text-slate-500 text-[11px] hidden sm:inline" title="Package Price">
                        LKR {pkgValue.toLocaleString()}
                      </span>

                      <span className="text-slate-300 hidden sm:inline">+</span>

                      {/* Delivery Input */}
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          LKR
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={currentValStr}
                          onChange={(e) => {
                            const val = e.target.value;
                            setChargeInputs((prev) => ({ ...prev, [order.id]: val }));
                          }}
                          className="w-full pl-8 pr-1.5 py-1 text-xs font-mono font-bold text-slate-900 bg-slate-50/80 border border-slate-200 rounded-md focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <span className="text-slate-300">=</span>

                      {/* Total COD */}
                      <span className="font-mono font-bold text-emerald-700 w-24 text-right">
                        LKR {rowTotal.toLocaleString()}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(order.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Remove from batch"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Optional Note */}
        <div>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add note / reason (optional)"
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-700 placeholder:text-slate-400"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-xs">
            <span className="text-slate-500">Total COD: </span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              LKR {totalCod.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 ml-1.5">
              (incl. LKR {totalDelivery.toLocaleString()} delivery)
            </span>
          </div>

          <div className="flex items-center gap-2">
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
        </div>
      </form>
    </Dialog>
  );
};
