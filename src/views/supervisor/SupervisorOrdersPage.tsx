import React, { useEffect, useMemo, useState } from 'react';
import type { Order, OrderStatus, DeliveryStatusHistory, Team } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import type { LeadPrintItem } from '../../components/printing/printTypes';
import { PrintFloatingPanel } from '../../components/printing/PrintFloatingPanel';
import { OrdersStats } from '../../components/orders/OrdersStats';
import { OrderFilters } from '../../components/orders/OrderFilters';
import { OrderList } from '../../components/orders/OrderList';
import { OrderStatusChangeDialog } from '../../components/orders/OrderStatusChangeDialog';
import { OrderRemarkDialog } from '../../components/orders/OrderRemarkDialog';
import { BulkStatusChangeDialog } from '../../components/orders/BulkStatusChangeDialog';
import { OrderHistoryDialog } from '../../components/orders/OrderHistoryDialog';
import { OrderPrintConfirmDialog } from '../../components/orders/OrderPrintConfirmDialog';
import { DuplicateOrderConflictDialog, DuplicateOrderConflictInfo } from '../../components/orders/DuplicateOrderConflictDialog';
import { OrderDamageDetailsDialog } from '../../components/orders/OrderDamageDetailsDialog';
import { useOrders } from '../../hooks/useOrders';
import { useOrderFilters } from '../../hooks/useOrderFilters';
import { useSelection } from '../../hooks/useSelection';
import { downloadParcelSlipPDF, printParcelSlipPDF } from '../../utils/parcelPdfGenerator';
import { CircularProgressPdfModal } from '../../components/printing/CircularProgressPdfModal';
import toast from 'react-hot-toast';
import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';
import { useAuth } from '../../hooks/useAuth';
import { teamRepository, productRepository } from '../../repositories';

