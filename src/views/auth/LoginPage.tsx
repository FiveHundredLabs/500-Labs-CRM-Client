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
    <div className="relative min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 font-sans overflow-hidden select-none">
      {/* Dynamic Responsive Background */}
      <picture className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <source media="(min-width: 768px)" srcSet="/login_bg_landscape.jpg" />
        <source media="(orientation: landscape)" srcSet="/login_bg_landscape.jpg" />
        <img
          src="/login_bg_portrait.jpg"
          alt="CRM Login Background"
          className="w-full h-full object-cover object-center transform scale-[1.02] transition-transform duration-1000 ease-out"
          loading="eager"
        />
      </picture>

      {/* Cinematic Dark Vignette & Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/65 to-slate-950/75 backdrop-blur-[2px] pointer-events-none z-0" />

      {/* Floating Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-md backdrop-blur-2xl bg-white/95 border border-white/60 shadow-2xl shadow-black/60 rounded-3xl overflow-hidden transition-all duration-300">
        {/* Header */}
        <div className="p-7 sm:p-8 pb-5 text-center border-b border-slate-100/80 bg-white/50">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm mx-auto flex items-center justify-center shadow-lg shadow-blue-500/25 mb-3.5 transition-transform hover:scale-105 duration-200">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Enterprise CRM
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Order Fulfillment &amp; Sales Workspace
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-7 sm:p-8 pt-5 space-y-4">
          <Input
            label="Email or Username"
            type="text"
            placeholder="e.g. admin@crm.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            required
            autoFocus
            className="bg-slate-50/70 focus:bg-white transition-colors"
          />

          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
            required
            className="bg-slate-50/70 focus:bg-white transition-colors"
          />

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5"
              />
              <span className="group-hover:text-slate-900 transition-colors">Remember me</span>
            </label>
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Secure 256-bit SSL
            </span>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full h-11 text-sm font-semibold mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 active:scale-[0.99] transition-all rounded-xl"
            isLoading={isLoading || status === "checking"}
          >
            Sign In to Workspace
          </Button>
        </form>
      </div>

      {/* Modern Footer Branding */}
      <div className="relative z-10 text-xs text-slate-300/80 mt-6 text-center tracking-wide drop-shadow-sm">
        500 Flow CRM Platform &bull; 2026 Production Edition
      </div>
    </div>
  );
};
