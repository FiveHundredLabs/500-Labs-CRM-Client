import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { Product, Team, Order, StockActivityLog, Customer } from '../../models/domain';
import { productRepository, teamRepository, orderRepository, stockActivityLogRepository, customerRepository } from '../../repositories';
import { getTeamBranding } from '../../config/branding';
import { formatCurrency } from '../../utils/currency';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { LoadingState } from '../../components/shared/LoadingState';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { GitHubVerificationDeleteDialog } from '../../components/shared/GitHubVerificationDeleteDialog';
import toast from 'react-hot-toast';
import {
  Package,
  Plus,
  Edit2,
  AlertTriangle,
  Layers,
  Search,
  CheckCircle2,
  Boxes,
  DollarSign,
  TrendingUp,
  Tag,
  Info,
  XCircle,
  Building2,
  Trash2,
  ShieldAlert,
  Calendar,
  UserCheck,
  FileText,
} from 'lucide-react';

export interface DamageAuditRecord {
  id: string;
  source: 'STOCK_LOG' | 'ORDER_RETURN';
  orderNumber?: string | null;
  orderStatus?: string;
  customerName?: string;
  customerPhone?: string;
  customerCity?: string;
  date: string;
  quantity: number;
  reason: string;
  performedByName?: string;
}

