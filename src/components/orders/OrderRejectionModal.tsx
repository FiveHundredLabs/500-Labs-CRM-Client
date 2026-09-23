import React, { useState, useEffect, useMemo } from 'react';
import type { Order, Customer, Product, OrderRejectionDamagedItem } from '../../models/domain';
import { productRepository, orderRejectionRepository } from '../../repositories';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { AlertTriangle, Package, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react';
import { format, differenceInHours, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

export interface OrderRejectionModalProps {
  order: Order | null;
  customer?: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemDamageState {
  productId?: string;
  productName: string;
  orderedQuantity: number;
  damagedQuantity: number;
  isDamaged: boolean;
  reason: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const OrderRejectionModal: React.FC<OrderRejectionModalProps> = ({
  order,
  customer,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [hasDamagedItems, setHasDamagedItems] = useState(false);
  const [damageItems, setDamageItems] = useState<ItemDamageState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Window Countdown Calculation
  const reviewWindow = useMemo(() => {
    if (!order) return { isExpired: false, text: '' };
    const deliveredTime = order.deliveredAt
      ? new Date(order.deliveredAt).getTime()
      : new Date(order.updatedAt).getTime();
    const expiryTime = deliveredTime + SEVEN_DAYS_MS;
    const now = Date.now();
    const remainingMs = expiryTime - now;

    if (remainingMs <= 0) {
      return { isExpired: true, text: 'Review period expired' };
    }

    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    let text = '';
    if (days > 0) {
      text = `${days}d ${hours}h remaining`;
    } else {
      text = `${hours}h remaining`;
    }
    return { isExpired: false, text };
  }, [order]);

  useEffect(() => {
    if (!order) return;
    setReason('');
    setHasDamagedItems(false);

    // Resolve items for damage reporting
    const loadItems = async () => {
      try {
        const prods = await productRepository.getAll();
        const teamProds = prods.filter((p) => p.teamId === order.teamId);
        const resolved: ItemDamageState[] = [];

        if (order.items && order.items.length > 0) {
          order.items.forEach((it) => {
            resolved.push({
              productId: it.productId,
              productName: it.productName || 'Order Product',
              orderedQuantity: it.quantity,
              damagedQuantity: it.quantity,
              isDamaged: false,
              reason: 'Customer return - delivered item damaged',
            });
          });
        } else if (order.adultQty || order.kidsQty) {
          if (order.adultQty && order.adultQty > 0) {
            const matchedProd = teamProds.find(
              (p) => p.name.toLowerCase().includes('adult') || p.category?.toLowerCase().includes('adult'),
            );
            resolved.push({
              productId: matchedProd?.id,
              productName: matchedProd?.name || 'Adult Package',
              orderedQuantity: order.adultQty,
              damagedQuantity: order.adultQty,
              isDamaged: false,
              reason: 'Customer return - delivered item damaged',
            });
          }
          if (order.kidsQty && order.kidsQty > 0) {
            const matchedProd = teamProds.find(
              (p) => p.name.toLowerCase().includes('kid') || p.category?.toLowerCase().includes('kid'),
            );
            resolved.push({
              productId: matchedProd?.id,
              productName: matchedProd?.name || 'Kids Package',
              orderedQuantity: order.kidsQty,
              damagedQuantity: order.kidsQty,
              isDamaged: false,
              reason: 'Customer return - delivered item damaged',
            });
          }
        }

        if (resolved.length === 0) {
          const fallbackName = order.itemsDescription || teamProds[0]?.name || 'Product Item';
          const matchedProd =
            teamProds.find((p) => p.name.toLowerCase() === fallbackName.toLowerCase()) || teamProds[0];
          resolved.push({
            productId: matchedProd?.id,
            productName: matchedProd?.name || fallbackName,
            orderedQuantity: 1,
            damagedQuantity: 1,
            isDamaged: false,
            reason: 'Customer return - defective or transit damage',
          });
        }

        setDamageItems(resolved);
      } catch {
        // Fallback gracefully
      }
    };

    loadItems();
  }, [order]);

  if (!order) return null;

  const handleToggleItemDamage = (index: number) => {
    const updated = [...damageItems];
    updated[index].isDamaged = !updated[index].isDamaged;
    setDamageItems(updated);
  };

  const handleDamageQtyChange = (index: number, qty: number) => {
    const updated = [...damageItems];
    const maxQty = updated[index].orderedQuantity;
    updated[index].damagedQuantity = Math.max(1, Math.min(maxQty, qty));
    setDamageItems(updated);
  };

  const handleDamageReasonChange = (index: number, r: string) => {
    const updated = [...damageItems];
    updated[index].reason = r;
    setDamageItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason for the rejection request.');
      return;
    }

    if (reviewWindow.isExpired) {
      toast.error('The 7-day review period for this delivered order has expired.');
      return;
    }

    setIsSubmitting(true);
    try {
      const damagedPayload: OrderRejectionDamagedItem[] | undefined = hasDamagedItems
        ? damageItems
            .filter((item) => item.isDamaged && item.damagedQuantity > 0)
            .map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.damagedQuantity,
              reason: item.reason || `Reported damaged on delivered order rejection #${order.orderNumber}`,
            }))
        : undefined;

      await orderRejectionRepository.create(order.id, {
        reason: reason.trim(),
        damagedItems: damagedPayload,
      });

      toast.success('Delivered order rejection submitted to Admin for approval!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit rejection request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deliveredDateStr = order.deliveredAt
    ? format(new Date(order.deliveredAt), 'MMM dd, yyyy h:mm a')
    : order.updatedAt
    ? format(new Date(order.updatedAt), 'MMM dd, yyyy')
    : 'Recently';

  return (
    <Dialog
      isOpen={!!order}
      onClose={onClose}
      title={`Reject Delivered Order: #${order.orderNumber}`}
      description="Submit a delivered order rejection request for Admin review and approval"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order Details Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-slate-500 font-medium">Order Number:</div>
            <div className="font-bold text-slate-900 font-mono text-sm">#{order.orderNumber}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              Delivered: <span className="font-medium text-slate-700">{deliveredDateStr}</span>
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-slate-500 font-medium">Customer:</div>
            <div className="font-bold text-slate-900">{customer?.fullName || 'Customer'}</div>
            <div className="mt-1 flex items-center gap-1 sm:justify-end">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span
                className={`text-[11px] font-bold ${
                  reviewWindow.isExpired ? 'text-rose-600' : 'text-amber-700'
                }`}
              >
                {reviewWindow.text}
              </span>
            </div>
          </div>
        </div>

        {/* Informative Isolation Banner */}
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Admin Approval Flow</div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              This order will remain marked as <strong className="font-semibold">DELIVERED</strong> with a{' '}
              <span className="font-semibold text-amber-700">"Rejection Pending"</span> badge until an Admin reviews and approves it. Existing sales reports and delivery analytics will not be prematurely disrupted.
            </p>
          </div>
        </div>

        {/* Reason Textarea (Required) */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Rejection Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this delivered order is being rejected (e.g. Customer returned items, wrong parcel delivered, courier dispute, payment bounced)..."
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"
            required
          />
        </div>

        {/* Optional Damaged Goods Section */}
        <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs font-bold text-rose-950">
                Item-Level Damage Report (Optional)
              </span>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-rose-900 cursor-pointer">
              <input
                type="checkbox"
                checked={hasDamagedItems}
                onChange={(e) => setHasDamagedItems(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span>Report Damaged Goods</span>
            </label>
          </div>

          {hasDamagedItems && (
            <div className="space-y-2.5 pt-2 border-t border-rose-200/80">
              <p className="text-[11px] text-rose-800 font-medium">
                Distinguish damaged items from restockable goods. Upon Admin approval, damaged units will move to Damaged Stock while undamaged goods will be restored to Current Stock.
              </p>

              <div className="space-y-2">
                {damageItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border transition-all text-xs ${
                      item.isDamaged
                        ? 'bg-white border-rose-300 shadow-2xs'
                        : 'bg-rose-50/40 border-rose-200/60 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900">
                        <input
                          type="checkbox"
                          checked={item.isDamaged}
                          onChange={() => handleToggleItemDamage(idx)}
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                        <Package className="w-4 h-4 text-slate-500" />
                        <span>{item.productName}</span>
                        <span className="text-[11px] font-normal text-slate-500 font-mono">
                          (Delivered: {item.orderedQuantity} units)
                        </span>
                      </label>

                      {item.isDamaged && (
                        <div className="flex items-center gap-2 pl-6 sm:pl-0">
                          <label className="text-[11px] font-semibold text-slate-600">Damaged Qty:</label>
                          <input
                            type="number"
                            min={1}
                            max={item.orderedQuantity}
                            value={item.damagedQuantity}
                            onChange={(e) => handleDamageQtyChange(idx, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 bg-rose-50 border border-rose-300 rounded font-mono font-bold text-xs text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      )}
                    </div>

                    {item.isDamaged ? (
                      <>
                        <div className="mt-1.5 pl-6 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold font-mono">
                            {item.damagedQuantity} to Damaged Stock
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold font-mono">
                            {item.orderedQuantity - item.damagedQuantity} to Available Stock
                          </span>
                        </div>
                        <div className="mt-2 pl-6">
                          <input
                            type="text"
                            placeholder="Damage reason (e.g. Broken packaging, opened seal, leaked)..."
                            value={item.reason}
                            onChange={(e) => handleDamageReasonChange(idx, e.target.value)}
                            className="w-full text-[11px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 pl-6 text-[11px] text-slate-500 font-medium">
                        All {item.orderedQuantity} units will return to Available Stock
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            isLoading={isSubmitting}
            disabled={reviewWindow.isExpired || !reason.trim()}
            className="bg-rose-600 hover:bg-rose-700 font-bold"
          >
            Submit Rejection Request
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
