import React, { useEffect, useMemo, useState } from 'react';
import type { Customer, Order, OrderStatus, DeliveryStatusHistory, Team } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { LeadPrintItem, BillingSlipPrintSheet } from '../../components/printing/BillingSlipPrintSheet';
import { PrintDocumentStyles } from '../../components/printing/PrintDocumentStyles';
import { PrintFloatingPanel } from '../../components/printing/PrintFloatingPanel';
import { OrdersStats } from '../../components/orders/OrdersStats';
import { OrderFilters } from '../../components/orders/OrderFilters';
import { OrderList } from '../../components/orders/OrderList';
import { OrderStatusChangeDialog } from '../../components/orders/OrderStatusChangeDialog';
import { OrderRemarkDialog } from '../../components/orders/OrderRemarkDialog';
import { BulkStatusChangeDialog } from '../../components/orders/BulkStatusChangeDialog';
import { OrderHistoryDialog } from '../../components/orders/OrderHistoryDialog';
import { OrderPrintConfirmDialog } from '../../components/orders/OrderPrintConfirmDialog';
import { useOrders } from '../../hooks/useOrders';
import { useOrderFilters } from '../../hooks/useOrderFilters';
import { useSelection } from '../../hooks/useSelection';
import { downloadBillingPDF } from '../../utils/pdfGenerator';
import toast from 'react-hot-toast';
import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';
import { useAuth } from '../../hooks/useAuth';
import { teamRepository } from '../../repositories';

