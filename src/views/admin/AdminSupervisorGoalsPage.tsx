import React, { useState, useEffect } from 'react';
import type { User, SupervisorSalesTarget, SupervisorTargetTier, UserRole } from '../../models/domain';
import { userRepository, supervisorTargetRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { LoadingState } from '../../components/shared/LoadingState';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
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
  Award,
  Users,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Shield,
} from 'lucide-react';

export const AdminSupervisorGoalsPage: React.FC = () => {
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [targets, setTargets] = useState<SupervisorSalesTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Expand breakdown
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<SupervisorSalesTarget | null>(null);
  const [formSupervisorId, setFormSupervisorId] = useState<string>('');
  const [formMonth, setFormMonth] = useState<string>(currentMonthStr);
  const [formTargetAmount, setFormTargetAmount] = useState<number>(500000);
  const [formNotes, setFormNotes] = useState<string>('');
  const [formTiers, setFormTiers] = useState<SupervisorTargetTier[]>([
    { minPercentage: 80, allowanceAmount: 10000, title: '80% Team Goal Incentive' },
    { minPercentage: 90, allowanceAmount: 20000, title: '90% Team Goal Incentive' },
    { minPercentage: 100, allowanceAmount: 35000, title: '100% Full Team Goal Bonus' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Delete
  const [deletingTarget, setDeletingTarget] = useState<SupervisorSalesTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allSupervisors, allTargets] = await Promise.all([
        userRepository.getByRole('SUPERVISOR' as UserRole),
        supervisorTargetRepository.getAll(selectedMonth || undefined),
      ]);
      setSupervisors(allSupervisors.filter((u) => u.isActive));
      setTargets(allTargets);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load supervisor goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const openCreateModal = () => {
    setEditingTarget(null);
    setFormSupervisorId(supervisors[0]?.id || '');
    setFormMonth(selectedMonth || currentMonthStr);
    setFormTargetAmount(500000);
    setFormNotes('');
    setFormTiers([
      { minPercentage: 80, allowanceAmount: 10000, title: '80% Team Goal Incentive' },
      { minPercentage: 90, allowanceAmount: 20000, title: '90% Team Goal Incentive' },
      { minPercentage: 100, allowanceAmount: 35000, title: '100% Full Team Goal Bonus' },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (target: SupervisorSalesTarget) => {
    setEditingTarget(target);
    setFormSupervisorId(target.supervisorId);
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
            { minPercentage: 80, allowanceAmount: 10000, title: '80% Team Goal Incentive' },
            { minPercentage: 100, allowanceAmount: 35000, title: '100% Full Team Goal Bonus' },
          ]
    );
    setIsModalOpen(true);
  };

  const handleAddTier = () => {
    const last = formTiers[formTiers.length - 1];
    const nextPct = last ? Math.min(last.minPercentage + 10, 200) : 100;
    const nextAmt = last ? last.allowanceAmount + 10000 : 20000;
    setFormTiers([...formTiers, { minPercentage: nextPct, allowanceAmount: nextAmt, title: `${nextPct}% Team Goal Incentive` }]);
  };

  const handleRemoveTier = (index: number) => {
    if (formTiers.length <= 1) {
      toast.error('At least one tier is required.');
      return;
    }
    setFormTiers(formTiers.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: keyof SupervisorTargetTier, value: any) => {
    const updated = [...formTiers];
    updated[index] = { ...updated[index], [field]: value };
    setFormTiers(updated);
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupervisorId) {
      toast.error('Please select a supervisor.');
      return;
    }
    if (formTargetAmount <= 0) {
      toast.error('Please enter a valid collective team sales target.');
      return;
    }
    const sortedTiers = [...formTiers].sort((a, b) => a.minPercentage - b.minPercentage);
    setIsSaving(true);
    try {
      await supervisorTargetRepository.upsert({
        supervisorId: formSupervisorId,
        month: formMonth,
        targetAmount: formTargetAmount,
        notes: formNotes,
        tiers: sortedTiers,
      });
      const supName = supervisors.find((s) => s.id === formSupervisorId)?.fullName || 'Supervisor';
      toast.success(`Supervisor goal & tiers configured for ${supName} (${formMonth})`);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save supervisor goal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTarget = async () => {
    if (!deletingTarget) return;
    setIsDeleting(true);
    try {
      await supervisorTargetRepository.delete(deletingTarget.id);
      toast.success('Supervisor goal configuration removed.');
      setDeletingTarget(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supervisor goal.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Aggregate KPIs
  const totalTargetSum = targets.reduce((s, t) => s + Number(t.targetAmount || 0), 0);
  const totalTeamSales = targets.reduce((s, t) => s + Number(t.totalTeamSales || 0), 0);
  const avgAchievement =
    targets.length > 0
      ? targets.reduce((s, t) => s + Number(t.achievementPercentage || 0), 0) / targets.length
      : 0;
  const totalUnlockedAllowance = targets.reduce((s, t) => s + Number(t.unlockedAllowance || 0), 0);

  // Map supervisors that don't yet have a configured target for this month
  const configuredIds = new Set(targets.map((t) => t.supervisorId));
  const unconfiguredSupervisors = supervisors.filter((s) => !configuredIds.has(s.id));

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading && targets.length === 0) return <LoadingState rows={6} />;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 overflow-hidden">
      <PageHeader
        title="Supervisor Team Goals & Incentives"
        description="Set collective team sales targets for each supervisor. Performance is auto-calculated from the combined delivered sales of all assigned team members."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
            className="w-full sm:w-auto"
          >
            Set Supervisor Goal
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Supervisor Goals"
          value={formatCurrency(totalTargetSum)}
          subtitle={`${targets.length} configured supervisor(s)`}
          icon={<Target className="w-5 h-5 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Collective Team Sales"
          value={formatCurrency(totalTeamSales)}
          subtitle="Combined delivered sales (all teams)"
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          accentColor="green"
        />
        <StatCard
          title="Avg Achievement"
          value={`${avgAchievement.toFixed(1)}%`}
          subtitle={avgAchievement >= 100 ? 'All targets achieved! 🎉' : `${(100 - avgAchievement).toFixed(1)}% to 100%`}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          accentColor="purple"
        />
        <StatCard
          title="Unlocked Incentives"
          value={formatCurrency(totalUnlockedAllowance)}
          subtitle={`${targets.filter((t) => (t.unlockedAllowance || 0) > 0).length} supervisor(s) eligible`}
          icon={<Trophy className="w-5 h-5 text-amber-600" />}
          accentColor="amber"
        />
      </div>

      {/* Month Filter */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <label className="text-xs font-bold text-slate-700">Evaluation Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-slate-400">
          {targets.length} configured • {unconfiguredSupervisors.length} unconfigured
        </span>
      </div>

      {/* Unconfigured supervisors alert */}
      {unconfiguredSupervisors.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-start gap-3">
          <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-800">No goal set for these supervisors in {selectedMonth}:</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {unconfiguredSupervisors.map((s) => s.fullName).join(' • ')}
            </p>
          </div>
        </div>
      )}

      {/* Target Cards */}
      {targets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-600 text-sm">No supervisor goals configured for {selectedMonth}</p>
          <p className="text-xs text-slate-400 mt-1">Click "Set Supervisor Goal" to configure targets and incentive tiers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {targets.map((target) => {
            const pct = Number(target.achievementPercentage || 0);
            const isAchieved = pct >= 100;
            const isNear = pct >= 80 && pct < 100;
            const isExpanded = expandedIds.has(target.id);

            return (
              <div key={target.id} className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                {/* Card Header */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(target.supervisor?.fullName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">
                        {target.supervisor?.fullName || 'Unknown Supervisor'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        @{target.supervisor?.username} • Month: {target.evaluatedMonth || target.month}
                        {target.isInheritedStandingTarget && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#E8F7FE] text-[#0188C7] border border-[#B9E7FC]">
                            Standing from {target.effectiveFromMonth}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleExpand(target.id)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {target.membersCount || 0} Members
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => openEditModal(target)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#01A8F3] hover:bg-[#E8F7FE] transition-colors cursor-pointer"
                      title="Edit goal"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingTarget(target)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center p-2.5 bg-slate-50 rounded-lg">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Team Target</div>
                    <div className="font-bold font-mono text-slate-900 text-sm">{formatCurrency(target.targetAmount)}</div>
                  </div>
                  <div className="text-center p-2.5 bg-emerald-50 rounded-lg">
                    <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mb-1">Team Sales</div>
                    <div className="font-bold font-mono text-emerald-800 text-sm">{formatCurrency(target.totalTeamSales || 0)}</div>
                  </div>
                  <div className={`text-center p-2.5 rounded-lg ${isAchieved ? 'bg-emerald-50' : isNear ? 'bg-amber-50' : 'bg-[#E8F7FE]'}`}>
                    <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isAchieved ? 'text-emerald-700' : isNear ? 'text-amber-700' : 'text-[#0188C7]'}`}>Achievement</div>
                    <div className={`font-bold font-mono text-sm ${isAchieved ? 'text-emerald-800' : isNear ? 'text-amber-800' : 'text-[#0188C7]'}`}>
                      {pct.toFixed(1)}%
                      {isAchieved && ' 🏆'}
                    </div>
                  </div>
                  <div className="text-center p-2.5 bg-amber-50 rounded-lg">
                    <div className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider mb-1">Incentive Earned</div>
                    <div className="font-bold font-mono text-amber-900 text-sm">
                      {(target.unlockedAllowance || 0) > 0 ? formatCurrency(target.unlockedAllowance!) : '—'}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400 font-semibold">Progress to Team Target</span>
                    <span className={`font-bold font-mono ${isAchieved ? 'text-emerald-700' : isNear ? 'text-amber-700' : 'text-blue-700'}`}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isAchieved ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                        isNear ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                        'bg-gradient-to-r from-blue-500 to-indigo-600'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  {/* Tier markers */}
                  {target.tiers && target.tiers.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {target.tiers.map((tier, i) => {
                        const tierPct = Number(tier.minPercentage);
                        const isUnlocked = pct >= tierPct;
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                              isUnlocked
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {isUnlocked && <Award className="w-3 h-3 text-emerald-600" />}
                            {tierPct}% → {formatCurrency(Number(tier.allowanceAmount))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Expandable Member Breakdown */}
                {isExpanded && (target.memberBreakdowns || []).length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">Team Member Contribution</p>
                    <div className="space-y-1.5">
                      {(target.memberBreakdowns || []).map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-medium truncate max-w-[160px]">{m.fullName}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-emerald-700 font-semibold">{formatCurrency(m.actualSales)}</span>
                            <span className="text-slate-400">{m.ordersCount} orders</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTarget ? 'Edit Supervisor Team Goal' : 'Set Supervisor Team Goal'}
        description="Configure a collective monthly sales target and tiered incentive tiers for this supervisor."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveTarget} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-4">
            {/* Supervisor & Month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Supervisor</label>
                <select
                  value={formSupervisorId}
                  onChange={(e) => setFormSupervisorId(e.target.value)}
                  disabled={!!editingTarget}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  required
                >
                  <option value="">— Select Supervisor —</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Goal Month</label>
                <input
                  type="month"
                  value={formMonth}
                  onChange={(e) => setFormMonth(e.target.value)}
                  disabled={!!editingTarget}
                  className="w-full text-sm font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  required
                />
              </div>
            </div>

            {/* Team Target Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Collective Team Sales Target (LKR)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                The combined delivered sales all team members must collectively achieve.
              </p>
              <Input
                type="number"
                value={formTargetAmount}
                onChange={(e) => setFormTargetAmount(Number(e.target.value))}
                min={0}
                step={10000}
                placeholder="e.g. 500000"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Notes (optional)</label>
              <Input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g. Q3 peak season target"
              />
            </div>

            {/* Tiers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Incentive Tiers</label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    If the team collectively achieves ≥ X%, the supervisor earns the incentive.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#0188C7] bg-[#E8F7FE] hover:bg-[#D4F1FD] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-[#B9E7FC]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Tier
                </button>
              </div>

              <div className="space-y-2.5">
                {formTiers.map((tier, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-black shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-2 min-w-0">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Min % Achieved</label>
                        <input
                          type="number"
                          value={tier.minPercentage}
                          onChange={(e) => handleTierChange(index, 'minPercentage', Number(e.target.value))}
                          min={0}
                          step={5}
                          className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="80"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Incentive (LKR)</label>
                        <input
                          type="number"
                          value={tier.allowanceAmount}
                          onChange={(e) => handleTierChange(index, 'allowanceAmount', Number(e.target.value))}
                          min={0}
                          step={1000}
                          className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="10000"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-1">Label</label>
                        <input
                          type="text"
                          value={tier.title || ''}
                          onChange={(e) => handleTierChange(index, 'title', e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="80% Team Goal"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(index)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving}>
              {editingTarget ? 'Update Goal' : 'Set Goal & Tiers'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTarget}
        onClose={() => setDeletingTarget(null)}
        onConfirm={handleDeleteTarget}
        title="Remove Supervisor Goal"
        message={`Remove the ${deletingTarget?.evaluatedMonth || deletingTarget?.month} team goal for ${deletingTarget?.supervisor?.fullName || 'this supervisor'}? This will also delete all configured incentive tiers.`}
        confirmText="Remove Goal"
        isDanger={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
