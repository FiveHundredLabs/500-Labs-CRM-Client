import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User, Contact, Order, ActivityLog } from '../../models/domain';
import { userRepository, contactRepository, orderRepository, activityLogRepository } from '../../repositories';
import { SupervisorAnalyticsService } from '../../services/supervisorAnalyticsService';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { LoadingState } from '../../components/shared/LoadingState';
import { Leaderboard } from '../../components/leaderboard';
import { Users, Upload, Layers, Package, CheckCircle2, Truck, XCircle, PieChart } from 'lucide-react';
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
        setActivities(logs.filter((l) => l.teamId === user.teamId).slice(0, 6));
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  if (loading) return <LoadingState rows={6} />;

  const unallocatedContacts = contacts.filter((c) => !c.isAllocated && c.status === 'NEW').length;

  // Order status counts
  const totalOrders = orders.length;
  const dispatchedOrders = orders.filter((o) => o.status === 'DISPATCHED').length;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const rejectedOrders = orders.filter((o) => o.status === 'REJECTED' || o.status === 'RETURNED').length;

  // Calculated rates
  const deliveredRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
  const rejectedRate = totalOrders > 0 ? Math.round((rejectedOrders / totalOrders) * 1000) / 10 : 0;

  // Compute leaderboard
  const leaderboard = SupervisorAnalyticsService.computeLeaderboard(teamMembers, orders);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisor Overview"
        description={`${user?.teamId === 'team_001' ? 'Brand Alpha' : 'Brand Beta'} Operational & Sales Control Center`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<PieChart className="w-4 h-4" />}
              onClick={() => navigate('/supervisor/reports')}
            >
              Reports & Analytics
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

      {/* KPI Metric Cards Grouped by Order Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={totalOrders}
          subtitle={`${teamMembers.length} active team members`}
          icon={<Package className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Dispatched"
          value={dispatchedOrders}
          subtitle="Current dispatched orders"
          icon={<Truck className="w-4 h-4 text-amber-600" />}
          accentColor="amber"
        />
        <StatCard
          title="Delivered"
          value={deliveredOrders}
          subtitle={`${deliveredRate}% of total orders`}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
        />
        <StatCard
          title="Rejected"
          value={rejectedOrders}
          subtitle={`${rejectedRate}% of total orders`}
          icon={<XCircle className="w-4 h-4 text-rose-600" />}
          accentColor="red"
        />
      </div>

      {/* Main Grid: Team Leaderboard & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard (Col-span 2) */}
        <div className="lg:col-span-2">
          <Leaderboard
            items={leaderboard.map((m) => ({
              id: m.memberId,
              rank: m.rank,
              name: m.memberName,
              avatarUrl: m.avatarUrl,
              isCurrentUser: m.memberId === user?.id,
              primaryValue: m.deliveredOrders,
              secondaryValue: m.totalOrders,
              primaryLabel: 'Delivered',
              secondaryLabel: 'Handled Orders',
              unitLabel: 'orders',
            }))}
            compact={true}
            title="Team Leaderboard Summary"
            unitLabel="orders"
            onViewFullLeaderboard={() => navigate('/supervisor/team-members')}
          />
        </div>

        {/* Recent Activity (Col-span 1) */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Recent Activity Feed</CardTitle>
            <CardDescription>Live audit feed of team interactions and status changes</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-y-auto">
            <ActivityTimeline activities={activities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
