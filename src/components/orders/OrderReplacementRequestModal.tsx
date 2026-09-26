import React, { useState, useEffect, useMemo } from 'react';
import type { Order, Customer, Product, DeliveryMethod } from '../../models/domain';
import { productRepository, replacementRepository } from '../../repositories';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import {
  RotateCcw,
  Package,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Truck,
  Mail,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export interface OrderReplacementRequestModalProps {
  order: Order | null;
  customer?: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemReplacementState {
  productId?: string;
  productName: string;
  orderedQuantity: number;
  replacementQuantity: number;
  isSelected: boolean;
  reason: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const OrderReplacementRequestModal: React.FC<OrderReplacementRequestModalProps> = ({
  order,
  customer,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [damageDescription, setDamageDescription] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('POST');
  const [items, setItems] = useState<ItemReplacementState[]>([]);
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
      return { isExpired: true, text: '7-day window expired (Admin override required)' };
    }

    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    let text = '';
    if (days > 0) {
      text = `${days}d ${hours}h review window remaining`;
    } else {
      text = `${hours}h review window remaining`;
    }
    return { isExpired: false, text };
  }, [order]);

  useEffect(() => {
    if (!order) return;
    setDamageDescription('');
    setDeliveryFee(0);
    setDeliveryMethod(order.deliveryMethod || 'POST');

    const loadItems = async () => {
      try {
        const prods = await productRepository.getAll();
        const teamProds = prods.filter((p) => p.teamId === order.teamId);
        const resolved: ItemReplacementState[] = [];

        if (order.items && order.items.length > 0) {
          order.items.forEach((it) => {
            resolved.push({
              productId: it.productId,
              productName: it.productName || 'Order Product',
              orderedQuantity: it.quantity,
              replacementQuantity: 1,
              isSelected: true, // Default select the item
              reason: 'Damaged upon delivery / defective',
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
              replacementQuantity: 1,
              isSelected: true,
              reason: 'Damaged upon delivery / defective',
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
              replacementQuantity: 1,
              isSelected: true,
              reason: 'Damaged upon delivery / defective',
            });
          }
        }

        setItems(resolved);
      } catch {
        setItems([]);
      }
    };

    loadItems();
  }, [order]);

  const selectedItems = items.filter((it) => it.isSelected);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (!damageDescription.trim()) {
      toast.error('Please enter a detailed description of the damage reported by the customer.');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to replace.');
      return;
    }

    for (const item of selectedItems) {
      if (!item.productId) {
        toast.error(`Product "${item.productName}" is missing a catalog product ID.`);
        return;
      }
      if (item.replacementQuantity <= 0 || item.replacementQuantity > item.orderedQuantity) {
        toast.error(`Invalid replacement quantity for "${item.productName}". Must be between 1 and ${item.orderedQuantity}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await replacementRepository.create(order.id, {
        damageDescription: damageDescription.trim(),
        deliveryFee: Number(deliveryFee) || 0,
        deliveryMethod,
        items: selectedItems.map((it) => ({
          productId: it.productId!,
          productName: it.productName,
          quantity: it.replacementQuantity,
          reason: it.reason.trim(),
        })),
      });

      toast.success(
        `Replacement request submitted for Order #${order.orderNumber}. Awaiting Admin review in Approvals Center.`,
        { duration: 5000 },
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit replacement request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog
      isOpen={Boolean(order)}
      onClose={onClose}
      title="Request Product Replacement"
      description={`Submit damaged product replacement for delivered order #${order.orderNumber}`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header Alert / 7-Day Window Status */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
            reviewWindow.isExpired
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{reviewWindow.text}</span>
          </div>
          {reviewWindow.isExpired && !isAdmin && (
            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
              Supervisor Window Expired
            </span>
          )}
        </div>

        {/* Original Order Summary Box */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Customer:</span>
            <strong className="text-slate-900">{customer?.fullName || order.customer?.fullName || 'Customer'}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Phone:</span>
            <span className="font-mono font-bold text-slate-800">{customer?.phone || order.customer?.phone || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Original Order:</span>
            <span className="font-mono text-slate-700">#{order.orderNumber} ({format(new Date(order.createdAt), 'MMM dd, yyyy')})</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-1">
            <span className="text-slate-500 font-medium">Status Policy:</span>
            <span className="text-emerald-700 font-semibold">Original order remains DELIVERED (Revenue &amp; Payment preserved)</span>
          </div>
        </div>

        {/* Items to Replace Stepper Checklist */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Select Damaged Items to Replace <span className="text-rose-500">*</span>
          </label>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                  item.isSelected
                    ? 'border-indigo-300 bg-indigo-50/40'
                    : 'border-slate-200 bg-white opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900">
                    <input
                      type="checkbox"
                      checked={item.isSelected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, isSelected: checked } : it)),
                        );
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Package className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{item.productName}</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Purchased: {item.orderedQuantity} unit(s)
                  </span>
                </div>

                {item.isSelected && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-indigo-100">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Replacement Quantity:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={item.orderedQuantity}
                          value={item.replacementQuantity}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(item.orderedQuantity, parseInt(e.target.value, 10) || 1));
                            setItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, replacementQuantity: val } : it)),
                            );
                          }}
                          className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 font-bold"
                        />
                        <span className="text-[11px] text-slate-400">of {item.orderedQuantity}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                        Defect Details:
                      </label>
                      <input
                        type="text"
                        value={item.reason}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, reason: val } : it)),
                          );
                        }}
                        placeholder="e.g. Broken seal, cracked bottle"
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Damage Description Input */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-800">
            Damage Description &amp; Customer Notes <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            value={damageDescription}
            onChange={(e) => setDamageDescription(e.target.value)}
            placeholder="Describe the condition reported by customer, why it was broken, photos verified, etc."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
            required
          />
        </div>

        {/* Delivery Options & Shipping Fee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              Delivery Method
            </label>
            <select
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500"
            >
              <option value="POST">Postal Service (Registered Post)</option>
              <option value="ROYAL_COURIER">Royal Courier</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Shipping Fee Charged (LKR)
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                step="50"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-bold"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {deliveryFee === 0 ? '✓ Free Replacement (LKR 0 product & shipping)' : `Customer pays LKR ${deliveryFee} courier fee upon delivery`}
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || selectedItems.length === 0}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Replacement Request'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
