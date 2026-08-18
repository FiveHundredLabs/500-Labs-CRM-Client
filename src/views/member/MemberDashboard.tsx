import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Contact, CallLog, Order, User } from '../../models/domain';
import { contactRepository, callLogRepository, orderRepository, userRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { PostCallModal } from '../../components/calling/PostCallModal';
import { AddPersonalNumberModal } from '../../components/calling/AddPersonalNumberModal';
import { LoadingState } from '../../components/shared/LoadingState';
import { 
  PhoneCall, 
  CheckCircle2, 
  Trophy, 
  Phone, 
  ArrowRight, 
  Star, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Award, 
  Calendar,
  Gift
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Leaderboard } from '../../components/leaderboard';
import { formatCurrency } from '../../utils/currency';
import { format } from 'date-fns';

interface LeaderboardMember {
  user: User;
  totalOrders: number;
  deliveredCount: number;
  rank: number;
}

const MONTHLY_SALES_TARGET = 25000; // LKR 25,000

export const MemberDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [, setCallLogs] = useState<CallLog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Month selector for sales goal & incentive
  const [selectedMonthPreset, setSelectedMonthPreset] = useState<'THIS_MONTH' | 'LAST_MONTH'>('THIS_MONTH');

  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const currentTeamId = user.teamId || 'team_001';
      const [mContacts, mLogs, mOrders, allUsers, teamOrders] = await Promise.all([
        contactRepository.getByMemberId(user.id),
        callLogRepository.getByMemberId(user.id),
        orderRepository.getByMemberId(user.id),
        userRepository.getAll(),
        orderRepository.getByTeamId(currentTeamId),
      ]);

      setContacts(mContacts);
      setCallLogs(mLogs);
      setOrders(mOrders);

      // Build Leaderboard Roster ranked by Delivered Orders (1.2)
      const membersOnly = allUsers.filter(
        (u) => u.role === 'TEAM_MEMBER' && (u.teamId === currentTeamId || !u.teamId || currentTeamId === 'team_001')
      );

      const computedRoster: LeaderboardMember[] = membersOnly.slice(0, 7).map((u) => {
        const uOrders = teamOrders.filter((o) => o.teamMemberId === u.id);
        const deliveredCount = uOrders.filter((o) => o.status === 'DELIVERED').length;
        const totalOrders = uOrders.length;

        return {
          user: u,
          totalOrders,
          deliveredCount,
          rank: 0,
        };
      });

      computedRoster.sort((a, b) => b.deliveredCount - a.deliveredCount || b.totalOrders - a.totalOrders);
      computedRoster.forEach((m, idx) => {
        m.rank = idx + 1;
      });

      setLeaderboard(computedRoster);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading) return <LoadingState rows={6} />;

  const totalAssigned = contacts.length;
  const completedCalls = contacts.filter((c) => c.status !== 'NEW').length;
  const remainingContacts = totalAssigned - completedCalls;
  const interestedToday = contacts.filter((c) => c.status === 'INTERESTED').length;
  const completionPercentage = totalAssigned > 0 ? Math.round((completedCalls / totalAssigned) * 100) : 0;
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;

  // Filter orders by selected month for Sales Goal & Incentive calculation (1.4)
  const now = new Date();
  const targetYear = now.getFullYear();
  const targetMonthIndex = selectedMonthPreset === 'THIS_MONTH' ? now.getMonth() : now.getMonth() - 1;
  const targetMonthPrefix = `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}`;

  const monthlyDeliveredOrders = orders.filter((o) => {
    if (o.status !== 'DELIVERED') return false;
    const dateStr = o.deliveredAt || o.createdAt;
    return dateStr.startsWith(targetMonthPrefix);
  });

  // Calculate total sales from delivered orders (using COD amount or totalAmount)
  const currentSalesAmount = monthlyDeliveredOrders.reduce(
    (sum, o) => sum + (o.codAmount || o.totalAmount || 0),
    0
  );

  const achievementPercentage = Math.round((currentSalesAmount / MONTHLY_SALES_TARGET) * 10000) / 100; // e.g. 90.00%
  const achievementProgressClamped = Math.min(100, Math.round((currentSalesAmount / MONTHLY_SALES_TARGET) * 100));

  // Incentive rules (1.4):
  // >= 100%       -> + LKR 10,000
  // 90% - 99.99%  -> + LKR 8,000
  // 80% - 89.99%  -> + LKR 5,000
  // Below 80%     -> LKR 0
  let incentiveAmount = 0;
  let incentiveTier = 'No Incentive';
  let tierColor = 'text-slate-500 bg-slate-100 border-slate-200';

  if (achievementPercentage >= 100) {
    incentiveAmount = 10000;
    incentiveTier = '100%+ Tier (+LKR 10,000)';
    tierColor = 'text-emerald-800 bg-emerald-100 border-emerald-300';
  } else if (achievementPercentage >= 90) {
    incentiveAmount = 8000;
    incentiveTier = '90% Tier (+LKR 8,000)';
    tierColor = 'text-blue-800 bg-blue-100 border-blue-300';
  } else if (achievementPercentage >= 80) {
    incentiveAmount = 5000;
    incentiveTier = '80% Tier (+LKR 5,000)';
    tierColor = 'text-amber-800 bg-amber-100 border-amber-300';
  }

  const baseSalary = user?.salary || 45000;
  const finalSalaryPayout = baseSalary + incentiveAmount;

  // Filter first 3 priority follow-up numbers
  const followUpContacts = contacts
    .filter((c) => c.status !== 'NEW' && (c.isFollowUp || c.status === 'NOT_ANSWERED' || c.status === 'PHONE_OFF'))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good morning, ${user?.fullName.split(' ')[0]} 👋`}
        description="Here is your monthly calling queue, sales goal achievement, and performance leaderboard."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Personal Number
            </Button>
            <Button
              variant="primary"
              leftIcon={<PhoneCall className="w-4 h-4" />}
              onClick={() => navigate('/member/contacts')}
            >
              Start Calling Queue
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Calls"
          value={totalAssigned}
          subtitle={`${remainingContacts} remaining`}
          icon={<Phone className="w-4 h-4" />}
          accentColor="blue"
        />
        <StatCard
          title="Calls Completed"
          value={completedCalls}
          subtitle={`${completionPercentage}% completed`}
          icon={<PhoneCall className="w-4 h-4" />}
          accentColor="green"
          trend={{ value: `${completionPercentage}%`, isPositive: completionPercentage >= 50 }}
        />
        <StatCard
          title="Interested Leads"
          value={interestedToday}
          subtitle="Converted to CRM leads"
          icon={<CheckCircle2 className="w-4 h-4" />}
          accentColor="green"
        />
        <StatCard
          title="Delivered Orders"
          value={deliveredOrders}
          subtitle="Fulfilled shipments"
          icon={<Trophy className="w-4 h-4" />}
          accentColor="purple"
        />
      </div>

      {/* 1.4 Monthly Sales Goal & Incentive Banner Card */}
      <Card className="border-blue-200 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 shadow-xs">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>Monthly Sales Goal &amp; Incentive</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${tierColor}`}>
                    {incentiveTier}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Based on verified delivered customer sales</p>
              </div>
            </div>

            {/* Month Switcher */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setSelectedMonthPreset('THIS_MONTH')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedMonthPreset === 'THIS_MONTH'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month ({format(now, 'MMM yyyy')})
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonthPreset('LAST_MONTH')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedMonthPreset === 'LAST_MONTH'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last Month
              </button>
            </div>
          </div>

          {/* Incentive Grid Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/90 p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Monthly Target</div>
              <div className="text-base sm:text-lg font-bold text-slate-900 font-mono mt-0.5">
                {formatCurrency(MONTHLY_SALES_TARGET)}
              </div>
            </div>

            <div className="bg-white/90 p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Current Sales</div>
              <div className="text-base sm:text-lg font-bold text-blue-700 font-mono mt-0.5">
                {formatCurrency(currentSalesAmount)}
              </div>
            </div>

            <div className="bg-white/90 p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Achievement</div>
              <div className="text-base sm:text-lg font-bold text-emerald-700 font-mono mt-0.5">
                {achievementPercentage}%
              </div>
            </div>

            <div className="bg-white/90 p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Earned Incentive</div>
              <div className="text-base sm:text-lg font-bold text-purple-700 font-mono mt-0.5">
                +{formatCurrency(incentiveAmount)}
              </div>
            </div>
          </div>

          {/* Progress Visualizer */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700">Goal Achievement Progress</span>
              <span className="text-blue-700 font-bold">{achievementPercentage}% ({formatCurrency(currentSalesAmount)} / {formatCurrency(MONTHLY_SALES_TARGET)})</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  achievementPercentage >= 100
                    ? 'bg-emerald-600'
                    : achievementPercentage >= 80
                    ? 'bg-blue-600'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${achievementProgressClamped}%` }}
              />
            </div>
          </div>

          {/* Salary + Incentive Total Footer */}
          <div className="p-3 bg-white/95 rounded-xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>
                Base Salary: <strong className="text-slate-900">{formatCurrency(baseSalary)}</strong> + Incentive:{' '}
                <strong className="text-purple-700">{formatCurrency(incentiveAmount)}</strong>
              </span>
            </div>
            <div className="text-slate-900 font-bold text-sm">
              Estimated Monthly Payout: <span className="text-emerald-700 font-mono">{formatCurrency(finalSalaryPayout)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Priority Follow-ups & Leaderboard Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Follow-Up List Card */}
        <Card className="lg:col-span-2 border-amber-200/70 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span>Follow-Up List</span>
              </CardTitle>
              <CardDescription>Priority follow-up numbers requiring callback</CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5 text-amber-600" />}
              onClick={() => navigate('/member/follow-ups?tab=FOLLOW_UP')}
              className="border-amber-200 text-amber-800 hover:bg-amber-50"
            >
              View List
            </Button>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100">
            {followUpContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No priority follow-ups required right now. All caught up!
              </div>
            ) : (
              followUpContacts.map((contact) => (
                <div key={contact.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 font-mono flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>{contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge type="contact" status={contact.status} />
                      <span className="text-[11px] text-slate-400">
                        {contact.attemptCount} {contact.attemptCount === 1 ? 'attempt' : 'attempts'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Phone className="w-3.5 h-3.5" />}
                    onClick={() => setSelectedContact(contact)}
                  >
                    Call Now
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Dashboard Leaderboard Card (Ranked by Delivered Orders) */}
        <Leaderboard
          items={leaderboard.map((m) => ({
            id: m.user.id,
            rank: m.rank,
            name: m.user.fullName,
            avatarUrl: m.user.avatarUrl,
            isCurrentUser: m.user.id === user?.id,
            primaryValue: m.deliveredCount,
            secondaryValue: m.totalOrders,
            primaryLabel: 'Delivered',
            secondaryLabel: 'Total Orders',
            unitLabel: 'orders',
          }))}
          compact={true}
          onViewFullLeaderboard={() => navigate('/member/leaderboard')}
        />
      </div>

      {/* Post Call Modal */}
      {selectedContact && (
        <PostCallModal
          isOpen={!!selectedContact}
          onClose={() => setSelectedContact(null)}
          contact={selectedContact}
          onSuccess={loadData}
        />
      )}

      {/* Add Personal Number Modal */}
      <AddPersonalNumberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