export const AdminProductsPage: React.FC = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW_STOCK' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'DAMAGED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Batches Inspection Modal
  const [inspectingBatchesProduct, setInspectingBatchesProduct] = useState<Product | null>(null);

  // Product Damaged Stock Audit Modal
  const [inspectingDamageProduct, setInspectingDamageProduct] = useState<Product | null>(null);
  const [damageAuditRecords, setDamageAuditRecords] = useState<DamageAuditRecord[]>([]);
  const [loadingDamageAudit, setLoadingDamageAudit] = useState(false);

  // GitHub-style Soft Delete Modal State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [formTeamId, setFormTeamId] = useState('team_001');
  const [category, setCategory] = useState('Supplements');
  const [costPrice, setCostPrice] = useState<number | string>(2500);
  const [sellingPrice, setSellingPrice] = useState<number | string>(5000);
  const [minStockThreshold, setMinStockThreshold] = useState<number | string>(10);
  const [editCurrentStock, setEditCurrentStock] = useState<number>(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingSave, setConfirmingSave] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allProducts, allTeams] = await Promise.all([
        productRepository.getAll(),
        teamRepository.getAll(),
      ]);
      setProducts(allProducts);
      setTeams(allTeams);
      if (allTeams.length > 0 && formTeamId === 'team_001') {
        setFormTeamId(allTeams[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Modal Triggers
  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCode(`PROD-${Math.floor(100 + Math.random() * 900)}`);
    setFormTeamId(teams[0]?.id || 'team_001');
    setCategory('Supplements');
    setCostPrice(2500);
    setSellingPrice(5000);
    setMinStockThreshold(10);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCode(p.code);
    setFormTeamId(p.teamId);
    setCategory(p.category || 'General');
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setMinStockThreshold(p.minStockThreshold);
    setEditCurrentStock(p.currentStock);
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!name.trim() || !code.trim() || !user) return;

    const parsedCost = Number(costPrice) || 0;
    const parsedSelling = Number(sellingPrice) || 0;
    const parsedThreshold = Number(minStockThreshold) || 10;

    if (parsedCost < 0 || parsedSelling < 0) {
      toast.error('Prices must be positive values.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await productRepository.update(editingProduct.id, {
          name: name.trim(),
          code: code.trim(),
          teamId: formTeamId,
          category: category.trim(),
          costPrice: parsedCost,
          sellingPrice: parsedSelling,
          minStockThreshold: parsedThreshold,
        });
        toast.success(`Updated product "${name}"`);
      } else {
        await productRepository.create({
          name: name.trim(),
          code: code.trim(),
          teamId: formTeamId,
          category: category.trim() || 'General',
          currentStock: 0, // Initial stock is 0 units as requested
          minStockThreshold: parsedThreshold,
          costPrice: parsedCost,
          sellingPrice: parsedSelling,
          isActive: true,
        });
        const assignedTeam = teams.find((t) => t.id === formTeamId)?.name || formTeamId;
        toast.success(`Created new product "${name}" assigned to ${assignedTeam}`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // GitHub-style Soft Delete Handler
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await productRepository.delete(deletingProduct.id);
      toast.success(`Product "${deletingProduct.name}" has been deactivated successfully.`);
      setDeletingProduct(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Damaged Stock Audit Inspection Trigger
  const handleOpenDamageAudit = async (p: Product) => {
    setInspectingDamageProduct(p);
    setLoadingDamageAudit(true);
    try {
      const [logs, orders, customers] = await Promise.all([
        stockActivityLogRepository.getByProductId(p.id).catch(() => []),
        orderRepository.getAll().catch(() => []),
        customerRepository.getAll().catch(() => []),
      ]);

      const custMap = new Map(customers.map((c) => [c.id, c]));
      const orderMap = new Map(orders.map((o) => [o.id, o]));
      const records: DamageAuditRecord[] = [];

      // 1. Stock Activity Logs
      const damageLogs = logs.filter(
        (l) => l.action === 'RETURN_DAMAGE' || l.action === 'REMOVE' || l.newStatus === 'DAMAGED' || (l.reason && l.reason.toLowerCase().includes('damage'))
      );

      damageLogs.forEach((log) => {
        const ord = log.orderId ? orderMap.get(log.orderId) : (log.orderNumber ? orders.find(o => o.orderNumber === log.orderNumber || `#${o.orderNumber}` === log.orderNumber) : null);
        const cust = ord ? custMap.get(ord.customerId) : null;
        records.push({
          id: log.id,
          source: ord ? 'ORDER_RETURN' : 'STOCK_LOG',
          orderNumber: log.orderNumber || (ord ? `#${ord.orderNumber}` : null),
          orderStatus: ord?.status,
          customerName: log.customerName || cust?.fullName || (ord ? 'Customer' : undefined),
          customerPhone: cust?.phone,
          customerCity: cust?.city || 'Sri Lanka',
          date: log.createdAt,
          quantity: log.quantity,
          reason: log.reason || 'Damaged Stock Quarantined',
          performedByName: log.performedByName || 'Supervisor',
        });
      });

      // 2. Orders belonging to this product team that were rejected or returned damaged
      orders.forEach((ord) => {
        if (
          ord.teamId === p.teamId &&
          (ord.status === 'REJECTED' ||
            (ord.remarks && ord.remarks.toLowerCase().includes('damage')) ||
            (ord.damagedItems && ord.damagedItems.length > 0))
        ) {
          const cust = custMap.get(ord.customerId);
          const matchedDamagedItem = ord.damagedItems?.find(
            (di) =>
              di.productId === p.id ||
              di.productName.toLowerCase().includes(p.name.toLowerCase()) ||
              p.name.toLowerCase().includes(di.productName.toLowerCase())
          );

          const alreadyAdded = records.some(
            (r) => r.orderNumber === `#${ord.orderNumber}` || r.orderNumber === ord.orderNumber
          );

          if (!alreadyAdded) {
            records.push({
              id: `ord_${ord.id}`,
              source: 'ORDER_RETURN',
              orderNumber: `#${ord.orderNumber}`,
              orderStatus: ord.status,
              customerName: cust?.fullName || 'Customer',
              customerPhone: cust?.phone,
              customerCity: cust?.city || 'Sri Lanka',
              date: ord.rejectedAt || ord.updatedAt || ord.createdAt,
              quantity: matchedDamagedItem?.quantity || 1,
              reason:
                matchedDamagedItem?.reason ||
                ord.remarks ||
                'Customer refused package - returned damaged during transit',
              performedByName: 'Courier Return / Status Update',
            });
          }
        }
      });

      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDamageAuditRecords(records);
    } catch {
      toast.error('Failed to load damage audit logs.');
    } finally {
      setLoadingDamageAudit(false);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Team Filter
      if (selectedTeamId !== 'ALL' && p.teamId !== selectedTeamId) {
        return false;
      }

      // 2. Stock Health Status Filter
      if (stockStatusFilter === 'LOW_STOCK') {
        if (p.currentStock <= 0 || p.currentStock > p.minStockThreshold) return false;
      } else if (stockStatusFilter === 'OUT_OF_STOCK') {
        if (p.currentStock > 0) return false;
      } else if (stockStatusFilter === 'IN_STOCK') {
        if (p.currentStock <= p.minStockThreshold) return false;
      } else if (stockStatusFilter === 'DAMAGED') {
        if ((p.damagedStock || 0) <= 0) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesCode = p.code.toLowerCase().includes(query);
        const matchesCategory = p.category?.toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesCategory) return false;
      }

      return true;
    });
  }, [products, selectedTeamId, stockStatusFilter, searchQuery]);

  // Summary Metrics
  const teamScopedProducts = useMemo(() => {
    return products.filter((p) => selectedTeamId === 'ALL' || p.teamId === selectedTeamId);
  }, [products, selectedTeamId]);

  const totalProductsCount = teamScopedProducts.length;
  const lowStockCount = teamScopedProducts.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockThreshold).length;
  const outOfStockCount = teamScopedProducts.filter((p) => p.currentStock === 0).length;
  const inStockCount = teamScopedProducts.filter((p) => p.currentStock > p.minStockThreshold).length;
  const damagedProductsCount = teamScopedProducts.filter((p) => (p.damagedStock || 0) > 0).length;

  const totalStockUnits = teamScopedProducts.reduce((sum, p) => sum + (Number(p.currentStock) || 0), 0);
  const totalDamagedUnits = teamScopedProducts.reduce((sum, p) => sum + (Number(p.damagedStock) || 0), 0);
  const totalRetailValuation = teamScopedProducts.reduce(
    (sum, p) => sum + (Number(p.currentStock) || 0) * (Number(p.sellingPrice) || 0),
    0
  );

  const lowStockItems = teamScopedProducts.filter((p) => p.currentStock <= p.minStockThreshold);

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Product Inventory Management"
        description="Add product definitions, configure selling & cost prices, and monitor real-time stock levels team-wise"
        actions={
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openAddModal}>
            Add New Product
          </Button>
        }
      />

      {/* Low Stock Alert Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                {lowStockItems.length} Products Require Stock Replenishment
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {lowStockItems.map((p) => `${p.name} (${p.currentStock} left)`).slice(0, 3).join(' • ')}
                {lowStockItems.length > 3 ? ` and ${lowStockItems.length - 3} more...` : ''}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStockStatusFilter('LOW_STOCK')}
            className="text-xs bg-white text-amber-900 border-amber-300 hover:bg-amber-100 font-semibold shrink-0"
          >
            View Low Stock Only
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={totalProductsCount}
          subtitle={selectedTeamId === 'ALL' ? 'Across all team brands' : 'In selected team'}
          icon={<Package className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockCount + outOfStockCount}
          subtitle={`${outOfStockCount} out of stock, ${lowStockCount} low`}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          accentColor={lowStockCount + outOfStockCount > 0 ? 'amber' : 'green'}
        />
        <StatCard
          title="Total Stock Units"
          value={totalStockUnits.toLocaleString()}
          subtitle="Physical inventory on hand"
          icon={<Boxes className="w-4 h-4 text-purple-600" />}
          accentColor="purple"
        />
        <StatCard
          title="Stock Valuation (Retail)"
          value={formatCurrency(totalRetailValuation)}
          subtitle="Total retail sales potential"
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
          accentColor="green"
        />
      </div>

      {/* Product Catalog Card */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span>Products &amp; Stock Levels</span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Select team brand to view team-specific stock levels and pricing structures
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Team Dropdown Filter */}
            <div className="w-48 sm:w-56">
              <Select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Teams (All Brands)' },
                  ...teams.map((t) => ({
                    value: t.id,
                    label: `${t.name} (${t.code})`,
                  })),
                ]}
              />
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search product or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-48"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {/* Stock Health Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs">
            <span className="text-slate-500 font-medium mr-1">Stock Filter:</span>
            <button
              type="button"
              onClick={() => setStockStatusFilter('ALL')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer ${
                stockStatusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Products ({totalProductsCount})
            </button>
            <button
              type="button"
              onClick={() => setStockStatusFilter('LOW_STOCK')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                stockStatusFilter === 'LOW_STOCK'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock ({lowStockCount})
            </button>
            <button
              type="button"
              onClick={() => setStockStatusFilter('OUT_OF_STOCK')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                stockStatusFilter === 'OUT_OF_STOCK'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-800 bg-rose-50 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Out of Stock ({outOfStockCount})
            </button>
            <button
              type="button"
              onClick={() => setStockStatusFilter('IN_STOCK')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                stockStatusFilter === 'IN_STOCK'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Healthy Stock ({inStockCount})
            </button>
            <button
              type="button"
              onClick={() => setStockStatusFilter('DAMAGED')}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                stockStatusFilter === 'DAMAGED'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Damaged Stock ({damagedProductsCount})
            </button>
          </div>

          {/* Product Listing Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Product Details</th>
                  <th className="py-3 px-3.5">SKU / Code</th>
                  <th className="py-3 px-3.5">Assigned Team</th>
                  <th className="py-3 px-3.5 text-center">Available</th>
                  <th className="py-3 px-3.5 text-center text-amber-600">Allocated</th>
                  <th className="py-3 px-3.5 text-center text-blue-600">Dispatched</th>
                  <th className="py-3 px-3.5 text-center text-emerald-600">Sold</th>
                  <th className="py-3 px-3.5 text-center text-rose-600">Damaged</th>
                  <th className="py-3 px-3.5">Cost Price</th>
                  <th className="py-3 px-3.5">Selling Price</th>
                  <th className="py-3 px-3.5">Margin</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-slate-400 text-xs italic font-sans">
                      No products found matching the selected team and stock filters.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isOutOfStock = p.currentStock === 0;
                    const isLow = p.currentStock > 0 && p.currentStock <= p.minStockThreshold;
                    const teamInfo = teams.find((t) => t.id === p.teamId);
                    const brand = getTeamBranding(p.teamId);
                    const marginPct =
                      p.sellingPrice > 0
                        ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(1)
                        : '0';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Name & Category */}
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {p.category || 'General'}
                          </div>
                        </td>

                        {/* Code */}
                        <td className="py-3 px-3.5 font-mono text-slate-600 font-semibold text-[11px]">
                          {p.code}
                        </td>

                        {/* Team */}
                        <td className="py-3 px-3.5">
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                            style={{
                              backgroundColor: `${brand.brandColor}15`,
                              borderColor: `${brand.brandColor}40`,
                              color: brand.brandColor,
                            }}
                          >
                            <Building2 className="w-3 h-3" />
                            {teamInfo?.name || brand.name}
                          </span>
                        </td>

                        {/* Current Sellable Stock & Damaged Units */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-slate-900 text-sm font-mono">{p.currentStock}</span>
                            {isOutOfStock && (
                              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> Out
                              </span>
                            )}
                          </div>
                        </td>
                        
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className="font-bold text-amber-700 text-sm font-mono">{p.allocatedStock || 0}</span>
                        </td>

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className="font-bold text-blue-700 text-sm font-mono">{p.dispatchedStock || 0}</span>
                        </td>

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className="font-bold text-emerald-700 text-sm font-mono">{p.soldStock || 0}</span>
                        </td>

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-rose-700 text-sm font-mono">{p.damagedStock || 0}</span>
                            {(p.damagedStock || 0) > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenDamageAudit(p)}
                                className="mt-1 text-[9px] font-sans text-rose-600 underline"
                              >
                                Audit
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Cost Price (Showing Both Batch Acquisition & Base Catalog Cost) */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {(() => {
                            const activeBatches = (p.batches || []).filter((b) => b.status === 'ACTIVE');
                            const latestBatch = activeBatches[0];
                            const hasDistinctBatchCost =
                              latestBatch &&
                              latestBatch.unitCostPrice !== undefined &&
                              Number(latestBatch.unitCostPrice) !== Number(p.costPrice);

                            if (hasDistinctBatchCost) {
                              return (
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-amber-900 font-mono text-xs bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                      {formatCurrency(latestBatch.unitCostPrice)}
                                    </span>
                                    <span className="text-[9px] font-semibold text-amber-700">Latest</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 pl-0.5">
                                    Base: {formatCurrency(p.costPrice)}
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <div className="flex flex-col">
                                <span className="font-mono text-slate-800 font-semibold text-xs">
                                  {formatCurrency(p.costPrice)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-sans">
                                  Base Cost
                                </span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Selling Price */}
                        <td className="py-3 px-3.5 font-mono font-bold text-emerald-700 text-xs whitespace-nowrap">
                          {formatCurrency(p.sellingPrice)}
                        </td>

                        {/* Profit Margin */}
                        <td className="py-3 px-3.5 font-mono font-semibold text-blue-700 text-xs whitespace-nowrap">
                          {marginPct}%
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {p.damagedStock && p.damagedStock > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-rose-600" />}
                                onClick={() => handleOpenDamageAudit(p)}
                                className="text-xs px-2 py-1 text-rose-800 hover:text-rose-900 hover:bg-rose-50"
                                title="Inspect Damaged Orders & Returns"
                              >
                                Damage Audit
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Boxes className="w-3.5 h-3.5 text-emerald-600" />}
                              onClick={() => setInspectingBatchesProduct(p)}
                              className="text-xs px-2 py-1 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Inspect Stock Batches & Cost Layers"
                            >
                              Batches
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                              onClick={() => openEditModal(p)}
                              className="text-xs px-2 py-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                              onClick={() => setDeletingProduct(p)}
                              className="text-xs px-2 py-1 text-slate-700 hover:text-rose-600 hover:bg-rose-50"
                              title="Soft-delete (deactivate) product"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Product Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product Details & Pricing' : 'Add New Product Definition'}
        description={
          editingProduct
            ? 'Update product name, category, pricing, and minimum stock threshold.'
            : 'Register a new product name and price for a team brand. Stock is added separately via inventory workflows.'
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmingSave(true);
          }}
          className="space-y-4"
        >
          {/* Team Brand Selector */}
          <div>
            <Select
              label="Assigned Team Brand *"
              value={formTeamId}
              onChange={(e) => setFormTeamId(e.target.value)}
              options={teams.map((t) => ({
                value: t.id,
                label: `${t.name} (${t.code})`,
              }))}
            />
            <p className="text-[11px] text-slate-400 mt-1">Product catalog and sales will be scoped to this team</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Product Name *"
              placeholder="e.g. Fat Burner Pro 60 Capsules"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Product Code / SKU *"
              placeholder="e.g. PROD-101"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Category"
              placeholder="e.g. Supplements, Herbal, Cosmetics"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Input
              label="Min Stock Alert Threshold *"
              type="number"
              min="1"
              value={minStockThreshold}
              onChange={(e) => setMinStockThreshold(e.target.value)}
              helperText="Alerts trigger when stock is at or below this level"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Cost Price (LKR) *"
              type="number"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              helperText="Unit purchase / production cost"
              required
            />
            <Input
              label="Selling Price (LKR) *"
              type="number"
              min="0"
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              helperText="Customer retail price"
              required
            />
          </div>

          {/* Stock Notice Banner */}
          {!editingProduct ? (
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Initial Stock:</strong> New product is created with <strong>0 units</strong> on hand. Stock inventory is added by Supervisors submitting Stock Addition requests or Admin Approvals.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700">
              <span>Current Stock on Hand:</span>
              <strong className="font-bold text-slate-900 font-mono text-sm">{editCurrentStock} units</strong>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Stock Batches Inspection Modal */}
      <Dialog
        isOpen={!!inspectingBatchesProduct}
        onClose={() => setInspectingBatchesProduct(null)}
        title="Stock Batches & Cost Layers"
        description={`Inventory lots and historical acquisition costs for ${inspectingBatchesProduct?.name} (${inspectingBatchesProduct?.code})`}
        maxWidth="3xl"
      >
        {inspectingBatchesProduct && (() => {
          const activeBatches = (inspectingBatchesProduct.batches || []).filter((b) => b.status === 'ACTIVE');
          const fifoValuation = activeBatches.length > 0
            ? activeBatches.reduce((sum, b) => sum + Number(b.remainingQuantity) * Number(b.unitCostPrice), 0)
            : Number(inspectingBatchesProduct.currentStock) * Number(inspectingBatchesProduct.costPrice);

          return (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Total Stock</span>
                  <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                    {inspectingBatchesProduct.currentStock} units
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Catalog Base Cost</span>
                  <div className="text-sm font-bold text-slate-700 font-mono mt-0.5">
                    {formatCurrency(inspectingBatchesProduct.costPrice)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Active Lots</span>
                  <div className="text-sm font-bold text-blue-700 font-mono mt-0.5">
                    {activeBatches.length} batches
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">FIFO Valuation</span>
                  <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                    {formatCurrency(fifoValuation)}
                  </div>
                </div>
              </div>

              {/* Desktop Batches Table (sm: and up) */}
              <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3 w-[26%]">Batch / Lot #</th>
                      <th className="py-2.5 px-3 w-[20%] text-center">Remaining / Initial</th>
                      <th className="py-2.5 px-3 w-[24%] text-center">Acquisition Cost</th>
                      <th className="py-2.5 px-3 w-[20%] text-center">Selling Price</th>
                      <th className="py-2.5 px-3 w-[10%] text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {!inspectingBatchesProduct.batches || inspectingBatchesProduct.batches.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 font-sans italic">
                          No individual batches registered yet. Base reference cost: {formatCurrency(inspectingBatchesProduct.costPrice)}.
                        </td>
                      </tr>
                    ) : (
                      inspectingBatchesProduct.batches.map((batch) => (
                        <tr key={batch.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 font-mono">{batch.batchNumber}</div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              {batch.receivedDate ? new Date(batch.receivedDate).toLocaleDateString() : '—'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-bold text-blue-700">{batch.remainingQuantity}</span>
                            <span className="text-slate-400 text-[11px]"> / {batch.initialQuantity}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-900 bg-amber-50/40">
                            {formatCurrency(batch.unitCostPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-center text-emerald-700">
                            {batch.batchSellingPrice ? formatCurrency(batch.batchSellingPrice) : formatCurrency(inspectingBatchesProduct.sellingPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                batch.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {batch.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Batches Cards View (< sm) */}
              <div className="block sm:hidden space-y-2.5">
                {!inspectingBatchesProduct.batches || inspectingBatchesProduct.batches.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
                    No individual batches registered yet. Base reference cost: {formatCurrency(inspectingBatchesProduct.costPrice)}.
                  </div>
                ) : (
                  inspectingBatchesProduct.batches.map((batch) => (
                    <div key={batch.id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold font-mono text-slate-900">{batch.batchNumber}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {batch.receivedDate ? new Date(batch.receivedDate).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            batch.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {batch.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 font-mono text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block">Remaining</span>
                          <strong className="text-blue-700">{batch.remainingQuantity}</strong> / {batch.initialQuantity}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block">Cost (LKR)</span>
                          <strong className="text-amber-900">{formatCurrency(batch.unitCostPrice)}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block">Selling (LKR)</span>
                          <strong className="text-emerald-700">
                            {batch.batchSellingPrice ? formatCurrency(batch.batchSellingPrice) : formatCurrency(inspectingBatchesProduct.sellingPrice)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setInspectingBatchesProduct(null)}>
                  Close
                </Button>
              </div>
            </div>
          );
        })()}
      </Dialog>

      {/* Damaged Stock Audit & Order Origin Inspection Modal */}
      <Dialog
        isOpen={!!inspectingDamageProduct}
        onClose={() => setInspectingDamageProduct(null)}
        title={`Damaged Stock Audit — ${inspectingDamageProduct?.name || 'Product'}`}
        description={`Root cause breakdown of where, when, and which orders returned damaged units for ${inspectingDamageProduct?.code || ''}`}
        maxWidth="3xl"
      >
        {inspectingDamageProduct && (
          <div className="space-y-4">
            {/* Top Summary Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs">
              <div>
                <span className="text-rose-800 text-[11px] font-semibold">Quarantined Damaged</span>
                <div className="text-base font-black text-rose-950 font-mono mt-0.5">
                  {inspectingDamageProduct.damagedStock || 0} units
                </div>
              </div>
              <div>
                <span className="text-rose-800 text-[11px] font-semibold">Quarantined Cost</span>
                <div className="text-sm font-bold text-amber-900 font-mono mt-0.5">
                  {formatCurrency((inspectingDamageProduct.damagedStock || 0) * (inspectingDamageProduct.costPrice || 0))}
                </div>
              </div>
              <div>
                <span className="text-rose-800 text-[11px] font-semibold">Assigned Team</span>
                <div className="text-xs font-bold text-slate-800 mt-0.5">
                  {teams.find((t) => t.id === inspectingDamageProduct.teamId)?.name || 'General Team'}
                </div>
              </div>
              <div>
                <span className="text-rose-800 text-[11px] font-semibold">Sellable Stock</span>
                <div className="text-sm font-bold text-emerald-800 font-mono mt-0.5">
                  {inspectingDamageProduct.currentStock} units
                </div>
              </div>
            </div>

            {/* Damage Return Orders Listing */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Damage Incident Origins & Order Tracking</span>
              </h4>

              {loadingDamageAudit ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading audit history...</div>
              ) : damageAuditRecords.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-200">
                  No individual order returns recorded yet. Damaged stock was directly adjusted by supervisor/admin.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Order / Source</th>
                        <th className="py-2.5 px-3">Customer & Location</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-center">Damaged Qty</th>
                        <th className="py-2.5 px-3">Damage Reason / Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {damageAuditRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50">
                          {/* Order # */}
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {record.orderNumber ? (
                              <div className="flex flex-col">
                                <span className="text-blue-700 font-bold">{record.orderNumber}</span>
                                {record.orderStatus && (
                                  <span className="text-[10px] text-rose-700 font-sans mt-0.5">
                                    Status: {record.orderStatus}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Stock Adjustment</span>
                            )}
                          </td>

                          {/* Customer */}
                          <td className="py-2.5 px-3">
                            {record.customerName ? (
                              <div>
                                <div className="font-semibold text-slate-900">{record.customerName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{record.customerCity}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                            {new Date(record.date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>

                          {/* Damaged Qty */}
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-rose-900 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-mono text-xs">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              {record.quantity} units
                            </span>
                          </td>

                          {/* Reason */}
                          <td className="py-2.5 px-3 text-slate-700 text-xs max-w-xs">
                            <p className="line-clamp-2" title={record.reason}>
                              {record.reason}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setInspectingDamageProduct(null)}>
                Close Audit
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmingSave}
        onClose={() => setConfirmingSave(false)}
        onConfirm={() => {
          setConfirmingSave(false);
          handleSubmit();
        }}
        title={editingProduct ? 'Save Product Details' : 'Create New Product'}
        message={
          editingProduct
            ? `Are you sure you want to update "${name}"? Pricing and threshold changes will apply across the system.`
            : `Are you sure you want to create product "${name}" for team ${
                teams.find((t) => t.id === formTeamId)?.name || formTeamId
              }?`
        }
        confirmText={editingProduct ? 'Confirm & Save' : 'Confirm & Create'}
      />

      {/* GitHub-style Security Verification Delete Dialog */}
      {deletingProduct && (
        <GitHubVerificationDeleteDialog
          isOpen={!!deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onConfirm={handleDeleteProduct}
          title={`Delete product "${deletingProduct.name}"?`}
          itemName={deletingProduct.name}
          expectedText={deletingProduct.name}
          warningMessage={`This will soft-delete (deactivate) "${deletingProduct.name}" (${deletingProduct.code}). The product will be disabled in the database and hidden from active inventory, allocations, and order forms. All historical transaction records, lots, and past invoice data remain permanently preserved.`}
          confirmButtonText="I understand the consequences, delete this product"
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};
