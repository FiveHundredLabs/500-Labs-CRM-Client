import React, { useState, useEffect, useCallback } from 'react';
import { expenseRepository, pettyCashRepository } from '../../repositories';
import { Expense, ExpenseCategory, PettyCashWallet } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { SearchInput } from '../../components/shared/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingState } from '../../components/shared/LoadingState';
import { ExpenseService } from '../../services/expenseService';
import { 
  Plus, 
  DollarSign,
  Calendar, 
  Filter, 
  X, 
  Edit3, 
  Trash2, 
  Clock, 
  FileSpreadsheet, 
  ShieldAlert,
  CreditCard,
  Building2,
  Wallet,
  Tag
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { format, differenceInHours } from 'date-fns';
import { formatCurrency } from '../../utils/currency';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export const FinanceExpensesPage: React.FC = () => {
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [wallet, setWallet] = useState<PettyCashWallet | null>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');

  // Create Expense Dialog
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'PETTY_CASH'>('CASH');
  const [remarks, setRemarks] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAllocationId, setSelectedAllocationId] = useState('');
  const [createError, setCreateError] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Date Range Filter States
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Direct Edit Dialog
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editExpenseDate, setEditExpenseDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'PETTY_CASH'>('CASH');
  const [editNotes, setEditNotes] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Change Request Dialog (> 24 hours)
  const [changeRequestExpense, setChangeRequestExpense] = useState<Expense | null>(null);
  const [changeRequestAction, setChangeRequestAction] = useState<'EDIT' | 'DELETE'>('EDIT');
  const [changeRequestReason, setChangeRequestReason] = useState('');
  const [isChangeRequestModalOpen, setIsChangeRequestModalOpen] = useState(false);
  const [isSubmittingCR, setIsSubmittingCR] = useState(false);

  // Direct Delete Confirmation Dialog (<= 24 hours)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expData, catData, walletData, allocationData] = await Promise.all([
        expenseRepository.getAll(),
        expenseRepository.getCategories().catch(() => []),
        pettyCashRepository.getWallet().catch(() => null),
        pettyCashRepository.getAllocations().catch(() => []),
      ]);
      setExpenses(
        (expData || []).sort(
          (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
        )
      );
      setCategories(catData || []);
      setSelectedCategoryName((current) => current || catData?.[0]?.name || '');
      setWallet(walletData);
      setAllocations(allocationData || []);
    } catch {
      toast.error('Failed to load expense records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (preset === 'LAST_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - day);
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      setStartDate(format(firstDay, 'yyyy-MM-dd'));
      setEndDate(format(lastDay, 'yyyy-MM-dd'));
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setPaymentMethodFilter('ALL');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
  };

  // 24 Hour Logic Checker
  const isWithin24Hours = (createdAt: string) => {
    const diff = differenceInHours(new Date(), new Date(createdAt));
    return diff < 24;
  };

  const resetCreateForm = useCallback(() => {
    setSelectedCategoryName(categories[0]?.name || '');
    setCustomCategory('');
    setAmount('');
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentMethod('CASH');
    setRemarks('');
    setNotes('');
    setSelectedAllocationId('');
    setCreateError('');
  }, [categories]);

  const handleOpenCreate = useCallback(() => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  }, [resetCreateForm]);

  useEffect(() => {
    if (!loading && searchParams.get('recordExpense') === '1') {
      handleOpenCreate();
      setSearchParams({}, { replace: true });
    }
  }, [loading, searchParams, setSearchParams, handleOpenCreate]);

  const handleCloseCreate = () => {
    if (isSubmittingCreate) return;
    setIsCreateModalOpen(false);
  };

  const parsedCreateAmount = parseFloat(amount) || 0;
  const isCreatePettyCash = selectedCategoryName === 'Petty Cash' || paymentMethod === 'PETTY_CASH';
  const isCreateOverPettyCashBalance =
    isCreatePettyCash && wallet && parsedCreateAmount > wallet.remainingBalance;

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (isNaN(parsedCreateAmount) || parsedCreateAmount <= 0) {
      setCreateError('Please enter a valid positive amount.');
      return;
    }

    if (selectedCategoryName === 'Other' && !customCategory.trim()) {
      setCreateError('Please specify the custom category name.');
      return;
    }

    const selectedCatObj = categories.find((c) => c.name === selectedCategoryName);
    if (selectedCategoryName !== 'Other' && !selectedCatObj) {
      setCreateError('Please select a valid database expense category.');
      return;
    }

    if (!remarks.trim()) {
      setCreateError('Please enter voucher remarks or purpose.');
      return;
    }

    if (isCreateOverPettyCashBalance && wallet) {
      setCreateError(
        `Expense amount (${formatCurrency(parsedCreateAmount)}) exceeds available Petty Cash balance (${formatCurrency(wallet.remainingBalance)}).`
      );
      return;
    }

    if (!user) {
      setCreateError('You must be signed in to record an expense.');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      if (isCreatePettyCash) {
        await pettyCashRepository.recordExpense({
          reason: remarks.trim(),
          category: selectedCategoryName === 'Other' ? customCategory.trim() : selectedCategoryName,
          amount: parsedCreateAmount,
          date: expenseDate,
          description: notes.trim() || remarks.trim(),
          allocationId: selectedAllocationId || undefined,
        });
      }

      await ExpenseService.createExpense(
        {
          categoryId: selectedCatObj?.id || '',
          categoryName: selectedCategoryName,
          customCategoryName: customCategory,
          amount: parsedCreateAmount,
          expenseDate,
          remarks: remarks.trim(),
          paymentMethod,
          notes: notes.trim() || undefined,
          pettyCashRef: selectedAllocationId || undefined,
        },
        user
      );

      toast.success(`Expense voucher of ${formatCurrency(parsedCreateAmount)} registered successfully!`);
      resetCreateForm();
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to record expense.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open Edit Handler
  const handleOpenEdit = (exp: Expense) => {
    const hoursOld = differenceInHours(new Date(), new Date(exp.createdAt));
    if (hoursOld >= 24 && role !== 'ADMIN') {
      // Must use Change Request flow
      setChangeRequestExpense(exp);
      setChangeRequestAction('EDIT');
      setEditAmount(String(exp.amount));
      setEditCategoryId(exp.categoryId);
      setEditCategoryName(exp.categoryName);
      setEditExpenseDate(exp.expenseDate ? exp.expenseDate.split('T')[0] : format(new Date(), 'yyyy-MM-dd'));
      setEditRemarks(exp.remarks || '');
      setEditPaymentMethod((exp.paymentMethod as any) || 'CASH');
      setEditNotes(exp.notes || '');
      setChangeRequestReason('');
      setIsChangeRequestModalOpen(true);
    } else {
      // Direct Edit allowed
      setEditingExpense(exp);
      setEditAmount(String(exp.amount));
      setEditCategoryId(exp.categoryId);
      setEditCategoryName(exp.categoryName);
      setEditExpenseDate(exp.expenseDate ? exp.expenseDate.split('T')[0] : format(new Date(), 'yyyy-MM-dd'));
      setEditRemarks(exp.remarks || '');
      setEditPaymentMethod((exp.paymentMethod as any) || 'CASH');
      setEditNotes(exp.notes || '');
      setIsEditModalOpen(true);
    }
  };

  // Open Delete Handler
  const handleOpenDelete = (exp: Expense) => {
    const hoursOld = differenceInHours(new Date(), new Date(exp.createdAt));
    if (hoursOld >= 24 && role !== 'ADMIN') {
      setChangeRequestExpense(exp);
      setChangeRequestAction('DELETE');
      setChangeRequestReason('');
      setIsChangeRequestModalOpen(true);
    } else {
      setDeletingExpense(exp);
      setIsDeleteConfirmOpen(true);
    }
  };

  // Direct Save Edit
  const handleSaveDirectEdit = async () => {
    if (!editingExpense) return;
    const parsed = parseFloat(editAmount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setIsSavingEdit(true);
    try {
      await expenseRepository.update(editingExpense.id, {
        categoryId: editCategoryId,
        categoryName: editCategoryName,
        amount: parsed,
        expenseDate: editExpenseDate,
        remarks: editRemarks,
        paymentMethod: editPaymentMethod,
        notes: editNotes,
      });

      toast.success('Expense voucher updated successfully!');
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update expense.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Direct Delete Execution
  const handleConfirmDirectDelete = async () => {
    if (!deletingExpense) return;
    setIsDeleting(true);
    try {
      await expenseRepository.delete(deletingExpense.id);
      toast.success('Expense voucher deleted.');
      setIsDeleteConfirmOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete expense.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Submit Change Request for > 24h
  const handleSubmitChangeRequest = async () => {
    if (!changeRequestExpense) return;
    if (!changeRequestReason.trim()) {
      toast.error('Please state a reason for this change request.');
      return;
    }

    setIsSubmittingCR(true);
    try {
      const payload: any = {
        action: changeRequestAction,
        reason: changeRequestReason.trim(),
      };

      if (changeRequestAction === 'EDIT') {
        const parsed = parseFloat(editAmount);
        payload.categoryId = editCategoryId;
        payload.categoryName = editCategoryName;
        payload.amount = parsed;
        payload.expenseDate = editExpenseDate;
        payload.remarks = editRemarks;
        payload.paymentMethod = editPaymentMethod;
        payload.notes = editNotes;
      }

      await expenseRepository.requestChange(changeRequestExpense.id, payload);
      toast.success('Change request submitted to Admin for authorization!');
      setIsChangeRequestModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit change request.');
    } finally {
      setIsSubmittingCR(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    const exportData = filtered.map((e) => ({
      'Category': e.categoryName,
      'Amount (LKR)': e.amount,
      'Expense Date': e.expenseDate ? format(new Date(e.expenseDate), 'yyyy-MM-dd') : '',
      'Payment Method': e.paymentMethod || 'CASH',
      'Remarks': e.remarks,
      'Notes': e.notes || '',
      'Recorded By': e.createdByName,
      'Created Timestamp': format(new Date(e.createdAt), 'yyyy-MM-dd HH:mm'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    XLSX.writeFile(wb, `Expenses_Ledger_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  // Filter matching expenses
  const filtered = expenses.filter((e) => {
    const matchesSearch =
      !search ||
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      e.remarks.toLowerCase().includes(search.toLowerCase()) ||
      e.createdByName.toLowerCase().includes(search.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(search.toLowerCase()));

    const matchesCat = categoryFilter === 'ALL' || e.categoryName === categoryFilter;
    const matchesPM = paymentMethodFilter === 'ALL' || (e.paymentMethod || 'CASH') === paymentMethodFilter;

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && e.expenseDate >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && e.expenseDate <= endDate;
    }

    return matchesSearch && matchesCat && matchesPM && matchesDate;
  });

  const totalFilteredAmount = filtered.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (loading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Expenditure Ledger"
        description="Full audit record of verified vouchers, payment methods, and 24-hour authorization controls."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-[#547E1B]" />}
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreate}
            >
              Record Expense
            </Button>
          </div>
        }
      />

      {/* Filter Control Bar */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-2xl space-y-3.5 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search Vouchers</label>
            <SearchInput value={search} onChange={setSearch} placeholder="Search remarks, notes, category..." />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Categories' },
                ...categories.map((c) => ({ value: c.name, label: c.name })),
              ]}
            />
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
            <Select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Payment Types' },
                { value: 'CASH', label: 'Cash' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'PETTY_CASH', label: 'Petty Cash' },
              ]}
            />
          </div>

          {/* Date Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date Window</label>
            <Select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Dates' },
                { value: 'THIS_MONTH', label: 'This Month' },
                { value: 'LAST_MONTH', label: 'Last Month' },
                { value: 'THIS_WEEK', label: 'This Week' },
                { value: 'CUSTOM', label: 'Custom Dates' },
              ]}
            />
          </div>
        </div>

        {/* Custom Date Range Pickers */}
        {(datePreset === 'CUSTOM' || startDate || endDate) && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#01A8F3]" />
              <span>Custom Date Filter:</span>
            </span>

            <div className="flex items-center gap-2">
              <label className="text-slate-500 font-medium">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset('CUSTOM');
                  setStartDate(e.target.value);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#01A8F3]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-500 font-medium">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset('CUSTOM');
                  setEndDate(e.target.value);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#01A8F3]"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<X className="w-3.5 h-3.5 text-slate-400" />}
              onClick={handleClearFilters}
              className="text-xs ml-auto"
            >
              Reset
            </Button>
          </div>
        )}

        {/* Filter Summary Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>Showing <strong className="text-slate-900">{filtered.length}</strong> of {expenses.length} vouchers</span>
          <span>Cumulative Filtered Expense: <strong className="text-[#547E1B] font-mono text-sm">{formatCurrency(totalFilteredAmount)}</strong></span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title="No expenses recorded" description="No expense records match your current filter criteria." />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Remarks & Notes</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4">Expense Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Governance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filtered.map((exp) => {
                  const recent = isWithin24Hours(exp.createdAt);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold text-[#0188C7] bg-[#E8F7FE] border border-[#B9E7FC] px-2.5 py-0.5 rounded-full">
                          {exp.categoryName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          {exp.paymentMethod === 'BANK_TRANSFER' ? (
                            <>
                              <Building2 className="w-3.5 h-3.5 text-[#0188C7]" />
                              <span>Bank Transfer</span>
                            </>
                          ) : exp.paymentMethod === 'PETTY_CASH' ? (
                            <>
                              <Wallet className="w-3.5 h-3.5 text-amber-600" />
                              <span>Petty Cash</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                              <span>Cash</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-xs text-slate-800 truncate">{exp.remarks}</div>
                        {exp.notes && <div className="text-[11px] text-slate-400 truncate italic">{exp.notes}</div>}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">{exp.createdByName}</td>

                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                        {exp.expenseDate ? format(new Date(exp.expenseDate), 'MMM dd, yyyy') : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(exp.amount)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {recent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#547E1B] bg-[#F2F9E9] border border-[#D4ECC6] px-2 py-0.5 rounded-full" title="Created within 24 hours — can be edited or deleted directly">
                            <Clock className="w-3 h-3" />
                            <span>&lt; 24h Window</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full" title="Older than 24 hours — requires Admin approval to edit or delete">
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            <span>Protected</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(exp)}
                            className="p-1.5 text-slate-400 hover:text-[#01A8F3] hover:bg-[#E8F7FE] rounded-lg transition-colors cursor-pointer"
                            title={recent ? 'Edit Voucher' : 'Request Edit Approval (> 24h)'}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(exp)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title={recent ? 'Delete Voucher' : 'Request Delete Approval (> 24h)'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Expense Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreate}
        title="Record Expense Voucher"
        description="Capture an operational expense without leaving the ledger."
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#01A8F3]" />
                <span>Expense Category <span className="text-red-500">*</span></span>
              </label>
              <Select
                value={selectedCategoryName}
                onChange={(e) => {
                  setSelectedCategoryName(e.target.value);
                  setCreateError('');
                }}
                options={[
                  ...categories.map((c) => ({ value: c.name, label: c.name })),
                  { value: 'Other', label: '+ Other (Specify Custom Category)' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#547E1B]" />
                <span>Voucher Amount (LKR) <span className="text-red-500">*</span></span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setCreateError('');
                }}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {selectedCategoryName === 'Other' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Category Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={customCategory}
                onChange={(e) => {
                  setCustomCategory(e.target.value);
                  setCreateError('');
                }}
                placeholder="e.g. Office Renovation, Software Licenses"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#01A8F3]" />
                <span>Disbursement / Funding Method</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'border-[#01A8F3] bg-[#E8F7FE] text-[#0188C7] font-bold shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-slate-600 mb-1" />
                  <div className="text-xs font-bold">Cash</div>
                  <div className="text-[10px] text-slate-500">Direct register</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_TRANSFER')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'border-[#01A8F3] bg-[#E8F7FE] text-[#0188C7] font-bold shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#0188C7] mb-1" />
                  <div className="text-xs font-bold">Bank Transfer</div>
                  <div className="text-[10px] text-slate-500">Corporate bank</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('PETTY_CASH')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentMethod === 'PETTY_CASH'
                      ? 'border-amber-600 bg-amber-50/70 text-amber-900 font-bold shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-amber-600 mb-1" />
                  <div className="text-xs font-bold">Petty Cash</div>
                  <div className="text-[10px] text-slate-500">Float wallet</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#01A8F3]" />
                <span>Disbursement Date <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => {
                  setExpenseDate(e.target.value);
                  setCreateError('');
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#01A8F3]"
                required
              />
            </div>
          </div>

          {isCreatePettyCash && allocations.length > 0 && (
            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-amber-600" />
                <span>Link to Specific Petty Cash Allocation (Optional)</span>
              </label>
              <Select
                value={selectedAllocationId}
                onChange={(e) => setSelectedAllocationId(e.target.value)}
                options={[
                  { value: '', label: 'General Petty Cash Wallet Float' },
                  ...allocations.map((a) => ({
                    value: a.id,
                    label: `${a.allocationCode} - ${a.reason} (Bal: ${formatCurrency(a.remainingAmount)})`,
                  })),
                ]}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Voucher Remarks / Purpose <span className="text-red-500">*</span>
            </label>
            <Input
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                setCreateError('');
              }}
              placeholder="e.g. Courier charges for Batticaloa delivery dispatch"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Reconciliation Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Receipt number, invoice reference, or audit annotations..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/20 shadow-2xs"
            />
          </div>

          {isCreateOverPettyCashBalance && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                The requested voucher amount of <strong>{formatCurrency(parsedCreateAmount)}</strong> exceeds your
                available Petty Cash float balance of <strong>{formatCurrency(wallet?.remainingBalance)}</strong>.
              </span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCreate}
              disabled={isSubmittingCreate}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingCreate || Boolean(isCreateOverPettyCashBalance)}
              isLoading={isSubmittingCreate}
              className="w-full sm:w-auto"
            >
              {isSubmittingCreate ? 'Registering...' : 'Register Expense Voucher'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Direct Edit Modal (Within 24 Hours) */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Expense Voucher"
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#E8F7FE] border border-[#B9E7FC] rounded-xl text-xs text-[#0188C7] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#01A8F3] shrink-0" />
            <span>This expense was created within 24 hours. You have direct authorization to update it.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <Select
                value={editCategoryName}
                onChange={(e) => {
                  setEditCategoryName(e.target.value);
                  const found = categories.find((c) => c.name === e.target.value);
                  if (found) setEditCategoryId(found.id);
                }}
                options={categories.map((c) => ({ value: c.name, label: c.name }))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher Amount (LKR)</label>
              <Input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <Select
                value={editPaymentMethod}
                onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                options={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { value: 'PETTY_CASH', label: 'Petty Cash' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Date</label>
              <input
                type="date"
                value={editExpenseDate}
                onChange={(e) => setEditExpenseDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#01A8F3]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
            <Input
              value={editRemarks}
              onChange={(e) => setEditRemarks(e.target.value)}
              placeholder="Brief description..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes (Optional)</label>
            <textarea
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Audit or reconciliation notes..."
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#01A8F3]/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveDirectEdit} disabled={isSavingEdit}>
              {isSavingEdit ? 'Saving...' : 'Save Voucher'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Change Request Modal (> 24 Hours) */}
      <Dialog
        isOpen={isChangeRequestModalOpen}
        onClose={() => setIsChangeRequestModalOpen(false)}
        title={changeRequestAction === 'DELETE' ? 'Request to Void Voucher (> 24h)' : 'Request Voucher Modification (> 24h)'}
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">24-Hour Governance Policy Enforced:</strong>
              <p className="mt-0.5 leading-relaxed">
                This expense was recorded more than 24 hours ago. Modifying or voiding it will send a formal authorization ticket to the Admin. The original ledger record will stay locked until approved.
              </p>
            </div>
          </div>

          {changeRequestAction === 'EDIT' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Category</label>
                  <Select
                    value={editCategoryName}
                    onChange={(e) => {
                      setEditCategoryName(e.target.value);
                      const found = categories.find((c) => c.name === e.target.value);
                      if (found) setEditCategoryId(found.id);
                    }}
                    options={categories.map((c) => ({ value: c.name, label: c.name }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Amount (LKR)</label>
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Proposed Remarks</label>
                <Input
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Justification / Reason for Request <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={changeRequestReason}
              onChange={(e) => setChangeRequestReason(e.target.value)}
              placeholder="Explain why this historical expense requires modification or deletion..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsChangeRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitChangeRequest}
              disabled={isSubmittingCR}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmittingCR ? 'Submitting...' : 'Submit Authorization Request'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Direct Delete Modal (<= 24 Hours) */}
      <Dialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Delete Expense Voucher"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Are you sure you want to delete this expense voucher of{' '}
            <strong className="text-slate-900 font-mono">
              {deletingExpense ? formatCurrency(deletingExpense.amount) : ''}
            </strong>
            ? This action will remove it from the operational expenditure ledger.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmDirectDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
