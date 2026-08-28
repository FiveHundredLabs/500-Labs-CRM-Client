import React, { useState, useEffect, useMemo } from 'react';
import {
  expenseRepository,
  orderRepository,
  pettyCashRepository,
  teamRepository,
  productRepository,
  salesTargetRepository,
  contactRepository,
  customerRepository,
  userRepository,
  activityLogRepository,
} from '../../repositories';
import {
  Expense,
  Order,
  PettyCashWallet,
  PettyCashTransaction,
  Team,
  Product,
  TeamSalesTarget,
  Contact,
  Customer,
  User,
  ActivityLog,
} from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/shared/LoadingState';
import { StatusBadge } from '../../components/shared/StatusBadge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  AreaChart,
  Area,
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
  TrendingUp,
  Package,
  Boxes,
  MapPin,
  ArrowUpRight,
  Receipt,
  Printer,
  X,
  Building2,
  Download,
  AlertTriangle,
  PieChart as PieChartIcon,
  ShieldCheck,
  Users,
  Clock,
  Briefcase,
  Target,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfYear,
} from 'date-fns';
import { formatCurrency } from '../../utils/currency';
import { downloadExecutivePdf, ReportPdfPayload } from '../../utils/reportPdfGenerator';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
export type ReportCategory = 'FINANCE' | 'SALES' | 'RAW_EXPORT';

export type FinanceReportType =
  | 'INCOME_STATEMENT'
  | 'CASH_FLOW'
  | 'FSR'
  | 'EXPENSE_REPORT'
  | 'INVENTORY_REPORT';

export type SalesReportType =
  | 'DAILY_SALES'
  | 'WEEKLY_SALES'
  | 'MONTHLY_SALES'
  | 'DISTRICT_DELIVERY';

export type RawExportType =
  | 'ALL_LEADS'
  | 'QUALIFIED_ORDERS'
  | 'FINANCE_EXPENSES'
  | 'SECURITY_AUDIT';

export interface EnrichedOrder extends Order {
  customer?: Customer;
}

// Sri Lanka Districts
const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
];

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

