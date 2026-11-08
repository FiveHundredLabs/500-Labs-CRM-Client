import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import {
  ArrowRight,
  FileSpreadsheet,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance & Revenue Command Center"
        description="Access finance analytics, reports, expense entry, and petty cash."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          leftIcon={<TrendingUp className="w-4 h-4 text-[#01A8F3]" />}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={() => navigate('/finance/sales-analysis')}
          className="justify-between py-4"
        >
          Sales Analysis
        </Button>
        <Button
          variant="outline"
          leftIcon={<FileSpreadsheet className="w-4 h-4 text-[#547E1B]" />}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={() => navigate('/finance/reports')}
          className="justify-between py-4"
        >
          Financial Reports
        </Button>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={() => navigate('/finance/expenses?recordExpense=1')}
          className="justify-between py-4"
        >
          Record Expense
        </Button>
        <Button
          variant="outline"
          leftIcon={<Wallet className="w-4 h-4 text-amber-700" />}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          onClick={() => navigate('/finance/petty-cash')}
          className="justify-between py-4"
        >
          Petty Cash Wallet
        </Button>
      </div>
    </div>
  );
};
