import React, { useState, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { LeadPrintItem, A4BillingPrintSheet } from '../../components/printing/A4BillingPrintSheet';
import { PrintDocumentStyles } from '../../components/printing/PrintDocumentStyles';
import { PrintFloatingPanel } from '../../components/printing/PrintFloatingPanel';
import { InterestedFilters } from '../../components/interested/InterestedFilters';
import { InterestedList } from '../../components/interested/InterestedList';
import { InterestedPdfConfirmDialog } from '../../components/interested/InterestedPdfConfirmDialog';
import { InterestedPrintConfirmDialog } from '../../components/interested/InterestedPrintConfirmDialog';
import { InterestedCancelConfirmDialog } from '../../components/interested/InterestedCancelConfirmDialog';
import { DuplicateOrderConflictDialog, DuplicateOrderConflictInfo } from '../../components/orders/DuplicateOrderConflictDialog';
import { useInterestedLeads } from '../../hooks/useInterestedLeads';
import { useSelection } from '../../hooks/useSelection';
import { downloadBillingPDF } from '../../utils/pdfGenerator';
import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';
import { useAuth } from '../../hooks/useAuth';
import { XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const SupervisorInterestedPage: React.FC = () => {
  const { user } = useAuth();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || 'team_001');
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

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');

  // Workflow Dialog States
  const [isPdfConfirmOpen, setIsPdfConfirmOpen] = useState(false);
  const [isPrintConfirmOpen, setIsPrintConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [inspectConflictInfo, setInspectConflictInfo] = useState<DuplicateOrderConflictInfo | null>(null);

  // Filtered Interested Leads
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.address.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q));

      const matchesMember =
        selectedMemberId === 'ALL' || c.responsibleTeamMemberId === selectedMemberId;

      return matchesSearch && matchesMember;
    });
  }, [customers, search, selectedMemberId]);

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

  // Handle Team Member Filter Change (Auto-selects member's leads)
  const handleMemberFilterChange = (memberId: string) => {
    setSelectedMemberId(memberId);

    if (memberId !== 'ALL') {
      const memberLeadIds = customers
        .filter((c) => c.responsibleTeamMemberId === memberId)
        .map((c) => c.id);
      setSelectedIds(memberLeadIds);
    }
  };

  // Selected Lead Objects for PDF / Printing
  const selectedPrintItems: LeadPrintItem[] = customers
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => {
      const custOrders = ordersMap[c.id] || [];
      const latestOrder = custOrders[custOrders.length - 1];
      return {
        customer: c,
        responsibleUser: membersMap[c.responsibleTeamMemberId],
        order: latestOrder,
      };
    });

  // PDF Download Trigger - Downloads PDF first, then prompts for status change to Dispatched
  const handleDownloadPDF = () => {
    if (selectedPrintItems.length === 0) return;
    const pdfSuccess = downloadBillingPDF(selectedPrintItems);
    if (pdfSuccess) {
      toast.success('Billing slips PDF downloaded!');
      setIsPdfConfirmOpen(true);
    }
  };

  // Native Browser Print Trigger - Triggers print window & AUTO-DISPATCHES selected leads
  const handleNativePrint = async () => {
    if (selectedPrintItems.length === 0) return;
    window.print();
    setIsDispatching(true);
    try {
      await dispatchInterestedLeads(selectedIds);
      clearSelection();
    } finally {
      setIsDispatching(false);
    }
  };

  // Status Change Confirmation Handler (Executed after PDF download)
  const handleConfirmDispatched = async () => {
    if (selectedPrintItems.length === 0) return;
    setIsDispatching(true);
    try {
      const success = await dispatchInterestedLeads(selectedIds);
      if (success) {
        clearSelection();
        setIsPdfConfirmOpen(false);
      }
    } finally {
      setIsDispatching(false);
    }
  };

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-4 pb-28">
      <PrintDocumentStyles />

      {/* Hidden Print Container rendered in DOM for window.print() */}
      <div className="hidden print:block">
        <A4BillingPrintSheet items={selectedPrintItems} />
      </div>

      {/* Admin Multi-Team Switcher */}
      <AdminTeamSelector
        activeTeamId={adminTeamId}
        onTeamChange={setAdminTeamId}
        title="Interested Leads Dispatch"
      />

      <PageHeader
        title="Interested Leads"
        description="View leads captured from tele-calling, filter by team member, and bulk-print billing slips."
      />

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

      {/* Bottom-Right Floating Action Panel */}
      <PrintFloatingPanel
        selectedCount={selectedIds.length}
        countLabel="Selected"
        onDownloadPDF={handleDownloadPDF}
        onNativePrint={handleNativePrint}
        extraActions={
          <button
            type="button"
            onClick={() => setIsCancelConfirmOpen(true)}
            className="py-1 px-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs border border-rose-400/30 cursor-pointer"
            title="Cancel selected interested leads"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        }
      />

      {/* PDF Download + Auto-Dispatch Confirmation Dialog */}
      <InterestedPdfConfirmDialog
        isOpen={isPdfConfirmOpen}
        selectedCount={selectedIds.length}
        isDispatching={isDispatching}
        onClose={() => setIsPdfConfirmOpen(false)}
        onConfirmDispatched={handleConfirmDispatched}
      />

      {/* GitHub Style Strict Verification Cancel Dialog */}
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
    </div>
  );
};

export const SupervisorCustomersPage = SupervisorInterestedPage;