export const AdminReportsPage: React.FC = () => {
  // Navigation & View State
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('FINANCE');
  const [financeReport, setFinanceReport] = useState<FinanceReportType>('INCOME_STATEMENT');
  const [salesReport, setSalesReport] = useState<SalesReportType>('DAILY_SALES');
  const [rawExport, setRawExport] = useState<RawExportType>('ALL_LEADS');
  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Raw Database Datasets
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [wallet, setWallet] = useState<PettyCashWallet | null>(null);
  const [pettyTransactions, setPettyTransactions] = useState<PettyCashTransaction[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesTargets, setSalesTargets] = useState<TeamSalesTarget[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Filters
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dailySearchQuery, setDailySearchQuery] = useState<string>('');
  const [dailyStatusFilter, setDailyStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    const loadAllSystemData = async () => {
      setLoading(true);
      try {
        const [
          expList,
          ordList,
          walletData,
          pettyTxData,
          teamList,
          prodList,
          targetList,
          contList,
          custList,
          userList,
          actList,
        ] = await Promise.all([
          expenseRepository.getAll().catch(() => []),
          orderRepository.getAll().catch(() => []),
          pettyCashRepository.getWallet().catch(() => null),
          pettyCashRepository.getTransactions().catch(() => []),
          teamRepository.getAll().catch(() => []),
          productRepository.getAll().catch(() => []),
          salesTargetRepository.getAll().catch(() => []),
          contactRepository.getAll().catch(() => []),
          customerRepository.getAll().catch(() => []),
          userRepository.getAll().catch(() => []),
          activityLogRepository.getAll().catch(() => []),
        ]);

        const custMap: Record<string, Customer> = {};
        custList.forEach((c) => (custMap[c.id] = c));

        const enrichedOrders: EnrichedOrder[] = ordList.map((o) => ({
          ...o,
          customer: custMap[o.customerId],
        }));

        setExpenses(expList);
        setOrders(enrichedOrders);
        setWallet(walletData);
        setPettyTransactions(pettyTxData);
        setTeams(teamList);
        setProducts(prodList);
        setSalesTargets(targetList);
        setContacts(contList);
        setUsers(userList);
        setActivities(actList);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load report datasets.');
      } finally {
        setLoading(false);
      }
    };
    loadAllSystemData();
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
    } else if (datePreset === 'YTD') {
      setStartDate(format(startOfYear(now), 'yyyy-MM-dd'));
      setEndDate(format(now, 'yyyy-MM-dd'));
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
      const d = o.createdAt ? o.createdAt.split('T')[0] : '';
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
      const d = tx.createdAt ? tx.createdAt.split('T')[0] : '';
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  }, [pettyTransactions, startDate, endDate]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (selectedTeamId === 'ALL') return products;
    return products.filter((p) => p.teamId === selectedTeamId);
  }, [products, selectedTeamId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Finance Section Calculations
  // ─────────────────────────────────────────────────────────────────────────────
  
  // 1.1 Income Statement
  const incomeStatement = useMemo(() => {
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

    let totalOpEx = 0;
    filteredExpenses.forEach((e) => {
      totalOpEx += Number(e.amount || 0);
    });

    const netProfit = grossProfit - totalOpEx;
    const netMarginPct = grossDeliveredRevenue > 0 ? (netProfit / grossDeliveredRevenue) * 100 : 0;

    const chartData = [
      { name: 'Revenue', amount: grossDeliveredRevenue, fill: '#10B981' },
      { name: 'COGS', amount: estimatedCOGS, fill: '#F59E0B' },
      { name: 'Gross Profit', amount: grossProfit, fill: '#3B82F6' },
      { name: 'Expenses', amount: totalOpEx, fill: '#EF4444' },
      { name: 'Net Profit', amount: netProfit, fill: netProfit >= 0 ? '#10B981' : '#DC2626' },
    ];

    return {
      grossDeliveredRevenue,
      inTransitRevenue,
      estimatedCOGS,
      grossProfit,
      grossMarginPct,
      totalOpEx,
      netProfit,
      netMarginPct,
      chartData,
    };
  }, [filteredOrders, filteredExpenses]);

  // 1.2 Cash Flow Statement
  const cashFlow = useMemo(() => {
    let inflowCOD = 0;
    filteredOrders.forEach((o) => {
      if (o.status === 'DELIVERED') {
        inflowCOD += Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      }
    });

    let outflowExpenses = 0;
    filteredExpenses.forEach((e) => {
      outflowExpenses += Number(e.amount || 0);
    });

    let outflowPettyCash = 0;
    filteredPettyTx.forEach((tx) => {
      if (tx.transactionType === 'EXPENSE') {
        outflowPettyCash += Number(tx.amount || 0);
      }
    });

    const totalInflow = inflowCOD;
    const totalOutflow = outflowExpenses + outflowPettyCash;
    const netCashFlow = totalInflow - totalOutflow;
    const currentBalance = (wallet?.remainingBalance || 0) + netCashFlow;

    const chartData = [
      { name: 'COD Inflows', Inflow: totalInflow, Outflow: 0, Net: totalInflow },
      { name: 'OPEX Outflow', Inflow: 0, Outflow: outflowExpenses, Net: -outflowExpenses },
      { name: 'Petty Cash Outflow', Inflow: 0, Outflow: outflowPettyCash, Net: -outflowPettyCash },
      { name: 'Net Cash Delta', Inflow: 0, Outflow: 0, Net: netCashFlow },
    ];

    return {
      inflowCOD,
      totalInflow,
      outflowExpenses,
      outflowPettyCash,
      totalOutflow,
      netCashFlow,
      currentBalance,
      chartData,
    };
  }, [filteredOrders, filteredExpenses, filteredPettyTx, wallet]);

  // 1.3 FSR (Financial Status Report)
  const fsrData = useMemo(() => {
    const teamStats = teams.map((team) => {
      const teamOrders = filteredOrders.filter((o) => o.teamId === team.id);
      const targetObj = salesTargets.find((st) => st.teamId === team.id);
      const targetAmount = targetObj ? targetObj.targetAmount : 1500000;

      let achievedRevenue = 0;
      let orderCount = 0;
      let deliveredCount = 0;

      teamOrders.forEach((o) => {
        orderCount++;
        const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
        if (o.status === 'DELIVERED') {
          achievedRevenue += amt;
          deliveredCount++;
        }
      });

      const completionRate = targetAmount > 0 ? (achievedRevenue / targetAmount) * 100 : 0;
      const variance = achievedRevenue - targetAmount;

      return {
        id: team.id,
        name: team.name,
        code: team.code,
        targetAmount,
        achievedRevenue,
        variance,
        completionRate,
        orderCount,
        deliveredCount,
      };
    });

    const totalTarget = teamStats.reduce((acc, t) => acc + t.targetAmount, 0);
    const totalAchieved = teamStats.reduce((acc, t) => acc + t.achievedRevenue, 0);
    const overallRate = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

    return {
      teamStats,
      totalTarget,
      totalAchieved,
      overallRate,
    };
  }, [teams, filteredOrders, salesTargets]);

  // 1.4 Expense Breakdown
  const expenseBreakdown = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let grandTotal = 0;

    filteredExpenses.forEach((e) => {
      const cat = e.categoryName || 'Operational';
      const amt = Number(e.amount || 0);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      grandTotal += amt;
    });

    // Add damaged stock cost
    let damagedStockLoss = 0;
    filteredProducts.forEach((p) => {
      damagedStockLoss += (p.damagedStock || 0) * (p.costPrice || 0);
    });

    if (damagedStockLoss > 0) {
      categoryTotals['Damaged Goods Loss'] = (categoryTotals['Damaged Goods Loss'] || 0) + damagedStockLoss;
      grandTotal += damagedStockLoss;
    }

    const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
      pct: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
    }));

    return {
      grandTotal,
      damagedStockLoss,
      pieData,
    };
  }, [filteredExpenses, filteredProducts]);

  // 1.5 Inventory & Damaged Stock Report
  const inventoryReport = useMemo(() => {
    let totalSellableUnits = 0;
    let totalAllocatedUnits = 0;
    let totalDispatchedUnits = 0;
    let totalSoldUnits = 0;
    let totalDamagedUnits = 0;

    let sellableValue = 0;
    let damagedValue = 0;
    let lowStockCount = 0;

    const barData = filteredProducts.map((p) => {
      const avail = p.currentStock || 0;
      const alloc = p.allocatedStock || 0;
      const disp = p.dispatchedStock || 0;
      const sold = p.soldStock || 0;
      const dmg = p.damagedStock || 0;

      totalSellableUnits += avail;
      totalAllocatedUnits += alloc;
      totalDispatchedUnits += disp;
      totalSoldUnits += sold;
      totalDamagedUnits += dmg;

      sellableValue += avail * (p.costPrice || 0);
      damagedValue += dmg * (p.costPrice || 0);

      if (avail <= p.minStockThreshold) {
        lowStockCount++;
      }

      return {
        name: p.name,
        code: p.code,
        Available: avail,
        Allocated: alloc,
        Dispatched: disp,
        Sold: sold,
        Damaged: dmg,
      };
    });

    return {
      totalSellableUnits,
      totalAllocatedUnits,
      totalDispatchedUnits,
      totalSoldUnits,
      totalDamagedUnits,
      sellableValue,
      damagedValue,
      lowStockCount,
      barData,
    };
  }, [filteredProducts]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Sales Section Calculations
  // ─────────────────────────────────────────────────────────────────────────────

  // 2.1 Daily Sales Trend & Detailed Intelligence
  const dailySalesData = useMemo(() => {
    const dailyMap: Record<
      string,
      {
        date: string;
        revenue: number;
        inTransitRevenue: number;
        totalOrders: number;
        deliveredOrders: number;
        dispatchedOrders: number;
        rejectedOrders: number;
        preparedOrders: number;
      }
    > = {};

    // Hourly cadence buckets: 08-10, 10-12, 12-14, 14-16, 16-18, 18-20, 20+
    const hourlyMap: Record<string, { hourRange: string; orders: number; revenue: number }> = {
      '08-10': { hourRange: '08:00 - 10:00', orders: 0, revenue: 0 },
      '10-12': { hourRange: '10:00 - 12:00', orders: 0, revenue: 0 },
      '12-14': { hourRange: '12:00 - 14:00', orders: 0, revenue: 0 },
      '14-16': { hourRange: '14:00 - 16:00', orders: 0, revenue: 0 },
      '16-18': { hourRange: '16:00 - 18:00', orders: 0, revenue: 0 },
      '18-20': { hourRange: '18:00 - 20:00', orders: 0, revenue: 0 },
      '20+': { hourRange: '20:00 - 23:59', orders: 0, revenue: 0 },
    };

    // Team brand contribution
    const teamRevenueMap: Record<string, { name: string; code: string; orders: number; deliveredRevenue: number }> = {};
    teams.forEach((t) => {
      teamRevenueMap[t.id] = { name: t.name, code: t.code, orders: 0, deliveredRevenue: 0 };
    });

    let deliveredRev = 0;
    let inTransitRev = 0;
    let totalOrdersCount = 0;
    let totalDeliveredCount = 0;
    let totalDispatchedCount = 0;
    let totalRejectedCount = 0;
    let totalPreparedCount = 0;
    let totalDamagedLoss = 0;

    filteredOrders.forEach((o) => {
      totalOrdersCount++;
      const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
      const dateStr = o.createdAt ? o.createdAt.split('T')[0] : '';

      if (dateStr) {
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = {
            date: dateStr,
            revenue: 0,
            inTransitRevenue: 0,
            totalOrders: 0,
            deliveredOrders: 0,
            dispatchedOrders: 0,
            rejectedOrders: 0,
            preparedOrders: 0,
          };
        }
        dailyMap[dateStr].totalOrders++;

        if (o.status === 'DELIVERED') {
          dailyMap[dateStr].revenue += amt;
          dailyMap[dateStr].deliveredOrders++;
          deliveredRev += amt;
          totalDeliveredCount++;
        } else if (o.status === 'DISPATCHED') {
          dailyMap[dateStr].inTransitRevenue += amt;
          dailyMap[dateStr].dispatchedOrders++;
          inTransitRev += amt;
          totalDispatchedCount++;
        } else if (o.status === 'REJECTED') {
          dailyMap[dateStr].rejectedOrders++;
          totalRejectedCount++;
          if (o.damagedItems && o.damagedItems.length > 0) {
            totalDamagedLoss += 3500; // estimated standard cost
          }
        } else if (o.status === 'PREPARED') {
          dailyMap[dateStr].preparedOrders++;
          totalPreparedCount++;
        }
      }

      // Track hourly bucket
      if (o.createdAt) {
        try {
          const hour = parseISO(o.createdAt).getHours();
          let bucketKey = '20+';
          if (hour >= 8 && hour < 10) bucketKey = '08-10';
          else if (hour >= 10 && hour < 12) bucketKey = '10-12';
          else if (hour >= 12 && hour < 14) bucketKey = '12-14';
          else if (hour >= 14 && hour < 16) bucketKey = '14-16';
          else if (hour >= 16 && hour < 18) bucketKey = '16-18';
          else if (hour >= 18 && hour < 20) bucketKey = '18-20';

          if (hourlyMap[bucketKey]) {
            hourlyMap[bucketKey].orders++;
            if (o.status === 'DELIVERED') {
              hourlyMap[bucketKey].revenue += amt;
            }
          }
        } catch {
          // ignore date parse errors
        }
      }

      // Track Team Brand contribution
      if (o.teamId && teamRevenueMap[o.teamId]) {
        teamRevenueMap[o.teamId].orders++;
        if (o.status === 'DELIVERED') {
          teamRevenueMap[o.teamId].deliveredRevenue += amt;
        }
      }
    });

    const list = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const hourlyList = Object.values(hourlyMap);
    const teamContributions = Object.values(teamRevenueMap).map((t) => ({
      ...t,
      sharePct: deliveredRev > 0 ? (t.deliveredRevenue / deliveredRev) * 100 : 0,
    }));

    const aov = totalDeliveredCount > 0 ? deliveredRev / totalDeliveredCount : totalOrdersCount > 0 ? (deliveredRev + inTransitRev) / totalOrdersCount : 0;
    const deliveryRate = totalDeliveredCount + totalRejectedCount > 0 ? (totalDeliveredCount / (totalDeliveredCount + totalRejectedCount)) * 100 : 0;

    return {
      list,
      hourlyList,
      teamContributions,
      totalRev: deliveredRev,
      inTransitRev,
      totalOrders: totalOrdersCount,
      deliveredCount: totalDeliveredCount,
      dispatchedCount: totalDispatchedCount,
      rejectedCount: totalRejectedCount,
      preparedCount: totalPreparedCount,
      deliveryRate,
      aov,
      damagedLoss: totalDamagedLoss,
    };
  }, [filteredOrders, teams]);

  // Filtered granular daily orders for drill-down inspection
  const detailedDailyOrders = useMemo(() => {
    return filteredOrders.filter((o) => {
      if (dailyStatusFilter !== 'ALL' && o.status !== dailyStatusFilter) return false;
      if (dailySearchQuery) {
        const q = dailySearchQuery.toLowerCase();
        const matchesOrder = o.orderNumber?.toLowerCase().includes(q);
        const matchesCust = o.customer?.fullName?.toLowerCase().includes(q);
        const matchesPhone = o.customer?.phone?.includes(q);
        const matchesCity = o.customer?.city?.toLowerCase().includes(q);
        if (!matchesOrder && !matchesCust && !matchesPhone && !matchesCity) return false;
      }
      return true;
    });
  }, [filteredOrders, dailyStatusFilter, dailySearchQuery]);

  // 2.2 Weekly Sales (Week-over-Week)
  const weeklySalesData = useMemo(() => {
    const weekMap: Record<string, { week: string; revenue: number; volume: number }> = {};

    filteredOrders.forEach((o) => {
      if (!o.createdAt) return;
      const dt = parseISO(o.createdAt);
      const weekLabel = `Wk ${format(startOfWeek(dt, { weekStartsOn: 1 }), 'dd MMM')}`;
      if (!weekMap[weekLabel]) {
        weekMap[weekLabel] = { week: weekLabel, revenue: 0, volume: 0 };
      }
      weekMap[weekLabel].volume++;
      if (o.status === 'DELIVERED') {
        const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
        weekMap[weekLabel].revenue += amt;
      }
    });

    return Object.values(weekMap);
  }, [filteredOrders]);

  // 2.3 Monthly Sales (Actual vs Target)
  const monthlySalesData = useMemo(() => {
    const monthMap: Record<string, { month: string; target: number; actual: number }> = {};

    // Build last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const mDate = subMonths(now, i);
      const key = format(mDate, 'MMM yyyy');
      monthMap[key] = { month: key, target: 2000000, actual: 0 };
    }

    filteredOrders.forEach((o) => {
      if (!o.createdAt || o.status !== 'DELIVERED') return;
      const dt = parseISO(o.createdAt);
      const key = format(dt, 'MMM yyyy');
      if (monthMap[key]) {
        const amt = Number(o.codAmount !== undefined && o.codAmount !== null ? o.codAmount : (o.totalAmount || 0));
        monthMap[key].actual += amt;
      }
    });

    return Object.values(monthMap);
  }, [filteredOrders]);

  // 2.4 District-wise Delivery Breakdown
  const districtDeliveryData = useMemo(() => {
    const distMap: Record<string, { district: string; completed: number; rejected: number; damaged: number; total: number }> = {};

    SRI_LANKA_DISTRICTS.forEach((d) => {
      distMap[d] = { district: d, completed: 0, rejected: 0, damaged: 0, total: 0 };
    });

    filteredOrders.forEach((o) => {
      const rawCity = o.customer?.city || o.customer?.address || 'Colombo';
      const matched = SRI_LANKA_DISTRICTS.find((d) => rawCity.toLowerCase().includes(d.toLowerCase())) || 'Colombo';

      distMap[matched].total++;
      if (o.status === 'DELIVERED') {
        distMap[matched].completed++;
      } else if (o.status === 'REJECTED') {
        distMap[matched].rejected++;
        if (o.damagedItems && o.damagedItems.length > 0) {
          distMap[matched].damaged++;
        }
      }
    });

    // Sort by total volume and take active districts
    return Object.values(distMap)
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Reliable Executive A4 PDF Generation Engine
  // ─────────────────────────────────────────────────────────────────────────────
  const exportCurrentReportAsExecutivePdf = () => {
    setIsGeneratingPdf(true);
    const scopeLabel = selectedTeamId === 'ALL' ? 'Consolidated Enterprise (All Teams)' : teamMap[selectedTeamId]?.name || selectedTeamId;
    const periodLabel = `${startDate || 'Genesis'} → ${endDate || 'Present'}`;

    try {
      let payload: ReportPdfPayload;

      if (activeCategory === 'FINANCE') {
        if (financeReport === 'INCOME_STATEMENT') {
          payload = {
            title: 'Income Statement & Profitability Audit',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Delivered Revenue', value: formatCurrency(incomeStatement.grossDeliveredRevenue), hint: 'Realized COD', color: 'green' },
              { label: 'Est. COGS', value: formatCurrency(incomeStatement.estimatedCOGS), hint: `Gross: ${incomeStatement.grossMarginPct.toFixed(1)}%`, color: 'amber' },
              { label: 'Total OPEX', value: formatCurrency(incomeStatement.totalOpEx), hint: 'Expenses', color: 'red' },
              { label: 'Net Profit', value: formatCurrency(incomeStatement.netProfit), hint: `Margin: ${incomeStatement.netMarginPct.toFixed(1)}%`, color: incomeStatement.netProfit >= 0 ? 'green' : 'red' },
            ],
            tableHeaders: ['Accounting Line Item', 'Category Classification', 'Financial Amount'],
            columnWidths: [80, 50, 52],
            columnAlignments: ['left', 'left', 'right'],
            tableRows: [
              ['Gross Delivered Revenue (COD Inflows)', 'Operating Revenue', formatCurrency(incomeStatement.grossDeliveredRevenue)],
              ['Less: Cost of Goods Sold (COGS)', 'Product Inventory Cost', `(${formatCurrency(incomeStatement.estimatedCOGS)})`],
              ['Gross Operating Profit', 'Gross Margin Margin Subtotal', formatCurrency(incomeStatement.grossProfit)],
              ['Less: Total Operational Expenses (OPEX)', 'Operating Expenditure', `(${formatCurrency(incomeStatement.totalOpEx)})`],
              ['Net Operating Income / (Loss)', 'Net Profit Before Tax', formatCurrency(incomeStatement.netProfit)],
            ],
            summaryLines: [
              { label: 'Gross Operating Profit Margin', value: `${incomeStatement.grossMarginPct.toFixed(1)}%` },
              { label: 'Net Operating Income Ratio', value: `${incomeStatement.netMarginPct.toFixed(1)}%`, isBold: true, isHighlight: true },
            ],
          };
        } else if (financeReport === 'CASH_FLOW') {
          payload = {
            title: 'Cash Flow & Liquidity Statement',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Cash Inflow', value: formatCurrency(cashFlow.totalInflow), hint: 'Delivered COD', color: 'green' },
              { label: 'OPEX Outflow', value: formatCurrency(cashFlow.outflowExpenses), hint: 'Operational', color: 'red' },
              { label: 'Petty Outflow', value: formatCurrency(cashFlow.outflowPettyCash), hint: 'Petty Cash', color: 'amber' },
              { label: 'Net Liquidity Delta', value: formatCurrency(cashFlow.netCashFlow), hint: 'Period Balance', color: cashFlow.netCashFlow >= 0 ? 'green' : 'red' },
            ],
            tableHeaders: ['Cash Movement Stream', 'Flow Type', 'Amount (LKR)'],
            columnWidths: [80, 50, 52],
            columnAlignments: ['left', 'left', 'right'],
            tableRows: [
              ['Delivered COD Inflows', 'Cash Inflow (+)', formatCurrency(cashFlow.inflowCOD)],
              ['Direct Operational Expenses', 'Cash Outflow (-)', `(${formatCurrency(cashFlow.outflowExpenses)})`],
              ['Petty Cash Disbursements', 'Cash Outflow (-)', `(${formatCurrency(cashFlow.outflowPettyCash)})`],
              ['Net Cash Flow Period Delta', 'Net Delta', formatCurrency(cashFlow.netCashFlow)],
            ],
            summaryLines: [
              { label: 'Active Treasury Balance', value: formatCurrency(cashFlow.currentBalance), isBold: true, isHighlight: true },
            ],
          };
        } else if (financeReport === 'FSR') {
          payload = {
            title: 'Field Sales Report (FSR Quota Audit)',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Total Quota Target', value: formatCurrency(fsrData.totalTarget), hint: 'Target Goal', color: 'blue' },
              { label: 'Achieved Revenue', value: formatCurrency(fsrData.totalAchieved), hint: 'Realized Sales', color: 'green' },
              { label: 'Overall Completion', value: `${fsrData.overallRate.toFixed(1)}%`, hint: 'Quota %', color: fsrData.overallRate >= 80 ? 'green' : 'amber' },
              { label: 'Active Brands', value: String(teams.length), hint: 'Operating Units', color: 'purple' },
            ],
            tableHeaders: ['Brand Team Unit', 'Code', 'Target Quota', 'Achieved Sales', 'Variance', 'Achievement %'],
            columnWidths: [45, 20, 30, 30, 30, 27],
            columnAlignments: ['left', 'center', 'right', 'right', 'right', 'right'],
            tableRows: fsrData.teamStats.map((t) => [
              t.name,
              t.code,
              formatCurrency(t.targetAmount),
              formatCurrency(t.achievedRevenue),
              formatCurrency(t.variance),
              `${t.completionRate.toFixed(1)}%`,
            ]),
            summaryLines: [
              { label: 'Consolidated Target Achievement', value: `${fsrData.overallRate.toFixed(1)}%`, isBold: true, isHighlight: true },
            ],
          };
        } else if (financeReport === 'EXPENSE_REPORT') {
          payload = {
            title: 'Operational Expense & Loss Audit',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Total OPEX', value: formatCurrency(expenseBreakdown.grandTotal), hint: 'Grand Expenses', color: 'red' },
              { label: 'Damaged Stock Loss', value: formatCurrency(expenseBreakdown.damagedStockLoss), hint: 'Write-off Loss', color: 'amber' },
              { label: 'Cost Categories', value: String(expenseBreakdown.pieData.length), hint: 'Categories', color: 'blue' },
              { label: 'Audit Scope', value: scopeLabel, hint: 'Selected Unit', color: 'purple' },
            ],
            tableHeaders: ['Expense Category', 'Allocation Contribution', 'Total Expenditure (LKR)'],
            columnWidths: [80, 50, 52],
            columnAlignments: ['left', 'center', 'right'],
            tableRows: expenseBreakdown.pieData.map((item) => [
              item.name,
              `${item.pct.toFixed(1)}% of OPEX`,
              formatCurrency(item.value),
            ]),
            summaryLines: [
              { label: 'Total Operational Expenses', value: formatCurrency(expenseBreakdown.grandTotal), isBold: true, isHighlight: true },
            ],
          };
        } else {
          // INVENTORY_REPORT
          payload = {
            title: 'Inventory Levels & Damaged Stock Audit',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Sellable Value', value: formatCurrency(inventoryReport.sellableValue), hint: `${inventoryReport.totalSellableUnits} units`, color: 'green' },
              { label: 'In-Transit Units', value: `${inventoryReport.totalDispatchedUnits} units`, hint: 'Dispatched', color: 'blue' },
              { label: 'Quarantined Damaged', value: `${inventoryReport.totalDamagedUnits} units`, hint: 'Damaged count', color: 'red' },
              { label: 'Damaged Stock Loss', value: formatCurrency(inventoryReport.damagedValue), hint: 'Loss cost', color: 'amber' },
            ],
            tableHeaders: ['Product Name', 'SKU', 'Available', 'Dispatched', 'Sold', 'Damaged', 'Stock Valuation'],
            columnWidths: [48, 20, 20, 22, 20, 22, 30],
            columnAlignments: ['left', 'center', 'center', 'center', 'center', 'center', 'right'],
            tableRows: filteredProducts.map((p) => [
              p.name,
              p.code,
              p.currentStock || 0,
              p.dispatchedStock || 0,
              p.soldStock || 0,
              p.damagedStock || 0,
              formatCurrency((p.currentStock || 0) * (p.costPrice || 0)),
            ]),
            summaryLines: [
              { label: 'Total Inventory Valuation (Cost)', value: formatCurrency(inventoryReport.sellableValue), isBold: true, isHighlight: true },
              { label: 'Total Quarantined Damage Loss', value: formatCurrency(inventoryReport.damagedValue) },
            ],
          };
        }
      } else if (activeCategory === 'SALES') {
        if (salesReport === 'DAILY_SALES') {
          payload = {
            title: 'Daily Sales Velocity & Comprehensive Performance Report',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Delivered Revenue', value: formatCurrency(dailySalesData.totalRev), hint: `${dailySalesData.deliveredCount} delivered`, color: 'green' },
              { label: 'In-Transit COD', value: formatCurrency(dailySalesData.inTransitRev), hint: `${dailySalesData.dispatchedCount} dispatched`, color: 'blue' },
              { label: 'Delivery Rate', value: `${dailySalesData.deliveryRate.toFixed(1)}%`, hint: 'Success ratio', color: dailySalesData.deliveryRate >= 70 ? 'green' : 'amber' },
              { label: 'Average Ticket', value: formatCurrency(dailySalesData.aov), hint: 'Per order ticket', color: 'purple' },
            ],
            tableHeaders: ['Sales Date', 'Booked', 'Delivered', 'In-Transit', 'Rejected', 'Success %', 'Realized Revenue'],
            columnWidths: [32, 22, 22, 22, 22, 24, 38],
            columnAlignments: ['left', 'center', 'center', 'center', 'center', 'center', 'right'],
            tableRows: dailySalesData.list.map((d) => {
              const rate = d.deliveredOrders + d.rejectedOrders > 0 ? (d.deliveredOrders / (d.deliveredOrders + d.rejectedOrders)) * 100 : 0;
              return [
                d.date,
                d.totalOrders,
                d.deliveredOrders,
                d.dispatchedOrders,
                d.rejectedOrders,
                `${rate.toFixed(0)}%`,
                formatCurrency(d.revenue),
              ];
            }),
            summaryLines: [
              { label: 'Total Realized Delivered Sales', value: formatCurrency(dailySalesData.totalRev), isBold: true, isHighlight: true },
              { label: 'Total In-Transit Dispatched Revenue', value: formatCurrency(dailySalesData.inTransitRev) },
              { label: 'Total Orders Processed in Period', value: `${dailySalesData.totalOrders} Orders` },
            ],
          };
        } else if (salesReport === 'WEEKLY_SALES') {
          payload = {
            title: 'Week-over-Week (WoW) Sales Growth Report',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Total Sales Revenue', value: formatCurrency(dailySalesData.totalRev), hint: 'Delivered COD', color: 'green' },
              { label: 'Total Order Volume', value: String(dailySalesData.totalOrders), hint: 'Orders processed', color: 'blue' },
              { label: 'Operating Weeks', value: String(weeklySalesData.length), hint: 'Evaluated weeks', color: 'purple' },
              { label: 'Brand Scope', value: scopeLabel, hint: 'Selected Brand', color: 'amber' },
            ],
            tableHeaders: ['Calendar Week Period', 'Processed Order Volume', 'Delivered Sales Revenue (LKR)'],
            columnWidths: [60, 60, 62],
            columnAlignments: ['left', 'center', 'right'],
            tableRows: weeklySalesData.map((w) => [
              w.week,
              w.volume,
              formatCurrency(w.revenue),
            ]),
            summaryLines: [
              { label: 'Total Cumulative Revenue', value: formatCurrency(dailySalesData.totalRev), isBold: true, isHighlight: true },
            ],
          };
        } else if (salesReport === 'MONTHLY_SALES') {
          payload = {
            title: 'Monthly Revenue Targets vs Actuals Report',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Realized Revenue', value: formatCurrency(dailySalesData.totalRev), hint: 'Delivered Sales', color: 'green' },
              { label: 'Evaluation Window', value: `${monthlySalesData.length} Months`, hint: 'Historical cadence', color: 'blue' },
              { label: 'Brand Scope', value: scopeLabel, hint: 'Selected Brand', color: 'purple' },
              { label: 'Target Model', value: 'LKR 2,000,000 / mo', hint: 'Base quota benchmark', color: 'amber' },
            ],
            tableHeaders: ['Calendar Month', 'Monthly Sales Target', 'Actual Realized Revenue', 'Variance Delta'],
            columnWidths: [45, 45, 45, 47],
            columnAlignments: ['left', 'right', 'right', 'right'],
            tableRows: monthlySalesData.map((m) => [
              m.month,
              formatCurrency(m.target),
              formatCurrency(m.actual),
              formatCurrency(m.actual - m.target),
            ]),
            summaryLines: [
              { label: 'Period Realized Revenue', value: formatCurrency(dailySalesData.totalRev), isBold: true, isHighlight: true },
            ],
          };
        } else {
          // DISTRICT_DELIVERY
          payload = {
            title: 'District-wise Delivery & Logistics Performance',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Active Districts', value: String(districtDeliveryData.length), hint: 'Districts covered', color: 'blue' },
              { label: 'Delivered Orders', value: String(districtDeliveryData.reduce((acc, d) => acc + d.completed, 0)), hint: 'Completed COD', color: 'green' },
              { label: 'Rejections / Returns', value: String(districtDeliveryData.reduce((acc, d) => acc + d.rejected, 0)), hint: 'Returned orders', color: 'red' },
              { label: 'Transit Damaged', value: String(districtDeliveryData.reduce((acc, d) => acc + d.damaged, 0)), hint: 'Quarantined goods', color: 'amber' },
            ],
            tableHeaders: ['Sri Lanka District', 'Delivered (Success)', 'Rejected / Returns', 'Transit Damaged', 'Total Processed'],
            columnWidths: [45, 35, 35, 35, 32],
            columnAlignments: ['left', 'center', 'center', 'center', 'right'],
            tableRows: districtDeliveryData.map((d) => [
              d.district,
              d.completed,
              d.rejected,
              d.damaged,
              d.total,
            ]),
            summaryLines: [
              { label: 'Total Processed Orders across Districts', value: String(districtDeliveryData.reduce((acc, d) => acc + d.total, 0)), isBold: true, isHighlight: true },
            ],
          };
        }
      } else {
        // RAW_EXPORT
        if (rawExport === 'ALL_LEADS') {
          payload = {
            title: 'Raw Data Audit: Inbound Customer Leads',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Total Leads', value: String(contacts.length), hint: 'Inbound contacts', color: 'purple' },
              { label: 'Brand Units', value: String(teams.length), hint: 'Operating brands', color: 'blue' },
              { label: 'Audit Scope', value: scopeLabel, hint: 'Filter scope', color: 'green' },
              { label: 'Classification', value: 'Executive Audit', hint: 'Confidential', color: 'amber' },
            ],
            tableHeaders: ['Phone Number', 'City Location', 'Contact Status', 'Team Brand', 'Imported Date'],
            columnWidths: [40, 35, 35, 37, 35],
            columnAlignments: ['left', 'left', 'center', 'left', 'right'],
            tableRows: contacts.slice(0, 50).map((c) => [
              c.phone,
              c.city || '—',
              c.status,
              teamMap[c.teamId]?.name || c.teamId,
              c.importedAt ? c.importedAt.split('T')[0] : '—',
            ]),
          };
        } else if (rawExport === 'QUALIFIED_ORDERS') {
          payload = {
            title: 'Raw Data Audit: Qualified Orders',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Qualified Orders', value: String(filteredOrders.length), hint: 'Orders in scope', color: 'blue' },
              { label: 'Gross Volume', value: formatCurrency(filteredOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0)), hint: 'Order ticket sum', color: 'green' },
              { label: 'Brand Scope', value: scopeLabel, hint: 'Filter scope', color: 'purple' },
              { label: 'Status', value: 'System Ledger', hint: 'Verified data', color: 'amber' },
            ],
            tableHeaders: ['Order #', 'Customer Name', 'Team Brand', 'Order Status', 'Total Amount (LKR)'],
            columnWidths: [35, 50, 37, 30, 30],
            columnAlignments: ['left', 'left', 'left', 'center', 'right'],
            tableRows: filteredOrders.slice(0, 50).map((o) => [
              o.orderNumber,
              o.customer?.fullName || 'Customer',
              teamMap[o.teamId]?.name || o.teamId,
              o.status,
              formatCurrency(o.totalAmount),
            ]),
          };
        } else if (rawExport === 'FINANCE_EXPENSES') {
          payload = {
            title: 'Raw Data Audit: Financial Expense Ledgers',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Recorded Expenses', value: String(filteredExpenses.length), hint: 'Ledger entries', color: 'red' },
              { label: 'Total Sum', value: formatCurrency(filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0)), hint: 'Expenditure', color: 'amber' },
              { label: 'Audit Scope', value: scopeLabel, hint: 'Filter scope', color: 'purple' },
              { label: 'Classification', value: 'Financial OPEX', hint: 'Verified', color: 'blue' },
            ],
            tableHeaders: ['Category', 'Expense Remarks', 'Expense Date', 'Amount (LKR)'],
            columnWidths: [45, 65, 35, 37],
            columnAlignments: ['left', 'left', 'center', 'right'],
            tableRows: filteredExpenses.slice(0, 50).map((e) => [
              e.categoryName,
              e.remarks,
              e.expenseDate,
              formatCurrency(e.amount),
            ]),
          };
        } else {
          payload = {
            title: 'Raw Data Audit: Security & Action Logs',
            scopeTeam: scopeLabel,
            period: periodLabel,
            kpis: [
              { label: 'Logged Actions', value: String(activities.length), hint: 'Audit trail events', color: 'blue' },
              { label: 'System Users', value: String(users.length), hint: 'Active operators', color: 'purple' },
              { label: 'Security Status', value: 'Verified', hint: 'Integrity intact', color: 'green' },
              { label: 'Classification', value: 'Compliance Log', hint: 'Confidential', color: 'amber' },
            ],
            tableHeaders: ['User / Operator', 'Action Type', 'Entity', 'Log Description', 'Timestamp'],
            columnWidths: [35, 35, 30, 45, 37],
            columnAlignments: ['left', 'center', 'left', 'left', 'right'],
            tableRows: activities.slice(0, 50).map((a) => [
              a.userName || a.userId,
              a.action,
              a.entityType,
              a.description,
              a.createdAt ? a.createdAt.split('T')[0] : '—',
            ]),
          };
        }
      }

      downloadExecutivePdf(payload);
      toast.success('Executive A4 PDF statement generated & downloaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate executive PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading) {
    return <LoadingState rows={5} />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Admin Financial & Sales Intelligence"
          description="Consolidated executive reports, cash flow analysis, sales growth, and district logistics tracking."
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            isLoading={isGeneratingPdf}
            onClick={exportCurrentReportAsExecutivePdf}
            className="text-xs shadow-xs"
          >
            Download Executive PDF (A4)
          </Button>
        </div>
      </div>

      {/* Primary Category Selector Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-xl border border-slate-200 w-fit">
        <button
          type="button"
          onClick={() => setActiveCategory('FINANCE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'FINANCE'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>1. Finance Section</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('SALES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'SALES'
              ? 'bg-white text-blue-800 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span>2. Sales Section</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('RAW_EXPORT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'RAW_EXPORT'
              ? 'bg-white text-purple-800 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-600" />
          <span>3. Data Audit & Exports</span>
        </button>
      </div>

      {/* Universal Control Bar: Sub-report pill selection + Team Brand Filter + Date Presets */}
      <Card className="bg-white border-slate-200 shadow-2xs">
        <CardContent className="p-4 space-y-4">
          {/* Sub-report Pills */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            {activeCategory === 'FINANCE' && (
              <>
                {[
                  { id: 'INCOME_STATEMENT', label: 'Income Statement', icon: Receipt },
                  { id: 'CASH_FLOW', label: 'Cash Flow Statement', icon: DollarSign },
                  { id: 'FSR', label: 'FSR (Target vs Achieved)', icon: Target },
                  { id: 'EXPENSE_REPORT', label: 'Expense Report (Donut)', icon: PieChartIcon },
                  { id: 'INVENTORY_REPORT', label: 'Inventory & Damaged Goods', icon: Boxes },
                ].map((rep) => {
                  const Icon = rep.icon;
                  const isActive = financeReport === rep.id;
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => setFinanceReport(rep.id as FinanceReportType)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{rep.label}</span>
                    </button>
                  );
                })}
              </>
            )}

            {activeCategory === 'SALES' && (
              <>
                {[
                  { id: 'DAILY_SALES', label: 'Daily Sales Report', icon: Clock },
                  { id: 'WEEKLY_SALES', label: 'Weekly Sales Report', icon: TrendingUp },
                  { id: 'MONTHLY_SALES', label: 'Monthly Sales Report', icon: Calendar },
                  { id: 'DISTRICT_DELIVERY', label: 'District-wise Delivery Report', icon: MapPin },
                ].map((rep) => {
                  const Icon = rep.icon;
                  const isActive = salesReport === rep.id;
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => setSalesReport(rep.id as SalesReportType)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-700 text-white shadow-2xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{rep.label}</span>
                    </button>
                  );
                })}
              </>
            )}

            {activeCategory === 'RAW_EXPORT' && (
              <>
                {[
                  { id: 'ALL_LEADS', label: 'All Inbound Leads', icon: Users },
                  { id: 'QUALIFIED_ORDERS', label: 'Qualified Orders', icon: Package },
                  { id: 'FINANCE_EXPENSES', label: 'Expense Ledgers', icon: Receipt },
                  { id: 'SECURITY_AUDIT', label: 'Security & Audit Logs', icon: ShieldCheck },
                ].map((rep) => {
                  const Icon = rep.icon;
                  const isActive = rawExport === rep.id;
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => setRawExport(rep.id as RawExportType)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-purple-700 text-white shadow-2xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{rep.label}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Filtering row: Team brand + Date Preset + Date pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            {/* Team Selector */}
            <div>
              <Select
                label="Team Brand"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Teams (All Brands)' },
                  ...teams.map((t) => ({ value: t.id, label: `${t.name} (${t.code})` })),
                ]}
              />
            </div>

            {/* Date Preset */}
            <div>
              <Select
                label="Date Range Preset"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                options={[
                  { value: 'TODAY', label: 'Today' },
                  { value: 'YESTERDAY', label: 'Yesterday' },
                  { value: 'THIS_WEEK', label: 'This Week' },
                  { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
                  { value: 'THIS_MONTH', label: 'This Month' },
                  { value: 'LAST_MONTH', label: 'Last Month' },
                  { value: 'YTD', label: 'Year to Date' },
                  { value: 'ALL', label: 'All Time' },
                  { value: 'CUSTOM', label: 'Custom Range' },
                ]}
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('CUSTOM');
                  setStartDate(e.target.value);
                }}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('CUSTOM');
                  setEndDate(e.target.value);
                }}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 1: FINANCE REPORTS
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeCategory === 'FINANCE' && (
        <div className="space-y-6">
          {/* 1.1 Income Statement */}
          {financeReport === 'INCOME_STATEMENT' && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Delivered Revenue"
                  value={formatCurrency(incomeStatement.grossDeliveredRevenue)}
                  icon={<DollarSign className="w-5 h-5" />}
                  accentColor="green"
                  subtitle="Realized COD collections"
                />
                <StatCard
                  title="Est. COGS"
                  value={formatCurrency(incomeStatement.estimatedCOGS)}
                  icon={<Boxes className="w-5 h-5" />}
                  accentColor="amber"
                  subtitle={`Gross Margin: ${incomeStatement.grossMarginPct.toFixed(1)}%`}
                />
                <StatCard
                  title="Total OPEX"
                  value={formatCurrency(incomeStatement.totalOpEx)}
                  icon={<Receipt className="w-5 h-5" />}
                  accentColor="red"
                  subtitle="Operational expenditures"
                />
                <StatCard
                  title="Net Operating Income"
                  value={formatCurrency(incomeStatement.netProfit)}
                  icon={<TrendingUp className="w-5 h-5" />}
                  accentColor={incomeStatement.netProfit >= 0 ? 'green' : 'red'}
                  subtitle={`Net Margin: ${incomeStatement.netMarginPct.toFixed(1)}%`}
                />
              </div>

              {/* Chart */}
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Income Statement Breakdown (Revenue vs COGS vs OPEX vs Net Profit)</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Visualizing net profitability trajectory after product costs and operational expenses.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incomeStatement.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `LKR ${(val / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Amount']}
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          {incomeStatement.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 1.2 Cash Flow Statement */}
          {financeReport === 'CASH_FLOW' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Cash Inflow"
                  value={formatCurrency(cashFlow.totalInflow)}
                  icon={<ArrowUpRight className="w-5 h-5" />}
                  accentColor="green"
                  subtitle="Delivered COD revenue"
                />
                <StatCard
                  title="Total Cash Outflow"
                  value={formatCurrency(cashFlow.totalOutflow)}
                  icon={<ArrowDownRight className="w-5 h-5" />}
                  accentColor="red"
                  subtitle="Expenses + Petty Cash"
                />
                <StatCard
                  title="Net Cash Delta"
                  value={formatCurrency(cashFlow.netCashFlow)}
                  icon={<DollarSign className="w-5 h-5" />}
                  accentColor={cashFlow.netCashFlow >= 0 ? 'green' : 'red'}
                  subtitle="Net period liquidity change"
                />
                <StatCard
                  title="Cash Position"
                  value={formatCurrency(cashFlow.currentBalance)}
                  icon={<Briefcase className="w-5 h-5" />}
                  accentColor="blue"
                  subtitle="Active treasury balance"
                />
              </div>

              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Cash Inflow vs Outflow Comparison</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tracking liquidity velocity and capital burn rate.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashFlow.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `LKR ${(val / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Amount']}
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="Inflow" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Outflow" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 1.3 FSR (Field Sales Report / Financial Status Report) */}
          {financeReport === 'FSR' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Total Target Allocation"
                  value={formatCurrency(fsrData.totalTarget)}
                  icon={<Target className="w-5 h-5" />}
                  accentColor="blue"
                  subtitle="Cumulative sales goal"
                />
                <StatCard
                  title="Achieved Realized Revenue"
                  value={formatCurrency(fsrData.totalAchieved)}
                  icon={<DollarSign className="w-5 h-5" />}
                  accentColor="green"
                  subtitle="Delivered revenue"
                />
                <StatCard
                  title="Overall Target Achievement"
                  value={`${fsrData.overallRate.toFixed(1)}%`}
                  icon={<Percent className="w-5 h-5" />}
                  accentColor={fsrData.overallRate >= 80 ? 'green' : 'amber'}
                  subtitle={`${formatCurrency(fsrData.totalAchieved - fsrData.totalTarget)} variance`}
                />
              </div>

              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span>Brand Team Performance (Target vs Achieved Sales)</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Evaluating quota fulfillment across operating brand units.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fsrData.teamStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `LKR ${(val / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: any) => [formatCurrency(Number(value)), '']}
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="targetAmount" name="Target Goal" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="achievedRevenue" name="Achieved Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 1.4 Expense Report */}
          {financeReport === 'EXPENSE_REPORT' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard
                  title="Total Operational Expenses"
                  value={formatCurrency(expenseBreakdown.grandTotal)}
                  icon={<Receipt className="w-5 h-5" />}
                  accentColor="red"
                  subtitle="Inclusive of operational + damage losses"
                />
                <StatCard
                  title="Quarantined Damaged Stock Loss"
                  value={formatCurrency(expenseBreakdown.damagedStockLoss)}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  accentColor="amber"
                  subtitle="Damaged units write-off cost"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white border-slate-200 shadow-2xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-purple-600" />
                      <span>Expense Breakdown by Category (Donut Chart)</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Proportional distribution of operational cost drivers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseBreakdown.pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {expenseBreakdown.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), 'Expense']} />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Expense Table */}
                <Card className="bg-white border-slate-200 shadow-2xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">Expense Category Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-slate-100 text-xs">
                      {expenseBreakdown.pieData.map((item, idx) => (
                        <div key={item.name} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="font-semibold text-slate-800">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900">{formatCurrency(item.value)}</span>
                            <span className="text-[11px] font-mono text-slate-400 w-12 text-right">
                              {item.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* 1.5 Inventory & Damaged Stock Report */}
          {financeReport === 'INVENTORY_REPORT' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Sellable Stock Value"
                  value={formatCurrency(inventoryReport.sellableValue)}
                  icon={<Boxes className="w-5 h-5" />}
                  accentColor="green"
                  subtitle={`${inventoryReport.totalSellableUnits} total units on hand`}
                />
                <StatCard
                  title="Dispatched (In-Transit)"
                  value={`${inventoryReport.totalDispatchedUnits} units`}
                  icon={<TrendingUp className="w-5 h-5" />}
                  accentColor="blue"
                  subtitle="En route with courier"
                />
                <StatCard
                  title="Quarantined Damaged"
                  value={`${inventoryReport.totalDamagedUnits} units`}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  accentColor="red"
                  subtitle={`Loss: ${formatCurrency(inventoryReport.damagedValue)}`}
                />
                <StatCard
                  title="Low Stock Alerts"
                  value={`${inventoryReport.lowStockCount} items`}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  accentColor={inventoryReport.lowStockCount > 0 ? 'amber' : 'green'}
                  subtitle="Below threshold safety stock"
                />
              </div>

              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    <span>Product Stock Levels by Status (5 Inventory Pillars)</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Monitoring Available vs Allocated vs Dispatched vs Sold vs Damaged units per product.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inventoryReport.barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="Available" fill="#10B981" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Allocated" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Dispatched" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Sold" fill="#059669" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Damaged" fill="#EF4444" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 2: SALES REPORTS
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeCategory === 'SALES' && (
        <div className="space-y-6">
          {/* 2.1 Daily Sales */}
          {salesReport === 'DAILY_SALES' && (
            <div className="space-y-6">
              {/* 6 High-Level Daily Sales KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <StatCard
                  title="Delivered Revenue"
                  value={formatCurrency(dailySalesData.totalRev)}
                  icon={<DollarSign className="w-5 h-5" />}
                  accentColor="green"
                  subtitle={`${dailySalesData.deliveredCount} orders delivered`}
                />
                <StatCard
                  title="In-Transit COD"
                  value={formatCurrency(dailySalesData.inTransitRev)}
                  icon={<TrendingUp className="w-5 h-5" />}
                  accentColor="blue"
                  subtitle={`${dailySalesData.dispatchedCount} orders en route`}
                />
                <StatCard
                  title="Total Booked"
                  value={String(dailySalesData.totalOrders)}
                  icon={<Package className="w-5 h-5" />}
                  accentColor="purple"
                  subtitle="Total orders processed"
                />
                <StatCard
                  title="Delivery Rate"
                  value={`${dailySalesData.deliveryRate.toFixed(1)}%`}
                  icon={<Percent className="w-5 h-5" />}
                  accentColor={dailySalesData.deliveryRate >= 70 ? 'green' : 'amber'}
                  subtitle={`${dailySalesData.rejectedCount} returns/rejected`}
                />
                <StatCard
                  title="Avg Order Ticket"
                  value={formatCurrency(dailySalesData.aov)}
                  icon={<Receipt className="w-5 h-5" />}
                  accentColor="blue"
                  subtitle="Average ticket value"
                />
                <StatCard
                  title="Transit Loss"
                  value={formatCurrency(dailySalesData.damagedLoss)}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  accentColor={dailySalesData.damagedLoss > 0 ? 'red' : 'green'}
                  subtitle="Damaged return goods"
                />
              </div>

              {/* Dual Visual Analytics: Daily Revenue Velocity & Hourly Sales Cadence */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Day-by-Day Sales Velocity */}
                <Card className="bg-white border-slate-200 shadow-2xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Daily Sales Velocity & Revenue Curve</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Tracking day-by-day sales revenue and volume peaks.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailySalesData.list} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `LKR ${(val / 1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(value: any) => [formatCurrency(Number(value)), 'Delivered Sales']}
                            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Chart 2: Hourly Sales Cadence (Time of Day Heatmap) */}
                <Card className="bg-white border-slate-200 shadow-2xs">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>Hourly Sales Cadence (Peak Calling / Booking Hours)</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Evaluating sales booking velocity across operational hours of the day.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailySalesData.hourlyList} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="hourRange" stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                          <Bar dataKey="orders" name="Orders Booked" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Brand Contribution & Day-by-Day Historical Summary Table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Brand Contribution Card */}
                <Card className="bg-white border-slate-200 shadow-2xs lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <span>Brand Team Revenue Share</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Proportional revenue contribution per operating brand unit.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dailySalesData.teamContributions.map((team) => (
                      <div key={team.code} className="space-y-1.5 border border-slate-100 p-3 rounded-lg bg-slate-50/50">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{team.name} ({team.code})</span>
                          <span className="font-mono font-bold text-emerald-700">{formatCurrency(team.deliveredRevenue)}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{team.orders} Orders</span>
                          <span className="font-semibold">{team.sharePct.toFixed(1)}% Share</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${Math.min(team.sharePct, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Day-by-Day Performance Summary Table */}
                <Card className="bg-white border-slate-200 shadow-2xs lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Day-by-Day Performance Ledger</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Historical metrics breakdown for each active day in the selected period.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border border-slate-200 overflow-x-auto max-h-80">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase sticky top-0">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-center">Booked</th>
                            <th className="py-2.5 px-3 text-center">Delivered</th>
                            <th className="py-2.5 px-3 text-center">In-Transit</th>
                            <th className="py-2.5 px-3 text-center">Rejected</th>
                            <th className="py-2.5 px-3 text-center">Success %</th>
                            <th className="py-2.5 px-3 text-right">Delivered Sales</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dailySalesData.list.map((d) => {
                            const rate = d.deliveredOrders + d.rejectedOrders > 0 ? (d.deliveredOrders / (d.deliveredOrders + d.rejectedOrders)) * 100 : 0;
                            return (
                              <tr key={d.date} className="hover:bg-slate-50">
                                <td className="py-2 px-3 font-semibold text-slate-900">{d.date}</td>
                                <td className="py-2 px-3 text-center font-mono">{d.totalOrders}</td>
                                <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">{d.deliveredOrders}</td>
                                <td className="py-2 px-3 text-center font-mono text-blue-700">{d.dispatchedOrders}</td>
                                <td className="py-2 px-3 text-center font-mono text-rose-700">{d.rejectedOrders}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${rate >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {rate.toFixed(0)}%
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                  {formatCurrency(d.revenue)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Granular Order Inspection & Drill-Down Ledger */}
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-purple-600" />
                      <span>Granular Daily Orders Inspection & Drill-Down Ledger</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Inspect individual customer orders, delivery status, and ticket values in the current timeframe.
                    </CardDescription>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search order #, customer, city..."
                      value={dailySearchQuery}
                      onChange={(e) => setDailySearchQuery(e.target.value)}
                      className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-64"
                    />
                    <select
                      value={dailyStatusFilter}
                      onChange={(e) => setDailyStatusFilter(e.target.value)}
                      className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="DISPATCHED">Dispatched</option>
                      <option value="PREPARED">Prepared</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-slate-200 overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Order #</th>
                          <th className="py-2.5 px-3">Date & Time</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3">City / District</th>
                          <th className="py-2.5 px-3">Team Brand</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">COD Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailedDailyOrders.slice(0, 100).map((o) => (
                          <tr key={o.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-blue-700">{o.orderNumber}</td>
                            <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                              {o.createdAt ? format(parseISO(o.createdAt), 'dd MMM, HH:mm') : '—'}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{o.customer?.fullName || 'Customer'}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{o.customer?.phone || '—'}</td>
                            <td className="py-2 px-3 text-slate-600">{o.customer?.city || o.customer?.address || '—'}</td>
                            <td className="py-2 px-3">{teamMap[o.teamId]?.name || o.teamId}</td>
                            <td className="py-2 px-3">
                              <StatusBadge type="order" status={o.status} />
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatCurrency(o.totalAmount)}
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

          {/* 2.2 Weekly Sales */}
          {salesReport === 'WEEKLY_SALES' && (
            <div className="space-y-6">
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Week-over-Week (WoW) Sales Revenue Growth</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comparing weekly sales volume and revenue generation across consecutive weeks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklySalesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `LKR ${(val / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 2.3 Monthly Sales */}
          {salesReport === 'MONTHLY_SALES' && (
            <div className="space-y-6">
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>Monthly Sales Targets vs Actual Performance</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tracking 6-month historical monthly target achievement trajectory.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlySalesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `LKR ${(val / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: any) => [formatCurrency(Number(value)), '']}
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Line type="monotone" dataKey="target" name="Monthly Target" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={2} />
                        <Area type="monotone" dataKey="actual" name="Actual Revenue" stroke="#10B981" strokeWidth={2} fill="url(#colorActual)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 2.4 District-wise Delivery */}
          {salesReport === 'DISTRICT_DELIVERY' && (
            <div className="space-y-6">
              <Card className="bg-white border-slate-200 shadow-2xs">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <span>District-wise Delivery Breakdown (Completed vs Rejected vs Damaged)</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Geographic delivery performance across Sri Lankan districts.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={districtDeliveryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="district" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="completed" name="Delivered" fill="#10B981" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="rejected" name="Rejected / Return" fill="#EF4444" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="damaged" name="Transit Damage" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 3: RAW DATA EXPORTS & AUDIT
          ───────────────────────────────────────────────────────────────────────────── */}
      {activeCategory === 'RAW_EXPORT' && (
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Raw Data Ledger: {rawExport.replace(/_/g, ' ')}</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Inspect raw database rows before A4 PDF download or printable export.
              </CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              isLoading={isGeneratingPdf}
              onClick={exportCurrentReportAsExecutivePdf}
              className="text-xs"
            >
              Export Report PDF
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 overflow-x-auto max-h-96">
              {rawExport === 'ALL_LEADS' && (
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Lead Phone</th>
                      <th className="py-2.5 px-3">City</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Team Brand</th>
                      <th className="py-2.5 px-3">Imported Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contacts.slice(0, 50).map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{c.phone}</td>
                        <td className="py-2 px-3">{c.city || '—'}</td>
                        <td className="py-2 px-3">
                          <StatusBadge type="contact" status={c.status} />
                        </td>
                        <td className="py-2 px-3">{teamMap[c.teamId]?.name || c.teamId}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{c.importedAt ? c.importedAt.split('T')[0] : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {rawExport === 'QUALIFIED_ORDERS' && (
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Order #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Team</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.slice(0, 50).map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{o.orderNumber}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{o.customer?.fullName || 'Customer'}</td>
                        <td className="py-2 px-3">{teamMap[o.teamId]?.name || o.teamId}</td>
                        <td className="py-2 px-3">
                          <StatusBadge type="order" status={o.status} />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(o.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {rawExport === 'FINANCE_EXPENSES' && (
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Remarks</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.slice(0, 50).map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{e.categoryName}</td>
                        <td className="py-2 px-3 text-slate-600">{e.remarks}</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">{e.expenseDate}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                          {formatCurrency(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {rawExport === 'SECURITY_AUDIT' && (
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Entity</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activities.slice(0, 50).map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{a.userName || a.userId}</td>
                        <td className="py-2 px-3 font-mono text-blue-700">{a.action}</td>
                        <td className="py-2 px-3 text-slate-600">{a.entityType}</td>
                        <td className="py-2 px-3 text-slate-500">{a.description}</td>
                        <td className="py-2 px-3 font-mono text-slate-400">{a.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};
