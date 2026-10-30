import React, { useState, useMemo } from 'react';
import { FINANCE_REPORTS, SALES_REPORTS } from '../../finance/reports/reportDefinitions';
import { ReportCard } from '../../finance/reports/components/ReportCard';
import { SearchInput } from '../../../components/shared/SearchInput';
import { EmptyState } from '../../../components/shared/EmptyState';
import { 
  DollarSign, 
  TrendingUp, 
  ShieldCheck,
} from 'lucide-react';

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
    <div className="space-y-5">
      {/* Header Row: Title & Subtitle on Left, Search Bar on Right */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            
            <span>Admin Financial &amp; Sales Intelligence</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consolidated executive statements, audited finance reports, sales growth trends, and regional logistics.
          </p>
        </div>

        {/* Polished Search Bar */}
        <div className="w-full md:w-72 shrink-0">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search all reports..."
          />
        </div>
      </div>

      {/* Category Tabs: Refined Executive Segmented Control */}
      <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 shadow-2xs">
        {/* Finance Category Tab */}
        <button
          type="button"
          onClick={() => onCategoryChange('FINANCE')}
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeCategory === 'FINANCE'
              ? 'bg-white text-slate-900 shadow-xs border border-[#01A8F3]/40 ring-1 ring-[#01A8F3]/20'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              activeCategory === 'FINANCE'
                ? 'bg-[#E8F7FE] text-[#0188C7] border border-[#B9E7FC]/80'
                : 'bg-slate-200/60 text-slate-400'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
          </div>
          <span className="tracking-tight">1. Finance Reports</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
              activeCategory === 'FINANCE'
                ? 'bg-[#E8F7FE] text-[#0188C7] border border-[#B9E7FC]/70'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
            {FINANCE_REPORTS.length} Statements
          </span>
        </button>

        {/* Sales Category Tab */}
        <button
          type="button"
          onClick={() => onCategoryChange('SALES')}
          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeCategory === 'SALES'
              ? 'bg-white text-slate-900 shadow-xs border border-[#80BD2B]/50 ring-1 ring-[#80BD2B]/25'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 border border-transparent'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              activeCategory === 'SALES'
                ? 'bg-[#F2F9E9] text-[#547E1B] border border-[#D4ECC6]/80'
                : 'bg-slate-200/60 text-slate-400'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <span className="tracking-tight">2. Sales Intelligence</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
              activeCategory === 'SALES'
                ? 'bg-[#F2F9E9] text-[#547E1B] border border-[#D4ECC6]/70'
                : 'bg-slate-200/70 text-slate-500'
            }`}
          >
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() => onSelectReport(report.id)}
            />
          ))}
        </div>
      )}

      {/* Executive Governance Notice with Brand Theme Touches */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#E8F7FE] via-white to-[#F2F9E9] border border-[#B9E7FC] flex items-start gap-3 text-xs text-[#014D70] shadow-2xs">
        <div className="w-7 h-7 rounded-lg bg-[#01A8F3] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <h5 className="font-extrabold text-slate-900">Executive Administrative Governance:</h5>
          <p className="text-slate-600 leading-relaxed">
            {activeCategory === 'FINANCE'
              ? 'Financial intelligence statements are reconciled against active double-entry voucher records, realized customer order deliveries, inventory cost valuation batches, and petty cash float vaults.'
              : 'Sales intelligence reports track realized dispatch orders, delivery fulfillment rates, regional distribution hubs, and team gross margin contributions.'}
          </p>
        </div>
      </div>
    </div>
  );
};
