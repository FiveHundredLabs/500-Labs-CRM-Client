import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { Product } from '../../models/domain';
import { productRepository } from '../../repositories';
import { PREDEFINED_TEAMS } from '../../config/branding';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { LoadingState } from '../../components/shared/LoadingState';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import toast from 'react-hot-toast';
import { Package, Plus, Edit2, AlertTriangle, Layers, DollarSign } from 'lucide-react';

export const AdminProductsPage: React.FC = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState<string>('ALL');

  // Add/Edit Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [teamId, setTeamId] = useState('team_001');
  const [category, setCategory] = useState('Supplements');
  const [currentStock, setCurrentStock] = useState(100);
  const [minStockThreshold, setMinStockThreshold] = useState(10);
  const [costPrice, setCostPrice] = useState(3000);
  const [sellingPrice, setSellingPrice] = useState(6000);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingSave, setConfirmingSave] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productRepository.getAll();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCode(`PROD-${Math.floor(100 + Math.random() * 900)}`);
    setTeamId('team_001');
    setCategory('Supplements');
    setCurrentStock(100);
    setMinStockThreshold(10);
    setCostPrice(3000);
    setSellingPrice(6000);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCode(p.code);
    setTeamId(p.teamId);
    setCategory(p.category || 'Supplements');
    setCurrentStock(p.currentStock);
    setMinStockThreshold(p.minStockThreshold);
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setIsModalOpen(true);
  };

  // Admin Create/Update Product Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !user) return;

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await productRepository.update(editingProduct.id, {
          name,
          code,
          teamId,
          category,
          currentStock,
          minStockThreshold,
          costPrice,
          sellingPrice,
        });
        toast.success(`Updated product ${name}`);
      } else {
        await productRepository.create({
          name,
          code,
          teamId,
          category,
          currentStock,
          minStockThreshold,
          costPrice,
          sellingPrice,
          isActive: true,
        });
        toast.success(`Created new product ${name} assigned to ${PREDEFINED_TEAMS[teamId]?.name || teamId}`);
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => teamFilter === 'ALL' || p.teamId === teamFilter);
  const lowStockCount = products.filter((p) => p.currentStock <= p.minStockThreshold).length;

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Inventory Management"
        description="Create completely new products, configure stock parameters, and manage prices across all teams"
        actions={
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={openAddModal}>
            Add New Product
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Products"
          value={products.length}
          subtitle="System-wide product count"
          icon={<Package className="w-4 h-4 text-blue-600" />}
          accentColor="blue"
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockCount}
          subtitle="Products at or below min threshold"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          accentColor="amber"
        />
        <StatCard
          title="Active Teams"
          value={Object.keys(PREDEFINED_TEAMS).length}
          subtitle="Brand Alpha & Brand Beta"
          icon={<Layers className="w-4 h-4 text-purple-600" />}
          accentColor="purple"
        />
      </div>

      {/* Product Catalog */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Product Catalog</h3>
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Teams' },
                { value: 'team_001', label: 'Brand Alpha (Team 1)' },
                { value: 'team_002', label: 'Brand Beta (Team 2)' },
              ]}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3">Assigned Team</th>
                <th className="py-3 px-3">Current Stock</th>
                <th className="py-3 px-3">Min Threshold</th>
                <th className="py-3 px-3">Cost Price</th>
                <th className="py-3 px-3">Selling Price</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No products found for the selected team filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minStockThreshold;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                        <span>{p.name}</span>
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{p.code}</td>
                      <td className="py-3 px-3">
                        <span className="text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                          {PREDEFINED_TEAMS[p.teamId]?.name || p.teamId}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 text-sm">{p.currentStock}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{p.minStockThreshold}</td>
                      <td className="py-3 px-3 font-mono text-slate-800">LKR {p.costPrice.toLocaleString()}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600">LKR {p.sellingPrice.toLocaleString()}</td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => openEditModal(p)}
                          className="text-xs px-2 py-1"
                        >
                          Edit Product
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product Parameters' : 'Create New Product'}
        description="Only Administrators are authorized to create new products or reassign teams."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmingSave(true);
          }}
          className="space-y-4"
        >
          <Input label="Product Name *" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Product Code *" value={code} onChange={(e) => setCode(e.target.value)} required />

          <Select
            label="Assigned Team *"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            options={[
              { value: 'team_001', label: 'Brand Alpha (Team 1)' },
              { value: 'team_002', label: 'Brand Beta (Team 2)' },
            ]}
          />

          <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Initial / Current Stock"
              type="number"
              min="0"
              value={currentStock}
              onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
              required
            />
            <Input
              label="Min Stock Threshold"
              type="number"
              min="0"
              value={minStockThreshold}
              onChange={(e) => setMinStockThreshold(parseInt(e.target.value) || 0)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cost Price (LKR)"
              type="number"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
              required
            />
            <Input
              label="Selling Price (LKR)"
              type="number"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
              required
            />
          </div>

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

      {/* Confirmation Dialog for Product Edits / Creation */}
      <ConfirmDialog
        isOpen={confirmingSave}
        onClose={() => setConfirmingSave(false)}
        onConfirm={() => {
          setConfirmingSave(false);
          const fakeEvent = { preventDefault: () => {} } as any;
          handleSubmit(fakeEvent);
        }}
        title={editingProduct ? 'Save Product Parameters' : 'Create New Product'}
        message={
          editingProduct
            ? `Are you sure you want to update product parameters for "${name}"? Stock and pricing changes will take effect immediately across the CRM.`
            : `Are you sure you want to create a new product "${name}" assigned to ${PREDEFINED_TEAMS[teamId]?.name || teamId}?`
        }
        confirmText={editingProduct ? 'Confirm & Save' : 'Confirm & Create'}
      />
    </div>
  );
};
