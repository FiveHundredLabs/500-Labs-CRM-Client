import jsPDF from 'jspdf';
import { Expense, PettyCashAllocation, PettyCashTransaction, PettyCashWallet } from '../models/domain';
import { formatCurrency } from './currency';
import { convertAmountToWords } from './amountInWords';
import { format } from 'date-fns';

/**
 * Generates an official payment/expense voucher PDF.
 */
export function generateExpenseVoucherPdf(expense: Expense): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Header Box
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, 15, contentWidth, 32, 2, 2, 'S');

  // Company Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('LEVEL GROW (PVT) LTD', margin + 6, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Enterprise Operations & Financial Management', margin + 6, 30);
  doc.text('Official Accounting & Payment Voucher', margin + 6, 35);

  // Document Type / Badge
  doc.setFillColor(232, 247, 254); // #E8F7FE brand light
  doc.roundedRect(pageWidth - margin - 65, 20, 59, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(1, 136, 199); // #0188C7
  doc.text('PAYMENT VOUCHER', pageWidth - margin - 60, 29);

  // Details Section Grid
  let y = 56;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 54, 'F');
  doc.rect(margin, y, contentWidth, 54, 'S');

  const col1 = margin + 6;
  const col2 = margin + 40;
  const col3 = margin + 95;
  const col4 = margin + 130;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Voucher Ref:', col1, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const voucherCode = expense.id.length > 8 ? `EXP-${expense.id.slice(0, 8).toUpperCase()}` : expense.id;
  doc.text(voucherCode, col2, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Voucher Date:', col3, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(expense.expenseDate ? format(new Date(expense.expenseDate), 'yyyy-MM-dd') : '-', col4, y + 8);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Category:', col1, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(expense.categoryName || 'General', col2, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Payment Method:', col3, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(expense.paymentMethod || 'CASH', col4, y + 17);

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Recorded By:', col1, y + 26);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(expense.createdByName || 'System', col2, y + 26);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Petty Cash Ref:', col3, y + 26);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(expense.pettyCashRef || 'N/A', col4, y + 26);

  // Row 4 - Purpose / Remarks
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Purpose / Remarks:', col1, y + 36);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const splitRemarks = doc.splitTextToSize(expense.remarks || '-', contentWidth - 48);
  doc.text(splitRemarks, col2, y + 36);

  // Row 5 - Internal Notes
  if (expense.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Notes:', col1, y + 46);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const splitNotes = doc.splitTextToSize(expense.notes, contentWidth - 48);
    doc.text(splitNotes, col2, y + 46);
  }

  // Amount Box
  y = 120;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'F');
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text('Total Amount Payable:', margin + 6, y + 10);

  doc.setFontSize(18);
  doc.setTextColor(1, 168, 243); // #01A8F3
  doc.text(formatCurrency(expense.amount), margin + 65, y + 11);

  // Amount in Words
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const words = convertAmountToWords(expense.amount);
  const splitWords = doc.splitTextToSize(`Amount in words: ${words}`, contentWidth - 12);
  doc.text(splitWords, margin + 6, y + 23);

  // Signatures Section
  y = 175;
  const sigBoxWidth = (contentWidth - 16) / 3;

  const signatures = [
    { title: 'PREPARED BY', name: expense.createdByName || 'Finance Officer' },
    { title: 'CHECKED & VERIFIED BY', name: 'Internal Audit / Accountant' },
    { title: 'AUTHORIZED BY', name: 'Authorized Signatory / Director' },
  ];

  signatures.forEach((sig, idx) => {
    const sigX = margin + idx * (sigBoxWidth + 8);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(sigX, y, sigBoxWidth, 42, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(sig.title, sigX + 4, y + 8);

    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(sigX + 4, y + 28, sigX + sigBoxWidth - 4, y + 28);
    doc.setLineDashPattern([], 0); // reset

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(sig.name, sigX + 4, y + 35);
  });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `System Generated Voucher | Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm')} | Level Grow CRM Finance Infrastructure`,
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  return doc;
}

/**
 * Generates an official Petty Cash Allocation Voucher PDF.
 */
