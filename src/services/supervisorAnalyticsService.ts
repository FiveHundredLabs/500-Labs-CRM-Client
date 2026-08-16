import { Order, User, OrderStatus } from '../models/domain';
import { ORDER_STATUS_CONFIG } from '../config/status';

export interface LeaderboardMemberStats {
  rank: number;
  memberId: string;
  memberName: string;
  avatarUrl?: string;
  email: string;
  phone: string;
  totalOrders: number;
  dispatchedOrders: number;
  deliveredOrders: number;
  rejectedOrders: number;
  deliveryRate: number; // percentage 0-100
  totalSalesValue: number; // delivered order value or total handled value
}

export interface ReportsFilterOptions {
  datePreset?: string; // 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  teamMemberId?: string; // 'ALL' or user ID
  orderStatus?: string; // 'ALL' or OrderStatus
  searchQuery?: string;
}

export interface FinancialReportSummary {
  totalOrders: number;
  totalOrderValue: number;
  deliveredOrders: number;
  deliveredOrderValue: number;
  dispatchedOrders: number;
  dispatchedOrderValue: number;
  rejectedOrders: number;
  rejectedOrderValue: number;
  deliveryRate: number; // %
  rejectionRate: number; // %
  averageOrderValue: number; // AOV
}

export interface OrderStatusDistribution {
  status: OrderStatus;
  label: string;
  count: number;
  value: number;
  badgeClass: string;
  percentage: number;
}

export interface SalesTrendPoint {
  dateLabel: string;
  totalOrders: number;
  salesValue: number;
  deliveredOrders: number;
}

export interface MemberPerformanceChartPoint {
  name: string;
  orders: number;
  delivered: number;
  salesValue: number;
}

