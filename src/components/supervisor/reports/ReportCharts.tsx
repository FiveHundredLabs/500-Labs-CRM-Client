import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/Card';
import {
  OrderStatusDistribution,
  MemberPerformanceChartPoint,
} from '../../../services/supervisorAnalyticsService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { PieChart, BarChart3, Users } from 'lucide-react';
import { formatCurrency } from '../../../utils/currency';

export interface ReportChartsProps {
  statusDistribution: OrderStatusDistribution[];
  memberPerformance: MemberPerformanceChartPoint[];
}

const STATUS_COLORS: Record<string, string> = {
  DELIVERED: '#10B981', // emerald
  DISPATCHED: '#F59E0B', // amber
  REJECTED: '#EF4444', // rose
  RETURNED: '#8B5CF6', // purple
  PREPARED: '#6366F1', // indigo
  DRAFT: '#94A3B8', // slate
};

export const ReportCharts: React.FC<ReportChartsProps> = ({ statusDistribution, memberPerformance }) => {
  const pieData = statusDistribution
    .filter((d) => d.count > 0)
    .map((d) => ({
      name: d.label,
      value: d.count,
      revenue: d.value,
      color: STATUS_COLORS[d.status] || '#94A3B8',
    }));

  const barData = statusDistribution.map((d) => ({
    name: d.label,
    SalesValue: d.value,
    Orders: d.count,
    fill: STATUS_COLORS[d.status] || '#3B82F6',
  }));

  const customTooltipFormatter = (value: any, name: any) => {
    if (name === 'SalesValue' || name === 'revenue') {
      return [formatCurrency(Number(value)), 'Sales Revenue'];
    }
    return [value, 'Orders Count'];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Orders by Status (Pie / Donut) */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <PieChart className="w-5 h-5 text-blue-600" />
            <span>Order Distribution by Status</span>
          </CardTitle>
          <CardDescription>Breakdown of total order volume across fulfillment stages</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {pieData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No order data available for status distribution chart.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={customTooltipFormatter}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-slate-700 font-medium">{value}</span>}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 2. Sales Value by Status (Bar Chart) */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Sales Value by Order Status (LKR)</span>
          </CardTitle>
          <CardDescription>Total monetary volume associated with each order status</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {barData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No order sales data available for chart.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                />
                <Tooltip
                  formatter={customTooltipFormatter}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="SalesValue" name="SalesValue" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 3. Team Member Performance Comparison (Full Width Chart) */}
      <Card className="lg:col-span-2 shadow-xs border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Team Member Sales & Fulfillment Performance</span>
          </CardTitle>
          <CardDescription>Comparing total handled orders vs successfully delivered orders per team member</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {memberPerformance.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No team member performance data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberPerformance} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                    fontSize: '12px',
                  }}
                />
                <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                <Bar dataKey="orders" name="Handled Orders" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delivered" name="Delivered Orders" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
