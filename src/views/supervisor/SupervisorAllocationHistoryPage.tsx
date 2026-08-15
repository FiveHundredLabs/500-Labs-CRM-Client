import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ContactAllocation, User } from '../../models/domain';
import { allocationRepository, userRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface BatchSummary {
  batchId: string;
  allocatedAt: string;
  totalCount: number;
  recipientCount: number;
  allocations: ContactAllocation[];
}

export const SupervisorAllocationHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  const [selectedBatch, setSelectedBatch] = useState<BatchSummary | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user || !user.teamId) return;
      setLoading(true);
      try {
        const [allAllocations, teamUsers] = await Promise.all([
          allocationRepository.getAll(),
          userRepository.getByTeamId(user.teamId),
        ]);

        const map: Record<string, User> = {};
        teamUsers.forEach((u) => (map[u.id] = u));
        setUsersMap(map);

        const teamAllocations = allAllocations.filter((a) => a.teamId === user.teamId);

        // Group by batchId
        const batchMap: Record<string, ContactAllocation[]> = {};
        teamAllocations.forEach((a) => {
          if (!batchMap[a.allocationBatchId]) batchMap[a.allocationBatchId] = [];
          batchMap[a.allocationBatchId].push(a);
        });

        const list: BatchSummary[] = Object.entries(batchMap).map(([bId, items]) => {
          const recipientSet = new Set(items.map((i) => i.teamMemberId));
          return {
            batchId: bId,
            allocatedAt: items[0].allocatedAt,
            totalCount: items.length,
            recipientCount: recipientSet.size,
            allocations: items,
          };
        });

        list.sort((a, b) => new Date(b.allocatedAt).getTime() - new Date(a.allocatedAt).getTime());
        setBatches(list);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user]);

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Allocation Batch History"
        description="Inspect past distribution batches, timestamps, and recipient counts"
      />

      {batches.length === 0 ? (
        <EmptyState
          title="No allocation history"
          description="No contact allocation batches have been executed for your team yet."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {batches.map((batch) => (
            <Card
              key={batch.batchId}
              className="hover:border-slate-300 transition-all cursor-pointer"
              onClick={() => setSelectedBatch(batch)}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                    #{batch.batchId}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{format(new Date(batch.allocatedAt), 'MMM dd, yyyy • hh:mm a')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-center">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-xs text-slate-400 font-medium">Allocated Contacts</div>
                    <div className="font-bold text-lg text-slate-900">{batch.totalCount}</div>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-xs text-slate-400 font-medium">Recipients</div>
                    <div className="font-bold text-lg text-slate-900">{batch.recipientCount}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Batch Inspector Dialog */}
      {selectedBatch && (
        <Dialog
          isOpen={!!selectedBatch}
          onClose={() => setSelectedBatch(null)}
          title={`Batch Details #${selectedBatch.batchId}`}
          description={`Executed ${format(new Date(selectedBatch.allocatedAt), 'PPP p')}`}
          maxWidth="lg"
        >
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {selectedBatch.allocations.map((item) => {
              const recipient = usersMap[item.teamMemberId];
              return (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900">
                      Assigned to: {recipient ? recipient.fullName : item.teamMemberId}
                    </span>
                    <div className="text-slate-400 font-mono">Contact ID: {item.contactId}</div>
                  </div>
                  <span className="font-mono text-slate-500">{format(new Date(item.allocatedAt), 'hh:mm:ss a')}</span>
                </div>
              );
            })}
          </div>
        </Dialog>
      )}
    </div>
  );
};
