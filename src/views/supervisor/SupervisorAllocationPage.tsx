import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Contact, User } from '../../models/domain';
import { contactRepository, userRepository } from '../../repositories';
import { AllocationService } from '../../services/allocationService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { ProfileAvatar } from '../../components/shared/ProfileAvatar';
import { LoadingState } from '../../components/shared/LoadingState';
import toast from 'react-hot-toast';
import { Layers, Users, CheckCircle2, ArrowRight, History, CheckSquare, Square, Calculator, Sparkles, Phone, Search, ChevronDown, ChevronUp, Clock, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';

export const SupervisorAllocationPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || '');

  const effectiveTeamId = user?.role === 'ADMIN' ? adminTeamId : user?.teamId || '';
  const effectiveActor = user
    ? { ...user, teamId: effectiveTeamId }
    : null;

  const [unallocated, setUnallocated] = useState<Contact[]>([]);
  const [activeMembers, setActiveMembers] = useState<User[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Unallocated Contacts Pool Search & Toggle State
  const [poolSearch, setPoolSearch] = useState('');
  const [showPoolDetails, setShowPoolDetails] = useState(true);

  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<Array<{ memberId: string; memberName: string; count: number }>>([]);
  const [isAllocating, setIsAllocating] = useState(false);

  const loadAllocationData = async () => {
    if (!user) return;
    if (!effectiveTeamId) {
      setUnallocated([]);
      setActiveMembers([]);
      setSelectedMemberIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [allContacts, teamUsers] = await Promise.all([
        contactRepository.getByTeamId(effectiveTeamId),
        userRepository.getByTeamId(effectiveTeamId),
      ]);

      const unalloc = allContacts.filter((c) => !c.isAllocated && c.status === 'NEW');
      const active = teamUsers.filter((u) => u.role === 'TEAM_MEMBER' && u.isActive);

      setUnallocated(unalloc);
      setActiveMembers(active);
      // Select all by default
      setSelectedMemberIds(active.map((m) => m.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllocationData();
  }, [user, effectiveTeamId]);

  // Checkbox Selection Handlers
  const handleToggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (selectedMemberIds.length === activeMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(activeMembers.map((m) => m.id));
    }
  };

  // Selected Members List
  const selectedMembers = activeMembers.filter((m) => selectedMemberIds.includes(m.id));

  // Automatic Division Calculation
  const countPerSalesman = selectedMembers.length > 0
    ? Math.floor(unallocated.length / selectedMembers.length)
    : 0;
  const remainder = selectedMembers.length > 0 ? unallocated.length % selectedMembers.length : 0;

  // Preview Generation
  const handleGeneratePreview = () => {
    if (unallocated.length === 0) {
      toast.error('No unallocated contacts available in pool.');
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one salesman to assign numbers to.');
      return;
    }

    // Calculate Automatic Round-Robin Division
    const counts: Record<string, number> = {};
    selectedMembers.forEach((m) => (counts[m.id] = 0));

    unallocated.forEach((_, idx) => {
      const member = selectedMembers[idx % selectedMembers.length];
      counts[member.id] += 1;
    });

    const summary = selectedMembers.map((m) => ({
      memberId: m.id,
      memberName: m.fullName.split(' ')[0],
      count: counts[m.id],
    }));

    setPreviewSummary(summary);
    setIsPreviewOpen(true);
  };

  // Confirm Bulk Allocation
  const handleConfirmAllocation = async () => {
    if (!effectiveActor?.teamId) {
      toast.error('Select a real team before allocating contacts.');
      return;
    }
    setIsAllocating(true);
    try {
      await AllocationService.allocateTeamContacts(effectiveActor, selectedMemberIds);
      toast.success(
        `Successfully auto-distributed ${unallocated.length} contacts across ${selectedMembers.length} selected salesmen!`
      );
      setIsPreviewOpen(false);
      loadAllocationData();
      navigate(user?.role === 'ADMIN' ? '/admin/allocation/history' : '/supervisor/allocation/history');
    } catch (err: any) {
      toast.error(err.message || 'Allocation failed.');
    } finally {
      setIsAllocating(false);
    }
  };

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      {/* Admin Multi-Team Switcher */}
      <AdminTeamSelector
        activeTeamId={adminTeamId}
        onTeamChange={setAdminTeamId}
        title="Contact Allocation & Distribution"
      />

      <PageHeader
        title="Contact Allocation"
        description="Select salesmen and bulk-assign numbers with automatic equal distribution"
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<History className="w-3.5 h-3.5" />}
            onClick={() => navigate(user?.role === 'ADMIN' ? '/admin/allocation/history' : '/supervisor/allocation/history')}
          >
            Allocation History
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pool & Auto Division Banner */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Unallocated Pool</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5 flex-1 flex flex-col justify-between">
            <div className="p-6 bg-blue-50/60 border border-blue-100 rounded-2xl text-center">
              <div className="text-4xl font-black text-blue-600">{unallocated.length}</div>
              <div className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wider">
                Unallocated Pool Contacts
              </div>
            </div>

            {/* Live Auto Distribution Callout */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <Calculator className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Automatic Equal Number Distribution</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {selectedMembers.length > 0 ? (
                  <>
                    <span className="font-bold text-emerald-950">{unallocated.length}</span> numbers will be divided automatically across{' '}
                    <span className="font-bold text-emerald-950">{selectedMembers.length}</span> selected salesmen.
                    <br />
                    <span className="inline-block mt-1 bg-white px-2 py-0.5 rounded border border-emerald-200 font-bold text-emerald-700">
                      ~{countPerSalesman} contacts per salesman
                      {remainder > 0 ? ` (+1 extra to first ${remainder} salesmen)` : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-amber-800 font-medium">Select salesmen on the right to view automatic distribution math.</span>
                )}
              </p>
            </div>

            <p className="text-[11px] text-slate-400">
              Numbers will be assigned automatically and logged in allocation history.
            </p>
          </CardContent>
        </Card>

        {/* Multi-Select Salesmen Roster */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Select Recipient Salesmen ({selectedMembers.length} of {activeMembers.length} Selected)</span>
              </CardTitle>
            </div>

            <button
              type="button"
              onClick={handleToggleAll}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              {selectedMemberIds.length === activeMembers.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Select All ({activeMembers.length})</span>
                </>
              )}
            </button>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {activeMembers.length === 0 ? (
              <div className="p-6 text-center text-xs text-red-600 font-medium">
                No active salesmen found in team. Please add or activate salesmen first.
              </div>
            ) : (
              activeMembers.map((member) => {
                const isSelected = selectedMemberIds.includes(member.id);
                const firstName = member.fullName.split(' ')[0];
                return (
                  <div
                    key={member.id}
                    onClick={() => handleToggleMember(member.id)}
                    className={`px-5 py-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                      isSelected ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Controlled via row click
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <ProfileAvatar name={firstName} avatarUrl={member.avatarUrl} size="sm" />
                      <div>
                        <div className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                          <span>{firstName}</span>
                          <span className="text-[10px] font-medium text-slate-400 font-mono">({member.id})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          ~{countPerSalesman} Contacts
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          Unselected
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Ready to distribute <strong className="text-slate-900">{unallocated.length}</strong> pool numbers to <strong className="text-slate-900">{selectedMembers.length}</strong> selected salesmen.
          </span>
        </div>

        <Button
          variant="primary"
          size="lg"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={handleGeneratePreview}
          disabled={unallocated.length === 0 || selectedMembers.length === 0}
        >
          Preview &amp; Auto-Distribute ({unallocated.length} Contacts)
        </Button>
      </div>

      {/* Unallocated Contacts Pool Details Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>Unallocated Contacts in Pool ({unallocated.length})</span>
            </CardTitle>
            <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Ready for Allocation
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search pool numbers..."
                value={poolSearch}
                onChange={(e) => setPoolSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPoolDetails(!showPoolDetails)}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={showPoolDetails ? 'Collapse pool list' : 'Expand pool list'}
            >
              {showPoolDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </CardHeader>

        {showPoolDetails && (
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Phone Number</th>
                    <th className="p-3">Batch ID</th>
                    <th className="p-3">Imported Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {unallocated
                    .filter((c) =>
                      c.phone.includes(poolSearch.trim()) ||
                      (c.importBatchId && c.importBatchId.toLowerCase().includes(poolSearch.toLowerCase().trim()))
                    )
                    .map((c, idx) => (
                      <tr key={c.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-slate-400 font-sans">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{c.phone}</td>
                        <td className="p-3 text-slate-500 text-[11px]">{c.importBatchId || 'Initial Seed'}</td>
                        <td className="p-3 text-slate-500 text-[11px] font-sans">
                          {c.importedAt ? format(new Date(c.importedAt), 'MMM dd, yyyy HH:mm') : '—'}
                        </td>
                        <td className="p-3 font-sans">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
                            <Clock className="w-3 h-3 text-blue-500" />
                            Unallocated (NEW)
                          </span>
                        </td>
                      </tr>
                    ))}
                  {unallocated.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic font-sans">
                        No unallocated contacts currently in the pool. Import new contacts above to populate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Preview & Confirmation Dialog */}
      <Dialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Automatic Number Distribution Preview"
        description="Review exact contact allocation count for each selected salesman"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs font-semibold text-blue-900">
            <span>Total Contacts to Allocate: {unallocated.length}</span>
            <span>Selected Salesmen: {selectedMembers.length}</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {previewSummary.map((item) => (
              <div
                key={item.memberId}
                className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <ProfileAvatar name={item.memberName} size="sm" />
                  <span className="font-semibold text-slate-900">{item.memberName}</span>
                </div>
                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full text-xs">
                  +{item.count} Contacts Assigned
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsPreviewOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleConfirmAllocation}
              isLoading={isAllocating}
            >
              Confirm &amp; Execute Allocation
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
