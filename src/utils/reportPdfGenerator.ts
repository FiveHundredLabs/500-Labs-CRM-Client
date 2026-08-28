import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface ReportPdfPayload {
  title: string;
  subtitle?: string;
  scopeTeam: string;
  period: string;
  generatedDate?: string;
  kpis: { label: string; value: string; hint?: string; color?: 'green' | 'blue' | 'amber' | 'red' | 'purple' }[];
  tableHeaders: string[];
  tableRows: (string | number)[][];
  summaryLines?: { label: string; value: string; isBold?: boolean; isHighlight?: boolean }[];
  columnAlignments?: ('left' | 'center' | 'right')[];
  columnWidths?: number[]; // Percentage or absolute mm
}

const COLOR_MAP: Record<string, number[]> = {
  primary: [15, 23, 42], // Slate 900
  secondary: [100, 116, 139], // Slate 500
  lightBg: [248, 250, 252], // Slate 50
  border: [226, 232, 240], // Slate 200
  headerBg: [30, 41, 59], // Slate 800
  green: [16, 185, 129],
  greenBg: [236, 253, 245],
  greenText: [6, 95, 70],
  emerald: [16, 185, 129],
  emeraldBg: [236, 253, 245],
  emeraldText: [6, 95, 70],
  blue: [59, 130, 246],
  blueBg: [239, 246, 255],
  blueText: [30, 64, 175],
  amber: [245, 158, 11],
  amberBg: [254, 243, 199],
  amberText: [146, 64, 14],
  red: [239, 68, 68],
  redBg: [254, 242, 242],
  redText: [153, 27, 27],
  purple: [139, 92, 246],
  purpleBg: [245, 243, 255],
  purpleText: [91, 33, 182],
};

