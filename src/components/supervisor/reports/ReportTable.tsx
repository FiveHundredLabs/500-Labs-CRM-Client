import React from 'react';
import { Order, User } from '../../../models/domain';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { StatusBadge } from '../../shared/StatusBadge';
import { EmptyState } from '../../shared/EmptyState';
import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../../utils/currency';
import toast from 'react-hot-toast';

export interface ReportTableProps {
  orders: Order[];
  teamMembers: User[];
  title?: string;
  description?: string;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  orders,
  teamMembers,
  title = 'Order & Financial Breakdown',
  description = 'Detailed statement of orders matching your selected filter criteria',
}) => {
  const memberMap = new Map<string, string>();
  teamMembers.forEach((m) => memberMap.set(m.id, m.fullName));

  const totalAmount = orders.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);

  const handleExportCSV = () => {
    if (orders.length === 0) {
      toast.error('No orders available to export.');
      return;
    }

    const headers = [
      'Order Number',
      'Team Member ID',
      'Team Member Name',
      'Status',
      'Items Description',
      'Created Date',
      'Amount (LKR)',
    ];

    const rows = orders.map((o) => [
      o.orderNumber,
      o.teamMemberId,
      `"${(memberMap.get(o.teamMemberId) || o.teamMemberId).replace(/"/g, '""')}"`,
      o.status,
      `"${o.itemsDescription.replace(/"/g, '""')}"`,
      o.createdAt ? o.createdAt.substring(0, 10) : '',
      (o.totalAmount || 0).toFixed(2),
    ]);

    const csvContent = [
      `"Supervisor Sales & Financial Report"`,
      `"Export Date","${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}"`,
      `"Total Records","${orders.length}"`,
      `"Total Amount (LKR)","${totalAmount.toFixed(2)}"`,
      '',
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Supervisor_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report exported successfully!');
  };

  return (
    <Card className="shadow-xs border-slate-200">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2 text-slate-900">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>{title}</span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Download className="w-4 h-4 text-emerald-600" />}
          onClick={handleExportCSV}
          disabled={orders.length === 0}
        >
          Export CSV Report
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        {orders.length === 0 ? (
          <EmptyState title="No orders match your filters" description="Adjust date, team member, or status filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-700">
              <thead className="bg-slate-50 border-y border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Team Member</th>
                  <th className="py-3 px-4">Items / Details</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">{order.orderNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {memberMap.get(order.teamMemberId) || order.teamMemberId}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{order.itemsDescription}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                      {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge type="order" status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                  <td colSpan={5} className="py-3 px-4 text-right text-xs uppercase tracking-wider">
                    Total Filtered Revenue ({orders.length} Orders):
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-blue-700 font-black">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
