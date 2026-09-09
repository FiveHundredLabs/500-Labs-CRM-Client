import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Wallet, 
  Boxes, 
  BarChart3, 
  ArrowUpRight, 
  Clock, 
  Tag,
  MapPin,
  Package,
  Users
} from 'lucide-react';
import { ReportDefinition, ActiveFilters } from './types';
import { 
  ExpenseRecord, 
  DeliveredOrderRecord, 
  ProductCostRecord, 
  PettyCashTransactionRecord, 
  PettyCashAllocationRecord 
} from './mockData';
import { formatCurrency } from '../../../utils/currency';
import { format, parseISO } from 'date-fns';

// Helper: check if date falls in range
export const isDateInRange = (dateStr: string, startDate?: string, endDate?: string) => {
  if (!dateStr) return true;
  const d = dateStr.split('T')[0];
  if (startDate && d < startDate) return false;
  if (endDate && d > endDate) return false;
  return true;
};

export const FINANCE_REPORTS: ReportDefinition[] = [
  // 1. Expense Summary Report (Database: model Expense)
  {
    id: 'expense-summary',
    name: 'Expense Summary Report',
    description: 'Executive birds-eye overview of business operational expenses, monthly burn velocity, and voucher count.',
    category: 'SUMMARY',
    groupCategory: 'FINANCE',
    badgeText: 'Overview',
    badgeType: 'executive',
    icon: DollarSign,
    supportedFilters: ['dateRange', 'paymentMethod'],
    kpis: [
      {
        id: 'total-expense',
        label: 'Total Expenditures',
        format: 'currency',
        getValue: (data) => data.reduce((acc: number, curr: ExpenseRecord) => acc + curr.amount, 0),
        subtitle: (data) => `${data.length} total operational vouchers`,
        accentColor: 'blue',
      },
      {
        id: 'avg-expense',
        label: 'Average Voucher Value',
        format: 'currency',
        getValue: (data) => data.length ? Math.round(data.reduce((acc: number, curr: ExpenseRecord) => acc + curr.amount, 0) / data.length) : 0,
        subtitle: () => 'Per recorded expense',
        accentColor: 'purple',
      },
      {
        id: 'highest-expense',
        label: 'Single Highest Voucher',
        format: 'currency',
        getValue: (data) => data.length ? Math.max(...data.map((d: ExpenseRecord) => d.amount)) : 0,
        subtitle: (data) => {
          const max = data.length ? data.reduce((prev: ExpenseRecord, curr: ExpenseRecord) => curr.amount > prev.amount ? curr : prev, data[0]) : null;
          return max ? `${max.categoryName} (${max.remarks.substring(0, 24)}...)` : 'None';
        },
        accentColor: 'amber',
      },
      {
        id: 'petty-cash-total',
        label: 'Petty Cash Disbursements',
        format: 'currency',
        getValue: (data) => data.filter((d: ExpenseRecord) => d.paymentMethod === 'PETTY_CASH').reduce((acc: number, c: ExpenseRecord) => acc + c.amount, 0),
        subtitle: (data) => {
          const total = data.reduce((acc: number, c: ExpenseRecord) => acc + c.amount, 0);
          const pc = data.filter((d: ExpenseRecord) => d.paymentMethod === 'PETTY_CASH').reduce((acc: number, c: ExpenseRecord) => acc + c.amount, 0);
          return total > 0 ? `${Math.round((pc / total) * 100)}% of total expenses` : '0%';
        },
        accentColor: 'green',
      },
    ],
    chartConfig: {
      type: 'AREA',
      xAxisKey: 'period',
      series: [
        { key: 'amount', name: 'Expenditure (LKR)', color: '#2563EB' },
      ],
      getChartData: (filteredData) => {
        const months: Record<string, number> = {};
        filteredData.forEach((item: ExpenseRecord) => {
          const m = item.expenseDate.substring(0, 7); // YYYY-MM
          months[m] = (months[m] || 0) + item.amount;
        });
        return Object.entries(months)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([period, amount]) => ({
            period: format(parseISO(`${period}-01`), 'MMM yyyy'),
            amount,
          }));
      },
    },
    columns: [
      { id: 'expenseDate', header: 'Expense Date', accessorKey: 'expenseDate', align: 'left', format: 'date' },
      { id: 'categoryName', header: 'Account Category', accessorKey: 'categoryName', align: 'left', format: 'badge' },
      { id: 'remarks', header: 'Description / Remarks', accessorKey: 'remarks', align: 'left' },
      { id: 'paymentMethod', header: 'Payment Method', accessorKey: 'paymentMethod', align: 'center', format: 'badge' },
      { id: 'createdByName', header: 'Recorded By', accessorKey: 'createdByName', align: 'left' },
      { id: 'amount', header: 'Amount (LKR)', accessorKey: 'amount', align: 'right', format: 'currency' },
    ],
    getData: (db, filters) => {
      return db.expenses.filter((e: ExpenseRecord) => {
        if (!isDateInRange(e.expenseDate, filters.dateRange.startDate, filters.dateRange.endDate)) return false;
        if (filters.paymentMethod && filters.paymentMethod !== 'ALL' && e.paymentMethod !== filters.paymentMethod) return false;
        if (filters.category && filters.category !== 'ALL' && e.categoryName !== filters.category) return false;
        return true;
      });
    },
  },

  // 2. Operating Expense (OpEx) Report (Database: model Expense + ExpenseCategory)
  {
    id: 'operating-expense',
    name: 'Operating Expense (OpEx) Report',
    description: 'Detailed statement of operating overheads, utilities, logistics, and administrative maintenance costs.',
    category: 'EXPENSE',
    groupCategory: 'FINANCE',
    badgeText: 'Expenditure',
    badgeType: 'standard',
    icon: Layers,
    supportedFilters: ['dateRange', 'category'],
    kpis: [
      {
        id: 'total-opex',
        label: 'Total Operating Overhead',
        format: 'currency',
        getValue: (data) => data.reduce((acc: number, curr: ExpenseRecord) => acc + curr.amount, 0),
        subtitle: () => 'Active operational vouchers',
        accentColor: 'blue',
      },
      {
        id: 'utilities-total',
        label: 'Utilities & Facilities',
        format: 'currency',
        getValue: (data) => data.filter((d: ExpenseRecord) => ['Utilities', 'Maintenance'].includes(d.categoryName)).reduce((acc: number, c: ExpenseRecord) => acc + c.amount, 0),
        subtitle: (data) => {
          const total = data.reduce((acc: number, c: ExpenseRecord) => acc + c.amount, 0);
          const util = data.filter((d: ExpenseRecord) => ['Utilities', 'Maintenance'].includes(d.categoryName)).reduce((acc: number, c: ExpenseRecord) => acc + c.amount, 0);
          return total ? `${Math.round((util / total) * 100)}% of opex` : '0%';
        },
        accentColor: 'amber',
      },
      {
        id: 'comm-postage',
        label: 'Logistics & Communication',
        format: 'currency',
        getValue: (data) => data.filter((d: ExpenseRecord) => ['Communication', 'Postal Charges', 'Transport'].includes(d.categoryName)).reduce((acc: number, c: ExpenseRecord) => acc + c.amount, 0),
        subtitle: () => 'Courier, phone & transport',
        accentColor: 'purple',
      },
      {
        id: 'active-categories',
        label: 'Active OpEx Heads',
        format: 'number',
        getValue: (data) => new Set(data.map((d: ExpenseRecord) => d.categoryName)).size,
        subtitle: () => 'Accounting cost centers',
        accentColor: 'green',
      },
    ],
    chartConfig: {
      type: 'BAR',
      xAxisKey: 'category',
      series: [
        { key: 'amount', name: 'Category Total (LKR)', color: '#6366F1' },
      ],
      getChartData: (filteredData) => {
        const catMap: Record<string, number> = {};
        filteredData.forEach((d: ExpenseRecord) => {
          catMap[d.categoryName] = (catMap[d.categoryName] || 0) + d.amount;
        });
        return Object.entries(catMap)
          .sort(([, a], [, b]) => b - a)
          .map(([category, amount]) => ({ category, amount }));
      },
    },
    columns: [
      { id: 'expenseDate', header: 'Disbursement Date', accessorKey: 'expenseDate', align: 'left', format: 'date' },
      { id: 'categoryName', header: 'OpEx Classification', accessorKey: 'categoryName', align: 'left', format: 'badge' },
      { id: 'remarks', header: 'Purpose & Remarks', accessorKey: 'remarks', align: 'left' },
      { id: 'paymentMethod', header: 'Payment Method', accessorKey: 'paymentMethod', align: 'center', format: 'badge' },
      { id: 'createdByName', header: 'Created By', accessorKey: 'createdByName', align: 'left' },
      { id: 'amount', header: 'Voucher Cost (LKR)', accessorKey: 'amount', align: 'right', format: 'currency' },
    ],
    getData: (db, filters) => {
      return db.expenses.filter((e: ExpenseRecord) => {
        if (!isDateInRange(e.expenseDate, filters.dateRange.startDate, filters.dateRange.endDate)) return false;
        if (filters.category && filters.category !== 'ALL' && e.categoryName !== filters.category) return false;
        return true;
      });
    },
  },

  // 3. Income & Realized Sales Report (Database: model Order where status = DELIVERED)
  {
    id: 'income-summary',
    name: 'Income & Realized Sales Report',
    description: 'Summary of realized sales collections from verified delivered customer orders across regional destinations.',
    category: 'INCOME',
    groupCategory: 'FINANCE',
    badgeText: 'Revenue',
    badgeType: 'standard',
    icon: TrendingUp,
    supportedFilters: ['dateRange', 'team'],
    kpis: [
      {
        id: 'total-income',
        label: 'Gross Realized Sales',
        format: 'currency',
        getValue: (data) => data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + (Number(curr.totalAmount) || 0), 0),
        subtitle: (data) => `${data.length} delivered order consignments`,
        accentColor: 'green',
      },
      {
        id: 'avg-order-val',
        label: 'Average Order Value',
        format: 'currency',
        getValue: (data) => data.length ? Math.round(data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + (Number(curr.totalAmount) || 0), 0) / data.length) : 0,
        subtitle: () => 'Per delivered order',
        accentColor: 'blue',
      },
      {
        id: 'total-cogs',
        label: 'Delivered Product COGS',
        format: 'currency',
        getValue: (data) => data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + (Number(curr.cogs) || 0), 0),
        subtitle: (data) => {
          const rev = data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + (Number(curr.totalAmount) || 0), 0);
          const cogs = data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + (Number(curr.cogs) || 0), 0);
          return rev ? `${((cogs / rev) * 100).toFixed(1)}% of gross revenue` : '0%';
        },
        accentColor: 'amber',
      },
      {
        id: 'realized-profit',
        label: 'Realized Gross Margin',
        format: 'currency',
        getValue: (data) => data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + (Number(curr.grossProfit) || 0), 0),
        subtitle: (data) => {
          const rev = data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + (Number(curr.totalAmount) || 0), 0);
          const gp = data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + (Number(curr.grossProfit) || 0), 0);
          return rev ? `${((gp / rev) * 100).toFixed(1)}% trading margin` : '0%';
        },
        accentColor: 'purple',
      },
    ],
    chartConfig: {
      type: 'AREA',
      xAxisKey: 'period',
      series: [
        { key: 'amount', name: 'Realized Revenue (LKR)', color: '#10B981' },
        { key: 'grossProfit', name: 'Gross Margin (LKR)', color: '#6366F1' },
      ],
      getChartData: (filteredData) => {
        if (!filteredData || filteredData.length === 0) return [];

        const dateMap: Record<
          string,
          {
            period: string;
            dateSortKey: string;
            amount: number;
            grossProfit: number;
            cogs: number;
            ordersCount: number;
          }
        > = {};

        filteredData.forEach((d: DeliveredOrderRecord) => {
          const dateStr = d.deliveredAt
            ? d.deliveredAt.split('T')[0]
            : (d.createdAt ? d.createdAt.split('T')[0] : '');
          if (!dateStr) return;

          if (!dateMap[dateStr]) {
            let label = dateStr;
            try {
              label = format(parseISO(dateStr), 'dd MMM');
            } catch {
              label = dateStr;
            }
            dateMap[dateStr] = {
              period: label,
              dateSortKey: dateStr,
              amount: 0,
              grossProfit: 0,
              cogs: 0,
              ordersCount: 0,
            };
          }
          dateMap[dateStr].amount += Number(d.totalAmount) || 0;
          dateMap[dateStr].grossProfit += Number(d.grossProfit) || 0;
          dateMap[dateStr].cogs += Number(d.cogs) || 0;
          dateMap[dateStr].ordersCount += 1;
        });

        return Object.values(dateMap).sort((a, b) =>
          a.dateSortKey.localeCompare(b.dateSortKey)
        );
      },
    },
    columns: [
      { id: 'deliveredAt', header: 'Delivered Date', accessorKey: 'deliveredAt', align: 'left', format: 'date' },
      { id: 'orderNumber', header: 'Order #', accessorKey: 'orderNumber', align: 'left', format: 'badge' },
      { id: 'customerName', header: 'Customer Party', accessorKey: 'customerName', align: 'left' },
      { id: 'city', header: 'Destination City', accessorKey: 'city', align: 'left', format: 'badge' },
      { id: 'team', header: 'Team', accessorKey: 'teamName', align: 'left', format: 'badge' },
      { id: 'cogs', header: 'COGS (LKR)', accessorKey: 'cogs', align: 'right', format: 'currency' },
      { id: 'grossProfit', header: 'Gross Margin (LKR)', accessorKey: 'grossProfit', align: 'right', format: 'currency' },
      { id: 'totalAmount', header: 'Revenue (LKR)', accessorKey: 'totalAmount', align: 'right', format: 'currency' },
    ],
    pdfConfig: {
      orientation: 'portrait',
      columns: [
        { header: 'Delivered Date', accessorKey: 'deliveredAt', align: 'left', format: 'date', widthMm: 24 },
        { header: 'Order #', accessorKey: 'orderNumber', align: 'left', widthMm: 26 },
        { header: 'Customer Party', accessorKey: 'customerName', align: 'left', widthMm: 38 },
        { header: 'Destination City', accessorKey: 'city', align: 'left', widthMm: 24 },
        { header: 'Team', accessorKey: 'teamName', align: 'left', widthMm: 24 },
        { header: 'COGS', accessorKey: 'cogs', align: 'right', format: 'currency', widthMm: 22 },
        { header: 'Net Revenue', accessorKey: 'totalAmount', align: 'right', format: 'currency', widthMm: 26 },
      ],
      summaryLines: (data) => {
        const totalConsignments = data.length;
        const totalRevenue = data.reduce((acc: number, curr: any) => acc + (Number(curr.totalAmount) || 0), 0);
        const totalCogs = data.reduce((acc: number, curr: any) => acc + (Number(curr.cogs) || 0), 0);
        const totalProfit = totalRevenue - totalCogs;
        const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

        return [
          { label: 'Total Verified Consignments Delivered:', value: `${totalConsignments.toLocaleString()} shipments`, isBold: false },
          { label: 'Gross Realized Collections (Revenue):', value: formatCurrency(totalRevenue), isBold: true, isHighlight: true },
          { label: 'Total Product Acquisition Cost (COGS):', value: formatCurrency(totalCogs), isBold: false },
          { label: 'Realized Gross Trading Margin:', value: `${formatCurrency(totalProfit)} (${margin}%)`, isBold: true },
        ];
      },
    },
    getData: (db, filters) => {
      const items: DeliveredOrderRecord[] = Array.isArray(db) ? db : [];
      return items.filter((o: DeliveredOrderRecord) => {
        if (!isDateInRange(o.deliveredAt, filters.dateRange.startDate, filters.dateRange.endDate)) return false;
        if (filters.teamId && filters.teamId !== 'ALL' && o.teamId !== filters.teamId) return false;
        if (filters.search && filters.search.trim()) {
          const q = filters.search.toLowerCase().trim();
          const matchOrder = (o.orderNumber || '').toLowerCase().includes(q);
          const matchCust = (o.customerName || '').toLowerCase().includes(q);
          const matchCity = (o.city || '').toLowerCase().includes(q);
          const matchTeam = (o.teamName || '').toLowerCase().includes(q);
          return matchOrder || matchCust || matchCity || matchTeam;
        }
        return true;
      });
    },
  },

  // 4. Cash Flow Statement (Database: Order.deliveredAt inflows vs Expense & PettyCash outflows)
  {
    id: 'cash-flow',
    name: 'Cash Flow Statement',
    description: 'Chronological statement of cash liquidity, customer receipts, operating expenses, and net cash movement.',
    category: 'SUMMARY',
    groupCategory: 'FINANCE',
    badgeText: 'Treasury & Cash',
    badgeType: 'executive',
    icon: ArrowUpRight,
    supportedFilters: ['dateRange'],
    kpis: [
      {
        id: 'total-inflows',
        label: 'Operational Inflows',
        format: 'currency',
        getValue: (data) => (data && !Array.isArray(data)) ? (data.inflows ?? 0) : 0,
        subtitle: () => 'Customer remittances deposited',
        accentColor: 'green',
      },
      {
        id: 'total-outflows',
        label: 'Operational Outflows',
        format: 'currency',
        getValue: (data) => (data && !Array.isArray(data)) ? (data.outflows ?? 0) : 0,
        subtitle: () => 'Operating expenses & petty cash',
        accentColor: 'red',
      },
      {
        id: 'net-cash-flow',
        label: 'Net Liquidity Movement',
        format: 'currency',
        getValue: (data) => (data && !Array.isArray(data)) ? (data.netCashFlow ?? 0) : 0,
        subtitle: (data) => ((data && !Array.isArray(data) ? (data.netCashFlow ?? 0) : 0) >= 0)
          ? '+ Positive net generation'
          : '- Net liquidity deficit',
        accentColor: 'blue',
      },
      {
        id: 'ending-cash',
        label: 'Audited Float Vault',
        format: 'currency',
        getValue: (data) => (data && !Array.isArray(data) && typeof data.walletBalance === 'number') ? data.walletBalance : 0,
        subtitle: () => 'Current petty cash balance',
        accentColor: 'purple',
      },
    ],
    chartConfig: {
      type: 'COMPOSED',
      xAxisKey: 'period',
      series: [
        { key: 'inflows', name: 'Cash Inflow (LKR)', color: '#10B981', type: 'bar' },
        { key: 'outflows', name: 'Cash Outflow (LKR)', color: '#F43F5E', type: 'bar' },
        { key: 'net', name: 'Net Cash Flow (LKR)', color: '#2563EB', type: 'line' },
      ],
      getChartData: (data) => {
        // Guard: during loading, data is [] instead of the expected cash-flow object
        if (!data || Array.isArray(data) || !data.incomes || !data.expenses) return [];
        const monthMap: Record<string, { inflows: number; outflows: number }> = {};
        (data.incomes as DeliveredOrderRecord[]).forEach((i) => {
          const m = i.deliveredAt.substring(0, 7);
          if (!monthMap[m]) monthMap[m] = { inflows: 0, outflows: 0 };
          monthMap[m].inflows += Number(i.totalAmount) || 0;
        });
        (data.expenses as ExpenseRecord[]).forEach((e) => {
          const m = e.expenseDate.substring(0, 7);
          if (!monthMap[m]) monthMap[m] = { inflows: 0, outflows: 0 };
          monthMap[m].outflows += Number(e.amount) || 0;
        });
        return Object.entries(monthMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([period, val]) => ({
            period: format(parseISO(`${period}-01`), 'MMM yyyy'),
            inflows: val.inflows,
            outflows: val.outflows,
            net: val.inflows - val.outflows,
          }));
      },
    },
    columns: [
      { id: 'date', header: 'Movement Date', accessorKey: 'date', align: 'left', format: 'date' },
      { id: 'type', header: 'Flow Direction', accessorKey: 'type', align: 'center', format: 'badge' },
      { id: 'description', header: 'Transaction Description', accessorKey: 'description', align: 'left' },
      { id: 'amount', header: 'Amount (LKR)', accessorKey: 'amount', align: 'right', format: 'currency' },
    ],
    getData: (db, filters) => {
      const incs = (db.deliveredOrders || []).filter((i: DeliveredOrderRecord) => isDateInRange(i.deliveredAt, filters.dateRange.startDate, filters.dateRange.endDate));
      const exps = (db.expenses || []).filter((e: ExpenseRecord) => isDateInRange(e.expenseDate, filters.dateRange.startDate, filters.dateRange.endDate));

      const inflows = incs.reduce((acc: number, c: DeliveredOrderRecord) => acc + (Number(c.totalAmount) || 0), 0);
      const outflows = exps.reduce((acc: number, c: ExpenseRecord) => acc + (Number(c.amount) || 0), 0);
      const netCashFlow = inflows - outflows;

      const rows = [
        ...incs.map((i: DeliveredOrderRecord) => ({
          id: `in_${i.id}`,
          date: i.deliveredAt,
          type: 'INFLOW',
          description: i.orderNumber
            ? `Sales collection — ${i.orderNumber}${i.customerName ? ` (${i.customerName}${i.city ? `, ${i.city}` : ''})` : ''}`
            : 'Sales collection',
          amount: Number(i.totalAmount) || 0,
        })),
        ...exps.map((e: ExpenseRecord) => ({
          id: `out_${e.id}`,
          date: e.expenseDate,
          type: 'OUTFLOW',
          description: `${e.categoryName}: ${e.remarks}`,
          amount: Number(e.amount) || 0,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // walletBalance forwarded from live data for the KPI card
      const walletBalance: number = typeof db.walletBalance === 'number' ? db.walletBalance : 0;

      return { inflows, outflows, netCashFlow, incomes: incs, expenses: exps, rows, walletBalance };
    },
  },

  // 5. Product Cost & Inventory Valuation Report (Database: model Product & StockBatch)
  {
    id: 'product-cost',
    name: 'Product Cost & Inventory Valuation',
    description: 'Financial stock audit of unit acquisition costs, physical stock valuation, and catalog gross margins.',
    category: 'ASSETS',
    groupCategory: 'FINANCE',
    badgeText: 'Asset Valuation',
    badgeType: 'standard',
    icon: Boxes,
    supportedFilters: ['dateRange', 'team'],
    kpis: [
      {
        id: 'total-asset-val',
        label: 'Total Stock Valuation (Cost)',
        format: 'currency',
        getValue: (data) => data.reduce((acc: number, curr: ProductCostRecord) => acc + curr.stockValue, 0),
        subtitle: (data) => `${data.reduce((a: number, c: ProductCostRecord) => a + c.currentStock, 0).toLocaleString()} physical units in warehouse`,
        accentColor: 'blue',
      },
      {
        id: 'realized-cogs',
        label: 'Realized Cumulative COGS',
        format: 'currency',
        getValue: (data) => data.reduce((acc: number, curr: ProductCostRecord) => acc + curr.cogs, 0),
        subtitle: () => 'On delivered customer orders',
        accentColor: 'amber',
      },
      {
        id: 'gross-trading-profit',
        label: 'Gross Realized Profit',
        format: 'currency',
        getValue: (data) => data.reduce((acc: number, curr: ProductCostRecord) => acc + curr.grossProfit, 0),
        subtitle: (data) => {
          const rev = data.reduce((acc: number, curr: ProductCostRecord) => acc + curr.salesRevenue, 0);
          const gp = data.reduce((acc: number, curr: ProductCostRecord) => acc + curr.grossProfit, 0);
          return rev ? `${((gp / rev) * 100).toFixed(1)}% catalog margin` : '0%';
        },
        accentColor: 'green',
      },
      {
        id: 'active-skus',
        label: 'Active Catalog SKUs',
        format: 'number',
        getValue: (data) => data.length,
        subtitle: () => 'Physical merchandise items',
        accentColor: 'purple',
      },
    ],
    chartConfig: {
      type: 'GROUPED_BAR',
      xAxisKey: 'name',
      series: [
        { key: 'costPrice', name: 'Unit Cost (LKR)', color: '#64748B' },
        { key: 'sellingPrice', name: 'Selling Price (LKR)', color: '#10B981' },
      ],
      getChartData: (filteredData) => {
        return (filteredData || []).map((d: ProductCostRecord) => ({
          name: d.name || d.code,
          code: d.code,
          costPrice: Number(d.costPrice) || 0,
          sellingPrice: Number(d.sellingPrice) || 0,
        }));
      },
    },
    columns: [
      { id: 'code', header: 'Product Code', accessorKey: 'code', align: 'left', format: 'badge' },
      { id: 'name', header: 'Merchandise Title', accessorKey: 'name', align: 'left' },
      { id: 'team', header: 'Team', accessorKey: 'teamName', align: 'left', format: 'badge' },
      { id: 'costPrice', header: 'Unit Cost (LKR)', accessorKey: 'costPrice', align: 'right', format: 'currency' },
      { id: 'sellingPrice', header: 'Selling Price (LKR)', accessorKey: 'sellingPrice', align: 'right', format: 'currency' },
      { id: 'currentStock', header: 'In Stock', accessorKey: 'currentStock', align: 'center' },
      { id: 'stockValue', header: 'Holding Value (Cost)', accessorKey: 'stockValue', align: 'right', format: 'currency' },
      { id: 'margin', header: 'Gross Margin', accessorKey: 'margin', align: 'center', format: 'badge' },
    ],
    pdfConfig: {
      orientation: 'portrait',
      columns: [
        { header: 'Product Code', accessorKey: 'code', align: 'left', widthMm: 26 },
        { header: 'Merchandise Title', accessorKey: 'name', align: 'left', widthMm: 46 },
        { header: 'Team', accessorKey: 'teamName', align: 'left', widthMm: 26 },
        { header: 'Unit Cost', accessorKey: 'costPrice', align: 'right', format: 'currency', widthMm: 22 },
        { header: 'Selling Price', accessorKey: 'sellingPrice', align: 'right', format: 'currency', widthMm: 22 },
        { header: 'In Stock', accessorKey: 'currentStock', align: 'center', format: 'number', widthMm: 16 },
        { header: 'Total Value (Cost)', accessorKey: 'stockValue', align: 'right', format: 'currency', widthMm: 26 },
      ],
      summaryLines: (data) => {
        const totalUnits = data.reduce((acc: number, curr: any) => acc + (Number(curr.currentStock) || 0), 0);
        const totalCostVal = data.reduce((acc: number, curr: any) => acc + (Number(curr.stockValue) || 0), 0);
        const totalRetailVal = data.reduce((acc: number, curr: any) => acc + ((Number(curr.currentStock) || 0) * (Number(curr.sellingPrice) || 0)), 0);
        const potentialProfit = totalRetailVal - totalCostVal;
        const potentialMargin = totalRetailVal > 0 ? ((potentialProfit / totalRetailVal) * 100).toFixed(1) : '0.0';

        return [
          { label: 'Total Physical Units in Warehouse:', value: `${totalUnits.toLocaleString()} units`, isBold: false },
          { label: 'Total Inventory Asset Valuation (Cost):', value: formatCurrency(totalCostVal), isBold: true, isHighlight: true },
          { label: 'Potential Gross Retail Sales Value:', value: formatCurrency(totalRetailVal), isBold: false },
          { label: 'Potential Unrealized Catalog Margin:', value: `${potentialMargin}%`, isBold: true },
        ];
      },
    },
    getData: (db, filters) => {
      const items: ProductCostRecord[] = Array.isArray(db) ? db : (db.products || []);
      return items.filter((p: ProductCostRecord) => {
        if (filters.teamId && filters.teamId !== 'ALL' && p.teamId !== filters.teamId) return false;
        if (filters.search && filters.search.trim()) {
          const q = filters.search.toLowerCase();
          return (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q);
        }
        return true;
      });
    },
  },

  // 6. Petty Cash Float & Allocation Report (Database: model PettyCashAllocation + PettyCashTransaction)
  {
    id: 'petty-cash',
    name: 'Petty Cash Float & Allocation Report',
    description: 'Working cash float disbursements, allocation deposits, and vault balance ledger.',
    category: 'ASSETS',
    groupCategory: 'FINANCE',
    badgeText: 'Working Float',
    badgeType: 'standard',
    icon: Wallet,
    supportedFilters: ['dateRange'],
    kpis: [
      {
        id: 'total-float-disbursed',
        label: 'Total Vouchers Disbursed',
        format: 'currency',
        getValue: (data) => data.filter((d: PettyCashTransactionRecord) => d.transactionType === 'EXPENSE').reduce((acc: number, c: PettyCashTransactionRecord) => acc + c.amount, 0),
        subtitle: (data) => `${data.filter((d: PettyCashTransactionRecord) => d.transactionType === 'EXPENSE').length} petty cash vouchers`,
        accentColor: 'blue',
      },
      {
        id: 'total-float-allocated',
        label: 'Float Replenishments',
        format: 'currency',
        getValue: (data) => data.filter((d: PettyCashTransactionRecord) => d.transactionType === 'ALLOCATION').reduce((acc: number, c: PettyCashTransactionRecord) => acc + c.amount, 0),
        subtitle: () => 'Bank float deposits',
        accentColor: 'purple',
      },
      {
        id: 'avg-pc-voucher',
        label: 'Average Voucher Size',
        format: 'currency',
        getValue: (data) => {
          const disb = data.filter((d: PettyCashTransactionRecord) => d.transactionType === 'EXPENSE');
          return disb.length ? Math.round(disb.reduce((a: number, c: PettyCashTransactionRecord) => a + c.amount, 0) / disb.length) : 0;
        },
        subtitle: () => 'Per incidental voucher',
        accentColor: 'amber',
      },
      {
        id: 'available-float',
        label: 'Current Working Float',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? ((data as any)._walletBalance ?? 0) : 0,
        subtitle: () => 'Audited vault balance',
        accentColor: 'green',
      },
    ],
    chartConfig: {
      type: 'BAR',
      xAxisKey: 'category',
      series: [
        { key: 'amount', name: 'Disbursement (LKR)', color: '#F59E0B' },
      ],
      getChartData: (filteredData) => {
        const catMap: Record<string, number> = {};
        filteredData
          .filter((d: PettyCashTransactionRecord) => d.transactionType === 'EXPENSE')
          .forEach((d: PettyCashTransactionRecord) => {
            catMap[d.category] = (catMap[d.category] || 0) + d.amount;
          });
        return Object.entries(catMap).map(([category, amount]) => ({ category, amount }));
      },
    },
    columns: [
      { id: 'date', header: 'Disbursement Date', accessorKey: 'date', align: 'left', format: 'date' },
      { id: 'allocationCode', header: 'Allocation Code', accessorKey: 'allocationCode', align: 'left', format: 'badge' },
      { id: 'category', header: 'Classification', accessorKey: 'category', align: 'left', format: 'badge' },
      { id: 'description', header: 'Voucher Description', accessorKey: 'description', align: 'left' },
      { id: 'userName', header: 'Disbursed To', accessorKey: 'userName', align: 'left' },
      { id: 'amount', header: 'Amount (LKR)', accessorKey: 'amount', align: 'right', format: 'currency' },
      { id: 'remainingBalance', header: 'Vault Balance', accessorKey: 'remainingBalance', align: 'right', format: 'currency' },
    ],
    getData: (db, filters) => {
      // Support live db-object format or direct array
      const txns: PettyCashTransactionRecord[] = Array.isArray(db)
        ? db
        : (db.pettyCashTransactions || []);

      const filtered = txns.filter((p: PettyCashTransactionRecord) => {
        if (!isDateInRange(p.date, filters.dateRange.startDate, filters.dateRange.endDate)) return false;
        return true;
      });

      // Inject walletBalance as a hidden non-enumerable property so the
      // 'available-float' KPI card can read it without breaking array ops.
      const walletBalance: number = Array.isArray(db)
        ? 0
        : (typeof db.walletBalance === 'number' ? db.walletBalance : 0);
      Object.defineProperty(filtered, '_walletBalance', {
        value: walletBalance,
        enumerable: false,
        configurable: true,
        writable: true,
      });

      return filtered;
    },
  },
];
// ─────────────────────────────────────────────────────────────────────────────
// SALES INTELLIGENCE REPORTS (Live from /finance/sales-report & /delivery-report)
// ─────────────────────────────────────────────────────────────────────────────

export const SALES_REPORTS: ReportDefinition[] = [
  // 1. Consignment Realized Sales Ledger
  {
    id: 'consignment-sales',
    name: 'Consignment Realized Sales Ledger',
    description: 'Audited individual delivered order consignments with destination city, team attribution, product costs, and gross margins.',
    category: 'SALES',
    groupCategory: 'SALES',
    badgeText: 'Audit Trail',
    badgeType: 'executive',
    icon: Package,
    supportedFilters: ['dateRange', 'team', 'search'],
    kpis: [
      {
        id: 'realized-total',
        label: 'Gross Realized Sales',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0) : 0,
        subtitle: (data) => `${Array.isArray(data) ? data.length : 0} delivered consignments`,
        accentColor: 'blue',
      },
      {
        id: 'avg-consign-val',
        label: 'Average Consignment Value',
        format: 'currency',
        getValue: (data) => Array.isArray(data) && data.length ? Math.round(data.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0) / data.length) : 0,
        subtitle: () => 'Per delivered order',
        accentColor: 'green',
      },
      {
        id: 'consign-cogs',
        label: 'Direct Inventory COGS',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, o) => s + (Number(o.cogs) || 0), 0) : 0,
        subtitle: (data) => {
          const rev = Array.isArray(data) ? data.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0) : 0;
          const cogs = Array.isArray(data) ? data.reduce((s, o) => s + (Number(o.cogs) || 0), 0) : 0;
          return rev > 0 ? `${((cogs / rev) * 100).toFixed(1)}% of sales revenue` : '0%';
        },
        accentColor: 'amber',
      },
      {
        id: 'consign-margin',
        label: 'Realized Gross Margin',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, o) => s + (Number(o.grossProfit) || 0), 0) : 0,
        subtitle: (data) => {
          const rev = Array.isArray(data) ? data.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0) : 0;
          const gp = Array.isArray(data) ? data.reduce((s, o) => s + (Number(o.grossProfit) || 0), 0) : 0;
          return rev > 0 ? `${((gp / rev) * 100).toFixed(1)}% margin` : '0%';
        },
        accentColor: 'purple',
      },
    ],
    chartConfig: {
      type: 'AREA',
      xAxisKey: 'deliveredAt',
      series: [
        { key: 'totalAmount', name: 'Order Value (LKR)', color: '#01A8F3' },
        { key: 'grossProfit', name: 'Gross Margin (LKR)', color: '#80BD2B' },
      ],
      getChartData: (data) => {
        if (!Array.isArray(data)) return [];
        const map: Record<string, { totalAmount: number; grossProfit: number }> = {};
        data.forEach((o: any) => {
          const d = o.deliveredAt ? o.deliveredAt.split('T')[0] : 'Unknown';
          if (!map[d]) map[d] = { totalAmount: 0, grossProfit: 0 };
          map[d].totalAmount += Number(o.totalAmount) || 0;
          map[d].grossProfit += Number(o.grossProfit) || 0;
        });
        return Object.entries(map)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, vals]) => ({ deliveredAt: date, ...vals }));
      },
    },
    columns: [
      { id: 'deliveredAt', header: 'Delivered Date', accessorKey: 'deliveredAt', format: 'date' },
      { id: 'orderNumber', header: 'Order #', accessorKey: 'orderNumber', format: 'badge' },
      { id: 'customerName', header: 'Customer Party', accessorKey: 'customerName' },
      { id: 'city', header: 'Destination City', accessorKey: 'city', format: 'badge' },
      { id: 'teamName', header: 'Team Brand', accessorKey: 'teamName', format: 'badge' },
      { id: 'cogs', header: 'COGS', accessorKey: 'cogs', align: 'right', format: 'currency' },
      { id: 'grossProfit', header: 'Gross Profit', accessorKey: 'grossProfit', align: 'right', format: 'currency' },
      { id: 'totalAmount', header: 'Order Total', accessorKey: 'totalAmount', align: 'right', format: 'currency' },
      { 
        id: 'marginPct', 
        header: 'Margin %', 
        accessorKey: 'marginPct', 
        align: 'right',
        cell: (row) => {
          const rev = Number(row.totalAmount) || 0;
          const gp = Number(row.grossProfit) || 0;
          const pct = row.marginPct || (rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%');
          return React.createElement('span', { className: 'font-bold text-[#547E1B]' }, pct);
        }
      },
    ],
    pdfConfig: {
      orientation: 'landscape',
      columns: [
        { header: 'Delivered Date', accessorKey: 'deliveredAt', align: 'left', format: 'date', widthMm: 28 },
        { header: 'Order #', accessorKey: 'orderNumber', align: 'left', widthMm: 24 },
        { header: 'Customer Party', accessorKey: 'customerName', align: 'left', widthMm: 44 },
        { header: 'Destination City', accessorKey: 'city', align: 'left', widthMm: 30 },
        { header: 'Team Brand', accessorKey: 'teamName', align: 'left', widthMm: 30 },
        { header: 'COGS', accessorKey: 'cogs', align: 'right', format: 'currency', widthMm: 28 },
        { header: 'Gross Profit', accessorKey: 'grossProfit', align: 'right', format: 'currency', widthMm: 28 },
        { header: 'Order Total', accessorKey: 'totalAmount', align: 'right', format: 'currency', widthMm: 32 },
        { header: 'Margin %', accessorKey: 'marginPct', align: 'right', format: 'text', widthMm: 22 },
      ],
      summaryLines: (data) => {
        const rev = data.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0);
        const cogs = data.reduce((s: number, o: any) => s + (Number(o.cogs) || 0), 0);
        const gp = data.reduce((s: number, o: any) => s + (Number(o.grossProfit) || 0), 0);
        const overallMargin = rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%';
        return [
          { label: 'Delivered Consignments Audited:', value: `${data.length.toLocaleString()} orders`, isBold: true },
          { label: 'Total Inventory COGS:', value: formatCurrency(cogs) },
          { label: 'Realized Gross Profit:', value: `${formatCurrency(gp)} (${overallMargin})`, isBold: true },
          { label: 'Cumulative Realized Sales Revenue:', value: formatCurrency(rev), isBold: true, isHighlight: true },
        ];
      },
    },
    getData: (allData, filters) => {
      const items = Array.isArray(allData) ? allData : [];
      return items.map((o: any) => {
        const rev = Number(o.totalAmount) || 0;
        const gp = Number(o.grossProfit) || 0;
        const marginPct = rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%';
        return { ...o, marginPct };
      }).filter((o: any) => {
        if (!isDateInRange(o.deliveredAt, filters.dateRange.startDate, filters.dateRange.endDate)) return false;
        if (filters.teamId && filters.teamId !== 'ALL' && o.teamId !== filters.teamId) return false;
        if (filters.search && filters.search.trim()) {
          const q = filters.search.toLowerCase().trim();
          const matchOrder = (o.orderNumber || '').toLowerCase().includes(q);
          const matchCust = (o.customerName || '').toLowerCase().includes(q);
          const matchCity = (o.city || '').toLowerCase().includes(q);
          const matchTeam = (o.teamName || '').toLowerCase().includes(q);
          return matchOrder || matchCust || matchCity || matchTeam;
        }
        return true;
      });
    },
  },

  // 2. Contact Batch-Wise Performance Report
  {
    id: 'contact-batch-report',
    name: 'Contact Batch-Wise Performance Report',
    description: 'Audited lead batch analytics, conversion funnel from imported contacts to saved customers, interested leads, and completed delivered orders.',
    category: 'SALES',
    groupCategory: 'SALES',
    badgeText: 'Batch Intelligence',
    badgeType: 'executive',
    icon: Boxes,
    supportedFilters: ['dateRange', 'team', 'search'],
    kpis: [
      {
        id: 'total-batch-contacts',
        label: 'Total Imported Contacts',
        format: 'number',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, b) => s + (Number(b.totalContacts) || 0), 0) : 0,
        subtitle: (data) => `${Array.isArray(data) ? data.length : 0} active lead batches`,
        accentColor: 'blue',
      },
      {
        id: 'saved-contacts-count',
        label: 'Contacts Saved to Customer',
        format: 'number',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, b) => s + (Number(b.savedContacts) || 0), 0) : 0,
        subtitle: (data) => {
          const tot = Array.isArray(data) ? data.reduce((s, b) => s + (Number(b.totalContacts) || 0), 0) : 0;
          const saved = Array.isArray(data) ? data.reduce((s, b) => s + (Number(b.savedContacts) || 0), 0) : 0;
          return tot > 0 ? `${((saved / tot) * 100).toFixed(1)}% save conversion rate` : '0%';
        },
        accentColor: 'purple',
      },
      {
        id: 'interested-leads-count',
        label: 'Reached Interested Stage',
        format: 'number',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, b) => s + (Number(b.interestedContacts) || 0), 0) : 0,
        subtitle: (data) => {
          const tot = Array.isArray(data) ? data.reduce((s, b) => s + (Number(b.totalContacts) || 0), 0) : 0;
          const int = Array.isArray(data) ? data.reduce((s, b) => s + (Number(b.interestedContacts) || 0), 0) : 0;
          return tot > 0 ? `${((int / tot) * 100).toFixed(1)}% interested conversion` : '0%';
        },
        accentColor: 'amber',
      },
      {
        id: 'delivered-orders-count',
        label: 'Orders Delivered',
        format: 'number',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, b) => s + (Number(b.deliveredContacts) || 0), 0) : 0,
        subtitle: (data) => {
          const rev = Array.isArray(data) ? data.reduce((s, b) => s + (Number(b.deliveredRevenue) || 0), 0) : 0;
          return `Realized: ${formatCurrency(rev)}`;
        },
        accentColor: 'green',
      },
    ],
    chartConfig: {
      type: 'GROUPED_BAR',
      xAxisKey: 'batchCode',
      series: [
        { key: 'totalContacts', name: 'Total Contacts', color: '#01A8F3' },
        { key: 'interestedContacts', name: 'Interested Stage', color: '#F59E0B' },
        { key: 'deliveredContacts', name: 'Delivered Orders', color: '#80BD2B' },
      ],
      getChartData: (data) => {
        if (!Array.isArray(data)) return [];
        return data.slice(0, 10).map((b: any) => ({
          batchCode: b.batchCode || 'Batch',
          totalContacts: Number(b.totalContacts) || 0,
          interestedContacts: Number(b.interestedContacts) || 0,
          deliveredContacts: Number(b.deliveredContacts) || 0,
        }));
      },
    },
    columns: [
      {
        id: 'batchCode',
        header: 'Batch Code / ID',
        accessorKey: 'batchCode',
        format: 'text',
        cell: (row) => {
          return React.createElement(
            'div',
            { className: 'flex flex-col' },
            React.createElement('span', { className: 'font-mono font-bold text-[#0188C7] text-xs' }, row.batchCode || 'Batch'),
            React.createElement('span', { className: 'text-[11px] text-slate-400' }, row.importedAt || '')
          );
        },
      },
      { id: 'teamName', header: 'Team / Brand', accessorKey: 'teamName', format: 'badge' },
      { id: 'totalContacts', header: 'Total Contacts', accessorKey: 'totalContacts', align: 'center', format: 'number' },
      { id: 'savedContacts', header: 'Saved', accessorKey: 'savedContacts', align: 'center', format: 'number' },
      { id: 'interestedContacts', header: 'Interested Stage', accessorKey: 'interestedContacts', align: 'center', format: 'number' },
      {
        id: 'interestedRate',
        header: 'Interested %',
        accessorKey: 'interestedRate',
        align: 'center',
        cell: (row) => {
          const rateVal = parseFloat(String(row.interestedRate || '0'));
          const isGood = rateVal >= 30;
          return React.createElement(
            'span',
            {
              className: `px-2 py-0.5 rounded-full text-[11px] font-bold ${
                isGood
                  ? 'bg-[#E8F7FE] text-[#0188C7] border border-[#B9E7FC]'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`,
            },
            row.interestedRate || '0.0%'
          );
        },
      },
      { id: 'deliveredContacts', header: 'Delivered', accessorKey: 'deliveredContacts', align: 'center', format: 'number' },
      {
        id: 'deliveryRate',
        header: 'Delivered %',
        accessorKey: 'deliveryRate',
        align: 'center',
        cell: (row) => {
          const rateVal = parseFloat(String(row.deliveryRate || '0'));
          const isGood = rateVal >= 15;
          return React.createElement(
            'span',
            {
              className: `px-2 py-0.5 rounded-full text-[11px] font-bold ${
                isGood
                  ? 'bg-[#F2F9E9] text-[#547E1B] border border-[#D4ECC6]'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`,
            },
            row.deliveryRate || '0.0%'
          );
        },
      },
      { id: 'followUpContacts', header: 'Follow Up', accessorKey: 'followUpContacts', align: 'center', format: 'number' },
      { id: 'phoneOffContacts', header: 'Phone Off', accessorKey: 'phoneOffContacts', align: 'center', format: 'number' },
      { id: 'notAnsweredContacts', header: 'Not Answered', accessorKey: 'notAnsweredContacts', align: 'center', format: 'number' },
      { id: 'deliveredRevenue', header: 'Realized Revenue', accessorKey: 'deliveredRevenue', align: 'right', format: 'currency' },
    ],
    pdfConfig: {
      orientation: 'landscape',
      columns: [
        { header: 'Batch Code', accessorKey: 'batchCode', align: 'left', widthMm: 30 },
        { header: 'Team / Brand', accessorKey: 'teamName', align: 'left', widthMm: 28 },
        { header: 'Total Leads', accessorKey: 'totalContacts', align: 'center', format: 'number', widthMm: 20 },
        { header: 'Saved', accessorKey: 'savedContacts', align: 'center', format: 'number', widthMm: 16 },
        { header: 'Interested', accessorKey: 'interestedContacts', align: 'center', format: 'number', widthMm: 20 },
        { header: 'Interest %', accessorKey: 'interestedRate', align: 'center', format: 'text', widthMm: 20 },
        { header: 'Delivered', accessorKey: 'deliveredContacts', align: 'center', format: 'number', widthMm: 18 },
        { header: 'Deliver %', accessorKey: 'deliveryRate', align: 'center', format: 'text', widthMm: 18 },
        { header: 'Follow Up', accessorKey: 'followUpContacts', align: 'center', format: 'number', widthMm: 18 },
        { header: 'Phone Off', accessorKey: 'phoneOffContacts', align: 'center', format: 'number', widthMm: 18 },
        { header: 'No Answer', accessorKey: 'notAnsweredContacts', align: 'center', format: 'number', widthMm: 18 },
        { header: 'Realized Sales', accessorKey: 'deliveredRevenue', align: 'right', format: 'currency', widthMm: 32 },
      ],
      summaryLines: (data) => {
        const totalLeads = data.reduce((s: number, b: any) => s + (Number(b.totalContacts) || 0), 0);
        const totalSaved = data.reduce((s: number, b: any) => s + (Number(b.savedContacts) || 0), 0);
        const totalInt = data.reduce((s: number, b: any) => s + (Number(b.interestedContacts) || 0), 0);
        const totalDel = data.reduce((s: number, b: any) => s + (Number(b.deliveredContacts) || 0), 0);
        const totalRev = data.reduce((s: number, b: any) => s + (Number(b.deliveredRevenue) || 0), 0);
        const overallIntRate = totalLeads > 0 ? `${((totalInt / totalLeads) * 100).toFixed(1)}%` : '0.0%';
        const overallDelRate = totalLeads > 0 ? `${((totalDel / totalLeads) * 100).toFixed(1)}%` : '0.0%';
        const overallSaveRate = totalLeads > 0 ? `${((totalSaved / totalLeads) * 100).toFixed(1)}%` : '0.0%';
        return [
          { label: 'Total Contact Batches Audited:', value: `${data.length.toLocaleString()} batches`, isBold: true },
          { label: 'Total Contacts Saved to Customer:', value: `${totalSaved.toLocaleString()} of ${totalLeads.toLocaleString()} (${overallSaveRate})` },
          { label: 'Leads Reached Interested Stage:', value: `${totalInt.toLocaleString()} leads (${overallIntRate})` },
          { label: 'Orders Successfully Delivered:', value: `${totalDel.toLocaleString()} packages (${overallDelRate})`, isBold: true },
          { label: 'Cumulative Realized Batch Sales Revenue:', value: formatCurrency(totalRev), isBold: true, isHighlight: true },
        ];
      },
    },
    getData: (allData, filters) => {
      const raw = allData && allData.batches ? allData.batches : (Array.isArray(allData) ? allData : []);
      return raw.map((b: any) => {
        const tot = Number(b.totalContacts) || 0;
        const saved = Number(b.savedContacts) || 0;
        const int = Number(b.interestedContacts) || 0;
        const del = Number(b.deliveredContacts) || 0;
        const interestedRate = b.interestedRate || (tot > 0 ? `${((int / tot) * 100).toFixed(1)}%` : '0.0%');
        const deliveryRate = b.deliveryRate || (tot > 0 ? `${((del / tot) * 100).toFixed(1)}%` : '0.0%');
        const savedRate = b.savedRate || (tot > 0 ? `${((saved / tot) * 100).toFixed(1)}%` : '0.0%');
        return {
          ...b,
          interestedRate,
          deliveryRate,
          savedRate,
        };
      }).filter((b: any) => {
        if (!isDateInRange(b.importedAt, filters.dateRange.startDate, filters.dateRange.endDate)) return false;
        if (filters.teamId && filters.teamId !== 'ALL' && b.teamId !== filters.teamId) return false;
        if (filters.search && filters.search.trim()) {
          const q = filters.search.toLowerCase().trim();
          const matchCode = (b.batchCode || '').toLowerCase().includes(q);
          const matchTeam = (b.teamName || '').toLowerCase().includes(q);
          return matchCode || matchTeam;
        }
        return true;
      });
    },
  },

  // 3. Team Member Sales & Performance Report
  {
    id: 'team-member-sales',
    name: 'Team Member Sales & Performance Report',
    description: 'Audited sales revenue, delivered consignments, COGS, and profit margins broken down by individual team members and sales representatives for each team separately.',
    category: 'SALES',
    groupCategory: 'SALES',
    badgeText: 'Team Intelligence',
    badgeType: 'executive',
    icon: Users,
    supportedFilters: ['dateRange', 'team', 'search'],
    kpis: [
      {
        id: 'team-total-revenue',
        label: 'Realized Delivered Revenue',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, m) => s + (Number(m.deliveredRevenue) || 0), 0) : 0,
        subtitle: (data) => {
          const totalBooked = Array.isArray(data) ? data.reduce((s, m) => s + (Number(m.totalSales) || 0), 0) : 0;
          return `Booked: ${formatCurrency(totalBooked)}`;
        },
        accentColor: 'blue',
      },
      {
        id: 'team-orders-fulfilled',
        label: 'Delivered Consignments',
        format: 'number',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, m) => s + (Number(m.deliveredOrders) || 0), 0) : 0,
        subtitle: (data) => {
          const tot = Array.isArray(data) ? data.reduce((s, m) => s + (Number(m.totalOrders) || 0), 0) : 0;
          const del = Array.isArray(data) ? data.reduce((s, m) => s + (Number(m.deliveredOrders) || 0), 0) : 0;
          const rate = tot > 0 ? ((del / tot) * 100).toFixed(1) : '0.0';
          return `${rate}% delivery fulfillment rate`;
        },
        accentColor: 'green',
      },
      {
        id: 'team-gross-profit',
        label: 'Realized Gross Profit',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, m) => s + (Number(m.grossProfit) || 0), 0) : 0,
        subtitle: (data) => {
          const rev = Array.isArray(data) ? data.reduce((s, m) => s + (Number(m.deliveredRevenue) || 0), 0) : 0;
          const gp = Array.isArray(data) ? data.reduce((s, m) => s + (Number(m.grossProfit) || 0), 0) : 0;
          return rev > 0 ? `${((gp / rev) * 100).toFixed(1)}% realized margin` : '0%';
        },
        accentColor: 'purple',
      },
      {
        id: 'active-members-count',
        label: 'Active Sales Reps',
        format: 'number',
        getValue: (data) => Array.isArray(data) ? data.filter((m) => (Number(m.totalOrders) || 0) > 0).length : 0,
        subtitle: (data) => `${Array.isArray(data) ? data.length : 0} registered team members`,
        accentColor: 'amber',
      },
    ],
    chartConfig: {
      type: 'GROUPED_BAR',
      xAxisKey: 'memberName',
      series: [
        { key: 'deliveredRevenue', name: 'Realized Revenue (LKR)', color: '#01A8F3' },
        { key: 'grossProfit', name: 'Gross Profit (LKR)', color: '#80BD2B' },
      ],
      getChartData: (data) => {
        if (!Array.isArray(data)) return [];
        return data.slice(0, 10).map((m: any) => ({
          memberName: m.memberName || 'Agent',
          deliveredRevenue: Number(m.deliveredRevenue) || 0,
          grossProfit: Number(m.grossProfit) || 0,
          totalSales: Number(m.totalSales) || 0,
        }));
      },
    },
    columns: [
      { 
        id: 'memberName', 
        header: 'Sales Representative', 
        accessorKey: 'memberName', 
        format: 'text',
        cell: (row) => {
          return React.createElement('div', { className: 'flex flex-col' },
            React.createElement('span', { className: 'font-bold text-slate-900' }, row.memberName || 'Agent'),
            React.createElement('span', { className: 'text-[11px] text-slate-500 capitalize' }, (row.role || 'Sales Rep').toLowerCase().replace('_', ' '))
          );
        }
      },
      { id: 'teamName', header: 'Team / Brand', accessorKey: 'teamName', format: 'badge' },
      { id: 'totalOrders', header: 'Booked', accessorKey: 'totalOrders', align: 'center', format: 'number' },
      { id: 'deliveredOrders', header: 'Delivered', accessorKey: 'deliveredOrders', align: 'center', format: 'number' },
      { 
        id: 'deliveryRate', 
        header: 'Success Rate', 
        accessorKey: 'deliveryRate', 
        align: 'center',
        cell: (row) => {
          const rateVal = parseFloat(String(row.deliveryRate || '0'));
          const isGood = rateVal >= 60;
          return React.createElement(
            'span',
            {
              className: `px-2 py-0.5 rounded-full text-[11px] font-bold ${
                isGood
                  ? 'bg-[#F2F9E9] text-[#547E1B] border border-[#D4ECC6]'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`,
            },
            row.deliveryRate || '0.0%'
          );
        }
      },
      { id: 'totalSales', header: 'Gross Booked', accessorKey: 'totalSales', align: 'right', format: 'currency' },
      { id: 'deliveredRevenue', header: 'Realized Revenue', accessorKey: 'deliveredRevenue', align: 'right', format: 'currency' },
      { id: 'cogs', header: 'COGS', accessorKey: 'cogs', align: 'right', format: 'currency' },
      { id: 'grossProfit', header: 'Gross Profit', accessorKey: 'grossProfit', align: 'right', format: 'currency' },
      { 
        id: 'marginPct', 
        header: 'Margin %', 
        accessorKey: 'marginPct', 
        align: 'right',
        cell: (row) => {
          const rev = Number(row.deliveredRevenue) || 0;
          const gp = Number(row.grossProfit) || 0;
          const pct = row.marginPct || (rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%');
          return React.createElement('span', { className: 'font-bold text-[#547E1B]' }, pct);
        }
      },
    ],
    pdfConfig: {
      orientation: 'landscape',
      columns: [
        { header: 'Sales Representative', accessorKey: 'memberName', align: 'left', widthMm: 42 },
        { header: 'Team / Brand', accessorKey: 'teamName', align: 'left', widthMm: 30 },
        { header: 'Booked', accessorKey: 'totalOrders', align: 'center', format: 'number', widthMm: 18 },
        { header: 'Delivered', accessorKey: 'deliveredOrders', align: 'center', format: 'number', widthMm: 18 },
        { header: 'Success %', accessorKey: 'deliveryRate', align: 'center', format: 'text', widthMm: 22 },
        { header: 'Gross Booked', accessorKey: 'totalSales', align: 'right', format: 'currency', widthMm: 32 },
        { header: 'Realized Revenue', accessorKey: 'deliveredRevenue', align: 'right', format: 'currency', widthMm: 34 },
        { header: 'COGS', accessorKey: 'cogs', align: 'right', format: 'currency', widthMm: 26 },
        { header: 'Gross Profit', accessorKey: 'grossProfit', align: 'right', format: 'currency', widthMm: 25 },
        { header: 'Margin %', accessorKey: 'marginPct', align: 'right', format: 'text', widthMm: 20 },
      ],
      summaryLines: (data) => {
        const rev = data.reduce((s: number, m: any) => s + (Number(m.deliveredRevenue) || 0), 0);
        const cogs = data.reduce((s: number, m: any) => s + (Number(m.cogs) || 0), 0);
        const gp = data.reduce((s: number, m: any) => s + (Number(m.grossProfit) || 0), 0);
        const totOrders = data.reduce((s: number, m: any) => s + (Number(m.totalOrders) || 0), 0);
        const delOrders = data.reduce((s: number, m: any) => s + (Number(m.deliveredOrders) || 0), 0);
        const overallRate = totOrders > 0 ? `${((delOrders / totOrders) * 100).toFixed(1)}%` : '0.0%';
        const overallMargin = rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%';
        return [
          { label: 'Active Sales Representatives:', value: `${data.filter((m: any) => (Number(m.totalOrders) || 0) > 0).length} of ${data.length} members`, isBold: true },
          { label: 'Total Consignments Delivered:', value: `${delOrders.toLocaleString()} of ${totOrders.toLocaleString()} booked (${overallRate})` },
          { label: 'Total Direct Inventory COGS:', value: formatCurrency(cogs) },
          { label: 'Total Realized Gross Margin:', value: `${formatCurrency(gp)} (${overallMargin})`, isBold: true },
          { label: 'Cumulative Realized Revenue:', value: formatCurrency(rev), isBold: true, isHighlight: true },
        ];
      },
    },
    getData: (allData, filters) => {
      const raw = allData && allData.members ? allData.members : (Array.isArray(allData) ? allData : []);
      return raw.map((m: any) => {
        const rev = Number(m.deliveredRevenue) || 0;
        const gp = Number(m.grossProfit) || 0;
        const marginPct = m.marginPct || (rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%');
        const totOrders = Number(m.totalOrders) || 0;
        const delOrders = Number(m.deliveredOrders) || 0;
        const deliveryRate = m.deliveryRate || (totOrders > 0 ? `${((delOrders / totOrders) * 100).toFixed(1)}%` : '0.0%');
        return {
          ...m,
          marginPct,
          deliveryRate,
        };
      }).filter((m: any) => {
        if (filters.teamId && filters.teamId !== 'ALL' && m.teamId !== filters.teamId) return false;
        if (filters.search && filters.search.trim()) {
          const q = filters.search.toLowerCase().trim();
          const matchName = (m.memberName || '').toLowerCase().includes(q);
          const matchUser = (m.username || '').toLowerCase().includes(q);
          const matchTeam = (m.teamName || '').toLowerCase().includes(q);
          return matchName || matchUser || matchTeam;
        }
        return true;
      });
    },
  },

  // 4. District & City Delivery Report
  {
    id: 'city-delivery',
    name: 'District & City Delivery Report',
    description: 'Geographic dispatch logistics, completed delivery success rate, returns, and regional collection volumes.',
    category: 'SALES',
    groupCategory: 'SALES',
    badgeText: 'Logistics',
    badgeType: 'analytical',
    icon: MapPin,
    supportedFilters: ['dateRange', 'search'],
    kpis: [
      {
        id: 'total-dispatched',
        label: 'Total Dispatched',
        format: 'number',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, c) => s + (Number(c.total) || 0), 0) : 0,
        subtitle: () => 'Consignments booked across destinations',
        accentColor: 'blue',
      },
      {
        id: 'fulfillment-rate',
        label: 'Delivery Success Rate',
        format: 'percentage',
        getValue: (data) => {
          if (!Array.isArray(data) || !data.length) return 0;
          const tot = data.reduce((s, c) => s + (Number(c.total) || 0), 0);
          const del = data.reduce((s, c) => s + (Number(c.delivered) || 0), 0);
          return tot > 0 ? Math.round((del / tot) * 100) : 0;
        },
        subtitle: () => 'Realized delivered packages',
        accentColor: 'green',
      },
      {
        id: 'city-collections',
        label: 'COD Collections',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((s, c) => s + (Number(c.revenue) || 0), 0) : 0,
        subtitle: () => 'Realized cash on delivery',
        accentColor: 'purple',
      },
      {
        id: 'active-cities',
        label: 'Active Delivery Hubs',
        format: 'number',
        getValue: (data) => Array.isArray(data) ? data.length : 0,
        subtitle: () => 'Monitored distribution centers',
        accentColor: 'amber',
      },
    ],
    chartConfig: {
      type: 'BAR',
      xAxisKey: 'city',
      series: [
        { key: 'revenue', name: 'COD Collections (LKR)', color: '#01A8F3' },
        { key: 'delivered', name: 'Delivered Packages', color: '#80BD2B' },
      ],
      getChartData: (data) => Array.isArray(data) ? data.slice(0, 10).map((c: any) => ({
        city: c.city,
        revenue: Number(c.revenue) || 0,
        delivered: Number(c.delivered) || 0,
      })) : [],
    },
    columns: [
      { id: 'city', header: 'City / District', accessorKey: 'city', format: 'text' },
      { id: 'total', header: 'Booked Consignments', accessorKey: 'total', align: 'center', format: 'number' },
      { id: 'delivered', header: 'Delivered', accessorKey: 'delivered', align: 'center', format: 'number' },
      { id: 'pending', header: 'In Transit', accessorKey: 'pending', align: 'center', format: 'number' },
      { id: 'cancelled', header: 'Cancelled / Returned', accessorKey: 'cancelled', align: 'center', format: 'number' },
      { 
        id: 'rate', 
        header: 'Delivery Rate', 
        accessorKey: 'rate',
        align: 'center', 
        cell: (row) => {
          const tot = Number(row.total) || 0;
          const del = Number(row.delivered) || 0;
          const pct = tot > 0 ? ((del / tot) * 100).toFixed(1) : '0.0';
          const isGood = Number(pct) >= 60;
          return React.createElement(
            'span',
            {
              className: `px-2 py-0.5 rounded-full text-[11px] font-bold ${
                isGood 
                  ? 'bg-[#F2F9E9] text-[#547E1B] border border-[#D4ECC6]' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`,
            },
            `${pct}%`
          );
        } 
      },
      { id: 'revenue', header: 'Realized Collections', accessorKey: 'revenue', align: 'right', format: 'currency' },
    ],
    pdfConfig: {
      orientation: 'portrait',
      columns: [
        { header: 'City / District', accessorKey: 'city', align: 'left', widthMm: 42 },
        { header: 'Booked', accessorKey: 'total', align: 'center', format: 'number', widthMm: 20 },
        { header: 'Delivered', accessorKey: 'delivered', align: 'center', format: 'number', widthMm: 20 },
        { header: 'In Transit', accessorKey: 'pending', align: 'center', format: 'number', widthMm: 20 },
        { header: 'Cancelled', accessorKey: 'cancelled', align: 'center', format: 'number', widthMm: 20 },
        { header: 'Delivery Rate', accessorKey: 'rate', align: 'center', format: 'text', widthMm: 22 },
        { header: 'COD Collections', accessorKey: 'revenue', align: 'right', format: 'currency', widthMm: 38 },
      ],
      summaryLines: (data) => {
        const tot = data.reduce((s: number, c: any) => s + (Number(c.total) || 0), 0);
        const del = data.reduce((s: number, c: any) => s + (Number(c.delivered) || 0), 0);
        const inTransit = data.reduce((s: number, c: any) => s + (Number(c.pending) || 0), 0);
        const canc = data.reduce((s: number, c: any) => s + (Number(c.cancelled) || 0), 0);
        const rev = data.reduce((s: number, c: any) => s + (Number(c.revenue) || 0), 0);
        const overallRate = tot > 0 ? `${((del / tot) * 100).toFixed(1)}%` : '0.0%';
        return [
          { label: 'Total Consignments Booked:', value: `${tot.toLocaleString()} parcels`, isBold: true },
          { label: 'Successfully Delivered:', value: `${del.toLocaleString()} parcels (${overallRate})` },
          { label: 'Currently In Transit:', value: `${inTransit.toLocaleString()} parcels` },
          { label: 'Cancelled / Returned:', value: `${canc.toLocaleString()} parcels` },
          { label: 'Total Realized COD Collections:', value: formatCurrency(rev), isBold: true, isHighlight: true },
        ];
      },
    },
    getData: (allData, filters) => {
      const raw = allData && allData.cityData ? allData.cityData : (Array.isArray(allData) ? allData : []);
      return raw.map((c: any) => {
        const tot = Number(c.total) || 0;
        const del = Number(c.delivered) || 0;
        const rate = tot > 0 ? `${((del / tot) * 100).toFixed(1)}%` : '0.0%';
        return {
          ...c,
          rate,
        };
      }).filter((c: any) => {
        if (filters.search && !String(c.city).toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      });
    },
  },

  // 5. Daily Sales Performance Report
  {
    id: 'daily-sales',
    name: 'Daily Sales Performance Report',
    description: 'Granular day-by-day order counts, gross COD sales, COGS deductions, and net realized profits.',
    category: 'SALES',
    groupCategory: 'SALES',
    badgeText: 'Daily Velocity',
    badgeType: 'analytical',
    icon: Clock,
    supportedFilters: ['dateRange', 'search'],
    kpis: [
      {
        id: 'daily-revenue',
        label: 'Realized Sales Revenue',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0) : 0,
        subtitle: (data) => `${Array.isArray(data) ? data.length : 0} operational days recorded`,
        accentColor: 'blue',
      },
      {
        id: 'daily-orders',
        label: 'Delivered Consignments',
        format: 'number',
        getValue: (data) => Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.orderCount) || 0), 0) : 0,
        subtitle: () => 'Orders fulfilled & collected',
        accentColor: 'green',
      },
      {
        id: 'daily-profit',
        label: 'Realized Gross Margin',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.grossProfit) || 0), 0) : 0,
        subtitle: (data) => {
          const rev = Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0) : 0;
          const gp = Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.grossProfit) || 0), 0) : 0;
          return rev > 0 ? `${((gp / rev) * 100).toFixed(1)}% gross margin` : '0%';
        },
        accentColor: 'purple',
      },
      {
        id: 'daily-avg-velocity',
        label: 'Average Daily Velocity',
        format: 'currency',
        getValue: (data) => Array.isArray(data) && data.length ? Math.round(data.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0) / data.length) : 0,
        subtitle: () => 'Average revenue per active day',
        accentColor: 'amber',
      },
    ],
    chartConfig: {
      type: 'BAR',
      xAxisKey: 'period',
      series: [
        { key: 'revenue', name: 'Realized Revenue (LKR)', color: '#01A8F3' },
        { key: 'grossProfit', name: 'Gross Margin (LKR)', color: '#80BD2B' },
      ],
      getChartData: (data) => Array.isArray(data) ? data.map((d: any) => ({
        period: d.period,
        revenue: Number(d.revenue) || 0,
        grossProfit: Number(d.grossProfit) || 0,
      })) : [],
    },
    columns: [
      { id: 'period', header: 'Date', accessorKey: 'period', format: 'text' },
      { id: 'orderCount', header: 'Delivered Orders', accessorKey: 'orderCount', align: 'center', format: 'number' },
      { id: 'revenue', header: 'Gross Revenue', accessorKey: 'revenue', align: 'right', format: 'currency' },
      { id: 'cogs', header: 'Product COGS', accessorKey: 'cogs', align: 'right', format: 'currency' },
      { id: 'grossProfit', header: 'Realized Margin', accessorKey: 'grossProfit', align: 'right', format: 'currency' },
      { 
        id: 'marginPct', 
        header: 'Margin %', 
        accessorKey: 'marginPct',
        align: 'right', 
        cell: (row) => {
          const rev = Number(row.revenue) || 0;
          const gp = Number(row.grossProfit) || 0;
          const pct = row.marginPct || (rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%');
          return React.createElement('span', { className: 'font-bold text-[#547E1B]' }, pct);
        } 
      },
    ],
    pdfConfig: {
      orientation: 'portrait',
      columns: [
        { header: 'Date', accessorKey: 'period', align: 'left', widthMm: 30 },
        { header: 'Delivered Orders', accessorKey: 'orderCount', align: 'center', format: 'number', widthMm: 28 },
        { header: 'Gross Revenue', accessorKey: 'revenue', align: 'right', format: 'currency', widthMm: 34 },
        { header: 'Product COGS', accessorKey: 'cogs', align: 'right', format: 'currency', widthMm: 34 },
        { header: 'Gross Profit', accessorKey: 'grossProfit', align: 'right', format: 'currency', widthMm: 32 },
        { header: 'Margin %', accessorKey: 'marginPct', align: 'right', format: 'text', widthMm: 24 },
      ],
      summaryLines: (data) => {
        const rev = data.reduce((s: number, d: any) => s + (Number(d.revenue) || 0), 0);
        const cogs = data.reduce((s: number, d: any) => s + (Number(d.cogs) || 0), 0);
        const gp = data.reduce((s: number, d: any) => s + (Number(d.grossProfit) || 0), 0);
        const orders = data.reduce((s: number, d: any) => s + (Number(d.orderCount) || 0), 0);
        const overallMargin = rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%';
        return [
          { label: 'Total Operating Days Recorded:', value: `${data.length} days`, isBold: true },
          { label: 'Total Orders Delivered:', value: `${orders.toLocaleString()} orders` },
          { label: 'Total Procurement COGS:', value: formatCurrency(cogs) },
          { label: 'Realized Gross Margin:', value: `${formatCurrency(gp)} (${overallMargin})`, isBold: true },
          { label: 'Total Realized Sales Revenue:', value: formatCurrency(rev), isBold: true, isHighlight: true },
        ];
      },
    },
    getData: (allData, filters) => {
      const raw = allData && allData.periodData ? allData.periodData : (Array.isArray(allData) ? allData : []);
      return raw.map((d: any) => {
        const rev = Number(d.revenue) || 0;
        const gp = Number(d.grossProfit) || 0;
        const marginPct = rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%';
        return { ...d, marginPct };
      }).filter((d: any) => {
        if (!isDateInRange(d.period, filters.dateRange.startDate, filters.dateRange.endDate)) return false;
        if (filters.search && !String(d.period).toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      });
    },
  },

  // 6. Weekly Sales Performance Report
  {
    id: 'weekly-sales',
    name: 'Weekly Sales Performance Report',
    description: 'Week-over-week revenue velocity, shipment delivery volumes, and cost vs profitability dynamics.',
    category: 'SALES',
    groupCategory: 'SALES',
    badgeText: 'Weekly Growth',
    badgeType: 'executive',
    icon: TrendingUp,
    supportedFilters: ['dateRange', 'search'],
    kpis: [
      {
        id: 'weekly-revenue',
        label: 'Total Weekly Revenue',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0) : 0,
        subtitle: (data) => `${Array.isArray(data) ? data.length : 0} calendar weeks active`,
        accentColor: 'blue',
      },
      {
        id: 'weekly-orders',
        label: 'Total Orders Delivered',
        format: 'number',
        getValue: (data) => Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.orderCount) || 0), 0) : 0,
        subtitle: () => 'Consignments fulfilled',
        accentColor: 'green',
      },
      {
        id: 'weekly-profit',
        label: 'Realized Gross Profit',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.grossProfit) || 0), 0) : 0,
        subtitle: (data) => {
          const rev = Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0) : 0;
          const gp = Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.grossProfit) || 0), 0) : 0;
          return rev > 0 ? `${((gp / rev) * 100).toFixed(1)}% net gross margin` : '0%';
        },
        accentColor: 'purple',
      },
      {
        id: 'weekly-cogs',
        label: 'Cumulative COGS',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.cogs) || 0), 0) : 0,
        subtitle: () => 'Direct inventory acquisition',
        accentColor: 'amber',
      },
    ],
    chartConfig: {
      type: 'GROUPED_BAR',
      xAxisKey: 'period',
      series: [
        { key: 'revenue', name: 'Weekly Revenue (LKR)', color: '#01A8F3' },
        { key: 'cogs', name: 'COGS (LKR)', color: '#F59E0B' },
        { key: 'grossProfit', name: 'Gross Margin (LKR)', color: '#80BD2B' },
      ],
      getChartData: (data) => Array.isArray(data) ? data.map((d: any) => ({
        period: d.period,
        revenue: Number(d.revenue) || 0,
        cogs: Number(d.cogs) || 0,
        grossProfit: Number(d.grossProfit) || 0,
      })) : [],
    },
    columns: [
      { id: 'period', header: 'Week', accessorKey: 'period', format: 'text' },
      { id: 'orderCount', header: 'Delivered Orders', accessorKey: 'orderCount', align: 'center', format: 'number' },
      { id: 'revenue', header: 'Weekly Revenue', accessorKey: 'revenue', align: 'right', format: 'currency' },
      { id: 'cogs', header: 'COGS', accessorKey: 'cogs', align: 'right', format: 'currency' },
      { id: 'grossProfit', header: 'Gross Profit', accessorKey: 'grossProfit', align: 'right', format: 'currency' },
      { 
        id: 'marginPct', 
        header: 'Margin %', 
        accessorKey: 'marginPct', 
        align: 'right', 
        cell: (row) => {
          const rev = Number(row.revenue) || 0;
          const gp = Number(row.grossProfit) || 0;
          const pct = row.marginPct || (rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%');
          return React.createElement('span', { className: 'font-bold text-[#547E1B]' }, pct);
        } 
      },
    ],
    pdfConfig: {
      orientation: 'portrait',
      columns: [
        { header: 'Week', accessorKey: 'period', align: 'left', widthMm: 30 },
        { header: 'Delivered Orders', accessorKey: 'orderCount', align: 'center', format: 'number', widthMm: 28 },
        { header: 'Weekly Revenue', accessorKey: 'revenue', align: 'right', format: 'currency', widthMm: 34 },
        { header: 'Product COGS', accessorKey: 'cogs', align: 'right', format: 'currency', widthMm: 34 },
        { header: 'Gross Profit', accessorKey: 'grossProfit', align: 'right', format: 'currency', widthMm: 32 },
        { header: 'Margin %', accessorKey: 'marginPct', align: 'right', format: 'text', widthMm: 24 },
      ],
      summaryLines: (data) => {
        const rev = data.reduce((s: number, d: any) => s + (Number(d.revenue) || 0), 0);
        const cogs = data.reduce((s: number, d: any) => s + (Number(d.cogs) || 0), 0);
        const gp = data.reduce((s: number, d: any) => s + (Number(d.grossProfit) || 0), 0);
        const orders = data.reduce((s: number, d: any) => s + (Number(d.orderCount) || 0), 0);
        const overallMargin = rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%';
        return [
          { label: 'Total Calendar Weeks Active:', value: `${data.length} weeks`, isBold: true },
          { label: 'Total Orders Delivered:', value: `${orders.toLocaleString()} orders` },
          { label: 'Total Product COGS:', value: formatCurrency(cogs) },
          { label: 'Realized Gross Margin:', value: `${formatCurrency(gp)} (${overallMargin})`, isBold: true },
          { label: 'Total Realized Weekly Revenue:', value: formatCurrency(rev), isBold: true, isHighlight: true },
        ];
      },
    },
    getData: (allData, filters) => {
      const raw = allData && allData.periodData ? allData.periodData : (Array.isArray(allData) ? allData : []);
      return raw.map((d: any) => {
        const rev = Number(d.revenue) || 0;
        const gp = Number(d.grossProfit) || 0;
        const marginPct = rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%';
        return { ...d, marginPct };
      }).filter((d: any) => {
        if (filters.search && !String(d.period).toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      });
    },
  },

  // 7. Monthly Sales Performance Report
  {
    id: 'monthly-sales',
    name: 'Monthly Sales Performance Report',
    description: 'Executive monthly aggregated revenue trajectories, procurement COGS, and operational margin ratios.',
    category: 'SALES',
    groupCategory: 'SALES',
    badgeText: 'Monthly P&L',
    badgeType: 'executive',
    icon: BarChart3,
    supportedFilters: ['dateRange', 'search'],
    kpis: [
      {
        id: 'monthly-revenue',
        label: 'Cumulative Period Revenue',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0) : 0,
        subtitle: (data) => `${Array.isArray(data) ? data.length : 0} months compiled`,
        accentColor: 'blue',
      },
      {
        id: 'monthly-orders',
        label: 'Total Orders Fulfilled',
        format: 'number',
        getValue: (data) => Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.orderCount) || 0), 0) : 0,
        subtitle: () => 'Consignments delivered',
        accentColor: 'green',
      },
      {
        id: 'monthly-profit',
        label: 'Realized Gross Profit',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.grossProfit) || 0), 0) : 0,
        subtitle: (data) => {
          const rev = Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0) : 0;
          const gp = Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.grossProfit) || 0), 0) : 0;
          return rev > 0 ? `${((gp / rev) * 100).toFixed(1)}% realized margin` : '0%';
        },
        accentColor: 'purple',
      },
      {
        id: 'monthly-cogs',
        label: 'Procurement COGS',
        format: 'currency',
        getValue: (data) => Array.isArray(data) ? data.reduce((sum, d) => sum + (Number(d.cogs) || 0), 0) : 0,
        subtitle: () => 'Physical goods cost',
        accentColor: 'amber',
      },
    ],
    chartConfig: {
      type: 'AREA',
      xAxisKey: 'period',
      series: [
        { key: 'revenue', name: 'Gross Revenue (LKR)', color: '#01A8F3' },
        { key: 'grossProfit', name: 'Gross Margin (LKR)', color: '#80BD2B' },
      ],
      getChartData: (data) => Array.isArray(data) ? data.map((d: any) => ({
        period: d.period,
        revenue: Number(d.revenue) || 0,
        grossProfit: Number(d.grossProfit) || 0,
      })) : [],
    },
    columns: [
      { id: 'period', header: 'Month', accessorKey: 'period', format: 'text' },
      { id: 'orderCount', header: 'Delivered Consignments', accessorKey: 'orderCount', align: 'center', format: 'number' },
      { id: 'revenue', header: 'Gross Revenue', accessorKey: 'revenue', align: 'right', format: 'currency' },
      { id: 'cogs', header: 'COGS', accessorKey: 'cogs', align: 'right', format: 'currency' },
      { id: 'grossProfit', header: 'Gross Profit', accessorKey: 'grossProfit', align: 'right', format: 'currency' },
      { 
        id: 'marginPct', 
        header: 'Profitability %', 
        accessorKey: 'marginPct', 
        align: 'right', 
        cell: (row) => {
          const rev = Number(row.revenue) || 0;
          const gp = Number(row.grossProfit) || 0;
          const pct = row.marginPct || (rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%');
          return React.createElement('span', { className: 'font-bold text-[#547E1B]' }, pct);
        } 
      },
    ],
    pdfConfig: {
      orientation: 'portrait',
      columns: [
        { header: 'Month', accessorKey: 'period', align: 'left', widthMm: 30 },
        { header: 'Delivered Orders', accessorKey: 'orderCount', align: 'center', format: 'number', widthMm: 28 },
        { header: 'Gross Revenue', accessorKey: 'revenue', align: 'right', format: 'currency', widthMm: 34 },
        { header: 'Procurement COGS', accessorKey: 'cogs', align: 'right', format: 'currency', widthMm: 34 },
        { header: 'Gross Profit', accessorKey: 'grossProfit', align: 'right', format: 'currency', widthMm: 32 },
        { header: 'Profitability %', accessorKey: 'marginPct', align: 'right', format: 'text', widthMm: 24 },
      ],
      summaryLines: (data) => {
        const rev = data.reduce((s: number, d: any) => s + (Number(d.revenue) || 0), 0);
        const cogs = data.reduce((s: number, d: any) => s + (Number(d.cogs) || 0), 0);
        const gp = data.reduce((s: number, d: any) => s + (Number(d.grossProfit) || 0), 0);
        const orders = data.reduce((s: number, d: any) => s + (Number(d.orderCount) || 0), 0);
        const overallMargin = rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%';
        return [
          { label: 'Total Months Compiled:', value: `${data.length} months`, isBold: true },
          { label: 'Total Consignments Delivered:', value: `${orders.toLocaleString()} orders` },
          { label: 'Total Procurement COGS:', value: formatCurrency(cogs) },
          { label: 'Realized Gross Margin:', value: `${formatCurrency(gp)} (${overallMargin})`, isBold: true },
          { label: 'Total Realized Sales Revenue:', value: formatCurrency(rev), isBold: true, isHighlight: true },
        ];
      },
    },
    getData: (allData, filters) => {
      const raw = allData && allData.periodData ? allData.periodData : (Array.isArray(allData) ? allData : []);
      return raw.map((d: any) => {
        const rev = Number(d.revenue) || 0;
        const gp = Number(d.grossProfit) || 0;
        const marginPct = rev > 0 ? `${((gp / rev) * 100).toFixed(1)}%` : '0.0%';
        return { ...d, marginPct };
      }).filter((d: any) => {
        if (filters.search && !String(d.period).toLowerCase().includes(filters.search.toLowerCase())) return false;
        return true;
      });
    },
  },
];

// Unified catalog of all system intelligence reports
export const ALL_SYSTEM_REPORTS: ReportDefinition[] = [
  ...FINANCE_REPORTS,
  ...SALES_REPORTS,
];

export const getReportById = (id: string): ReportDefinition | undefined => {
  return ALL_SYSTEM_REPORTS.find((r) => r.id === id);
};