export class SupervisorAnalyticsService {
  /**
   * Filter order array by date range, team member, order status, and search query.
   */
  static filterOrders(orders: Order[], filters: ReportsFilterOptions): Order[] {
    return orders.filter((order) => {
      // 1. Team member filter
      if (filters.teamMemberId && filters.teamMemberId !== 'ALL' && order.teamMemberId !== filters.teamMemberId) {
        return false;
      }

      // 2. Order status filter
      if (filters.orderStatus && filters.orderStatus !== 'ALL' && order.status !== filters.orderStatus) {
        return false;
      }

      // 3. Date range filter
      if (filters.startDate || filters.endDate) {
        const orderDate = order.createdAt ? order.createdAt.substring(0, 10) : '';
        if (filters.startDate && orderDate < filters.startDate) return false;
        if (filters.endDate && orderDate > filters.endDate) return false;
      }

      // 4. Search query filter
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchNum = order.orderNumber.toLowerCase().includes(q);
        const matchDesc = order.itemsDescription.toLowerCase().includes(q);
        const matchId = order.id.toLowerCase().includes(q);
        if (!matchNum && !matchDesc && !matchId) return false;
      }

      return true;
    });
  }

  /**
   * Computes Leaderboard metrics for team members based on their handled orders.
   */
  static computeLeaderboard(
    teamMembers: User[],
    orders: Order[],
    filters?: ReportsFilterOptions
  ): LeaderboardMemberStats[] {
    const filteredOrders = filters ? this.filterOrders(orders, filters) : orders;

    const statsMap = new Map<string, LeaderboardMemberStats>();

    // Initialize for all active team members
    teamMembers.forEach((member) => {
      statsMap.set(member.id, {
        rank: 0,
        memberId: member.id,
        memberName: member.fullName,
        avatarUrl: member.avatarUrl,
        email: member.email,
        phone: member.phone,
        totalOrders: 0,
        dispatchedOrders: 0,
        deliveredOrders: 0,
        rejectedOrders: 0,
        deliveryRate: 0,
        totalSalesValue: 0,
      });
    });

    // Aggregate order data per member
    filteredOrders.forEach((order) => {
      let stats = statsMap.get(order.teamMemberId);
      if (!stats) {
        // If order belongs to a member not in teamMembers list yet, initialize dynamic entry
        stats = {
          rank: 0,
          memberId: order.teamMemberId,
          memberName: `Member (${order.teamMemberId.substring(0, 8)})`,
          email: '',
          phone: '',
          totalOrders: 0,
          dispatchedOrders: 0,
          deliveredOrders: 0,
          rejectedOrders: 0,
          deliveryRate: 0,
          totalSalesValue: 0,
        };
        statsMap.set(order.teamMemberId, stats);
      }

      stats.totalOrders += 1;

      if (order.status === 'DELIVERED') {
        stats.deliveredOrders += 1;
        stats.totalSalesValue += order.totalAmount || 0;
      } else if (order.status === 'DISPATCHED') {
        stats.dispatchedOrders += 1;
      } else if (order.status === 'REJECTED' || order.status === 'RETURNED') {
        stats.rejectedOrders += 1;
      }
    });

    // Compute delivery rate & final stats list
    const statsList: LeaderboardMemberStats[] = Array.from(statsMap.values()).map((s) => {
      const finished = s.deliveredOrders + s.rejectedOrders;
      // Rate based on delivered out of total or completed orders
      const rate = s.totalOrders > 0 ? (s.deliveredOrders / s.totalOrders) * 100 : 0;
      return {
        ...s,
        deliveryRate: Math.round(rate * 10) / 10,
      };
    });

    // Sort by 1. Delivered Orders desc, 2. Delivery Rate desc, 3. Total Sales Value desc
    statsList.sort((a, b) => {
      if (b.deliveredOrders !== a.deliveredOrders) return b.deliveredOrders - a.deliveredOrders;
      if (b.deliveryRate !== a.deliveryRate) return b.deliveryRate - a.deliveryRate;
      return b.totalSalesValue - a.totalSalesValue;
    });

    // Assign rank 1-N
    statsList.forEach((item, index) => {
      item.rank = index + 1;
    });

    return statsList;
  }

  /**
   * Computes Financial and Operational summary for Reports page.
   */
  static computeFinancialSummary(orders: Order[]): FinancialReportSummary {
    const totalOrders = orders.length;
    let totalOrderValue = 0;
    let deliveredOrders = 0;
    let deliveredOrderValue = 0;
    let dispatchedOrders = 0;
    let dispatchedOrderValue = 0;
    let rejectedOrders = 0;
    let rejectedOrderValue = 0;

    orders.forEach((o) => {
      const amt = o.totalAmount || 0;
      totalOrderValue += amt;

      if (o.status === 'DELIVERED') {
        deliveredOrders += 1;
        deliveredOrderValue += amt;
      } else if (o.status === 'DISPATCHED') {
        dispatchedOrders += 1;
        dispatchedOrderValue += amt;
      } else if (o.status === 'REJECTED' || o.status === 'RETURNED') {
        rejectedOrders += 1;
        rejectedOrderValue += amt;
      }
    });

    const deliveryRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 1000) / 10 : 0;
    const rejectionRate = totalOrders > 0 ? Math.round((rejectedOrders / totalOrders) * 1000) / 10 : 0;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalOrderValue / totalOrders) : 0;

    return {
      totalOrders,
      totalOrderValue,
      deliveredOrders,
      deliveredOrderValue,
      dispatchedOrders,
      dispatchedOrderValue,
      rejectedOrders,
      rejectedOrderValue,
      deliveryRate,
      rejectionRate,
      averageOrderValue,
    };
  }

  /**
   * Computes Order Status Distribution metrics for charts & KPI cards.
   */
  static computeStatusDistribution(orders: Order[]): OrderStatusDistribution[] {
    const total = orders.length;
    const counts: Record<string, { count: number; value: number }> = {};

    orders.forEach((o) => {
      if (!counts[o.status]) {
        counts[o.status] = { count: 0, value: 0 };
      }
      counts[o.status].count += 1;
      counts[o.status].value += o.totalAmount || 0;
    });

    const allStatuses: OrderStatus[] = ['DRAFT', 'PREPARED', 'DISPATCHED', 'DELIVERED', 'REJECTED', 'RETURNED'];

    return allStatuses.map((st) => {
      const item = counts[st] || { count: 0, value: 0 };
      const config = ORDER_STATUS_CONFIG[st];
      return {
        status: st,
        label: config ? config.label : st,
        count: item.count,
        value: item.value,
        badgeClass: config ? config.badgeClass : 'badge-gray',
        percentage: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0,
      };
    });
  }

  /**
   * Prepares performance data per team member for charts.
   */
  static computeMemberPerformanceChart(leaderboard: LeaderboardMemberStats[]): MemberPerformanceChartPoint[] {
    return leaderboard.map((m) => ({
      name: m.memberName.split(' ')[0] || m.memberName,
      orders: m.totalOrders,
      delivered: m.deliveredOrders,
      salesValue: m.totalSalesValue,
    }));
  }
}
