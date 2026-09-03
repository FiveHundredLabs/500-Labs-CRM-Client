import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FINANCE_REPORTS, getReportById } from './reportDefinitions';
import { ReportsLandingPage } from './components/ReportsLandingPage';
import { ReportDetailPage } from './components/ReportDetailPage';

export const FinanceReportsPage: React.FC = () => {
  const { reportId: paramReportId } = useParams<{ reportId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Support both param (e.g. /finance/reports/expense-summary) and query string (?report=expense-summary) or internal state
  const queryReportId = searchParams.get('report');
  const initialReportId = paramReportId || queryReportId || null;

  const [activeReportId, setActiveReportId] = useState<string | null>(initialReportId);

  useEffect(() => {
    const rId = paramReportId || searchParams.get('report') || null;
    setActiveReportId(rId);
  }, [paramReportId, searchParams]);

  const handleSelectReport = (reportId: string) => {
    setActiveReportId(reportId);
    setSearchParams({ report: reportId });
  };

  const handleBackToLanding = () => {
    setActiveReportId(null);
    setSearchParams({});
  };

  const activeReport = activeReportId ? getReportById(activeReportId) : null;

  if (activeReport) {
    return (
      <ReportDetailPage
        report={activeReport}
        onBack={handleBackToLanding}
      />
    );
  }

  return (
    <ReportsLandingPage
      onSelectReport={handleSelectReport}
    />
  );
};
