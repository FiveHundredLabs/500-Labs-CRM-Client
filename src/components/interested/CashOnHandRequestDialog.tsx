import React, { useState } from 'react';
import type { Order, Customer, User } from '../../models/domain';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { getProductSalesValue, getCodCharge, getAmountToCollect } from '../../utils/orderAmounts';
import { Banknote, Package, UserCheck, AlertCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { cashOnHandRepository } from '../../repositories/cashOnHandRepository';

export interface CashOnHandRequestDialogProps {
  isOpen: boolean;
  order: Order | null;
  customer: Customer | null;
  currentUser: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CashOnHandRequestDialog: React.FC<CashOnHandRequestDialogProps> = ({
  isOpen,
  order,
  customer,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [requestNotes, setRequestNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) return null;

  const pkgValue = getProductSalesValue(order);
  const deliveryCharge = getCodCharge(order);
  const currentCodAmount = getAmountToCollect(order);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setIsSubmitting(true);
    try {
      await cashOnHandRepository.requestCashOnHand(order.id, {
        requestNotes: requestNotes.trim() || undefined,
        deliveryCharge,
      });
      toast.success('Cash On Hand approval request submitted successfully!');
      setRequestNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit Cash On Hand request';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Request Cash On Hand Approval"
      description={`Order #${order.orderNumber} • ${customer?.fullName || 'Customer'}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Submitting for Admin Approval</p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              This request puts the order into <strong>Pending Admin Approval</strong>. The order will remain in
              the Prepared state, allocated stock will not move, and COD will not be cleared until an Admin approves it.
            </p>
          </div>
        </div>

        {/* Customer & Requester Meta */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Customer</span>
            <span className="font-medium text-slate-900">{customer?.fullName || 'Unknown'}</span>
            <span className="block text-slate-500 font-mono text-[11px]">{customer?.phone || 'No phone'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Requesting User</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-medium text-slate-900">{currentUser?.fullName || currentUser?.username || 'Current User'}</span>
            </div>
            <span className="text-[10px] text-slate-500 capitalize">{currentUser?.role?.replace('_', ' ').toLowerCase()}</span>
          </div>
        </div>

        {/* Package & Pricing Breakdown */}
        <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
          <div className="bg-slate-100/80 px-3 py-2 border-b border-slate-200 flex items-center justify-between font-semibold text-slate-700">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-600" />
              <span>Package & Price Breakdown</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">#{order.orderNumber}</span>
          </div>

          <div className="p-3 space-y-2 bg-white">
            {order.items && order.items.length > 0 ? (
              <div className="space-y-1.5 border-b border-slate-100 pb-2">
                {order.items.map((item, idx) => (
                  <div key={item.id || idx} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-700 font-medium">
                      {item.productName} <span className="text-slate-400">× {item.quantity}</span>
                    </span>
                    <span className="font-mono text-slate-600">
                      LKR {Number(item.subtotal || item.unitPrice * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-between items-center text-[11px] border-b border-slate-100 pb-2">
                <span className="text-slate-700 font-medium">{order.itemsDescription || 'Standard Package'}</span>
                <span className="font-mono text-slate-600">LKR {pkgValue.toLocaleString()}</span>
              </div>
            )}

            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Package Total:</span>
                <span className="font-mono font-medium text-slate-800">LKR {pkgValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge:</span>
                <span className="font-mono font-medium text-slate-800">LKR {deliveryCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Current COD Amount:</span>
                <span className="font-mono text-blue-700">LKR {currentCodAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Request Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Optional Request Note for Admin:</span>
          </label>
          <textarea
            value={requestNotes}
            onChange={(e) => setRequestNotes(e.target.value)}
            placeholder="Add context, reason for Cash On Hand handover, or special collection instructions..."
            rows={3}
            className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
          >
            <Banknote className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit COH Approval Request'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