export const SupervisorOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [adminTeamId, setAdminTeamId] = useState<string>(user?.teamId || '');
  const [teams, setTeams] = useState<Team[]>([]);

  // Circular Progress PDF Loading State
  const [pdfProgress, setPdfProgress] = useState({
    isOpen: false,
    title: 'Generating Slips...',
    subtitle: '',
    current: 0,
    total: 0,
    percentage: 0,
    actionType: 'DOWNLOAD' as 'DOWNLOAD' | 'PRINT',
  });

  useEffect(() => {
    let isMounted = true;
    teamRepository.getAll()
      .then((data) => {
        if (isMounted) setTeams(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const {
    orders,
    customersMap,
    teamMembers,
    membersMap,
    orderConflictMap,
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
  const [damageDetailsOrder, setDamageDetailsOrder] = useState<Order | null>(null);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const [historyOrder, setHistoryOrder] = useState<Order | null>(null);
  const [orderHistories, setOrderHistories] = useState<DeliveryStatusHistory[]>([]);

  const [isPrintConfirmOpen, setIsPrintConfirmOpen] = useState(false);

  const [inspectConflictOrder, setInspectConflictOrder] = useState<Order | null>(null);
  const [inspectConflictInfo, setInspectConflictInfo] = useState<DuplicateOrderConflictInfo | null>(null);

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

  // Inspect Duplicate Orders Trigger
  const handleInspectDuplicateOrders = (order: Order, conflictInfo: DuplicateOrderConflictInfo) => {
    setInspectConflictOrder(order);
    setInspectConflictInfo(conflictInfo);
  };

  const buildPrintItem = (order: Order): LeadPrintItem => {
    const customer = customersMap[order.customerId];
    const responsibleUser = membersMap[order.teamMemberId];
    const team = order.team || teams.find((t) => t.id === order.teamId);
    return {
      customer: customer || order.customer!,
      responsibleUser,
      order,
      team,
    };
  };

  // Selected Lead Print Items for PDF & Print
  const selectedPrintItems: LeadPrintItem[] = orders
    .filter((o) => selectedOrderIds.includes(o.id))
    .map(buildPrintItem);

  const handleDownloadPDF = async () => {
    if (selectedPrintItems.length === 0) return;
    setPdfProgress({
      isOpen: true,
      title: 'Downloading Slips PDF...',
      subtitle: `Preparing ${selectedPrintItems.length} slip(s)...`,
      current: 0,
      total: selectedPrintItems.length,
      percentage: 0,
      actionType: 'DOWNLOAD',
    });
    try {
      await downloadParcelSlipPDF(selectedPrintItems, (curr, tot, pct) => {
        setPdfProgress((prev) => ({
          ...prev,
          current: curr,
          total: tot,
          percentage: pct,
          subtitle: `Rendering high-resolution slip ${curr} of ${tot}...`,
        }));
      });
      toast.success('Slips PDF downloaded!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate slips PDF.');
    } finally {
      setPdfProgress((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleNativePrint = async () => {
    if (selectedPrintItems.length === 0) return;
    setPdfProgress({
      isOpen: true,
      title: 'Preparing Slips for Printing...',
      subtitle: `Assembling ${selectedPrintItems.length} slip(s)...`,
      current: 0,
      total: selectedPrintItems.length,
      percentage: 0,
      actionType: 'PRINT',
    });
    try {
      await printParcelSlipPDF(selectedPrintItems, (curr, tot, pct) => {
        setPdfProgress((prev) => ({
          ...prev,
          current: curr,
          total: tot,
          percentage: pct,
          subtitle: `Rendering high-resolution slip ${curr} of ${tot}...`,
        }));
      });
      setIsPrintConfirmOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate print document.');
    } finally {
      setPdfProgress((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handlePrintSlip = async (order: Order) => {
    const item = buildPrintItem(order);
    setPdfProgress({
      isOpen: true,
      title: 'Preparing Slip for Printing...',
      subtitle: `Rendering slip for Order #${order.orderNumber}...`,
      current: 0,
      total: 1,
      percentage: 0,
      actionType: 'PRINT',
    });
    try {
      await printParcelSlipPDF([item], (curr, tot, pct) => {
        setPdfProgress((prev) => ({
          ...prev,
          current: curr,
          total: tot,
          percentage: pct,
        }));
      });
      setIsPrintConfirmOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate print document.');
    } finally {
      setPdfProgress((prev) => ({ ...prev, isOpen: false }));
    }
  };

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-4 pb-28">
      {/* Admin Multi-Team Switcher */}
      <AdminTeamSelector
        activeTeamId={adminTeamId}
        onTeamChange={setAdminTeamId}
        title="Orders & Fulfillment Management"
      />

      {/* 1. Page Header */}
      <PageHeader
        title="Supervisor Orders"
        description="Monitor dispatched parcels, process delivery status updates, inspect duplicate order conflicts, and manage team orders."
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

      {/* Orders List View */}
      <OrderList
        filteredOrders={filteredOrders}
        customersMap={customersMap}
        membersMap={membersMap}
        selectedOrderIds={selectedOrderIds}
        orderConflictMap={orderConflictMap}
        onToggleSelectCard={toggleSelectCard}
        onViewHistory={handleViewHistory}
        onOpenStatusModal={handleOpenStatusModal}
        onOpenRemarkModal={(order) => setRemarkOrder(order)}
        onPrintSlip={handlePrintSlip}
        onInspectDamages={(order) => setDamageDetailsOrder(order)}
        onInspectDuplicateOrders={handleInspectDuplicateOrders}
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
        selectedOrders={orders.filter((o) => selectedOrderIds.includes(o.id))}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={async (bulkTargetStatus, damagedPayload) => {
          const success = await bulkUpdateOrderStatus(selectedOrderIds, bulkTargetStatus);
          // If damaged payload was reported, report damage for each selected item
          if (damagedPayload && damagedPayload.length > 0) {
            for (const item of damagedPayload) {
              if (item.productId) {
                try {
                  await productRepository.reportDamage(item.productId, item.quantity, item.reason);
                } catch {}
              }
            }
          }
          if (success) clearSelection();
          return success;
        }}
      />

      <OrderDamageDetailsDialog
        order={damageDetailsOrder}
        onClose={() => setDamageDetailsOrder(null)}
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

      {/* Duplicate Order Conflict & History Inspection Dialog */}
      <DuplicateOrderConflictDialog
        isOpen={!!inspectConflictOrder}
        onClose={() => {
          setInspectConflictOrder(null);
          setInspectConflictInfo(null);
        }}
        currentOrder={inspectConflictOrder}
        conflictInfo={inspectConflictInfo}
        customersMap={customersMap}
        membersMap={membersMap}
        onCancelOrder={async (ord) => {
          await updateOrderStatus(ord, 'CANCELLED', 'Supervisor cancelled duplicate order');
          setInspectConflictOrder(null);
          setInspectConflictInfo(null);
        }}
      />

      {/* Circular Progress PDF / Print Loading Modal */}
      <CircularProgressPdfModal {...pdfProgress} />
    </div>
  );
};
