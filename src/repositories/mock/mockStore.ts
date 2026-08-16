import teamsSeed from '../../data/seed/teams.json';
import usersSeed from '../../data/seed/users.json';
import contactsSeed from '../../data/seed/contacts.json';
import allocationsSeed from '../../data/seed/allocations.json';
import callLogsSeed from '../../data/seed/call_logs.json';
import customersSeed from '../../data/seed/customers.json';
import ordersSeed from '../../data/seed/orders.json';
import deliveryHistoriesSeed from '../../data/seed/delivery_status_histories.json';
import activityLogsSeed from '../../data/seed/activity_logs.json';
import expenseCategoriesSeed from '../../data/seed/expense_categories.json';
import expensesSeed from '../../data/seed/expenses.json';
import emailNotificationsSeed from '../../data/seed/email_notifications.json';

const STORAGE_KEYS = {
  TEAMS: 'crm_teams_lk_v7',
  USERS: 'crm_users_lk_v7',
  CONTACTS: 'crm_contacts_lk_v7',
  ALLOCATIONS: 'crm_allocations_lk_v7',
  CALL_LOGS: 'crm_call_logs_lk_v7',
  CUSTOMERS: 'crm_customers_lk_v7',
  ORDERS: 'crm_orders_lk_v7',
  DELIVERY_HISTORIES: 'crm_delivery_histories_lk_v7',
  ACTIVITY_LOGS: 'crm_activity_logs_lk_v7',
  EXPENSE_CATEGORIES: 'crm_expense_categories_lk_v7',
  EXPENSES: 'crm_expenses_lk_v7',
  EMAIL_NOTIFICATIONS: 'crm_email_notifications_lk_v7',
  CURRENT_USER: 'crm_auth_user_lk_v7',
};

export const delay = (ms = 100): Promise<void> => new Promise((res) => setTimeout(res, ms));

export const initMockStorage = (forceReset = false) => {
  if (forceReset || !localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teamsSeed));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(usersSeed));
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contactsSeed));
    localStorage.setItem(STORAGE_KEYS.ALLOCATIONS, JSON.stringify(allocationsSeed));
    localStorage.setItem(STORAGE_KEYS.CALL_LOGS, JSON.stringify(callLogsSeed));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customersSeed));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(ordersSeed));
    localStorage.setItem(STORAGE_KEYS.DELIVERY_HISTORIES, JSON.stringify(deliveryHistoriesSeed));
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(activityLogsSeed));
    localStorage.setItem(STORAGE_KEYS.EXPENSE_CATEGORIES, JSON.stringify(expenseCategoriesSeed));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expensesSeed));
    localStorage.setItem(STORAGE_KEYS.EMAIL_NOTIFICATIONS, JSON.stringify(emailNotificationsSeed));

    // Force default active logged in user to Pathum Nishshanka
    const defaultUser = (usersSeed as any[]).find((u) => u.id === 'usr_mem_01') || usersSeed[0];
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(defaultUser));
  }
};

export function getStoredItem<T>(key: string, fallback: T[]): T[] {
  initMockStorage();
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return fallback;
  }
}

export function setStoredItem<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

export { STORAGE_KEYS };
