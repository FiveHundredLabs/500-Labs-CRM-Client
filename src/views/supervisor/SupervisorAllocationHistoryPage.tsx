import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ContactAllocation, User, Contact } from '../../models/domain';
import { allocationRepository, userRepository, contactRepository } from '../../repositories';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Dialog } from '../../components/ui/Dialog';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ProfileAvatar } from '../../components/shared/ProfileAvatar';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';
import toast from 'react-hot-toast';
import {
  Users,
  Phone,
  Search,
  ArrowRight,
  Copy,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';

interface EnrichedAllocation extends ContactAllocation {
  contact?: Contact;
  salesman?: User;
}

interface SalesmanBatchBreakdown {
  salesmanId: string;
  salesmanName: string;
  salesmanAvatar?: string;
  count: number;
  allocations: EnrichedAllocation[];
}

interface BatchSummary {
  batchId: string;
  allocatedAt: string;
  totalCount: number;
  recipientCount: number;
  allocations: EnrichedAllocation[];
  salesmenBreakdown: SalesmanBatchBreakdown[];
}

export const SupervisorAllocationHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || '');

  const effectiveTeamId = user?.role === 'ADMIN' ? adminTeamId : user?.teamId || '';

  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [teamSalesmen, setTeamSalesmen] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSalesman, setSelectedSalesman] = useState('ALL');
  const [dateFilterPreset, setDateFilterPreset] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal Detailed Inspector State
  const [inspectorBatch, setInspectorBatch] = useState<BatchSummary | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'SALESMEN' | 'NUMBERS'>('SALESMEN');
  const [inspectorSearch, setInspectorSearch] = useState('');

  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;
      if (!effectiveTeamId) {
        setBatches([]);
        setTeamSalesmen([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [allAllocations, teamUsers, teamContacts] = await Promise.all([
          allocationRepository.getAll(),
          userRepository.getByTeamId(effectiveTeamId),
          contactRepository.getByTeamId(effectiveTeamId),
        ]);

        const usersMap: Record<string, User> = {};
        teamUsers.forEach((u) => (usersMap[u.id] = u));
        setTeamSalesmen(teamUsers.filter((u) => u.role === 'TEAM_MEMBER'));

        const contactsMap: Record<string, Contact> = {};
        teamContacts.forEach((c) => (contactsMap[c.id] = c));

        const teamAllocations = allAllocations.filter((a) => a.teamId === effectiveTeamId);

        // Group allocations by allocationBatchId
        const batchMap: Record<string, EnrichedAllocation[]> = {};
        teamAllocations.forEach((a) => {
          if (!batchMap[a.allocationBatchId]) batchMap[a.allocationBatchId] = [];
          batchMap[a.allocationBatchId].push({
            ...a,
            contact: contactsMap[a.contactId],
            salesman: usersMap[a.teamMemberId],
          });
        });

        const list: BatchSummary[] = Object.entries(batchMap).map(([bId, items]) => {
          // Group by Salesman within batch
          const smMap: Record<string, EnrichedAllocation[]> = {};
          items.forEach((item) => {
            if (!smMap[item.teamMemberId]) smMap[item.teamMemberId] = [];
            smMap[item.teamMemberId].push(item);
          });

          const salesmenBreakdown: SalesmanBatchBreakdown[] = Object.entries(smMap).map(
            ([smId, smItems]) => {
              const smUser = usersMap[smId];
              return {
                salesmanId: smId,
                salesmanName: smUser ? smUser.fullName : smId,
                salesmanAvatar: smUser?.avatarUrl,
                count: smItems.length,
                allocations: smItems,
              };
            }
          );

          salesmenBreakdown.sort((a, b) => b.count - a.count);

          return {
            batchId: bId,
            allocatedAt: items[0]?.allocatedAt || new Date().toISOString(),
            totalCount: items.length,
            recipientCount: salesmenBreakdown.length,
            allocations: items,
            salesmenBreakdown,
          };
        });

        list.sort((a, b) => new Date(b.allocatedAt).getTime() - new Date(a.allocatedAt).getTime());
        setBatches(list);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user, effectiveTeamId]);

  const copyBatchId = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(batchId);
    toast.success(`Copied Batch ID #${batchId}`);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSalesman('ALL');
    setDateFilterPreset('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setStatusFilter('ALL');
  };

  // Filtered Batches Logic
  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      // 1. Search Query Filter (Matches batchId, salesman name, or phone number)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesBatchId = batch.batchId.toLowerCase().includes(query);
        const matchesSalesman = batch.salesmenBreakdown.some((s) =>
          s.salesmanName.toLowerCase().includes(query)
        );
        const matchesPhone = batch.allocations.some(
          (a) => a.contact && a.contact.phone.includes(query)
        );

        if (!matchesBatchId && !matchesSalesman && !matchesPhone) return false;
      }

      // 2. Salesman Filter
      if (selectedSalesman !== 'ALL') {
        const hasSalesman = batch.salesmenBreakdown.some((s) => s.salesmanId === selectedSalesman);
        if (!hasSalesman) return false;
      }

      // 3. Date Presets Filter
      const batchDate = new Date(batch.allocatedAt);
      const now = new Date();

      if (dateFilterPreset === 'TODAY') {
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        if (!isWithinInterval(batchDate, { start: todayStart, end: todayEnd })) return false;
      } else if (dateFilterPreset === '7DAYS') {
        const start7 = startOfDay(subDays(now, 7));
        if (batchDate < start7) return false;
      } else if (dateFilterPreset === '30DAYS') {
        const start30 = startOfDay(subMonths(now, 1));
        if (batchDate < start30) return false;
      } else if (dateFilterPreset === 'CUSTOM' && customStartDate && customEndDate) {
        const start = startOfDay(new Date(customStartDate));
        const end = endOfDay(new Date(customEndDate));
        if (!isWithinInterval(batchDate, { start, end })) return false;
      }

      // 4. Status Filter (Checks if any contacts in batch match status)
      if (statusFilter !== 'ALL') {
        const hasStatus = batch.allocations.some(
          (a) => a.contact && a.contact.status === statusFilter
        );
        if (!hasStatus) return false;
      }

      return true;
    });
  }, [batches, searchQuery, selectedSalesman, dateFilterPreset, customStartDate, customEndDate, statusFilter]);

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      {/* Admin Multi-Team Switcher */}
      <AdminTeamSelector
        activeTeamId={adminTeamId}
        onTeamChange={setAdminTeamId}
        title="Allocation Batch Audit Logs"
      />

      <PageHeader
        title="Allocation Batch History"
        description="Inspect and filter past allocation batches with full recipient and assigned phone breakdown"
      />

      {/* Top Filter Bar */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <Input
                placeholder="Search by Batch ID, Salesman, or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                onClear={() => setSearchQuery('')}
              />
            </div>

            {/* Salesman Filter */}
            <div>
              <Select
                value={selectedSalesman}
                onChange={(e) => setSelectedSalesman(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Salesmen / Specialists' },
                  ...teamSalesmen.map((s) => ({ value: s.id, label: s.fullName })),
                ]}
              />
            </div>

            {/* Date Preset Filter */}
            <div>
              <Select
                value={dateFilterPreset}
                onChange={(e) => setDateFilterPreset(e.target.value as any)}
                options={[
                  { value: 'ALL', label: 'All Dates (All Time)' },
                  { value: 'TODAY', label: 'Allocated Today' },
                  { value: '7DAYS', label: 'Last 7 Days' },
                  { value: '30DAYS', label: 'Last 30 Days' },
                  { value: 'CUSTOM', label: 'Custom Date Range' },
                ]}
              />
            </div>
          </div>

          {/* Custom Date Pickers & Active Filter Count */}
          {(dateFilterPreset === 'CUSTOM' || searchQuery || selectedSalesman !== 'ALL' || statusFilter !== 'ALL') && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              {dateFilterPreset === 'CUSTOM' ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="text-xs"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Showing <strong className="text-slate-900">{filteredBatches.length}</strong> of{' '}
                  <strong className="text-slate-900">{batches.length}</strong> allocation batches
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleResetFilters}
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocation Batches Grid List */}
      {filteredBatches.length === 0 ? (
        <EmptyState
          title="No allocation batches found"
          description="No batches match your active search or filter criteria. Try adjusting your filters."
          action={
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Clear Filter Selections
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((batch) => {
            return (
              <Card
                key={batch.batchId}
                className="border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all bg-white flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  {/* Top Row: Batch ID and Timestamp */}
                  <div className="flex items-center justify-between gap-2">
                    <div
                      onClick={(e) => copyBatchId(batch.batchId, e)}
                      title="Click to copy Batch ID"
                      className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <span>#{batch.batchId}</span>
                      <Copy className="w-3 h-3 text-blue-500" />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{format(new Date(batch.allocatedAt), 'MMM dd, yyyy • hh:mm a')}</span>
                    </div>
                  </div>

                  {/* Middle Row: Numbers Allocated and Salesmen Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {batch.totalCount} Numbers Allocated
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-800 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      {batch.recipientCount} Salesmen
                    </span>
                  </div>

                  {/* Bottom Row: View Full Details Button */}
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setInspectorBatch(batch);
                        setInspectorSearch('');
                      }}
                    >
                      View Full Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rich Batch Breakdown Detail Modal */}
      {inspectorBatch && (
        <Dialog
          isOpen={!!inspectorBatch}
          onClose={() => setInspectorBatch(null)}
          title={`Batch Allocation Breakdown #${inspectorBatch.batchId}`}
          description={`Executed on ${format(new Date(inspectorBatch.allocatedAt), 'MMMM dd, yyyy • hh:mm:ss a')}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Top Batch Summary Bar */}
            <div className="grid grid-cols-3 gap-3 text-center p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div className="text-xs text-slate-500 font-medium">Total Numbers</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">{inspectorBatch.totalCount}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Recipient Salesmen</div>
                <div className="text-xl font-bold text-purple-700 mt-0.5">{inspectorBatch.recipientCount}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Avg Per Salesman</div>
                <div className="text-xl font-bold text-emerald-700 mt-0.5">
                  ~{Math.round(inspectorBatch.totalCount / (inspectorBatch.recipientCount || 1))}
                </div>
              </div>
            </div>

            {/* View Mode Tabs & Filter inside Inspector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectorTab('SALESMEN')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    inspectorTab === 'SALESMEN'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  Grouped by Salesman ({inspectorBatch.salesmenBreakdown.length})
                </button>

                <button
                  type="button"
                  onClick={() => setInspectorTab('NUMBERS')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    inspectorTab === 'NUMBERS'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  All Numbers List ({inspectorBatch.allocations.length})
                </button>
              </div>

              <div className="w-full sm:w-56">
                <Input
                  placeholder="Filter numbers or salesman..."
                  value={inspectorSearch}
                  onChange={(e) => setInspectorSearch(e.target.value)}
                  leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
                  onClear={() => setInspectorSearch('')}
                />
              </div>
            </div>

            {/* Inspector Body Content */}
            {inspectorTab === 'SALESMEN' ? (
              /* Grouped by Salesman View */
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {inspectorBatch.salesmenBreakdown
                  .filter((sm) =>
                    inspectorSearch.trim()
                      ? sm.salesmanName.toLowerCase().includes(inspectorSearch.toLowerCase()) ||
                        sm.allocations.some((a) => a.contact && a.contact.phone.includes(inspectorSearch))
                      : true
                  )
                  .map((sm) => {
                    const firstName = sm.salesmanName.split(' ')[0];
                    return (
                      <div
                        key={sm.salesmanId}
                        className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <ProfileAvatar name={firstName} avatarUrl={sm.salesmanAvatar} size="sm" />
                            <div>
                              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                <span>{sm.salesmanName}</span>
                                <span className="text-xs font-medium text-slate-400 font-mono">({sm.salesmanId})</span>
                              </div>
                            </div>
                          </div>

                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {sm.count} Assigned Contacts
                          </span>
                        </div>

                        {/* Complete numbers list for this salesman */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                          {sm.allocations
                            .filter((a) =>
                              inspectorSearch.trim() && a.contact
                                ? a.contact.phone.includes(inspectorSearch)
                                : true
                            )
                            .map((a, idx) => (
                              <div
                                key={a.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                              >
                                <span className="font-mono font-bold text-slate-800">
                                  {idx + 1}. {a.contact ? a.contact.phone : a.contactId}
                                </span>
                                {a.contact && (
                                  <StatusBadge type="contact" status={a.contact.status} />
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* All Numbers Tabular List View */
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Assigned Phone</th>
                      <th className="p-3">Assigned Salesman</th>
                      <th className="p-3">Current Status</th>
                      <th className="p-3">Allocated Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectorBatch.allocations
                      .filter((a) => {
                        if (!inspectorSearch.trim()) return true;
                        const query = inspectorSearch.toLowerCase().trim();
                        const matchPhone = a.contact && a.contact.phone.includes(query);
                        const matchName = a.salesman && a.salesman.fullName.toLowerCase().includes(query);
                        return matchPhone || matchName;
                      })
                      .map((a, idx) => (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-mono font-bold text-slate-900">
                            {a.contact ? a.contact.phone : a.contactId}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            {a.salesman ? a.salesman.fullName : a.teamMemberId}
                          </td>
                          <td className="p-3">
                            {a.contact && <StatusBadge type="contact" status={a.contact.status} />}
                          </td>
                          <td className="p-3 font-mono text-slate-400">
                            {format(new Date(a.allocatedAt), 'hh:mm:ss a')}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setInspectorBatch(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
