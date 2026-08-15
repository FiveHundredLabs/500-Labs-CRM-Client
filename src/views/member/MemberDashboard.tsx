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
import { PhoneCall, CheckCircle2, Clock, Trophy, Phone, ArrowRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import usersSeed from '../../data/seed/users.json';

interface LeaderboardMember {
  user: User;
  totalCalls: number;
  interestedCount: number;
  rank: number;
}

// Set Kasun Perera as #1 (78/285 calls) and Pathum Nishshanka (current user) as #3 (62/242 calls)
const MOCK_CALL_STATS: Record<string, { totalCalls: number; interestedCount: number }> = {
  usr_mem_02: { totalCalls: 285, interestedCount: 78 }, // Kasun Perera (#1)
  usr_mem_06: { totalCalls: 260, interestedCount: 68 }, // Nuwan Wickramasinghe (#2)
  usr_mem_01: { totalCalls: 242, interestedCount: 62 }, // Pathum Nishshanka (Current User #3)
  usr_mem_07: { totalCalls: 190, interestedCount: 42 }, // Ruwani Gunawardena (#4)
  usr_mem_08: { totalCalls: 175, interestedCount: 38 }, // Tharindu De Silva (#5)
  usr_mem_09: { totalCalls: 150, interestedCount: 31 }, // Amali Ratnayake (#6)
  usr_mem_10: { totalCalls: 130, interestedCount: 26 }, // Sanath Bandara (#7)
};

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
      const [mContacts, mLogs, mOrders, allUsers] = await Promise.all([
        contactRepository.getByMemberId(user.id),
        callLogRepository.getByMemberId(user.id),
        orderRepository.getByMemberId(user.id),
        userRepository.getAll(),
      ]);

      setContacts(mContacts);
      setCallLogs(mLogs);
      setOrders(mOrders);

      // Build Leaderboard Roster
      const membersOnly = allUsers.filter(
        (u) => u.role === 'TEAM_MEMBER' && (u.teamId === user.teamId || !u.teamId || user.teamId === 'team_001')
      );

      const rosterUsers = membersOnly.length >= 7 ? membersOnly : (usersSeed as User[]).filter((u) => u.role === 'TEAM_MEMBER');

      const computedRoster: LeaderboardMember[] = rosterUsers.slice(0, 7).map((u) => {
        const stats = MOCK_CALL_STATS[u.id] || { totalCalls: 120, interestedCount: 25 };
        return {
          user: u,
          totalCalls: stats.totalCalls,
          interestedCount: stats.interestedCount,
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

  // Leaderboard #1 Winner (Kasun Perera - Rank 1)
  const topRankedMember = leaderboard.find((m) => m.rank === 1) || {
    user: { fullName: 'Kasun Perera', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' } as User,
    interestedCount: 78,
    totalCalls: 285,
    rank: 1,
  };

  // Current logged in user position in leaderboard (Pathum Nishshanka - Rank 3 with 62/242 calls)
  const currentUserBoardMember = leaderboard.find((m) => m.user.id === user?.id) || {
    user: user || ({ fullName: 'Pathum Nishshanka' } as User),
    totalCalls: 242,
    interestedCount: 62,
    rank: 3,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good morning, ${user?.fullName.split(' ')[0]} 👋`}
        description="Here is your daily calling activity and performance summary."
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
            <span>Daily Call Completion Goal</span>
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-slate-900 text-base">
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Team Leaderboard</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {/* 1. TOP POSITION (#1 RANKED USER - Kasun Perera) */}
            <div className="p-4 bg-gradient-to-br from-amber-500/10 via-orange-50/50 to-sky-50/60 border border-amber-200/90 rounded-2xl space-y-2.5 relative overflow-hidden shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Profile Image with Golden Crown Badge */}
                  <div className="relative shrink-0">
                    <img
                      src={
                        topRankedMember.user.avatarUrl ||
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={topRankedMember.user.fullName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-xs"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                      #1
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                      <Trophy className="w-3 h-3 fill-amber-400 text-amber-500" />
                      <span>Top Tele-caller</span>
                    </div>
                    {/* First Name */}
                    <div className="text-base font-extrabold text-slate-900 leading-tight truncate">
                      {topRankedMember.user.fullName.split(' ')[0]}
                    </div>
                  </div>
                </div>

                {/* Number of Interested / Total Calls */}
                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-blue-700 font-mono leading-none">
                    {topRankedMember.interestedCount}/{topRankedMember.totalCalls}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-1 whitespace-nowrap">
                    calls
                  </div>
                </div>
              </div>
            </div>

            {/* 2. CURRENT LOGGED-IN USER RANK SECTION (#3 RANKED - Pathum Nishshanka - 62/242 calls) */}
            <div className="p-3 bg-slate-50/90 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                  #{currentUserBoardMember.rank}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-xs">
                    Your Rank: <span className="font-bold text-blue-600">#{currentUserBoardMember.rank} in Team</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{currentUserBoardMember.user.fullName.split(' ')[0]}</div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-slate-900 text-xs">
                  {currentUserBoardMember.interestedCount}/{currentUserBoardMember.totalCalls} calls
                </div>
                <div className="text-[10px] text-slate-400">Your Progress</div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full text-xs"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/member/leaderboard')}
            >
              View Full Leaderboard
            </Button>
          </CardContent>
        </Card>
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
