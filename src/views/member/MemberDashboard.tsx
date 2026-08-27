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
import { LoadingState } from '../../components/shared/LoadingState';
import { 
  PhoneCall, 
  CheckCircle2, 
  Trophy, 
  Phone, 
  ArrowRight, 
  Star, 
  TrendingUp, 
  DollarSign, 
  Award, 
  Calendar,
  Gift,
  Zap,
  Sparkles
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

  // Month selector for sales goal & incentive
  const [selectedMonthPreset, setSelectedMonthPreset] = useState<'THIS_MONTH' | 'LAST_MONTH'>('THIS_MONTH');

  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const currentTeamId = user.teamId || 'team_001';
      const [mContacts, mLogs, mOrders, allUsers, teamOrders] = await Promise.all([
        contactRepository.getByMemberId(user.id).catch(() => []),
        callLogRepository.getByMemberId(user.id).catch(() => []),
        orderRepository.getByMemberId(user.id).catch(() => []),
        userRepository.getAll().catch(() => []),
        orderRepository.getByTeamId(currentTeamId).catch(() => []),
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

  // Filter orders by selected month for Sales Goal & Incentive calculation
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

  const achievementPercentage = Math.round((currentSalesAmount / MONTHLY_SALES_TARGET) * 10000) / 100; // e.g. 104.4%
  const achievementProgressClamped = Math.min(100, Math.round((currentSalesAmount / MONTHLY_SALES_TARGET) * 100));

  // Incentive rules:
  // >= 100%       -> + LKR 10,000
  // 90% - 99.99%  -> + LKR 8,000
  // 80% - 89.99%  -> + LKR 5,000
  // Below 80%     -> LKR 0
  let incentiveAmount = 0;
  let incentiveTier = 'No Incentive';
  let tierBadgeBg = 'bg-slate-100 text-slate-700 border-slate-200';

  if (achievementPercentage >= 100) {
    incentiveAmount = 10000;
    incentiveTier = '+LKR 10,000 Bonus (100%+)';
    tierBadgeBg = 'bg-emerald-500 text-white border-emerald-400';
  } else if (achievementPercentage >= 90) {
    incentiveAmount = 8000;
    incentiveTier = '+LKR 8,000 Bonus (90%+)';
    tierBadgeBg = 'bg-blue-600 text-white border-blue-500';
  } else if (achievementPercentage >= 80) {
    incentiveAmount = 5000;
    incentiveTier = '+LKR 5,000 Bonus (80%+)';
    tierBadgeBg = 'bg-amber-500 text-white border-amber-400';
  }

  const baseSalary = user?.salary || 45000;
  const finalSalaryPayout = baseSalary + incentiveAmount;

  // Filter first 3 priority follow-up numbers
  const followUpContacts = contacts
    .filter((c) => c.status !== 'NEW' && (c.isFollowUp || c.status === 'NOT_ANSWERED' || c.status === 'PHONE_OFF'))
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Good morning, ${user?.fullName.split(' ')[0]} 👋`}
        description="Here is your monthly calling queue, sales goal achievement, and performance leaderboard."
        actions={
          <Button
            variant="primary"
            leftIcon={<PhoneCall className="w-4 h-4" />}
            onClick={() => navigate('/member/contacts')}
          >
            Start Calling Queue
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
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

      {/* Ultra-Clean, Compact Sales Goal & Incentive Widget (Senior UI/UX Redesign) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
        {/* Header Row: Title & Month Segmented Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs shrink-0">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">Monthly Sales Goal &amp; Incentive</h3>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center gap-1 ${tierBadgeBg}`}>
                  <Sparkles className="w-3 h-3" />
                  <span>{incentiveTier}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Target: {formatCurrency(MONTHLY_SALES_TARGET)} from delivered sales</p>
            </div>
          </div>

          {/* Month Switcher Pill */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold self-start sm:self-auto shrink-0 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setSelectedMonthPreset('THIS_MONTH')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                selectedMonthPreset === 'THIS_MONTH'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {format(now, 'MMM yyyy')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonthPreset('LAST_MONTH')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                selectedMonthPreset === 'LAST_MONTH'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Last Month
            </button>
          </div>
        </div>

        {/* Hero Progress & Inline Key Stats (Zero nested cards) */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 space-y-2.5">
          {/* Main Numbers Row */}
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight">
                {formatCurrency(currentSalesAmount)}
              </span>
              <span className="text-xs font-medium text-slate-400">
                / {formatCurrency(MONTHLY_SALES_TARGET)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                achievementPercentage >= 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : achievementPercentage >= 80
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {achievementPercentage}% Achieved
              </span>
            </div>
          </div>

          {/* Smooth Gradient Progress Bar */}
          <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                achievementPercentage >= 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : achievementPercentage >= 80
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${achievementProgressClamped}%` }}
            />
          </div>

          {/* Clean Flat Metric Strip (No card borders) */}
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200/60 flex-wrap gap-y-1">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap text-[11px] sm:text-xs">
              <span>
                <span className="text-slate-400">Base:</span>{' '}
                <strong className="text-slate-800 font-mono">{formatCurrency(baseSalary)}</strong>
              </span>
              <span className="text-slate-300 hidden sm:inline">&bull;</span>
              <span>
                <span className="text-slate-400">Incentive:</span>{' '}
                <strong className="text-emerald-700 font-mono">+{formatCurrency(incentiveAmount)}</strong>
              </span>
            </div>

            <div className="text-[11px] sm:text-xs font-semibold text-slate-900">
              <span className="text-slate-400">Est. Payout:</span>{' '}
              <span className="text-blue-700 font-bold font-mono text-sm">{formatCurrency(finalSalaryPayout)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Follow-ups & Leaderboard Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                <div key={contact.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 font-mono flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>{contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
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
    </div>
  );
};
