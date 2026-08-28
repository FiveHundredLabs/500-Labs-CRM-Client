import React, { useState, useEffect } from 'react';
import type { Order, Customer, OrderStatus, Product } from '../../models/domain';
import { productRepository } from '../../repositories';
import { Dialog } from '../ui/Dialog';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { AlertTriangle, Package, Check, ShieldAlert } from 'lucide-react';

export interface OrderItemDamageReport {
  productId?: string;
  productName: string;
  orderedQuantity: number;
  damagedQuantity: number;
  isDamaged: boolean;
  reason: string;
}

export interface OrderStatusChangeDialogProps {
  order: Order | null;
  defaultNewStatus: OrderStatus;
  customersMap: Record<string, Customer>;
  onClose: () => void;
  onConfirm: (
    targetOrder: Order,
    newStatus: OrderStatus,
    remark: string,
    damagedItems?: { productId?: string; productName: string; quantity: number; reason?: string }[]
  ) => Promise<boolean>;
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

  // Damaged Items Reporting State
  const [hasDamagedItems, setHasDamagedItems] = useState(false);
  const [orderDamageItems, setOrderDamageItems] = useState<OrderItemDamageReport[]>([]);
  const [teamProducts, setTeamProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!order) return;
    setTargetNewStatus(defaultNewStatus);
    setStatusRemark(order.remarks || '');
    // Default unchecked
    setHasDamagedItems(false);

    // Fetch team products to match items
    const fetchProducts = async () => {
      try {
        const prods = await productRepository.getAll();
        const teamProds = prods.filter((p) => p.teamId === order.teamId);
        setTeamProducts(teamProds);

        // Build list of items strictly from this order's dynamic OrderItems snapshot
        const items: OrderItemDamageReport[] = [];

        if (order.items && order.items.length > 0) {
          order.items.forEach((item) => {
            items.push({
              productId: item.productId,
              productName: item.productName || 'Team Product',
              orderedQuantity: item.quantity,
              damagedQuantity: item.quantity,
              isDamaged: false, // Default unchecked
              reason: 'Customer return - transit damage',
            });
          });
        } else if (order.adultQty || order.kidsQty) {
          if (order.adultQty && order.adultQty > 0) {
            const matchedProd = teamProds.find(
              (p) => p.name.toLowerCase().includes('adult') || p.category?.toLowerCase().includes('adult')
            );
            items.push({
              productId: matchedProd?.id,
              productName: matchedProd?.name || 'Adult Package',
              orderedQuantity: order.adultQty,
              damagedQuantity: order.adultQty,
              isDamaged: false,
              reason: 'Customer return - transit damage',
            });
          }
          if (order.kidsQty && order.kidsQty > 0) {
            const matchedProd = teamProds.find(
              (p) => p.name.toLowerCase().includes('kid') || p.category?.toLowerCase().includes('kid')
            );
            items.push({
              productId: matchedProd?.id,
              productName: matchedProd?.name || 'Kids Package',
              orderedQuantity: order.kidsQty,
              damagedQuantity: order.kidsQty,
              isDamaged: false,
              reason: 'Customer return - transit damage',
            });
          }
        }

        if (items.length === 0) {
          // Generic product item from description or first team product
          const fallbackName = order.itemsDescription || teamProds[0]?.name || 'Product';
          const matchedProd = teamProds.find((p) => p.name.toLowerCase() === fallbackName.toLowerCase()) || teamProds[0];
          items.push({
            productId: matchedProd?.id,
            productName: matchedProd?.name || fallbackName,
            orderedQuantity: 1,
            damagedQuantity: 1,
            isDamaged: false,
            reason: 'Customer return - defective / damaged',
          });
        }

        setOrderDamageItems(items);
      } catch {
        // Fallback gracefully
      }
    };

    fetchProducts();
  }, [order, defaultNewStatus]);

  if (!order) return null;

  const handleToggleItemDamage = (index: number) => {
    const updated = [...orderDamageItems];
    updated[index].isDamaged = !updated[index].isDamaged;
    setOrderDamageItems(updated);
  };

  const handleDamageQtyChange = (index: number, qty: number) => {
    const updated = [...orderDamageItems];
    const maxQty = updated[index].orderedQuantity;
    updated[index].damagedQuantity = Math.max(1, Math.min(maxQty, qty));
    setOrderDamageItems(updated);
  };

  const handleDamageReasonChange = (index: number, reason: string) => {
    const updated = [...orderDamageItems];
    updated[index].reason = reason;
    setOrderDamageItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingStatus(true);
    try {
      // Only include damage payload when status is REJECTED and checkbox is checked
      const damagedPayload =
        targetNewStatus === 'REJECTED' && hasDamagedItems
          ? orderDamageItems
              .filter((item) => item.isDamaged && item.damagedQuantity > 0)
              .map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.damagedQuantity,
                reason: item.reason || `Reported damaged on ${targetNewStatus} order #${order.orderNumber}`,
              }))
          : undefined;

      const success = await onConfirm(order, targetNewStatus, statusRemark, damagedPayload);
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
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
          <div>
            <div className="text-slate-500 font-medium">Order Number:</div>
            <div className="font-bold text-slate-900 font-mono text-sm">#{order.orderNumber}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 font-medium">Customer:</div>
            <div className="font-bold text-slate-900">{customer?.fullName || 'Customer'}</div>
          </div>
        </div>

        <Select
          label="New Target Status *"
          value={targetNewStatus}
          onChange={(e) => {
            const nextStatus = e.target.value as OrderStatus;
            setTargetNewStatus(nextStatus);
            if (nextStatus !== 'REJECTED') {
              setHasDamagedItems(false);
            }
          }}
          options={[
            { value: 'DELIVERED', label: '✅ Mark as DELIVERED' },
            { value: 'REJECTED', label: '❌ Mark as REJECTED (Courier Return / Refused)' },
          ]}
        />

        {/* Damaged Product Items in Order Selection Section - ONLY shown when status is REJECTED */}
        {targetNewStatus === 'REJECTED' && (
          <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs font-bold text-rose-950">
                  Customer Return / Transit Damage Reporting
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
                  Select only the products that were in this order that arrived damaged. These units will be quarantined into Damaged Stock.
                </p>

                <div className="space-y-2">
                  {orderDamageItems.map((item, idx) => (
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
                            (Ordered: {item.orderedQuantity} units)
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

                      {item.isDamaged && (
                        <div className="mt-2 pl-6">
                          <input
                            type="text"
                            placeholder="Damage reason (e.g. Courier dropped, broken seal, bottle leaking)..."
                            value={item.reason}
                            onChange={(e) => handleDamageReasonChange(idx, e.target.value)}
                            className="w-full text-[11px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            General Order Remarks / Courier Note
          </label>
          <textarea
            rows={2}
            value={statusRemark}
            onChange={(e) => setStatusRemark(e.target.value)}
            placeholder="e.g. Returned to hub due to broken item, or delivered successfully..."
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
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
                ? 'bg-emerald-600 hover:bg-emerald-700 font-bold'
                : 'bg-rose-600 hover:bg-rose-700 font-bold'
            }
          >
            Confirm Status Update
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
