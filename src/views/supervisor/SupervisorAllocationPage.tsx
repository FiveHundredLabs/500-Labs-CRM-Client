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
import { Layers, Users, CheckCircle2, ArrowRight, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SupervisorAllocationPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [unallocated, setUnallocated] = useState<Contact[]>([]);
  const [activeMembers, setActiveMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<Array<{ memberId: string; memberName: string; count: number }>>([]);
  const [isAllocating, setIsAllocating] = useState(false);

  const loadAllocationData = async () => {
    if (!user || !user.teamId) return;
    setLoading(true);
    try {
      const [allContacts, teamUsers] = await Promise.all([
        contactRepository.getByTeamId(user.teamId),
        userRepository.getByTeamId(user.teamId),
      ]);

      const unalloc = allContacts.filter((c) => !c.isAllocated && c.status === 'NEW');
      const active = teamUsers.filter((u) => u.role === 'TEAM_MEMBER' && u.isActive);

      setUnallocated(unalloc);
      setActiveMembers(active);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllocationData();
  }, [user]);

  const handleGeneratePreview = () => {
    if (unallocated.length === 0) {
      toast.error('No unallocated contacts available to distribute.');
      return;
    }
    if (activeMembers.length === 0) {
      toast.error('No active team members available to receive allocations.');
      return;
    }

    // Calculate Round-Robin preview counts
    const counts: Record<string, number> = {};
    activeMembers.forEach((m) => (counts[m.id] = 0));

    unallocated.forEach((_, idx) => {
      const member = activeMembers[idx % activeMembers.length];
      counts[member.id] += 1;
    });

    const summary = activeMembers.map((m) => ({
      memberId: m.id,
      memberName: m.fullName,
      count: counts[m.id],
    }));

    setPreviewSummary(summary);
    setIsPreviewOpen(true);
  };

  const handleConfirmAllocation = async () => {
    if (!user) return;
    setIsAllocating(true);
    try {
      await AllocationService.allocateTeamContacts(user);
      toast.success(`Successfully allocated ${unallocated.length} contacts across ${activeMembers.length} members!`);
      setIsPreviewOpen(false);
      loadAllocationData();
      navigate('/supervisor/allocation/history');
    } catch (err: any) {
      toast.error(err.message || 'Allocation failed.');
    } finally {
      setIsAllocating(false);
    }
  };

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact Allocation"
        description="Distribute unallocated pool numbers evenly among active team members"
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<History className="w-3.5 h-3.5" />}
            onClick={() => navigate('/supervisor/allocation/history')}
          >
            Allocation History
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pool Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Unallocated Pool</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
              <div className="text-4xl font-bold text-blue-600">{unallocated.length}</div>
              <div className="text-xs font-semibold text-slate-700 mt-1">
                Contacts Ready for Distribution
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              These contacts are currently not assigned to any team member. Clicking Allocate will run the Round-Robin algorithm to distribute them evenly across active specialists.
            </p>
          </CardContent>
        </Card>

        {/* Active Members Roster */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Active Recipient Members ({activeMembers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {activeMembers.length === 0 ? (
              <div className="p-6 text-center text-xs text-red-600 font-medium">
                No active team members found. Enable members before allocating.
              </div>
            ) : (
              activeMembers.map((member) => (
                <div key={member.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar name={member.fullName} avatarUrl={member.avatarUrl} size="sm" />
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{member.fullName}</div>
                      <div className="text-xs text-slate-400">{member.city}</div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          size="lg"
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={handleGeneratePreview}
          disabled={unallocated.length === 0 || activeMembers.length === 0}
        >
          Preview &amp; Confirm Allocation ({unallocated.length} Contacts)
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Allocation Batch Preview"
        description="Deterministic Round-Robin Distribution Summary"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Total Contacts: {unallocated.length}</span>
            <span>Active Specialists: {activeMembers.length}</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {previewSummary.map((item) => (
              <div
                key={item.memberId}
                className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-sm"
              >
                <span className="font-semibold text-slate-900">{item.memberName}</span>
                <span className="font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs">
                  +{item.count} Contacts
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
              Execute Allocation
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
