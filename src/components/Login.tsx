import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  Building2, 
  Mail, 
  Lock, 
  Sparkles, 
  ShieldAlert, 
  ArrowRight, 
  Database,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface LoginProps {
  onDemoBypass: (mockUser: any) => void;
}

export default function Login({ onDemoBypass }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (data?.user && !data.session) {
          setSuccessMsg("Registration successful! Please check your email inbox to confirm your account, or sign in if email confirmation is disabled.");
        } else {
          setSuccessMsg("Account successfully registered and logged in!");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    // Generate a beautiful persistent mock user object
    const mockUser = {
      id: "mock-user-db-9999",
      email: email.trim() || "demo_user@ledgersmart.com",
      isDemo: true
    };
    onDemoBypass(mockUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md flex items-center justify-center transition-transform hover:rotate-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Ledger Smart
          </h2>
          <p className="mt-1 text-center text-xs font-mono font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
            Cloud Personal Finance Copilot
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow-xl border border-slate-100 dark:border-slate-800 rounded-3xl sm:px-10 transition-colors">
          
          {/* Header Description */}
          <div className="mb-6 text-center">
            <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold font-mono px-3 py-1 rounded-full border border-indigo-100/30">
              ⚡ SUPABASE CLOUD AUTHENTICATED
            </span>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mt-4">
              {isSignUp ? "Generate Cloud Account" : "Access Personal Slate"}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isSignUp ? "Create credentials to sync records across your devices" : "Log in to retrieve journals, budgets, and savings goals"}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleAuth}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-3xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-10 pr-4 py-3 border border-slate-205 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:text-white transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-2">
                Secure Password
              </label>
              <div className="relative rounded-xl shadow-3xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-10 py-3 border border-slate-205 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:text-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Display error if exists */}
            {errorMsg && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/45 p-3 flex gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-800 dark:text-red-400 font-semibold leading-relaxed">
                  {errorMsg}
                </p>
              </div>
            )}

            {/* Display status success if exists */}
            {successMsg && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/45 p-3 flex gap-2">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-805 dark:text-emerald-400 font-semibold leading-relaxed">
                  {successMsg}
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-white animate-spin" />
                  <span>Processing credentials...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? "Create My Vault Account" : "Access Cloud Ledger"}</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle login vs signup */}
          <div className="mt-6 flex justify-center text-xs">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isSignUp ? "Already have a cloud vault? Sign In" : "Need cloud syncing? Open Free Account"}
            </button>
          </div>
        </div>

        {/* Supabase Developer Assist Card */}
        <div className="mt-4 bg-amber-50/55 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4.5 text-left space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-600 dark:text-amber-500 animate-pulse" />
            <span className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-500 tracking-wider font-mono">SUPABASE CONFIGURATION GUIDE</span>
          </div>
          
          <p className="text-[11px] text-amber-850 dark:text-amber-400/80 leading-relaxed font-semibold">
            {isSupabaseConfigured ? (
              <span className="text-emerald-700 dark:text-emerald-500 flex items-center gap-1">
                ✓ Supabase is fully configured! Real cloud authentication and storage loads automatically.
              </span>
            ) : (
              <span>
                To configure your own secure DB, edit your local environment file (<code className="font-mono bg-amber-100/40 dark:bg-amber-950/60 font-bold p-0.5 rounded text-[10px]/normal text-amber-900">.env</code>) and provide your real credentials:
              </span>
            )}
          </p>

          {!isSupabaseConfigured && (
            <div className="bg-white/70 dark:bg-slate-900/60 rounded-xl p-3 border border-amber-100/40 font-mono text-[9px] text-slate-500 dark:text-slate-400 leading-normal space-y-1">
              <div>VITE_SUPABASE_URL=your-supabase-project.supabase.co</div>
              <div>VITE_SUPABASE_ANON_KEY=your-actual-anon-public-key</div>
            </div>
          )}

          {/* Bypass Button */}
          <div className="pt-1.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Want to review or test without keys?
            </span>
            <button
              onClick={handleDemoMode}
              className="py-1.5 px-3 bg-amber-550 hover:bg-amber-600 dark:bg-amber-600/20 dark:hover:bg-amber-600/35 border border-amber-300/40 dark:border-amber-500/30 text-[10px] font-bold text-amber-850 dark:text-amber-400 rounded-lg shadow-sm transition-colors cursor-pointer block text-center"
            >
              🚀 Try Demo Bypass Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