export const generateExecutiveA4Pdf = (payload: ReportPdfPayload): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - margin - 15) {
      doc.addPage('a4', 'portrait');
      currentY = margin;
      drawHeaderBanner(true);
    }
  };

  const drawHeaderBanner = (isContinuation = false) => {
    // Top Accent Bar
    doc.setFillColor(15, 23, 42); // #0F172A
    doc.rect(margin, currentY, contentWidth, isContinuation ? 14 : 22, 'F');

    // Emerald accent border
    doc.setFillColor(16, 185, 129);
    doc.rect(margin, currentY + (isContinuation ? 13 : 21), contentWidth, 1, 'F');

    // Company logo & Title in banner
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isContinuation ? 10 : 13);
    doc.text('500LABS CRM ENTERPRISE INTELLIGENCE', margin + 5, currentY + (isContinuation ? 9 : 11));

    if (!isContinuation) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      doc.text('EXECUTIVE MANAGEMENT & AUDIT COMPLIANCE STATEMENT', margin + 5, currentY + 17);
    }

    // Ref & Date stamp
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    const refCode = `REF: #REP-${format(new Date(), 'yyyyMMdd')}`;
    doc.text(refCode, pageWidth - margin - 5, currentY + (isContinuation ? 9 : 10), { align: 'right' });

    if (!isContinuation) {
      doc.setTextColor(148, 163, 184);
      doc.text(payload.generatedDate || format(new Date(), 'dd MMM yyyy, HH:mm'), pageWidth - margin - 5, currentY + 16, { align: 'right' });
    }

    currentY += isContinuation ? 18 : 28;
  };

  // 1. Render Main Top Banner
  drawHeaderBanner(false);

  // 2. Report Title & Scope Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(payload.title.toUpperCase(), margin + 5, currentY + 7);

  // Metadata items
  doc.setFontSize(7.5);
  const colW = contentWidth / 3;

  // Scope
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('SCOPE / BRAND UNIT:', margin + 5, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(payload.scopeTeam, margin + 5, currentY + 19);

  // Period
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('AUDIT TIMEFRAME:', margin + 5 + colW, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(payload.period, margin + 5 + colW, currentY + 19);

  // Status & Currency
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CLASSIFICATION & CURRENCY:', margin + 5 + colW * 2, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text('VERIFIED AUDIT • LKR', margin + 5 + colW * 2, currentY + 19);

  currentY += 30;

  // 3. KPI Cards Grid (4 boxes)
  if (payload.kpis && payload.kpis.length > 0) {
    const kpiCount = Math.min(payload.kpis.length, 4);
    const kpiCardWidth = (contentWidth - (kpiCount - 1) * 3) / kpiCount;
    const cardHeight = 20;

    payload.kpis.slice(0, 4).forEach((kpi, idx) => {
      const cardX = margin + idx * (kpiCardWidth + 3);
      const colorKey = kpi.color || 'blue';
      const colorStyle = COLOR_MAP[colorKey] || COLOR_MAP.blue;
      const bgStyle = COLOR_MAP[`${colorKey}Bg`] || COLOR_MAP.blueBg;
      const textStyle = COLOR_MAP[`${colorKey}Text`] || COLOR_MAP.blueText;

      // Card Background
      doc.setFillColor(bgStyle[0], bgStyle[1], bgStyle[2]);
      doc.setDrawColor(colorStyle[0], colorStyle[1], colorStyle[2]);
      doc.roundedRect(cardX, currentY, kpiCardWidth, cardHeight, 1.5, 1.5, 'FD');

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(textStyle[0], textStyle[1], textStyle[2]);
      doc.text(kpi.label.toUpperCase(), cardX + 3, currentY + 5.5);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(kpi.value, cardX + 3, currentY + 12.5);

      // Hint / Subtitle
      if (kpi.hint) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.hint, cardX + 3, currentY + 17);
      }
    });

    currentY += cardHeight + 8;
  }

  // 4. Itemized Ledger Table
  if (payload.tableHeaders && payload.tableHeaders.length > 0 && payload.tableRows) {
    checkPageBreak(30);

    // Section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('ITEMIZED AUDIT & PERFORMANCE LEDGER', margin, currentY);
    currentY += 4;

    const numCols = payload.tableHeaders.length;
    let colWidths: number[] = [];

    if (payload.columnWidths && payload.columnWidths.length === numCols) {
      colWidths = payload.columnWidths;
    } else {
      // Default: First column gets 40%, remaining share evenly
      const remainingWidth = contentWidth * 0.6;
      const otherColWidth = remainingWidth / (numCols - 1);
      colWidths = [contentWidth * 0.4, ...Array(numCols - 1).fill(otherColWidth)];
    }

    // Table Header Row
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    let curColX = margin;
    payload.tableHeaders.forEach((header, i) => {
      const align = payload.columnAlignments?.[i] || (i === 0 ? 'left' : i === numCols - 1 ? 'right' : 'left');
      const textX = align === 'right' ? curColX + colWidths[i] - 3 : align === 'center' ? curColX + colWidths[i] / 2 : curColX + 3;
      doc.text(header.toUpperCase(), textX, currentY + 4.8, { align });
      curColX += colWidths[i];
    });

    currentY += 7;

    // Table Data Rows
    payload.tableRows.forEach((row, rowIdx) => {
      checkPageBreak(8);

      const isEven = rowIdx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.rect(margin, currentY, contentWidth, 6.5, 'F');

      // Thin bottom border
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, currentY + 6.5, margin + contentWidth, currentY + 6.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);

      curColX = margin;
      row.forEach((cell, cellIdx) => {
        const align = payload.columnAlignments?.[cellIdx] || (cellIdx === 0 ? 'left' : cellIdx === numCols - 1 ? 'right' : 'left');
        const textX = align === 'right' ? curColX + colWidths[cellIdx] - 3 : align === 'center' ? curColX + colWidths[cellIdx] / 2 : curColX + 3;

        // Bold first column or currency columns
        if (cellIdx === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
        }

        doc.text(String(cell), textX, currentY + 4.5, { align });
        curColX += colWidths[cellIdx];
      });

      currentY += 6.5;
    });

    currentY += 4;
  }

  // 5. Summary Highlights (if provided)
  if (payload.summaryLines && payload.summaryLines.length > 0) {
    checkPageBreak(payload.summaryLines.length * 7 + 10);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    const summaryBoxHeight = payload.summaryLines.length * 6.5 + 4;
    doc.roundedRect(margin + contentWidth * 0.45, currentY, contentWidth * 0.55, summaryBoxHeight, 1.5, 1.5, 'FD');

    payload.summaryLines.forEach((line, idx) => {
      const lineY = currentY + 4 + idx * 6.5;
      const boxX = margin + contentWidth * 0.45;
      const boxW = contentWidth * 0.55;

      if (line.isHighlight) {
        doc.setFillColor(236, 253, 245);
        doc.rect(boxX + 1, lineY - 3, boxW - 2, 6, 'F');
      }

      doc.setFont('helvetica', line.isBold ? 'bold' : 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(line.isHighlight ? 6 : 15, line.isHighlight ? 95 : 23, line.isHighlight ? 70 : 42);

      doc.text(line.label, boxX + 4, lineY + 1);
      doc.text(line.value, boxX + boxW - 4, lineY + 1, { align: 'right' });
    });

    currentY += summaryBoxHeight + 8;
  }

  // 6. Executive Sign-Off & Seal Block
  checkPageBreak(30);
  currentY = Math.max(currentY, pageHeight - margin - 32);

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 6;

  const signColWidth = contentWidth / 3;

  // Executive Office
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 5, currentY + 10, margin + signColWidth - 10, currentY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('CHIEF EXECUTIVE OFFICER', margin + signColWidth / 2 - 2.5, currentY + 13.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('Executive Authorization', margin + signColWidth / 2 - 2.5, currentY + 16.5, { align: 'center' });

  // Finance Controller
  doc.line(margin + signColWidth + 5, currentY + 10, margin + signColWidth * 2 - 10, currentY + 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('FINANCE CONTROLLER', margin + signColWidth * 1.5 - 2.5, currentY + 13.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text('Audit & Compliance Sign-off', margin + signColWidth * 1.5 - 2.5, currentY + 16.5, { align: 'center' });

  // Digital Seal
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(margin + signColWidth * 2 + 5, currentY + 1, signColWidth - 10, 16, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(6, 95, 70);
  doc.text('SYSTEM AUDIT CERTIFIED', margin + signColWidth * 2.5, currentY + 7, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(16, 185, 129);
  doc.text('500Labs Automated Core Engine', margin + signColWidth * 2.5, currentY + 12, { align: 'center' });

  // 7. Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('CONFIDENTIAL • STRICTLY FOR AUTHORIZED EXECUTIVE REVIEW • 500LABS CRM CORE', margin, pageHeight - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  return doc;
};

export const downloadExecutivePdf = (payload: ReportPdfPayload, customFilename?: string): boolean => {
  const doc = generateExecutiveA4Pdf(payload);
  const filename = customFilename || `${payload.title.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(filename);
  return true;
};
