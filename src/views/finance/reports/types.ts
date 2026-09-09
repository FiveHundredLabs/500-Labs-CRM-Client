import { LucideIcon } from 'lucide-react';

export type ReportCategoryId = 'ALL' | 'SUMMARY' | 'EXPENSE' | 'INCOME' | 'EXECUTIVE' | 'ASSETS' | 'FINANCE' | 'SALES';

export type SupportedFilterType = 'dateRange' | 'team' | 'category' | 'paymentMethod' | 'search';

export interface DateRangeFilter {
  preset: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM' | 'ALL';
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface ActiveFilters {
  dateRange: DateRangeFilter;
  teamId?: string; // 'ALL' or specific team
  category?: string; // 'ALL' or specific category
  paymentMethod?: string; // 'ALL' or 'CASH' | 'BANK_TRANSFER' | 'PETTY_CASH'
  search?: string;
}

export type ReportDataSet = any[] & Record<string, any>;

export interface ReportKPI {
  id: string;
  label: string;
  format: 'currency' | 'number' | 'percentage' | 'text';
  getValue: (data: ReportDataSet, filters: ActiveFilters, allData?: any) => string | number;
  subtitle?: (data: ReportDataSet, filters: ActiveFilters, allData?: any) => string;
  accentColor?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
  icon?: LucideIcon;
}

export interface ReportColumn {
  id: string;
  header: string;
  accessorKey?: string;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'date' | 'badge' | 'text' | 'number';
  cell?: (row: any) => React.ReactNode;
  width?: string;
}

export type ChartType = 'AREA' | 'BAR' | 'GROUPED_BAR' | 'COMPOSED' | 'DONUT';

export interface ChartSeriesConfig {
  key: string;
  name: string;
  color: string;
  type?: 'bar' | 'line' | 'area';
}

export interface ReportChartConfig {
  type: ChartType;
  xAxisKey: string;
  series: ChartSeriesConfig[];
  getChartData: (filteredData: ReportDataSet, filters: ActiveFilters) => any[];
}

export interface ReportPdfColumn {
  header: string;
  accessorKey: string;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'date' | 'badge' | 'text' | 'number';
  widthMm?: number;
}

export interface ReportPdfConfig {
  orientation?: 'portrait' | 'landscape';
  columns?: ReportPdfColumn[];
  summaryLines?: (data: any[], filters: ActiveFilters) => {
    label: string;
    value: string;
    isBold?: boolean;
    isHighlight?: boolean;
  }[];
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: ReportCategoryId;
  groupCategory?: 'FINANCE' | 'SALES';
  badgeText: string;
  badgeType?: 'default' | 'standard' | 'executive' | 'analytical';
  icon: LucideIcon;
  supportedFilters: SupportedFilterType[];
  kpis: ReportKPI[];
  chartConfig: ReportChartConfig;
  columns: ReportColumn[];
  getData: (allData: any, filters: ActiveFilters) => any;
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
  pdfConfig?: ReportPdfConfig;
}

