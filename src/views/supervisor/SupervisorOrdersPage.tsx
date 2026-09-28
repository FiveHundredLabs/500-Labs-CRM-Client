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
import { OrderRejectionModal } from '../../components/orders/OrderRejectionModal';
import { OrderReplacementRequestModal } from '../../components/orders/OrderReplacementRequestModal';
import { useOrders } from '../../hooks/useOrders';
import { useOrderFilters } from '../../hooks/useOrderFilters';
import { useSelection } from '../../hooks/useSelection';
import { downloadParcelSlipPDF, printParcelSlipPDF } from '../../utils/parcelPdfGenerator';
import { CircularProgressPdfModal } from '../../components/printing/CircularProgressPdfModal';
import toast from 'react-hot-toast';
import { AdminTeamSelector } from '../../components/shared/AdminTeamSelector';
import { useAuth } from '../../hooks/useAuth';
import { teamRepository, productRepository, orderRepository } from '../../repositories';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Layers, FileSpreadsheet } from 'lucide-react';
import { LargeBatchWarningDialog } from '../../components/printing/LargeBatchWarningDialog';
import { format } from 'date-fns';

const getPageNumbers = (current: number, total: number): (number | string)[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
};

const EMPTY_ORDERS: Order[] = [];
const EMPTY_CUSTOMERS: Record<string, any> = {};
const EMPTY_MEMBERS: Record<string, any> = {};

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
    selectedDate,
    setSelectedDate,
    statusFilter,
    setStatusFilter,
    selectedMemberId,
    setSelectedMemberId,
    search,
    setSearch,
    debouncedSearch,
    currentPage,
    setCurrentPage,
    resetFilters,
  } = useOrderFilters(EMPTY_ORDERS, EMPTY_CUSTOMERS, EMPTY_MEMBERS, true);

  const {
    orders,
    pageInfo,
    statusMetrics,
    customersMap,
    teamMembers,
    membersMap,
    orderConflictMap,
    loading,
    loadData,
    updateOrderStatus,
    updateOrderRemark,
    bulkUpdateOrderStatus,
    fetchOrderHistory,
  } = useOrders({
    overrideTeamId: user?.role === 'ADMIN' ? adminTeamId : undefined,
    page: currentPage,
    limit: 50,
    status: statusFilter,
    memberId: selectedMemberId,
    search: debouncedSearch,
    date: selectedDate,
    paginate: true,
  });

  const pageNumbers = useMemo(() => {
    return pageInfo?.totalPages ? getPageNumbers(currentPage, pageInfo.totalPages) : [];
  }, [currentPage, pageInfo?.totalPages]);

  const filteredOrders = orders;
  const dateFilteredOrders = orders;

  const filteredOrderIds = useMemo(() => filteredOrders.map((o) => o.id), [filteredOrders]);

  const {
    selectedIds: selectedOrderIds,
    setSelectedIds: setSelectedOrderIds,
    clearSelection,
  } = useSelection(filteredOrderIds);

  const [isAllPagesSelected, setIsAllPagesSelected] = useState(false);

  const effectiveSelectedCount = isAllPagesSelected
    ? (pageInfo?.total ?? filteredOrderIds.length)
    : selectedOrderIds.length;

  const isUpTo20Selected = useMemo(() => {
    if (isAllPagesSelected || filteredOrderIds.length === 0 || selectedOrderIds.length === 0) return false;
    const targetSlice = filteredOrderIds.slice(0, 20);
    return (
      selectedOrderIds.length === targetSlice.length &&
      targetSlice.every((id) => selectedOrderIds.includes(id))
    );
  }, [isAllPagesSelected, filteredOrderIds, selectedOrderIds]);

  const isAllSelected = useMemo(() => {
    if (isAllPagesSelected) return true;
    if (filteredOrderIds.length === 0 || selectedOrderIds.length === 0) return false;
    return (
      selectedOrderIds.length === filteredOrderIds.length &&
      filteredOrderIds.every((id) => selectedOrderIds.includes(id))
    );
  }, [isAllPagesSelected, filteredOrderIds, selectedOrderIds]);

  const handleSelectUpTo20 = () => {
    setIsAllPagesSelected(false);
    if (isUpTo20Selected) {
      clearSelection();
      return;
    }
    const upTo20 = filteredOrderIds.slice(0, 20);
    setSelectedOrderIds(upTo20);
  };

  const handleSelectAll = () => {
    if (isAllPagesSelected || isAllSelected) {
      clearSelection();
      setIsAllPagesSelected(false);
      return;
    }
    setIsAllPagesSelected(true);
    setSelectedOrderIds(filteredOrderIds);
  };

  const handleToggleSelectCard = (id: string) => {
    setIsAllPagesSelected(false);
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedOrderIds((prev) => [...prev, id]);
    }
  };

  const handleClearSelection = () => {
    clearSelection();
    setIsAllPagesSelected(false);
  };

  // Workflow Dialog States
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);
  const [targetNewStatus, setTargetNewStatus] = useState<OrderStatus>('DELIVERED');

  const [remarkOrder, setRemarkOrder] = useState<Order | null>(null);
  const [damageDetailsOrder, setDamageDetailsOrder] = useState<Order | null>(null);
  const [rejectionModalOrder, setRejectionModalOrder] = useState<Order | null>(null);
  const [replacementModalOrder, setReplacementModalOrder] = useState<Order | null>(null);

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

  // High volume batch warning state (>= 50 bills)
  const [pendingBatchAction, setPendingBatchAction] = useState<'DOWNLOAD' | 'PRINT' | null>(null);
  const [isLargeBatchWarningOpen, setIsLargeBatchWarningOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Helper to get orders whether from current page or all matching across pages
  const getOrdersForBatchAction = async (): Promise<Order[]> => {
    if (isAllPagesSelected) {
      return orderRepository.getAll({
        teamId: user?.role === 'ADMIN' ? adminTeamId : (user?.teamId || undefined),
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        memberId: selectedMemberId !== 'ALL' ? selectedMemberId : undefined,
        search: debouncedSearch.trim() || undefined,
        date: selectedDate && selectedDate !== 'ALL' ? selectedDate : undefined,
      });
    }
    return orders.filter((o) => selectedOrderIds.includes(o.id));
  };

  const getPrintItemsToProcess = async (): Promise<LeadPrintItem[]> => {
    const targetOrders = await getOrdersForBatchAction();
    return targetOrders.map(buildPrintItem);
  };

  // Excel export: Unlimited and NO warning modal
  const handleExportExcel = async () => {
    if (effectiveSelectedCount === 0) return;
    setIsExportingExcel(true);
    try {
      const XLSX = await import('xlsx');
      const targetOrders = await getOrdersForBatchAction();
      const rows = targetOrders.map((o) => {
        const cust = customersMap[o.customerId];
        const member = membersMap[o.teamMemberId];
        return {
          'Order Number': o.orderNumber,
          'Date': format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm'),
          'Status': o.status,
          'Customer Name': cust?.fullName || (o as any).customer?.fullName || (o as any).customerName || '-',
          'Phone': cust?.phone || (o as any).customer?.phone || (o as any).customerPhone || '-',
          'Address': cust?.address || (o as any).customer?.address || '-',
          'City': cust?.city || (o as any).customer?.city || '-',
          'Total Amount': o.totalAmount,
          'COD Charge': o.codCharge,
          'Delivery Method': o.deliveryMethod || '-',
          'Agent': member?.fullName || (o as any).teamMember?.fullName || '-',
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      XLSX.writeFile(wb, `Orders_Export_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
      toast.success(`Exported ${rows.length} orders to Excel!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export orders to Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const executeDownloadPDF = async () => {
    if (effectiveSelectedCount === 0) return;
    setPdfProgress({
      isOpen: true,
      title: 'Downloading Slips PDF...',
      subtitle: `Preparing ${effectiveSelectedCount} slip(s)...`,
      current: 0,
      total: effectiveSelectedCount,
      percentage: 0,
      actionType: 'DOWNLOAD',
    });
    try {
      const items = await getPrintItemsToProcess();
      if (items.length === 0) {
        toast.error('No orders found to generate slips.');
        return;
      }
      setPdfProgress((prev) => ({
        ...prev,
        total: items.length,
        subtitle: `Rendering high-resolution slip 1 of ${items.length}...`,
      }));
      await downloadParcelSlipPDF(items, (curr, tot, pct) => {
        setPdfProgress((prev) => ({
          ...prev,
          current: curr,
          total: tot,
          percentage: pct,
          subtitle: `Rendering high-resolution slip ${curr} of ${tot}...`,
        }));
      });
      toast.success(`Successfully downloaded ${items.length} slips PDF!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate slips PDF.');
    } finally {
      setPdfProgress((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const executeNativePrint = async () => {
    if (effectiveSelectedCount === 0) return;
    setPdfProgress({
      isOpen: true,
      title: 'Preparing Slips for Printing...',
      subtitle: `Assembling ${effectiveSelectedCount} slip(s)...`,
      current: 0,
      total: effectiveSelectedCount,
      percentage: 0,
      actionType: 'PRINT',
    });
    try {
      const items = await getPrintItemsToProcess();
      if (items.length === 0) {
        toast.error('No orders found to generate slips.');
        return;
      }
      setPdfProgress((prev) => ({
        ...prev,
        total: items.length,
        subtitle: `Rendering high-resolution slip 1 of ${items.length}...`,
      }));
      await printParcelSlipPDF(items, (curr, tot, pct) => {
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

  const handleDownloadPDF = () => {
    if (effectiveSelectedCount === 0) return;
    if (effectiveSelectedCount >= 50) {
      setPendingBatchAction('DOWNLOAD');
      setIsLargeBatchWarningOpen(true);
      return;
    }
    executeDownloadPDF();
  };

  const handleNativePrint = () => {
    if (effectiveSelectedCount === 0) return;
    if (effectiveSelectedCount >= 50) {
      setPendingBatchAction('PRINT');
      setIsLargeBatchWarningOpen(true);
      return;
    }
    executeNativePrint();
  };

  const handleOpenBulkModal = () => {
    if (isAllPagesSelected || effectiveSelectedCount > 20) {
      toast.error('You can select a maximum of 20 orders for bulk status change. Please use "Select 20".');
      return;
    }
    if (selectedOrderIds.length === 0) {
      toast.error('Please select at least one order.');
      return;
    }
    setIsBulkModalOpen(true);
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

  if (loading && !orders.length && !pageInfo) return <LoadingState rows={6} />;

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
        dispatchedCount={statusMetrics.dispatchedCount}
        deliveredCount={statusMetrics.deliveredCount}
        rejectedCount={statusMetrics.rejectedCount}
        statusFilter={statusFilter}
        onSelectStatusFilter={setStatusFilter}
      />

      {/* 2. Filter Toolbar */}
      <OrderFilters
        selectedDate={selectedDate}
        onDateChange={(d) => {
          setSelectedDate(d);
          setIsAllPagesSelected(false);
        }}
        selectedMemberId={selectedMemberId}
        onMemberIdChange={(m) => {
          setSelectedMemberId(m);
          setIsAllPagesSelected(false);
        }}
        teamMembers={teamMembers}
        dateFilteredOrders={dateFilteredOrders}
        search={search}
        onSearchChange={(s) => {
          setSearch(s);
          setIsAllPagesSelected(false);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(s) => {
          setStatusFilter(s);
          setIsAllPagesSelected(false);
        }}
        onResetFilters={() => {
          resetFilters();
          setIsAllPagesSelected(false);
        }}
        filteredCount={pageInfo?.total ?? filteredOrders.length}
        selectedCount={effectiveSelectedCount}
        onSelectUpTo20={handleSelectUpTo20}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        isUpTo20Selected={isUpTo20Selected}
        isAllSelected={isAllSelected}
        onOpenBulkModal={handleOpenBulkModal}
      />

      {/* Top Pagination Bar for Immediate Visibility & Context */}
      {pageInfo && pageInfo.total !== undefined && pageInfo.total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-gradient-to-r from-sky-50/80 via-white to-sky-50/50 border border-[#01A8F3]/30 rounded-xl px-3.5 py-2.5 text-xs shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#01A8F3] text-white font-bold text-xs shadow-2xs">
              <Layers className="w-3.5 h-3.5" />
              Page {currentPage} of {pageInfo.totalPages || 1}
            </span>
            <span className="text-slate-600 font-medium">
              Showing <strong className="text-slate-900 font-bold">{(currentPage - 1) * pageInfo.limit + 1}–{Math.min(currentPage * pageInfo.limit, pageInfo.total)}</strong> of{' '}
              <strong className="text-[#0188C7] font-bold">{pageInfo.total}</strong> orders
            </span>
          </div>

          {(pageInfo.totalPages ?? 1) > 1 && (
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                disabled={currentPage <= 1 || !pageInfo.hasPreviousPage}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="text-xs font-mono font-bold text-slate-700 px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                {currentPage} / {pageInfo.totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= (pageInfo.totalPages ?? 1) || !pageInfo.hasNextPage}
                onClick={() => setCurrentPage((p) => Math.min(pageInfo.totalPages ?? 1, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Orders List View */}
      <OrderList
        filteredOrders={filteredOrders}
        customersMap={customersMap}
        membersMap={membersMap}
        selectedOrderIds={selectedOrderIds}
        orderConflictMap={orderConflictMap}
        onToggleSelectCard={handleToggleSelectCard}
        onViewHistory={handleViewHistory}
        onOpenStatusModal={handleOpenStatusModal}
        onOpenRemarkModal={(order) => setRemarkOrder(order)}
        onPrintSlip={handlePrintSlip}
        onInspectDamages={(order) => setDamageDetailsOrder(order)}
        onInspectDuplicateOrders={handleInspectDuplicateOrders}
        onOpenRejectionModal={(order) => setRejectionModalOrder(order)}
        onOpenReplacementModal={(order) => setReplacementModalOrder(order)}
      />

      {/* High-Visibility Interactive Pagination Controls */}
      {pageInfo && pageInfo.totalPages !== undefined && pageInfo.totalPages > 1 && (
        <div className="bg-white border-2 border-[#01A8F3]/30 hover:border-[#01A8F3]/60 rounded-2xl p-3.5 sm:px-5 sm:py-3.5 shadow-md shadow-sky-100/60 flex flex-col md:flex-row items-center justify-between gap-3.5 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#E8F7FE] text-[#0188C7] flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 flex-wrap">
              <span>Showing</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {(currentPage - 1) * pageInfo.limit + 1} – {Math.min(currentPage * pageInfo.limit, pageInfo.total ?? 0)}
              </span>
              <span>of</span>
              <span className="font-bold text-[#0188C7] bg-[#E8F7FE] px-2 py-0.5 rounded-md border border-[#B9E7FC]">
                {pageInfo.total}
              </span>
              <span className="text-slate-600">orders</span>
              <span className="hidden sm:inline-block text-slate-300">•</span>
              <span className="text-slate-500 font-semibold">
                Page <span className="text-slate-900 font-bold">{currentPage}</span> of{' '}
                <span className="text-slate-900 font-bold">{pageInfo.totalPages}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* First Page */}
            <button
              type="button"
              disabled={currentPage <= 1 || !pageInfo.hasPreviousPage}
              onClick={() => setCurrentPage(1)}
              title="First Page"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button
              type="button"
              disabled={currentPage <= 1 || !pageInfo.hasPreviousPage}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Direct Page Number Buttons */}
            <div className="flex items-center gap-1">
              {pageNumbers.map((item, idx) => {
                if (item === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-1.5 text-xs font-bold text-slate-400">
                      ...
                    </span>
                  );
                }
                const isCurrent = item === currentPage;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(Number(item))}
                    className={`min-w-[32px] h-8 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                      isCurrent
                        ? 'bg-[#01A8F3] text-white shadow-xs font-black ring-2 ring-[#01A8F3]/30'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Next */}
            <button
              type="button"
              disabled={currentPage >= (pageInfo.totalPages ?? 1) || !pageInfo.hasNextPage}
              onClick={() => setCurrentPage((p) => Math.min(pageInfo.totalPages ?? 1, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              disabled={currentPage >= (pageInfo.totalPages ?? 1) || !pageInfo.hasNextPage}
              onClick={() => setCurrentPage(pageInfo.totalPages ?? 1)}
              title="Last Page"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>

            {/* Direct Page Selector if more than 5 pages */}
            {pageInfo.totalPages > 5 && (
              <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200 text-xs text-slate-500">
                <span className="hidden sm:inline font-medium">Go to:</span>
                <select
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#01A8F3]"
                >
                  {Array.from({ length: pageInfo.totalPages }, (_, i) => i + 1).map((pg) => (
                    <option key={pg} value={pg}>
                      Page {pg}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Floating Action Panel */}
      <PrintFloatingPanel
        selectedCount={effectiveSelectedCount}
        countLabel="Order(s) Selected"
        onDownloadPDF={handleDownloadPDF}
        onNativePrint={handleNativePrint}
        extraActions={
          <>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={effectiveSelectedCount === 0 || isExportingExcel}
              className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs border border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Export selected orders to Excel (Unlimited, No Warning)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            {statusFilter !== 'DELIVERED' &&
            statusFilter !== 'REJECTED' &&
            !orders.some(
              (o) => selectedOrderIds.includes(o.id) && (o.status === 'DELIVERED' || o.status === 'REJECTED')
            ) ? (
              <button
                type="button"
                onClick={handleOpenBulkModal}
                className={`py-1 px-2.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs border border-amber-400/30 cursor-pointer ${
                  selectedOrderIds.length > 20 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={selectedOrderIds.length > 20 ? 'Maximum 20 orders allowed for this action' : 'Bulk Status Change'}
              >
                <span>Bulk</span>
              </button>
            ) : null}
          </>
        }
      />


      {/* 5. Dialog Modals */}
      <OrderStatusChangeDialog
        order={targetOrder}
        defaultNewStatus={targetNewStatus}
        customersMap={customersMap}
        onClose={() => setTargetOrder(null)}
        onConfirm={updateOrderStatus}
        onRejectionSubmitted={loadData}
      />

      <OrderRejectionModal
        order={rejectionModalOrder}
        customer={rejectionModalOrder ? customersMap[rejectionModalOrder.customerId] : undefined}
        onClose={() => setRejectionModalOrder(null)}
        onSuccess={loadData}
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
          const success = await bulkUpdateOrderStatus(selectedOrderIds, bulkTargetStatus, damagedPayload);
          if (success) clearSelection();
          return success;
        }}
      />

      <OrderDamageDetailsDialog
        order={damageDetailsOrder}
        onClose={() => setDamageDetailsOrder(null)}
      />

      {/* Product Replacement Request Modal */}
      <OrderReplacementRequestModal
        order={replacementModalOrder}
        customer={replacementModalOrder ? customersMap[replacementModalOrder.customerId] : undefined}
        onClose={() => setReplacementModalOrder(null)}
        onSuccess={() => {
          setReplacementModalOrder(null);
          loadData();
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

      {/* High-Volume Bills Warning Modal (>= 50 bills) */}
      <LargeBatchWarningDialog
        isOpen={isLargeBatchWarningOpen}
        count={effectiveSelectedCount}
        actionType={pendingBatchAction || 'DOWNLOAD'}
        onClose={() => {
          setIsLargeBatchWarningOpen(false);
          setPendingBatchAction(null);
        }}
        onConfirm={() => {
          const action = pendingBatchAction;
          setIsLargeBatchWarningOpen(false);
          setPendingBatchAction(null);
          if (action === 'DOWNLOAD') {
            executeDownloadPDF();
          } else if (action === 'PRINT') {
            executeNativePrint();
          }
        }}
      />

      {/* Circular Progress PDF / Print Loading Modal */}
      <CircularProgressPdfModal {...pdfProgress} />
    </div>
  );
};
