import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Team, User, OrderStatus } from '../../models/domain';
import { teamRepository, userRepository, orderRepository } from '../../repositories';
import { TeamMemberOrderReportItem, TeamMemberOrdersReportMeta } from '../../repositories/interfaces';
import { PageHeader } from '../../components/shared/PageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../utils/currency';
import { CRM_TIMEZONE } from '../../utils/deliveryDateUtils';
import {
  FileSpreadsheet,
  Calendar,
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  Truck,
  Box,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  AlertTriangle,
  Lock,
  Layers,
  Check,
  ChevronDown,
  ArrowLeft,
  Banknote,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import toast from 'react-hot-toast';

// Allowed report statuses
const REPORT_STATUSES: { key: OrderStatus; label: string; description: string; color: string; badgeVariant: 'success' | 'warning' | 'danger' | 'info' }[] = [
  { key: 'DELIVERED', label: 'Delivered', description: 'Filtered by Delivered Date', color: 'emerald', badgeVariant: 'success' },
  { key: 'DISPATCHED', label: 'Dispatched', description: 'Filtered by Dispatch Event Date', color: 'blue', badgeVariant: 'info' },
  { key: 'PREPARED', label: 'Prepared', description: 'Filtered by Prepared Event Date', color: 'amber', badgeVariant: 'warning' },
  { key: 'REJECTED', label: 'Rejected', description: 'Filtered by Rejection Date', color: 'rose', badgeVariant: 'danger' },
];

const DATE_PRESETS = [
  { id: 'THIS_MONTH', label: 'This Month' },
  { id: 'LAST_MONTH', label: 'Last Month' },
  { id: 'THIS_WEEK', label: 'This Week' },
  { id: 'TODAY', label: 'Today' },
  { id: 'CUSTOM', label: 'Custom Range' },
];

interface TeamMemberOrdersReportPageProps {
  onBack?: () => void;
  hideBackButton?: boolean;
}

export const TeamMemberOrdersReportPage: React.FC<TeamMemberOrdersReportPageProps> = ({ onBack, hideBackButton = false }) => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const isSupervisor = role === 'SUPERVISOR';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (isAdmin) {
      navigate('/admin/reports?category=sales');
    } else if (isSupervisor) {
      navigate('/supervisor/reports');
    } else {
      navigate(-1);
    }
  };

  // 1. Team State
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loadingTeams, setLoadingTeams] = useState<boolean>(true);

  // 2. Team Members State
  const [availableMembers, setAvailableMembers] = useState<User[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState<boolean>(false);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);

  // 3. Date Range State
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const activeRequestRef = useRef<number>(0);
  const [dateError, setDateError] = useState<string | null>(null);

  // 4. Status Filter State
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    'DELIVERED',
    'DISPATCHED',
    'PREPARED',
    'REJECTED',
  ]);

  // Delivery Method Filter State
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<string>('ALL');

  // 5. Table & Search & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // 6. Data & Metadata State
  const [reportItems, setReportItems] = useState<TeamMemberOrderReportItem[]>([]);
  const [reportMeta, setReportMeta] = useState<TeamMemberOrdersReportMeta | null>(null);
  const [pageInfo, setPageInfo] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Initial Date Preset Calculation
  const applyDatePreset = useCallback((preset: string) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'THIS_MONTH') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
      setDateError(null);
    } else if (preset === 'LAST_MONTH') {
      const prev = subMonths(now, 1);
      setStartDate(format(startOfMonth(prev), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(prev), 'yyyy-MM-dd'));
      setDateError(null);
    } else if (preset === 'THIS_WEEK') {
      setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setDateError(null);
    } else if (preset === 'TODAY') {
      const todayStr = format(now, 'yyyy-MM-dd');
      setStartDate(todayStr);
      setEndDate(todayStr);
      setDateError(null);
    }
  }, []);

  // Initial dates are initialized synchronously above

  // Validate Dates whenever start/end change
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setDateError('Start date cannot be after end date.');
    } else {
      setDateError(null);
    }
  }, [startDate, endDate]);

  // Load Teams (Admin gets all teams; Supervisor gets their assigned team)
  useEffect(() => {
    let isMounted = true;
    setLoadingTeams(true);

    teamRepository.getAll()
      .then((data) => {
        if (!isMounted) return;
        setTeams(data);

        if (isSupervisor) {
          if (user?.teamId) {
            setSelectedTeamId(user.teamId);
          }
        } else if (isAdmin) {
          if (data.length > 0 && (!selectedTeamId || !data.some((t) => t.id === selectedTeamId))) {
            setSelectedTeamId(data[0].id);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          toast.error('Failed to load teams: ' + (err.message || 'Unknown error'));
        }
      })
      .finally(() => {
        if (isMounted) setLoadingTeams(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin, isSupervisor, user?.teamId]);

  // Load Team Members when Selected Team Changes
  useEffect(() => {
    if (!selectedTeamId) {
      setAvailableMembers([]);
      setSelectedMemberIds([]);
      return;
    }

    let isMounted = true;
    setLoadingMembers(true);
    setSelectedMemberIds([]); // reset previously selected members on team switch

    userRepository.getByTeamId(selectedTeamId)
      .then((members) => {
        if (!isMounted) return;
        const validMembers = (members || []).filter((m) => m.role === 'TEAM_MEMBER');
        setAvailableMembers(validMembers);
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load team members:', err);
          setAvailableMembers([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingMembers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTeamId]);

  // Fetch Report Data from Backend
  const fetchReport = useCallback(async () => {
    if (!selectedTeamId) return;
    if (dateError) return;
    if (selectedStatuses.length === 0) {
      toast.error('Please select at least one order status.');
      return;
    }

    const currentRequestId = ++activeRequestRef.current;
    setLoadingReport(true);
    setFetchError(null);

    try {
      const response = await orderRepository.getTeamMemberOrdersReport({
        teamId: selectedTeamId,
        memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        statuses: selectedStatuses as OrderStatus[],
        deliveryMethod: selectedDeliveryMethod !== 'ALL' ? selectedDeliveryMethod : undefined,
        search: debouncedSearch || undefined,
        page: currentPage,
        limit: pageSize,
      });

      if (currentRequestId !== activeRequestRef.current) return;
      setReportItems(response.data || response.items || []);
      setReportMeta(response.meta);
      setPageInfo(response.pageInfo || null);
    } catch (err: any) {
      if (currentRequestId !== activeRequestRef.current) return;
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to load report data';
      setFetchError(errMsg);
      toast.error(errMsg);
    } finally {
      if (currentRequestId === activeRequestRef.current) {
        setLoadingReport(false);
      }
    }
  }, [
    selectedTeamId,
    dateError,
    selectedStatuses,
    selectedMemberIds,
    selectedDeliveryMethod,
    startDate,
    endDate,
    debouncedSearch,
    currentPage,
    pageSize,
  ]);

  // Trigger report fetch when filters or pagination changes
  useEffect(() => {
    if (selectedTeamId && !dateError) {
      fetchReport();
    }
  }, [fetchReport, selectedTeamId, dateError]);

  // Selected Team Details
  const activeTeam = useMemo(() => {
    return teams.find((t) => t.id === selectedTeamId) || null;
  }, [teams, selectedTeamId]);

  // Filtered Member List for Dropdown
  const filteredAvailableMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return availableMembers;
    const q = memberSearchQuery.toLowerCase();
    return availableMembers.filter(
      (m) =>
        m.fullName?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q)
    );
  }, [availableMembers, memberSearchQuery]);

  // Member Multi-select Handlers
  const handleToggleMember = (memberId: string) => {
    setCurrentPage(1);
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSelectAllMembers = () => {
    setCurrentPage(1);
    setSelectedMemberIds(availableMembers.map((m) => m.id));
  };

  const handleClearAllMembers = () => {
    setCurrentPage(1);
    setSelectedMemberIds([]);
  };

  // Status Filter Handlers
  const handleToggleStatus = (status: string) => {
    setCurrentPage(1);
    setSelectedStatuses((prev) => {
      if (prev.includes(status)) {
        if (prev.length === 1) {
          toast.error('At least one status must be selected.');
          return prev;
        }
        return prev.filter((s) => s !== status);
      }
      return [...prev, status];
    });
  };

  const handleSelectAllStatuses = () => {
    setCurrentPage(1);
    setSelectedStatuses(['DELIVERED', 'DISPATCHED', 'PREPARED', 'REJECTED']);
  };

  // Full Result Excel Export Handler
  const handleExportExcel = async () => {
    if (!selectedTeamId) {
      toast.error('No team selected.');
      return;
    }
    if (dateError) {
      toast.error('Please fix the date range error first.');
      return;
    }
    if (selectedStatuses.length === 0) {
      toast.error('Please select at least one status.');
      return;
    }

    setExportingExcel(true);
    const toastId = toast.loading('Generating Excel export for all matching records...');

    try {
      // 1. Fetch complete unpaginated dataset from backend
      const exportRes = await orderRepository.getTeamMemberOrdersReport({
        teamId: selectedTeamId,
        memberIds: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        statuses: selectedStatuses as OrderStatus[],
        deliveryMethod: selectedDeliveryMethod !== 'ALL' ? selectedDeliveryMethod : undefined,
        search: debouncedSearch || undefined,
        export: true,
      });

      const items = (exportRes.data || exportRes.items || []) as TeamMemberOrderReportItem[];
      if (items.length === 0) {
        toast.dismiss(toastId);
        toast.error('No matching records found to export.');
        return;
      }

      // 2. Load xlsx dynamically
      const XLSX = await import('xlsx');

      const teamName = activeTeam?.name || reportMeta?.teamName || 'Team';
      const safeTeamName = teamName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const nowStr = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      const membersText =
        selectedMemberIds.length > 0
          ? availableMembers
              .filter((m) => selectedMemberIds.includes(m.id))
              .map((m) => m.fullName)
              .join(', ')
          : 'All Team Members';

      // 3. Build Metadata Block (Rows 1-6)
      const metadataRows = [
        ['TEAM MEMBER ORDERS REPORT', ''],
        ['Generated At', nowStr],
        ['Team', teamName],
        ['Team Members', membersText],
        ['Date Range', `${startDate || 'Beginning'} to ${endDate || 'Now'} (${CRM_TIMEZONE})`],
        ['Filtered Statuses', selectedStatuses.join(', ')],
        ['Delivery Method', selectedDeliveryMethod === 'ALL' ? 'All Delivery Methods (Including Cash on Hand)' : selectedDeliveryMethod === 'CASH_ON_HAND' ? 'Cash on Hand' : selectedDeliveryMethod],
        [], // blank row
      ];

      // 4. Build Table Column Headers
      const headers = [
        'Team Name',
        'Team Member Name',
        'Username',
        'Order Number',
        'Status',
        'Delivery Method',
        'Total Amount (LKR)',
        'COD Amount (LKR)',
        'Created Date',
        'Delivered Date',
        'Rejected Date',
        'Items Description',
        'Selected Package',
      ];

      // 5. Build Data Rows
      let sumTotalAmount = 0;
      let sumCodAmount = 0;

      const dataRows = items.map((order: TeamMemberOrderReportItem) => {
        sumTotalAmount += Number(order.totalAmount) || 0;
        sumCodAmount += Number(order.codAmount) || 0;

        return [
          order.teamName || teamName,
          order.teamMemberName || '-',
          order.username || '-',
          order.orderNumber || '-',
          order.status || '-',
          order.deliveryMethod === 'CASH_ON_HAND' ? 'Cash on Hand' : order.deliveryMethod === 'ROYAL_COURIER' ? 'Royal Courier' : order.deliveryMethod || '-',
          Number(order.totalAmount) || 0,
          Number(order.codAmount) || 0,
          order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm') : '-',
          order.deliveredAt ? format(new Date(order.deliveredAt), 'yyyy-MM-dd HH:mm') : '-',
          order.rejectedAt ? format(new Date(order.rejectedAt), 'yyyy-MM-dd HH:mm') : '-',
          order.itemsDescription || '-',
          order.selectedPackage || '-',
        ];
      });

      // 6. Build Summary Row
      const summaryRow = [
        'TOTALS',
        `${items.length} Orders`,
        '',
        '',
        '',
        '',
        sumTotalAmount,
        sumCodAmount,
        '',
        '',
        '',
        '',
        '',
      ];

      // Assemble all rows
      const worksheetData = [...metadataRows, headers, ...dataRows, [], summaryRow];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set Column Widths
      worksheet['!cols'] = [
        { wch: 18 }, // Team Name
        { wch: 22 }, // Member Name
        { wch: 16 }, // Username
        { wch: 18 }, // Order Number
        { wch: 14 }, // Status
        { wch: 16 }, // Delivery Method
        { wch: 18 }, // Total Amount
        { wch: 16 }, // COD Amount
        { wch: 18 }, // Created Date
        { wch: 18 }, // Delivered Date
        { wch: 18 }, // Rejected Date
        { wch: 32 }, // Items Description
        { wch: 20 }, // Selected Package
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Team Member Orders');

      const filename = `Team_Member_Orders_${safeTeamName}_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.dismiss(toastId);
      toast.success(`Exported ${items.length} orders successfully!`);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('Excel Export Failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExportingExcel(false);
    }
  };

  // Supervisor without assigned team error state
  if (isSupervisor && !user?.teamId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Team Member Orders Report"
          description="Operational order status and performance breakdown by team member"
        />
        <div className="p-8 max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">No Assigned Operational Team</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your supervisor user account is not currently assigned to any team in the ERP system.
            In accordance with system security and role-based access control, you cannot access or export
            orders until your team assignment is configured by an Administrator.
          </p>
          <div className="pt-2 text-xs font-semibold text-slate-500">
            Please contact an Administrator to configure your team assignment.
          </div>
        </div>
      </div>
    );
  }

  // Summary Metrics Breakdown
  const summaryByStatus = reportMeta?.summaryByStatus || {};
  const totalMatchingOrders = reportMeta?.totalMatchingOrders ?? reportMeta?.total ?? 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      {!hideBackButton && (onBack || isAdmin) && (
        <div>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0188C7] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Back to All Reports</span>
          </button>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Team Member Orders Report"
          description="Audited order consignments filtered by team, team members, status event timestamps, and date range"
        />
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            onClick={() => {
              setCurrentPage(1);
              fetchReport();
            }}
            disabled={loadingReport || !selectedTeamId}
            className="flex items-center gap-2 text-xs font-bold bg-[#0188C7] hover:bg-[#0170a4] text-white shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin' : ''}`} />
            <span>Generate Report</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={exportingExcel || loadingReport || totalMatchingOrders === 0}
            className="flex items-center gap-2 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer bg-white"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{exportingExcel ? 'Exporting...' : 'Export to Excel (.xlsx)'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Filter Control Panel */}
      <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Filter className="w-4 h-4 text-[#0188C7]" />
            <span>Report Filter Parameters</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Timezone: {CRM_TIMEZONE}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* A. Team Selector (Admin searchable select / Supervisor locked badge) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Operational Team</span>
            </label>

            {isAdmin ? (
              <div className="relative">
                <select
                  value={selectedTeamId}
                  onChange={(e) => {
                    setSelectedTeamId(e.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={loadingTeams}
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/40 focus:border-[#01A8F3]"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{activeTeam?.name || 'Assigned Team'}</span>
                <Badge variant="info" className="ml-auto text-[10px] py-0 px-1.5">
                  Assigned
                </Badge>
              </div>
            )}
          </div>

          {/* B. Team Member Multi-Select Filter */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Team Members</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedMemberIds.length === 0
                  ? `All (${availableMembers.length})`
                  : `${selectedMemberIds.length} of ${availableMembers.length}`}
              </span>
            </div>

            {/* Dropdown Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
              disabled={loadingMembers || availableMembers.length === 0}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100/70 transition-colors cursor-pointer text-left"
            >
              <span className="truncate">
                {selectedMemberIds.length === 0
                  ? 'All Team Members'
                  : selectedMemberIds.length === 1
                  ? availableMembers.find((m) => m.id === selectedMemberIds[0])?.fullName || '1 Member Selected'
                  : `${selectedMemberIds.length} Members Selected`}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isMemberDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Multi-Select Floating Dropdown */}
            {isMemberDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-2.5 space-y-2 max-h-72 flex flex-col">
                {/* Search in Dropdown */}
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Search member..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#01A8F3]"
                  />
                </div>

                {/* Select All / Clear All Buttons */}
                <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-500 border-b border-slate-100 pb-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllMembers}
                    className="text-[#0188C7] hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllMembers}
                    className="text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Reset (All)
                  </button>
                </div>

                {/* Member Checkbox List */}
                <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                  {filteredAvailableMembers.length === 0 ? (
                    <div className="text-center py-3 text-xs text-slate-400">No members found</div>
                  ) : (
                    filteredAvailableMembers.map((member) => {
                      const isChecked = selectedMemberIds.includes(member.id);
                      return (
                        <label
                          key={member.id}
                          className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer text-xs transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMember(member.id)}
                            className="w-3.5 h-3.5 text-[#0188C7] rounded border-slate-300 focus:ring-[#01A8F3]"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-slate-800 block truncate">{member.fullName}</span>
                            <span className="text-[10px] text-slate-400 block truncate">@{member.username}</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMemberDropdownOpen(false)}
                  className="w-full text-[11px] py-1 cursor-pointer font-bold"
                >
                  Done
                </Button>
              </div>
            )}
          </div>

          {/* C. Date Range Presets & Inputs */}
          <div className="space-y-1.5 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Date Range</span>
              </label>

              {/* Presets */}
              <div className="flex items-center gap-1">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      applyDatePreset(p.id);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      datePreset === p.id
                        ? 'bg-[#E8F7FE] text-[#0188C7] border border-[#B9E7FC]'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setDatePreset('CUSTOM');
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs font-semibold px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/40"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setDatePreset('CUSTOM');
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs font-semibold px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/40"
                />
              </div>
            </div>

            {dateError && (
              <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>{dateError}</span>
              </p>
            )}
          </div>
        </div>

        {/* D. Status Filters */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Order Statuses:</span>
              <span className="text-[11px] text-slate-500">
                (Matched by each status&apos;s verified event timestamp)
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <button
                type="button"
                onClick={handleSelectAllStatuses}
                className="text-[#0188C7] hover:underline cursor-pointer"
              >
                Select All
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {REPORT_STATUSES.map((status) => {
              const isSelected = selectedStatuses.includes(status.key);
              return (
                <button
                  key={status.key}
                  type="button"
                  onClick={() => handleToggleStatus(status.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                      isSelected
                        ? 'bg-[#01A8F3] border-transparent text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>{status.label}</span>
                  <span className="text-[10px] font-normal opacity-75">({status.description.split('by ')[1]})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* E. Delivery Method Filter */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              <span>Delivery Method:</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              (Filter by courier logistics or cash on hand)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'ALL', label: 'All Delivery Methods' },
              { key: 'CASH_ON_HAND', label: 'Cash on Hand', icon: Banknote },
              { key: 'POST', label: 'Post' },
              { key: 'ROYAL_COURIER', label: 'Royal Courier' },
            ].map((dm) => {
              const isSelected = selectedDeliveryMethod === dm.key;
              const Icon = dm.icon;
              return (
                <button
                  key={dm.key}
                  type="button"
                  onClick={() => {
                    setSelectedDeliveryMethod(dm.key);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? dm.key === 'CASH_ON_HAND'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                        : 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{dm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions Bar: Generate Report */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Click <strong className="text-slate-800">Generate Report</strong> to retrieve matching orders from the database.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => {
                setCurrentPage(1);
                fetchReport();
              }}
              disabled={loadingReport || !selectedTeamId}
              className="flex items-center gap-2 text-xs font-bold bg-[#0188C7] hover:bg-[#0170a4] text-white px-5 py-2.5 rounded-xl shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin' : ''}`} />
              <span>Generate Report</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Summary & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Orders */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Matching Orders</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{totalMatchingOrders.toLocaleString()}</div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Across selected criteria</p>
        </div>

        {/* Delivered Card */}
        <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-950">
              {(summaryByStatus['DELIVERED']?.count || 0).toLocaleString()}
            </span>
            <span className="text-xs font-extrabold text-emerald-700">
              {formatCurrency(summaryByStatus['DELIVERED']?.totalAmount || 0)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium">
            COD: {formatCurrency(summaryByStatus['DELIVERED']?.codAmount || 0)}
          </p>
        </div>

        {/* Dispatched Card */}
        <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-xs font-bold uppercase tracking-wider">Dispatched</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-950">
              {(summaryByStatus['DISPATCHED']?.count || 0).toLocaleString()}
            </span>
            <span className="text-xs font-extrabold text-blue-700">
              {formatCurrency(summaryByStatus['DISPATCHED']?.totalAmount || 0)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-blue-700 font-medium">Filtered by dispatch event</p>
        </div>

        {/* Prepared Card */}
        <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold uppercase tracking-wider">Prepared</span>
            <Box className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950">
              {(summaryByStatus['PREPARED']?.count || 0).toLocaleString()}
            </span>
            <span className="text-xs font-extrabold text-amber-700">
              {formatCurrency(summaryByStatus['PREPARED']?.totalAmount || 0)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700 font-medium">Filtered by preparation event</p>
        </div>

        {/* Rejected Card */}
        <div className="p-4 bg-rose-50/60 border border-rose-200/80 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-950">
              {(summaryByStatus['REJECTED']?.count || 0).toLocaleString()}
            </span>
            <span className="text-xs font-extrabold text-rose-700">
              {formatCurrency(summaryByStatus['REJECTED']?.totalAmount || 0)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-rose-700 font-medium">Filtered by rejection timestamp</p>
        </div>
      </div>

      {/* 4. Active Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Applied Filters:</span>
        <Badge variant="outline" className="font-bold">
          Team: {activeTeam?.name || 'Selected Team'}
        </Badge>
        <Badge variant="outline">
          Members:{' '}
          {selectedMemberIds.length === 0
            ? 'All Members'
            : `${selectedMemberIds.length} Selected`}
        </Badge>
        <Badge variant="outline">
          Dates: {startDate || 'Start'} to {endDate || 'End'}
        </Badge>
        <Badge variant="outline">
          Statuses: {selectedStatuses.join(', ')}
        </Badge>
        {selectedDeliveryMethod !== 'ALL' && (
          <Badge variant="warning" className="font-bold flex items-center gap-1">
            <Truck className="w-3 h-3" />
            Method: {selectedDeliveryMethod === 'CASH_ON_HAND' ? 'Cash on Hand' : selectedDeliveryMethod}
          </Badge>
        )}
      </div>

      {/* 5. Orders Table & Search Header */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order number, item, member..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/40"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-600">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#01A8F3]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Loading / Error / Empty / Table */}
        {loadingReport ? (
          <div className="p-8">
            <LoadingState rows={8} />
          </div>
        ) : fetchError ? (
          <div className="p-12 text-center text-red-600 space-y-2">
            <AlertTriangle className="w-8 h-8 mx-auto" />
            <h3 className="font-bold">Failed to load report</h3>
            <p className="text-xs text-slate-600">{fetchError}</p>
            <Button size="sm" onClick={fetchReport} className="mt-3 cursor-pointer">
              Retry
            </Button>
          </div>
        ) : reportItems.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No Matching Orders Found"
              description="No orders match the selected team, team members, status event timestamps, and date range. Try broadening your filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">Team Name</th>
                  <th className="py-3 px-3.5">Team Member</th>
                  <th className="py-3 px-3.5">Username</th>
                  <th className="py-3 px-3.5">Order Number</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Delivery Method</th>
                  <th className="py-3 px-3.5 text-right">Total Amount</th>
                  <th className="py-3 px-3.5 text-right">COD Amount</th>
                  <th className="py-3 px-3.5">Created Date</th>
                  <th className="py-3 px-3.5">Delivered Date</th>
                  <th className="py-3 px-3.5">Rejected Date</th>
                  <th className="py-3 px-3.5">Items Description</th>
                  <th className="py-3 px-3.5">Selected Package</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {reportItems.map((item, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                  const statusConf = REPORT_STATUSES.find((s) => s.key === item.status);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px]">{rowNumber}</td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{item.teamName}</td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-800">{item.teamMemberName || '-'}</td>
                      <td className="py-2.5 px-3.5 text-slate-500 font-mono text-[11px]">
                        {item.username ? `@${item.username}` : '-'}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-[#0188C7]">{item.orderNumber}</td>
                      <td className="py-2.5 px-3.5">
                        <Badge variant={statusConf?.badgeVariant || 'default'}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3.5">
                        {item.deliveryMethod === 'CASH_ON_HAND' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                            <Banknote className="w-3 h-3 text-amber-600" />
                            Cash on Hand
                          </span>
                        ) : item.deliveryMethod === 'ROYAL_COURIER' ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px]">
                            Royal Courier
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {item.deliveryMethod || '-'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(item.totalAmount)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-semibold text-slate-700 font-mono">
                        {formatCurrency(item.codAmount)}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 font-mono text-[11px]">
                        {item.createdAt ? format(new Date(item.createdAt), 'yyyy-MM-dd HH:mm') : '-'}
                      </td>
                      <td className="py-2.5 px-3.5 text-emerald-700 font-mono text-[11px] font-semibold">
                        {item.deliveredAt ? format(new Date(item.deliveredAt), 'yyyy-MM-dd HH:mm') : '-'}
                      </td>
                      <td className="py-2.5 px-3.5 text-rose-700 font-mono text-[11px] font-semibold">
                        {item.rejectedAt ? format(new Date(item.rejectedAt), 'yyyy-MM-dd HH:mm') : '-'}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 max-w-xs truncate" title={item.itemsDescription || ''}>
                        {item.itemsDescription || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">
                        {item.selectedPackage || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pageInfo && pageInfo.totalPages > 1 && (
          <div className="p-3.5 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing{' '}
              <span className="font-bold text-slate-900">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-bold text-slate-900">
                {Math.min(currentPage * pageSize, pageInfo?.total ?? totalMatchingOrders)}
              </span>{' '}
              of <span className="font-bold text-slate-900">{pageInfo?.total ?? totalMatchingOrders}</span> orders
            </div>

            <div className="flex items-center gap-1 self-center sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || loadingReport}
                className="px-2 py-1 cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loadingReport}
                className="px-2 py-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              <span className="px-3 py-1 font-bold text-slate-800">
                Page {currentPage} of {pageInfo?.totalPages ?? 1}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pageInfo?.totalPages ?? 1, p + 1))}
                disabled={currentPage === (pageInfo?.totalPages ?? 1) || loadingReport}
                className="px-2 py-1 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(pageInfo?.totalPages ?? 1)}
                disabled={currentPage === (pageInfo?.totalPages ?? 1) || loadingReport}
                className="px-2 py-1 cursor-pointer"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