export function generatePettyCashAllocationPdf(allocation: PettyCashAllocation): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Header Box
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, 15, contentWidth, 32, 2, 2, 'S');

  // Company Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('LEVEL GROW (PVT) LTD', margin + 6, 25);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Treasury & Working Float Management', margin + 6, 30);
  doc.text('Petty Cash Replenishment / Allocation Certificate', margin + 6, 35);

  // Document Badge
  doc.setFillColor(242, 249, 233); // #F2F9E9 green subtle
  doc.roundedRect(pageWidth - margin - 72, 20, 66, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(84, 126, 27); // #547E1B
  doc.text('PETTY CASH ALLOCATION', pageWidth - margin - 68, 29);

  let y = 56;

  // Details Grid
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 54, 'F');
  doc.rect(margin, y, contentWidth, 54, 'S');

  const col1 = margin + 6;
  const col2 = margin + 42;
  const col3 = margin + 95;
  const col4 = margin + 130;

  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Allocation Code:', col1, y + 9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(1, 136, 199);
  doc.text(allocation.allocationCode, col2, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Allocation Date:', col3, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(allocation.date ? format(new Date(allocation.date), 'yyyy-MM-dd') : '-', col4, y + 9);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Allocated By:', col1, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(allocation.allocatedByName || 'Management', col2, y + 19);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Float Scope:', col3, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(allocation.teamId ? 'Team Working Float' : 'Global Treasury Float', col4, y + 19);

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Purpose / Reason:', col1, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const splitReason = doc.splitTextToSize(allocation.reason || '-', contentWidth - 50);
  doc.text(splitReason, col2, y + 30);

  // Row 4
  if (allocation.remarks) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Remarks:', col1, y + 42);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const splitRemarks = doc.splitTextToSize(allocation.remarks, contentWidth - 50);
    doc.text(splitRemarks, col2, y + 42);
  }

  // Amount Section
  y = 120;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'F');
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text('Allocated Float Amount:', margin + 6, y + 10);

  doc.setFontSize(18);
  doc.setTextColor(84, 126, 27); // #547E1B
  doc.text(formatCurrency(allocation.amount), margin + 65, y + 11);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const words = convertAmountToWords(allocation.amount);
  const splitWords = doc.splitTextToSize(`Amount in words: ${words}`, contentWidth - 12);
  doc.text(splitWords, margin + 6, y + 23);

  // Signatures
  y = 175;
  const sigBoxWidth = (contentWidth - 16) / 3;

  const signatures = [
    { title: 'ISSUED & AUTHORIZED BY', name: allocation.allocatedByName || 'Finance Director' },
    { title: 'RECEIVED & ACCEPTED BY', name: 'Petty Cash Custodian' },
    { title: 'TREASURY VERIFICATION', name: 'Internal Audit' },
  ];

  signatures.forEach((sig, idx) => {
    const sigX = margin + idx * (sigBoxWidth + 8);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(sigX, y, sigBoxWidth, 42, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(sig.title, sigX + 4, y + 8);

    doc.setDrawColor(203, 213, 225);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(sigX + 4, y + 28, sigX + sigBoxWidth - 4, y + 28);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(sig.name, sigX + 4, y + 35);
  });

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Petty Cash Allocation Certificate | Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm')} | Level Grow CRM`,
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  return doc;
}

/**
 * Generates an official Petty Cash Balance Statement PDF.
 */
