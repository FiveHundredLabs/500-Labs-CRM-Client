import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ExpenseCategory } from '../../models/domain';
import { expenseRepository } from '../../repositories';
import { ExpenseService } from '../../services/expenseService';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import toast from 'react-hot-toast';
import { DollarSign, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/currency';

export const FinanceNewExpensePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Postal Charges');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    expenseRepository.getCategories().then(setCategories);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid positive amount.');
      return;
    }

    if (selectedCategoryName === 'Other' && !customCategory.trim()) {
      toast.error('Please specify the custom category name.');
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    try {
      const selectedCatObj = categories.find((c) => c.name === selectedCategoryName);

      await ExpenseService.createExpense(
        {
          categoryId: selectedCatObj ? selectedCatObj.id : 'cat_005',
          categoryName: selectedCategoryName,
          customCategoryName: customCategory,
          amount: parsedAmount,
          expenseDate,
          remarks: remarks.trim() || 'No remarks',
        },
        user
      );

      toast.success(`Expense voucher of ${formatCurrency(parsedAmount)} recorded successfully!`);
      navigate('/finance/expenses');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        onClick={() => navigate('/finance/expenses')}
      >
        Back to Expenses
      </Button>

      <PageHeader
        title="Record Expense Voucher"
        description="Enter expense details, category classification, and financial remarks"
      />

      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span>New Expense Entry</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Expense Category *"
              value={selectedCategoryName}
              onChange={(e) => setSelectedCategoryName(e.target.value)}
              options={[
                { value: 'Postal Charges', label: 'Postal Charges (Courier Dispatch)' },
                { value: 'Printing', label: 'Printing & Thermal Sticker Rolls' },
                { value: 'Transport', label: 'Transport & Field Courier' },
                { value: 'Petty Cash', label: 'Petty Cash & Office Supplies' },
                { value: 'Other', label: 'Other (Custom Description)' },
              ]}
            />

            {selectedCategoryName === 'Other' && (
              <Input
                label="Specify Custom Category Name *"
                placeholder="e.g. Server Hosting / Equipment Repair"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
              />
            )}

            <Input
              label="Amount (LKR) *"
              type="number"
              step="0.01"
              placeholder="e.g. 150.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <Input
              label="Expense Date *"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Remarks / Purpose *
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add expense justification or receipt reference..."
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => navigate('/finance/expenses')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Save Expense Voucher
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
