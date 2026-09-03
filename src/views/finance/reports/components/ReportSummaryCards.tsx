import React from 'react';
import { ReportKPI, ActiveFilters } from '../types';
import { StatCard } from '../../../../components/shared/StatCard';
import { formatCurrency } from '../../../../utils/currency';

interface ReportSummaryCardsProps {
  kpis: ReportKPI[];
  data: any;
  filters: ActiveFilters;
}

export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({
  kpis,
  data,
  filters,
}) => {
  if (!kpis || kpis.length === 0) return null;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(kpis.length, 4)} gap-4`}>
      {kpis.map((kpi) => {
        const rawValue = kpi.getValue(data, filters);
        let formattedValue: string = '';

        if (kpi.format === 'currency') {
          formattedValue = formatCurrency(Number(rawValue));
        } else if (kpi.format === 'percentage') {
          formattedValue = `${rawValue}%`;
        } else if (kpi.format === 'number') {
          formattedValue = Number(rawValue).toLocaleString();
        } else {
          formattedValue = String(rawValue);
        }

        const subtitleText = kpi.subtitle ? kpi.subtitle(data, filters) : undefined;
        const IconComponent = kpi.icon;

        return (
          <StatCard
            key={kpi.id}
            title={kpi.label}
            value={formattedValue}
            subtitle={subtitleText}
            accentColor={kpi.accentColor || 'blue'}
            icon={IconComponent ? <IconComponent className="w-5 h-5 text-blue-600" /> : undefined}
          />
        );
      })}
    </div>
  );
};
