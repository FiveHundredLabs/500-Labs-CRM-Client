import React, { useState } from 'react';
import { ReportDefinition, ActiveFilters } from '../types';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { generateExecutiveA4Pdf, ReportPdfPayload } from '../../../../utils/reportPdfGenerator';
import { formatCurrency } from '../../../../utils/currency';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ExportActionsProps {
  report: ReportDefinition;
  filters: ActiveFilters;
  filteredData: any[];
  rawReportData: any;
}

export const ExportActions: React.FC<ExportActionsProps> = ({
  report,
  filters,
  filteredData,
  rawReportData,
}) => {
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Generate Filename Base
  const getFileBase = () => {
    const d = format(new Date(), 'yyyy-MM-dd');
    return `${report.id}_report_${d}`;
  };

  // 1. CSV Export Handler
  const handleExportCsv = () => {
    try {
      setIsExportingCsv(true);

      if (!filteredData || filteredData.length === 0) {
        toast.error('No data available to export');
        setIsExportingCsv(false);
        return;
      }

      const headers = report.columns.map((c) => c.header);
      const csvRows: string[] = [];

      // Add Headers
      csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

      // Add Rows
      filteredData.forEach((row) => {
        const line = report.columns.map((col) => {
          let val = col.accessorKey ? row[col.accessorKey] : '';
          if (val === null || val === undefined) val = '';
          if (typeof val === 'number') {
            return `"${val}"`;
          }
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(line.join(','));
      });

      const csvString = csvRows.join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${getFileBase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredData.length} records to CSV`);
    } catch (err) {
      console.error('CSV Export Error:', err);
      toast.error('Failed to export CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // 2. PDF Export Handler
  const handleExportPdf = () => {
    try {
      setIsExportingPdf(true);

      if (!filteredData || filteredData.length === 0) {
        toast.error('No records available for PDF generation');
        setIsExportingPdf(false);
        return;
      }

      // Format Active Period
      let periodStr = 'All Historic Records';
      if (filters.dateRange.startDate && filters.dateRange.endDate) {
        periodStr = `${filters.dateRange.startDate} to ${filters.dateRange.endDate}`;
      } else if (filters.dateRange.startDate) {
        periodStr = `From ${filters.dateRange.startDate}`;
      } else if (filters.dateRange.preset !== 'ALL') {
        periodStr = filters.dateRange.preset.replace('_', ' ');
      }

      // Format Scope
      let scopeStr = 'Entire Enterprise';
      if (filters.teamId && filters.teamId !== 'ALL') {
        scopeStr = `Team: ${filters.teamId}`;
      }

      // Extract KPIs
      const pdfKpis = report.kpis.slice(0, 4).map((kpi) => {
        const raw = kpi.getValue(rawReportData, filters);
        let valStr = '';
        if (kpi.format === 'currency') valStr = formatCurrency(Number(raw));
        else if (kpi.format === 'percentage') valStr = `${raw}%`;
        else if (kpi.format === 'number') valStr = Number(raw).toLocaleString();
        else valStr = String(raw);

        return {
          label: kpi.label,
          value: valStr,
          hint: kpi.subtitle ? kpi.subtitle(rawReportData, filters) : undefined,
          color: kpi.accentColor as any,
        };
      });

      // Headers & Rows: use custom PDF columns if specified to avoid overcrowded/overlapping columns
      const pdfCols = report.pdfConfig?.columns || report.columns.map((c) => ({
        header: c.header,
        accessorKey: c.accessorKey || c.id,
        align: c.align || 'left',
        format: c.format || 'text',
        widthMm: undefined as number | undefined,
      }));

      const tableHeaders = pdfCols.map((c) => c.header);
      const columnAlignments = pdfCols.map((c) => c.align || 'left');
      const columnWidths = pdfCols.every((c) => c.widthMm)
        ? (pdfCols.map((c) => c.widthMm!) as number[])
        : undefined;

      const tableRows: (string | number)[][] = filteredData.slice(0, 250).map((row) => {
        return pdfCols.map((col) => {
          const val = col.accessorKey ? row[col.accessorKey] : '';
          if (val === null || val === undefined) return '-';
          if (col.format === 'currency') return formatCurrency(Number(val));
          if (col.format === 'number') return Number(val).toLocaleString();
          if (col.format === 'date') {
            try {
              return format(new Date(val), 'yyyy-MM-dd');
            } catch {
              return String(val);
            }
          }
          return String(val);
        });
      });

      const summaryLines = report.pdfConfig?.summaryLines
        ? report.pdfConfig.summaryLines(filteredData, filters)
        : undefined;

      const payload: ReportPdfPayload = {
        title: report.name,
        subtitle: report.description,
        scopeTeam: scopeStr,
        period: periodStr,
        generatedDate: format(new Date(), 'dd MMM yyyy, HH:mm'),
        kpis: pdfKpis,
        tableHeaders,
        tableRows,
        columnAlignments,
        columnWidths,
        summaryLines,
        orientation: report.pdfConfig?.orientation || 'portrait',
      };

      const doc = generateExecutiveA4Pdf(payload);
      doc.save(`${getFileBase()}.pdf`);

      toast.success('Executive PDF statement generated');
    } catch (err) {
      console.error('PDF Export Error:', err);
      toast.error('Failed to generate PDF statement');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* CSV Export Button */}
      <button
        type="button"
        onClick={handleExportCsv}
        disabled={isExportingCsv || filteredData.length === 0}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all cursor-pointer"
      >
        {isExportingCsv ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
        )}
        <span>Download CSV</span>
      </button>

      {/* PDF Export Button */}
      <button
        type="button"
        onClick={handleExportPdf}
        disabled={isExportingPdf || filteredData.length === 0}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all cursor-pointer"
      >
        {isExportingPdf ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-rose-600" />
        )}
        <span>Download PDF</span>
      </button>
    </div>
  );
};