export function generatePettyCashStatementPdf(
  wallet: PettyCashWallet,
  transactions: PettyCashTransaction[],
  scopeTitle = 'Global Petty Cash Float'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('LEVEL GROW (PVT) LTD', margin, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Petty Cash Balance Statement & Float Audit Ledger', margin, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(1, 136, 199);
  doc.text(`Scope: ${scopeTitle}`, margin, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`As of: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth - margin, 22, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 38, pageWidth - margin, 38);

  // Summary Metrics Box
  const cardWidth = (contentWidth - 8) / 3;
  let y = 44;

  const metrics = [
    { title: 'TOTAL ALLOCATED FLOAT', val: formatCurrency(wallet.allocatedAmount), color: [1, 168, 243] },
    { title: 'TOTAL DISBURSED / USED', val: formatCurrency(wallet.usedAmount), color: [239, 68, 68] },
    { title: 'REMAINING BALANCE', val: formatCurrency(wallet.remainingBalance), color: [128, 189, 43] },
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * (cardWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardWidth, 22, 2, 2, 'F');
    doc.roundedRect(x, y, cardWidth, 22, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.title, x + 4, y + 7);

    doc.setFontSize(12);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, x + 4, y + 16);
  });

  // Recent Transactions Subheading
  y = 75;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Recent Float Transactions & Vouchers', margin, y);

  // Table Header
  y = 81;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('DATE', margin + 3, y + 5.5);
  doc.text('TYPE', margin + 24, y + 5.5);
  doc.text('ALLOCATION / PURPOSE', margin + 46, y + 5.5);
  doc.text('AUTHORIZED BY', margin + 96, y + 5.5);
  doc.text('AMOUNT', margin + 144, y + 5.5, { align: 'right' });
  doc.text('BALANCE AFTER', margin + contentWidth - 3, y + 5.5, { align: 'right' });

  // Rows
  y += 8;
  const recentTx = transactions.slice(0, 18);

  recentTx.forEach((tx, idx) => {
    if (y > 255) return; // avoid page overrun

    // Zebra row background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 7.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    const dateStr = tx.date ? format(new Date(tx.date), 'yyyy-MM-dd') : '-';
    doc.text(dateStr, margin + 3, y + 5);

    // Type Badge
    const isAlloc = tx.transactionType === 'ALLOCATION';
    doc.setFont('helvetica', 'bold');
    if (isAlloc) {
      doc.setTextColor(84, 126, 27); // #547E1B
      doc.text('ALLOCATION', margin + 24, y + 5);
    } else {
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text('VOUCHER', margin + 24, y + 5);
    }

    // Allocation / Purpose text
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    let desc = tx.reason || tx.description || '-';
    if (tx.allocation?.allocationCode && !isAlloc) {
      desc = `[${tx.allocation.allocationCode}] ${desc}`;
    }
    const truncatedDesc = desc.length > 27 ? `${desc.slice(0, 25)}...` : desc;
    doc.text(truncatedDesc, margin + 46, y + 5);

    // Authorized User (safely truncated so it never overlaps amount)
    doc.setTextColor(100, 116, 139);
    const userName = (tx.userName || 'System').slice(0, 14);
    doc.text(userName, margin + 96, y + 5);

    // Amount & Balance (strictly aligned to right margin boundaries)
    doc.setFont('helvetica', 'bold');
    if (isAlloc) {
      doc.setTextColor(1, 136, 199);
      doc.text(`+${formatCurrency(tx.amount)}`, margin + 144, y + 5, { align: 'right' });
    } else {
      doc.setTextColor(15, 23, 42);
      doc.text(`-${formatCurrency(tx.amount)}`, margin + 144, y + 5, { align: 'right' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(formatCurrency(tx.remainingBalance), margin + contentWidth - 3, y + 5, { align: 'right' });

    // Row divider
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 7.5, margin + contentWidth, y + 7.5);

    y += 7.5;
  });

  // Signatures
  y = 245;
  doc.setDrawColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  doc.line(margin, y, margin + 50, y);
  doc.text('Prepared by: Finance Officer', margin, y + 5);

  doc.line(pageWidth - margin - 50, y, pageWidth - margin, y);
  doc.text('Approved by: Head of Finance', pageWidth - margin - 50, y + 5);

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Petty Cash Balance Statement | Level Grow (Pvt) Ltd | Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  return doc;
}

export interface InventoryPdfItem {
  code: string;
  name: string;
  teamName: string;
  currentStock: number;
  minStockThreshold: number;
  costPrice: number;
  sellingPrice: number;
  stockValuation: number;
  soldUnits: number;
  realizedRevenue: number;
  realizedGrossProfit: number;
  marginPct: string;
}

export interface InventoryPdfSummary {
  totalSKUs: number;
  totalUnitsOnHand: number;
  totalValuationCost: number;
  totalPotentialSales: number;
  totalRealizedRevenue: number;
  totalGrossProfit: number;
  avgMargin: string;
}

/**
 * Generates an official, beautifully styled Inventory & Asset Valuation Ledger PDF.
 * Designed with precise typography, strict non-overlapping column bounds, and multi-page pagination.
 */
export function generateInventoryValuationPdf(
  items: InventoryPdfItem[],
  summary: InventoryPdfSummary,
  teamScope = 'All Teams'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273mm

  // Column definitions with strict bounds (sum = 273mm)
  const columns = [
    { id: 'sku', header: 'SKU CODE', width: 22, align: 'left' as const },
    { id: 'name', header: 'PRODUCT TITLE', width: 38, align: 'left' as const },
    { id: 'team', header: 'TEAM', width: 30, align: 'left' as const },
    { id: 'stock', header: 'STOCK', width: 18, align: 'center' as const },
    { id: 'cost', header: 'UNIT COST', width: 24, align: 'right' as const },
    { id: 'selling', header: 'SELLING PRICE', width: 24, align: 'right' as const },
    { id: 'valuation', header: 'STOCK VALUATION', width: 30, align: 'right' as const },
    { id: 'sold', header: 'DELIVERED', width: 16, align: 'center' as const },
    { id: 'revenue', header: 'REALIZED REV', width: 25, align: 'right' as const },
    { id: 'profit', header: 'GROSS PROFIT', width: 26, align: 'right' as const },
    { id: 'margin', header: 'MARGIN', width: 20, align: 'right' as const },
  ];

  const drawHeader = (pageNumber: number) => {
    if (pageNumber === 1) {
      // Top accent bar
      doc.setFillColor(1, 168, 243); // #01A8F3
      doc.rect(margin, 10, contentWidth, 1.5, 'F');

      // Company Branding & Document Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('LEVEL GROW (PVT) LTD', margin, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('Inventory & Asset Valuation Ledger — Real-Time Stock & Profitability Audit', margin, 23);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(1, 136, 199); // #0188C7
      doc.text(`Scope: ${teamScope} (${items.length} registered SKUs)`, margin, 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth - margin, 18, { align: 'right' });
      doc.text('Status: Official Audit Record', pageWidth - margin, 23, { align: 'right' });

      // Summary KPI Cards (4 cards)
      const cardWidth = (contentWidth - 9) / 4;
      const cardY = 32;

      const metrics = [
        {
          title: 'TOTAL VALUATION (COST)',
          val: formatCurrency(summary.totalValuationCost),
          color: [1, 168, 243], // Blue
        },
        {
          title: 'POTENTIAL REVENUE',
          val: formatCurrency(summary.totalPotentialSales),
          color: [1, 136, 199], // Cyan
        },
        {
          title: 'REALIZED SALES REVENUE',
          val: formatCurrency(summary.totalRealizedRevenue),
          color: [84, 126, 27], // Green
        },
        {
          title: 'GROSS PROFIT & MARGIN',
          val: `${formatCurrency(summary.totalGrossProfit)} (${summary.avgMargin}%)`,
          color: [128, 189, 43], // Light Green
        },
      ];

      metrics.forEach((m, idx) => {
        const x = margin + idx * (cardWidth + 3);
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(x, cardY, cardWidth, 16, 1.5, 1.5, 'F');
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.roundedRect(x, cardY, cardWidth, 16, 1.5, 1.5, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(m.title, x + 3, cardY + 5);

        doc.setFontSize(9.5);
        doc.setTextColor(m.color[0], m.color[1], m.color[2]);
        doc.text(m.val, x + 3, cardY + 12);
      });

      // Section Heading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Stock Asset Valuation & Profitability Breakdown', margin, 54);
    } else {
      // Header for subsequent pages
      doc.setFillColor(1, 168, 243);
      doc.rect(margin, 8, contentWidth, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('LEVEL GROW (PVT) LTD — Inventory & Asset Valuation Ledger (Cont.)', margin, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Scope: ${teamScope} | Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth - margin, 14, { align: 'right' });
    }
  };

  const drawTableHeader = (headerY: number) => {
    // Header Background
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, headerY, contentWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.rect(margin, headerY, contentWidth, 7, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105); // slate-600

    let currentX = margin;
    columns.forEach((col) => {
      const textY = headerY + 4.6;
      if (col.align === 'left') {
        doc.text(col.header, currentX + 1.5, textY);
      } else if (col.align === 'center') {
        doc.text(col.header, currentX + col.width / 2, textY, { align: 'center' });
      } else {
        doc.text(col.header, currentX + col.width - 1.5, textY, { align: 'right' });
      }
      currentX += col.width;
    });
  };

  let pageNumber = 1;
  drawHeader(pageNumber);

  let currentY = 58;
  drawTableHeader(currentY);
  currentY += 7;

  const rowHeight = 6.2;
  const bottomLimit = pageHeight - 16; // 194mm

  items.forEach((item, idx) => {
    // Check page overflow
    if (currentY + rowHeight > bottomLimit) {
      // Add new page
      doc.addPage('a4', 'landscape');
      pageNumber++;
      drawHeader(pageNumber);
      currentY = 18;
      drawTableHeader(currentY);
      currentY += 7;
    }

    // Zebra striping
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }

    let currentX = margin;

    // 1. SKU Code
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(item.code.slice(0, 12), currentX + 1.5, currentY + 4.3);
    currentX += columns[0].width;

    // 2. Product Title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(item.name.slice(0, 24), currentX + 1.5, currentY + 4.3);
    currentX += columns[1].width;

    // 3. Team
    doc.setTextColor(1, 136, 199);
    doc.text(item.teamName.slice(0, 18), currentX + 1.5, currentY + 4.3);
    currentX += columns[2].width;

    // 4. Stock
    if (item.currentStock === 0) {
      doc.setTextColor(220, 38, 38);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(`${item.currentStock} u`, currentX + columns[3].width / 2, currentY + 4.3, { align: 'center' });
    currentX += columns[3].width;

    // 5. Unit Cost
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(formatCurrency(item.costPrice), currentX + columns[4].width - 1.5, currentY + 4.3, { align: 'right' });
    currentX += columns[4].width;

    // 6. Selling Price
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(item.sellingPrice), currentX + columns[5].width - 1.5, currentY + 4.3, { align: 'right' });
    currentX += columns[5].width;

    // 7. Stock Valuation
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(1, 136, 199);
    doc.text(formatCurrency(item.stockValuation), currentX + columns[6].width - 1.5, currentY + 4.3, { align: 'right' });
    currentX += columns[6].width;

    // 8. Delivered Units
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`${item.soldUnits}`, currentX + columns[7].width / 2, currentY + 4.3, { align: 'center' });
    currentX += columns[7].width;

    // 9. Realized Revenue
    doc.setTextColor(84, 126, 27);
    doc.text(formatCurrency(item.realizedRevenue), currentX + columns[8].width - 1.5, currentY + 4.3, { align: 'right' });
    currentX += columns[8].width;

    // 10. Gross Profit
    doc.setFont('helvetica', 'bold');
    if (item.realizedGrossProfit >= 0) {
      doc.setTextColor(84, 126, 27); // green
    } else {
      doc.setTextColor(220, 38, 38); // red
    }
    doc.text(formatCurrency(item.realizedGrossProfit), currentX + columns[9].width - 1.5, currentY + 4.3, { align: 'right' });
    currentX += columns[9].width;

    // 11. Margin
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${item.marginPct}%`, currentX + columns[10].width - 1.5, currentY + 4.3, { align: 'right' });

    // Thin row divider
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

    currentY += rowHeight;
  });

  // Add Footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400

    // Footer divider
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.text(
      `Official Inventory & Asset Valuation Ledger | Level Grow (Pvt) Ltd | Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
      margin,
      pageHeight - 6
    );

    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  return doc;
}

