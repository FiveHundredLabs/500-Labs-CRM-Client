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
  HelpCircle
} from 'lucide-react';

export const AdminSalesGoalsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [targets, setTargets] = useState<TeamSalesTarget[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const currentMonthStr = new Date().toISOString().substring(0, 7); // e.g. "2026-08"
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<TeamSalesTarget | null>(null);
  const [formTeamId, setFormTeamId] = useState<string>('');
  const [formMonth, setFormMonth] = useState<string>(currentMonthStr);
  const [formTargetAmount, setFormTargetAmount] = useState<number>(1000000);
  const [formNotes, setFormNotes] = useState<string>('');
  const [formTiers, setFormTiers] = useState<TeamTargetTier[]>([
    { minPercentage: 80, allowanceAmount: 10000, title: '80% Tier Bonus' },
    { minPercentage: 100, allowanceAmount: 20000, title: '100% Target Achieved Allowance' },
    { minPercentage: 120, allowanceAmount: 35000, title: '120% Super Achiever Incentive' },
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
    setFormTargetAmount(1000000);
    setFormNotes('');
    setFormTiers([
      { minPercentage: 80, allowanceAmount: 10000, title: '80% Threshold Allowance' },
      { minPercentage: 100, allowanceAmount: 20000, title: '100% Target Achieved Allowance' },
      { minPercentage: 120, allowanceAmount: 35000, title: '120% Super Bonus' },
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
            { minPercentage: 80, allowanceAmount: 10000, title: '80% Tier' },
            { minPercentage: 100, allowanceAmount: 20000, title: '100% Tier' },
          ]
    );
    setIsModalOpen(true);
  };

  const handleAddTier = () => {
    const lastTier = formTiers[formTiers.length - 1];
    const nextPct = lastTier ? lastTier.minPercentage + 20 : 100;
    const nextAllowance = lastTier ? lastTier.allowanceAmount + 10000 : 20000;
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
      toast.success(`Configured sales goal & allowances for ${teamName} (${formMonth})`);
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

  // Aggregated KPIs
  const totalTargetSum = targets.reduce((sum, t) => sum + (t.targetAmount || 0), 0);
  const totalRealizedSales = targets.reduce((sum, t) => sum + (t.actualSales || 0), 0);
  const avgAchievement = totalTargetSum > 0 ? (totalRealizedSales / totalTargetSum) * 100 : 0;
  const totalUnlockedAllowance = targets.reduce((sum, t) => sum + (t.unlockedAllowance || 0), 0);

  if (loading && targets.length === 0) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Monthly Sales Goals & Allowance Incentives"
        description="Set team-wise monthly sales targets and configure tiered achievement allowances (e.g. 100% = 20,000 LKR, 80% = 10,000 LKR)"
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            Set Team Sales Goal
          </Button>
        }
      />

      {/* Top Aggregated Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Target Goals"
          value={formatCurrency(totalTargetSum)}
          subtitle={`Across ${targets.length} team configurations`}
          icon={<Target className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Delivered Sales Realized"
          value={formatCurrency(totalRealizedSales)}
          subtitle="Live from confirmed deliveries"
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Avg Goal Achievement"
          value={`${avgAchievement.toFixed(1)}%`}
          subtitle={avgAchievement >= 100 ? 'Target achieved! 🎉' : `${(100 - avgAchievement).toFixed(1)}% to 100% goal`}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          title="Unlocked Allowance Pool"
          value={formatCurrency(totalUnlockedAllowance)}
          subtitle="Eligible achievement payouts"
          icon={<Trophy className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Filter and Month Selection Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <label className="text-xs font-bold text-slate-700">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <label className="text-xs font-bold text-slate-700">Team:</label>
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-sans flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Allowances unlock automatically as live sales reach configured tier percentages.</span>
        </div>
      </div>

      {/* Team Targets Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span>Team Sales Goals & Performance Overview ({selectedMonth || 'All Time'})</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">{targets.length} Teams Configured</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5">Team & Code</th>
                <th className="py-3 px-3.5 font-mono">Month</th>
                <th className="py-3 px-3.5 font-mono">Target Goal (LKR)</th>
                <th className="py-3 px-3.5 font-mono">Actual Realized (LKR)</th>
                <th className="py-3 px-3.5 w-48">Achievement Progress</th>
                <th className="py-3 px-3.5">Unlocked Allowance</th>
                <th className="py-3 px-3.5">Incentive Tiers</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {targets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Target className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600">No monthly sales targets configured for {selectedMonth}.</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Click "Set Team Sales Goal" to establish monthly revenue targets and tiered achievement allowance bonuses.
                      </p>
                      <Button variant="outline" size="sm" onClick={openCreateModal} className="mt-2">
                        Set Sales Goal
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                targets.map((target) => {
                  const teamName = target.team?.name || 'Unknown Team';
                  const pct = target.achievementPercentage || 0;
                  const isAchieved = pct >= 100;
                  const isNear = pct >= 80 && pct < 100;

                  return (
                    <tr key={target.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Team */}
                      <td className="py-3 px-3.5 font-sans">
                        <div className="font-bold text-slate-900">{teamName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{target.team?.code || target.teamId}</div>
                      </td>

                      {/* Month */}
                      <td className="py-3 px-3.5 text-slate-600 text-xs font-semibold">
                        {target.month}
                      </td>

                      {/* Target Goal */}
                      <td className="py-3 px-3.5 text-slate-900 font-bold text-xs">
                        {formatCurrency(target.targetAmount)}
                      </td>

                      {/* Actual Realized */}
                      <td className="py-3 px-3.5 font-bold text-emerald-700 text-xs">
                        {formatCurrency(target.actualSales || 0)}
                      </td>

                      {/* Achievement Progress Bar */}
                      <td className="py-3 px-3.5">
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
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isAchieved
                                  ? 'bg-emerald-500'
                                  : isNear
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Unlocked Allowance */}
                      <td className="py-3 px-3.5 font-sans">
                        {target.unlockedAllowance && target.unlockedAllowance > 0 ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-mono w-fit">
                              <Award className="w-3 h-3 text-amber-600" />
                              {formatCurrency(target.unlockedAllowance)}
                            </span>
                            {target.highestUnlockedTier?.title && (
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                {target.highestUnlockedTier.title}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            0.00 LKR (Need &ge; {target.tiers[0]?.minPercentage || 80}%)
                          </span>
                        )}
                      </td>

                      {/* Tiers summary */}
                      <td className="py-3 px-3.5 font-sans">
                        <div className="flex flex-wrap gap-1">
                          {(target.tiers || []).map((tier, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                tier.isUnlocked
                                  ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                              title={`${tier.title || 'Tier'}: ${tier.minPercentage}% = ${formatCurrency(tier.allowanceAmount)}`}
                            >
                              {tier.minPercentage}%: {formatCurrency(tier.allowanceAmount)}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 font-sans">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Edit2 className="w-3.5 h-3.5 text-blue-600" />}
                            onClick={() => openEditModal(target)}
                            className="text-xs px-2 py-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                            onClick={() => setDeletingTarget(target)}
                            className="text-xs px-2 py-1 text-slate-700 hover:text-rose-600 hover:bg-rose-50"
                          >
                            Delete
                          </Button>
                        </div>
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
        title={editingTarget ? 'Edit Team Sales Goal & Tiers' : 'Set Monthly Team Sales Goal'}
        description="Configure target sales revenue and define percentage-based achievement allowance incentives"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveTarget} className="space-y-4">
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
              label="Target Month *"
              type="month"
              value={formMonth}
              onChange={(e) => setFormMonth(e.target.value)}
              disabled={!!editingTarget}
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
    </div>
  );
};
