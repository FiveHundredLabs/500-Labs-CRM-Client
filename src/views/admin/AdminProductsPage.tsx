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

  // GitHub-style Soft Delete Modal State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [formTeamId, setFormTeamId] = useState('');
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
      if (allTeams.length > 0 && !formTeamId) {
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
    setFormTeamId(teams[0]?.id || '');
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
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
            <table className="w-full text-left text-xs table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5 w-[28%]">Product & Brand</th>
                  <th className="py-2.5 px-1.5 text-center text-slate-700 w-[8%]">Available</th>
                  <th className="py-2.5 px-1.5 text-center text-amber-600 w-[8%]">Allocated</th>
                  <th className="py-2.5 px-1.5 text-center text-blue-600 w-[8%]">Dispatched</th>
                  <th className="py-2.5 px-1.5 text-center text-emerald-600 w-[8%]">Sold</th>
                  <th className="py-2.5 px-1.5 text-center text-rose-600 w-[8%]">Damaged</th>
                  <th className="py-2.5 px-2.5 w-[19%]">Pricing & Margin</th>
                  <th className="py-2.5 px-3 text-right w-[13%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 text-xs italic font-sans">
                      No products found matching the selected team and stock filters.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isOutOfStock = p.currentStock === 0;
                    const isLow = p.currentStock > 0 && p.currentStock <= p.minStockThreshold;
                    const teamInfo = teams.find((t) => t.id === p.teamId);
                    const brand = getTeamBranding(p.team || teamInfo);
                    const marginPct =
                      p.sellingPrice > 0
                        ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(1)
                        : '0';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Product, SKU & Brand */}
                        <td className="py-2.5 px-3.5">
                          <div className="truncate">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs truncate max-w-[140px] sm:max-w-none" title={p.name}>
                                {p.name}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 font-medium shrink-0">
                                {p.code}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] flex-wrap">
                              <span
                                className="inline-flex items-center gap-1 font-semibold px-1.5 py-0.2 rounded border text-[10px] shrink-0"
                                style={{
                                  backgroundColor: `${brand.brandColor}12`,
                                  borderColor: `${brand.brandColor}35`,
                                  color: brand.brandColor,
                                }}
                              >
                                <Building2 className="w-2.5 h-2.5" />
                                {teamInfo?.name || brand.name}
                              </span>
                              {p.category && (
                                <span className="text-slate-400 font-medium truncate">{p.category}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Available */}
                        <td className="py-2.5 px-1.5 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`font-black text-xs font-mono ${p.currentStock === 0 ? 'text-slate-400' : 'text-slate-900'}`}>
                              {p.currentStock}
                            </span>
                            {isOutOfStock ? (
                              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 rounded">Out</span>
                            ) : isLow ? (
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded">Low</span>
                            ) : null}
                          </div>
                        </td>
                        
                        {/* Allocated */}
                        <td className="py-2.5 px-1.5 text-center">
                          <span className={`font-bold text-xs font-mono ${(p.allocatedStock || 0) > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                            {p.allocatedStock || 0}
                          </span>
                        </td>

                        {/* Dispatched */}
                        <td className="py-2.5 px-1.5 text-center">
                          <span className={`font-bold text-xs font-mono ${(p.dispatchedStock || 0) > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                            {p.dispatchedStock || 0}
                          </span>
                        </td>

                        {/* Sold */}
                        <td className="py-2.5 px-1.5 text-center">
                          <span className={`font-bold text-xs font-mono ${(p.soldStock || 0) > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {p.soldStock || 0}
                          </span>
                        </td>

                        {/* Damaged */}
                        <td className="py-2.5 px-1.5 text-center">
                          <span className={`font-bold text-xs font-mono ${(p.damagedStock || 0) > 0 ? 'text-rose-600 font-black' : 'text-slate-400'}`}>
                            {p.damagedStock || 0}
                          </span>
                        </td>

                        {/* Pricing & Margin */}
                        <td className="py-2.5 px-2.5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-emerald-700 text-xs">
                                {formatCurrency(p.sellingPrice)}
                              </span>
                              <span className="font-mono text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">
                                {marginPct}%
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Cost: {formatCurrency(p.costPrice)}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Boxes className="w-3.5 h-3.5 text-emerald-600" />}
                              onClick={() => setInspectingBatchesProduct(p)}
                              className="text-xs px-2 py-1 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 h-7"
                              title="Inspect Stock Batches & Cost Layers"
                            >
                              Batches
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Edit2 className="w-3 h-3" />}
                              onClick={() => openEditModal(p)}
                              className="text-xs px-2 py-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50 h-7"
                              title="Edit Product"
                            >
                              Edit
                            </Button>
                            <button
                              type="button"
                              onClick={() => setDeletingProduct(p)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Soft-delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
