import React, { useState, useEffect } from 'react';
import { expenseRepository } from '../../repositories';
import { ExpenseCategory } from '../../models/domain';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { LoadingState } from '../../components/shared/LoadingState';
import { Tag } from 'lucide-react';

export const FinanceCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    expenseRepository.getCategories().then((data) => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState rows={5} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Expense Categories" description="Predefined and custom expense classifications" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{cat.name}</h3>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    {cat.isCustom ? 'Custom Category' : 'Standard Category'}
                  </span>
                </div>
              </div>
              {cat.description && <p className="text-xs text-slate-500 mt-1">{cat.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
