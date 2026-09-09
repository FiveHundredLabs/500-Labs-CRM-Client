import React, { useState, useEffect, useMemo } from 'react';
import { ReportDefinition, ActiveFilters } from '../types';
import { MOCK_FINANCE_DATABASE, TeamItem } from '../mockData';
import { financeRepository, teamRepository, pettyCashRepository } from '../../../../repositories';
import { ReportFilters } from './ReportFilters';
import { ReportSummaryCards } from './ReportSummaryCards';
import { ReportChart } from './ReportChart';
import { ReportTable } from './ReportTable';
import { ExportActions } from './ExportActions';
import { 
  ArrowLeft, 
} from 'lucide-react';

// Reports that fetch live data from the backend
const LIVE_DATA_REPORTS = [
  'product-cost',
  'income-summary',
  'expense-summary',
  'operating-expense',
  'cash-flow',
  'petty-cash',
  'daily-sales',
  'weekly-sales',
  'monthly-sales',
  'city-delivery',
  'consignment-sales',
  'team-member-sales',
  'contact-batch-report',
];

/** Normalise a date value from the backend to a plain YYYY-MM-DD string */
const toDateStr = (d: string | Date | null | undefined): string => {
  if (!d) return '';
  const s = typeof d === 'string' ? d : (d as Date).toISOString();
  return s.split('T')[0];
};

interface ReportDetailPageProps {
  report: ReportDefinition;
  onBack: () => void;
}

