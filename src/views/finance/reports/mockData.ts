// Centralized Sri Lankan Business Financial Types and Schemas
// Aligned 1:1 with Prisma Database Models (Expense, Order, Product, PettyCashAllocation, PettyCashTransaction)

export interface TeamItem {
  id: string;
  name: string;
}

export const EXPENSE_CATEGORIES = [
  'Communication',
  'Maintenance',
  'Marketing',
  'Petty Cash',
  'Postal Charges',
  'Refreshments',
  'Stationery',
  'Transport',
  'Utilities',
  'Office Expenses',
];

// Matches Prisma: model Expense
export interface ExpenseRecord {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  expenseDate: string; // YYYY-MM-DD
  remarks: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'PETTY_CASH';
  notes?: string | null;
  pettyCashRef?: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

// Matches Prisma: model Order (Delivered status for income/revenue)
export interface DeliveredOrderRecord {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: 'DELIVERED';
  deliveredAt: string; // YYYY-MM-DD
  createdAt: string;
  customerName: string;
  city: string;
  itemCount: number;
  cogs: number;
  grossProfit: number;
  teamId?: string;
  teamName?: string;
  teamMember?: string;
}

// Matches Prisma: model Product & StockBatch
export interface ProductCostRecord {
  id: string;
  code: string;
  name: string;
  teamId?: string;
  teamName?: string;
  category?: string;
  currentStock: number;
  soldStock: number;
  damagedStock: number;
  costPrice: number;
  sellingPrice: number;
  stockValue: number;
  salesRevenue: number;
  cogs: number;
  grossProfit: number;
  margin: string;
}

// Matches Prisma: model PettyCashAllocation
export interface PettyCashAllocationRecord {
  id: string;
  allocationCode: string; // PC-0001
  amount: number;
  usedAmount: number;
  remainingAmount: number;
  reason: string;
  date: string; // YYYY-MM-DD
  allocatedById: string;
  allocatedByName: string;
}

// Matches Prisma: model PettyCashTransaction
export interface PettyCashTransactionRecord {
  id: string;
  transactionType: 'ALLOCATION' | 'EXPENSE';
  allocationId?: string | null;
  allocationCode?: string | null;
  reason: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  userId: string;
  userName: string;
  remainingBalance: number;
}
