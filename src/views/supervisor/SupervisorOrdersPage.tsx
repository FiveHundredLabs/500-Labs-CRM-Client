import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Order, OrderStatus, Customer, DeliveryStatusHistory } from '../../models/domain';
import { orderRepository, customerRepository, deliveryStatusHistoryRepository } from '../../repositories';
import { OrderService } from '../../services/orderService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { PrintPreviewModal } from '../../components/printing/PrintPreviewModal';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingState } from '../../components/shared/LoadingState';
import toast from 'react-hot-toast';
import { Package, Truck, CheckCheck, XCircle, Printer, History } from 'lucide-react';
import { format } from 'date-fns';

export const SupervisorOrdersPage: React.FC = () => {
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Status Change Dialog
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('PREPARED');
  const [remarks, setRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // History Inspector Dialog
  const [historyOrder, setHistoryOrder] = useState<Order | null>(null);
  const [orderHistories, setOrderHistories] = useState<DeliveryStatusHistory[]>([]);

  // Print Selection
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const loadData = async () => {
    if (!user || !user.teamId) return;
    setLoading(true);
    try {
      const [oList, cList] = await Promise.all([
        orderRepository.getByTeamId(user.teamId),
        customerRepository.getByTeamId(user.teamId),
      ]);

      setOrders(oList);

      const cMap: Record<string, Customer> = {};
      cList.forEach((c) => (cMap[c.id] = c));
      setCustomersMap(cMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleOpenStatusModal = (order: Order, defaultNewStatus: OrderStatus) => {
    setTargetOrder(order);
    setNewStatus(defaultNewStatus);
    setRemarks('');
  };

  const handleConfirmStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrder || !user) return;

    setIsUpdatingStatus(true);
    try {
      await OrderService.updateOrderStatus(targetOrder.id, newStatus, user, remarks);
      toast.success(`Order #${targetOrder.orderNumber} status updated to ${newStatus}`);
      setTargetOrder(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Status transition failed.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleViewHistory = async (order: Order) => {
    setHistoryOrder(order);
    const hist = await deliveryStatusHistoryRepository.getByOrderId(order.id);
    setOrderHistories(hist);
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredOrders = orders.filter((o) => statusFilter === 'ALL' || o.status === statusFilter);
  const selectedOrdersList = orders.filter((o) => selectedOrderIds.includes(o.id));

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders & Delivery Tracking"
        description="Fulfillment lifecycle, delivery status transitions, and courier labels"
        actions={
          <Button
            variant="primary"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={() => setIsPrintModalOpen(true)}
            disabled={selectedOrderIds.length === 0}
          >
            Print Labels ({selectedOrderIds.length})
          </Button>
        }
      />

      {/* Filter Row */}
      <div className="w-full sm:w-64">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Order Statuses' },
            { value: 'DRAFT', label: 'Draft Orders' },
            { value: 'PREPARED', label: 'Prepared Parcels' },
            { value: 'DISPATCHED', label: 'Dispatched' },
            { value: 'DELIVERED', label: 'Delivered' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'RETURNED', label: 'Returned' },
          ]}
        />
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="No order records match your current filter criteria."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const customer = customersMap[order.customerId];
            const isSelected = selectedOrderIds.includes(order.id);

            return (
              <Card
                key={order.id}
                className={`transition-all ${isSelected ? 'border-2 border-blue-600 bg-blue-50/20' : ''}`}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                      />
                      <div>
                        <div className="font-bold text-sm text-slate-900">{order.orderNumber}</div>
                        <div className="text-xs text-slate-600 font-medium">
                          {customer ? customer.fullName : 'Customer'}
                        </div>
                      </div>
                    </div>
                    <StatusBadge type="order" status={order.status} />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-600">
                    <div>
                      <span className="font-medium text-slate-400">Items:</span> {order.itemsDescription}
                    </div>
                    <div>
                      <span className="font-medium text-slate-400">Amount:</span> ${order.totalAmount.toFixed(2)}
                    </div>
                    {order.remarks && (
                      <div>
                        <span className="font-medium text-slate-400">Remarks:</span> {order.remarks}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<History className="w-3.5 h-3.5" />}
                      onClick={() => handleViewHistory(order)}
                    >
                      History
                    </Button>

                    <div className="flex items-center gap-1.5">
                      {order.status === 'DRAFT' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Package className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenStatusModal(order, 'PREPARED')}
                        >
                          Mark Prepared
                        </Button>
                      )}
                      {order.status === 'PREPARED' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Truck className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenStatusModal(order, 'DISPATCHED')}
                        >
                          Mark Dispatched
                        </Button>
                      )}
                      {order.status === 'DISPATCHED' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenStatusModal(order, 'DELIVERED')}
                          >
                            Delivered
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenStatusModal(order, 'REJECTED')}
                          >
                            Rejected
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Status Transition Dialog */}
      {targetOrder && (
        <Dialog
          isOpen={!!targetOrder}
          onClose={() => setTargetOrder(null)}
          title={`Update Status: Order #${targetOrder.orderNumber}`}
          description={`Transitioning from ${targetOrder.status} to ${newStatus}`}
        >
          <form onSubmit={handleConfirmStatusChange} className="space-y-4">
            <Select
              label="Target Status *"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              options={[
                { value: 'PREPARED', label: 'Parcel Prepared' },
                { value: 'DISPATCHED', label: 'Dispatched with Courier' },
                { value: 'DELIVERED', label: 'Delivered to Customer (Triggers Email Simulation)' },
                { value: 'REJECTED', label: 'Rejected by Receiver' },
                { value: 'RETURNED', label: 'Returned to Warehouse' },
              ]}
            />
            <Input
              label="Transition Remarks / Courier Notes"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Courier Tracking #EX-998822"
            />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setTargetOrder(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isUpdatingStatus}>
                Update Order Status
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* History Inspector Dialog */}
      {historyOrder && (
        <Dialog
          isOpen={!!historyOrder}
          onClose={() => setHistoryOrder(null)}
          title={`Status History - #${historyOrder.orderNumber}`}
        >
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {orderHistories.map((h) => (
              <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>
                    {h.previousStatus ? `${h.previousStatus} ➔ ` : ''}
                    {h.newStatus}
                  </span>
                  <span className="text-slate-400 font-normal">
                    {format(new Date(h.createdAt), 'MMM dd, hh:mm a')}
                  </span>
                </div>
                {h.remarks && <div className="text-slate-600">{h.remarks}</div>}
              </div>
            ))}
          </div>
        </Dialog>
      )}

      {/* Print Preview Engine Modal */}
      {isPrintModalOpen && (
        <PrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          orders={selectedOrdersList}
          customersMap={customersMap}
        />
      )}
    </div>
  );
};
