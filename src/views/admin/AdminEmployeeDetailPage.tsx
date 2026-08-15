import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Contact, Order, ActivityLog } from '../../models/domain';
import { userRepository, contactRepository, orderRepository, activityLogRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/shared/StatCard';
import { ProfileAvatar } from '../../components/shared/ProfileAvatar';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { LoadingState } from '../../components/shared/LoadingState';
import { getTeamBranding } from '../../config/branding';
import { ArrowLeft, PhoneCall, CheckCircle2, Package, Shield, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export const AdminEmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<User | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const u = await userRepository.getById(id);
        if (u) {
          setEmployee(u);

          const [allContacts, allOrders, logs] = await Promise.all([
            contactRepository.getAll(),
            orderRepository.getAll(),
            activityLogRepository.getByUserId(id),
          ]);

          if (u.role === 'TEAM_MEMBER') {
            setContacts(allContacts.filter((c) => c.allocatedToId === u.id));
            setOrders(allOrders.filter((o) => o.teamMemberId === u.id));
          } else if (u.role === 'SUPERVISOR') {
            setContacts(allContacts.filter((c) => c.teamId === u.teamId));
            setOrders(allOrders.filter((o) => o.supervisorId === u.id));
          }

          setActivities(logs);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <LoadingState rows={8} />;
  if (!employee) return <div className="p-6 text-center text-slate-500">Employee not found.</div>;

  const teamBrand = getTeamBranding(employee.teamId || undefined);
  const interestedCount = contacts.filter((c) => c.status === 'INTERESTED').length;
  const completedCalls = contacts.filter((c) => c.status !== 'NEW').length;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate('/admin/users')}
      >
        Back to Users Directory
      </Button>

      <PageHeader
        title={employee.fullName}
        description={`Employee Dossier & Performance Record &bull; ${teamBrand.name}`}
        badge={<StatusBadge type="user" status={String(employee.isActive)} />}
      />

      {/* Header Info */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <ProfileAvatar name={employee.fullName} avatarUrl={employee.avatarUrl} size="lg" />
            <div>
              <h2 className="font-bold text-lg text-slate-900">{employee.fullName}</h2>
              <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold mt-0.5">
                <Shield className="w-3.5 h-3.5" />
                <span>{employee.role}</span>
                <span>&bull;</span>
                <span>{teamBrand.name}</span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{employee.city}</span>
                <span>&bull;</span>
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Joined {format(new Date(employee.joiningDate), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Calls Logged" value={completedCalls} icon={<PhoneCall className="w-4 h-4" />} accentColor="blue" />
        <StatCard title="Interested Leads" value={interestedCount} icon={<CheckCircle2 className="w-4 h-4" />} accentColor="green" />
        <StatCard title="Total Orders" value={orders.length} icon={<Package className="w-4 h-4" />} accentColor="purple" />
        <StatCard title="Delivered Parcels" value={deliveredOrders} icon={<Package className="w-4 h-4" />} accentColor="green" />
      </div>

      {/* Detailed Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Action Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline activities={activities} />
        </CardContent>
      </Card>
    </div>
  );
};
