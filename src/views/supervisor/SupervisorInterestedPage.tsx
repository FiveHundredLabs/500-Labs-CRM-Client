import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { LeadPrintItem, BillingSlipPrintSheet } from '../../components/printing/BillingSlipPrintSheet';
import { PrintDocumentStyles } from '../../components/printing/PrintDocumentStyles';
import { PrintFloatingPanel } from '../../components/printing/PrintFloatingPanel';
import { InterestedFilters } from '../../components/interested/InterestedFilters';
import { InterestedList } from '../../components/interested/InterestedList';
import { InterestedPdfConfirmDialog } from '../../components/interested/InterestedPdfConfirmDialog';
import { useInterestedLeads } from '../../hooks/useInterestedLeads';
import { useSelection } from '../../hooks/useSelection';
import { downloadBillingPDF } from '../../utils/pdfGenerator';
import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { teamRepository } from '../../repositories';
import { Team } from '../../models/domain';

export const SupervisorInterestedPage: React.FC = () => {
  const { user } = useAuth();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || '');
  const [teams, setTeams] = useState<Team[]>([]);
  const {
    customers,
    teamMembers,
    membersMap,
    ordersMap,
    loading,
    dispatchInterestedLeads,
  } = useInterestedLeads(user?.role === 'ADMIN' ? adminTeamId : undefined);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');

  // Workflow Dialog States
  const [isPdfConfirmOpen, setIsPdfConfirmOpen] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

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

  const waitForBillingSlipImages = async () => {
    const images = Array.from(document.querySelectorAll<HTMLImageElement>('.print-billing-container img'));
    await Promise.all(
      images.map(async (image) => {
        if (image.complete && image.naturalWidth > 0) return;
        if (typeof image.decode === 'function') {
          try {
            await image.decode();
            return;
          } catch {
            return;
          }
        }

        await new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        });
      })
    );
  };

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
        team: teamsMap[c.teamId] || (user?.teamId === c.teamId ? user.team : undefined),
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
    await waitForBillingSlipImages();
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
        <BillingSlipPrintSheet items={selectedPrintItems} />
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
        selectedIds={selectedIds}
        onToggleSelectCard={toggleSelectCard}
      />

      {/* Bottom-Right Floating Action Panel (Manual dispatch button removed per Change 2) */}
      <PrintFloatingPanel
        selectedCount={selectedIds.length}
        countLabel="Selected"
        onDownloadPDF={handleDownloadPDF}
        onNativePrint={handleNativePrint}
      />

      {/* PDF Download + Auto-Dispatch Confirmation Dialog */}
      <InterestedPdfConfirmDialog
        isOpen={isPdfConfirmOpen}
        selectedCount={selectedIds.length}
        isDispatching={isDispatching}
        onClose={() => setIsPdfConfirmOpen(false)}
        onConfirmDispatched={handleConfirmDispatched}
      />
    </div>
  );
};

export const SupervisorCustomersPage = SupervisorInterestedPage;
