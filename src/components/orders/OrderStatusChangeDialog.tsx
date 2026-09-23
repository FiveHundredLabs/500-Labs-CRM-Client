import React, { useState, useEffect, useMemo } from 'react';
import type { Order, Customer, OrderStatus, Product } from '../../models/domain';
import { productRepository, orderRejectionRepository } from '../../repositories';
import { useAuth } from '../../hooks/useAuth';
import { Dialog } from '../ui/Dialog';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { AlertTriangle, Package, Check, ShieldAlert, Clock, Info } from 'lucide-react';
import toast from 'react-hot-toast';

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
  onRejectionSubmitted?: () => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const OrderStatusChangeDialog: React.FC<OrderStatusChangeDialogProps> = ({
  order,
  defaultNewStatus,
  customersMap,
  onClose,
  onConfirm,
  onRejectionSubmitted,
}) => {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'SUPERVISOR';
  const isCurrentlyDelivered = order?.status === 'DELIVERED';
  const isCurrentlyRejected = order?.status === 'REJECTED';
  const isCurrentlyDispatched = order?.status === 'DISPATCHED';

  const reviewWindow = useMemo(() => {
    if (!order || (!isCurrentlyDelivered && !isCurrentlyRejected)) return { isExpired: false, text: '' };
    const statusTime = isCurrentlyDelivered
      ? (order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.updatedAt).getTime())
      : (order.rejectedAt ? new Date(order.rejectedAt).getTime() : new Date(order.updatedAt).getTime());
    const remainingMs = statusTime + SEVEN_DAYS_MS - Date.now();
    if (remainingMs <= 0) {
      return { isExpired: true, text: '7-day review period expired' };
    }
    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return {
      isExpired: false,
      text: days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`,
    };
  }, [order, isCurrentlyDelivered, isCurrentlyRejected]);

  const activeRejection =
    order?.rejectionRequests?.find((r) => r.status === 'PENDING') ||
    (order?.activeRejectionRequest?.status === 'PENDING' ? order.activeRejectionRequest : null);
  const latestRejection = order?.rejectionRequests?.[0] || order?.activeRejectionRequest;
  const isRejectionDeclined = !activeRejection && latestRejection?.status === 'REJECTED';

  const initialTargetStatus = useMemo<OrderStatus>(() => {
    if (!order) return defaultNewStatus;
    if (defaultNewStatus && defaultNewStatus !== order.status) return defaultNewStatus;
    if (order.status === 'DISPATCHED') return 'DELIVERED';
    if (order.status === 'DELIVERED') return 'REJECTED';
    if (order.status === 'REJECTED') return 'DELIVERED';
    return defaultNewStatus;
  }, [order, defaultNewStatus]);

  const [targetNewStatus, setTargetNewStatus] = useState<OrderStatus>(initialTargetStatus);
  const [statusRemark, setStatusRemark] = useState(order?.remarks || '');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Damaged Items Reporting State
  const [hasDamagedItems, setHasDamagedItems] = useState(false);
  const [orderDamageItems, setOrderDamageItems] = useState<OrderItemDamageReport[]>([]);
  const [teamProducts, setTeamProducts] = useState<Product[]>([]);

  const requiresAdminApproval = useMemo(() => {
    if (!order) return false;
    if (isCurrentlyDelivered && (targetNewStatus === 'REJECTED' || targetNewStatus === 'DISPATCHED')) return true;
    if (isCurrentlyRejected && (targetNewStatus === 'DELIVERED' || targetNewStatus === 'DISPATCHED')) return true;
    return false;
  }, [order, isCurrentlyDelivered, isCurrentlyRejected, targetNewStatus]);

  const availableStatusOptions = useMemo(() => {
    if (!order) return [];
    if (order.status === 'DISPATCHED') {
      return [
        { value: 'DELIVERED', label: '✅ Mark as DELIVERED (Direct)' },
        { value: 'REJECTED', label: '❌ Mark as REJECTED (Direct)' },
      ];
    }
    if (order.status === 'DELIVERED') {
      return [
        {
          value: 'REJECTED',
          label: isSupervisor
            ? reviewWindow.isExpired
              ? '❌ Move to REJECTED (Locked - 7 Days Expired)'
              : activeRejection
              ? '❌ Move to REJECTED (Pending Admin Approval)'
              : '❌ Move to REJECTED (Requires Admin Approval)'
            : '❌ Mark as REJECTED',
        },
        {
          value: 'DISPATCHED',
          label: isSupervisor
            ? reviewWindow.isExpired
              ? '🚚 Move to DISPATCH (Locked - 7 Days Expired)'
              : activeRejection
              ? '🚚 Move to DISPATCH (Pending Admin Approval)'
              : '🚚 Move to DISPATCH (Requires Admin Approval)'
            : '🚚 Mark as DISPATCHED',
        },
      ];
    }
    if (order.status === 'REJECTED') {
      return [
        {
          value: 'DELIVERED',
          label: isSupervisor
            ? reviewWindow.isExpired
              ? '✅ Move to DELIVERED (Locked - 7 Days Expired)'
              : activeRejection
              ? '✅ Move to DELIVERED (Pending Admin Approval)'
              : '✅ Move to DELIVERED (Requires Admin Approval)'
            : '✅ Mark as DELIVERED',
        },
        {
          value: 'DISPATCHED',
          label: isSupervisor
            ? reviewWindow.isExpired
              ? '🚚 Move to DISPATCH (Locked - 7 Days Expired)'
              : activeRejection
              ? '🚚 Move to DISPATCH (Pending Admin Approval)'
              : '🚚 Move to DISPATCH (Requires Admin Approval)'
            : '🚚 Mark as DISPATCHED',
        },
      ];
    }
    return [
      { value: 'DELIVERED', label: 'Mark as DELIVERED' },
      { value: 'REJECTED', label: 'Mark as REJECTED' },
      { value: 'DISPATCHED', label: 'Mark as DISPATCHED' },
    ];
  }, [order, isSupervisor, reviewWindow.isExpired, activeRejection]);

  useEffect(() => {
    if (!order) return;
    setTargetNewStatus(initialTargetStatus);
    if ((isCurrentlyDelivered || isCurrentlyRejected) && requiresAdminApproval) {
      setStatusRemark('');
    } else {
      setStatusRemark(order.remarks || '');
    }
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
  }, [order, initialTargetStatus]);

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
      // Only include damage payload when target or origin is REJECTED and checkbox is checked
      const damagedPayload =
        (targetNewStatus === 'REJECTED' || order.status === 'REJECTED') && hasDamagedItems
          ? orderDamageItems
              .filter((item) => item.isDamaged && item.damagedQuantity > 0)
              .map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.damagedQuantity,
                reason: item.reason || `Reported damaged on ${targetNewStatus} order #${order.orderNumber}`,
              }))
          : undefined;

      // Intercept for Supervisor modifying a DELIVERED or REJECTED order requiring Admin Approval
      if (isSupervisor && requiresAdminApproval) {
        if (reviewWindow.isExpired) {
          toast.error(
            `The 7-day review period for this ${order.status.toLowerCase()} order has expired. Modifications or status changes are locked.`,
          );
          return;
        }

        if (activeRejection) {
          toast.error('A status change request is already pending review for this order.');
          return;
        }

        if (!statusRemark.trim()) {
          toast.error('Please provide a reason for the status change request.');
          return;
        }

        await orderRejectionRepository.create(order.id, {
          fromStatus: order.status,
          toStatus: targetNewStatus,
          reason: statusRemark.trim(),
          damagedItems: damagedPayload,
        });

        toast.success(`Order status change request (${order.status} → ${targetNewStatus}) submitted to Admin for approval!`);
        onRejectionSubmitted?.();
        onClose();
        return;
      }

      const success = await onConfirm(order, targetNewStatus, statusRemark, damagedPayload);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Status transition failed.');
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
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-slate-500 font-medium">Order Number:</div>
            <div className="font-bold text-slate-900 font-mono text-sm">#{order.orderNumber}</div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              Current Status: <span className="font-bold text-slate-800">{order.status}</span>
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-slate-500 font-medium">Customer:</div>
            <div className="font-bold text-slate-900">{customer?.fullName || 'Customer'}</div>
            {(isCurrentlyDelivered || isCurrentlyRejected) && (
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
            )}
          </div>
        </div>

        {/* Informative Banners for Supervisor Modifying Delivered / Rejected Orders */}
        {(isCurrentlyDelivered || isCurrentlyRejected) && isSupervisor && (
          reviewWindow.isExpired ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Review Period Expired (Locked)</div>
                <p className="text-[11px] text-rose-800 mt-0.5">
                  The 7-day review period for this {order.status.toLowerCase()} order has expired. Modifications and status transitions are locked.
                </p>
              </div>
            </div>
          ) : activeRejection ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Status Change Pending Admin Approval</div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  A status transition request ({activeRejection.fromStatus || order.status} → {activeRejection.toStatus || 'REJECTED'}) is already pending Admin review. The order remains {order.status} until Admin approval.
                </p>
              </div>
            </div>
          ) : requiresAdminApproval ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Moving this {order.status.toLowerCase()} order to {targetNewStatus} requires Admin approval</div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Submitting will create an approval request sent to the Admin review queue. The order will remain {order.status} until the Admin approves the request.
                </p>
              </div>
            </div>
          ) : null
        )}

        <Select
          label="New Target Status *"
          value={targetNewStatus}
          onChange={(e) => {
            const nextStatus = e.target.value as OrderStatus;
            setTargetNewStatus(nextStatus);
            if (nextStatus === 'REJECTED') {
              if ((isCurrentlyDelivered || isCurrentlyRejected) && isSupervisor && statusRemark === (order.remarks || '')) {
                setStatusRemark('');
              }
            } else {
              setHasDamagedItems(false);
              if ((isCurrentlyDelivered || isCurrentlyRejected) && isSupervisor && statusRemark === '') {
                setStatusRemark(order.remarks || '');
              }
            }
          }}
          options={availableStatusOptions}
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
                              placeholder="Damage reason (e.g. Courier dropped, broken seal, bottle leaking)..."
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
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {requiresAdminApproval && isSupervisor ? (
              <>
                Reason for Status Change Request <span className="text-rose-500">*</span>
              </>
            ) : (
              'General Order Remarks / Courier Note'
            )}
          </label>
          <textarea
            rows={2}
            value={statusRemark}
            onChange={(e) => setStatusRemark(e.target.value)}
            placeholder={
              requiresAdminApproval && isSupervisor
                ? `Explain why this ${order.status.toLowerCase()} order should be moved to ${targetNewStatus} (requires Admin review)...`
                : 'e.g. Returned to hub due to broken item, or delivered successfully...'
            }
            required={requiresAdminApproval && isSupervisor}
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
            disabled={
              isUpdatingStatus ||
              (isSupervisor &&
                requiresAdminApproval &&
                (reviewWindow.isExpired || Boolean(activeRejection) || !statusRemark.trim()))
            }
            className={
              targetNewStatus === 'DELIVERED'
                ? 'bg-emerald-600 hover:bg-emerald-700 font-bold'
                : requiresAdminApproval && isSupervisor
                ? 'bg-amber-600 hover:bg-amber-700 font-bold'
                : targetNewStatus === 'DISPATCHED'
                ? 'bg-blue-600 hover:bg-blue-700 font-bold'
                : 'bg-rose-600 hover:bg-rose-700 font-bold'
            }
          >
            {requiresAdminApproval && isSupervisor
              ? 'Submit for Admin Approval'
              : 'Confirm Status Update'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
