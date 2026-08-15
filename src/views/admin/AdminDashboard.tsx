import React, { useState, useEffect } from 'react';
import { userRepository, contactRepository, orderRepository, activityLogRepository } from '../../repositories';
import { User, Contact, Order, ActivityLog } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { LoadingState } from '../../components/shared/LoadingState';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { PhoneCall, CheckCircle2, Package, ShieldCheck } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [uList, cList, oList, logs] = await Promise.all([
          userRepository.getAll(),
          contactRepository.getAll(),
          orderRepository.getAll(),
          activityLogRepository.getAll(),
        ]);
        setUsers(uList);
        setContacts(cList);
        setOrders(oList);
        setActivities(logs.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingState rows={6} />;

  const supervisors = users.filter((u) => u.role === 'SUPERVISOR');
  const members = users.filter((u) => u.role === 'TEAM_MEMBER');
  const interestedCount = contacts.filter((c) => c.status === 'INTERESTED').length;
  const completedCalls = contacts.filter((c) => c.status !== 'NEW').length;
  const conversionRate = completedCalls > 0 ? Math.round((interestedCount / completedCalls) * 100) : 0;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;

  // Chart data: Team Comparison (Brand Alpha vs Brand Beta)
  const teamComparisonData = [
    {
      name: 'Brand Alpha',
      contacts: contacts.filter((c) => c.teamId === 'team_001').length,
      interested: contacts.filter((c) => c.teamId === 'team_001' && c.status === 'INTERESTED').length,
      orders: orders.filter((o) => o.teamId === 'team_001').length,
    },
    {
      name: 'Brand Beta',
      contacts: contacts.filter((c) => c.teamId === 'team_002').length,
      interested: contacts.filter((c) => c.teamId === 'team_002' && c.status === 'INTERESTED').length,
      orders: orders.filter((o) => o.teamId === 'team_002').length,
    },
  ];

  const orderStatusData = [
    { name: 'Delivered', value: orders.filter((o) => o.status === 'DELIVERED').length, color: '#16A34A' },
    { name: 'Dispatched', value: orders.filter((o) => o.status === 'DISPATCHED').length, color: '#0284C7' },
    { name: 'Prepared', value: orders.filter((o) => o.status === 'PREPARED').length, color: '#4F46E5' },
    { name: 'Draft', value: orders.filter((o) => o.status === 'DRAFT').length, color: '#94A3B8' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        description="System-wide metrics, team performance comparisons, and fulfillment audits"
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Supervisors"
          value={supervisors.length}
          subtitle={`${members.length} Team Members`}
          icon={<ShieldCheck className="w-4 h-4" />}
          accentColor="blue"
        />
        <StatCard
          title="System Conversion"
          value={`${conversionRate}%`}
          subtitle={`${interestedCount} Qualified Leads`}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accentColor="green"
          trend={{ value: `${conversionRate}%`, isPositive: true }}
        />
        <StatCard
          title="Total Orders"
          value={orders.length}
          subtitle={`${deliveredOrders} Delivered`}
          icon={<Package className="w-4 h-4" />}
          accentColor="purple"
        />
        <StatCard
          title="Completed Calls"
          value={completedCalls}
          subtitle={`${contacts.length} Total Contacts`}
          icon={<PhoneCall className="w-4 h-4" />}
          accentColor="blue"
        />
      </div>

      {/* Recharts Performance Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Team Performance (Brand Alpha vs Beta)</CardTitle>
              <CardDescription>Volume comparison across assigned contacts, leads, and orders</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamComparisonData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                    color: '#0F172A',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="contacts" fill="#93C5FD" name="Contacts" radius={[4, 4, 0, 0]} />
                <Bar dataKey="interested" fill="#2563EB" name="Interested Leads" radius={[4, 4, 0, 0]} />
                <Bar dataKey="orders" fill="#16A34A" name="Orders Generated" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Order Status Breakdown</CardTitle>
              <CardDescription>Fulfillment lifecycle distribution</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                    color: '#0F172A',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>System Activity Audit</CardTitle>
          <CardDescription>Recent cross-team operations and user actions</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[350px] overflow-y-auto">
          <ActivityTimeline activities={activities} />
        </CardContent>
      </Card>
    </div>
  );
};
