import React, { useState, useEffect } from 'react';
import type { Order, Customer } from '../../models/domain';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { getProductSalesValue, getCodCharge } from '../../utils/orderAmounts';
import { Lock, Truck, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export interface EditDeliveryChargeDialogProps {
  isOpen: boolean;
  order: Order | null;
  customer: Customer | null;
  onClose: () => void;
  onSave: (orderId: string, codCharge: number, remarks?: string) => Promise<any>;
}

const COMMON_PRESETS = [0, 200, 250, 300, 350, 400, 450, 500];

export const EditDeliveryChargeDialog: React.FC<EditDeliveryChargeDialogProps> = ({
  isOpen,
  order,
  customer,
  onClose,
  onSave,
}) => {
  const [chargeInput, setChargeInput] = useState<string>('0');
  const [remarks, setRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (order) {
      const initialCharge = getCodCharge(order);
      setChargeInput(String(initialCharge));
      setRemarks('');
    }
  }, [order, isOpen]);

  if (!order) return null;

  const pkgValue = getProductSalesValue(order);
  const currentCharge = getCodCharge(order);
  const parsedCharge = parseFloat(chargeInput);
  const validCharge = Number.isFinite(parsedCharge) && parsedCharge >= 0 ? parsedCharge : 0;
  const newTotal = pkgValue + validCharge;
  const isChanged = validCharge !== currentCharge || remarks.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(parsedCharge) || parsedCharge < 0) {
      toast.error('Please enter a valid non-negative delivery charge.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(order.id, validCharge, remarks.trim() || undefined);
      onClose();
    } catch {
      // Error notification handled in caller
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Delivery Charge"
      description={`Customer: ${customer?.fullName || 'Customer'} • Order #${order.orderNumber}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Package Items & Price Section (Locked / Read-Only) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>📦 Package Items</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
              <Lock className="w-2.5 h-2.5 text-slate-400" />
              <span>Items Locked</span>
            </span>
          </div>

          <div className="text-xs font-semibold text-slate-800 bg-white border border-slate-200/80 rounded-lg p-2 flex items-center justify-between">
            <span className="truncate pr-2">{order.itemsDescription || 'Standard Package'}</span>
            <span className="font-mono text-slate-900 shrink-0 font-bold">
              LKR {pkgValue.toLocaleString()}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 italic">
            Package items, quantities, and item prices cannot be modified here.
          </p>
        </div>

        {/* Delivery / COD Charge Input (Editable) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Delivery / COD Charge (LKR)</span>
            </label>
            <span className="text-[11px] font-mono text-slate-500">
              Current: <strong className="text-slate-700">LKR {currentCharge.toLocaleString()}</strong>
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              LKR
            </span>
            <input
              type="number"
              min="0"
              step="10"
              value={chargeInput}
              onChange={(e) => setChargeInput(e.target.value)}
              placeholder="e.g. 350"
              className="w-full pl-12 pr-3 py-2 text-sm font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-hidden transition-all"
              autoFocus
              required
            />
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
            {COMMON_PRESETS.map((amt) => {
              const isSelected = validCharge === amt;
              return (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setChargeInput(String(amt))}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  {amt === 0 ? 'Free' : amt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Calculation Breakdown */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>Package Price:</span>
            <span className="font-mono">LKR {pkgValue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-emerald-800 font-medium">
            <span>Delivery Charge:</span>
            <span className="font-mono">+ LKR {validCharge.toLocaleString()}</span>
          </div>
          <div className="border-t border-emerald-200/80 pt-1.5 flex items-center justify-between font-bold text-slate-900 text-sm">
            <span>Total COD to Collect:</span>
            <span className="font-mono text-emerald-700 text-base">
              LKR {newTotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Optional Adjustment Reason / Remark */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3 text-slate-400" />
            <span>Adjustment Note / Reason (Optional)</span>
          </label>
          <input
            type="text"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Remote area courier fee, standard rate adjusted..."
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
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
            disabled={!isChanged && validCharge === currentCharge}
            className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
          >
            Save Delivery Charge
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
