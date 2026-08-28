import React, { useState, useEffect, useMemo } from 'react';
import {
  expenseRepository,
  orderRepository,
  pettyCashRepository,
  teamRepository,
  productRepository,
  salesTargetRepository,
} from '../../repositories';
import {
  Expense,
  Order,
  PettyCashWallet,
  PettyCashTransaction,
  Team,
  Product,
  TeamSalesTarget,
} from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  FileText,
  DollarSign,
  Download,
  Printer,
  Calendar,
  Filter,
  Layers,
  CheckCircle2,
  TrendingUp,
  Package,
  Boxes,
  MapPin,
  X,
  PieChart as PieChartIcon,
  ShoppingBag,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { formatCurrency } from '../../utils/currency';
import toast from 'react-hot-toast';

export type ReportType =
  // Finance Reports
  | 'INCOME_STATEMENT'
  | 'CASH_FLOW'
  | 'FSR'
  | 'EXPENSE_REPORT'
  | 'INVENTORY_REPORT'
  // Sales Reports
  | 'DAILY_SALES'
  | 'WEEKLY_SALES'
  | 'MONTHLY_SALES'
  | 'DISTRICT_DELIVERY';

export const FinanceReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('INCOME_STATEMENT');
  const [loading, setLoading] = useState(true);

  // Raw Database Datasets
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wallet, setWallet] = useState<PettyCashWallet | null>(null);
  const [pettyTransactions, setPettyTransactions] = useState<PettyCashTransaction[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesTargets, setSalesTargets] = useState<TeamSalesTarget[]>([]);

  // Multi-Parameter Filter States
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    const loadAllFinancialData = async () => {
      setLoading(true);
      try {
        const [
          expensesData,
          ordersData,
          walletData,
          pettyTxData,
          teamsData,
          productsData,
          targetsData,
        ] = await Promise.all([
          expenseRepository.getAll(),
          orderRepository.getAll(),
          pettyCashRepository.getWallet(),
          pettyCashRepository.getTransactions(),
          teamRepository.getAll().catch(() => []),
          productRepository.getAll().catch(() => []),
          salesTargetRepository.getAll().catch(() => []),
        ]);
        setExpenses(expensesData);
        setOrders(ordersData);
        setWallet(walletData);
        setPettyTransactions(pettyTxData);
        setTeams(teamsData);
        setProducts(productsData);
        setSalesTargets(targetsData);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load report datasets.');
      } finally {
        setLoading(false);
      }
    };
    loadAllFinancialData();
  }, []);

  // Update date boundaries on preset changes
  useEffect(() => {
    const now = new Date();
    if (datePreset === 'TODAY') {
      const t = format(now, 'yyyy-MM-dd');
      setStartDate(t);
      setEndDate(t);
    } else if (datePreset === 'YESTERDAY') {
      const y = format(subDays(now, 1), 'yyyy-MM-dd');
      setStartDate(y);
      setEndDate(y);
    } else if (datePreset === 'THIS_WEEK') {
      setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
      setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    } else if (datePreset === 'LAST_7_DAYS') {
      setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (datePreset === 'THIS_MONTH') {
      setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
    } else if (datePreset === 'LAST_MONTH') {
      const prevMonth = subMonths(now, 1);
      setStartDate(format(startOfMonth(prevMonth), 'yyyy-MM-dd'));
      setEndDate(format(endOfMonth(prevMonth), 'yyyy-MM-dd'));
    } else if (datePreset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  }, [datePreset]);

  // Lookup maps
  const teamMap = useMemo(() => {
    const map: Record<string, Team> = {};
    teams.forEach((t) => (map[t.id] = t));
    return map;
  }, [teams]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedTeamId !== 'ALL' && o.teamId !== selectedTeamId) return false;
      const d = o.createdAt.split('T')[0];
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [orders, selectedTeamId, startDate, endDate]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (startDate && e.expenseDate < startDate) return false;
      if (endDate && e.expenseDate > endDate) return false;
      return true;
    });
  }, [expenses, startDate, endDate]);

  // Filtered Petty Cash Transactions
  const filteredPettyTx = useMemo(() => {
    return pettyTransactions.filter((tx) => {
      const d = tx.date ? tx.date.split('T')[0] : '';
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [pettyTransactions, startDate, endDate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Income Statement Data Calculations
  // ─────────────────────────────────────────────────────────────────────────────
  const incomeStatementData = useMemo(() => {
    let grossDeliveredRevenue = 0;
    let inTransitRevenue = 0;
    let adultUnitsSold = 0;
    let kidsUnitsSold = 0;

    filteredOrders.forEach((o) => {
      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      if (o.status === 'DELIVERED') {
        grossDeliveredRevenue += amt;
        adultUnitsSold += Number(o.adultQty || 0);
        kidsUnitsSold += Number(o.kidsQty || 0);
      } else if (o.status === 'DISPATCHED') {
        inTransitRevenue += amt;
      }
    });

    // Cost of Goods Sold (estimated at Rs. 2,500/Adult, Rs. 1,500/Kids or standard 40% margin)
    const cogsAdult = adultUnitsSold * 2500;
    const cogsKids = kidsUnitsSold * 1500;
    const estimatedCOGS = cogsAdult + cogsKids || grossDeliveredRevenue * 0.4;
    const grossProfit = grossDeliveredRevenue - estimatedCOGS;
    const grossMarginPct = grossDeliveredRevenue > 0 ? (grossProfit / grossDeliveredRevenue) * 100 : 0;

    // Operating Expenses
    const expenseCategories: Record<string, number> = {};
    let totalOpEx = 0;
    filteredExpenses.forEach((e) => {
      const eAmt = Number(e.amount || 0);
      expenseCategories[e.categoryName] = (expenseCategories[e.categoryName] || 0) + eAmt;
      totalOpEx += eAmt;
    });

    const netOperatingIncome = grossProfit - totalOpEx;
    const netMarginPct = grossDeliveredRevenue > 0 ? (netOperatingIncome / grossDeliveredRevenue) * 100 : 0;

    const chartData = [
      { name: 'Delivered Revenue', amount: grossDeliveredRevenue, fill: '#10B981' },
      { name: 'Cost of Goods (COGS)', amount: -estimatedCOGS, fill: '#F59E0B' },
      { name: 'Gross Profit', amount: grossProfit, fill: '#3B82F6' },
      { name: 'Operating Expenses', amount: -totalOpEx, fill: '#EF4444' },
      { name: 'Net Profit', amount: netOperatingIncome, fill: netOperatingIncome >= 0 ? '#10B981' : '#DC2626' },
    ];

    return {
      grossDeliveredRevenue,
      inTransitRevenue,
      totalSalesRevenue: grossDeliveredRevenue + inTransitRevenue,
      estimatedCOGS,
      grossProfit,
      grossMarginPct,
      expenseCategories,
      totalOpEx,
      netOperatingIncome,
      netMarginPct,
      chartData,
    };
  }, [filteredOrders, filteredExpenses]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Cash Flow Statement Data Calculations
  // ─────────────────────────────────────────────────────────────────────────────
  const cashFlowData = useMemo(() => {
    let totalCODInflows = 0;
    let walletAllocations = 0;
    let pettyDisbursements = 0;
    let operatingExpenseOutflows = 0;

    filteredOrders.forEach((o) => {
      if (o.status === 'DELIVERED') {
        totalCODInflows += Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      }
    });

    filteredPettyTx.forEach((tx) => {
      const txAmt = Number(tx.amount || 0);
      if (tx.transactionType === 'ALLOCATION') {
        walletAllocations += txAmt;
      } else {
        pettyDisbursements += txAmt;
      }
    });

    filteredExpenses.forEach((e) => {
      operatingExpenseOutflows += Number(e.amount || 0);
    });

    const totalCashInflows = totalCODInflows + walletAllocations;
    const totalCashOutflows = pettyDisbursements + operatingExpenseOutflows;
    const netCashFlow = totalCashInflows - totalCashOutflows;

    const chartData = [
      { category: 'Cash Inflows', amount: totalCashInflows, fill: '#10B981' },
      { category: 'Cash Outflows', amount: totalCashOutflows, fill: '#EF4444' },
      { category: 'Net Cash Position', amount: netCashFlow, fill: '#2563EB' },
    ];

    return {
      totalCODInflows,
      walletAllocations,
      pettyDisbursements,
      operatingExpenseOutflows,
      totalCashInflows,
      totalCashOutflows,
      netCashFlow,
      chartData,
    };
  }, [filteredOrders, filteredPettyTx, filteredExpenses]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Detailed Expense Report Data Calculations
  // ─────────────────────────────────────────────────────────────────────────────
  const expenseReportData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const monthlyTrend: Record<string, number> = {};

    filteredExpenses.forEach((e) => {
      const eAmt = Number(e.amount || 0);
      categoryTotals[e.categoryName] = (categoryTotals[e.categoryName] || 0) + eAmt;
      const monthKey = e.expenseDate.substring(0, 7);
      monthlyTrend[monthKey] = (monthlyTrend[monthKey] || 0) + eAmt;
    });

    const chartData = Object.entries(monthlyTrend).map(([month, amount]) => ({
      month,
      amount,
    }));

    return {
      categoryTotals,
      totalAmount: filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0),
      chartData,
    };
  }, [filteredExpenses]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Inventory Report Calculations (From Live Product & Stock Batches DB)
  // ─────────────────────────────────────────────────────────────────────────────
  const inventoryReportData = useMemo(() => {
    const inventoryItems = products.flatMap((p) => {
      if (p.batches && p.batches.length > 0) {
        return p.batches.map((b) => ({
          id: p.id,
          name: p.name,
          batchNumber: b.batchNumber,
          unitCost: Number(b.unitCostPrice || p.costPrice || 0),
          sellingPrice: Number(b.batchSellingPrice || p.sellingPrice || 0),
          initialStock: Number(b.initialQuantity || 0),
          currentStock: Number(b.initialQuantity || 0),
          status: b.status || 'ACTIVE',
        }));
      }
      return [{
        id: p.id,
        name: p.name,
        batchNumber: 'STANDARD-BATCH',
        unitCost: Number(p.costPrice || 0),
        sellingPrice: Number(p.sellingPrice || 0),
        initialStock: Number(p.currentStock || 0),
        currentStock: Number(p.currentStock || 0),
        status: p.isActive ? 'ACTIVE' : 'DEPLETED',
      }];
    });

    const totalCostValuation = inventoryItems.reduce(
      (acc, i) => acc + i.currentStock * i.unitCost,
      0
    );
    const totalRetailValuation = inventoryItems.reduce(
      (acc, i) => acc + i.currentStock * i.sellingPrice,
      0
    );
    const totalUnitsOnHand = inventoryItems.reduce((acc, i) => acc + i.currentStock, 0);

    const chartData = inventoryItems.map((i) => ({
      name: i.name,
      stockValuationCost: i.currentStock * i.unitCost,
      stockValuationRetail: i.currentStock * i.sellingPrice,
      units: i.currentStock,
    }));

    return {
      inventoryItems,
      totalCostValuation,
      totalRetailValuation,
      totalUnitsOnHand,
      chartData,
    };
  }, [products]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Financial Status Report (FSR) Data Calculations
  // ─────────────────────────────────────────────────────────────────────────────
  const fsrData = useMemo(() => {
    let dispatchedReceivables = 0;
    filteredOrders.forEach((o) => {
      if (o.status === 'DISPATCHED') {
        dispatchedReceivables += Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      }
    });

    const pettyCashInHand = Number(wallet?.remainingBalance || 0);
    const stockValuationEst = inventoryReportData.totalCostValuation;
    const currentAssets = dispatchedReceivables + pettyCashInHand + stockValuationEst;
    const accruedExpenses = filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0) * 0.15;
    const netWorkingCapital = currentAssets - accruedExpenses;

    const assetComposition = [
      { name: 'Dispatched Receivables in Transit', value: dispatchedReceivables, color: '#3B82F6' },
      { name: 'Petty Cash in Wallets', value: pettyCashInHand, color: '#10B981' },
      { name: 'Inventory at Cost', value: stockValuationEst, color: '#8B5CF6' },
    ];

    return {
      dispatchedReceivables,
      pettyCashInHand,
      stockValuationEst,
      currentAssets,
      accruedExpenses,
      netWorkingCapital,
      assetComposition: assetComposition.filter((a) => a.value > 0),
    };
  }, [filteredOrders, wallet, filteredExpenses, inventoryReportData.totalCostValuation]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Daily Sales Report Calculations
  // ─────────────────────────────────────────────────────────────────────────────
  const dailySalesData = useMemo(() => {
    const dailyMap: Record<string, { date: string; revenue: number; delivered: number; ordersCount: number }> = {};

    filteredOrders.forEach((o) => {
      const dateKey = o.createdAt.split('T')[0];
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          revenue: 0,
          delivered: 0,
          ordersCount: 0,
        };
      }
      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      dailyMap[dateKey].revenue += amt;
      dailyMap[dateKey].ordersCount += 1;
      if (o.status === 'DELIVERED') {
        dailyMap[dateKey].delivered += amt;
      }
    });

    const rows = Object.values(dailyMap).sort((a, b) => (b.date > a.date ? 1 : -1));
    const totalRevenue = rows.reduce((acc, r) => acc + r.revenue, 0);
    const totalDelivered = rows.reduce((acc, r) => acc + r.delivered, 0);

    const chartData = [...rows]
      .reverse()
      .slice(-14)
      .map((r) => ({
        date: format(parseISO(r.date), 'MMM dd'),
        revenue: r.revenue,
        delivered: r.delivered,
      }));

    return { rows, totalRevenue, totalDelivered, chartData };
  }, [filteredOrders]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Weekly Sales Report Calculations
  // ─────────────────────────────────────────────────────────────────────────────
  const weeklySalesData = useMemo(() => {
    const weeklyMap: Record<string, { week: string; revenue: number; ordersCount: number; delivered: number }> = {};

    filteredOrders.forEach((o) => {
      const d = parseISO(o.createdAt);
      const weekStart = format(startOfWeek(d, { weekStartsOn: 1 }), 'MMM dd');
      const weekEnd = format(endOfWeek(d, { weekStartsOn: 1 }), 'MMM dd');
      const weekKey = `Week (${weekStart} - ${weekEnd})`;

      if (!weeklyMap[weekKey]) {
        weeklyMap[weekKey] = { week: weekKey, revenue: 0, ordersCount: 0, delivered: 0 };
      }
      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      weeklyMap[weekKey].revenue += amt;
      weeklyMap[weekKey].ordersCount += 1;
      if (o.status === 'DELIVERED') {
        weeklyMap[weekKey].delivered += amt;
      }
    });

    const rows = Object.values(weeklyMap);
    return {
      rows,
      chartData: rows,
    };
  }, [filteredOrders]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Monthly Sales Report Calculations
  // ─────────────────────────────────────────────────────────────────────────────
  const monthlySalesData = useMemo(() => {
    const monthlyMap: Record<string, { month: string; actualSales: number; target: number; delivered: number; ordersCount: number }> = {};

    filteredOrders.forEach((o) => {
      const monthKey = o.createdAt.substring(0, 7);
      if (!monthlyMap[monthKey]) {
        const teamTarget = salesTargets.find((t) => t.month === monthKey);
        monthlyMap[monthKey] = {
          month: monthKey,
          actualSales: 0,
          target: teamTarget ? Number(teamTarget.targetAmount) : 100000,
          delivered: 0,
          ordersCount: 0,
        };
      }
      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      monthlyMap[monthKey].actualSales += amt;
      monthlyMap[monthKey].ordersCount += 1;
      if (o.status === 'DELIVERED') {
        monthlyMap[monthKey].delivered += amt;
      }
    });

    const rows = Object.values(monthlyMap).sort((a, b) => (a.month > b.month ? 1 : -1));
    return {
      rows,
      chartData: rows.map((r) => ({
        month: r.month,
        actualSales: r.actualSales,
        target: r.target,
        delivered: r.delivered,
      })),
    };
  }, [filteredOrders, salesTargets]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. District-wise Delivery Report Calculations (From Live Customer Delivery Data)
  // ─────────────────────────────────────────────────────────────────────────────
  const districtDeliveryData = useMemo(() => {
    const districtMap: Record<string, { district: string; delivered: number; dispatched: number; rejected: number; totalCOD: number }> = {};

    filteredOrders.forEach((o) => {
      const rawCity = (o as any).customer?.city || (o as any).city || 'Western Province';
      const dName = rawCity.charAt(0).toUpperCase() + rawCity.slice(1);

      if (!districtMap[dName]) {
        districtMap[dName] = { district: dName, delivered: 0, dispatched: 0, rejected: 0, totalCOD: 0 };
      }

      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      if (o.status === 'DELIVERED') {
        districtMap[dName].delivered++;
        districtMap[dName].totalCOD += amt;
      } else if (o.status === 'DISPATCHED') {
        districtMap[dName].dispatched++;
      } else if (o.status === 'REJECTED') {
        districtMap[dName].rejected++;
      }
    });

    const rows = Object.values(districtMap).sort((a, b) => b.totalCOD - a.totalCOD);

    const chartData = rows.slice(0, 8).map((r) => {
      const fulfilled = r.delivered + r.rejected;
      const successRate = fulfilled > 0 ? (r.delivered / fulfilled) * 100 : 100;
      return {
        district: r.district,
        deliveredCOD: r.totalCOD,
        deliveredOrders: r.delivered,
        successRate: Number(successRate.toFixed(1)),
      };
    });

    return { rows, chartData };
  }, [filteredOrders]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Universal CSV Export
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let reportTitle = '';

    switch (selectedReport) {
      case 'INCOME_STATEMENT':
        reportTitle = 'Income Statement (P&L)';
        headers = ['Financial Line Item', 'Amount (LKR)', 'Margin %'];
        rows = [
          ['Delivered Sales Revenue (COD)', incomeStatementData.grossDeliveredRevenue.toFixed(2), '100.0%'],
          ['Cost of Goods Sold (COGS)', `(${incomeStatementData.estimatedCOGS.toFixed(2)})`, `${(100 - incomeStatementData.grossMarginPct).toFixed(1)}%`],
          ['Gross Profit', incomeStatementData.grossProfit.toFixed(2), `${incomeStatementData.grossMarginPct.toFixed(1)}%`],
          ['Total Operating Expenses', `(${incomeStatementData.totalOpEx.toFixed(2)})`, '-'],
          ['Net Operating Profit / (Loss)', incomeStatementData.netOperatingIncome.toFixed(2), `${incomeStatementData.netMarginPct.toFixed(1)}%`],
        ];
        break;

      case 'CASH_FLOW':
        reportTitle = 'Cash Flow Statement';
        headers = ['Cash Flow Activity', 'Inflow / (Outflow) LKR'];
        rows = [
          ['Delivered COD Collections', cashFlowData.totalCODInflows.toFixed(2)],
          ['Main Finance Wallet Allocations', cashFlowData.walletAllocations.toFixed(2)],
          ['Petty Cash Disbursements', `(${cashFlowData.pettyDisbursements.toFixed(2)})`],
          ['Operating Expenses Paid', `(${cashFlowData.operatingExpenseOutflows.toFixed(2)})`],
          ['Net Operating Cash Flow', cashFlowData.netCashFlow.toFixed(2)],
        ];
        break;

      case 'FSR':
        reportTitle = 'Financial Status Report (FSR)';
        headers = ['Asset / Liability Classification', 'Balance (LKR)'];
        rows = [
          ['Dispatched Receivables in Transit', fsrData.dispatchedReceivables.toFixed(2)],
          ['Petty Cash in Wallets', fsrData.pettyCashInHand.toFixed(2)],
          ['Stock Valuation at Cost', fsrData.stockValuationEst.toFixed(2)],
          ['Total Current Assets', fsrData.currentAssets.toFixed(2)],
          ['Accrued Operational Liabilities', `(${fsrData.accruedExpenses.toFixed(2)})`],
          ['Net Working Capital', fsrData.netWorkingCapital.toFixed(2)],
        ];
        break;

      case 'EXPENSE_REPORT':
        reportTitle = 'Operational Expenditure Report';
        headers = ['Voucher ID', 'Category', 'Expense Date', 'Remarks', 'Amount (LKR)'];
        rows = filteredExpenses.map((e) => [
          e.id,
          `"${e.categoryName.replace(/"/g, '""')}"`,
          e.expenseDate,
          `"${e.remarks.replace(/"/g, '""')}"`,
          e.amount.toFixed(2),
        ]);
        break;

      case 'INVENTORY_REPORT':
        reportTitle = 'Inventory Report (Grow Mart)';
        headers = ['Item Code', 'Product Description', 'Batch #', 'Cost (LKR)', 'Selling Price (LKR)', 'Stock', 'Valuation (LKR)', 'Status'];
        rows = inventoryReportData.inventoryItems.map((i) => [
          i.id,
          `"${i.name.replace(/"/g, '""')}"`,
          i.batchNumber,
          i.unitCost.toFixed(2),
          i.sellingPrice.toFixed(2),
          i.currentStock,
          (i.currentStock * i.unitCost).toFixed(2),
          i.status,
        ]);
        break;

      case 'DAILY_SALES':
        reportTitle = 'Daily Sales Report';
        headers = ['Date', 'Booked Revenue (LKR)', 'Delivered COD (LKR)', 'Orders Count'];
        rows = dailySalesData.rows.map((r) => [r.date, r.revenue.toFixed(2), r.delivered.toFixed(2), r.ordersCount]);
        break;

      case 'WEEKLY_SALES':
        reportTitle = 'Weekly Sales Report';
        headers = ['Week Period', 'Total Revenue (LKR)', 'Delivered COD (LKR)', 'Orders Count'];
        rows = weeklySalesData.rows.map((r) => [r.week, r.revenue.toFixed(2), r.delivered.toFixed(2), r.ordersCount]);
        break;

      case 'MONTHLY_SALES':
        reportTitle = 'Monthly Sales & Target Report';
        headers = ['Month', 'Actual Sales (LKR)', 'Sales Target (LKR)', 'Delivered COD (LKR)', 'Orders'];
        rows = monthlySalesData.rows.map((r) => [r.month, r.actualSales.toFixed(2), r.target.toFixed(2), r.delivered.toFixed(2), r.ordersCount]);
        break;

      case 'DISTRICT_DELIVERY':
        reportTitle = 'District-wise Delivery Report';
        headers = ['District / City', 'Delivered Orders', 'In-Transit Dispatched', 'Rejected Returns', 'Total Realized COD (LKR)'];
        rows = districtDeliveryData.rows.map((r) => [r.district, r.delivered, r.dispatched, r.rejected, r.totalCOD.toFixed(2)]);
        break;
    }

    const csvContent = [
      `"500 Labs - ${reportTitle}"`,
      `"Generated Date","${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}"`,
      `"Team Filter","${selectedTeamId === 'ALL' ? 'All Brands' : teamMap[selectedTeamId]?.name || selectedTeamId}"`,
      `"Date Range","${startDate || 'Start'} to ${endDate || 'Present'}"`,
      '',
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedReport}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${reportTitle} exported successfully!`);
  };

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Financial & Sales Reports"
        description="Comprehensive 9-report suite supporting Income Statements, Cash Flow, FSR, Grow Mart Inventory, and granular Sales reports."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<Download className="w-4 h-4 text-blue-600" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => setIsPrintModalOpen(true)}
            >
              Print / PDF View
            </Button>
          </div>
        }
      />

      {/* Report Selection & Multi-Parameter Filter Toolbar */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Report Selector */}
            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">
                Select Official Report
              </label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value as ReportType)}
                className="w-full h-10 rounded-lg border border-blue-300 bg-blue-50/50 px-3 text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="📊 Finance Reports">
                  <option value="INCOME_STATEMENT">1. Income Statement (P&L)</option>
                  <option value="CASH_FLOW">2. Cash Flow Statement</option>
                  <option value="FSR">3. Financial Status Report (FSR)</option>
                  <option value="EXPENSE_REPORT">4. Operational Expense Report</option>
                  <option value="INVENTORY_REPORT">5. Inventory Report (Grow Mart)</option>
                </optgroup>
                <optgroup label="📈 Sales Reports">
                  <option value="DAILY_SALES">6. Daily Sales Report</option>
                  <option value="WEEKLY_SALES">7. Weekly Sales Report</option>
                  <option value="MONTHLY_SALES">8. Monthly Sales & Target Report</option>
                  <option value="DISTRICT_DELIVERY">9. Delivery Report (District-wise)</option>
                </optgroup>
              </select>
            </div>

            {/* 2. Team-wise Filter */}
            <div>
              <Select
                label="Team / Brand Filter"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                options={[
                  { value: 'ALL', label: '🌟 All Brands & Teams' },
                  ...teams.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` })),
                ]}
              />
            </div>

            {/* 3. Date Range Filter */}
            <div>
              <Select
                label="Reporting Period"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                options={[
                  { value: 'THIS_MONTH', label: 'This Month' },
                  { value: 'LAST_MONTH', label: 'Last Month' },
                  { value: 'THIS_WEEK', label: 'This Week' },
                  { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
                  { value: 'TODAY', label: 'Today' },
                  { value: 'ALL', label: 'All Historical Time' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────────────
          RENDER SELECTED REPORT VIEW
         ───────────────────────────────────────────────────────────────────────── */}

      {/* REPORT 1: INCOME STATEMENT (P&L) */}
      {selectedReport === 'INCOME_STATEMENT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Delivered Gross Sales"
              value={formatCurrency(incomeStatementData.grossDeliveredRevenue)}
              subtitle="Realized cash on delivery"
              icon={<DollarSign className="w-4 h-4" />}
              accentColor="green"
            />
            <StatCard
              title="Estimated COGS"
              value={formatCurrency(incomeStatementData.estimatedCOGS)}
              subtitle="Product acquisition cost"
              icon={<Package className="w-4 h-4" />}
              accentColor="amber"
            />
            <StatCard
              title="Gross Profit"
              value={formatCurrency(incomeStatementData.grossProfit)}
              subtitle={`${incomeStatementData.grossMarginPct.toFixed(1)}% Gross Margin`}
              icon={<TrendingUp className="w-4 h-4" />}
              accentColor="blue"
            />
            <StatCard
              title="Net Operating Income"
              value={formatCurrency(incomeStatementData.netOperatingIncome)}
              subtitle={`${incomeStatementData.netMarginPct.toFixed(1)}% Net Margin`}
              icon={<CheckCircle2 className="w-4 h-4" />}
              accentColor={incomeStatementData.netOperatingIncome >= 0 ? 'green' : 'amber'}
            />
          </div>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Income Statement (Profit & Loss Ledger)
              </CardTitle>
              <CardDescription>
                Detailed financial statement for {startDate || 'inception'} to {endDate || 'present'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="enterprise-table-container">
                <table className="w-full text-left text-sm text-slate-700">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td className="py-3 px-4" colSpan={2}>1. REVENUE</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-8 text-xs text-slate-700">Delivered Orders Cash Collections (COD)</td>
                      <td className="py-2.5 px-4 text-xs font-mono font-bold text-right text-emerald-700">
                        {formatCurrency(incomeStatementData.grossDeliveredRevenue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-8 text-xs text-slate-500 italic">Dispatched Goods in Transit (Accrual)</td>
                      <td className="py-2.5 px-4 text-xs font-mono text-right text-slate-500">
                        {formatCurrency(incomeStatementData.inTransitRevenue)}
                      </td>
                    </tr>

                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td className="py-3 px-4" colSpan={2}>2. COST OF GOODS SOLD (COGS)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-8 text-xs text-slate-700">Inventory Acquisition & Packaging Costs</td>
                      <td className="py-2.5 px-4 text-xs font-mono font-bold text-right text-amber-700">
                        ({formatCurrency(incomeStatementData.estimatedCOGS)})
                      </td>
                    </tr>

                    <tr className="bg-blue-50/50 font-bold text-blue-900">
                      <td className="py-3 px-4">GROSS PROFIT (Revenue - COGS)</td>
                      <td className="py-3 px-4 text-right font-mono text-blue-700">
                        {formatCurrency(incomeStatementData.grossProfit)} ({incomeStatementData.grossMarginPct.toFixed(1)}%)
                      </td>
                    </tr>

                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td className="py-3 px-4" colSpan={2}>3. OPERATING EXPENDITURES</td>
                    </tr>
                    {Object.entries(incomeStatementData.expenseCategories).map(([cat, amt]) => (
                      <tr key={cat}>
                        <td className="py-2.5 px-8 text-xs text-slate-700">{cat}</td>
                        <td className="py-2.5 px-4 text-xs font-mono text-right text-rose-700">
                          ({formatCurrency(amt)})
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold text-slate-800">
                      <td className="py-2.5 px-4">Total Operating Expenses</td>
                      <td className="py-2.5 px-4 text-right font-mono text-rose-800">
                        ({formatCurrency(incomeStatementData.totalOpEx)})
                      </td>
                    </tr>

                    <tr className="bg-emerald-50 font-extrabold text-emerald-950 text-base">
                      <td className="py-4 px-4">NET OPERATING INCOME / (LOSS)</td>
                      <td className="py-4 px-4 text-right font-mono text-emerald-700 text-lg">
                        {formatCurrency(incomeStatementData.netOperatingIncome)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Waterfall / Bar Chart */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">Income & Margin Visualization</CardTitle>
              <CardDescription>Revenue conversion through COGS and Operating Expenses to Net Profit</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeStatementData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(val) => `Rs. ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {incomeStatementData.chartData.map((entry, index) => (
                      <Cell key={`cell-pnl-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* REPORT 2: CASH FLOW STATEMENT */}
      {selectedReport === 'CASH_FLOW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Cash Inflows"
              value={formatCurrency(cashFlowData.totalCashInflows)}
              subtitle="COD Collections & Allocations"
              icon={<DollarSign className="w-4 h-4" />}
              accentColor="green"
            />
            <StatCard
              title="Total Cash Outflows"
              value={formatCurrency(cashFlowData.totalCashOutflows)}
              subtitle="Disbursements & Logged Costs"
              icon={<Layers className="w-4 h-4" />}
              accentColor="amber"
            />
            <StatCard
              title="Net Cash Position"
              value={formatCurrency(cashFlowData.netCashFlow)}
              subtitle={cashFlowData.netCashFlow >= 0 ? 'Positive Cash Flow' : 'Negative Cash Flow'}
              icon={<TrendingUp className="w-4 h-4" />}
              accentColor={cashFlowData.netCashFlow >= 0 ? 'green' : 'amber'}
            />
          </div>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">Cash Flow Statement</CardTitle>
              <CardDescription>Liquid inflows vs disbursements</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="enterprise-table-container">
                <table className="w-full text-left text-sm text-slate-700">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td className="py-3 px-4" colSpan={2}>CASH INFLOWS (OPERATING)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-8 text-xs text-slate-700">Customer COD Settlements Received</td>
                      <td className="py-2.5 px-4 text-xs font-mono font-bold text-right text-emerald-700">
                        {formatCurrency(cashFlowData.totalCODInflows)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-8 text-xs text-slate-700">Main Finance Wallet Top-ups</td>
                      <td className="py-2.5 px-4 text-xs font-mono font-bold text-right text-emerald-700">
                        {formatCurrency(cashFlowData.walletAllocations)}
                      </td>
                    </tr>

                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td className="py-3 px-4" colSpan={2}>CASH OUTFLOWS (DISBURSEMENTS)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-8 text-xs text-slate-700">Petty Cash Vouchers Disbursed</td>
                      <td className="py-2.5 px-4 text-xs font-mono font-bold text-right text-rose-700">
                        ({formatCurrency(cashFlowData.pettyDisbursements)})
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-8 text-xs text-slate-700">Direct Operational & Courier Expenses</td>
                      <td className="py-2.5 px-4 text-xs font-mono font-bold text-right text-rose-700">
                        ({formatCurrency(cashFlowData.operatingExpenseOutflows)})
                      </td>
                    </tr>

                    <tr className="bg-blue-50 font-extrabold text-blue-950 text-base">
                      <td className="py-4 px-4">NET CASH SURPLUS / (DEFICIT)</td>
                      <td className="py-4 px-4 text-right font-mono text-blue-700 text-lg">
                        {formatCurrency(cashFlowData.netCashFlow)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow Bar Chart */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">Cash Flow Comparison</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#334155' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `Rs. ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {cashFlowData.chartData.map((e, idx) => (
                      <Cell key={`cell-cf-${idx}`} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* REPORT 3: FINANCIAL STATUS REPORT (FSR) */}
      {selectedReport === 'FSR' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Current Assets"
              value={formatCurrency(fsrData.currentAssets)}
              subtitle="Receivables, Cash & Stock"
              icon={<DollarSign className="w-4 h-4" />}
              accentColor="blue"
            />
            <StatCard
              title="Accrued Liabilities"
              value={formatCurrency(fsrData.accruedExpenses)}
              subtitle="Operating payable obligations"
              icon={<Layers className="w-4 h-4" />}
              accentColor="amber"
            />
            <StatCard
              title="Net Working Capital"
              value={formatCurrency(fsrData.netWorkingCapital)}
              subtitle="Solvency & Liquidity Buffer"
              icon={<CheckCircle2 className="w-4 h-4" />}
              accentColor="green"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200 bg-white">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base font-bold text-slate-900">
                  Financial Status Report (Balance Snapshot)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left text-sm text-slate-700">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td className="py-3 px-4" colSpan={2}>CURRENT ASSETS</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-8 text-xs">Petty Cash In Wallets (Liquid)</td>
                      <td className="py-2.5 px-4 text-xs font-mono font-bold text-right text-emerald-700">
                        {formatCurrency(fsrData.pettyCashInHand)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-8 text-xs">Dispatched Receivables in Courier Transit</td>
                      <td className="py-2.5 px-4 text-xs font-mono font-bold text-right text-blue-700">
                        {formatCurrency(fsrData.dispatchedReceivables)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-8 text-xs">Grow Mart Inventory Valuation (at Cost)</td>
                      <td className="py-2.5 px-4 text-xs font-mono font-bold text-right text-purple-700">
                        {formatCurrency(fsrData.stockValuationEst)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td className="py-3 px-4" colSpan={2}>CURRENT LIABILITIES</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-8 text-xs">Accrued Courier Fees & Operational Invoices</td>
                      <td className="py-2.5 px-4 text-xs font-mono font-bold text-right text-rose-700">
                        ({formatCurrency(fsrData.accruedExpenses)})
                      </td>
                    </tr>
                    <tr className="bg-emerald-50 font-extrabold text-emerald-950">
                      <td className="py-3.5 px-4">NET WORKING CAPITAL POSITION</td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold">
                        {formatCurrency(fsrData.netWorkingCapital)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Asset Composition Donut Chart */}
            <Card className="border-slate-200 bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900">Asset Composition</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fsrData.assetComposition}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {fsrData.assetComposition.map((entry, index) => (
                        <Cell key={`cell-fsr-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), 'Value']} />
                    <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* REPORT 4: EXPENSE REPORT */}
      {selectedReport === 'EXPENSE_REPORT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Expenditure"
              value={formatCurrency(expenseReportData.totalAmount)}
              subtitle={`${filteredExpenses.length} Logged Vouchers`}
              icon={<DollarSign className="w-4 h-4" />}
              accentColor="amber"
            />
            <StatCard
              title="Postal & Shipping Charges"
              value={formatCurrency(expenseReportData.categoryTotals['Postal Charges'] || 0)}
              subtitle="Courier delivery fees"
              icon={<Layers className="w-4 h-4" />}
              accentColor="purple"
            />
            <StatCard
              title="Printing & Stationery"
              value={formatCurrency(expenseReportData.categoryTotals['Printing'] || 0)}
              subtitle="A4/A6 dispatch paper & labels"
              icon={<FileText className="w-4 h-4" />}
              accentColor="blue"
            />
          </div>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Operational Expenditure Vouchers Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="enterprise-table-container">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Voucher ID</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Description / Remarks</th>
                      <th className="py-3 px-4 text-right">Amount (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-blue-700">{exp.id}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-800">{exp.categoryName}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">{exp.expenseDate}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">{exp.remarks}</td>
                        <td className="py-3 px-4 text-xs text-right font-mono font-bold text-rose-700">
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* REPORT 5: INVENTORY REPORT (GROW MART) */}
      {selectedReport === 'INVENTORY_REPORT' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Stock Valuation (At Cost)"
              value={formatCurrency(inventoryReportData.totalCostValuation)}
              subtitle="Asset acquisition cost"
              icon={<Boxes className="w-4 h-4" />}
              accentColor="blue"
            />
            <StatCard
              title="Stock Valuation (At Retail)"
              value={formatCurrency(inventoryReportData.totalRetailValuation)}
              subtitle="Gross expected selling value"
              icon={<DollarSign className="w-4 h-4" />}
              accentColor="green"
            />
            <StatCard
              title="Total Units on Hand"
              value={`${inventoryReportData.totalUnitsOnHand} Units`}
              subtitle="Grow Mart warehouse inventory"
              icon={<Package className="w-4 h-4" />}
              accentColor="purple"
            />
          </div>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Grow Mart Inventory Stock & Valuation Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="enterprise-table-container">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Item Code</th>
                      <th className="py-3 px-4">Product Description</th>
                      <th className="py-3 px-4">Batch Number</th>
                      <th className="py-3 px-4 text-right">Unit Cost</th>
                      <th className="py-3 px-4 text-right">Selling Price</th>
                      <th className="py-3 px-4 text-center">In Stock</th>
                      <th className="py-3 px-4 text-right">Valuation (Cost)</th>
                      <th className="py-3 px-4 text-center">Batch Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryReportData.inventoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-slate-800">{item.id}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-slate-900">{item.name}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">{item.batchNumber}</td>
                        <td className="py-3 px-4 text-xs text-right font-mono">{formatCurrency(item.unitCost)}</td>
                        <td className="py-3 px-4 text-xs text-right font-mono font-semibold text-emerald-700">
                          {formatCurrency(item.sellingPrice)}
                        </td>
                        <td className="py-3 px-4 text-xs text-center font-bold">{item.currentStock}</td>
                        <td className="py-3 px-4 text-xs text-right font-mono font-bold text-blue-700">
                          {formatCurrency(item.currentStock * item.unitCost)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.status === 'LOW_STOCK'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Valuation Bar Chart */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">Inventory Valuation by Product</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryReportData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `Rs. ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), '']} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="stockValuationCost" name="Stock Value at Cost (LKR)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stockValuationRetail" name="Stock Value at Retail (LKR)" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* REPORT 6: DAILY SALES REPORT */}
      {selectedReport === 'DAILY_SALES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Total Filtered Revenue"
              value={formatCurrency(dailySalesData.totalRevenue)}
              subtitle="All booked order value"
              icon={<DollarSign className="w-4 h-4" />}
              accentColor="blue"
            />
            <StatCard
              title="Delivered COD Revenue"
              value={formatCurrency(dailySalesData.totalDelivered)}
              subtitle="Realized courier settlements"
              icon={<CheckCircle2 className="w-4 h-4" />}
              accentColor="green"
            />
          </div>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">Daily Sales Summary Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="enterprise-table-container">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Orders Count</th>
                      <th className="py-3 px-4 text-right">Booked Sales (LKR)</th>
                      <th className="py-3 px-4 text-right">Delivered COD (LKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailySalesData.rows.map((r) => (
                      <tr key={r.date} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-semibold text-xs text-slate-900">{r.date}</td>
                        <td className="py-3 px-4 text-center text-xs font-bold">{r.ordersCount}</td>
                        <td className="py-3 px-4 text-right text-xs font-mono font-bold text-blue-700">
                          {formatCurrency(r.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-mono font-bold text-emerald-700">
                          {formatCurrency(r.delivered)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Daily Sales Bar Chart */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">Daily Sales Momentum</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySalesData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#334155' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `Rs. ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), '']} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="revenue" name="Booked Sales (LKR)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="delivered" name="Delivered COD (LKR)" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* REPORT 7: WEEKLY SALES REPORT */}
      {selectedReport === 'WEEKLY_SALES' && (
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">Week-over-Week Sales Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="enterprise-table-container">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Week Period</th>
                      <th className="py-3 px-4 text-center">Orders Count</th>
                      <th className="py-3 px-4 text-right">Gross Booked Sales</th>
                      <th className="py-3 px-4 text-right">Delivered COD Settlements</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weeklySalesData.rows.map((r) => (
                      <tr key={r.week} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-semibold text-xs text-slate-900">{r.week}</td>
                        <td className="py-3 px-4 text-center text-xs font-bold">{r.ordersCount}</td>
                        <td className="py-3 px-4 text-right text-xs font-mono font-bold text-blue-700">
                          {formatCurrency(r.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-mono font-bold text-emerald-700">
                          {formatCurrency(r.delivered)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Line Chart */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">Weekly Revenue Trajectory</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklySalesData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#334155' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `Rs. ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), '']} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="revenue" name="Booked Sales (LKR)" stroke="#2563EB" strokeWidth={3} />
                  <Line type="monotone" dataKey="delivered" name="Delivered COD (LKR)" stroke="#10B981" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* REPORT 8: MONTHLY SALES & TARGET REPORT */}
      {selectedReport === 'MONTHLY_SALES' && (
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Monthly Performance vs Target Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="enterprise-table-container">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Month</th>
                      <th className="py-3 px-4 text-right">Target Goal</th>
                      <th className="py-3 px-4 text-right">Actual Booked Sales</th>
                      <th className="py-3 px-4 text-right">Delivered COD</th>
                      <th className="py-3 px-4 text-center">Achievement %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlySalesData.rows.map((r) => {
                      const achPct = r.target > 0 ? (r.actualSales / r.target) * 100 : 0;
                      return (
                        <tr key={r.month} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-bold text-xs text-slate-900">{r.month}</td>
                          <td className="py-3 px-4 text-right text-xs font-mono text-slate-500">
                            {formatCurrency(r.target)}
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-mono font-bold text-blue-700">
                            {formatCurrency(r.actualSales)}
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-mono font-bold text-emerald-700">
                            {formatCurrency(r.delivered)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                achPct >= 100
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {achPct.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Bar Chart */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">Monthly Sales Goal vs Actual</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySalesData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#334155' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `Rs. ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), '']} />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="target" name="Monthly Target Goal" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actualSales" name="Actual Booked Sales" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="delivered" name="Delivered COD" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* REPORT 9: DISTRICT-WISE DELIVERY REPORT */}
      {selectedReport === 'DISTRICT_DELIVERY' && (
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                District-wise Fulfillment & Delivery Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="enterprise-table-container">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">District / City Region</th>
                      <th className="py-3 px-4 text-center">Delivered Orders</th>
                      <th className="py-3 px-4 text-center">In-Transit Dispatches</th>
                      <th className="py-3 px-4 text-center">Rejected Returns</th>
                      <th className="py-3 px-4 text-center">Success Rate %</th>
                      <th className="py-3 px-4 text-right">Realized COD Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {districtDeliveryData.rows.map((r) => {
                      const fulfilled = r.delivered + r.rejected;
                      const rate = fulfilled > 0 ? (r.delivered / fulfilled) * 100 : 100;
                      return (
                        <tr key={r.district} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-semibold text-xs text-slate-900">{r.district}</td>
                          <td className="py-3 px-4 text-center text-xs font-bold text-emerald-700">{r.delivered}</td>
                          <td className="py-3 px-4 text-center text-xs text-blue-700">{r.dispatched}</td>
                          <td className="py-3 px-4 text-center text-xs text-rose-700">{r.rejected}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                rate >= 80
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {rate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-mono font-bold text-emerald-700">
                            {formatCurrency(r.totalCOD)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* District Revenue Bar Chart */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-slate-900">
                Top Districts by Delivered COD Collections
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtDeliveryData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="district" tick={{ fontSize: 11, fill: '#334155' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `Rs. ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), 'COD Realized']} />
                  <Bar dataKey="deliveredCOD" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          EXECUTIVE PRINT / PDF SIGN-OFF MODAL
         ───────────────────────────────────────────────────────────────────────── */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Official Financial Print & Sign-Off Document</h3>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold text-slate-900 uppercase">500 Labs Enterprise Financial Report</h2>
                <p className="text-slate-500 text-xs mt-1">
                  Report Type: <span className="font-bold text-blue-700">{selectedReport}</span> | Generated:{' '}
                  {format(new Date(), 'yyyy-MM-dd HH:mm')}
                </p>
                <p className="text-slate-500 text-xs">
                  Scope: {selectedTeamId === 'ALL' ? 'All System Brands' : teamMap[selectedTeamId]?.name} | Window:{' '}
                  {startDate || 'Inception'} - {endDate || 'Present'}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900">Executive Summary & Audit Trail</h4>
                <p className="text-slate-600 leading-relaxed">
                  This report has been automatically reconciled against real-time order bookings, delivered courier COD
                  settlements, and validated petty cash transactions. All monetary amounts are denoted in Sri Lankan
                  Rupees (LKR).
                </p>
              </div>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-3 gap-8 text-center text-xs">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">Prepared By</p>
                  <p className="text-slate-500">Finance Analyst</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">Reviewed By</p>
                  <p className="text-slate-500">Finance Supervisor</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">Executive Approval</p>
                  <p className="text-slate-500">Chief Executive / Director</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsPrintModalOpen(false)}>
                Close Preview
              </Button>
              <Button
                variant="primary"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => {
                  window.print();
                }}
              >
                Print Document
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
