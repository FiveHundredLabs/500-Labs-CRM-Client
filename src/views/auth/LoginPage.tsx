import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Eye, EyeOff, Lock, Mail, Building2 } from "lucide-react";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, status, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;

    if (user.role === "ADMIN") navigate("/admin/dashboard", { replace: true });
    else if (user.role === "SUPERVISOR")
      navigate("/supervisor/dashboard", { replace: true });
    else if (user.role === "TEAM_MEMBER")
      navigate("/member/dashboard", { replace: true });
    else if (user.role === "FINANCE")
      navigate("/finance/dashboard", { replace: true });
  }, [navigate, status, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      const user = await login(email.trim(), password);
      if (user.role === "ADMIN")
        navigate("/admin/dashboard", { replace: true });
      else if (user.role === "SUPERVISOR")
        navigate("/supervisor/dashboard", { replace: true });
      else if (user.role === "TEAM_MEMBER")
        navigate("/member/dashboard", { replace: true });
      else if (user.role === "FINANCE")
        navigate("/finance/dashboard", { replace: true });
    } catch {
      // toast error handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-6 border-b border-slate-100 text-center bg-white">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm mx-auto flex items-center justify-center shadow-xs mb-3">
            <Building2 className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Enterprise CRM &amp; Sales Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Multi-Role Order Fulfillment &amp; Tele-calling System
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8 pt-6 space-y-4">
          <Input
            label="Email or Username"
            type="text"
            placeholder="e.g. admin@crm.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            required
            autoFocus
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
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
            <span className="text-slate-400 font-normal">
              Encrypted Session
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full h-10 text-sm mt-2"
            isLoading={isLoading || status === "checking"}
          >
            Sign In to Workspace
          </Button>
        </form>
      </div>

      <div className="text-xs text-slate-400 mt-6 text-center">
        Enterprise Role-Based Management System &bull; 2026 Production Edition
      </div>
    </div>
  );
};
