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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
  Calendar,
  Filter,
  Layers,
  CheckCircle2,
  TrendingUp,
  Package,
  Boxes,
  MapPin,
  Sparkles,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  Printer,
  X,
  ShieldCheck,
  Building2,
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
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

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

    const cogsAdult = adultUnitsSold * 2500;
    const cogsKids = kidsUnitsSold * 1500;
    const estimatedCOGS = cogsAdult + cogsKids || grossDeliveredRevenue * 0.4;
    const grossProfit = grossDeliveredRevenue - estimatedCOGS;
    const grossMarginPct = grossDeliveredRevenue > 0 ? (grossProfit / grossDeliveredRevenue) * 100 : 0;

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
      const shortItemCode = p.code || (p.id.includes('-') ? `PRD-${p.id.split('-')[0].toUpperCase()}` : `PRD-${p.id.slice(0, 8).toUpperCase()}`);
      if (p.batches && p.batches.length > 0) {
        return p.batches.map((b) => ({
          id: p.id,
          itemCode: shortItemCode,
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
        itemCode: shortItemCode,
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

  const activeBrandLabel = selectedTeamId === 'ALL' ? 'All System Brands' : teamMap[selectedTeamId]?.name || selectedTeamId;
  const activeDateWindow = `${startDate || 'Inception'} to ${endDate || 'Present'}`;

  const getReportFriendlyName = () => {
    switch (selectedReport) {
      case 'INCOME_STATEMENT': return 'Income Statement (P&L Audit)';
      case 'CASH_FLOW': return 'Cash Flow Statement';
      case 'FSR': return 'Financial Status Report (FSR)';
      case 'EXPENSE_REPORT': return 'Operational Expenditure Report';
      case 'INVENTORY_REPORT': return 'Grow Mart Inventory & Valuation Report';
      case 'DAILY_SALES': return 'Daily Sales Ledger Report';
      case 'WEEKLY_SALES': return 'Weekly Sales Performance Report';
      case 'MONTHLY_SALES': return 'Monthly Sales & Target Achievement Report';
      case 'DISTRICT_DELIVERY': return 'District-wise Fulfillment & Delivery Report';
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // High-Grade Dedicated Full-Width A4 Print / PDF Engine
  // ─────────────────────────────────────────────────────────────────────────────
  const handlePrintOfficialDocument = () => {
    const printableElement = document.getElementById('official-printable-pdf-document');
    if (!printableElement) return;

    const printWindow = window.open('', '_blank', 'width=1100,height=1200');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>500 Labs - ${getReportFriendlyName()}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              width: 100% !important;
              font-size: 12px;
              line-height: 1.45;
            }
            .a4-container {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto;
            }
            .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .header-bar {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2.5px solid #0f172a;
              padding-bottom: 14px;
              margin-bottom: 18px;
            }
            .brand-title {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: -0.02em;
              margin: 0;
            }
            .brand-sub {
              font-size: 10px;
              font-weight: 700;
              color: #1d4ed8;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-top: 2px;
            }
            .badge-audit {
              display: inline-block;
              background: #eff6ff;
              color: #1e40af;
              border: 1px solid #bfdbfe;
              border-radius: 9999px;
              padding: 2px 10px;
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
            }
            .scope-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 16px;
            }
            .scope-label {
              font-size: 9px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              display: block;
            }
            .scope-val {
              font-size: 13px;
              font-weight: 800;
              color: #0f172a;
              margin-top: 2px;
              display: block;
            }
            .kpi-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-bottom: 18px;
            }
            .kpi-card {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 12px;
              background: #ffffff;
            }
            .kpi-title {
              font-size: 9px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
            }
            .kpi-amount {
              font-size: 16px;
              font-weight: 900;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              margin-top: 4px;
            }
            .kpi-green { color: #047857; }
            .kpi-blue { color: #1d4ed8; }
            .kpi-dark { color: #0f172a; }
            table {
              width: 100% !important;
              border-collapse: collapse;
              margin-top: 6px;
              margin-bottom: 18px;
              page-break-inside: auto;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            th {
              background-color: #0f172a !important;
              color: #ffffff !important;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              padding: 8px 12px;
              border: none;
            }
            td {
              padding: 7px 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 11px;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .font-extrabold { font-weight: 900; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .audit-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 10px 14px;
              font-size: 10px;
              color: #475569;
              margin-top: 16px;
              line-height: 1.4;
            }
            .signatory-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 36px;
              padding-top: 16px;
              border-top: 1.5px solid #cbd5e1;
              text-align: center;
            }
            .sig-line {
              border-bottom: 1px solid #475569;
              margin-bottom: 8px;
            }
            .sig-name {
              font-size: 11px;
              font-weight: 800;
              color: #0f172a;
            }
            .sig-role {
              font-size: 9px;
              color: #64748b;
              text-transform: uppercase;
            }
            .footer-note {
              text-align: center;
              font-size: 8px;
              color: #94a3b8;
              margin-top: 24px;
              font-family: ui-monospace, monospace;
            }
          </style>
        </head>
        <body>
          <div class="a4-container">
            ${printableElement.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Financial & Sales Reports"
        description="Executive multi-brand reporting engine with real-time audit ledgers, dynamic visuals, and full-width A4 presentation PDF generation."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              leftIcon={<Printer className="w-4 h-4 text-white" />}
              onClick={() => setIsPdfModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs flex items-center gap-1.5"
            >
              <span>Preview & Print Official PDF</span>
            </Button>
          </div>
        }
      />

      {/* Report Selection & Multi-Parameter Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Report Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-700 mb-1.5 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Select Official Report</span>
            </label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as ReportType)}
              className="w-full h-10 rounded-xl border border-blue-200 bg-blue-50/40 px-3.5 text-xs font-bold text-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
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
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          RENDER SELECTED REPORT VIEW (UI Friendly Modern Table Design)
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Income Statement (Profit & Loss Ledger)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accounting period: {startDate || 'Inception'} to {endDate || 'Present'}
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold font-mono">
                Net Margin: {incomeStatementData.netMarginPct.toFixed(1)}%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-100/70 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    <td className="py-2.5 px-4" colSpan={2}>1. REVENUE INTAKE</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6 font-medium text-slate-800">Delivered Orders Cash Collections (COD)</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(incomeStatementData.grossDeliveredRevenue)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-6 text-slate-500 italic">Dispatched Goods in Courier Transit (Accrual)</td>
                    <td className="py-2.5 px-6 text-right font-mono text-slate-500">
                      {formatCurrency(incomeStatementData.inTransitRevenue)}
                    </td>
                  </tr>

                  <tr className="bg-slate-100/70 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    <td className="py-2.5 px-4" colSpan={2}>2. COST OF GOODS SOLD (COGS)</td>
                  </tr>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-6 font-medium text-slate-800">Inventory Acquisition & Unit Manufacturing Cost</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-amber-700">
                      ({formatCurrency(incomeStatementData.estimatedCOGS)})
                    </td>
                  </tr>

                  <tr className="bg-blue-50/60 font-bold text-blue-950 border-y border-blue-200">
                    <td className="py-3.5 px-4 text-xs font-bold">GROSS PROFIT (Delivered Revenue - COGS)</td>
                    <td className="py-3.5 px-6 text-right font-mono font-extrabold text-blue-700 text-sm">
                      {formatCurrency(incomeStatementData.grossProfit)}{' '}
                      <span className="text-xs font-semibold text-blue-600">({incomeStatementData.grossMarginPct.toFixed(1)}%)</span>
                    </td>
                  </tr>

                  <tr className="bg-slate-100/70 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    <td className="py-2.5 px-4" colSpan={2}>3. OPERATING EXPENDITURES</td>
                  </tr>
                  {Object.entries(incomeStatementData.expenseCategories).length === 0 ? (
                    <tr>
                      <td className="py-2.5 px-6 text-slate-400 italic" colSpan={2}>
                        No operating expense vouchers recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(incomeStatementData.expenseCategories).map(([cat, amt]) => (
                      <tr key={cat} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-6 text-slate-700">{cat}</td>
                        <td className="py-2.5 px-6 text-right font-mono text-rose-700 font-semibold">
                          ({formatCurrency(amt)})
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-slate-50 font-bold text-slate-800">
                    <td className="py-3 px-4">Total Operating Expenses</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-rose-800">
                      ({formatCurrency(incomeStatementData.totalOpEx)})
                    </td>
                  </tr>

                  <tr className="bg-emerald-50/80 font-extrabold text-emerald-950 border-t-2 border-emerald-300">
                    <td className="py-4 px-4 text-sm uppercase tracking-wide">NET OPERATING INCOME / (LOSS)</td>
                    <td className="py-4 px-6 text-right font-mono text-emerald-800 text-base font-extrabold">
                      {formatCurrency(incomeStatementData.netOperatingIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-2">
            <h4 className="text-sm font-bold text-slate-900">Income & Margin Visualization</h4>
            <p className="text-xs text-slate-500">Revenue conversion through COGS and Operating Expenses to Net Profit</p>
            <div className="h-[280px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeStatementData.chartData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(val) => `Rs. ${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {incomeStatementData.chartData.map((entry, index) => (
                      <Cell key={`cell-pnl-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900">Cash Flow Statement Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-100/70 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    <td className="py-2.5 px-4" colSpan={2}>CASH INFLOWS (OPERATING)</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-6 font-medium">Customer COD Settlements Received</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(cashFlowData.totalCODInflows)}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-6 text-slate-600">Main Finance Wallet Top-ups</td>
                    <td className="py-2.5 px-6 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(cashFlowData.walletAllocations)}
                    </td>
                  </tr>

                  <tr className="bg-slate-100/70 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    <td className="py-2.5 px-4" colSpan={2}>CASH OUTFLOWS (DISBURSEMENTS)</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-6 font-medium">Petty Cash Vouchers Disbursed</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-rose-700">
                      ({formatCurrency(cashFlowData.pettyDisbursements)})
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-6 text-slate-600">Direct Operational & Courier Expenses</td>
                    <td className="py-2.5 px-6 text-right font-mono font-bold text-rose-700">
                      ({formatCurrency(cashFlowData.operatingExpenseOutflows)})
                    </td>
                  </tr>

                  <tr className="bg-blue-50 font-extrabold text-blue-950 border-t-2 border-blue-300">
                    <td className="py-4 px-4 text-sm uppercase">NET CASH SURPLUS / (DEFICIT)</td>
                    <td className="py-4 px-6 text-right font-mono text-blue-700 text-base font-extrabold">
                      {formatCurrency(cashFlowData.netCashFlow)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
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
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/60">
                <h3 className="font-bold text-sm text-slate-900">Financial Status Report (Balance Sheet Snapshot)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-100/70 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      <td className="py-2.5 px-4" colSpan={2}>CURRENT ASSETS</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-6">Petty Cash In Wallets (Liquid)</td>
                      <td className="py-3 px-6 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(fsrData.pettyCashInHand)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-6">Dispatched Receivables in Courier Transit</td>
                      <td className="py-3 px-6 text-right font-mono font-bold text-blue-700">
                        {formatCurrency(fsrData.dispatchedReceivables)}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-6">Grow Mart Inventory Valuation (at Cost)</td>
                      <td className="py-3 px-6 text-right font-mono font-bold text-purple-700">
                        {formatCurrency(fsrData.stockValuationEst)}
                      </td>
                    </tr>
                    <tr className="bg-slate-100/70 font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      <td className="py-2.5 px-4" colSpan={2}>CURRENT LIABILITIES</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-6">Accrued Courier Fees & Operational Invoices</td>
                      <td className="py-3 px-6 text-right font-mono font-bold text-rose-700">
                        ({formatCurrency(fsrData.accruedExpenses)})
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/80 font-extrabold text-emerald-950 border-t-2 border-emerald-300">
                      <td className="py-4 px-4 text-sm uppercase">NET WORKING CAPITAL POSITION</td>
                      <td className="py-4 px-6 text-right font-mono text-emerald-800 text-base font-extrabold">
                        {formatCurrency(fsrData.netWorkingCapital)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-center">
              <h4 className="text-sm font-bold text-slate-900 mb-2">Asset Composition</h4>
              <div className="h-[240px]">
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
              </div>
            </div>
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900">Operational Expenditure Vouchers Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Voucher ID</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description / Remarks</th>
                    <th className="py-3 px-4 text-right">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No expense records found for the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{exp.id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{exp.categoryName}</td>
                        <td className="py-3 px-4 text-slate-600">{exp.expenseDate}</td>
                        <td className="py-3 px-4 text-slate-600">{exp.remarks || '-'}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredExpenses.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td className="py-3 px-4" colSpan={4}>Total Expenditure</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-800 font-extrabold text-sm">
                        {formatCurrency(expenseReportData.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900">
                Grow Mart Inventory Stock & Valuation Ledger
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
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
                  {inventoryReportData.inventoryItems.map((item, idx) => (
                    <tr key={`${item.id}-${item.batchNumber}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{item.itemCode}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{item.batchNumber}</td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(item.unitCost)}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                        {formatCurrency(item.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">{item.currentStock}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                        {formatCurrency(item.currentStock * item.unitCost)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td className="py-3 px-4" colSpan={5}>Total Stock Valuation</td>
                    <td className="py-3 px-4 text-center font-extrabold">{inventoryReportData.totalUnitsOnHand}</td>
                    <td className="py-3 px-4 text-right font-mono text-blue-800 font-extrabold text-sm">
                      {formatCurrency(inventoryReportData.totalCostValuation)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
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

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900">Daily Sales Summary Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Orders Count</th>
                    <th className="py-3 px-4 text-right">Booked Sales (LKR)</th>
                    <th className="py-3 px-4 text-right">Delivered COD (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailySalesData.rows.map((r) => (
                    <tr key={r.date} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{r.date}</td>
                      <td className="py-3 px-4 text-center font-bold">{r.ordersCount}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                        {formatCurrency(r.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(r.delivered)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td className="py-3 px-4">Total Period Volume</td>
                    <td className="py-3 px-4 text-center font-extrabold">
                      {dailySalesData.rows.reduce((acc, r) => acc + r.ordersCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-800 font-extrabold text-sm">
                      {formatCurrency(dailySalesData.totalRevenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800 font-extrabold text-sm">
                      {formatCurrency(dailySalesData.totalDelivered)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 7: WEEKLY SALES REPORT */}
      {selectedReport === 'WEEKLY_SALES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900">Week-over-Week Sales Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Week Period</th>
                    <th className="py-3 px-4 text-center">Orders Count</th>
                    <th className="py-3 px-4 text-right">Gross Booked Sales</th>
                    <th className="py-3 px-4 text-right">Delivered COD Settlements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklySalesData.rows.map((r) => (
                    <tr key={r.week} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{r.week}</td>
                      <td className="py-3 px-4 text-center font-bold">{r.ordersCount}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                        {formatCurrency(r.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(r.delivered)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 8: MONTHLY SALES & TARGET REPORT */}
      {selectedReport === 'MONTHLY_SALES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900">Monthly Performance vs Target Goals</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
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
                      <tr key={r.month} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.month}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {formatCurrency(r.target)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                          {formatCurrency(r.actualSales)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(r.delivered)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
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
          </div>
        </div>
      )}

      {/* REPORT 9: DISTRICT-WISE DELIVERY REPORT */}
      {selectedReport === 'DISTRICT_DELIVERY' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60">
              <h3 className="font-bold text-sm text-slate-900">District-wise Fulfillment & Delivery Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
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
                      <tr key={r.district} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{r.district}</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-700">{r.delivered}</td>
                        <td className="py-3 px-4 text-center text-blue-700">{r.dispatched}</td>
                        <td className="py-3 px-4 text-center text-rose-700">{r.rejected}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              rate >= 80
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(r.totalCOD)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                  <tr>
                    <td className="py-3 px-4">Total Regional Summary</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700">
                      {districtDeliveryData.rows.reduce((acc, r) => acc + r.delivered, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-blue-700">
                      {districtDeliveryData.rows.reduce((acc, r) => acc + r.dispatched, 0)}
                    </td>
                    <td className="py-3 px-4 text-center text-rose-700">
                      {districtDeliveryData.rows.reduce((acc, r) => acc + r.rejected, 0)}
                    </td>
                    <td></td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800 font-extrabold text-sm">
                      {formatCurrency(districtDeliveryData.rows.reduce((acc, r) => acc + r.totalCOD, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          OFFICIAL PRESENTATION-GRADE A4 PRINTABLE DOCUMENT MODAL
         ───────────────────────────────────────────────────────────────────────── */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[95vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Top Control Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Official Financial Document (A4 Print Engine)</h3>
                  <p className="text-[11px] text-slate-400">Full-width A4 formatted layout with automatic multi-page overflow</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={handlePrintOfficialDocument}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-xs text-xs"
                >
                  Print / Save as PDF
                </Button>
                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable A4 Canvas */}
            <div className="overflow-y-auto p-8 bg-slate-100/60">
              <div
                id="official-printable-pdf-document"
                className="max-w-3xl mx-auto bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200 text-slate-900 space-y-6"
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                {/* 1. Header & Letterhead Branding */}
                <div className="header-bar avoid-break">
                  <div>
                    <h1 className="brand-title">500 Labs Enterprise</h1>
                    <p className="brand-sub">Financial Intelligence & Revenue Operations</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge-audit">Official Audit Document</span>
                    <p style={{ fontSize: '10px', color: '#64748b', margin: '3px 0 0 0', fontFamily: 'monospace' }}>
                      Ref: DOC-FIN-{format(new Date(), 'yyyyMMdd')}-01
                    </p>
                    <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0 0' }}>
                      Date: {format(new Date(), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>

                {/* 2. Document Scope & Summary Details */}
                <div className="scope-grid avoid-break">
                  <div>
                    <span className="scope-label">Report Classification</span>
                    <span className="scope-val">{getReportFriendlyName()}</span>
                  </div>
                  <div>
                    <span className="scope-label">Brand / Team Entity</span>
                    <span className="scope-val">{activeBrandLabel}</span>
                  </div>
                  <div>
                    <span className="scope-label">Evaluation Window</span>
                    <span className="scope-val">{activeDateWindow}</span>
                  </div>
                </div>

                {/* 3. Executive KPI Snapshot */}
                <div className="kpi-grid avoid-break">
                  <div className="kpi-card">
                    <div className="kpi-title">Realized Delivered Revenue</div>
                    <div className="kpi-amount kpi-green">
                      {formatCurrency(incomeStatementData.grossDeliveredRevenue)}
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-title">Gross Operating Profit</div>
                    <div className="kpi-amount kpi-blue">
                      {formatCurrency(incomeStatementData.grossProfit)}
                    </div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-title">Net Operating Profit</div>
                    <div className="kpi-amount kpi-dark">
                      {formatCurrency(incomeStatementData.netOperatingIncome)}
                    </div>
                  </div>
                </div>

                {/* 4. Complete Data Table for All 9 Reports */}
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', marginBottom: '6px' }}>
                    Detailed Financial & Operational Ledger
                  </h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    {/* REPORT 1: INCOME STATEMENT */}
                    {selectedReport === 'INCOME_STATEMENT' && (
                      <>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Line Item / Account Classification</th>
                            <th style={{ textAlign: 'center' }}>Audit Category</th>
                            <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="font-bold">Delivered Customer Collections (COD)</td>
                            <td className="text-center font-bold" style={{ color: '#047857' }}>Realized Revenue</td>
                            <td className="text-right font-mono font-bold" style={{ color: '#047857' }}>
                              {formatCurrency(incomeStatementData.grossDeliveredRevenue)}
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold">Cost of Goods Sold (Inventory COGS)</td>
                            <td className="text-center font-bold" style={{ color: '#b45309' }}>Direct Cost</td>
                            <td className="text-right font-mono font-bold" style={{ color: '#b45309' }}>
                              ({formatCurrency(incomeStatementData.estimatedCOGS)})
                            </td>
                          </tr>
                          <tr style={{ background: '#eff6ff' }}>
                            <td className="font-bold" style={{ color: '#1e3a8a' }}>Gross Margin Profit</td>
                            <td className="text-center font-bold" style={{ color: '#1d4ed8' }}>{incomeStatementData.grossMarginPct.toFixed(1)}% Margin</td>
                            <td className="text-right font-mono font-bold" style={{ color: '#1e40af' }}>
                              {formatCurrency(incomeStatementData.grossProfit)}
                            </td>
                          </tr>
                          {Object.entries(incomeStatementData.expenseCategories).map(([cat, amt]) => (
                            <tr key={cat}>
                              <td style={{ paddingLeft: '24px', color: '#475569' }}>Operating Cost: {cat}</td>
                              <td className="text-center" style={{ color: '#64748b' }}>OpEx Voucher</td>
                              <td className="text-right font-mono" style={{ color: '#be123c' }}>
                                ({formatCurrency(amt)})
                              </td>
                            </tr>
                          ))}
                          <tr style={{ background: '#ecfdf5', borderTop: '2px solid #0f172a' }}>
                            <td className="font-extrabold" style={{ textTransform: 'uppercase' }}>Net Operating Income</td>
                            <td className="text-center font-bold" style={{ color: '#047857' }}>Bottom Line Profit</td>
                            <td className="text-right font-mono font-extrabold" style={{ color: '#065f46', fontSize: '13px' }}>
                              {formatCurrency(incomeStatementData.netOperatingIncome)}
                            </td>
                          </tr>
                        </tbody>
                      </>
                    )}

                    {/* REPORT 2: CASH FLOW */}
                    {selectedReport === 'CASH_FLOW' && (
                      <>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Cash Activity Line Item</th>
                            <th style={{ textAlign: 'center' }}>Classification</th>
                            <th style={{ textAlign: 'right' }}>Inflow / (Outflow) LKR</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="font-bold">Customer COD Courier Settlements</td>
                            <td className="text-center font-bold" style={{ color: '#047857' }}>Operating Inflow</td>
                            <td className="text-right font-mono font-bold" style={{ color: '#047857' }}>
                              {formatCurrency(cashFlowData.totalCODInflows)}
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold">Main Finance Wallet Top-ups</td>
                            <td className="text-center font-bold" style={{ color: '#047857' }}>Wallet Inflow</td>
                            <td className="text-right font-mono font-bold" style={{ color: '#047857' }}>
                              {formatCurrency(cashFlowData.walletAllocations)}
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold">Petty Cash Vouchers Disbursed</td>
                            <td className="text-center font-bold" style={{ color: '#be123c' }}>Disbursement</td>
                            <td className="text-right font-mono font-bold" style={{ color: '#be123c' }}>
                              ({formatCurrency(cashFlowData.pettyDisbursements)})
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold">Direct Operational & Courier Expenses</td>
                            <td className="text-center font-bold" style={{ color: '#be123c' }}>OpEx Outflow</td>
                            <td className="text-right font-mono font-bold" style={{ color: '#be123c' }}>
                              ({formatCurrency(cashFlowData.operatingExpenseOutflows)})
                            </td>
                          </tr>
                          <tr style={{ background: '#eff6ff', borderTop: '2px solid #0f172a' }}>
                            <td className="font-extrabold" style={{ textTransform: 'uppercase' }}>Net Operating Cash Position</td>
                            <td className="text-center font-bold" style={{ color: '#1d4ed8' }}>Liquid Net Position</td>
                            <td className="text-right font-mono font-extrabold" style={{ color: '#1e40af', fontSize: '13px' }}>
                              {formatCurrency(cashFlowData.netCashFlow)}
                            </td>
                          </tr>
                        </tbody>
                      </>
                    )}

                    {/* REPORT 3: FSR */}
                    {selectedReport === 'FSR' && (
                      <>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Balance Sheet Asset / Liability Line</th>
                            <th style={{ textAlign: 'center' }}>Liquidity Class</th>
                            <th style={{ textAlign: 'right' }}>Balance (LKR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="font-bold">Petty Cash in Wallets (Liquid)</td>
                            <td className="text-center font-bold" style={{ color: '#047857' }}>Current Asset</td>
                            <td className="text-right font-mono font-bold" style={{ color: '#047857' }}>
                              {formatCurrency(fsrData.pettyCashInHand)}
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold">Dispatched Receivables in Courier Transit</td>
                            <td className="text-center font-bold" style={{ color: '#1d4ed8' }}>Receivables</td>
                            <td className="text-right font-mono font-bold" style={{ color: '#1d4ed8' }}>
                              {formatCurrency(fsrData.dispatchedReceivables)}
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold">Grow Mart Inventory Valuation (Cost)</td>
                            <td className="text-center font-bold" style={{ color: '#7c3aed' }}>Inventory Asset</td>
                            <td className="text-right font-mono font-bold" style={{ color: '#7c3aed' }}>
                              {formatCurrency(fsrData.stockValuationEst)}
                            </td>
                          </tr>
                          <tr>
                            <td className="font-bold">Accrued Courier Fees & Operational Invoices</td>
                            <td className="text-center font-bold" style={{ color: '#be123c' }}>Current Liability</td>
                            <td className="text-right font-mono font-bold" style={{ color: '#be123c' }}>
                              ({formatCurrency(fsrData.accruedExpenses)})
                            </td>
                          </tr>
                          <tr style={{ background: '#ecfdf5', borderTop: '2px solid #0f172a' }}>
                            <td className="font-extrabold" style={{ textTransform: 'uppercase' }}>Net Working Capital Buffer</td>
                            <td className="text-center font-bold" style={{ color: '#047857' }}>Solvency Ratio</td>
                            <td className="text-right font-mono font-extrabold" style={{ color: '#065f46', fontSize: '13px' }}>
                              {formatCurrency(fsrData.netWorkingCapital)}
                            </td>
                          </tr>
                        </tbody>
                      </>
                    )}

                    {/* REPORT 4: EXPENSES */}
                    {selectedReport === 'EXPENSE_REPORT' && (
                      <>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Voucher ID</th>
                            <th style={{ textAlign: 'left' }}>Category</th>
                            <th style={{ textAlign: 'left' }}>Date</th>
                            <th style={{ textAlign: 'left' }}>Remarks</th>
                            <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredExpenses.map((exp) => (
                            <tr key={exp.id}>
                              <td className="font-mono font-bold" style={{ color: '#1d4ed8' }}>{exp.id}</td>
                              <td className="font-bold">{exp.categoryName}</td>
                              <td style={{ color: '#475569' }}>{exp.expenseDate}</td>
                              <td style={{ color: '#475569' }}>{exp.remarks || '-'}</td>
                              <td className="text-right font-mono font-bold" style={{ color: '#be123c' }}>
                                {formatCurrency(exp.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f1f5f9', borderTop: '2px solid #0f172a' }}>
                            <td className="font-bold" colSpan={4}>Total Operational Expenditure</td>
                            <td className="text-right font-mono font-extrabold" style={{ color: '#9f1239', fontSize: '13px' }}>
                              {formatCurrency(expenseReportData.totalAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </>
                    )}

                    {/* REPORT 5: INVENTORY */}
                    {selectedReport === 'INVENTORY_REPORT' && (
                      <>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Item Code</th>
                            <th style={{ textAlign: 'left' }}>Product Description</th>
                            <th style={{ textAlign: 'left' }}>Batch Number</th>
                            <th style={{ textAlign: 'center' }}>Stock</th>
                            <th style={{ textAlign: 'right' }}>Unit Cost</th>
                            <th style={{ textAlign: 'right' }}>Valuation (Cost)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryReportData.inventoryItems.map((i, idx) => (
                            <tr key={`${i.id}-${idx}`}>
                              <td className="font-mono font-bold" style={{ color: '#1d4ed8' }}>{i.itemCode}</td>
                              <td className="font-bold">{i.name}</td>
                              <td className="font-mono" style={{ color: '#475569' }}>{i.batchNumber}</td>
                              <td className="text-center font-bold">{i.currentStock}</td>
                              <td className="text-right font-mono">{formatCurrency(i.unitCost)}</td>
                              <td className="text-right font-mono font-bold">
                                {formatCurrency(i.currentStock * i.unitCost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f1f5f9', borderTop: '2px solid #0f172a' }}>
                            <td className="font-bold" colSpan={3}>Total Inventory Valuation</td>
                            <td className="text-center font-extrabold">{inventoryReportData.totalUnitsOnHand}</td>
                            <td></td>
                            <td className="text-right font-mono font-extrabold" style={{ color: '#1e40af', fontSize: '13px' }}>
                              {formatCurrency(inventoryReportData.totalCostValuation)}
                            </td>
                          </tr>
                        </tfoot>
                      </>
                    )}

                    {/* REPORT 6: DAILY SALES */}
                    {selectedReport === 'DAILY_SALES' && (
                      <>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Date</th>
                            <th style={{ textAlign: 'center' }}>Orders Count</th>
                            <th style={{ textAlign: 'right' }}>Booked Sales (LKR)</th>
                            <th style={{ textAlign: 'right' }}>Delivered COD (LKR)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailySalesData.rows.map((r) => (
                            <tr key={r.date}>
                              <td className="font-mono font-bold">{r.date}</td>
                              <td className="text-center font-bold">{r.ordersCount}</td>
                              <td className="text-right font-mono font-bold" style={{ color: '#1d4ed8' }}>{formatCurrency(r.revenue)}</td>
                              <td className="text-right font-mono font-bold" style={{ color: '#047857' }}>{formatCurrency(r.delivered)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f1f5f9', borderTop: '2px solid #0f172a' }}>
                            <td className="font-bold">Total Period Volume</td>
                            <td className="text-center font-extrabold">{dailySalesData.rows.reduce((acc, r) => acc + r.ordersCount, 0)}</td>
                            <td className="text-right font-mono font-extrabold" style={{ color: '#1e40af', fontSize: '13px' }}>{formatCurrency(dailySalesData.totalRevenue)}</td>
                            <td className="text-right font-mono font-extrabold" style={{ color: '#065f46', fontSize: '13px' }}>{formatCurrency(dailySalesData.totalDelivered)}</td>
                          </tr>
                        </tfoot>
                      </>
                    )}

                    {/* REPORT 7: WEEKLY SALES */}
                    {selectedReport === 'WEEKLY_SALES' && (
                      <>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Week Window</th>
                            <th style={{ textAlign: 'center' }}>Orders Count</th>
                            <th style={{ textAlign: 'right' }}>Booked Sales</th>
                            <th style={{ textAlign: 'right' }}>Delivered COD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weeklySalesData.rows.map((r) => (
                            <tr key={r.week}>
                              <td className="font-bold">{r.week}</td>
                              <td className="text-center font-bold">{r.ordersCount}</td>
                              <td className="text-right font-mono font-bold" style={{ color: '#1d4ed8' }}>{formatCurrency(r.revenue)}</td>
                              <td className="text-right font-mono font-bold" style={{ color: '#047857' }}>{formatCurrency(r.delivered)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </>
                    )}

                    {/* REPORT 8: MONTHLY SALES */}
                    {selectedReport === 'MONTHLY_SALES' && (
                      <>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Month</th>
                            <th style={{ textAlign: 'right' }}>Target Goal</th>
                            <th style={{ textAlign: 'right' }}>Actual Booked</th>
                            <th style={{ textAlign: 'right' }}>Delivered COD</th>
                            <th style={{ textAlign: 'center' }}>Achievement %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlySalesData.rows.map((r) => {
                            const ach = r.target > 0 ? ((r.actualSales / r.target) * 100).toFixed(1) : '100.0';
                            return (
                              <tr key={r.month}>
                                <td className="font-mono font-bold">{r.month}</td>
                                <td className="text-right font-mono" style={{ color: '#64748b' }}>{formatCurrency(r.target)}</td>
                                <td className="text-right font-mono font-bold" style={{ color: '#1d4ed8' }}>{formatCurrency(r.actualSales)}</td>
                                <td className="text-right font-mono font-bold" style={{ color: '#047857' }}>{formatCurrency(r.delivered)}</td>
                                <td className="text-center font-bold" style={{ color: '#047857' }}>{ach}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </>
                    )}

                    {/* REPORT 9: DISTRICT DELIVERY */}
                    {selectedReport === 'DISTRICT_DELIVERY' && (
                      <>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>District Region</th>
                            <th style={{ textAlign: 'center' }}>Delivered</th>
                            <th style={{ textAlign: 'center' }}>Dispatched</th>
                            <th style={{ textAlign: 'center' }}>Rejected</th>
                            <th style={{ textAlign: 'center' }}>Success %</th>
                            <th style={{ textAlign: 'right' }}>COD Collected</th>
                          </tr>
                        </thead>
                        <tbody>
                          {districtDeliveryData.rows.map((r) => {
                            const f = r.delivered + r.rejected;
                            const rate = f > 0 ? ((r.delivered / f) * 100).toFixed(1) : '100.0';
                            return (
                              <tr key={r.district}>
                                <td className="font-bold">{r.district}</td>
                                <td className="text-center font-bold" style={{ color: '#047857' }}>{r.delivered}</td>
                                <td className="text-center" style={{ color: '#1d4ed8' }}>{r.dispatched}</td>
                                <td className="text-center" style={{ color: '#be123c' }}>{r.rejected}</td>
                                <td className="text-center font-bold" style={{ color: '#047857' }}>{rate}%</td>
                                <td className="text-right font-mono font-bold" style={{ color: '#047857' }}>{formatCurrency(r.totalCOD)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f1f5f9', borderTop: '2px solid #0f172a' }}>
                            <td className="font-bold">Total Regional Summary</td>
                            <td className="text-center font-bold" style={{ color: '#047857' }}>{districtDeliveryData.rows.reduce((acc, r) => acc + r.delivered, 0)}</td>
                            <td className="text-center" style={{ color: '#1d4ed8' }}>{districtDeliveryData.rows.reduce((acc, r) => acc + r.dispatched, 0)}</td>
                            <td className="text-center" style={{ color: '#be123c' }}>{districtDeliveryData.rows.reduce((acc, r) => acc + r.rejected, 0)}</td>
                            <td></td>
                            <td className="text-right font-mono font-extrabold" style={{ color: '#065f46', fontSize: '13px' }}>
                              {formatCurrency(districtDeliveryData.rows.reduce((acc, r) => acc + r.totalCOD, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </>
                    )}
                  </table>
                </div>

                {/* 5. Formal Audit Certification */}
                <div className="audit-box avoid-break">
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                    ✔ System Audit & Reconciliation Certification
                  </div>
                  <div>
                    This official financial report was compiled automatically by the 500 Labs Revenue Operations System
                    and cross-referenced against live PostgreSQL transaction ledgers, validated courier Cash-on-Delivery (COD)
                    receipts, and logged petty cash vouchers.
                  </div>
                </div>

                {/* 6. Formal 3-Signatory Executive Sign-off Block */}
                <div className="signatory-grid avoid-break">
                  <div>
                    <div className="sig-line" />
                    <div className="sig-name">Prepared By</div>
                    <div className="sig-role">Finance Analyst</div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>Date: __________________</div>
                  </div>
                  <div>
                    <div className="sig-line" />
                    <div className="sig-name">Verified By</div>
                    <div className="sig-role">Financial Controller</div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>Date: __________________</div>
                  </div>
                  <div>
                    <div className="sig-line" />
                    <div className="sig-name">Executive Approval</div>
                    <div className="sig-role">Managing Director / CEO</div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>Date: __________________</div>
                  </div>
                </div>

                {/* Footer Watermark */}
                <div className="footer-note avoid-break">
                  CONFIDENTIAL • FOR INTERNAL EXECUTIVE & BOARD REVIEW ONLY • 500 LABS CRM
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
