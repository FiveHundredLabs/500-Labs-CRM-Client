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
import productsSeed from '../../data/seed/products.json';
import stockActivityLogsSeed from '../../data/seed/stock_activity_logs.json';
import approvalRequestsSeed from '../../data/seed/approval_requests.json';
import pettyCashWalletSeed from '../../data/seed/petty_cash_wallet.json';
import pettyCashTransactionsSeed from '../../data/seed/petty_cash_transactions.json';

const STORAGE_KEYS = {
  TEAMS: 'crm_teams_lk_v13',
  USERS: 'crm_users_lk_v13',
  CONTACTS: 'crm_contacts_lk_v13',
  ALLOCATIONS: 'crm_allocations_lk_v13',
  CALL_LOGS: 'crm_call_logs_lk_v13',
  CUSTOMERS: 'crm_customers_lk_v13',
  ORDERS: 'crm_orders_lk_v13',
  DELIVERY_HISTORIES: 'crm_delivery_histories_lk_v13',
  ACTIVITY_LOGS: 'crm_activity_logs_lk_v13',
  EXPENSE_CATEGORIES: 'crm_expense_categories_lk_v13',
  EXPENSES: 'crm_expenses_lk_v13',
  EMAIL_NOTIFICATIONS: 'crm_email_notifications_lk_v13',
  PRODUCTS: 'crm_products_lk_v13',
  STOCK_ACTIVITY_LOGS: 'crm_stock_activity_logs_lk_v13',
  APPROVAL_REQUESTS: 'crm_approval_requests_lk_v13',
  PETTY_CASH_WALLET: 'crm_petty_cash_wallet_lk_v13',
  PETTY_CASH_TRANSACTIONS: 'crm_petty_cash_transactions_lk_v13',
  CURRENT_USER: 'crm_auth_user_lk_v13',
};

export const delay = (ms = 100): Promise<void> => new Promise((res) => setTimeout(res, ms));

export const initMockStorage = (forceReset = false) => {
  const existingUsers = localStorage.getItem(STORAGE_KEYS.USERS);
  const isUsersEmpty = !existingUsers || existingUsers === '[]';

  if (forceReset || isUsersEmpty) {
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
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(productsSeed));
    localStorage.setItem(STORAGE_KEYS.STOCK_ACTIVITY_LOGS, JSON.stringify(stockActivityLogsSeed));
    localStorage.setItem(STORAGE_KEYS.APPROVAL_REQUESTS, JSON.stringify(approvalRequestsSeed));
    localStorage.setItem(STORAGE_KEYS.PETTY_CASH_WALLET, JSON.stringify(pettyCashWalletSeed));
    localStorage.setItem(STORAGE_KEYS.PETTY_CASH_TRANSACTIONS, JSON.stringify(pettyCashTransactionsSeed));

    // Set first available user as default if storage is empty
    const firstUser = (usersSeed as any[])[0];
    if (firstUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(firstUser));
    }
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

