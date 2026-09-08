import React, { useState, useEffect } from 'react';
import { expenseRepository } from '../../repositories';
import { ExpenseCategory } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { SearchInput } from '../../components/shared/SearchInput';
import toast from 'react-hot-toast';
import { 
  Tag, 
  Plus, 
  Edit3, 
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const FinanceCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await expenseRepository.getCategories();
      setCategories(data || []);
    } catch {
      toast.error('Failed to load expense categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setModalMode('CREATE');
    setActiveCatId(null);
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEdit = (cat: ExpenseCategory) => {
    setModalMode('EDIT');
    setActiveCatId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a category title.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === 'CREATE') {
        await expenseRepository.createCategory({
          name: name.trim(),
          description: description.trim() || undefined,
          isCustom: true,
        });
        toast.success('Custom expense category created!');
      } else if (activeCatId) {
        await expenseRepository.updateCategory(activeCatId, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        toast.success('Category updated successfully!');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await expenseRepository.deleteCategory(deleteTarget.id);
      toast.success(`Category "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete category.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Categories & Accounting Classifications"
        description="Configure standardized OpEx classification tags and create custom operational ledgers."
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreate}
          >
            Create Category
          </Button>
        }
      />

      {/* Search Bar */}
      <div className="max-w-md">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Filter categories by name or description..."
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No categories found"
          description="No categories match your search keyword. Click Create Category to add one."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cat) => (
            <Card key={cat.id} className="border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all">
              <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#E8F7FE] border border-[#B9E7FC] flex items-center justify-center text-[#0188C7]">
                      <Tag className="w-4.5 h-4.5" />
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        cat.isCustom
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {cat.isCustom ? 'Custom OpEx' : 'Standard'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{cat.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {cat.description || 'Predefined accounting expenditure classification ledger.'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[11px] truncate max-w-[120px]">{cat.id}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEdit(cat)}
                      className="inline-flex items-center gap-1 text-[#0188C7] hover:text-[#016DA0] font-semibold cursor-pointer text-xs transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteTarget(cat)}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold cursor-pointer text-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'CREATE' ? 'Register New Expense Category' : 'Edit Expense Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Category Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Marketing & Digital Ads, Office Utilities"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Policy Scope
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Guidelines on what vouchers qualify under this category..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/20 focus:border-[#01A8F3] shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : modalMode === 'CREATE' ? 'Create Category' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Delete Expense Category"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900">Are you sure you want to delete this category?</p>
              <p className="mt-1">
                Category <strong>"{deleteTarget?.name}"</strong> will be permanently removed. Categories linked to existing recorded expenses cannot be deleted.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white border-none"
            >
              {isDeleting ? 'Deleting...' : 'Delete Category'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
