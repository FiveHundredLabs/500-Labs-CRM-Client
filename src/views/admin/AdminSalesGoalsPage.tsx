import React, { useState, useEffect } from 'react';
import type { Team, TeamSalesTarget, TeamTargetTier } from '../../models/domain';
import { teamRepository, salesTargetRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { LoadingState } from '../../components/shared/LoadingState';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { formatCurrency } from '../../utils/currency';
import toast from 'react-hot-toast';
import {
  Target,
  Trophy,
  DollarSign,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  HelpCircle,
  Users,
  UserCheck,
} from 'lucide-react';

export const AdminSalesGoalsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [targets, setTargets] = useState<TeamSalesTarget[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspect Member-Wise Breakdown Modal State
  const [inspectingMembersTarget, setInspectingMembersTarget] = useState<TeamSalesTarget | null>(null);

  // Filter States
  const currentMonthStr = new Date().toISOString().substring(0, 7); // e.g. "2026-08"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACHIEVED' | 'UNLOCKED' | 'PROGRESS'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TeamSalesTarget | null>(null);
  const [formTeamId, setFormTeamId] = useState<string>('');
  const [formMonth, setFormMonth] = useState<string>(currentMonthStr);
  const [formTargetAmount, setFormTargetAmount] = useState<number>(35000);
  const [formNotes, setFormNotes] = useState<string>('');
  const [formTiers, setFormTiers] = useState<TeamTargetTier[]>([
    { minPercentage: 80, allowanceAmount: 1000, title: '80% Incentive Tier' },
    { minPercentage: 100, allowanceAmount: 2000, title: '100% Target Achieved Allowance' },
    { minPercentage: 120, allowanceAmount: 3000, title: '120% Super Achiever Bonus' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deletingTarget, setDeletingTarget] = useState<TeamSalesTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allTeams, allTargets] = await Promise.all([
        teamRepository.getAll(),
        salesTargetRepository.getAll(
          selectedMonth || undefined,
          selectedTeamFilter !== 'ALL' ? selectedTeamFilter : undefined
        ),
      ]);
      setTeams(allTeams);
      setTargets(allTargets);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load sales targets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedTeamFilter]);

  const openCreateModal = () => {
    setEditingTarget(null);
    setFormTeamId(teams[0]?.id || '');
    setFormMonth(selectedMonth || currentMonthStr);
    setFormTargetAmount(35000);
    setFormNotes('');
    setFormTiers([
      { minPercentage: 80, allowanceAmount: 1000, title: '80% Incentive Tier' },
      { minPercentage: 100, allowanceAmount: 2000, title: '100% Target Achieved Allowance' },
      { minPercentage: 120, allowanceAmount: 3000, title: '120% Super Achiever Bonus' },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (target: TeamSalesTarget) => {
    setEditingTarget(target);
    setFormTeamId(target.teamId);
    setFormMonth(target.month);
    setFormTargetAmount(target.targetAmount);
    setFormNotes(target.notes || '');
    setFormTiers(
      target.tiers && target.tiers.length > 0
        ? target.tiers.map((t) => ({
            minPercentage: Number(t.minPercentage),
            allowanceAmount: Number(t.allowanceAmount),
            title: t.title || `${t.minPercentage}% Tier`,
          }))
        : [
            { minPercentage: 80, allowanceAmount: 1000, title: '80% Tier' },
            { minPercentage: 100, allowanceAmount: 2000, title: '100% Tier' },
          ]
    );
    setIsModalOpen(true);
  };

  const handleAddTier = () => {
    const lastTier = formTiers[formTiers.length - 1];
    const nextPct = lastTier ? lastTier.minPercentage + 20 : 100;
    const nextAllowance = lastTier ? lastTier.allowanceAmount + 1000 : 2000;
    setFormTiers([
      ...formTiers,
      { minPercentage: nextPct, allowanceAmount: nextAllowance, title: `${nextPct}% Incentive Tier` },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (formTiers.length <= 1) {
      toast.error('At least one achievement tier is required.');
      return;
    }
    setFormTiers(formTiers.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: keyof TeamTargetTier, value: any) => {
    const updated = [...formTiers];
    updated[index] = { ...updated[index], [field]: value };
    setFormTiers(updated);
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTeamId) {
      toast.error('Please select a team.');
      return;
    }
    if (formTargetAmount <= 0) {
      toast.error('Please enter a valid monthly sales target goal amount.');
      return;
    }

    // Sort tiers by minPercentage ascending
    const sortedTiers = [...formTiers].sort((a, b) => a.minPercentage - b.minPercentage);

    setIsSaving(true);
    try {
      await salesTargetRepository.upsert({
        teamId: formTeamId,
        month: formMonth,
        targetAmount: formTargetAmount,
        notes: formNotes,
        tiers: sortedTiers,
      });

      const teamName = teams.find((t) => t.id === formTeamId)?.name || 'Team';
      toast.success(`Configured individual sales goals & allowances for ${teamName} (${formMonth})`);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save sales target.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTarget = async () => {
    if (!deletingTarget) return;
    setIsDeleting(true);
    try {
      await salesTargetRepository.delete(deletingTarget.id);
      toast.success('Sales goal configuration removed.');
      setDeletingTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete target.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Flatten and filter individual members
  const allMembers = targets.flatMap((t) =>
    (t.memberBreakdowns || []).map((m) => {
      const targetAmt = Number(t.targetAmount || 0);
      const memberSales = Number(m.actualSales || 0);
      const pct = targetAmt > 0 ? (memberSales / targetAmt) * 100 : 0;
      const sorted = [...(t.tiers || [])].sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage));
      const matchedTier = sorted.find((tier) => pct >= Number(tier.minPercentage)) || null;
      const allowance = matchedTier ? Number(matchedTier.allowanceAmount || 0) : Number(m.unlockedAllowance || 0);

      return {
        ...m,
        teamId: t.teamId,
        teamName: t.team?.name || 'Team',
        teamCode: t.team?.code || '',
        targetAmount: targetAmt,
        actualSales: memberSales,
        achievementPercentage: Math.round(pct * 100) / 100,
        unlockedAllowance: allowance,
        highestUnlockedTier: matchedTier || m.highestUnlockedTier,
        parentTarget: t,
      };
    })
  );

  const filteredMembers = allMembers.filter((m) => {
    if (selectedTeamFilter !== 'ALL' && m.teamId !== selectedTeamFilter) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = m.fullName?.toLowerCase().includes(query);
      const matchUser = m.username?.toLowerCase().includes(query);
      const matchTeam = m.teamName?.toLowerCase().includes(query);
      if (!matchName && !matchUser && !matchTeam) return false;
    }
    if (statusFilter === 'ACHIEVED') return (m.achievementPercentage || 0) >= 100;
    if (statusFilter === 'UNLOCKED') return (m.unlockedAllowance || 0) > 0;
    if (statusFilter === 'PROGRESS') return (m.achievementPercentage || 0) < 100;
    return true;
  });

  // Aggregated KPIs strictly based on filtered individual members
  const totalTargetSum = filteredMembers.reduce((sum, m) => sum + (m.targetAmount || 0), 0);
  const totalRealizedSales = filteredMembers.reduce((sum, m) => sum + (m.actualSales || 0), 0);
  const avgAchievement = filteredMembers.length > 0
    ? filteredMembers.reduce((sum, m) => sum + (m.achievementPercentage || 0), 0) / filteredMembers.length
    : (totalTargetSum > 0 ? (totalRealizedSales / totalTargetSum) * 100 : 0);
  const totalUnlockedAllowance = filteredMembers.reduce((sum, m) => sum + (m.unlockedAllowance || 0), 0);

  if (loading && targets.length === 0) return <LoadingState rows={6} />;

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 overflow-hidden max-w-7xl mx-auto">
      <PageHeader
        title="Individual Sales Goals & Allowance Incentives"
        description="Monitor individual tele-calling specialist sales quotas, milestone achievements, and tiered cash allowance pools"
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
            className="w-full sm:w-auto"
          >
            Configure Goal & Tiers
          </Button>
        }
      />

      {/* Top Aggregated Metric Cards (Individual-Wise) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Target Goals"
          value={formatCurrency(totalTargetSum)}
          subtitle={`Across ${filteredMembers.length} tele-calling specialists`}
          icon={<Target className="w-5 h-5 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Delivered Sales Realized"
          value={formatCurrency(totalRealizedSales)}
          subtitle="Live from confirmed deliveries"
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          accentColor="green"
        />
        <StatCard
          title="Avg Goal Achievement"
          value={`${avgAchievement.toFixed(1)}%`}
          subtitle={avgAchievement >= 100 ? 'Target achieved! 🎉' : `${(100 - avgAchievement).toFixed(1)}% to 100% goal`}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          accentColor="purple"
        />
        <StatCard
          title="Unlocked Allowance Pool"
          value={formatCurrency(totalUnlockedAllowance)}
          subtitle={`${filteredMembers.filter((m) => m.unlockedAllowance > 0).length} specialists eligible for payout`}
          icon={<Trophy className="w-5 h-5 text-amber-600" />}
          accentColor="amber"
        />
      </div>

      {/* Filter and Month Selection Bar */}
      <div className="p-3.5 sm:p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Month Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <label className="text-xs font-bold text-slate-700">Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Team Filter (e.g. Brand Alpha, Brand Beta) */}
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <label className="text-xs font-bold text-slate-700">Team Filter:</label>
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="text-xs font-semibold bg-blue-50/60 border border-blue-200 text-blue-900 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Teams ({teams.length})</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Specialist */}
          <div className="w-full md:w-64">
            <Input
              type="text"
              placeholder="Search specialist name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Status Filter Pills */}
        {/* <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium mr-1 text-[11px]">Filter View:</span>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Specialists ({allMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACHIEVED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'ACHIEVED'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            ⭐ Goal Met (100%+) ({allMembers.filter((m) => m.achievementPercentage >= 100).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('UNLOCKED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'UNLOCKED'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
            }`}
          >
            🏆 Tier Bonus Unlocked ({allMembers.filter((m) => m.unlockedAllowance > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PROGRESS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'PROGRESS'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            ⏳ In Progress (&lt;100%) ({allMembers.filter((m) => m.achievementPercentage < 100).length})
          </button>
        </div> */}
      </div>

      {/* Main Individual Specialists Performance Listing */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-sm">
              Tele-Calling Specialists Performance &amp; Allowance Payouts ({selectedMonth || 'Current Month'})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredMembers.length} Specialists Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Specialist / Rep</th>
                <th className="py-3 px-3.5">Assigned Brand Team</th>
                <th className="py-3 px-3.5 font-mono">Monthly Goal</th>
                <th className="py-3 px-3.5 font-mono">Delivered Sales (LKR)</th>
                <th className="py-3 px-3.5 w-44">Achievement Progress</th>
                <th className="py-3 px-3.5 font-mono">Earned Allowance</th>
                <th className="py-3 px-3.5">Achieved Milestone</th>
                <th className="py-3 px-3.5 text-right">Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">No tele-calling specialists match the selected criteria.</p>
                      <p className="text-xs text-slate-400">
                        Try changing the team filter, search query, or selecting another month.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const pct = member.achievementPercentage || 0;
                  const isAchieved = pct >= 100;
                  const isNear = pct >= 80 && pct < 100;

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Member */}
                      <td className="py-3 px-3.5 font-sans">
                        <div className="font-bold text-slate-900">{member.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          @{member.username} • {member.ordersCount} delivered orders
                        </div>
                      </td>

                      {/* Team */}
                      <td className="py-3 px-3.5 font-sans">
                        <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {member.teamName}
                        </span>
                      </td>

                      {/* Target Goal */}
                      <td className="py-3 px-3.5 font-mono text-slate-700 text-xs">
                        {formatCurrency(member.targetAmount)}
                      </td>

                      {/* Personal Sales */}
                      <td className="py-3 px-3.5 font-mono font-bold text-emerald-700 text-xs">
                        {formatCurrency(member.actualSales)}
                      </td>

                      {/* Progress */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-1 font-sans">
                          <div className="flex items-center justify-between text-[11px]">
                            <span
                              className={`font-bold font-mono ${
                                isAchieved ? 'text-emerald-700' : isNear ? 'text-amber-700' : 'text-slate-700'
                              }`}
                            >
                              {pct.toFixed(1)}%
                            </span>
                            {isAchieved ? (
                              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                                <Trophy className="w-3 h-3 text-amber-500" /> Goal Met
                              </span>
                            ) : null}
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isAchieved ? 'bg-emerald-500' : isNear ? 'bg-amber-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Earned Allowance */}
                      <td className="py-3 px-3.5 font-sans">
                        {member.unlockedAllowance > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-mono">
                            <Award className="w-3 h-3 text-amber-600" />
                            {formatCurrency(member.unlockedAllowance)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">0.00 LKR</span>
                        )}
                      </td>

                      {/* Milestone Status */}
                      <td className="py-3 px-3.5 font-sans">
                        {member.highestUnlockedTier?.title ? (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {member.highestUnlockedTier.title}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">In Progress</span>
                        )}
                      </td>

                      {/* Edit Policy */}
                      <td className="py-3 px-3.5 text-right font-sans">
                        {member.parentTarget && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Edit2 className="w-3 h-3 text-slate-500" />}
                            onClick={() => openEditModal(member.parentTarget)}
                            title="Edit Target Quotas & Tiers for this team"
                          >
                            Edit Policy
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Set / Edit Sales Goal & Allowance Tiers Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTarget ? 'Edit Ongoing Team Sales Goal & Tiers' : 'Set Ongoing Monthly Sales Goal'}
        description="Configure target sales revenue and define percentage-based achievement allowance incentives. This policy applies every month automatically until updated."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveTarget} className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Ongoing Monthly Policy</span>
            </div>
            <p className="text-blue-700">
              Once configured, this monthly sales goal and its allowance tiers will automatically carry over and apply to every month until you modify it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Assigned Team *"
              value={formTeamId}
              onChange={(e) => setFormTeamId(e.target.value)}
              disabled={!!editingTarget}
              options={teams.map((t) => ({
                value: t.id,
                label: `${t.name} (${t.code})`,
              }))}
              required
            />

            <Input
              label="Effective Starting Month *"
              type="month"
              value={formMonth}
              onChange={(e) => setFormMonth(e.target.value)}
              required
            />
          </div>

          <Input
            label="Monthly Sales Goal Amount (LKR) *"
            type="number"
            min="1000"
            step="1000"
            value={formTargetAmount}
            onChange={(e) => setFormTargetAmount(parseFloat(e.target.value) || 0)}
            placeholder="e.g. 1,000,000"
            required
          />

          {/* Tiered Allowance Builder */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-900 block">
                  Tiered Achievement Allowance Rules
                </label>
                <span className="text-[11px] text-slate-400">
                  Allowances unlock sequentially as the team achieves target milestone percentages.
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddTier}
                className="text-xs py-1"
              >
                Add Tier
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {formTiers.map((tier, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <div className="w-full sm:w-28">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Min Goal %
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={tier.minPercentage}
                        onChange={(e) =>
                          handleTierChange(idx, 'minPercentage', parseFloat(e.target.value) || 0)
                        }
                        className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        required
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  <div className="w-full sm:w-44">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Allowance (LKR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={tier.allowanceAmount}
                      onChange={(e) =>
                        handleTierChange(idx, 'allowanceAmount', parseFloat(e.target.value) || 0)
                      }
                      className="w-full text-xs font-mono font-bold text-amber-900 bg-white border border-slate-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. 20,000"
                      required
                    />
                  </div>

                  <div className="w-full sm:flex-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Tier Label / Title
                    </label>
                    <input
                      type="text"
                      value={tier.title || ''}
                      onChange={(e) => handleTierChange(idx, 'title', e.target.value)}
                      placeholder="e.g. 100% Target Achieved Bonus"
                      className="w-full text-xs bg-white border border-slate-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="self-end sm:self-center pt-3 sm:pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTier(idx)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1"
                      title="Remove Tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Input
            label="Strategy Notes / Campaign Guidelines (Optional)"
            placeholder="e.g. Q3 Sales Booster campaign — extra bonus for hitting 120%"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              {editingTarget ? 'Save Changes' : 'Save Sales Goal & Allowances'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingTarget}
        onClose={() => setDeletingTarget(null)}
        onConfirm={handleDeleteTarget}
        title="Remove Sales Goal Configuration?"
        message={`Are you sure you want to remove the sales goal and allowance tiers for ${deletingTarget?.team?.name || 'this team'} (${deletingTarget?.month})?`}
        confirmText="Yes, Delete Target"
        isLoading={isDeleting}
      />

      {/* Inspect Individual Team Members Sales & Allowance Payouts Modal */}
      <Dialog
        isOpen={!!inspectingMembersTarget}
        onClose={() => setInspectingMembersTarget(null)}
        title={`Member-Wise Sales & Allowance Payouts — ${inspectingMembersTarget?.team?.name || 'Team'}`}
        description={`Individual performance, goal progress, and earned milestone allowances for ${inspectingMembersTarget?.evaluatedMonth || selectedMonth}`}
        maxWidth="3xl"
      >
        {inspectingMembersTarget && (
          <div className="space-y-4">
            {/* Top Summary Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Monthly Goal / Rep</span>
                <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                  {formatCurrency(inspectingMembersTarget.targetAmount)}
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Total Team Sales</span>
                <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                  {formatCurrency(inspectingMembersTarget.actualSales || 0)}
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Total Allowance Pool</span>
                <div className="text-sm font-bold text-amber-900 font-mono mt-0.5">
                  {formatCurrency(inspectingMembersTarget.unlockedAllowance || 0)}
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">100%+ Achievers</span>
                <div className="text-sm font-bold text-blue-700 font-mono mt-0.5">
                  {inspectingMembersTarget.totalAchieversCount || 0} / {inspectingMembersTarget.membersCount || 0} reps
                </div>
              </div>
            </div>

            {/* Desktop Table View (sm: and up) */}
            <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-[30%]">Team Member</th>
                    <th className="py-2.5 px-3 w-[22%] font-mono">Personal Sales</th>
                    <th className="py-2.5 px-3 w-[26%]">Goal Progress</th>
                    <th className="py-2.5 px-3 w-[22%] font-mono text-right">Earned Allowance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {!inspectingMembersTarget.memberBreakdowns || inspectingMembersTarget.memberBreakdowns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400 font-sans italic">
                        No team members registered under {inspectingMembersTarget.team?.name || 'this team'}.
                      </td>
                    </tr>
                  ) : (
                    inspectingMembersTarget.memberBreakdowns.map((member) => {
                      const pct = member.achievementPercentage || 0;
                      const isAchieved = pct >= 100;
                      const isNear = pct >= 80 && pct < 100;

                      return (
                        <tr key={member.id} className="hover:bg-slate-50">
                          {/* Member */}
                          <td className="py-2.5 px-3 font-sans">
                            <div className="font-bold text-slate-900">{member.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">@{member.username} ({member.ordersCount} orders)</div>
                          </td>

                          {/* Personal Sales */}
                          <td className="py-2.5 px-3 font-bold text-emerald-700 text-xs">
                            {formatCurrency(member.actualSales)}
                          </td>

                          {/* Goal Progress */}
                          <td className="py-2.5 px-3">
                            <div className="space-y-1 font-sans">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className={`font-bold font-mono ${isAchieved ? 'text-emerald-700' : isNear ? 'text-amber-700' : 'text-slate-700'}`}>
                                  {pct.toFixed(1)}%
                                </span>
                                {isAchieved ? (
                                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                                    <Trophy className="w-3 h-3 text-amber-500" /> Goal Met
                                  </span>
                                ) : null}
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    isAchieved ? 'bg-emerald-500' : isNear ? 'bg-amber-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Earned Allowance */}
                          <td className="py-2.5 px-3 text-right">
                            {member.unlockedAllowance > 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-mono">
                                  <Award className="w-3 h-3 text-amber-600" />
                                  {formatCurrency(member.unlockedAllowance)}
                                </span>
                                {member.highestUnlockedTier?.title && (
                                  <span className="text-[10px] text-slate-400 font-sans mt-0.5">
                                    {member.highestUnlockedTier.title}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic font-sans">
                                0.00 LKR
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< sm) */}
            <div className="block sm:hidden space-y-2.5">
              {!inspectingMembersTarget.memberBreakdowns || inspectingMembersTarget.memberBreakdowns.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
                  No team members registered under {inspectingMembersTarget.team?.name || 'this team'}.
                </div>
              ) : (
                inspectingMembersTarget.memberBreakdowns.map((member) => {
                  const pct = member.achievementPercentage || 0;
                  const isAchieved = pct >= 100;
                  const isNear = pct >= 80 && pct < 100;

                  return (
                    <div key={member.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{member.fullName}</div>
                          <div className="text-[10px] text-slate-400">@{member.username}</div>
                        </div>
                        {member.unlockedAllowance > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-mono">
                            <Award className="w-3 h-3 text-amber-600" />
                            {formatCurrency(member.unlockedAllowance)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">0.00 LKR</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block">Personal Sales</span>
                          <strong className="text-emerald-700">{formatCurrency(member.actualSales)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block">Goal Progress</span>
                          <strong className={isAchieved ? 'text-emerald-700' : isNear ? 'text-amber-700' : 'text-slate-700'}>
                            {pct.toFixed(1)}% {isAchieved ? '🎉' : ''}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setInspectingMembersTarget(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
