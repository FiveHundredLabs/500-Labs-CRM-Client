import React, { useState, useMemo } from 'react';
import { FINANCE_REPORTS, SALES_REPORTS } from '../../finance/reports/reportDefinitions';
import { ReportCard } from '../../finance/reports/components/ReportCard';
import { PageHeader } from '../../../components/shared/PageHeader';
import { SearchInput } from '../../../components/shared/SearchInput';
import { EmptyState } from '../../../components/shared/EmptyState';
import { DollarSign, TrendingUp, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export type AdminReportCategory = 'FINANCE' | 'SALES';

interface AdminReportsLandingPageProps {
  activeCategory: AdminReportCategory;
  onCategoryChange: (cat: AdminReportCategory) => void;
  onSelectReport: (reportId: string) => void;
}

export const AdminReportsLandingPage: React.FC<AdminReportsLandingPageProps> = ({
  activeCategory,
  onCategoryChange,
  onSelectReport,
}) => {
  const [search, setSearch] = useState('');

  // Select list of reports based on category
  const activeReportsList = useMemo(() => {
    return activeCategory === 'FINANCE' ? FINANCE_REPORTS : SALES_REPORTS;
  }, [activeCategory]);

  const filteredReports = useMemo(() => {
    return activeReportsList.filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.badgeText.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [activeReportsList, search]);

  return (
    <div className="space-y-6">
      {/* Top Header with Right Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Admin Financial & Sales Intelligence"
          description="Consolidated executive statements, audited finance reports, sales growth trends, and regional logistics."
        />

        <div className="w-full sm:w-72 shrink-0">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search all reports..."
          />
        </div>
      </div>

      {/* Primary Category Selector Tabs (Finance vs Sales) */}
      <div className="flex flex-wrap items-center gap-3 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-fit">
        {/* Finance Category Tab */}
        <button
          type="button"
          onClick={() => onCategoryChange('FINANCE')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'FINANCE'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
            activeCategory === 'FINANCE'
              ? 'bg-[#E8F7FE] text-[#0188C7]'
              : 'bg-slate-200/70 text-slate-600'
          }`}>
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <span className="tracking-tight">1. Finance Reports</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeCategory === 'FINANCE'
              ? 'bg-[#E8F7FE] text-[#0188C7] border border-[#B9E7FC]'
              : 'bg-slate-200 text-slate-600'
          }`}>
            {FINANCE_REPORTS.length} Statements
          </span>
        </button>

        {/* Sales Category Tab */}
        <button
          type="button"
          onClick={() => onCategoryChange('SALES')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'SALES'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
            activeCategory === 'SALES'
              ? 'bg-[#F2F9E9] text-[#547E1B]'
              : 'bg-slate-200/70 text-slate-600'
          }`}>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <span className="tracking-tight">2. Sales Intelligence</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeCategory === 'SALES'
              ? 'bg-[#F2F9E9] text-[#547E1B] border border-[#D4ECC6]'
              : 'bg-slate-200 text-slate-600'
          }`}>
            {SALES_REPORTS.length} Ledgers
          </span>
        </button>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <EmptyState
          title={`No ${activeCategory === 'FINANCE' ? 'finance' : 'sales'} reports found`}
          description="No reports match your current search query. Try adjusting your keywords or clearing the search."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() => onSelectReport(report.id)}
            />
          ))}
        </div>
      )}

      {/* Executive Governance Notice */}
      <div className="p-4 rounded-2xl bg-[#E8F7FE]/60 border border-[#B9E7FC] flex items-start gap-3 text-xs text-[#014D70]">
        <ShieldCheck className="w-5 h-5 text-[#01A8F3] shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold">Executive Administrative Governance:</h5>
          <p className="text-[#016DA0] leading-relaxed mt-0.5">
            {activeCategory === 'FINANCE'
              ? 'Financial intelligence statements are reconciled against active double-entry voucher records, realized customer order deliveries, inventory cost valuation batches, and petty cash float vaults.'
              : 'Sales intelligence reports track realized dispatch orders, delivery fulfillment rates, regional distribution hubs, and team gross margin contributions.'}
          </p>
        </div>
      </div>
    </div>
  );
};
