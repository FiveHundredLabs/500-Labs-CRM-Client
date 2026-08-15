import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Order, Customer } from '../../models/domain';
import { orderRepository, customerRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { PrintPreviewModal } from '../../components/printing/PrintPreviewModal';
import { LoadingState } from '../../components/shared/LoadingState';
import { Printer, CheckSquare, Square } from 'lucide-react';

export const SupervisorPrintPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, Customer>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
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

        // Pre-select all orders ready for printing (PREPARED or DRAFT)
        const printable = oList.filter((o) => o.status === 'PREPARED' || o.status === 'DRAFT');
        setSelectedIds(printable.map((o) => o.id));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const toggleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map((o) => o.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedOrdersList = orders.filter((o) => selectedIds.includes(o.id));

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Label Print Batch Center"
        description="Select orders for 4 × A6 Labels Per A4 Landscape Sheet Generation"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={toggleSelectAll}>
              {selectedIds.length === orders.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => setIsPrintOpen(true)}
              disabled={selectedIds.length === 0}
            >
              Print Preview ({selectedIds.length} Selected)
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orders.map((order) => {
          const customer = customersMap[order.customerId];
          const isSelected = selectedIds.includes(order.id);

          return (
            <Card
              key={order.id}
              className={`cursor-pointer transition-all ${
                isSelected ? 'border-2 border-blue-600 bg-blue-50/20' : 'hover:border-slate-300'
              }`}
              onClick={() => toggleSelect(order.id)}
            >
              <CardContent className="p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-blue-600">
                    {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-300" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">{order.orderNumber}</div>
                    <div className="text-xs text-slate-500 font-medium">{customer ? customer.fullName : 'Customer'}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{order.itemsDescription}</div>
                  </div>
                </div>

                <StatusBadge type="order" status={order.status} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isPrintOpen && (
        <PrintPreviewModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          orders={selectedOrdersList}
          customersMap={customersMap}
        />
      )}
    </div>
  );
};
