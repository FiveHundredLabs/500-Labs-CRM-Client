import { 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Wallet, 
  Boxes, 
  BarChart3, 
  ArrowUpRight, 
  Clock, 
  Tag
} from 'lucide-react';
import { ReportDefinition, ActiveFilters } from './types';
import { 
  MOCK_FINANCE_DATABASE, 
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
    badgeText: 'Revenue',
    badgeType: 'standard',
    icon: TrendingUp,
    supportedFilters: ['dateRange'],
    kpis: [
      {
        id: 'total-income',
        label: 'Gross Realized Sales',
        format: 'currency',
        getValue: (data) => data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + curr.totalAmount, 0),
        subtitle: (data) => `${data.length} delivered order consignments`,
        accentColor: 'green',
      },
      {
        id: 'avg-order-val',
        label: 'Average Order Value',
        format: 'currency',
        getValue: (data) => data.length ? Math.round(data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + curr.totalAmount, 0) / data.length) : 0,
        subtitle: () => 'Per delivered order',
        accentColor: 'blue',
      },
      {
        id: 'total-cogs',
        label: 'Delivered Product COGS',
        format: 'currency',
        getValue: (data) => data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + curr.cogs, 0),
        subtitle: (data) => {
          const rev = data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + curr.totalAmount, 0);
          const cogs = data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + curr.cogs, 0);
          return rev ? `${((cogs / rev) * 100).toFixed(1)}% of gross revenue` : '0%';
        },
        accentColor: 'amber',
      },
      {
        id: 'realized-profit',
        label: 'Realized Gross Margin',
        format: 'currency',
        getValue: (data) => data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + curr.grossProfit, 0),
        subtitle: (data) => {
          const rev = data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + curr.totalAmount, 0);
          const gp = data.reduce((acc: number, curr: DeliveredOrderRecord) => acc + curr.grossProfit, 0);
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
      ],
      getChartData: (filteredData) => {
        const monthMap: Record<string, number> = {};
        filteredData.forEach((d: DeliveredOrderRecord) => {
          const m = d.deliveredAt.substring(0, 7);
          monthMap[m] = (monthMap[m] || 0) + d.totalAmount;
        });
        return Object.entries(monthMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([period, amount]) => ({
            period: format(parseISO(`${period}-01`), 'MMM yyyy'),
            amount,
          }));
      },
    },
    columns: [
      { id: 'deliveredAt', header: 'Delivered Date', accessorKey: 'deliveredAt', align: 'left', format: 'date' },
      { id: 'orderNumber', header: 'Order #', accessorKey: 'orderNumber', align: 'left', format: 'badge' },
      { id: 'customerName', header: 'Customer Party', accessorKey: 'customerName', align: 'left' },
      { id: 'city', header: 'Destination City', accessorKey: 'city', align: 'left', format: 'badge' },
      { id: 'status', header: 'Delivery Status', accessorKey: 'status', align: 'center', format: 'badge' },
      { id: 'totalAmount', header: 'Revenue (LKR)', accessorKey: 'totalAmount', align: 'right', format: 'currency' },
    ],
    getData: (db, filters) => {
      return db.deliveredOrders.filter((o: DeliveredOrderRecord) => {
        if (!isDateInRange(o.deliveredAt, filters.dateRange.startDate, filters.dateRange.endDate)) return false;
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
    badgeText: 'Treasury & Cash',
    badgeType: 'executive',
    icon: ArrowUpRight,
    supportedFilters: ['dateRange'],
    kpis: [
      {
        id: 'total-inflows',
        label: 'Operational Inflows',
        format: 'currency',
        getValue: (data) => data.inflows,
        subtitle: () => 'Customer remittances deposited',
        accentColor: 'green',
      },
      {
        id: 'total-outflows',
        label: 'Operational Outflows',
        format: 'currency',
        getValue: (data) => data.outflows,
        subtitle: () => 'Operating expenses & petty cash',
        accentColor: 'red',
      },
      {
        id: 'net-cash-flow',
        label: 'Net Liquidity Movement',
        format: 'currency',
        getValue: (data) => data.netCashFlow,
        subtitle: (data) => data.netCashFlow >= 0 ? '+ Positive net generation' : '- Net liquidity deficit',
        accentColor: 'blue',
      },
      {
        id: 'ending-cash',
        label: 'Audited Float Vault',
        format: 'currency',
        getValue: () => 41750,
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
        const monthMap: Record<string, { inflows: number; outflows: number }> = {};
        data.incomes.forEach((i: DeliveredOrderRecord) => {
          const m = i.deliveredAt.substring(0, 7);
          if (!monthMap[m]) monthMap[m] = { inflows: 0, outflows: 0 };
          monthMap[m].inflows += i.totalAmount;
        });
        data.expenses.forEach((e: ExpenseRecord) => {
          const m = e.expenseDate.substring(0, 7);
          if (!monthMap[m]) monthMap[m] = { inflows: 0, outflows: 0 };
          monthMap[m].outflows += e.amount;
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
      const incs = db.deliveredOrders.filter((i: DeliveredOrderRecord) => isDateInRange(i.deliveredAt, filters.dateRange.startDate, filters.dateRange.endDate));
      const exps = db.expenses.filter((e: ExpenseRecord) => isDateInRange(e.expenseDate, filters.dateRange.startDate, filters.dateRange.endDate));

      const inflows = incs.reduce((acc: number, c: DeliveredOrderRecord) => acc + c.totalAmount, 0);
      const outflows = exps.reduce((acc: number, c: ExpenseRecord) => acc + c.amount, 0);
      const netCashFlow = inflows - outflows;

      const rows = [
        ...incs.map((i: DeliveredOrderRecord) => ({
          id: `in_${i.id}`,
          date: i.deliveredAt,
          type: 'INFLOW',
          description: `Sales collection — ${i.orderNumber} (${i.customerName}, ${i.city})`,
          amount: i.totalAmount,
        })),
        ...exps.map((e: ExpenseRecord) => ({
          id: `out_${e.id}`,
          date: e.expenseDate,
          type: 'OUTFLOW',
          description: `${e.categoryName}: ${e.remarks}`,
          amount: e.amount,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return { inflows, outflows, netCashFlow, incomes: incs, expenses: exps, rows };
    },
  },

  // 5. Product Cost & Inventory Valuation Report (Database: model Product & StockBatch)
  {
    id: 'product-cost',
    name: 'Product Cost & Inventory Valuation',
    description: 'Financial stock audit of unit acquisition costs, physical stock valuation, and catalog gross margins.',
    category: 'ASSETS',
    badgeText: 'Asset Valuation',
    badgeType: 'standard',
    icon: Boxes,
    supportedFilters: ['category'],
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
      { id: 'category', header: 'Category', accessorKey: 'category', align: 'center', format: 'badge' },
      { id: 'costPrice', header: 'Unit Cost (LKR)', accessorKey: 'costPrice', align: 'right', format: 'currency' },
      { id: 'sellingPrice', header: 'Selling Price (LKR)', accessorKey: 'sellingPrice', align: 'right', format: 'currency' },
      { id: 'currentStock', header: 'In Stock', accessorKey: 'currentStock', align: 'center' },
      { id: 'stockValue', header: 'Holding Value (Cost)', accessorKey: 'stockValue', align: 'right', format: 'currency' },
      { id: 'margin', header: 'Gross Margin', accessorKey: 'margin', align: 'center', format: 'badge' },
    ],
    pdfConfig: {
      orientation: 'portrait',
      columns: [
        { header: 'Product Code', accessorKey: 'code', align: 'left', widthMm: 28 },
        { header: 'Merchandise Title', accessorKey: 'name', align: 'left', widthMm: 52 },
        { header: 'Unit Cost', accessorKey: 'costPrice', align: 'right', format: 'currency', widthMm: 24 },
        { header: 'Selling Price', accessorKey: 'sellingPrice', align: 'right', format: 'currency', widthMm: 24 },
        { header: 'In Stock', accessorKey: 'currentStock', align: 'center', format: 'number', widthMm: 22 },
        { header: 'Total Value (Cost)', accessorKey: 'stockValue', align: 'right', format: 'currency', widthMm: 32 },
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
        if (filters.category && filters.category !== 'ALL' && p.category !== filters.category) return false;
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
        getValue: () => 41750,
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
      return db.pettyCashTransactions.filter((p: PettyCashTransactionRecord) => {
        if (!isDateInRange(p.date, filters.dateRange.startDate, filters.dateRange.endDate)) return false;
        return true;
      });
    },
  },
];

export const getReportById = (id: string): ReportDefinition | undefined => {
  return FINANCE_REPORTS.find((r) => r.id === id);
};
