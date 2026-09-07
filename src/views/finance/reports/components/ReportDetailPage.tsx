import React, { useState, useEffect, useMemo } from 'react';
import { ReportDefinition, ActiveFilters } from '../types';
import { MOCK_FINANCE_DATABASE, TeamItem } from '../mockData';
import { financeRepository, teamRepository } from '../../../../repositories';
import { ReportFilters } from './ReportFilters';
import { ReportSummaryCards } from './ReportSummaryCards';
import { ReportChart } from './ReportChart';
import { ReportTable } from './ReportTable';
import { ExportActions } from './ExportActions';
import { 
  ArrowLeft, 
} from 'lucide-react';
import { format } from 'date-fns';

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
          if (active) {
            setLiveReportData(null);
          }
        } finally {
          if (active) {
            setIsLoadingLive(false);
          }
        }
      } else if (report.id === 'income-summary') {
        setIsLoadingLive(true);
        try {
          const orders = await financeRepository.getRealizedSalesReport(
            filters.dateRange.startDate || undefined,
            filters.dateRange.endDate || undefined,
            filters.teamId !== 'ALL' ? filters.teamId : undefined
          );
          if (active) {
            setLiveReportData(orders);
          }
        } catch (err) {
          console.error('Failed to fetch live realized sales report from backend:', err);
          if (active) {
            setLiveReportData(null);
          }
        } finally {
          if (active) {
            setIsLoadingLive(false);
          }
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
    if ((report.id === 'product-cost' || report.id === 'income-summary') && liveReportData !== null) {
      return report.getData(liveReportData, filters);
    }
    return report.getData(MOCK_FINANCE_DATABASE, filters);
  }, [report, filters, liveReportData]);

  // Extract tabular array rows (some reports like P&L or Income-vs-Expense return an object with rows array)
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
          <span>Back to Finance Reports Directory</span>
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
              {(report.id === 'product-cost' || report.id === 'income-summary') && liveReportData !== null && (
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
