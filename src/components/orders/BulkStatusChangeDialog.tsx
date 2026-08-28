import React, { useState, useEffect } from 'react';
import type { Order, OrderStatus, Product } from '../../models/domain';
import { productRepository } from '../../repositories';
import { Dialog } from '../ui/Dialog';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { AlertTriangle, Package, ShieldAlert } from 'lucide-react';

export interface BulkDamagedItemEntry {
  productId?: string;
  productName: string;
  orderNumber: string;
  orderedQuantity: number;
  damagedQuantity: number;
  isDamaged: boolean;
  reason: string;
}

export interface BulkStatusChangeDialogProps {
  isOpen: boolean;
  selectedCount: number;
  selectedOrders?: Order[];
  onClose: () => void;
  onConfirm: (
    bulkTargetStatus: OrderStatus,
    damagedPayload?: { productId?: string; productName: string; quantity: number; reason?: string }[]
  ) => Promise<boolean>;
}

export const BulkStatusChangeDialog: React.FC<BulkStatusChangeDialogProps> = ({
  isOpen,
  selectedCount,
  selectedOrders = [],
  onClose,
  onConfirm,
}) => {
  const [bulkTargetStatus, setBulkTargetStatus] = useState<OrderStatus>('DELIVERED');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Damage Reporting State
  const [reportDamages, setReportDamages] = useState(false);
  const [damageEntries, setDamageEntries] = useState<BulkDamagedItemEntry[]>([]);
  const [damageGlobalReason, setDamageGlobalReason] = useState('Broken package during transit...');

  useEffect(() => {
    if (!isOpen) return;
    setBulkTargetStatus('DELIVERED');
    setReportDamages(false);
    setDamageGlobalReason('Broken package during transit...');

    // Extract unique product items belonging to selected orders
    const fetchOrderProducts = async () => {
      try {
        const allProducts = await productRepository.getAll();
        const entries: BulkDamagedItemEntry[] = [];

        selectedOrders.forEach((order) => {
          const teamProds = allProducts.filter((p) => p.teamId === order.teamId);

          if (order.items && order.items.length > 0) {
            order.items.forEach((item) => {
              entries.push({
                productId: item.productId,
                productName: item.productName || 'Team Product',
                orderNumber: order.orderNumber,
                orderedQuantity: item.quantity,
                damagedQuantity: item.quantity,
                isDamaged: false, // Default unchecked
                reason: 'Customer return - transit damage',
              });
            });
          } else if (order.adultQty || order.kidsQty) {
            if (order.adultQty && order.adultQty > 0) {
              const matched = teamProds.find(
                (p) => p.name.toLowerCase().includes('adult') || p.category?.toLowerCase().includes('adult')
              );
              entries.push({
                productId: matched?.id,
                productName: matched?.name || 'Adult Package',
                orderNumber: order.orderNumber,
                orderedQuantity: order.adultQty,
                damagedQuantity: order.adultQty,
                isDamaged: false,
                reason: 'Customer return - transit damage',
              });
            }

            if (order.kidsQty && order.kidsQty > 0) {
              const matched = teamProds.find(
                (p) => p.name.toLowerCase().includes('kid') || p.category?.toLowerCase().includes('kid')
              );
              entries.push({
                productId: matched?.id,
                productName: matched?.name || 'Kids Package',
                orderNumber: order.orderNumber,
                orderedQuantity: order.kidsQty,
                damagedQuantity: order.kidsQty,
                isDamaged: false,
                reason: 'Customer return - transit damage',
              });
            }
          } else {
            const fallbackName = order.itemsDescription || teamProds[0]?.name || 'Product';
            const matched = teamProds.find((p) => p.name.toLowerCase() === fallbackName.toLowerCase()) || teamProds[0];
            entries.push({
              productId: matched?.id,
              productName: matched?.name || fallbackName,
              orderNumber: order.orderNumber,
              orderedQuantity: 1,
              damagedQuantity: 1,
              isDamaged: false,
              reason: 'Customer return - transit damage',
            });
          }
        });

        setDamageEntries(entries);
      } catch {
        // Fallback gracefully
      }
    };

    fetchOrderProducts();
  }, [isOpen, selectedOrders]);

  if (!isOpen) return null;

  const handleToggleEntry = (idx: number) => {
    const updated = [...damageEntries];
    updated[idx].isDamaged = !updated[idx].isDamaged;
    setDamageEntries(updated);
  };

  const handleEntryQtyChange = (idx: number, qty: number) => {
    const updated = [...damageEntries];
    const maxQty = updated[idx].orderedQuantity;
    updated[idx].damagedQuantity = Math.max(1, Math.min(maxQty, qty));
    setDamageEntries(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBulkUpdating(true);
    try {
      const damagedPayload =
        bulkTargetStatus === 'REJECTED' && reportDamages
          ? damageEntries
              .filter((item) => item.isDamaged && item.damagedQuantity > 0)
              .map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.damagedQuantity,
                reason: damageGlobalReason || item.reason || `Bulk ${bulkTargetStatus} return damage`,
              }))
          : undefined;

      const success = await onConfirm(bulkTargetStatus, damagedPayload);
      if (success) {
        onClose();
      }
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Only show damage option when status is REJECTED
  const isEligibleForDamage = bulkTargetStatus === 'REJECTED';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Status Change (${selectedCount} Order${selectedCount > 1 ? 's' : ''})`}
      description="Update the status of selected orders."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            Note: Select damaged items if products were returned broken or damaged in courier transit.
          </span>
        </div>

        <Select
          label="New Status for Selected Orders *"
          value={bulkTargetStatus}
          onChange={(e) => {
            const val = e.target.value as OrderStatus;
            setBulkTargetStatus(val);
            if (val !== 'REJECTED') {
              setReportDamages(false);
            }
          }}
          options={[
            { value: 'DELIVERED', label: 'Mark as DELIVERED' },
            { value: 'REJECTED', label: 'Mark as REJECTED' },
            { value: 'DISPATCHED', label: 'Mark as DISPATCHED' },
          ]}
        />

        {/* Conditional Damage Reporting Section */}
        {isEligibleForDamage && (
          <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-rose-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportDamages}
                  onChange={(e) => setReportDamages(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <span>[x] Report Damaged Products / Items</span>
              </label>
            </div>

            {reportDamages && (
              <div className="space-y-3 pt-2 border-t border-rose-200/80">
                <div className="p-2.5 bg-white border border-rose-200 rounded-lg space-y-2">
                  <div className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                    <span>
                      Select Damaged Items from {selectedOrders.length > 0 ? selectedOrders.map((o) => `#${o.orderNumber}`).join(', ') : `${selectedCount} Orders`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal font-sans">
                      Only items in selected orders shown
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {damageEntries.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded border text-xs ${
                          item.isDamaged ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                          <input
                            type="checkbox"
                            checked={item.isDamaged}
                            onChange={() => handleToggleEntry(idx)}
                            className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500"
                          />
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {item.productName} (Qty: {item.orderedQuantity})
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">#{item.orderNumber}</span>
                        </label>

                        {item.isDamaged && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-500">Damage Qty:</span>
                            <input
                              type="number"
                              min={1}
                              max={item.orderedQuantity}
                              value={item.damagedQuantity}
                              onChange={(e) => handleEntryQtyChange(idx, parseInt(e.target.value) || 1)}
                              className="w-12 px-1.5 py-0.5 bg-white border border-rose-300 rounded font-mono font-bold text-xs text-rose-900 text-center"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Damage Reason / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={damageGlobalReason}
                    onChange={(e) => setDamageGlobalReason(e.target.value)}
                    placeholder="Broken package during transit..."
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isBulkUpdating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isBulkUpdating}
          >
            Apply Status Change
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

