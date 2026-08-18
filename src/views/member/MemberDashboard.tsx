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
import { PhoneCall, CheckCircle2, Trophy, Phone, ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Leaderboard } from '../../components/leaderboard';

interface LeaderboardMember {
  user: User;
  totalCalls: number;
  interestedCount: number;
  rank: number;
}

export const MemberDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [, setCallLogs] = useState<CallLog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const currentTeamId = user.teamId || 'team_001';
      const [mContacts, mLogs, mOrders, allUsers, teamContacts, teamLogs] = await Promise.all([
        contactRepository.getByMemberId(user.id),
        callLogRepository.getByMemberId(user.id),
        orderRepository.getByMemberId(user.id),
        userRepository.getAll(),
        contactRepository.getByTeamId(currentTeamId),
        callLogRepository.getByTeamId(currentTeamId),
      ]);

      setContacts(mContacts);
      setCallLogs(mLogs);
      setOrders(mOrders);

      // Build Leaderboard Roster
      const membersOnly = allUsers.filter(
        (u) => u.role === 'TEAM_MEMBER' && (u.teamId === currentTeamId || !u.teamId || currentTeamId === 'team_001')
      );

      const rosterUsers = membersOnly;

      const computedRoster: LeaderboardMember[] = rosterUsers.slice(0, 7).map((u) => {
        const uContacts = teamContacts.filter((c) => c.allocatedToId === u.id);
        const uLogs = teamLogs.filter((l) => l.teamMemberId === u.id);
        const totalCalls = uLogs.length > 0 ? uLogs.length : uContacts.reduce((acc, c) => acc + (c.attemptCount || 1), 0);
        const interestedCount = uContacts.filter((c) => c.status === 'INTERESTED').length;

        return {
          user: u,
          totalCalls,
          interestedCount,
          rank: 0,
        };
      });

      computedRoster.sort((a, b) => b.interestedCount - a.interestedCount);
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

  // Filter first 3 follow-up numbers (starred or follow-up status)
  const followUpContacts = contacts
    .filter((c) => c.status !== 'NEW' && (c.isFollowUp || c.status === 'NOT_ANSWERED' || c.status === 'PHONE_OFF'))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good morning, ${user?.fullName.split(' ')[0]} 👋`}
        description="Here is your monthly calling activity and performance summary."
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

      {/* Progress Bar Visualizer */}
      <Card>
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Monthly Call Completion Goal</span>
            <span className="text-blue-600 font-bold">{completionPercentage}% Completed</span>
          </div>
          <div className="perf-track">
            <div className="perf-bar" style={{ width: `${completionPercentage}%` }} />
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

            {/* View List Button: Navigates to Call Logs page with Follow-Up filter pre-selected */}
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

        {/* Dashboard Leaderboard Card */}
        <Leaderboard
          items={leaderboard.map((m) => ({
            id: m.user.id,
            rank: m.rank,
            name: m.user.fullName,
            avatarUrl: m.user.avatarUrl,
            isCurrentUser: m.user.id === user?.id,
            primaryValue: m.interestedCount,
            secondaryValue: m.totalCalls,
            primaryLabel: 'Interested',
            secondaryLabel: 'Total Calls',
            unitLabel: 'calls',
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
