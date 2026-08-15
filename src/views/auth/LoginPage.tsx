import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, Building2 } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@crm.com', role: 'Executive Access' },
  { label: 'Supervisor (Alpha)', email: 'supervisor.alpha@crm.com', role: 'Team Supervisor' },
  { label: 'Team Member', email: 'member.a1@crm.com', role: 'Tele-Calling Agent' },
  { label: 'Finance', email: 'finance@crm.com', role: 'Finance Officer' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('supervisor.alpha@crm.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const doLogin = async (loginEmail: string) => {
    setIsLoading(true);
    try {
      const user = await login(loginEmail);
      if (user.role === 'ADMIN') navigate('/admin/dashboard');
      else if (user.role === 'SUPERVISOR') navigate('/supervisor/dashboard');
      else if (user.role === 'TEAM_MEMBER') navigate('/member/dashboard');
      else if (user.role === 'FINANCE') navigate('/finance/dashboard');
    } catch {
      // toast error handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await doLogin(email);
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    await doLogin(demoEmail);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-6 border-b border-slate-100 text-center bg-white">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm mx-auto flex items-center justify-center shadow-xs mb-3">
            <Building2 className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise CRM & Sales Portal</h1>
          <p className="text-xs text-slate-500 mt-1">Multi-Role Order Fulfillment & Tele-calling System</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8 pt-6 space-y-4">
          <Input
            label="Email or User ID"
            type="text"
            placeholder="e.g. supervisor.alpha@crm.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            required
          />

          <div className="flex items-center justify-between text-xs text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
              />
              <span>Remember me</span>
            </label>
            <span className="text-slate-400 font-normal">Encrypted Session</span>
          </div>

          <Button type="submit" variant="primary" className="w-full h-10 text-sm mt-2" isLoading={isLoading}>
            Sign In to Workspace
          </Button>

          {/* Quick Role Login Section */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>One-Tap Demo Roles</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => handleQuickDemoLogin(demo.email)}
                  disabled={isLoading}
                  className="p-2.5 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 border border-slate-200 rounded-lg text-left transition-colors cursor-pointer disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">{demo.label}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">{demo.role}</div>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      <div className="text-xs text-slate-400 mt-6 text-center">
        Enterprise Role-Based Management System &bull; 2026 Production Edition
      </div>
    </div>
  );
};
