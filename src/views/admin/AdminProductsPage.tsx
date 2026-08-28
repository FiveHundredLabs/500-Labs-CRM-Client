import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { Product, Team } from '../../models/domain';
import { productRepository, teamRepository } from '../../repositories';
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
} from 'lucide-react';

export const AdminProductsPage: React.FC = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTeamId, setSelectedTeamId] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW_STOCK' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  // Filtered Products Calculation
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Team Filter
      if (selectedTeamId !== 'ALL' && p.teamId !== selectedTeamId) return false;

      // 2. Stock Health Filter
      if (stockStatusFilter === 'LOW_STOCK') {
        if (p.currentStock > p.minStockThreshold || p.currentStock === 0) return false;
      } else if (stockStatusFilter === 'OUT_OF_STOCK') {
        if (p.currentStock > 0) return false;
      } else if (stockStatusFilter === 'IN_STOCK') {
        if (p.currentStock <= p.minStockThreshold) return false;
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

  const totalStockUnits = teamScopedProducts.reduce((sum, p) => sum + (Number(p.currentStock) || 0), 0);
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
          </div>

          {/* Product Listing Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Product Details</th>
                  <th className="py-3 px-3.5">SKU / Code</th>
                  <th className="py-3 px-3.5">Assigned Team</th>
                  <th className="py-3 px-3.5">Current Stock</th>
                  <th className="py-3 px-3.5">Alert Level</th>
                  <th className="py-3 px-3.5">Cost Price</th>
                  <th className="py-3 px-3.5">Selling Price</th>
                  <th className="py-3 px-3.5">Margin</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400 text-xs italic font-sans">
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

                        {/* Current Stock */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm font-mono">{p.currentStock}</span>
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" /> Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                In Stock
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Alert Threshold */}
                        <td className="py-3 px-3.5 font-mono text-slate-500 text-xs">
                          {p.minStockThreshold} units
                        </td>

                        {/* Cost Price */}
                        <td className="py-3 px-3.5 font-mono text-slate-700 text-xs">
                          {formatCurrency(p.costPrice)}
                        </td>

                        {/* Selling Price */}
                        <td className="py-3 px-3.5 font-mono font-bold text-emerald-700 text-xs">
                          {formatCurrency(p.sellingPrice)}
                        </td>

                        {/* Profit Margin */}
                        <td className="py-3 px-3.5 font-mono font-semibold text-blue-700 text-xs">
                          {marginPct}%
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            onClick={() => openEditModal(p)}
                            className="text-xs px-2.5 py-1 text-slate-700 hover:text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </Button>
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
    </div>
  );
};
