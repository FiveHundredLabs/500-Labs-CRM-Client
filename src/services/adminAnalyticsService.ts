import { format } from 'date-fns';
import { Order, Contact, Expense, Team, DeliveryStatusHistory, CallLog } from '../models/domain';

export class AdminAnalyticsService {
  /**
   * 1. This Month Delivered Orders:
   * Total number of orders with status 'DELIVERED' where delivered date falls in the current calendar month.
   */
  static getThisMonthDeliveredOrders(
    orders: Order[],
    histories: DeliveryStatusHistory[] = [],
    now: Date = new Date()
  ): number {
    const currentMonthKey = format(now, 'yyyy-MM');

    const historyDeliveredMap = new Map<string, string>();
    histories.forEach((h) => {
      if (h.newStatus === 'DELIVERED') {
        historyDeliveredMap.set(h.orderId, h.createdAt);
      }
    });

    return orders.filter((o) => {
      if (o.status !== 'DELIVERED') return false;
      const deliveredTimestamp = historyDeliveredMap.get(o.id) || o.updatedAt || o.createdAt;
      if (!deliveredTimestamp) return false;
      return deliveredTimestamp.substring(0, 7) === currentMonthKey;
    }).length;
  }

  /**
   * 2. Today's Interested Count:
   * Number of Interested records created/received today.
   */
  static getTodayInterestedCount(
    contacts: Contact[],
    callLogs: CallLog[] = [],
    now: Date = new Date()
  ): number {
    const todayStr = format(now, 'yyyy-MM-dd');
    const interestedContactIds = new Set<string>();

    contacts.forEach((c) => {
      if (c.status === 'INTERESTED') {
        const dateStr = (c.updatedAt || c.lastCalledAt || c.importedAt || '').substring(0, 10);
        if (dateStr === todayStr) {
          interestedContactIds.add(c.id);
        }
      }
    });

    callLogs.forEach((l) => {
      if (l.status === 'INTERESTED') {
        const dateStr = (l.calledAt || '').substring(0, 10);
        if (dateStr === todayStr) {
          interestedContactIds.add(l.contactId);
        }
      }
    });

    return interestedContactIds.size;
  }

  /**
   * 3. Last Dispatched Count & Date:
   * Number of orders dispatched on the most recent available dispatched date.
   */
  static getLastDispatchedInfo(
    orders: Order[],
    histories: DeliveryStatusHistory[] = []
  ): { count: number; latestDate: string | null } {
    const historyDispatchedMap = new Map<string, string>();
    histories.forEach((h) => {
      if (h.newStatus === 'DISPATCHED') {
        historyDispatchedMap.set(h.orderId, h.createdAt.substring(0, 10));
      }
    });

    const dispatchedDatesPerOrder: { orderId: string; dateStr: string }[] = [];

    orders.forEach((o) => {
      const historyDate = historyDispatchedMap.get(o.id);
      if (historyDate) {
        dispatchedDatesPerOrder.push({ orderId: o.id, dateStr: historyDate });
      } else if (o.status === 'DISPATCHED') {
        const dateStr = (o.updatedAt || o.createdAt || '').substring(0, 10);
        if (dateStr) {
          dispatchedDatesPerOrder.push({ orderId: o.id, dateStr });
        }
      }
    });

    if (dispatchedDatesPerOrder.length === 0) {
      return { count: 0, latestDate: null };
    }

    let latestDate = dispatchedDatesPerOrder[0].dateStr;
    dispatchedDatesPerOrder.forEach((item) => {
      if (item.dateStr > latestDate) {
        latestDate = item.dateStr;
      }
    });

    const count = dispatchedDatesPerOrder.filter((item) => item.dateStr === latestDate).length;

    return { count, latestDate };
  }

  /**
   * 4. This Month Expenses:
   * Total expenses for current calendar month.
   */
  static getThisMonthExpenses(
    expenses: Expense[],
    now: Date = new Date()
  ): number {
    const currentMonthKey = format(now, 'yyyy-MM');
    return expenses.reduce((acc, curr) => {
      const monthKey = (curr.expenseDate || '').substring(0, 7);
      if (monthKey === currentMonthKey) {
        return acc + (curr.amount || 0);
      }
      return acc;
    }, 0);
  }

  /**
   * 5. Monthly Delivered Orders By Company (Last 12 Months):
   * Aggregates delivered orders per team/company for each of the last 12 months dynamically.
   */
  static getMonthlyDeliveredOrdersByCompany(
    orders: Order[],
    teams: Team[],
    histories: DeliveryStatusHistory[] = [],
    now: Date = new Date()
  ): Array<Record<string, any>> {
    const year = now.getFullYear();
    const month = now.getMonth();

    const months: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - i, 1);
      months.push({
        key: format(d, 'yyyy-MM'),
        label: format(d, 'MMM yyyy'),
      });
    }

    const historyDeliveredMap = new Map<string, string>();
    histories.forEach((h) => {
      if (h.newStatus === 'DELIVERED') {
        historyDeliveredMap.set(h.orderId, h.createdAt);
      }
    });

    const teamMap = new Map<string, string>();
    teams.forEach((t) => teamMap.set(t.id, t.name));

    const chartData = months.map((m) => {
      const row: Record<string, any> = {
        monthKey: m.key,
        monthLabel: m.label,
      };
      teams.forEach((t) => {
        row[t.name] = 0;
      });
      return row;
    });

    const monthRowMap = new Map<string, Record<string, any>>();
    chartData.forEach((row) => monthRowMap.set(row.monthKey, row));

    orders.forEach((o) => {
      if (o.status !== 'DELIVERED') return;

      const teamName = teamMap.get(o.teamId);
      if (!teamName) return;

      const deliveredTimestamp = historyDeliveredMap.get(o.id) || o.updatedAt || o.createdAt;
      if (!deliveredTimestamp) return;

      const monthKey = deliveredTimestamp.substring(0, 7);
      const row = monthRowMap.get(monthKey);
      if (row) {
        row[teamName] = (row[teamName] || 0) + 1;
      }
    });

    return chartData;
  }
}
