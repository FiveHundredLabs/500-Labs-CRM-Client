import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import {
  Wrench,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Wallet,
  FileSpreadsheet,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  moduleName?: string;
}

export const FinanceUnderDevelopmentPage: React.FC<Props> = ({ moduleName = 'Finance & Accounting Module' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleReturnHome = () => {
    if (user?.role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (user?.role === 'SUPERVISOR') {
      navigate('/supervisor/dashboard');
    } else if (user?.role === 'TEAM_MEMBER') {
      navigate('/member/dashboard');
    } else {
      navigate('/login');
    }
  };

  const upcomingFeatures = [
    {
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      title: 'Automated COD Reconciliation',
      description: 'Direct courier API synchronization and automated delivery remittance verification.',
      badge: 'In Progress',
    },
    {
      icon: <Wallet className="w-5 h-5 text-blue-600" />,
      title: 'Petty Cash & Voucher Governance',
      description: 'Multi-level approval workflows for operational reimbursements and digital receipts.',
      badge: 'Architecture',
    },
    {
      icon: <Receipt className="w-5 h-5 text-amber-600" />,
      title: 'OpEx & Capital Allocation Ledgers',
      description: 'Real-time category breakdown of marketing, packaging, stationery, and postal costs.',
      badge: 'Testing',
    },
    {
      icon: <FileSpreadsheet className="w-5 h-5 text-purple-600" />,
      title: 'Executive Financial Intelligence',
      description: 'Automated P&L, balance sheets, working capital metrics, and presentation-grade exports.',
      badge: 'Scheduled',
    },
  ];

  return (
    <div className="min-h-[82vh] flex flex-col justify-center items-center py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl space-y-8">
        {/* Main Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden relative backdrop-blur-md">
          {/* Subtle top accent gradient */}
          <div className="h-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 w-full" />

          <div className="p-6 sm:p-10 lg:p-12 text-center space-y-6">
            {/* Animated Badge & Icon */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-blue-50 border-2 border-blue-200/60 flex items-center justify-center text-blue-600 shadow-inner">
                  <Wrench className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse text-blue-600" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-1.5 rounded-full border-2 border-white shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-extrabold uppercase tracking-wider mt-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Under Active Development</span>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-3 max-w-2xl mx-auto">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                {moduleName}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                We are currently building and optimizing our next-generation enterprise financial infrastructure.
                This module is undergoing database schema integration, real-time audit protocol testing, and executive role-based security hardening.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                leftIcon={<ArrowLeft className="w-4 h-4 text-white" />}
                onClick={handleReturnHome}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs px-6 py-2.5 rounded-xl text-xs sm:text-sm"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="bg-slate-50/80 border-t border-slate-200/70 p-6 sm:p-8">
            <div className="text-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Upcoming Financial Capabilities</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcomingFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-start gap-3.5 hover:border-slate-300 transition-colors"
                >
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                    {feat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{feat.title}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        {feat.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">{feat.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Audit Notice */}
            <div className="mt-6 p-3.5 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center gap-2 text-xs text-slate-500 text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Enterprise Security: Financial ledger access will be strictly governed by role-based cryptographic tokens.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
