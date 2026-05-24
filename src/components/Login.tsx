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
  EyeOff,
  ArrowLeft,
  KeyRound,
  HelpCircle
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
  
  // Custom First/Last Name states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Password reset states
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1); // 1 = enter email, 2 = enter code and new password
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
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

    const targetEmail = email.trim();
    if (!targetEmail) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (password.length > 0 && password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (isSignUp) {
      if (!firstName.trim()) {
        setErrorMsg("Please enter your First Name.");
        return;
      }
      if (!lastName.trim()) {
        setErrorMsg("Please enter your Last Name.");
        return;
      }
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
          // Attempt user account signup
          const { data, error } = await supabase.auth.signUp({
            email: targetEmail,
            password: authPassword,
            options: {
              emailRedirectTo: window.location.origin,
              data: {
                first_name: firstName.trim(),
                last_name: lastName.trim()
              }
            },
          });

          if (error) {
            if (error.message && (error.message.includes("already registered") || error.message.includes("already exists"))) {
              setErrorMsg("An account with this email already exists. Please sign in instead.");
              setLoading(false);
              return;
            }
            throw error;
          }

          // Handle User Enumeration Obfuscation Check for existing emails
          if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
            setErrorMsg("An account with this email already exists. Please sign in instead.");
            setLoading(false);
            return;
          }
          
          if (data?.user) {
            // Log in right away if possible
            sessionStorage.setItem('just_logged_in', 'true');
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: targetEmail,
              password: authPassword,
            });
            if (signInError) {
              sessionStorage.removeItem('just_logged_in');
              setSuccessMsg("Registration successful! Check your inbox to confirm your account.");
            } else {
              setSuccessMsg("Account registered and authenticated successfully!");
            }
          }
        } else {
          // Normal logging in
          sessionStorage.setItem('just_logged_in', 'true');
          const { error } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: authPassword,
          });
          if (error) {
            sessionStorage.removeItem('just_logged_in');
            throw error;
          }
        }
      } else {
        // Fallback mock sandbox mode
        await new Promise(resolve => setTimeout(resolve, 600));
        
        if (isSignUp) {
          const existingUsersStr = localStorage.getItem('fin_tracker_mock_users') || '[]';
          const existingUsers = JSON.parse(existingUsersStr);
          if (existingUsers.some((u: any) => u.email.toLowerCase() === targetEmail.toLowerCase())) {
            setErrorMsg("An account with this email already exists. Please sign in instead.");
            setLoading(false);
            return;
          }

          const newMockUser = {
            id: "local-user-" + Math.random().toString(36).substring(2, 9),
            email: targetEmail,
            isDemo: true,
            user_metadata: {
              first_name: firstName.trim(),
              last_name: lastName.trim()
            }
          };

          existingUsers.push(newMockUser);
          localStorage.setItem('fin_tracker_mock_users', JSON.stringify(existingUsers));
          
          setSuccessMsg("Simulated registration successful!");
          sessionStorage.setItem('just_logged_in', 'true');
          setTimeout(() => {
            onDemoBypass(newMockUser);
          }, 800);
        } else {
          const existingUsersStr = localStorage.getItem('fin_tracker_mock_users') || '[]';
          const existingUsers = JSON.parse(existingUsersStr);
          const matchedUser = existingUsers.find((u: any) => u.email.toLowerCase() === targetEmail.toLowerCase());

          sessionStorage.setItem('just_logged_in', 'true');
          if (matchedUser) {
            onDemoBypass(matchedUser);
          } else {
            // default local sandbox fallback
            onDemoBypass({
              id: "local-user-db-9999",
              email: targetEmail,
              isDemo: true,
              user_metadata: {
                first_name: "Demo",
                last_name: "User"
              }
            });
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        
        setSuccessMsg("Reset code sent! Check your inbox to retrieve the secure OTP.");
        setResetStep(2);
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        setSuccessMsg("Simulated Reset Code '123456' has been generated for: " + resetEmail);
        setResetStep(2);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to trigger password recovery invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = resetCode.trim();
    if (!cleanCode) {
      setErrorMsg("Please input the OTP or recovery code you received.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSupabaseConfigured) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: resetEmail.trim(),
          token: cleanCode,
          type: 'recovery'
        });
        if (otpError) throw otpError;

        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (updateError) throw updateError;

        setSuccessMsg("Password successfully update! Returning to Sign In screen...");
        setTimeout(() => {
          setIsResetMode(false);
          setResetStep(1);
          setSuccessMsg(null);
          setIsSignUp(false);
        }, 2200);
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const existingUsersStr = localStorage.getItem('fin_tracker_mock_users') || '[]';
        const existingUsers = JSON.parse(existingUsersStr);
        const userIndex = existingUsers.findIndex((u: any) => u.email.toLowerCase() === resetEmail.trim().toLowerCase());
        
        if (userIndex !== -1) {
          // Update simulated password
          setSuccessMsg("Simulated update: Vault keys updated successfully!");
        } else {
          setSuccessMsg("Simulated update: Temporary offline profile keys configured.");
        }

        setTimeout(() => {
          setIsResetMode(false);
          setResetStep(1);
          setSuccessMsg(null);
          setIsSignUp(false);
        }, 2200);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Invalid or expired recovery code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className="mt-5 text-center text-2xl font-extrabold text-slate-905 dark:text-white tracking-tight">
            Ledger Smart
          </h2>
          <p className="mt-1 text-center text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Personal Wealth Companion
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-905 py-8 px-6 shadow-xs border border-slate-100 dark:border-slate-805/85 rounded-3xl sm:px-10 transition-colors">
          
          {isResetMode ? (
            /* Reset password flow template */
            <div>
              <div className="mb-6 text-center">
                <div className="w-10 h-10 bg-indigo-55 bg-indigo-50 dark:bg-slate-950 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {resetStep === 1 ? "Forgot Ledger Password" : "Configure New Vault Key"}
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
                  {resetStep === 1 
                    ? "Verify your registered email to request a secure entry code."
                    : "Enter the OTP token sent to your mail and set your new secret key."
                  }
                </p>
              </div>

              {resetStep === 1 ? (
                <form className="space-y-4" onSubmit={handleSendResetCode}>
                  <div>
                    <label htmlFor="resetEmail" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                      Account Email Address
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="resetEmail"
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="e.g. workspace@company.com"
                        className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-650 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all"
                      />
                    </div>
                  </div>

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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-white animate-spin" />
                    ) : (
                      <>
                        <span>Request OTP Recovery Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-850 dark:hover:text-white cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Access Sign In</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={handleVerifyAndResetPassword}>
                  {/* code entry */}
                  <div>
                    <label htmlFor="resetCode" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                      OTP Token Recovery Code
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <input
                        id="resetCode"
                        type="text"
                        required
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="Check your mail for 6-digit OTP code"
                        className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-650 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all"
                      />
                    </div>
                  </div>

                  {/* password entry */}
                  <div>
                    <label htmlFor="newPassword" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                      New Vault Password
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-650 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* confirm password entry */}
                  <div>
                    <label htmlFor="confirmNewPassword" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                      Confirm New Password
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="confirmNewPassword"
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-650 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all"
                      />
                    </div>
                  </div>

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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-white animate-spin" />
                    ) : (
                      <>
                        <span>Verify and Apply New Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="mt-4 flex justify-between text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setResetStep(1)}
                      className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 cursor-pointer"
                    >
                      Resend Code / Change Email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setResetStep(1);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Sign In Page
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Standard auth sign in / sign up templates */
            <div>
              <div className="mb-6 text-center">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {isSignUp ? "Create Portfolio Vault" : "Access Personal Slate"}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {isSignUp ? "Set up secure credentials to sync portfolios" : "Enter credentials to unlock financial journals & charts"}
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleAuth}>
                {/* First and Last Name (Only on Sign Up) */}
                {isSignUp && (
                  <div className="grid grid-cols-2 gap-3.5 mb-2">
                    <div>
                      <label htmlFor="firstName" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                        First Name
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="block w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-650 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="block w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold placeholder-slate-400 dark:placeholder-slate-650 focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 font-mono">
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

                {/* Password field / Account Lock key */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                      Account Key / Password
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetMode(true);
                          setResetStep(1);
                          setResetEmail(email); // Prefill email
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
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
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 bg-transparent border-0 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Locally */}
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
                      <span>Processing...</span>
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
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-transparent border-0"
                >
                  {isSignUp ? "Already have a portfolio vault? Sign In" : "Need cross-device sync? Open Free Account"}
                </button>
              </div>
            </div>
          )}
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
