import React, { useState, useMemo } from 'react';
import { FINANCE_REPORTS } from '../reportDefinitions';
import { ReportCard } from './ReportCard';
import { PageHeader } from '../../../../components/shared/PageHeader';
import { SearchInput } from '../../../../components/shared/SearchInput';
import { EmptyState } from '../../../../components/shared/EmptyState';
import { ShieldCheck } from 'lucide-react';

interface ReportsLandingPageProps {
  onSelectReport: (reportId: string) => void;
}

export const ReportsLandingPage: React.FC<ReportsLandingPageProps> = ({ onSelectReport }) => {
  const [search, setSearch] = useState('');

  const filteredReports = useMemo(() => {
    return FINANCE_REPORTS.filter((r) => {
      const matchesSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.id.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Page Header with Right-aligned Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Financial Reporting & Intelligence Center"
          description="Select an audited financial statement, expenditure breakdown, or cash governance ledger to analyze, filter, and export."
        />

        <div className="w-full sm:w-72 shrink-0">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search reports..."
          />
        </div>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <EmptyState
          title="No finance reports found"
          description="No financial reports match your search query. Try adjusting your search keyword."
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

      {/* Financial Scope Governance Notice */}
      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold">Financial Accounting Governance:</h5>
          <p className="text-blue-800 leading-relaxed mt-0.5">
            This module contains solely verified finance-specific reports (Income, Expenditures, COGS allocations, Treasury Cash Flows, and Petty Cash Balances). Operational inventory tracking and sales specialist quotas are governed under their respective departmental modules.
          </p>
        </div>
      </div>
    </div>
  );
};
