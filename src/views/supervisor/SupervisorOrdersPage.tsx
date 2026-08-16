import React, { useState } from 'react';
import type { Order, OrderStatus, DeliveryStatusHistory } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { LeadPrintItem, A4BillingPrintSheet } from '../../components/printing/A4BillingPrintSheet';
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

export const SupervisorOrdersPage: React.FC = () => {
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
  } = useOrders();

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
    .map((o) => ({
      customer: customersMap[o.customerId] || {
        id: `cst_temp_${o.id}`,
        contactId: '',
        fullName: 'Customer',
        phone: 'N/A',
        address: 'N/A',
        teamId: o.teamId,
        responsibleTeamMemberId: o.teamMemberId,
        supervisorId: o.supervisorId,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      },
      responsibleUser: membersMap[o.teamMemberId],
      order: o,
    }));

  const handleDownloadPDF = () => {
    if (selectedPrintItems.length === 0) return;
    const success = downloadBillingPDF(selectedPrintItems);
    if (success) {
      toast.success('Billing slips PDF downloaded!');
    }
  };

  const handleNativePrint = () => {
    if (selectedPrintItems.length === 0) return;
    window.print();
    setIsPrintConfirmOpen(true);
  };

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-4 pb-28">
      <PrintDocumentStyles />

      {/* Hidden Print Container rendered in DOM for window.print() */}
      <div className="hidden print:block">
        <A4BillingPrintSheet items={selectedPrintItems} />
      </div>

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
