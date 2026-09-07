// Realistic Centralized Sri Lankan Business Financial Mock Data
// Aligned 1:1 with Prisma Schema Database Models (Expense, Order, Product, PettyCashAllocation, PettyCashTransaction)

export interface TeamItem {
  id: string;
  name: string;
}

export const TEAMS: TeamItem[] = [
  { id: '23f9e3f9-d4e9-4b45-bb27-61a1b313cd9f', name: 'Brand Alpha' },
  { id: '3c24ffa1-bd7d-477d-a3ac-a608d97fcb50', name: 'Brand Beta' },
  { id: 'e52978a9-28ff-438d-87b1-03bee3e5379a', name: 'Easy Method English' },
  { id: 'db4557fc-0559-4864-a87c-273cc63d3628', name: 'Grow Mart' },
];

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

// Generate realistic seeded dataset strictly matching database entities
const generateMockFinancialData = () => {
  const expenses: ExpenseRecord[] = [
    {
      id: 'f9978e71-c8ca-41ce-9e84-001',
      categoryId: 'cat-comm',
      categoryName: 'Communication',
      amount: 28500,
      expenseDate: '2026-09-03',
      remarks: 'Dialog Axiata corporate leased line internet and office SIP trunks',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Monthly enterprise fiber broadband package',
      createdById: 'usr-admin-01',
      createdByName: 'Nimali Senanayake',
      createdAt: '2026-09-03T08:30:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-002',
      categoryId: 'cat-post',
      categoryName: 'Postal Charges',
      amount: 34500,
      expenseDate: '2026-09-02',
      remarks: 'Express courier consignment dispatch to regional delivery depots',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Certis Lanka express delivery invoice #9921',
      createdById: 'usr-ops-01',
      createdByName: 'Kasun Wickramasinghe',
      createdAt: '2026-09-02T10:15:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-003',
      categoryId: 'cat-util',
      categoryName: 'Utilities',
      amount: 86400,
      expenseDate: '2026-09-01',
      remarks: 'Ceylon Electricity Board commercial energy tariff - Colombo 03 HQ',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Bill ref #CEB-202608-441',
      createdById: 'usr-admin-01',
      createdByName: 'Nimali Senanayake',
      createdAt: '2026-09-01T09:00:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-004',
      categoryId: 'cat-mkt',
      categoryName: 'Marketing',
      amount: 145000,
      expenseDate: '2026-08-30',
      remarks: 'Meta Ads and Google Performance Max digital advertising campaign',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Monthly digital growth acquisition budget',
      createdById: 'usr-mkt-01',
      createdByName: 'Sachintha Perera',
      createdAt: '2026-08-30T14:20:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-005',
      categoryId: 'cat-petty',
      categoryName: 'Petty Cash',
      amount: 12500,
      expenseDate: '2026-08-28',
      remarks: 'Client meeting refreshments and evening catering supplies',
      paymentMethod: 'PETTY_CASH',
      pettyCashRef: 'PC-0003',
      notes: 'Perera and Sons food order receipt attached',
      createdById: 'usr-sales-01',
      createdByName: 'Dilan Jayawardena',
      createdAt: '2026-08-28T16:45:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-006',
      categoryId: 'cat-trans',
      categoryName: 'Transport',
      amount: 24000,
      expenseDate: '2026-08-27',
      remarks: 'Operations delivery vehicle fuel card top-up and expressway tolls',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Lanka IOC fuel quota corporate card recharge',
      createdById: 'usr-ops-01',
      createdByName: 'Kasun Wickramasinghe',
      createdAt: '2026-08-27T11:00:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-007',
      categoryId: 'cat-stat',
      categoryName: 'Stationery',
      amount: 18200,
      expenseDate: '2026-08-25',
      remarks: 'Continuous invoice printing paper reams and laser toner cartridges',
      paymentMethod: 'CASH',
      notes: 'PrintXcel Stationers cash receipt #4402',
      createdById: 'usr-fin-01',
      createdByName: 'Chandana Alwis',
      createdAt: '2026-08-25T13:30:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-008',
      categoryId: 'cat-maint',
      categoryName: 'Maintenance',
      amount: 45000,
      expenseDate: '2026-08-22',
      remarks: 'Quarterly standby generator servicing and server room cooling maintenance',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Kelani Engineering contract service invoice',
      createdById: 'usr-admin-01',
      createdByName: 'Nimali Senanayake',
      createdAt: '2026-08-22T10:00:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-009',
      categoryId: 'cat-office',
      categoryName: 'Office Expenses',
      amount: 32000,
      expenseDate: '2026-08-20',
      remarks: 'Drinking water dispenser 19L bottle deliveries and cleaning consumables',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'American Premium Water monthly delivery invoice',
      createdById: 'usr-admin-01',
      createdByName: 'Nimali Senanayake',
      createdAt: '2026-08-20T09:30:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-010',
      categoryId: 'cat-ref',
      categoryName: 'Refreshments',
      amount: 9800,
      expenseDate: '2026-08-18',
      remarks: 'Office tea service milk, Ceylon tea bags, and sugar supplies',
      paymentMethod: 'PETTY_CASH',
      pettyCashRef: 'PC-0003',
      notes: 'Weekly supermarket receipt',
      createdById: 'usr-sales-01',
      createdByName: 'Dilan Jayawardena',
      createdAt: '2026-08-18T15:00:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-011',
      categoryId: 'cat-mkt',
      categoryName: 'Marketing',
      amount: 180000,
      expenseDate: '2026-08-15',
      remarks: 'Regional print newspaper display advertisement inserts',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Wijeya Newspapers media purchase #WN-882',
      createdById: 'usr-mkt-01',
      createdByName: 'Sachintha Perera',
      createdAt: '2026-08-15T11:45:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-012',
      categoryId: 'cat-trans',
      categoryName: 'Transport',
      amount: 19500,
      expenseDate: '2026-08-12',
      remarks: 'Client onboarding travel reimbursement and highway toll passes',
      paymentMethod: 'CASH',
      notes: 'Staff field trip expense claim',
      createdById: 'usr-sales-01',
      createdByName: 'Dilan Jayawardena',
      createdAt: '2026-08-12T17:10:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-013',
      categoryId: 'cat-post',
      categoryName: 'Postal Charges',
      amount: 42000,
      expenseDate: '2026-08-10',
      remarks: 'Inter-district parcel distribution and customer exchange courier fees',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Pronto Lanka Express monthly billing statement',
      createdById: 'usr-ops-01',
      createdByName: 'Kasun Wickramasinghe',
      createdAt: '2026-08-10T12:00:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-014',
      categoryId: 'cat-comm',
      categoryName: 'Communication',
      amount: 31200,
      expenseDate: '2026-08-05',
      remarks: 'Sri Lanka Telecom corporate Megaline and VPN connection bills',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'SLT Enterprise account #011288991',
      createdById: 'usr-admin-01',
      createdByName: 'Nimali Senanayake',
      createdAt: '2026-08-05T10:20:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-015',
      categoryId: 'cat-maint',
      categoryName: 'Maintenance',
      amount: 26000,
      expenseDate: '2026-08-02',
      remarks: 'Office network firewall router replacement and patch cabling fix',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Hardware invoice #DCS-771',
      createdById: 'usr-admin-01',
      createdByName: 'Nimali Senanayake',
      createdAt: '2026-08-02T14:00:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-016',
      categoryId: 'cat-mkt',
      categoryName: 'Marketing',
      amount: 160000,
      expenseDate: '2026-07-28',
      remarks: 'Promotional video production and brand creative photo shoot',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Studio Alpha creative production contract',
      createdById: 'usr-mkt-01',
      createdByName: 'Sachintha Perera',
      createdAt: '2026-07-28T16:00:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-017',
      categoryId: 'cat-util',
      categoryName: 'Utilities',
      amount: 81500,
      expenseDate: '2026-07-25',
      remarks: 'NWSDB water utility and municipal commercial waste management',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Monthly municipal utility invoice',
      createdById: 'usr-admin-01',
      createdByName: 'Nimali Senanayake',
      createdAt: '2026-07-25T11:00:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-018',
      categoryId: 'cat-trans',
      categoryName: 'Transport',
      amount: 32000,
      expenseDate: '2026-07-20',
      remarks: 'Southern expressway regional delivery haulage lorry rental',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Southern Hauliers consignment trip invoice',
      createdById: 'usr-ops-01',
      createdByName: 'Kasun Wickramasinghe',
      createdAt: '2026-07-20T13:15:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-019',
      categoryId: 'cat-petty',
      categoryName: 'Petty Cash',
      amount: 14200,
      expenseDate: '2026-07-15',
      remarks: 'Revenue stamp duties for quarterly registered statutory documents',
      paymentMethod: 'PETTY_CASH',
      pettyCashRef: 'PC-0002',
      notes: 'General Post Office official stamp receipt',
      createdById: 'usr-fin-01',
      createdByName: 'Chandana Alwis',
      createdAt: '2026-07-15T09:45:00Z',
    },
    {
      id: 'f9978e71-c8ca-41ce-9e84-020',
      categoryId: 'cat-post',
      categoryName: 'Postal Charges',
      amount: 38900,
      expenseDate: '2026-07-10',
      remarks: 'Doorstep parcel delivery and express fulfillment fees',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Certis Lanka express delivery',
      createdById: 'usr-ops-01',
      createdByName: 'Kasun Wickramasinghe',
      createdAt: '2026-07-10T15:30:00Z',
    },
  ];

  // Delivered orders reflecting realized revenue in Prisma: model Order (purged mock data, live database integration)
  const deliveredOrders: DeliveredOrderRecord[] = [];

  // Products matching Prisma: model Product & StockBatch
  const products: ProductCostRecord[] = [
    {
      id: 'prod-001',
      code: 'PRD-HC-001',
      name: 'Ayurvedic Herbal Immunity Booster 500ml',
      teamId: 'e52978a9-28ff-438d-87b1-03bee3e5379a',
      teamName: 'Easy Method English',
      category: 'Healthcare',
      currentStock: 450,
      soldStock: 1280,
      damagedStock: 8,
      costPrice: 1250,
      sellingPrice: 2850,
      stockValue: 450 * 1250,
      salesRevenue: 1280 * 2850,
      cogs: 1280 * 1250,
      grossProfit: 1280 * (2850 - 1250),
      margin: `${(((2850 - 1250) / 2850) * 100).toFixed(2)}%`,
    },
    {
      id: 'prod-002',
      code: 'PRD-SC-002',
      name: 'Organic Virgin Coconut Oil Balm 100g',
      teamId: 'e52978a9-28ff-438d-87b1-03bee3e5379a',
      teamName: 'Easy Method English',
      category: 'Personal Care',
      currentStock: 620,
      soldStock: 940,
      damagedStock: 4,
      costPrice: 850,
      sellingPrice: 1950,
      stockValue: 620 * 850,
      salesRevenue: 940 * 1950,
      cogs: 940 * 850,
      grossProfit: 940 * (1950 - 850),
      margin: `${(((1950 - 850) / 1950) * 100).toFixed(2)}%`,
    },
    {
      id: 'prod-003',
      code: 'PRD-WC-003',
      name: 'Herbal Slimming Infusion Tea 30 Bags',
      teamId: 'db4557fc-0559-4864-a87c-273cc63d3628',
      teamName: 'Grow Mart',
      category: 'Wellness',
      currentStock: 890,
      soldStock: 1850,
      damagedStock: 12,
      costPrice: 650,
      sellingPrice: 1650,
      stockValue: 890 * 650,
      salesRevenue: 1850 * 1650,
      cogs: 1850 * 650,
      grossProfit: 1850 * (1650 - 650),
      margin: `${(((1650 - 650) / 1650) * 100).toFixed(2)}%`,
    },
    {
      id: 'prod-004',
      code: 'PRD-HC-004',
      name: 'Natural Joint Relief Herbal Oil 120ml',
      teamId: '23f9e3f9-d4e9-4b45-bb27-61a1b313cd9f',
      teamName: 'Brand Alpha',
      category: 'Healthcare',
      currentStock: 310,
      soldStock: 780,
      damagedStock: 5,
      costPrice: 1450,
      sellingPrice: 3450,
      stockValue: 310 * 1450,
      salesRevenue: 780 * 3450,
      cogs: 780 * 1450,
      grossProfit: 780 * (3450 - 1450),
      margin: `${(((3450 - 1450) / 3450) * 100).toFixed(2)}%`,
    },
    {
      id: 'prod-005',
      code: 'PRD-SC-005',
      name: 'Aloe Vera & Cucumber Soothing Face Gel',
      teamId: '3c24ffa1-bd7d-477d-a3ac-a608d97fcb50',
      teamName: 'Brand Beta',
      category: 'Personal Care',
      currentStock: 540,
      soldStock: 890,
      damagedStock: 6,
      costPrice: 720,
      sellingPrice: 1750,
      stockValue: 540 * 720,
      salesRevenue: 890 * 1750,
      cogs: 890 * 720,
      grossProfit: 890 * (1750 - 720),
      margin: `${(((1750 - 720) / 1750) * 100).toFixed(2)}%`,
    },
    {
      id: 'prod-006',
      code: 'PRD-WC-006',
      name: 'Pure Morinda Citrifolia Noni Extract 500ml',
      teamId: 'db4557fc-0559-4864-a87c-273cc63d3628',
      teamName: 'Grow Mart',
      category: 'Wellness',
      currentStock: 180,
      soldStock: 460,
      damagedStock: 2,
      costPrice: 1850,
      sellingPrice: 4200,
      stockValue: 180 * 1850,
      salesRevenue: 460 * 4200,
      cogs: 460 * 1850,
      grossProfit: 460 * (4200 - 1850),
      margin: `${(((4200 - 1850) / 4200) * 100).toFixed(2)}%`,
    },
  ];

  // Petty Cash Allocations matching Prisma: model PettyCashAllocation
  const pettyCashAllocations: PettyCashAllocationRecord[] = [
    {
      id: 'pca-004',
      allocationCode: 'PC-0004',
      amount: 50000,
      usedAmount: 8250,
      remainingAmount: 41750,
      reason: 'September 2026 Working Capital Cash Float',
      date: '2026-09-01',
      allocatedById: 'usr-fin-01',
      allocatedByName: 'Chandana Alwis',
    },
    {
      id: 'pca-003',
      allocationCode: 'PC-0003',
      amount: 50000,
      usedAmount: 34800,
      remainingAmount: 15200,
      reason: 'August 2026 Working Capital Cash Float',
      date: '2026-08-01',
      allocatedById: 'usr-fin-01',
      allocatedByName: 'Chandana Alwis',
    },
    {
      id: 'pca-002',
      allocationCode: 'PC-0002',
      amount: 50000,
      usedAmount: 46200,
      remainingAmount: 3800,
      reason: 'July 2026 Working Capital Cash Float',
      date: '2026-07-01',
      allocatedById: 'usr-fin-01',
      allocatedByName: 'Chandana Alwis',
    },
  ];

  // Petty Cash Transactions matching Prisma: model PettyCashTransaction
  const pettyCashTransactions: PettyCashTransactionRecord[] = [
    {
      id: 'pct-001',
      transactionType: 'ALLOCATION',
      allocationId: 'pca-004',
      allocationCode: 'PC-0004',
      reason: 'September 2026 Working Capital Cash Float',
      category: 'Allocation',
      amount: 50000,
      date: '2026-09-01',
      description: 'Capital deposit into petty cash vault',
      userId: 'usr-fin-01',
      userName: 'Chandana Alwis',
      remainingBalance: 50000,
    },
    {
      id: 'pct-002',
      transactionType: 'EXPENSE',
      allocationId: 'pca-004',
      allocationCode: 'PC-0004',
      reason: 'Urgent document messenger delivery to Registrar',
      category: 'Transport',
      amount: 2500,
      date: '2026-09-02',
      description: 'Courier dispatch for statutory company filing',
      userId: 'usr-admin-01',
      userName: 'Nimali Senanayake',
      remainingBalance: 47500,
    },
    {
      id: 'pct-003',
      transactionType: 'EXPENSE',
      allocationId: 'pca-004',
      allocationCode: 'PC-0004',
      reason: 'Client meeting coffee & tea snacks',
      category: 'Refreshments',
      amount: 3800,
      date: '2026-09-02',
      description: 'Refreshments for enterprise client meeting',
      userId: 'usr-sales-01',
      userName: 'Dilan Jayawardena',
      remainingBalance: 43700,
    },
    {
      id: 'pct-004',
      transactionType: 'EXPENSE',
      allocationId: 'pca-004',
      allocationCode: 'PC-0004',
      reason: 'Emergency file folders & stapler pins purchase',
      category: 'Stationery',
      amount: 1950,
      date: '2026-09-03',
      description: 'Office supply replenishment for dispatch floor',
      userId: 'usr-ops-01',
      userName: 'Kasun Wickramasinghe',
      remainingBalance: 41750,
    },
    {
      id: 'pct-005',
      transactionType: 'ALLOCATION',
      allocationId: 'pca-003',
      allocationCode: 'PC-0003',
      reason: 'August 2026 Working Capital Cash Float',
      category: 'Allocation',
      amount: 50000,
      date: '2026-08-01',
      description: 'Float allocation deposit',
      userId: 'usr-fin-01',
      userName: 'Chandana Alwis',
      remainingBalance: 50000,
    },
    {
      id: 'pct-006',
      transactionType: 'EXPENSE',
      allocationId: 'pca-003',
      allocationCode: 'PC-0003',
      reason: 'Call center staff late night travel transport reimbursement',
      category: 'Transport',
      amount: 8500,
      date: '2026-08-12',
      description: 'Staff overtime late shift drop',
      userId: 'usr-sales-01',
      userName: 'Dilan Jayawardena',
      remainingBalance: 41500,
    },
    {
      id: 'pct-007',
      transactionType: 'EXPENSE',
      allocationId: 'pca-003',
      allocationCode: 'PC-0003',
      reason: 'Door lock cylinder replacement & plumbing washer fix',
      category: 'Maintenance',
      amount: 4200,
      date: '2026-08-20',
      description: 'Handyman repair invoice',
      userId: 'usr-admin-01',
      userName: 'Nimali Senanayake',
      remainingBalance: 37300,
    },
    {
      id: 'pct-008',
      transactionType: 'EXPENSE',
      allocationId: 'pca-003',
      allocationCode: 'PC-0003',
      reason: 'Catering for quarterly team retrospective',
      category: 'Refreshments',
      amount: 12500,
      date: '2026-08-28',
      description: 'P&S catering order',
      userId: 'usr-sales-01',
      userName: 'Dilan Jayawardena',
      remainingBalance: 24800,
    },
  ];

  return {
    expenses,
    deliveredOrders,
    products,
    pettyCashAllocations,
    pettyCashTransactions,
  };
};

export const MOCK_FINANCE_DATABASE = generateMockFinancialData();
