import React, { useState, useMemo } from 'react';
import { ReportColumn } from '../types';
import { EmptyState } from '../../../../components/shared/EmptyState';
import { formatCurrency } from '../../../../utils/currency';
import { format } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown,
} from 'lucide-react';

interface ReportTableProps {
  columns: ReportColumn[];
  data: any[];
  isLoading?: boolean;
}

export const ReportTable: React.FC<ReportTableProps> = ({
  columns,
  data,
  isLoading = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Handle Sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc'
        ? String(valA || '').localeCompare(String(valB || ''))
        : String(valB || '').localeCompare(String(valA || ''));
    });
  }, [data, sortKey, sortDirection]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const renderCellContent = (column: ReportColumn, row: any) => {
    if (column.cell) {
      return column.cell(row);
    }

    const value = column.accessorKey ? row[column.accessorKey] : null;

    if (value === null || value === undefined) {
      return <span className="text-slate-400 italic">None</span>;
    }

    if (column.format === 'currency') {
      return (
        <span className="font-mono font-bold text-slate-900">
          {formatCurrency(Number(value))}
        </span>
      );
    }

    if (column.format === 'date') {
      try {
        return (
          <span className="font-mono text-slate-600 text-xs">
            {format(new Date(value), 'MMM dd, yyyy')}
          </span>
        );
      } catch {
        return <span>{String(value)}</span>;
      }
    }

    if (column.format === 'badge') {
      const str = String(value);
      let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
      if (['Approved', 'Settled', 'Cleared', 'INFLOW'].includes(str)) {
        badgeStyle = 'bg-[#F2F9E9] text-[#547E1B] border-[#D4ECC6]';
      } else if (['Pending', 'OUTFLOW'].includes(str)) {
        badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
      } else if (['CASH', 'BANK_TRANSFER', 'REVENUE'].includes(str)) {
        badgeStyle = 'bg-[#E8F7FE] text-[#0188C7] border-[#B9E7FC]';
      } else if (str.startsWith('SKU-') || str.startsWith('EXP-') || str.startsWith('REC-') || str.startsWith('PC-')) {
        badgeStyle = 'bg-slate-100 text-slate-800 font-mono border-slate-200 font-bold';
      }

      return (
        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeStyle}`}>
          {str}
        </span>
      );
    }

    return <span className="text-slate-800">{String(value)}</span>;
  };

  if (!isLoading && data.length === 0) {
    return (
      <EmptyState
        title="No financial ledger entries"
        description="No transaction records match the active filter criteria."
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Table responsive container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  onClick={() => col.accessorKey && handleSort(col.accessorKey)}
                  className={`py-3.5 px-4 select-none ${col.accessorKey ? 'cursor-pointer hover:bg-slate-100/80' : ''} ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                  style={{ width: col.width }}
                >
                  <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                    <span>{col.header}</span>
                    {col.accessorKey && (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {paginatedData.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                className="hover:bg-slate-50/80 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={`py-3 px-4 text-xs ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {renderCellContent(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
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
          <span className="text-slate-400 ml-2">
            Showing <strong>{Math.min(data.length, (currentPage - 1) * pageSize + 1)}</strong> -{' '}
            <strong>{Math.min(data.length, currentPage * pageSize)}</strong> of{' '}
            <strong>{data.length}</strong> total records
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="First Page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="px-2 font-medium">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Last Page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
