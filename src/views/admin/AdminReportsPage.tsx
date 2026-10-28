import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getReportById } from '../finance/reports/reportDefinitions';
import { ReportDetailPage } from '../finance/reports/components/ReportDetailPage';
import { AdminReportsLandingPage, AdminReportCategory } from './reports/AdminReportsLandingPage';
import { SupervisorReportsPage } from '../supervisor/SupervisorReportsPage';

export const AdminReportsPage: React.FC = () => {
  const { reportId: paramReportId } = useParams<{ reportId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Category: 'FINANCE' or 'SALES' (default to 'FINANCE')
  const paramCategory = (searchParams.get('category')?.toUpperCase() as AdminReportCategory) || 'FINANCE';
  const initialCategory: AdminReportCategory = paramCategory === 'SALES' ? 'SALES' : 'FINANCE';

  const [activeCategory, setActiveCategory] = useState<AdminReportCategory>(initialCategory);
  const [activeReportId, setActiveReportId] = useState<string | null>(paramReportId || searchParams.get('report') || null);

  useEffect(() => {
    const rId = paramReportId || searchParams.get('report') || null;
    const cat = (searchParams.get('category')?.toUpperCase() as AdminReportCategory) || null;
    if (rId) {
      setActiveReportId(rId);
      // Auto-detect category if the report is known
      const rep = getReportById(rId);
      if (rep && rep.groupCategory) {
        setActiveCategory(rep.groupCategory);
      }
    } else {
      setActiveReportId(null);
    }
    if (cat === 'SALES' || cat === 'FINANCE') {
      setActiveCategory(cat);
    }
  }, [paramReportId, searchParams]);

  const handleCategoryChange = (category: AdminReportCategory) => {
    setActiveCategory(category);
    setSearchParams({ category: category.toLowerCase() });
  };

  const handleSelectReport = (reportId: string) => {
    setActiveReportId(reportId);
    navigate(`/admin/reports/${reportId}?category=${activeCategory.toLowerCase()}`);
  };

  const handleBackToLanding = () => {
    setActiveReportId(null);
    navigate(`/admin/reports?category=${activeCategory.toLowerCase()}`);
  };

  const activeReport = activeReportId ? getReportById(activeReportId) : null;

  if (activeReportId === 'team-member-orders' || activeReport?.id === 'team-member-orders') {
    return (
      <SupervisorReportsPage onBack={handleBackToLanding} />
    );
  }

  if (activeReport) {
    return (
      <ReportDetailPage
        report={activeReport}
        onBack={handleBackToLanding}
      />
    );
  }

  return (
    <AdminReportsLandingPage
      activeCategory={activeCategory}
      onCategoryChange={handleCategoryChange}
      onSelectReport={handleSelectReport}
    />
  );
};

