import React from 'react';
import { FinancialReportSummary } from '../../../services/supervisorAnalyticsService';
import { StatCard } from '../../shared/StatCard';
import { DollarSign, Package, CheckCircle2, Truck, XCircle, TrendingUp, Calculator } from 'lucide-react';
import { formatCurrency } from '../../../utils/currency';

export interface ReportKpisProps {
  summary: FinancialReportSummary;
}

export const ReportKpis: React.FC<ReportKpisProps> = ({ summary }) => {
  return (
    <div className="space-y-4">
      {/* Primary Financial Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Order Revenue"
          value={formatCurrency(summary.totalOrderValue)}
          subtitle={`${summary.totalOrders} total orders placed`}
          icon={<DollarSign className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Delivered Revenue"
          value={formatCurrency(summary.deliveredOrderValue)}
          subtitle={`${summary.deliveredOrders} delivered (${summary.deliveryRate}% rate)`}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
        />
        <StatCard
          title="Dispatched Revenue"
          value={formatCurrency(summary.dispatchedOrderValue)}
          subtitle={`${summary.dispatchedOrders} in-transit orders`}
          icon={<Truck className="w-4 h-4 text-amber-600" />}
          accentColor="amber"
        />
        <StatCard
          title="Rejected Revenue"
          value={formatCurrency(summary.rejectedOrderValue)}
          subtitle={`${summary.rejectedOrders} rejected (${summary.rejectionRate}% rate)`}
          icon={<XCircle className="w-4 h-4 text-rose-600" />}
          accentColor="red"
        />
      </div>

      {/* Secondary Rates & AOV Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Order Value (AOV)</div>
            <div className="text-xl font-bold text-slate-900 font-mono mt-1">{formatCurrency(summary.averageOrderValue)}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Average revenue generated per order</div>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-600">
            <Calculator className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Fulfillment Rate</div>
            <div className="text-xl font-bold text-emerald-700 font-mono mt-1">{summary.deliveryRate}%</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Delivered out of total order volume</div>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejection & Return Rate</div>
            <div className="text-xl font-bold text-rose-700 font-mono mt-1">{summary.rejectionRate}%</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Failed deliveries or returned orders</div>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