export const ReportDetailPage: React.FC<ReportDetailPageProps> = ({
  report,
  onBack,
}) => {
  // Report-specific active filters state
  const [filters, setFilters] = useState<ActiveFilters>({
    dateRange: {
      preset: 'ALL',
      startDate: '',
      endDate: '',
    },
    teamId: 'ALL',
    category: 'ALL',
    paymentMethod: 'ALL',
    search: '',
  });

  // Live backend dataset state
  const [liveReportData, setLiveReportData] = useState<any>(null);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [loadedTeams, setLoadedTeams] = useState<TeamItem[]>([]);

  useEffect(() => {
    let active = true;
    teamRepository.getAll()
      .then((teams) => {
        if (active && teams && teams.length > 0) {
          setLoadedTeams(teams.map((t) => ({ id: t.id, name: t.name })));
        }
      })
      .catch((err) => {
        console.warn('Could not load teams from API:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Compute combined actual teams from API and any live records
  const availableTeams = useMemo(() => {
    const map = new Map<string, string>();
    loadedTeams.forEach((t) => map.set(t.id, t.name));
    if (Array.isArray(liveReportData)) {
      liveReportData.forEach((p: any) => {
        if (p.teamId && p.teamName) {
          map.set(p.teamId, p.teamName);
        }
      });
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [loadedTeams, liveReportData]);

  useEffect(() => {
    let active = true;

    const fetchLiveData = async () => {
      // ── Product Cost / Inventory Report ───────────────────────────────────
      if (report.id === 'product-cost') {
        setIsLoadingLive(true);
        try {
          const items = await financeRepository.getInventoryReport(
            filters.teamId !== 'ALL' ? filters.teamId : undefined,
            filters.dateRange.startDate || undefined,
            filters.dateRange.endDate || undefined
          );
          if (active) {
            setLiveReportData(items);
          }
        } catch (err) {
          console.error('Failed to fetch live inventory report from backend:', err);
          if (active) setLiveReportData(null);
        } finally {
          if (active) setIsLoadingLive(false);
        }

      // ── Income & Realized Sales Report ─────────────────────────────────────
      } else if (report.id === 'income-summary') {
        setIsLoadingLive(true);
        try {
          const orders = await financeRepository.getRealizedSalesReport(
            filters.dateRange.startDate || undefined,
            filters.dateRange.endDate || undefined,
            filters.teamId !== 'ALL' ? filters.teamId : undefined
          );
          if (active) {
            setLiveReportData(orders || []);
          }
        } catch (err) {
          console.error('Failed to fetch live realized sales report from backend:', err);
          if (active) setLiveReportData([]);
        } finally {
          if (active) setIsLoadingLive(false);
        }

      // ── Expense Summary & Operating Expense Reports ─────────────────────────
      } else if (report.id === 'expense-summary' || report.id === 'operating-expense') {
        setIsLoadingLive(true);
        try {
          const data = await financeRepository.getExpenseReport(
            filters.dateRange.startDate || undefined,
            filters.dateRange.endDate || undefined
          );
          if (active) {
            // Normalise to ExpenseRecord shape used by reportDefinitions.getData()
            const expenses = (data.expenses || []).map((e: any) => ({
              id: e.id,
              categoryId: '',
              categoryName: e.category || 'Uncategorized',
              amount: Number(e.amount),
              expenseDate: toDateStr(e.date),
              remarks: e.remarks || '',
              paymentMethod: (e.paymentMethod as any) || 'CASH',
              notes: e.notes || null,
              pettyCashRef: null,
              createdById: '',
              createdByName: e.createdByName || '',
              createdAt: e.createdAt || '',
            }));
            // Pass as a db-like object so getData() can access db.expenses
            setLiveReportData({ expenses });
          }
        } catch (err) {
          console.error('Failed to fetch expense report from backend:', err);
          if (active) setLiveReportData(null);
        } finally {
          if (active) setIsLoadingLive(false);
        }

      // ── Cash Flow Statement ─────────────────────────────────────────────────
      } else if (report.id === 'cash-flow') {
        setIsLoadingLive(true);
        try {
          const [cashFlowData, walletData] = await Promise.all([
            financeRepository.getCashFlow(
              filters.dateRange.startDate || undefined,
              filters.dateRange.endDate || undefined
            ),
            pettyCashRepository.getWallet().catch(() => null),
          ]);
          if (active) {
            // Transform to the db-like structure expected by cash-flow's getData()
            const deliveredOrders = (cashFlowData.inflows?.details || []).map(
              (d: any, i: number) => ({
                id: `inflow_${i}`,
                orderNumber: d.description || `Order ${i + 1}`,
                deliveredAt: toDateStr(d.date),
                totalAmount: Number(d.amount),
                customerName: '',
                city: '',
                cogs: 0,
                grossProfit: 0,
                status: 'DELIVERED' as const,
                itemCount: 0,
                teamId: undefined,
                teamName: '',
                createdAt: typeof d.date === 'string' ? d.date : '',
              })
            );
            const expenses = (cashFlowData.outflows?.expenseDetails || []).map(
              (d: any, i: number) => ({
                id: `outflow_${i}`,
                categoryId: '',
                // Parse "CategoryName: remarks" description format
                categoryName: typeof d.description === 'string' && d.description.includes(':')
                  ? d.description.split(':')[0].trim()
                  : (d.description || 'Expense'),
                amount: Number(d.amount),
                expenseDate: toDateStr(d.date),
                remarks: d.description || '',
                paymentMethod: 'CASH' as const,
                notes: null,
                pettyCashRef: null,
                createdById: '',
                createdByName: '',
                createdAt: typeof d.date === 'string' ? d.date : '',
              })
            );
            setLiveReportData({
              deliveredOrders,
              expenses,
              walletBalance: walletData ? Number(walletData.remainingBalance) : 0,
            });
          }
        } catch (err) {
          console.error('Failed to fetch cash flow report from backend:', err);
          if (active) setLiveReportData(null);
        } finally {
          if (active) setIsLoadingLive(false);
        }

      // ── Petty Cash Float & Allocation Report ────────────────────────────────
      } else if (report.id === 'petty-cash') {
        setIsLoadingLive(true);
        try {
          const [transactions, walletData] = await Promise.all([
            pettyCashRepository.getTransactions(),
            pettyCashRepository.getWallet().catch(() => null),
          ]);
          if (active) {
            const mapped = (transactions || []).map((t: any) => ({
              id: t.id,
              transactionType: t.transactionType,
              allocationId: t.allocationId || null,
              // allocationCode may come nested in the allocation relation
              allocationCode: t.allocation?.allocationCode || t.allocationCode || null,
              reason: t.reason || '',
              category: t.category || 'Uncategorized',
              amount: Number(t.amount),
              date: toDateStr(t.date),
              description: t.description || '',
              userId: t.userId || '',
              userName: t.userName || '',
              remainingBalance: Number(t.remainingBalance),
            }));
            setLiveReportData({
              pettyCashTransactions: mapped,
              walletBalance: walletData ? Number(walletData.remainingBalance) : 0,
            });
          }
        } catch (err) {
          console.error('Failed to fetch petty cash report from backend:', err);
          if (active) setLiveReportData(null);
        } finally {
          if (active) setIsLoadingLive(false);
        }

      // ── Daily, Weekly & Monthly Sales Reports ──────────────────────────────
      } else if (report.id === 'daily-sales' || report.id === 'weekly-sales' || report.id === 'monthly-sales') {
        setIsLoadingLive(true);
        try {
          const period = report.id === 'daily-sales' ? 'daily' : report.id === 'weekly-sales' ? 'weekly' : 'monthly';
          const salesData = await financeRepository.getSalesReport(
            period,
            filters.dateRange.startDate || undefined,
            filters.dateRange.endDate || undefined
          );
          if (active) {
            setLiveReportData(salesData || { periodData: [] });
          }
        } catch (err) {
          console.error(`Failed to fetch ${report.id} from backend:`, err);
          if (active) setLiveReportData({ periodData: [] });
        } finally {
          if (active) setIsLoadingLive(false);
        }

      // ── City Delivery Report ───────────────────────────────────────────────
      } else if (report.id === 'city-delivery') {
        setIsLoadingLive(true);
        try {
          const deliveryData = await financeRepository.getCityDeliveryReport(
            filters.dateRange.startDate || undefined,
            filters.dateRange.endDate || undefined
          );
          if (active) {
            setLiveReportData(deliveryData || { cityData: [] });
          }
        } catch (err) {
          console.error('Failed to fetch city delivery report from backend:', err);
          if (active) setLiveReportData({ cityData: [] });
        } finally {
          if (active) setIsLoadingLive(false);
        }

      // ── Consignment Realized Sales Ledger ──────────────────────────────────
      } else if (report.id === 'consignment-sales') {
        setIsLoadingLive(true);
        try {
          const orders = await financeRepository.getRealizedSalesReport(
            filters.dateRange.startDate || undefined,
            filters.dateRange.endDate || undefined,
            filters.teamId !== 'ALL' ? filters.teamId : undefined
          );
          if (active) {
            setLiveReportData(orders || []);
          }
        } catch (err) {
          console.error('Failed to fetch consignment sales report from backend:', err);
          if (active) setLiveReportData([]);
        } finally {
          if (active) setIsLoadingLive(false);
        }

      // ── Team Member Wise Sales Report ──────────────────────────────────────
      } else if (report.id === 'team-member-sales') {
        setIsLoadingLive(true);
        try {
          const res = await financeRepository.getTeamMemberSalesReport(
            filters.dateRange.startDate || undefined,
            filters.dateRange.endDate || undefined,
            filters.teamId !== 'ALL' ? filters.teamId : undefined
          );
          if (active) {
            setLiveReportData(res || { members: [] });
          }
        } catch (err) {
          console.error('Failed to fetch team member sales report from backend:', err);
          if (active) setLiveReportData({ members: [] });
        } finally {
          if (active) setIsLoadingLive(false);
        }

      // ── Contact Batch-Wise Performance Report ──────────────────────────────
      } else if (report.id === 'contact-batch-report') {
        setIsLoadingLive(true);
        try {
          const res = await financeRepository.getContactBatchReport(
            filters.dateRange.startDate || undefined,
            filters.dateRange.endDate || undefined,
            filters.teamId !== 'ALL' ? filters.teamId : undefined
          );
          if (active) {
            setLiveReportData(res || { batches: [] });
          }
        } catch (err) {
          console.error('Failed to fetch contact batch report from backend:', err);
          if (active) setLiveReportData({ batches: [] });
        } finally {
          if (active) setIsLoadingLive(false);
        }

      } else {
        setLiveReportData(null);
      }
    };

    fetchLiveData();

    return () => {
      active = false;
    };
  }, [report.id, filters.teamId, filters.dateRange.startDate, filters.dateRange.endDate, filters.dateRange.preset]);

  // Query raw filtered report dataset (prefer live backend data when available)
  const rawReportData = useMemo(() => {
    const isLiveReport = LIVE_DATA_REPORTS.includes(report.id);
    if (isLiveReport) {
      return liveReportData !== null ? report.getData(liveReportData, filters) : [];
    }
    return report.getData(MOCK_FINANCE_DATABASE, filters);
  }, [report, filters, liveReportData]);

  // Extract tabular array rows (some reports like cash-flow return an object with a rows array)
  const tabularData = useMemo(() => {
    const raw: any = rawReportData;
    if (Array.isArray(raw)) {
      return raw;
    }
    if (raw && Array.isArray(raw.rows)) {
      return raw.rows;
    }
    return [];
  }, [rawReportData]);

  const isLiveReport = LIVE_DATA_REPORTS.includes(report.id);
  const showLiveBadge = isLiveReport && liveReportData !== null;

  const IconComponent = report.icon;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Executive Header */}
      <div className="pb-3 border-b border-slate-200 space-y-2">
        {/* Back button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0188C7] transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Reports Directory</span>
        </button>

        {/* Title and Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E8F7FE] text-[#0188C7] border border-[#B9E7FC] flex items-center justify-center shrink-0">
            <IconComponent className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {report.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                {report.badgeText}
              </span>
              {showLiveBadge && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#F2F9E9] text-[#547E1B] border border-[#D4ECC6]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#80BD2B] animate-pulse" />
                  Live Database
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
              {report.description}
            </p>
          </div>
        </div>
      </div>

      {/* Report-Aware Compact Filter Toolbar with Right-aligned Export Actions */}
      <ReportFilters
        supportedFilters={report.supportedFilters}
        filters={filters}
        onChange={setFilters}
        teams={availableTeams.length > 0 ? availableTeams : undefined}
        rightActions={
          <ExportActions
            report={report}
            filters={filters}
            filteredData={tabularData}
            rawReportData={rawReportData}
          />
        }
      />

      {/* KPI Metrics Summary Section */}
      <ReportSummaryCards
        kpis={report.kpis}
        data={rawReportData}
        filters={filters}
      />

      {/* Meaningful Financial Visualization */}
      <ReportChart
        config={report.chartConfig}
        data={rawReportData}
        filters={filters}
        reportName={report.name}
      />

      {/* Detailed Financial Data Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span>Statement Data & Transaction Ledger</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              ({tabularData.length} records)
            </span>
          </h3>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Click column headers to sort • Interactive ledger
          </span>
        </div>

        <ReportTable
          columns={report.columns}
          data={tabularData}
          isLoading={isLoadingLive}
        />
      </div>
    </div>
  );
};
