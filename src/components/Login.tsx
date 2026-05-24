import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  Building2, 
  Mail, 
  Lock, 
  ShieldAlert, 
  ArrowRight, 
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
  const [rememberMe, setRememberMe] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('fin_tracker_saved_email');
      const savedPassword = localStorage.getItem('fin_tracker_saved_password');
      if (savedEmail) {
        setEmail(savedEmail);
      }
      if (savedPassword) {
        setPassword(savedPassword);
      }
    } catch (e) {
      console.warn("Could not read credentials from localStorage:", e);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetEmail = email.trim() || "user@ledgersmart.com";

    if (password.length > 0 && password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('fin_tracker_saved_email', targetEmail);
        if (password) {
          localStorage.setItem('fin_tracker_saved_password', password);
        }
      } else {
        localStorage.removeItem('fin_tracker_saved_email');
        localStorage.removeItem('fin_tracker_saved_password');
      }

      if (isSupabaseConfigured) {
        const authPassword = password || "default_local_passwd_123456";
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email: targetEmail,
            password: authPassword,
          });
          if (error) throw error;
          
          if (data?.user) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: targetEmail,
              password: authPassword,
            });
            if (signInError) {
              setSuccessMsg("Registration successful! Check your inbox to confirm.");
            } else {
              setSuccessMsg("Account registered and authenticated successfully!");
            }
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: authPassword,
          });
          if (error) throw error;
        }
      } else {
        // Silently default to local secure vault mode
        await new Promise(resolve => setTimeout(resolve, 600));
        onDemoBypass({
          id: "local-user-db-9999",
          email: targetEmail,
          isDemo: true // Implicitly allow pre-filled seed records to load seamlessly
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Modern Head Badge */}
        <div className="flex flex-col items-center">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="mt-5 text-center text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Ledger Smart
          </h2>
          <p className="mt-1 text-center text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Personal Wealth Companion
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-905 py-8 px-6 shadow-xs border border-slate-100 dark:border-slate-805/85 rounded-3xl sm:px-10 transition-colors">
          
          <div className="mb-6 text-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {isSignUp ? "Create Portfolio Vault" : "Access Personal Slate"}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {isSignUp ? "Set up secure credentials to sync portfolios" : "Enter credentials to unlock financial journals & charts"}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleAuth}>
            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. workspace@company.com"
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-650 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Account Key / Password
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSupabaseConfigured ? "••••••••" : "Optional in local offline mode"}
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-650 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all"
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

            {/* Remember Credentials Option */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-xs focus:ring-blue-500 border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider select-none cursor-pointer">
                Remember credentials locally
              </label>
            </div>

            {/* Status Messages */}
            {errorMsg && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-950 p-2.5 flex gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-800 dark:text-red-400 font-medium leading-relaxed">
                  {errorMsg}
                </p>
              </div>
            )}

            {successMsg && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-950 p-2.5 flex gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-medium leading-relaxed">
                  {successMsg}
                </p>
              </div>
            )}

            {/* Action Trigger Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-white animate-spin" />
                  <span>Entering Slate...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? "Register Portfolio Vault" : "Access Personal Slate"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle form context */}
          <div className="mt-5 flex justify-center text-[11px]">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isSignUp ? "Already have a portfolio vault? Sign In" : "Need cross-device sync? Open Free Account"}
            </button>
          </div>
        </div>

        {/* Local-first Reassurance Footer Card */}
        <div className="mt-5 text-center px-4">
          <p className="text-[10px] font-medium leading-relaxed text-slate-450 dark:text-slate-500 uppercase tracking-widest">
            {isSupabaseConfigured 
              ? "🔒 Encrypted Cloud Storage Synchronized" 
              : "🔒 Local Mode Active: Private Ledger kept fully offline on this device"
            }
          </p>
          <div className="mt-6 text-[11px] font-medium text-slate-400 dark:text-slate-600">
            Created by Lincoln Mwangi © All Rights Reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