export const SupervisorOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || '');
  const [teams, setTeams] = useState<Team[]>([]);
  const [directPrintItems, setDirectPrintItems] = useState<LeadPrintItem[] | null>(null);

  const {
    orders,
    customersMap,
    teamMembers,
    membersMap,
    loading,
    updateOrderStatus,
    updateOrderRemark,
    bulkUpdateOrderStatus,
    fetchOrderHistory,
  } = useOrders(user?.role === 'ADMIN' ? adminTeamId : undefined);

  const {
    selectedDate,
    setSelectedDate,
    statusFilter,
    setStatusFilter,
    selectedMemberId,
    setSelectedMemberId,
    search,
    setSearch,
    dateFilteredOrders,
    filteredOrders,
    dispatchedCount,
    deliveredCount,
    rejectedCount,
    resetFilters,
  } = useOrderFilters(orders, customersMap, membersMap);

  const filteredOrderIds = filteredOrders.map((o) => o.id);
  const {
    selectedIds: selectedOrderIds,
    selectAllCheckboxRef,
    allSelected: allFilteredSelected,
    toggleSelectAll,
    toggleSelectCard,
    clearSelection,
  } = useSelection(filteredOrderIds);

  // Workflow Dialog States
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);
  const [targetNewStatus, setTargetNewStatus] = useState<OrderStatus>('DELIVERED');

  const [remarkOrder, setRemarkOrder] = useState<Order | null>(null);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [historyOrder, setHistoryOrder] = useState<Order | null>(null);
  const [orderHistories, setOrderHistories] = useState<DeliveryStatusHistory[]>([]);

  const [isPrintConfirmOpen, setIsPrintConfirmOpen] = useState(false);

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

  const buildPrintItem = (order: Order): LeadPrintItem => {
    const customer = customersMap[order.customerId] || ({
      id: `cst_temp_${order.id}`,
      contactId: '',
      fullName: 'Customer',
      phone: 'N/A',
      address: 'N/A',
      teamId: order.teamId,
      responsibleTeamMemberId: order.teamMemberId,
      supervisorId: order.supervisorId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    } satisfies Customer);

    return {
      customer,
      responsibleUser: membersMap[order.teamMemberId],
      order,
      team: teamsMap[order.teamId] || (user?.teamId === order.teamId ? user.team : undefined),
    };
  };

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

  // Status Change Modal Trigger
  const handleOpenStatusModal = (order: Order, defaultNewStatus: OrderStatus) => {
    setTargetOrder(order);
    setTargetNewStatus(defaultNewStatus);
  };

  // View History Trigger
  const handleViewHistory = async (order: Order) => {
    setHistoryOrder(order);
    const hist = await fetchOrderHistory(order.id);
    setOrderHistories(hist);
  };

  // Selected Lead Print Items for PDF & Print
  const selectedPrintItems: LeadPrintItem[] = orders
    .filter((o) => selectedOrderIds.includes(o.id))
    .map(buildPrintItem);

  const activePrintItems = directPrintItems || selectedPrintItems;

  const handleDownloadPDF = () => {
    if (selectedPrintItems.length === 0) return;
    const success = downloadBillingPDF(selectedPrintItems);
    if (success) {
      toast.success('Billing slips PDF downloaded!');
    }
  };

  const handleNativePrint = async () => {
    if (selectedPrintItems.length === 0) return;
    await waitForBillingSlipImages();
    window.print();
    setIsPrintConfirmOpen(true);
  };

  const handlePrintBillingSlip = async (order: Order) => {
    setDirectPrintItems([buildPrintItem(order)]);
  };

  useEffect(() => {
    if (!directPrintItems) return;

    const printDirectSlip = async () => {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      await waitForBillingSlipImages();
      window.print();
      setDirectPrintItems(null);
    };

    printDirectSlip();
  }, [directPrintItems]);

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-4 pb-28">
      <PrintDocumentStyles />

      {/* Hidden Print Container rendered in DOM for window.print() */}
      <div className="hidden print:block">
        <BillingSlipPrintSheet items={activePrintItems} />
      </div>

      {/* Admin Multi-Team Switcher */}
      <AdminTeamSelector
        activeTeamId={adminTeamId}
        onTeamChange={setAdminTeamId}
        title="Orders & Fulfillment Management"
      />

      <PageHeader
        title="Supervisor Orders"
        description="Monitor dispatched parcels, process delivery status updates with optional remarks, and manage team orders."
      />

      {/* 1. Status Filter Summary Cards */}
      <OrdersStats
        dispatchedCount={dispatchedCount}
        deliveredCount={deliveredCount}
        rejectedCount={rejectedCount}
        statusFilter={statusFilter}
        onSelectStatusFilter={setStatusFilter}
      />

      {/* 2. Filter Toolbar */}
      <OrderFilters
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedMemberId={selectedMemberId}
        onMemberIdChange={setSelectedMemberId}
        teamMembers={teamMembers}
        dateFilteredOrders={dateFilteredOrders}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onResetFilters={resetFilters}
        filteredCount={filteredOrders.length}
        selectedCount={selectedOrderIds.length}
        allFilteredSelected={allFilteredSelected}
        onToggleSelectAll={toggleSelectAll}
        selectAllCheckboxRef={selectAllCheckboxRef}
        onOpenBulkModal={() => setIsBulkModalOpen(true)}
      />

      {/* 3. Orders Grid */}
      <OrderList
        filteredOrders={filteredOrders}
        customersMap={customersMap}
        membersMap={membersMap}
        selectedOrderIds={selectedOrderIds}
        onToggleSelectCard={toggleSelectCard}
        onViewHistory={handleViewHistory}
        onOpenStatusModal={handleOpenStatusModal}
        onOpenRemarkModal={(order) => setRemarkOrder(order)}
        onPrintBillingSlip={handlePrintBillingSlip}
      />

      {/* 4. Floating Action Panel */}
      <PrintFloatingPanel
        selectedCount={selectedOrderIds.length}
        countLabel="Order(s) Selected"
        onDownloadPDF={handleDownloadPDF}
        onNativePrint={handleNativePrint}
        extraActions={
          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="py-1 px-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border border-amber-400/20 cursor-pointer"
            title="Bulk Status Change"
          >
            <span>Bulk</span>
          </button>
        }
      />

      {/* 5. Dialog Modals */}
      <OrderStatusChangeDialog
        order={targetOrder}
        defaultNewStatus={targetNewStatus}
        customersMap={customersMap}
        onClose={() => setTargetOrder(null)}
        onConfirm={updateOrderStatus}
      />

      <OrderRemarkDialog
        order={remarkOrder}
        customersMap={customersMap}
        onClose={() => setRemarkOrder(null)}
        onConfirm={updateOrderRemark}
      />

      <BulkStatusChangeDialog
        isOpen={isBulkModalOpen}
        selectedCount={selectedOrderIds.length}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={async (bulkTargetStatus) => {
          const success = await bulkUpdateOrderStatus(selectedOrderIds, bulkTargetStatus);
          if (success) clearSelection();
          return success;
        }}
      />

      <OrderHistoryDialog
        order={historyOrder}
        historyList={orderHistories}
        onClose={() => setHistoryOrder(null)}
      />

      <OrderPrintConfirmDialog
        isOpen={isPrintConfirmOpen}
        onClose={() => setIsPrintConfirmOpen(false)}
        onClearSelection={clearSelection}
      />
    </div>
  );
};
