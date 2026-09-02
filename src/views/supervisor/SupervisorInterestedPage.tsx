import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { LeadPrintItem } from '../../components/printing/BillingSlipPrintSheet';
import { PrintFloatingPanel } from '../../components/printing/PrintFloatingPanel';
import { InterestedFilters } from '../../components/interested/InterestedFilters';
import { InterestedList } from '../../components/interested/InterestedList';
import { InterestedPdfConfirmDialog } from '../../components/interested/InterestedPdfConfirmDialog';
import { InterestedCancelConfirmDialog } from '../../components/interested/InterestedCancelConfirmDialog';
import { RoyalCourierDispatchConfirmDialog } from '../../components/interested/RoyalCourierDispatchConfirmDialog';
import { CircularProgressPdfModal } from '../../components/printing/CircularProgressPdfModal';
import { DuplicateOrderConflictDialog, DuplicateOrderConflictInfo } from '../../components/orders/DuplicateOrderConflictDialog';
import { useInterestedLeads } from '../../hooks/useInterestedLeads';
import { useSelection } from '../../hooks/useSelection';
import { downloadBillingPDF, printBillingPDF } from '../../utils/pdfGenerator';
import { downloadRoyalCourierExcel, RoyalCourierExportItem } from '../../utils/royalCourierExcel';
import { downloadPostLeadExcel, PostLeadExportItem } from '../../utils/postLeadExcel';
import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';
import { useAuth } from '../../hooks/useAuth';
import { XCircle, Mail, Truck, FileSpreadsheet, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { teamRepository } from '../../repositories';
import { Team, DeliveryMethod } from '../../models/domain';

export const SupervisorInterestedPage: React.FC = () => {
  const { user } = useAuth();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || '');
  const [teams, setTeams] = useState<Team[]>([]);
  const {
    customers,
    teamMembers,
    membersMap,
    ordersMap,
    allCustomersMap,
    interestedConflictMap,
    loading,
    dispatchInterestedLeads,
    cancelInterestedLead,
  } = useInterestedLeads(user?.role === 'ADMIN' ? adminTeamId : undefined);

  // Delivery Method Tab State ('POST' vs 'ROYAL_COURIER')
  const [activeDeliveryTab, setActiveDeliveryTab] = useState<DeliveryMethod>('POST');

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');

  // Workflow Dialog States
  const [isPdfConfirmOpen, setIsPdfConfirmOpen] = useState(false);
  const [isRoyalConfirmOpen, setIsRoyalConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isDownloadingPostExcel, setIsDownloadingPostExcel] = useState(false);
  const [inspectConflictInfo, setInspectConflictInfo] = useState<DuplicateOrderConflictInfo | null>(null);

  // Circular Progress PDF Loading State
  const [pdfProgress, setPdfProgress] = useState({
    isOpen: false,
    title: 'Generating Billing Slips PDF...',
    subtitle: '',
    current: 0,
    total: 0,
    percentage: 0,
    actionType: 'DOWNLOAD' as 'DOWNLOAD' | 'PRINT',
  });

  useEffect(() => {
    if (!user) return;

    if (user.role !== 'ADMIN') {
      setTeams(user.team ? [user.team as Team] : []);
      return;
    }

    let isMounted = true;
    teamRepository.getAll()
      .then((teamList) => {
        if (!isMounted) return;
        setTeams(teamList);
        if (teamList.length > 0 && !teamList.some((team) => team.id === adminTeamId)) {
          setAdminTeamId(teamList[0].id);
        }
      })
      .catch(() => {
        if (isMounted) setTeams([]);
      });

    return () => {
      isMounted = false;
    };
  }, [adminTeamId, user]);

  const teamsMap = useMemo(() => {
    const map: Record<string, Team> = {};
    teams.forEach((team) => {
      map[team.id] = team;
    });
    return map;
  }, [teams]);

  // Total counts per delivery method
  const postLeadsCount = useMemo(() => {
    return customers.filter((c) => {
      const custOrders = ordersMap[c.id] || [];
      const ord = custOrders[0];
      const method = ord?.deliveryMethod || c.deliveryMethod || 'POST';
      return method === 'POST';
    }).length;
  }, [customers, ordersMap]);

  const royalCourierLeadsCount = useMemo(() => {
    return customers.filter((c) => {
      const custOrders = ordersMap[c.id] || [];
      const ord = custOrders[0];
      const method = ord?.deliveryMethod || c.deliveryMethod;
      return method === 'ROYAL_COURIER';
    }).length;
  }, [customers, ordersMap]);

  // Filtered Interested Leads (Filtered by active delivery tab + search + member)
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const custOrders = ordersMap[c.id] || [];
      const ord = custOrders[0];
      const method = ord?.deliveryMethod || c.deliveryMethod || 'POST';

      // Match delivery method tab
      if (activeDeliveryTab === 'POST' && method !== 'POST') return false;
      if (activeDeliveryTab === 'ROYAL_COURIER' && method !== 'ROYAL_COURIER') return false;

      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (ord?.orderNumber && ord.orderNumber.toLowerCase().includes(q));

      const matchesMember =
        selectedMemberId === 'ALL' || c.responsibleTeamMemberId === selectedMemberId;

      return matchesSearch && matchesMember;
    });
  }, [customers, ordersMap, activeDeliveryTab, search, selectedMemberId]);

  const filteredCustomerIds = useMemo(
    () => filteredCustomers.map((c) => c.id),
    [filteredCustomers]
  );

  const {
    selectedIds,
    setSelectedIds,
    selectAllCheckboxRef,
    allSelected: allFilteredSelected,
    toggleSelectAll,
    toggleSelectCard,
    clearSelection,
  } = useSelection(filteredCustomerIds);

  // Clear selection when changing tabs
  const handleTabChange = (tab: DeliveryMethod) => {
    setActiveDeliveryTab(tab);
    clearSelection();
  };

  // Handle Team Member Filter Change (Auto-selects member's leads)
  const handleMemberFilterChange = (memberId: string) => {
    setSelectedMemberId(memberId);

    if (memberId !== 'ALL') {
      const memberLeadIds = filteredCustomers
        .filter((c) => c.responsibleTeamMemberId === memberId)
        .map((c) => c.id);
      setSelectedIds(memberLeadIds);
    }
  };

  // Selected Lead Objects for Post Billing PDF / Print
  const selectedPrintItems: LeadPrintItem[] = customers
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => {
      const custOrders = ordersMap[c.id] || [];
      const latestOrder = custOrders[0];
      return {
        customer: c,
        responsibleUser: membersMap[c.responsibleTeamMemberId],
        order: latestOrder,
        team: latestOrder?.team || teamsMap[c.teamId] || (user?.teamId === c.teamId ? user.team : undefined),
      };
    });

  // Selected Lead Objects for Royal Courier Excel Export
  const selectedRoyalItems: RoyalCourierExportItem[] = customers
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => {
      const custOrders = ordersMap[c.id] || [];
      const latestOrder = custOrders[0];
      return {
        customer: c,
        order: latestOrder,
        responsibleUser: membersMap[c.responsibleTeamMemberId],
        team: latestOrder?.team || teamsMap[c.teamId] || (user?.teamId === c.teamId ? user.team : undefined),
      };
    });

  // Selected Lead Objects for Post Lead Excel Export
  const selectedPostItems: PostLeadExportItem[] = customers
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => {
      const custOrders = ordersMap[c.id] || [];
      const latestOrder = custOrders[0];
      return {
        customer: c,
        order: latestOrder,
        responsibleUser: membersMap[c.responsibleTeamMemberId],
        team: latestOrder?.team || teamsMap[c.teamId] || (user?.teamId === c.teamId ? user.team : undefined),
      };
    });

  // TAB 1 (POST): PDF Download Trigger
  const handleDownloadPDF = async () => {
    if (selectedPrintItems.length === 0) return;
    setPdfProgress({
      isOpen: true,
      title: 'Downloading Billing Slips PDF...',
      subtitle: `Preparing ${selectedPrintItems.length} billing slip(s)...`,
      current: 0,
      total: selectedPrintItems.length,
      percentage: 0,
      actionType: 'DOWNLOAD',
    });
    try {
      await downloadBillingPDF(selectedPrintItems, (curr, tot, pct) => {
        setPdfProgress((prev) => ({
          ...prev,
          current: curr,
          total: tot,
          percentage: pct,
          subtitle: `Rendering high-resolution slip ${curr} of ${tot}...`,
        }));
      });
      toast.success('Billing slips PDF downloaded!');
      setIsPdfConfirmOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate billing PDF.');
    } finally {
      setPdfProgress((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // TAB 1 (POST): Native Print Trigger
  const handleNativePrint = async () => {
    if (selectedPrintItems.length === 0) return;
    setPdfProgress({
      isOpen: true,
      title: 'Preparing Billing Slips for Printing...',
      subtitle: `Assembling ${selectedPrintItems.length} billing slip(s)...`,
      current: 0,
      total: selectedPrintItems.length,
      percentage: 0,
      actionType: 'PRINT',
    });
    try {
      await printBillingPDF(selectedPrintItems, (curr, tot, pct) => {
        setPdfProgress((prev) => ({
          ...prev,
          current: curr,
          total: tot,
          percentage: pct,
          subtitle: `Rendering high-resolution slip ${curr} of ${tot}...`,
        }));
      });
      setIsDispatching(true);
      await dispatchInterestedLeads(selectedIds);
      clearSelection();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate billing print document.');
    } finally {
      setPdfProgress((prev) => ({ ...prev, isOpen: false }));
      setIsDispatching(false);
    }
  };

  // TAB 1 (POST): Download Post Lead Excel Sheet
  const handleDownloadPostLeadExcel = async () => {
    if (selectedPostItems.length === 0) {
      toast.error('Please select at least 1 Post order.');
      return;
    }

    setIsDownloadingPostExcel(true);
    try {
      await downloadPostLeadExcel(selectedPostItems);
      toast.success(`Post Lead Excel sheet downloaded with ${selectedPostItems.length} orders!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download Post Lead Excel.');
    } finally {
      setIsDownloadingPostExcel(false);
    }
  };

  // TAB 2 (ROYAL COURIER): Download Excel Sheet
  const handleDownloadRoyalCourierExcel = async () => {
    if (selectedRoyalItems.length === 0) {
      toast.error('Please select at least 1 Royal Courier order.');
      return;
    }

    setIsDownloadingExcel(true);
    try {
      await downloadRoyalCourierExcel(selectedRoyalItems);
      toast.success(`Royal Courier Excel sheet downloaded with ${selectedRoyalItems.length} orders!`);
      // Trigger Royal Courier Dispatch Confirmation Prompt
      setIsRoyalConfirmOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download Royal Courier Excel.');
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  // Common Dispatch Confirmation Handler (Executed after confirmation)
  const handleConfirmDispatched = async () => {
    if (selectedIds.length === 0) return;
    setIsDispatching(true);
    try {
      const success = await dispatchInterestedLeads(selectedIds);
      if (success) {
        clearSelection();
        setIsPdfConfirmOpen(false);
        setIsRoyalConfirmOpen(false);
      }
    } finally {
      setIsDispatching(false);
    }
  };

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-4 pb-28">
      {/* Admin Multi-Team Switcher */}
      <AdminTeamSelector
        activeTeamId={adminTeamId}
        onTeamChange={setAdminTeamId}
        title="Interested Leads Dispatch"
      />

      <PageHeader
        title="Interested Leads"
        description="Review captured interested orders, choose delivery method workflow, and process dispatch."
      />

      {/* Two Delivery Method Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => handleTabChange('POST')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeDeliveryTab === 'POST'
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Post</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeDeliveryTab === 'POST'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {postLeadsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('ROYAL_COURIER')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            activeDeliveryTab === 'ROYAL_COURIER'
              ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/20'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Royal Courier</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeDeliveryTab === 'ROYAL_COURIER'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {royalCourierLeadsCount}
          </span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <InterestedFilters
        selectedMemberId={selectedMemberId}
        onMemberIdChange={handleMemberFilterChange}
        teamMembers={teamMembers}
        allCustomers={customers}
        search={search}
        onSearchChange={setSearch}
        filteredCount={filteredCustomers.length}
        selectedCount={selectedIds.length}
        allFilteredSelected={allFilteredSelected}
        onToggleSelectAll={toggleSelectAll}
        selectAllCheckboxRef={selectAllCheckboxRef}
      />

      {/* Interested Leads List Grid */}
      <InterestedList
        filteredCustomers={filteredCustomers}
        membersMap={membersMap}
        ordersMap={ordersMap}
        interestedConflictMap={interestedConflictMap}
        selectedIds={selectedIds}
        onToggleSelectCard={toggleSelectCard}
        onInspectDuplicateOrders={(info) => setInspectConflictInfo(info)}
      />

      {/* TAB 1 (POST): Standard Floating Action Panel (Billing Slips, Excel & Print) */}
      {activeDeliveryTab === 'POST' && (
        <PrintFloatingPanel
          selectedCount={selectedIds.length}
          countLabel="Selected"
          onDownloadPDF={handleDownloadPDF}
          onNativePrint={handleNativePrint}
          extraActions={
            <>
              <button
                type="button"
                onClick={handleDownloadPostLeadExcel}
                disabled={selectedIds.length === 0 || isDownloadingPostExcel}
                className="py-1 px-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs border border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Download Post Lead Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(true)}
                className="py-1 px-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs border border-rose-400/30 cursor-pointer"
                title="Cancel selected interested leads"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </>
          }
        />
      )}

      {/* TAB 2 (ROYAL COURIER): Dedicated Floating Action Panel (Excel Export Only) */}
      {activeDeliveryTab === 'ROYAL_COURIER' && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-white/95 backdrop-blur-md border border-purple-200 p-2.5 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-950 rounded-xl text-xs font-bold border border-purple-200">
            <Truck className="w-4 h-4 text-purple-600" />
            <span>{selectedIds.length} Selected</span>
          </div>

          <button
            type="button"
            onClick={handleDownloadRoyalCourierExcel}
            disabled={selectedIds.length === 0 || isDownloadingExcel}
            className="py-2 px-4 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Royal Courier Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCancelConfirmOpen(true)}
            disabled={selectedIds.length === 0}
            className="py-2 px-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs border border-rose-400/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Cancel selected interested leads"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Post PDF Download + Auto-Dispatch Confirmation Dialog */}
      <InterestedPdfConfirmDialog
        isOpen={isPdfConfirmOpen}
        selectedCount={selectedIds.length}
        isDispatching={isDispatching}
        onClose={() => setIsPdfConfirmOpen(false)}
        onConfirmDispatched={handleConfirmDispatched}
      />

      {/* Royal Courier Excel Download + Auto-Dispatch Confirmation Dialog */}
      <RoyalCourierDispatchConfirmDialog
        isOpen={isRoyalConfirmOpen}
        selectedCount={selectedIds.length}
        isDispatching={isDispatching}
        onClose={() => setIsRoyalConfirmOpen(false)}
        onConfirmDispatched={handleConfirmDispatched}
      />

      {/* Strict Verification Cancel Dialog */}
      <InterestedCancelConfirmDialog
        isOpen={isCancelConfirmOpen}
        selectedCustomers={customers.filter((c) => selectedIds.includes(c.id))}
        membersMap={membersMap}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirmCancel={async (reason) => {
          let successCount = 0;
          for (const id of selectedIds) {
            const ok = await cancelInterestedLead(id, reason);
            if (ok) successCount++;
          }
          if (successCount > 0) {
            clearSelection();
            return true;
          }
          return false;
        }}
      />

      {/* Duplicate Order Conflict & History Inspection Dialog */}
      <DuplicateOrderConflictDialog
        isOpen={!!inspectConflictInfo}
        onClose={() => setInspectConflictInfo(null)}
        currentOrder={null}
        conflictInfo={inspectConflictInfo}
        customersMap={allCustomersMap}
        membersMap={membersMap}
        onCancelOrder={async (ord) => {
          await cancelInterestedLead(ord.customerId, 'Cancelled duplicate order by supervisor');
          setInspectConflictInfo(null);
        }}
      />

      {/* Circular Progress PDF / Print Loading Modal */}
      <CircularProgressPdfModal {...pdfProgress} />
    </div>
  );
};

export const SupervisorCustomersPage = SupervisorInterestedPage;
