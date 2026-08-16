import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, Contact, Order, ActivityLog } from '../../models/domain';
import { userRepository, contactRepository, orderRepository, activityLogRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { LoadingState } from '../../components/shared/LoadingState';
import { Users, Upload, Layers, Package, Printer, CheckCircle2, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SupervisorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user || !user.teamId) return;
      setLoading(true);
      try {
        const [members, tContacts, tOrders, logs] = await Promise.all([
          userRepository.getByTeamId(user.teamId),
          contactRepository.getByTeamId(user.teamId),
          orderRepository.getByTeamId(user.teamId),
          activityLogRepository.getAll(),
        ]);

        setTeamMembers(members.filter((m) => m.role === 'TEAM_MEMBER'));
        setContacts(tContacts);
        setOrders(tOrders);
        setActivities(logs.filter((l) => l.teamId === user.teamId).slice(0, 5));
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  if (loading) return <LoadingState rows={6} />;

  const activeMembers = teamMembers.filter((m) => m.isActive).length;
  const unallocatedContacts = contacts.filter((c) => !c.isAllocated && c.status === 'NEW').length;
  const interestedCount = contacts.filter((c) => c.status === 'INTERESTED').length;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const dispatchedOrders = orders.filter((o) => o.status === 'DISPATCHED').length;
  const rejectedOrders = orders.filter((o) => o.status === 'REJECTED' || o.status === 'RETURNED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisor Overview"
        description={`${user?.teamId === 'team_001' ? 'Brand Alpha' : 'Brand Beta'} Team Management & Fulfillment`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => navigate('/supervisor/import')}
            >
              Import Leads
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Layers className="w-4 h-4" />}
              onClick={() => navigate('/supervisor/allocation')}
            >
              Allocate Leads ({unallocatedContacts})
            </Button>
          </div>
        }
      />

      {/* Quick Action Navigation Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="w-4 h-4 text-blue-600" />}
              onClick={() => navigate('/supervisor/import')}
              className="justify-start"
            >
              Import Contacts
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Layers className="w-4 h-4 text-blue-600" />}
              onClick={() => navigate('/supervisor/allocation')}
              className="justify-start"
            >
              Allocate Contacts
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              onClick={() => navigate('/supervisor/customers')}
              className="justify-start"
            >
              Interested Leads
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Team Members"
          value={activeMembers}
          subtitle={`${teamMembers.length} total members`}
          icon={<Users className="w-4 h-4" />}
          accentColor="blue"
        />
        <StatCard
          title="Unallocated Leads"
          value={unallocatedContacts}
          subtitle="Awaiting distribution"
          icon={<Layers className="w-4 h-4" />}
          accentColor="amber"
        />
        <StatCard
          title="Interested Leads"
          value={interestedCount}
          subtitle="Converted to orders"
          icon={<CheckCircle2 className="w-4 h-4" />}
          accentColor="green"
        />
        <StatCard
          title="Delivered Orders"
          value={deliveredOrders}
          subtitle={`${dispatchedOrders} in transit`}
          icon={<Truck className="w-4 h-4" />}
          accentColor="purple"
        />
      </div>

      {/* Fulfillment & Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Order Fulfillment Pipeline</CardTitle>
              <CardDescription>Real-time delivery status tracking across team orders</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <div className="text-2xl font-bold text-emerald-800">{deliveredOrders}</div>
                <div className="text-xs font-semibold text-emerald-700 mt-1">Delivered</div>
              </div>
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
                <div className="text-2xl font-bold text-amber-800">{dispatchedOrders}</div>
                <div className="text-xs font-semibold text-amber-700 mt-1">Dispatched</div>
              </div>
              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl">
                <div className="text-2xl font-bold text-rose-800">{rejectedOrders}</div>
                <div className="text-xs font-semibold text-rose-700 mt-1">Returned / Rejected</div>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              leftIcon={<Package className="w-4 h-4" />}
              onClick={() => navigate('/supervisor/orders')}
            >
              Manage Orders & Status Transitions
            </Button>
          </CardContent>
        </Card>

        {/* Team Audit Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Live feed of team actions</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[350px] overflow-y-auto">
            <ActivityTimeline activities={activities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
