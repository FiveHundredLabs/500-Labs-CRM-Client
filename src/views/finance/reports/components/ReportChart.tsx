import React from 'react';
import { ReportChartConfig, ActiveFilters } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatCurrency } from '../../../../utils/currency';

interface ReportChartProps {
  config: ReportChartConfig;
  data: any;
  filters: ActiveFilters;
  reportName: string;
}

const DONUT_COLORS = [
  '#01A8F3', // Primary Blue
  '#80BD2B', // Primary Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#64748B', // Slate
  '#E11D48', // Rose
];

export const ReportChart: React.FC<ReportChartProps> = ({
  config,
  data,
  filters,
  reportName,
}) => {
  const chartData = config.getChartData(data, filters);

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="border border-slate-200/90 shadow-2xs">
        <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>{reportName} — Financial Visualization</span>
          </CardTitle>
          <span className="text-[11px] font-medium text-slate-400">
            Filter-responsive visualization
          </span>
        </CardHeader>
        <CardContent className="p-8 text-center flex flex-col items-center justify-center">
          <BarChart3 className="w-9 h-9 text-slate-300 stroke-1 mb-2" />
          <p className="text-sm font-semibold text-slate-600">No Realized Sales Data in Selected Period</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Zero delivered consignments match the active team or date filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatTooltipValue = (value: any) => {
    if (typeof value === 'number') {
      return [formatCurrency(value), ''];
    }
    return [value, ''];
  };

  const renderChart = () => {
    switch (config.type) {
      case 'AREA':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {config.series.map((s) => (
                  <linearGradient key={s.key} id={`grad_${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `Rs. ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
              {config.series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#grad_${s.key})`}
                  dot={{ r: 4, stroke: s.color, strokeWidth: 2, fill: '#ffffff' }}
                  activeDot={{ r: 6, stroke: s.color, strokeWidth: 2 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'BAR':
      case 'GROUPED_BAR':
        return (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey={config.xAxisKey}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#E2E8F0' }}
                interval={0}
                tickFormatter={(v) => typeof v === 'string' && v.length > 22 ? `${v.slice(0, 20)}…` : String(v || '')}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `Rs. ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
              {config.series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.name}
                  fill={s.color}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'COMPOSED':
        return (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `Rs. ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={formatTooltipValue} />
              <Legend />
              {config.series.map((s) => {
                if (s.type === 'line') {
                  return (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.name}
                      stroke={s.color}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  );
                }
                return (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.name}
                    fill={s.color}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'DONUT':
        return (
          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-[320px]">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatTooltipValue} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border border-slate-200/90 shadow-2xs">
      <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#01A8F3]" />
          <span>{reportName} — Financial Visualization</span>
        </CardTitle>
        <span className="text-[11px] font-medium text-slate-400">
          Filter-responsive visualization
        </span>
      </CardHeader>
      <CardContent className="p-4 pt-4">{renderChart()}</CardContent>
    </Card>
  );
};
