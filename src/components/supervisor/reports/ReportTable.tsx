import React, { useEffect, useMemo, useState } from 'react';
import { Order, User } from '../../../models/domain';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/Card';
import { StatusBadge } from '../../shared/StatusBadge';
import { EmptyState } from '../../shared/EmptyState';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../../utils/currency';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const memberMap = new Map<string, string>();
  teamMembers.forEach((m) => memberMap.set(m.id, m.fullName));

  const totalAmount = orders.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [orders]);

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
      </CardHeader>

      <CardContent className="p-0">
        {orders.length === 0 ? (
          <EmptyState title="No orders match your filters" description="Adjust date, team member, or status filters." />
        ) : (
          <>
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
                {paginatedOrders.map((order) => (
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
          <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#01A8F3]"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-400 sm:ml-2">
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong>–{' '}
                <strong>{Math.min(currentPage * pageSize, orders.length)}</strong> of{' '}
                <strong>{orders.length}</strong> orders
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="First Page"
                aria-label="First page of order breakdown"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous Page"
                aria-label="Previous order breakdown page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-medium">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next Page"
                aria-label="Next order breakdown page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Last Page"
                aria-label="Last page of order breakdown"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
