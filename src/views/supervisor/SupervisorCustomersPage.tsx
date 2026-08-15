import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { Customer, User, Order } from '../../models/domain';
import { customerRepository, userRepository, orderRepository } from '../../repositories';
import { OrderService } from '../../services/orderService';
import { PageHeader } from '../../components/shared/PageHeader';
import { SearchInput } from '../../components/shared/SearchInput';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Card, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingState } from '../../components/shared/LoadingState';
import toast from 'react-hot-toast';
import { Eye, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export const SupervisorCustomersPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, User>>({});
  const [ordersMap, setOrdersMap] = useState<Record<string, Order[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Order Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [itemsDesc, setItemsDesc] = useState('Alpha Deluxe Pack x1');
  const [totalAmount, setTotalAmount] = useState('149.99');
  const [remarks, setRemarks] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const loadData = async () => {
    if (!user || !user.teamId) return;
    setLoading(true);
    try {
      const [cList, teamUsers, oList] = await Promise.all([
        customerRepository.getByTeamId(user.teamId),
        userRepository.getByTeamId(user.teamId),
        orderRepository.getByTeamId(user.teamId),
      ]);

      setCustomers(cList);

      const uMap: Record<string, User> = {};
      teamUsers.forEach((u) => (uMap[u.id] = u));
      setMembersMap(uMap);

      const ordMap: Record<string, Order[]> = {};
      oList.forEach((o) => {
        if (!ordMap[o.customerId]) ordMap[o.customerId] = [];
        ordMap[o.customerId].push(o);
      });
      setOrdersMap(ordMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !user) return;

    setIsSubmittingOrder(true);
    try {
      await OrderService.createOrder(
        {
          customerId: selectedCustomer.id,
          itemsDescription: itemsDesc,
          totalAmount: parseFloat(totalAmount) || 100,
          remarks: remarks || undefined,
        },
        user
      );
      toast.success(`Draft order generated for ${selectedCustomer.fullName}!`);
      setSelectedCustomer(null);
      loadData();
      navigate('/supervisor/orders');
    } catch (err: any) {
      toast.error(err.message || 'Order creation failed.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const filtered = customers.filter(
    (c) => c.fullName.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interested Customers CRM"
        description="View leads captured from tele-calling, inspect timelines, and generate orders"
      />

      <SearchInput value={search} onChange={setSearch} placeholder="Search customer name or phone..." />

      {filtered.length === 0 ? (
        <EmptyState
          title="No customers captured yet"
          description="No interested customer records have been created for your team."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((customer) => {
            const member = membersMap[customer.responsibleTeamMemberId];
            const custOrders = ordersMap[customer.id] || [];
            const latestOrder = custOrders[custOrders.length - 1];

            return (
              <Card key={customer.id} className="hover:border-slate-300 transition-all space-y-4">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base text-slate-900">{customer.fullName}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{customer.phone}</p>
                    </div>
                    {latestOrder ? (
                      <StatusBadge type="order" status={latestOrder.status} />
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        No Order Yet
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="font-medium text-slate-400">Address:</span> {customer.address}
                    </div>
                    {customer.email && (
                      <div>
                        <span className="font-medium text-slate-400">Email:</span> {customer.email}
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-slate-400">Responsible Member:</span>{' '}
                      {member ? member.fullName : 'N/A'}
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                      Captured {format(new Date(customer.createdAt), 'MMM dd, yyyy • hh:mm a')}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => navigate(`/supervisor/customers/${customer.id}`)}
                    >
                      Inspect Timeline
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      Create Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Order Modal */}
      {selectedCustomer && (
        <Dialog
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title={`Create Order for ${selectedCustomer.fullName}`}
          description={`Customer Phone: ${selectedCustomer.phone}`}
        >
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <Input
              label="Package / Items Description *"
              value={itemsDesc}
              onChange={(e) => setItemsDesc(e.target.value)}
              required
            />
            <Input
              label="Total Amount ($) *"
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              required
            />
            <Input
              label="Remarks / Dispatch Notes"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Include express gift wrapping"
            />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setSelectedCustomer(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingOrder}>
                Generate Draft Order
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
