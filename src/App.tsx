import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Transaction, Budget, SavingsGoal, ChatMessage, BudgetTemplate, RecurringTransaction, MonthlySnapshot } from './types';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import BudgetManager from './components/BudgetManager';
import SavingsGoals from './components/SavingsGoals';
import AIAssistant from './components/AIAssistant';
import BudgetTemplates from './components/BudgetTemplates';
import RecurringManager from './components/RecurringManager';
import Login from './components/Login';
import MonthlyReports from './components/MonthlyReports';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { 
  Building2, 
  LayoutDashboard, 
  WalletCards, 
  Receipt, 
  PiggyBank, 
  Sparkles,
  Info,
  Scale,
  BarChart3,
  BrainCircuit,
  Settings,
  RefreshCw,
  FolderHeart,
  X,
  Trash2,
  AlertTriangle,
  Sun,
  Moon,
  CalendarClock,
  LogOut,
  Lock,
  User,
  Bell,
  BellRing,
  Printer,
  CheckCircle
} from 'lucide-react';

const SEED_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'income', amount: 4800, category: 'Income', date: '2026-05-01', description: 'Tech Corp Salary Payday' },
  { id: '2', type: 'expense', amount: 1350, category: 'Housing', date: '2026-05-02', description: 'Monthly Apartment Rent payment' },
  { id: '3', type: 'expense', amount: 124.50, category: 'Food', date: '2026-05-05', description: 'Whole Foods grocery haul' },
  { id: '4', type: 'expense', amount: 84, category: 'Utilities', date: '2026-05-08', description: 'District Heat & Power billing' },
  { id: '5', type: 'expense', amount: 65, category: 'Transport', date: '2026-05-10', description: 'Weekly Metro commuter transit card' },
  { id: '6', type: 'expense', amount: 120, category: 'Shopping', date: '2026-05-14', description: 'Nike sneaker purchase' },
  { id: '7', type: 'expense', amount: 45, category: 'Entertainment', date: '2026-05-16', description: 'Cinematography tickets & popcorn' },
  { id: '8', type: 'expense', amount: 180, category: 'Food', date: '2026-05-18', description: 'Michelin Star dinners splurge' },
  { id: '9', type: 'expense', amount: 50, category: 'Utilities', date: '2026-05-20', description: 'Broadband Fiber Internet connection' },
  { id: '10', type: 'expense', amount: 200, category: 'Savings', date: '2026-05-22', description: 'Locked monthly emergency reserve outflow' }
];

const SEED_BUDGETS: Budget[] = [];

const SEED_SAVINGS: SavingsGoal[] = [];

export default function App() {
  // Current active frame tab
  const [activeTab, setActiveTab] = useState<'dash' | 'finance' | 'ledger' | 'savings' | 'ai' | 'templates' | 'recurring' | 'reports'>('dash');

  const [showResetModal, setShowResetModal] = useState(false);
  
  // Profile Update States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);

  // Browser Notification States
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('fin_tracker_browser_notifications');
      return stored ? stored === 'true' : false;
    } catch {
      return false;
    }
  });
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [readBudgetAlerts, setReadBudgetAlerts] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('fin_tracker_read_budget_alerts');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [notificationPermissionState, setNotificationPermissionState] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Authentication & Loading State
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [loginNotification, setLoginNotification] = useState<string | null>(null);

  // Monitor login success messages
  useEffect(() => {
    if (user) {
      const justLoggedIn = sessionStorage.getItem('just_logged_in');
      if (justLoggedIn === 'true') {
        setLoginNotification("Successfully logged in");
        sessionStorage.removeItem('just_logged_in');
        const timer = setTimeout(() => {
          setLoginNotification(null);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('fin_tracker_dark_mode');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [currency, setCurrency] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('fin_tracker_currency');
      return stored || 'Ksh';
    } catch {
      return 'Ksh';
    }
  });

  const currencySymbol = currency === 'Ksh' ? 'Ksh ' : currency === 'EUR' ? '€' : '$';

  // State Stores loaded from Supabase
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [customTemplates, setCustomTemplates] = useState<BudgetTemplate[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringTransaction[]>([]);
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>(() => {
    try {
      const cached = localStorage.getItem('fin_tracker_snapshots');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  // Editing transaction reference state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Gemini Structured dynamic insights storage
  const [aiInsights, setAIInsights] = useState<{
    overallStatus: string;
    summaryMessage: string;
    actionableInsights: string[];
    savingsOpportunities: { category: string; savingEstimate: number; actionableTip: string }[];
  } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [isInsightsStale, setIsInsightsStale] = useState(false);

  // Safe client-side preferences (currency, darkmode) preserved in localStorage
  useEffect(() => {
    localStorage.setItem('fin_tracker_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('fin_tracker_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Sync browser notifications preference
  useEffect(() => {
    localStorage.setItem('fin_tracker_browser_notifications', String(browserNotificationsEnabled));
  }, [browserNotificationsEnabled]);

  // Compute active budget alert status for current month categories exceeding 90%
  const currentMonthBudgetAlerts = React.useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    
    // Sum current month's expenses per category
    const monthlyExpenses: Record<string, number> = {};
    transactions.forEach(t => {
      // Must fall into cumulative current calendar month and be an expense
      if (t.type === 'expense' && t.date && t.date.substring(0, 7) === currentMonth) {
        monthlyExpenses[t.category] = (monthlyExpenses[t.category] || 0) + t.amount;
      }
    });

    return budgets.map(b => {
      const spent = monthlyExpenses[b.category] || 0;
      const ratio = b.limit > 0 ? spent / b.limit : 0;
      return {
        category: b.category,
        spent,
        limit: b.limit,
        ratio,
        percent: Math.round(ratio * 100)
      };
    }).filter(item => item.percent >= 90);
  }, [transactions, budgets]);

  const unreadBudgetAlerts = React.useMemo(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    return currentMonthBudgetAlerts.filter(alert => 
      !readBudgetAlerts.includes(`${currentMonth}:${alert.category}`)
    );
  }, [currentMonthBudgetAlerts, readBudgetAlerts]);

  // Request browser Notification permissions and dispatch triggers
  useEffect(() => {
    if (currentMonthBudgetAlerts.length === 0) return;

    const currentMonth = new Date().toISOString().substring(0, 7);
    const storageKey = `fin_tracker_notified_categories_${currentMonth}`;
    
    let notifiedCategories: string[] = [];
    try {
      const stored = localStorage.getItem(storageKey);
      notifiedCategories = stored ? JSON.parse(stored) : [];
    } catch {
      notifiedCategories = [];
    }

    let updated = false;

    currentMonthBudgetAlerts.forEach(alert => {
      if (!notifiedCategories.includes(alert.category)) {
        notifiedCategories.push(alert.category);
        updated = true;

        // Try standard native notification
        if ('Notification' in window && Notification.permission === 'granted' && browserNotificationsEnabled) {
          try {
            const formattedSymbol = currencySymbol.trim();
            new Notification(`Ledger Smart: Budget Threshold Exceeded`, {
              body: `Spending on ${alert.category} is now at ${alert.percent}% (${formattedSymbol}${alert.spent.toFixed(1)} of ${formattedSymbol}${alert.limit.toFixed(1)}) for ${new Date().toLocaleString('default', { month: 'long' })}.`,
            });
          } catch (err) {
            console.warn("Native Notification trigger error:", err);
          }
        }
      }
    });

    if (updated) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(notifiedCategories));
      } catch (err) {
        console.error("Local storage sync error:", err);
      }
    }
  }, [currentMonthBudgetAlerts, browserNotificationsEnabled, currencySymbol]);

  // Hook subscription monitoring Supabase authentication session lifecycle
  useEffect(() => {
    setIsAuthLoading(true);

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Retrieve active auth session error:", error);
        if (
          error.message?.includes('Refresh Token') || 
          error.message?.includes('refresh_token') || 
          error.message?.includes('invalid_grant') ||
          error.message?.includes('Not Found') ||
          error.status === 400 ||
          error.status === 401
        ) {
          // Clear Supabase local storage if possible
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) {
              localStorage.removeItem(key);
            }
          });
          supabase.auth.signOut().catch(() => {});
          setUser(null);
        }
      }

      const session = data?.session;
      if (session?.user) {
        setUser(session.user);
        if (window.location.hash || window.location.search) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
    }).catch((err) => {
      console.error("Retrieve active auth session error:", err);
      supabase.auth.signOut().catch(() => {});
      setUser(null);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        if (window.location.hash || window.location.search) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync state changes loading from Supabase Cloud on successful authentication transition
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setChatMessages([]);
      setCustomTemplates([]);
      setRecurringItems([]);
      setIsDataLoaded(false);
      return;
    }

    const loadUserData = async () => {
      // Demo authentication bypass loading pre-filled static content
      if (user.isDemo) {
        setTransactions(SEED_TRANSACTIONS);
        setBudgets(SEED_BUDGETS);
        setGoals(SEED_SAVINGS);
        setChatMessages([]);
        setCustomTemplates([]);
        setRecurringItems([]);
        setIsDataLoaded(true);
        return;
      }

      setIsDataLoaded(false);
      try {
        // Fetch budgets
        const { data: budgetData } = await supabase.from('budgets').select('*').eq('user_id', user.id);
        const budgetsLoaded = budgetData ? budgetData.map((b: any) => ({
          category: b.category,
          limit: parseFloat(b.limit)
        })) : [];

        // Fetch transactions
        const { data: txData } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false });
        const transactionsLoaded = txData ? txData.map((t: any) => ({
          id: t.id,
          type: t.type as any,
          amount: parseFloat(t.amount),
          category: t.category,
          date: t.date,
          description: t.description || ''
        })) : [];

        // Fetch savings goals
        const { data: goalData } = await supabase.from('savings_goals').select('*').eq('user_id', user.id);
        const goalsLoaded = goalData ? goalData.map((g: any) => ({
          id: g.id,
          name: g.name,
          target: parseFloat(g.target),
          current: parseFloat(g.current),
          deadline: g.deadline || undefined
        })) : [];

        // Fetch custom templates
        const { data: templateData } = await supabase.from('budget_templates').select('*').eq('user_id', user.id);
        const templatesLoaded = templateData ? templateData.map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          incomes: typeof t.incomes === 'string' ? JSON.parse(t.incomes) : t.incomes,
          expenses: typeof t.expenses === 'string' ? JSON.parse(t.expenses) : t.expenses
        })) : [];

        // Fetch recurring items
        const { data: recData } = await supabase.from('recurring_transactions').select('*').eq('user_id', user.id);
        const recurringLoaded = recData ? recData.map((r: any) => ({
          id: r.id,
          type: r.type as any,
          amount: parseFloat(r.amount),
          category: r.category,
          description: r.description || '',
          dayOfMonth: r.day_of_month,
          autoLog: r.auto_log,
          lastLoggedDate: r.last_logged_date || undefined
        })) : [];

        // Fetch chat messages
        const { data: chatData } = await supabase.from('chat_messages').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
        const chatsLoaded = chatData ? chatData.map((c: any) => ({
          id: c.id,
          role: c.role as any,
          text: c.text,
          timestamp: c.timestamp
        })) : [];

        // Fetch snapshots
        const { data: snapshotData } = await supabase.from('snapshots').select('*').eq('user_id', user.id).order('month', { ascending: false });
        const snapshotsLoaded = snapshotData ? snapshotData.map((s: any) => ({
          id: s.id,
          user_id: s.user_id,
          month: s.month,
          created_at: s.created_at,
          total_income: parseFloat(s.total_income || '0'),
          total_expense: parseFloat(s.total_expense || '0'),
          net_savings: parseFloat(s.net_savings || '0'),
          savings_rate: parseFloat(s.savings_rate || '0'),
          income_categories: typeof s.income_categories === 'string' ? JSON.parse(s.income_categories) : (s.income_categories || []),
          expense_categories: typeof s.expense_categories === 'string' ? JSON.parse(s.expense_categories) : (s.expense_categories || []),
          transaction_count: parseInt(s.transaction_count || '0')
        })) : [];

        setBudgets(budgetsLoaded);
        setTransactions(transactionsLoaded);
        setGoals(goalsLoaded);
        setCustomTemplates(templatesLoaded);
        setRecurringItems(recurringLoaded);
        setChatMessages(chatsLoaded);
        setSnapshots(snapshotsLoaded);
        try {
          localStorage.setItem('fin_tracker_snapshots', JSON.stringify(snapshotsLoaded));
        } catch (_) {}
      } catch (err) {
        console.error("Supabase user data fetch failure:", err);
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadUserData();
  }, [user]);

  // Automated recurring expense trigger checking schedules once a month
  useEffect(() => {
    if (!isDataLoaded || recurringItems.length === 0) return;
    const today = new Date();
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentDay = today.getDate();

    let hasChanges = false;
    const processAutologs = async () => {
      const updated = await Promise.all(recurringItems.map(async (item) => {
        if (item.autoLog && item.lastLoggedDate !== currentYearMonth && currentDay >= item.dayOfMonth) {
          hasChanges = true;
          const freshTxId = 'auto-' + Math.random().toString(36).substring(2, 9);
          const newTx: Transaction = {
            id: freshTxId,
            type: item.type,
            amount: item.amount,
            category: item.category,
            date: today.toISOString().split('T')[0],
            description: `[Auto-Logged] ${item.description}`
          };
          
          setTransactions(prev => [newTx, ...prev]);

          if (user && !user.isDemo) {
            await supabase.from('transactions').insert({
              id: freshTxId,
              user_id: user.id,
              type: newTx.type,
              amount: newTx.amount,
              category: newTx.category,
              date: newTx.date,
              description: newTx.description
            });

            await supabase.from('recurring_transactions').update({
              last_logged_date: currentYearMonth
            }).eq('id', item.id);
          }

          return {
            ...item,
            lastLoggedDate: currentYearMonth
          };
        }
        return item;
      }));

      if (hasChanges) {
        setRecurringItems(updated);
      }
    };

    processAutologs();
  }, [isDataLoaded]);

  // Helper to directly call Gemini API in side-by-side environments such as client-only/Vercel static hosting
  const exportToPDF = async () => {
    const input = document.getElementById('main-content');
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save('financial-overview.pdf');
  };

  // Request real-time structured advisors tips using `/api/insights`
  const fetchAIInsights = async () => {
    if (transactions.length === 0 && budgets.length === 0) return;
    setLoadingInsights(true);
    setInsightsError(null);

    let isFallbackNeeded = false;
    let fallbackErrorMessage = "";

    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, budgets, savingsGoals: goals, currency })
      });

      if (!response.ok) {
        // Standard non-ok check. If 404 (NOT_FOUND) from Vercel/similar, mark fallback.
        if (response.status === 404) {
          isFallbackNeeded = true;
          fallbackErrorMessage = "Endpoint /api/insights returned 404 NOT FOUND.";
        } else {
          let errorMessage = "Server returned an error invoking Insights.";
          let isQuota = response.status === 429;
          
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
              if (response.status === 429 || (errorMessage && (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("quota") || errorMessage.includes("429")))) {
                isQuota = true;
              }
            } catch (_) {}
          } else {
            try {
              const textHTML = await response.text();
              if (textHTML && textHTML.length < 250) {
                errorMessage = textHTML;
              } else {
                errorMessage = `Network or service error (Status ${response.status}).`;
              }
            } catch (_) {}
          }

          if (isQuota) {
            throw new Error("QUOTA_EXHAUSTED: You exceeded your current Gemini daily API quota limit.");
          }
          throw new Error(errorMessage);
        }
      } else {
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // Received non-JSON response (e.g. Vercel's index.html or 404 page)
          isFallbackNeeded = true;
          fallbackErrorMessage = "Server returned non-JSON content. Static host router likely intercepted route.";
        } else {
          const data = await response.json();
          setAIInsights(data);
          setIsInsightsStale(false);
          try {
            localStorage.setItem('fin_tracker_ai_insights', JSON.stringify(data));
          } catch (e) {
            console.warn("Could not cache insights locally:", e);
          }
        }
      }
    } catch (err: any) {
      console.warn("Standard /api/insights failed, preparing fallback mode:", err);
      isFallbackNeeded = true;
      fallbackErrorMessage = err.message || "Unknown error calling server-side insights.";
    }

    // Execute fallback routines (Local mathematically generated budget insights)
    if (isFallbackNeeded) {
      // Compute local data-driven smart insights when no API key exists on client
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const categorySpend: Record<string, number> = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        categorySpend[t.category] = (categorySpend[t.category] || 0) + (t.amount || 0);
      });

      const overspentCategories = budgets.filter(b => {
        const spend = categorySpend[b.category] || 0;
        return spend > (b.limit || 0);
      });

      let overallStatus = "On Track";
      if (overspentCategories.length > 0) {
        overallStatus = "Budget Exceeded";
      } else if (totalExpenses > budgets.reduce((sum, b) => sum + (b.limit || 0), 0) * 0.8) {
        overallStatus = "Caution";
      }

      const totalBudgetLimit = budgets.reduce((sum, b) => sum + (b.limit || 0), 0);

      const computedLocalInsights = {
        overallStatus: overallStatus,
        summaryMessage: `Budget analysis computed locally. Expenses: ${currency} ${(totalExpenses || 0).toLocaleString()}. Budget Limit: ${currency} ${(totalBudgetLimit || 0).toLocaleString()}.`,
        actionableInsights: [
          overspentCategories.length > 0
            ? `⚠️ Overspent Alerts: Check: ${overspentCategories.map(c => c.category).join(', ')}.`
            : `✅ Spending control is outstanding!`,
          `Your recent outflows constitute exactly ${totalBudgetLimit > 0 ? Math.round((totalExpenses / totalBudgetLimit) * 100) : 0}% of your cumulative budget allocations.`,
          `Savings progress: Currently tracking ${goals.length} target plans.`
        ],
        savingsOpportunities: budgets.map(b => {
          const limit = b.limit || 0;
          const savingEstimate = Math.round(limit * 0.08);
          return {
            category: b.category,
            savingEstimate: savingEstimate,
            actionableTip: `Compare prices on ${b.category} to prune at least 8% (${currency} ${(savingEstimate || 0).toLocaleString()}) this cycle.`
          };
        }).slice(0, 3)
      };

      setAIInsights(computedLocalInsights);
      setIsInsightsStale(false);
      try {
        localStorage.setItem('fin_tracker_ai_insights', JSON.stringify(computedLocalInsights));
      } catch (_) {}
    }

    setLoadingInsights(false);
  };

  // Run dynamic advisor insights on startup or currency change with localStorage resilience
  useEffect(() => {
    if (isDataLoaded) {
      const cached = localStorage.getItem('fin_tracker_ai_insights');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setAIInsights(parsed);
          // If loaded from cache on startup, mark it stale relative to live database but don't force auto-fetch
          setIsInsightsStale(true);
        } catch (e) {
          console.warn("Could not parse cached insights:", e);
          fetchAIInsights();
        }
      } else {
        fetchAIInsights();
      }
    }
  }, [currency, isDataLoaded]);

  // Handler adding transactions
  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    const fresh: Transaction = {
      ...newTx,
      id: Math.random().toString(36).substring(2, 9)
    };
    setTransactions(prev => [fresh, ...prev]);

    if (user && !user.isDemo) {
      await supabase.from('transactions').insert({
        id: fresh.id,
        user_id: user.id,
        type: fresh.type,
        amount: fresh.amount,
        category: fresh.category,
        date: fresh.date,
        description: fresh.description
      });
    }

    // Mark insights stale to recommend on-demand compilation
    setIsInsightsStale(true);
  };

  // Handler editing transactions
  const handleUpdateTransaction = async (id: string, updated: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
    setEditingTx(null);

    if (user && !user.isDemo) {
      await supabase.from('transactions').update({
        type: updated.type,
        amount: updated.amount,
        category: updated.category,
        date: updated.date,
        description: updated.description
      }).eq('id', id);
    }

    setIsInsightsStale(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm("Are you sure you want to delete this log entry?")) {
      setTransactions(prev => prev.filter(t => t.id !== id));

      if (user && !user.isDemo) {
        await supabase.from('transactions').delete().eq('id', id);
      }

      setIsInsightsStale(true);
    }
  };

  // Handler modifying limits
  const handleUpdateBudget = async (category: string, limit: number) => {
    setBudgets(prev => {
      const idx = prev.findIndex(b => b.category === category);
      if (idx !== -1) {
        return prev.map(b => b.category === category ? { ...b, limit } : b);
      } else {
        return [...prev, { category, limit }];
      }
    });

    if (user && !user.isDemo) {
      const budgetId = `b-${user.id}-${category}`;
      await supabase.from('budgets').upsert({
        id: budgetId,
        user_id: user.id,
        category: category,
        limit: limit
      });
    }

    setIsInsightsStale(true);
  };

  const handleDeleteBudget = async (category: string) => {
    setBudgets(prev => prev.filter(b => b.category !== category));

    if (user && !user.isDemo) {
      await supabase.from('budgets').delete().eq('user_id', user.id).eq('category', category);
    }

    setIsInsightsStale(true);
  };

  // Snapshot control handlers
  const handleAddSnapshot = async (newSnapshot: Omit<MonthlySnapshot, 'id' | 'user_id' | 'created_at'>) => {
    const snapshotId = Math.random().toString(36).substring(2, 9);
    const userId = user ? user.id : 'demo-user';
    const createdAt = new Date().toISOString();

    const fresh: MonthlySnapshot = {
      ...newSnapshot,
      id: snapshotId,
      user_id: userId,
      created_at: createdAt
    };

    setSnapshots(prev => {
      const next = [fresh, ...prev];
      localStorage.setItem('fin_tracker_snapshots', JSON.stringify(next));
      return next;
    });

    if (user && !user.isDemo) {
      try {
        await supabase.from('snapshots').insert({
          id: fresh.id,
          user_id: fresh.user_id,
          month: fresh.month,
          created_at: fresh.created_at,
          total_income: fresh.total_income,
          total_expense: fresh.total_expense,
          net_savings: fresh.net_savings,
          savings_rate: fresh.savings_rate,
          income_categories: JSON.stringify(fresh.income_categories),
          expense_categories: JSON.stringify(fresh.expense_categories),
          transaction_count: fresh.transaction_count
        });
      } catch (err) {
        console.error("Failed to insert snapshot to Supabase:", err);
      }
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (confirm("Are you sure you want to delete this historical monthly snapshot?")) {
      setSnapshots(prev => {
        const next = prev.filter(s => s.id !== id);
        localStorage.setItem('fin_tracker_snapshots', JSON.stringify(next));
        return next;
      });

      if (user && !user.isDemo) {
        try {
          await supabase.from('snapshots').delete().eq('id', id);
        } catch (err) {
          console.error("Failed to delete snapshot from Supabase:", err);
        }
      }
    }
  };

  // Goal update handler
  const handleAddGoal = async (newGoal: Omit<SavingsGoal, 'id'>) => {
    const fresh: SavingsGoal = {
      ...newGoal,
      id: Math.random().toString(36).substring(2, 9)
    };
    setGoals(prev => [...prev, fresh]);

    if (user && !user.isDemo) {
      await supabase.from('savings_goals').insert({
        id: fresh.id,
        user_id: user.id,
        name: fresh.name,
        target: fresh.target,
        current: fresh.current,
        deadline: fresh.deadline || null
      });
    }
  };

  const handleUpdateGoalProgress = async (id: string, amount: number) => {
    const currentGoal = goals.find(g => g.id === id);
    if (!currentGoal) return;
    
    const nextVal = parseFloat((currentGoal.current + amount).toFixed(2));
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current: nextVal } : g));

    if (user && !user.isDemo) {
      await supabase.from('savings_goals').update({
        current: nextVal
      }).eq('id', id);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm("Are you sure you want to delete this savings target?")) {
      setGoals(prev => prev.filter(g => g.id !== id));

      if (user && !user.isDemo) {
        await supabase.from('savings_goals').delete().eq('id', id);
      }
    }
  };

  // Recurring schedules control handlers
  const handleAddRecurring = async (item: Omit<RecurringTransaction, 'id'>) => {
    const fresh: RecurringTransaction = {
      ...item,
      id: Math.random().toString(36).substring(2, 9)
    };
    setRecurringItems(prev => [...prev, fresh]);

    if (user && !user.isDemo) {
      await supabase.from('recurring_transactions').insert({
        id: fresh.id,
        user_id: user.id,
        type: fresh.type,
        amount: fresh.amount,
        category: fresh.category,
        description: fresh.description,
        day_of_month: fresh.dayOfMonth,
        auto_log: fresh.autoLog,
        last_logged_date: fresh.lastLoggedDate || null
      });
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    if (confirm("Are you sure you want to remove this recurring schedule template?")) {
      setRecurringItems(prev => prev.filter(r => r.id !== id));

      if (user && !user.isDemo) {
        await supabase.from('recurring_transactions').delete().eq('id', id);
      }
    }
  };

  const handleTriggerRecurringManually = async (id: string) => {
    const targetItem = recurringItems.find(r => r.id === id);
    if (!targetItem) return;

    const today = new Date();
    const freshTxId = 'man-rec-' + Math.random().toString(36).substring(2, 9);
    const dateStr = today.toISOString().split('T')[0];
    const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const newTx: Transaction = {
      id: freshTxId,
      type: targetItem.type,
      amount: targetItem.amount,
      category: targetItem.category,
      date: dateStr,
      description: `[Manual-Post] ${targetItem.description}`
    };

    setTransactions(prev => [newTx, ...prev]);
    setRecurringItems(prev => prev.map(r => r.id === id ? { ...r, lastLoggedDate: currentYearMonth } : r));

    if (user && !user.isDemo) {
      await supabase.from('transactions').insert({
        id: freshTxId,
        user_id: user.id,
        type: newTx.type,
        amount: newTx.amount,
        category: newTx.category,
        date: newTx.date,
        description: newTx.description
      });

      await supabase.from('recurring_transactions').update({
        last_logged_date: currentYearMonth
      }).eq('id', id);
    }

    setIsInsightsStale(true);
  };

  // Send message chat proxy call handler to `/api/advisor`
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setIsGeneratingMessage(true);

    if (user && !user.isDemo) {
      await supabase.from('chat_messages').insert({
        id: userMsg.id,
        user_id: user.id,
        role: userMsg.role,
        text: userMsg.text,
        timestamp: userMsg.timestamp
      });
    }

    let isFallbackNeeded = false;
    let fallbackErrorMsg = "";

    try {
      const history = [...chatMessages, userMsg];
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          transactions,
          budgets,
          savingsGoals: goals,
          currency
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          isFallbackNeeded = true;
          fallbackErrorMsg = "API endpoint returned 404 NOT FOUND.";
        } else {
          let errorMessage = "Advisor is temporarily locked.";
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            try {
              const errDetails = await response.json();
              errorMessage = errDetails.error || errorMessage;
            } catch (_) {}
          } else {
            try {
              const textHTML = await response.text();
              if (textHTML && textHTML.length < 250) {
                errorMessage = textHTML;
              } else {
                errorMessage = `Network or service error (Status ${response.status}).`;
              }
            } catch (_) {}
          }
          throw new Error(errorMessage);
        }
      } else {
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          isFallbackNeeded = true;
          fallbackErrorMsg = "Server returned non-JSON. Static host routing likely intercepted path.";
        } else {
          const result = await response.json();
          const aiMsg: ChatMessage = {
            id: Math.random().toString(36).substring(2, 9),
            role: 'model',
            text: result.text || "I was unable to formulate financial responses.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          setChatMessages(prev => [...prev, aiMsg]);

          if (user && !user.isDemo) {
            await supabase.from('chat_messages').insert({
              id: aiMsg.id,
              user_id: user.id,
              role: aiMsg.role,
              text: aiMsg.text,
              timestamp: aiMsg.timestamp
            });
          }
        }
      }
    } catch (e: any) {
      console.warn("Standard chatbot messenger failed, switching to backup router...", e);
      isFallbackNeeded = true;
      fallbackErrorMsg = e.message || "Endpoint connection failed.";
    }

    // Execute fallback routines (Local mathematically generated responses)
    if (isFallbackNeeded) {
      // Generate a highly contextual smart fallback locally in the browser if no API Key is set in client
      let replyText = "";
      const lowerText = text.toLowerCase();

      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const categorySpend: Record<string, number> = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
        categorySpend[t.category] = (categorySpend[t.category] || 0) + t.amount;
      });

      const overspentCategories = budgets.filter(b => {
        const spend = categorySpend[b.category] || 0;
        return spend > b.limit;
      });

      const approachingCategories = budgets.filter(b => {
        const spend = categorySpend[b.category] || 0;
        return spend > 0 && spend >= b.limit * 0.8 && spend <= b.limit;
      });

      if (lowerText.includes("budget") || lowerText.includes("constraint") || lowerText.includes("limit") || lowerText.includes("cutback") || lowerText.includes("overspends")) {
        replyText = `### Budget Optimization Assessment

Based on your current transaction history and configuration, here is an automated budget health check:

1. **Total Allocated Budget:** Your global target stands at **${currency} ${budgets.reduce((sum, b) => sum + b.limit, 0).toLocaleString()}** across ${budgets.length} key categories.
2. **Current Expenditures:** You have spent a total of **${currency} ${totalExpenses.toLocaleString()}** so far.
3. **Category Constraints:**
${overspentCategories.length > 0 
  ? overspentCategories.map(c => `   - ⚠️ **${c.category} (Overspent):** You have spent **${currency} ${(categorySpend[c.category] || 0).toLocaleString()}** against a limit of **${currency} ${c.limit.toLocaleString()}**.`).join('\n')
  : "   - ✅ All category limits are currently holding securely!"
}
${approachingCategories.length > 0
  ? approachingCategories.map(c => `   - ℹ️ **${c.category} (Approaching limit):** Spend is at **${currency} ${(categorySpend[c.category] || 0).toLocaleString()}** of **${currency} ${c.limit.toLocaleString()}** (${Math.round((categorySpend[c.category] / c.limit) * 100)}%).`).join('\n')
  : ""
}

**Immediate Optimization Strategies:**
- **High-Velocity Categories:** Prioritize reducing variable outflows inside overspent or high-velocity areas. Shifting small daily sums yields substantial cumulative results.
- **Weekly Boundaries:** Divide limits into weekly allowances to avoid bulk spending patterns early in the monthly cycle.`;
      } else if (lowerText.includes("spending") || lowerText.includes("outflow") || lowerText.includes("transaction") || lowerText.includes("expenditure")) {
        const topExpenses = [...transactions]
          .filter(t => t.type === 'expense')
          .sort((a,b) => b.amount - a.amount)
          .slice(0, 3);

        replyText = `### Outflows & Transactions Analysis

I have audited your transactions log (Total expense volume: **${currency} ${totalExpenses.toLocaleString()}**):

1. **Top Individual Outflows:**
${topExpenses.length > 0 
  ? topExpenses.map(t => `   - **${currency} ${t.amount.toLocaleString()}** in *${t.category}* on ${t.date} (${t.description || "No description"})`).join('\n')
  : "   - No logged transactions found yet to evaluate."
}
2. **Category Outflow Concentration:**
${Object.entries(categorySpend).length > 0
  ? Object.entries(categorySpend).map(([cat, val]) => `   - **${cat}:** ${currency} ${val.toLocaleString()} (${Math.round((val / totalExpenses) * 100)}% of total spent)`).join('\n')
  : "   - No categorizations registered."
}

**Actionable Recommendations:**
- Review the Top Outflows list and ask yourself if any of these large individual numbers can be substituted or minimized next cycle.
- Leverage category warnings inside the Budget portal to visualize your spending pace in real-time.`;
      } else if (lowerText.includes("save") || lowerText.includes("saving") || lowerText.includes("goal")) {
        replyText = `### Savings & Financial Milestones

Here is the progress report on your savings plans:

1. **Active Goals Count:** You are currently tracking **${goals.length}** goals.
2. **Savings Pipeline:** 
${goals.length > 0
  ? goals.map(g => `   - **${g.name}:** Saved **${currency} ${g.current_amount.toLocaleString()}** of **${currency} ${g.target_amount.toLocaleString()}** (${Math.round((g.current_amount / g.target_amount) * 100)}%). Target Date: ${g.deadline || "No date set"}.`).join('\n')
  : "   - You haven't started any savings targets. Setting up an active goal raises savings frequency by up to 2.5x!"
}

**Direct Recommendation:**
- Automated Transfers: Set up a recurring, day-of-pay bank transfer directly into your designated savings accounts. Treat savings as a fixed bill that must be settled before you allocate funds to discretionary categories!`;
      } else {
        replyText = `### Personal Financial Companion

Hello! I have reviewed your personal finance files and am ready to assist you:

1. **Financial Overview:**
   - **Total Budgets:** ${currency} ${budgets.reduce((sum, b) => sum + b.limit, 0).toLocaleString()} across ${budgets.length} areas.
   - **Recent Outflows:** ${transactions.length} items logged.
   - **Recent Cumulative Expenses:** ${currency} ${totalExpenses.toLocaleString()}.
   - **Savings Milestones:** ${goals.length} target goals tracked.

**What you can do:**
- Feel free to ask me to analyze your specific category budget constraints, inspect recent large bills, or offer customized savings tips!`;
      }

      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, aiMsg]);
    }

    setIsGeneratingMessage(false);
  };

  const handleOpenProfileModal = () => {
    const fn = user?.user_metadata?.first_name || user?.user_metadata?.firstName || '';
    const ln = user?.user_metadata?.last_name || user?.user_metadata?.lastName || '';
    setEditFirstName(fn);
    setEditLastName(ln);
    setProfileSuccess(null);
    setProfileError(null);
    setShowProfileModal(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirstName.trim()) {
      setProfileError("First name is required.");
      return;
    }
    if (!editLastName.trim()) {
      setProfileError("Last name is required.");
      return;
    }

    setIsProfileUpdating(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.updateUser({
          data: {
            first_name: editFirstName.trim(),
            last_name: editLastName.trim()
          }
        });

        if (error) throw error;
        
        if (data?.user) {
          setUser(data.user);
        }
        setProfileSuccess("Profile updated successfully!");
        setTimeout(() => {
          setShowProfileModal(false);
          setProfileSuccess(null);
        }, 1500);
      } else {
        // Local mock Sandbox Update
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const existingUsersStr = localStorage.getItem('fin_tracker_mock_users') || '[]';
        const existingUsers = JSON.parse(existingUsersStr);
        
        // Find if this mock user exists
        const userEmail = user?.email || 'demo_user@ledgersmart.com';
        const userIndex = existingUsers.findIndex((u: any) => u.email.toLowerCase() === userEmail.toLowerCase());
        
        const updatedMetadata = {
          first_name: editFirstName.trim(),
          last_name: editLastName.trim()
        };

        if (userIndex !== -1) {
          existingUsers[userIndex].user_metadata = updatedMetadata;
          localStorage.setItem('fin_tracker_mock_users', JSON.stringify(existingUsers));
          setUser(existingUsers[userIndex]);
        } else {
          // If not in standard records, create or update custom runtime mock user
          const mockUser = {
            ...user,
            user_metadata: updatedMetadata
          };
          existingUsers.push(mockUser);
          localStorage.setItem('fin_tracker_mock_users', JSON.stringify(existingUsers));
          setUser(mockUser);
        }

        setProfileSuccess("Profile updated successfully!");
        setTimeout(() => {
          setShowProfileModal(false);
          setProfileSuccess(null);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Profile update error:", err);
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setIsProfileUpdating(false);
    }
  };

  const [notificationStatusMsg, setNotificationStatusMsg] = useState<string | null>(null);

  const handleToggleBrowserNotifications = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationStatusMsg("System Notifications not supported on this device/sandboxing.");
      setTimeout(() => setNotificationStatusMsg(null), 4000);
      return;
    }

    if (Notification.permission === 'granted') {
      const targetState = !browserNotificationsEnabled;
      setBrowserNotificationsEnabled(targetState);
      setNotificationStatusMsg(targetState ? "Browser alerts activated!" : "Browser alerts muted.");
      setTimeout(() => setNotificationStatusMsg(null), 3500);
    } else if (Notification.permission === 'denied') {
      setNotificationStatusMsg("Notification permissions denied previously. Restore standard settings in your browser.");
      setTimeout(() => setNotificationStatusMsg(null), 4000);
    } else {
      Notification.requestPermission().then(status => {
        setNotificationPermissionState(status);
        if (status === 'granted') {
          setBrowserNotificationsEnabled(true);
          setNotificationStatusMsg("Browser alerts activated successfully!");
          try {
            new Notification("Ledger Smart Active alerts", {
              body: "Real-time alerts are now synchronized.",
            });
          } catch (e) {
            console.warn(e);
          }
        } else {
          setBrowserNotificationsEnabled(false);
          setNotificationStatusMsg("Permission was dismissed.");
        }
        setTimeout(() => setNotificationStatusMsg(null), 3500);
      });
    }
  };

  const resetNotificationTriggerHistory = () => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    localStorage.removeItem(`fin_tracker_notified_categories_${currentMonth}`);
    setNotificationStatusMsg("Trigger counters reset! New expenses will trigger native alerts.");
    setTimeout(() => setNotificationStatusMsg(null), 3500);
  };

  const handleMarkAllAsRead = () => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const alertKeys = currentMonthBudgetAlerts.map(alert => `${currentMonth}:${alert.category}`);
    setReadBudgetAlerts(prev => {
      const next = Array.from(new Set([...prev, ...alertKeys]));
      localStorage.setItem('fin_tracker_read_budget_alerts', JSON.stringify(next));
      return next;
    });
    setNotificationStatusMsg("All notifications marked as read.");
    setTimeout(() => setNotificationStatusMsg(null), 3000);
  };

  const handleResetReadAlerts = () => {
    setReadBudgetAlerts([]);
    localStorage.removeItem('fin_tracker_read_budget_alerts');
    setNotificationStatusMsg("Dismissed alerts restaged into unread queue!");
    setTimeout(() => setNotificationStatusMsg(null), 3000);
  };

  const handleClearHistory = async () => {
    if (confirm("Confirm erasing chatbot conversational memory?")) {
      setChatMessages([]);
      if (user && !user.isDemo) {
        await supabase.from('chat_messages').delete().eq('user_id', user.id);
      }
    }
  };

  const handleResetAllData = async () => {
    setTransactions([]);
    setBudgets([]);
    setGoals([]);
    setChatMessages([]);
    setRecurringItems([]);
    setSnapshots([]);
    localStorage.removeItem('fin_tracker_snapshots');

    if (user && !user.isDemo) {
      await supabase.from('transactions').delete().eq('user_id', user.id);
      await supabase.from('budgets').delete().eq('user_id', user.id);
      await supabase.from('savings_goals').delete().eq('user_id', user.id);
      await supabase.from('chat_messages').delete().eq('user_id', user.id);
      await supabase.from('recurring_transactions').delete().eq('user_id', user.id);
      await supabase.from('snapshots').delete().eq('user_id', user.id);
    }
    
    setShowResetModal(false);
    
    setIsInsightsStale(true);
  };

  const handleSaveTemplate = async (newTemplate: BudgetTemplate) => {
    setCustomTemplates(prev => {
      const idx = prev.findIndex(t => t.id === newTemplate.id);
      if (idx !== -1) {
        return prev.map(t => t.id === newTemplate.id ? newTemplate : t);
      }
      return [newTemplate, ...prev];
    });

    if (user && !user.isDemo) {
      await supabase.from('budget_templates').upsert({
        id: newTemplate.id,
        user_id: user.id,
        name: newTemplate.name,
        description: newTemplate.description,
        incomes: JSON.stringify(newTemplate.incomes),
        expenses: JSON.stringify(newTemplate.expenses)
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm("Are you sure you want to delete this blueprint?")) {
      setCustomTemplates(prev => prev.filter(t => t.id !== id));

      if (user && !user.isDemo) {
        await supabase.from('budget_templates').delete().eq('id', id);
      }
    }
  };

  const handleApplyTemplate = (options: {
    templateId: string;
    targetMonth: string;
    updateBudgets: boolean;
    generateTransactions: boolean;
  }) => {
    const { templateId, targetMonth, updateBudgets, generateTransactions } = options;
    
    const defaults: BudgetTemplate[] = [
      {
        id: 't-default-1',
        name: '50/30/20 Balanced Plan',
        description: 'Classic budgeting rules: 50% for fixed needs (Housing, Utilities), 30% for wants (Entertainment, Shopping), and 20% to savings.',
        incomes: [
          { name: 'Core Job Salary', expectedAmount: 4500 }
        ],
        expenses: [
          { category: 'Housing', targetAmount: 1350 },
          { category: 'Food', targetAmount: 500 },
          { category: 'Utilities', targetAmount: 200 },
          { category: 'Transport', targetAmount: 150 },
          { category: 'Shopping', targetAmount: 300 },
          { category: 'Entertainment', targetAmount: 200 },
          { category: 'Savings', targetAmount: 900 }
        ]
      },
      {
        id: 't-default-2',
        name: 'Frugal / Accelerated Saver',
        description: 'Maximizes saving speed. Targets lower housing ratios and tight food bounds with aggressive green targets.',
        incomes: [
          { name: 'Salary Outflow', expectedAmount: 4000 },
          { name: 'Freelance Side Work', expectedAmount: 850 }
        ],
        expenses: [
          { category: 'Housing', targetAmount: 1000 },
          { category: 'Food', targetAmount: 300 },
          { category: 'Utilities', targetAmount: 180 },
          { category: 'Transport', targetAmount: 100 },
          { category: 'Savings', targetAmount: 2605 }
        ]
      }
    ];

    const template = [...defaults, ...customTemplates].find(t => t.id === templateId);
    if (!template) return;

    // Overwrite category budgets limits if selected
    if (updateBudgets) {
      setBudgets(prev => {
        const updated = [...prev];
        template.expenses.forEach(async (exp) => {
          const idx = updated.findIndex(b => b.category === exp.category);
          if (idx !== -1) {
            updated[idx] = { category: exp.category, limit: exp.targetAmount };
          } else {
            updated.push({ category: exp.category, limit: exp.targetAmount });
          }

          if (user && !user.isDemo) {
            const budgetId = `b-${user.id}-${exp.category}`;
            await supabase.from('budgets').upsert({
              id: budgetId,
              user_id: user.id,
              category: exp.category,
              limit: exp.targetAmount
            });
          }
        });
        return updated;
      });
    }

    // Insert starting transactions
    if (generateTransactions) {
      const generated: Transaction[] = [];
      const daySuffix = '01';
      const fullDatePattern = `${targetMonth}-${daySuffix}`;

      // Expected Inflows
      template.incomes.forEach(inc => {
        const txId = 'gen-inc-' + Math.random().toString(36).substring(2, 9);
        const newTx: Transaction = {
          id: txId,
          type: 'income',
          amount: inc.expectedAmount,
          category: 'Income',
          date: fullDatePattern,
          description: `Loaded Expected Inflow: ${inc.name}`
        };
        generated.push(newTx);

        if (user && !user.isDemo) {
          supabase.from('transactions').insert({
            id: txId,
            user_id: user.id,
            type: newTx.type,
            amount: newTx.amount,
            category: newTx.category,
            date: newTx.date,
            description: newTx.description
          });
        }
      });

      // Targets Spends (skip savings category logs since that acts strictly as transfer in actual app)
      template.expenses.forEach(exp => {
        if (exp.category === 'Savings') return;
        const txId = 'gen-exp-' + Math.random().toString(36).substring(2, 9);
        const newTx: Transaction = {
          id: txId,
          type: 'expense',
          amount: exp.targetAmount,
          category: exp.category,
          date: fullDatePattern,
          description: `Loaded Target: Rent/Baseline for ${exp.category}`
        };
        generated.push(newTx);

        if (user && !user.isDemo) {
          supabase.from('transactions').insert({
            id: txId,
            user_id: user.id,
            type: newTx.type,
            amount: newTx.amount,
            category: newTx.category,
            date: newTx.date,
            description: newTx.description
          });
        }
      });

      setTransactions(prev => [...generated, ...prev]);
    }

    // Mark insights stale to require compilations on user command
    setIsInsightsStale(true);
  };

  const triggerAIBudgetAssistant = () => {
    setActiveTab('ai');
    handleSendMessage("Analyze my category budgets constraints vs spent volumes, and suggest optimization strategies.");
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 dark:bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin" />
          <h2 className="text-sm font-bold tracking-widest uppercase font-mono text-slate-400">Securing Ledger Smart...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950' : 'bg-slate-50'} transition-colors duration-250`}>
        <Login onDemoBypass={(mockUser) => setUser(mockUser)} />
      </div>
    );
  }

  // Compute user first name
  const rawFirstName = user?.user_metadata?.first_name || user?.user_metadata?.firstName;
  const userFirstName = rawFirstName
    ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()
    : (user?.email ? user.email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + user.email.split('@')[0].split('.')[0].slice(1).toLowerCase() : 'User');

  // Detect if database contains seeded dummy data to offer one-click cleanup
  const hasSeededData = transactions.some(t => t.id === '1' || t.id === '2');

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50/70 text-gray-800'} transition-colors duration-200 antialiased flex flex-col font-sans pb-16 lg:pb-6`}>
      
      {/* Toast Alert Banner for Login Success */}
      {loginNotification && (
        <div id="login-success-toast" className="fixed top-5 right-5 z-100 max-w-sm w-full">
          <div className="bg-emerald-600 text-white rounded-2xl shadow-xl p-3.5 border border-emerald-500/30 flex items-center justify-between gap-3 backdrop-blur-md bg-opacity-95 transform translate-y-0 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/15 rounded-xl">
                <CheckCircle className="w-4.5 h-4.5 text-white animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-normal mb-0.5">Successfully logged in</p>
                <p className="text-[10px] text-emerald-100/90 font-mono leading-none">Secure session active</p>
              </div>
            </div>
            <button 
              onClick={() => setLoginNotification(null)}
              className="text-white hover:text-emerald-100 p-1 cursor-pointer hover:bg-white/10 rounded-lg transition-colors border-0 bg-transparent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Top Elegant bar */}
      <header className="bg-white dark:bg-slate-905 border-b border-gray-150 dark:border-slate-805/80 py-4 px-6 sticky top-0 z-40 shadow-2xs transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-950 dark:text-white tracking-tight">Ledger Smart</h1>
                <span className="hidden sm:inline-block h-3.5 w-px bg-gray-200 dark:bg-slate-800" />
                <button
                  onClick={handleOpenProfileModal}
                  title="Click to edit profile name"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                >
                  Welcome, {userFirstName}!
                </button>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono tracking-wider font-semibold">PERSONAL FINANCE COMPANION</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Supabase Authentication Status & Sign Out */}
            {user && (
              <div className="flex items-center gap-2 mr-1">
                <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400 max-w-[150px] truncate hidden sm:inline" title={user.email}>
                  {user.isDemo ? (user.email === 'demo_user@ledgersmart.com' ? 'Local Workspace' : user.email) : user.email}
                </span>
                <button
                  onClick={handleOpenProfileModal}
                  title="Edit Profile Name (First & Last Name)"
                  className="p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                  }}
                  title="Sign Out of Ledger Smart"
                  className="p-2.5 border border-red-200 dark:border-red-950 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to Light App Theme" : "Switch to Dark App Theme"}
              className="p-2 border border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer text-slate-500 dark:text-slate-400"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Print Overview Report */}
            <button
              onClick={() => window.print()}
              title="Print Clean PDF Overview Report"
              className="p-2 border border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900"
            >
              <Printer className="w-4 h-4 text-blue-500" />
              <span className="hidden md:inline text-xs font-semibold tracking-wide">Print Overview</span>
            </button>

            {/* Export to PDF */}
            <button
              onClick={exportToPDF}
              title="Download Financial Report PDF"
              className="p-2 border border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-200 dark:hover:border-emerald-900"
            >
              <Printer className="w-4 h-4 text-emerald-500" />
              <span className="hidden md:inline text-xs font-semibold tracking-wide">Export PDF</span>
            </button>

            {/* Notification Bell with Dropdown Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                title="Current Month Budget Alerts & Notifications"
                className={`p-2 border rounded-xl transition-all cursor-pointer flex items-center justify-center relative ${
                  unreadBudgetAlerts.length > 0 
                    ? 'bg-amber-50/50 dark:bg-amber-955/15 border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-105 dark:hover:bg-slate-900' 
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {unreadBudgetAlerts.length > 0 ? (
                  <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <Bell className="w-4 h-4 shrink-0" />
                )}
                {unreadBudgetAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-[9px] text-white flex items-center justify-center rounded-full font-extrabold border-2 border-white dark:border-slate-905">
                    {unreadBudgetAlerts.length}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <>
                  {/* Overlay to dismiss */}
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowNotificationDropdown(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-155 dark:border-slate-800/90 shadow-xl p-4 space-y-3 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2">
                      <span className="font-bold text-gray-901 dark:text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-blue-500" />
                        <span>Monthly Budget Alerts</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 rounded-full py-0.5 px-2 text-slate-500 dark:text-slate-400">
                        {new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Status Feedback banner */}
                    {notificationStatusMsg && (
                      <div className="bg-blue-50 dark:bg-blue-955/20 border border-blue-100 dark:border-blue-900/40 p-2 rounded-xl text-[10px] text-blue-800 dark:text-blue-400 font-medium animate-fade-in text-center">
                        {notificationStatusMsg}
                      </div>
                    )}

                    {/* Channel Controls Configuration */}
                    <div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-800 dark:text-slate-200 text-[11px]">System Browser Popups</p>
                          <p className="text-[9px] text-slate-400 leading-normal">Pushes HTML5 native browser alerts on thresholds</p>
                        </div>
                        <button
                          onClick={handleToggleBrowserNotifications}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-0 ${
                            browserNotificationsEnabled && notificationPermissionState === 'granted'
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-gray-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-750'
                          }`}
                        >
                          {browserNotificationsEnabled && notificationPermissionState === 'granted' ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      {/* Display warning details on permission restrictions */}
                      {notificationPermissionState === 'default' && (
                        <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium leading-normal">
                          ⚠️ Click button to trigger system authentication first.
                        </p>
                      )}
                      {notificationPermissionState === 'denied' && (
                        <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                          ℹ️ Sandboxed Environment Fallback: Native browser popups are restricted in preview screens. Ledger's real-time visual progress gauges, badges, and warning thresholds are fully automated and active below!
                        </p>
                      )}
                    </div>

                    {/* Main items triggers */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-left">
                      {unreadBudgetAlerts.length === 0 ? (
                        <div className="text-center py-4 text-slate-450 dark:text-slate-500 space-y-1">
                          <p className="font-bold text-gray-800 dark:text-slate-200">✓ All Alerts Handled</p>
                          <p className="text-[10px] leading-relaxed">
                            {currentMonthBudgetAlerts.length > 0 
                              ? `You have marked all ${currentMonthBudgetAlerts.length} active budget alerts as read.` 
                              : "Every monitored expense category is healthy and under 90% of budget constraints for this month."
                            }
                          </p>
                        </div>
                      ) : (
                        unreadBudgetAlerts.map(alert => (
                          <div key={alert.category} className="p-2.5 border border-amber-100/60 dark:border-amber-955/30 bg-amber-50/25 dark:bg-amber-955/5 rounded-xl flex items-center justify-between gap-3">
                            <div className="space-y-0.5 text-left flex-1 min-w-0">
                              <p className="font-bold text-gray-800 dark:text-slate-200 truncate">{alert.category}</p>
                              <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden my-1">
                                <div 
                                  className={`h-full transition-all duration-300 ${alert.percent >= 100 ? 'bg-red-500' : 'bg-amber-500'}`} 
                                  style={{ width: `${Math.min(alert.percent, 100)}%` }} 
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tight block">
                                {currencySymbol}{alert.spent.toFixed(0)} spent / {currencySymbol}{alert.limit.toFixed(0)} limit
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono select-none shrink-0 ${
                              alert.percent >= 100 
                                ? 'bg-red-100 text-red-850 dark:bg-red-955/20 dark:text-red-400 border border-red-200/50 dark:border-red-950/40' 
                                : 'bg-amber-100 text-amber-850 dark:bg-amber-955/20 dark:text-amber-400 border border-amber-200/50 dark:border-amber-950/40'
                            }`}>
                              {alert.percent}%
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex flex-col gap-2 border-t border-gray-100 dark:border-slate-800 pt-2.5">
                      <div className="flex items-center justify-between text-[10px] gap-2 pt-0.5">
                        {unreadBudgetAlerts.length > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-750 dark:hover:text-blue-355 font-bold hover:underline cursor-pointer bg-transparent border-0 p-0"
                          >
                            ✓ Mark all as read
                          </button>
                        )}
                        {readBudgetAlerts.length > 0 && (
                          <button
                            onClick={handleResetReadAlerts}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer bg-transparent border-0 p-0 flex items-center gap-1"
                          >
                            Show Dismissed
                          </button>
                        )}
                        <span className="text-slate-450 dark:text-slate-500 ml-auto select-none">Rules at &gt;= 90%</span>
                      </div>
                      <div className="flex items-center justify-end border-t border-gray-50 dark:border-slate-805/40 pt-1.5 text-[10px]">
                        <button
                          onClick={resetNotificationTriggerHistory}
                          title="Clear triggered triggers log so you can test them again"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold hover:underline cursor-pointer bg-transparent border-0 p-0"
                        >
                          Reset Trigger History
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-1.5 border border-gray-150 dark:border-slate-800 rounded-xl px-2.5 py-1.5 bg-gray-50/50 dark:bg-slate-900/40 hover:bg-gray-50 dark:hover:bg-gray-900 duration-150 hover:border-gray-255 dark:hover:border-slate-755 transition-colors">
              <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 font-mono tracking-wider hidden sm:inline">Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-transparent border-0 text-gray-700 dark:text-slate-250 text-xs font-bold cursor-pointer focus:outline-hidden"
                id="currency-selector"
              >
                <option value="Ksh" className="dark:bg-slate-900">Ksh (KES)</option>
                <option value="USD" className="dark:bg-slate-900">USD ($)</option>
                <option value="EUR" className="dark:bg-slate-900">EUR (€)</option>
              </select>
            </div>

            {/* Quick Stats Header */}
            <div className="hidden md:flex items-center gap-6 text-xs border-l border-gray-200 dark:border-slate-800 pl-4">
              <div>
                <span className="text-gray-400 dark:text-slate-550 font-medium font-mono text-[9px] uppercase">Cash Flow Velocity</span>
                <p className="font-bold text-gray-800 dark:text-slate-200 font-mono mt-0.5 animate-pulse">Live Tracking</p>
              </div>
              {aiInsights && (
                <div className="border-l border-gray-200 dark:border-slate-800 pl-4 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    aiInsights.overallStatus === 'On Track' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  }`} />
                  <div>
                    <span className="text-gray-400 dark:text-slate-550 font-medium font-mono text-[9px] uppercase">Smart Status</span>
                    <p className="font-bold text-gray-800 dark:text-slate-200 font-mono mt-0.5">{aiInsights.overallStatus}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Core */}
      <main id="main-content" className="max-w-7xl mx-auto w-full px-4 pt-8 pb-28 lg:pb-8 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar Drawer */}
        <aside className="hidden lg:block lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-3xs space-y-2 transition-colors">
            <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-3 block mb-2">Workspace Modules</span>

            {/* Dashboard Link */}
            <button
              onClick={() => { setActiveTab('dash'); setEditingTx(null); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'dash'
                  ? 'bg-blue-600 text-white shadow-xs font-bold font-semibold'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              Overview Matrix
            </button>

            {/* Add & Ledger Link */}
            <button
              onClick={() => { setActiveTab('ledger'); setEditingTx(null); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-blue-600 text-white shadow-xs font-bold font-semibold'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Receipt className="w-4.5 h-4.5" />
              Transaction Ledger
            </button>

            {/* Budgets Link */}
            <button
              onClick={() => { setActiveTab('finance'); setEditingTx(null); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'finance'
                  ? 'bg-blue-600 text-white shadow-xs font-bold font-semibold'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Scale className="w-4.5 h-4.5" />
              Budget Targets
            </button>

            {/* Savings goals link */}
            <button
              onClick={() => { setActiveTab('savings'); setEditingTx(null); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'savings'
                  ? 'bg-blue-600 text-white shadow-xs font-bold font-semibold'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <PiggyBank className="w-4.5 h-4.5" />
              Savings Reserve
            </button>

            {/* Budget Blueprints Link */}
            <button
              onClick={() => { setActiveTab('templates'); setEditingTx(null); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'templates'
                  ? 'bg-blue-600 text-white shadow-xs font-bold font-semibold'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <FolderHeart className="w-4.5 h-4.5" />
              Budget Blueprints
            </button>

            {/* Fixed Expenses Link */}
            <button
              onClick={() => { setActiveTab('recurring'); setEditingTx(null); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'recurring'
                  ? 'bg-blue-600 text-white shadow-xs font-bold font-semibold'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <CalendarClock className="w-4.5 h-4.5" />
              Fixed Monthly Spends
            </button>

            {/* AI advisor link */}
            <button
              onClick={() => { setActiveTab('ai'); setEditingTx(null); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-blue-600 text-white shadow-xs font-bold font-semibold'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4.5 h-4.5" />
              Gemini Advisor Chat
            </button>

            {/* Monthly Reports Link */}
            <button
              id="sidebar-nav-reports"
              onClick={() => { setActiveTab('reports'); setEditingTx(null); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-xs font-bold font-semibold'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4.5 h-4.5" />
              Monthly Reports
            </button>
          </div>

          {/* Preferences & Utilities Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-3xs space-y-2.5 transition-colors">
            <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-3 block">System Utilities</span>
            
            <button
              onClick={() => setShowResetModal(true)}
              className="w-full flex items-center gap-3 py-2 px-3.5 rounded-xl text-xs font-semibold text-red-650 dark:text-red-400 hover:text-red-750 dark:hover:text-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-100/30 dark:hover:border-red-900/30 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
              Reset App Data
            </button>
          </div>

          {/* Prompt context banner if not active on chatbot */}
          {activeTab !== 'ai' && (
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-blue-400" />
                <h4 className="font-bold text-xs text-slate-100 uppercase tracking-widest">Counselor Offline</h4>
              </div>
              <p className="text-[11px] text-slate-350 leading-relaxed font-medium">
                Gemini AI is reviewing spent velocities. Request tailored optimization summaries or chat live to explore strategy metrics.
              </p>
              <button
                onClick={() => setActiveTab('ai')}
                className="w-full text-center py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Go to Advisor Chat
              </button>
            </div>
          )}
        </aside>

        {/* Primary Screen Area */}
        <section className="lg:col-span-3 space-y-8 min-h-[500px]">
          
          {/* Top Real-time Smart Advice Banner (on overview) */}
          {activeTab === 'dash' && (
            <div className="space-y-6">
              {/* Proactive Seeding Wiping Alert Card */}
               {hasSeededData && user && (
                 <div className="p-4 bg-amber-50/70 dark:bg-amber-955/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                   <div className="space-y-1">
                     <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-400 flex items-center gap-1.5">
                       <Info className="w-4.5 h-4.5 text-amber-600 dark:text-amber-500 animate-pulse" />
                       Initial Portfolio Setup Active
                     </h4>
                     <p className="text-[11px] text-amber-700 dark:text-slate-400 font-medium leading-relaxed">
                       To start your ledger tracker with a completely clean slate, clear the default entries and start from a fresh $0.00 balance state.
                     </p>
                   </div>
                   <button
                     onClick={async () => {
                       if (window.confirm("Are you sure you want to delete all initial transactions, budgets, and savings goals? This clears your ledger of all custom files and records.")) {
                         await handleResetAllData();
                       }
                     }}
                     className="py-1.5 px-3.5 bg-amber-600 hover:bg-amber-750 dark:bg-amber-700 dark:hover:bg-amber-600 text-white text-[10px] font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0 animate-pulse font-sans font-semibold"
                   >
                     Clear & Start Fresh
                   </button>
                 </div>
               )}

              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-5 transition-colors">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Gemini Smart Diagnostics</h3>
                </div>
                <button
                  onClick={fetchAIInsights}
                  disabled={loadingInsights}
                  className="text-[10px] font-bold border border-gray-200 text-gray-500 hover:bg-gray-50 py-1 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer relative"
                >
                  {isInsightsStale && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                  )}
                  <RefreshCw className={`w-3 h-3 ${loadingInsights ? 'animate-spin' : ''}`} />
                  {isInsightsStale ? 'Update' : 'Refresh'}
                </button>
              </div>

              {loadingInsights ? (
                <div className="flex items-center gap-3 py-6 justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-purple-600 animate-spin" />
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-widest font-mono">Synthesizing spend logs...</span>
                </div>
              ) : insightsError ? (
                /* Sleek static general wealth tips fallback with specific error handling alerts */
                <div className="space-y-4">
                  {insightsError.includes("QUOTA_EXHAUSTED") ? (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 dark:bg-amber-955/15 dark:border-amber-900/40 rounded-xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-2 text-amber-805 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Gemini Rate Limit Throttled (429)</span>
                      </div>
                      <p className="text-[11px] font-medium text-amber-850/80 dark:text-amber-400/80 leading-relaxed">
                        You have fully consumed the 20 queries daily standard Gemini free quota limit on your API key. To safeguard your experience, Ledger Smart has automatically engaged the offline analytical framework below!
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50/70 border border-slate-200/60 dark:bg-slate-905 dark:border-slate-805 rounded-xl space-y-1 my-1">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-400">
                        <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Diagnostics Fallback Engaged</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-mono">
                        {insightsError}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase py-0.5 px-2.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 dark:bg-slate-900 dark:text-blue-400 dark:border-slate-800">
                      Standard Guidelines Active
                    </span>
                    <p className="text-xs font-semibold text-gray-700 dark:text-slate-300 leading-relaxed">
                      Structured guidelines to benchmark and improve your cash flow stability.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-805">
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">The 50/30/20 Rule</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Benchmark your capital inflows: assign 50% to essential needs, 30% to wants, and reserve 20% for future stability goals.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-2">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-500" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Reserve Safe Buffer</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Aim to construct an Emergency Safety Net covering 3 to 6 months of fundamental outflows to stand firm against unexpected events.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Evaluate Fixed Costs</h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Wipe out under-utilized sub-bills! Auditing fixed contracts monthly avoids sneaky wealth drain lines inside empty spaces.
                      </p>
                    </div>
                  </div>
                </div>
              ) : aiInsights ? (
                /* Interactive custom parsed advice widgets */
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase py-0.5 px-2.5 rounded-full ${
                      aiInsights.overallStatus === 'On Track' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {aiInsights.overallStatus}
                    </span>
                    <p className="text-xs font-semibold text-gray-700 leading-relaxed">
                      {aiInsights.summaryMessage}
                    </p>
                  </div>

                  {/* Bullet tips list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Observed spend trends</span>
                      <ul className="space-y-2">
                        {aiInsights.actionableInsights.map((insight, idx) => (
                          <li key={idx} className="text-xs text-gray-600 leading-relaxed font-semibold flex items-start gap-2">
                            <span className="text-blue-500 mt-1 shrink-0">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Estimated Savings suggestions</span>
                      <div className="space-y-2">
                        {aiInsights.savingsOpportunities.map((op, idx) => (
                          <div key={idx} className="p-2.5 bg-purple-50/50 border border-purple-100/30 rounded-xl leading-relaxed">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-purple-900">{op.category} Savings target</span>
                              <span className="text-emerald-700 font-mono">+{currencySymbol}{op.savingEstimate}</span>
                            </div>
                            <p className="text-[10px] text-purple-700 font-medium mt-1">
                              {op.actionableTip}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          )}

          {/* Active rendering tabs content */}
          {activeTab === 'dash' && (
            <Dashboard 
              transactions={transactions} 
              budgets={budgets} 
              currencySymbol={currencySymbol}
              aiInsights={aiInsights}
              loadingInsights={loadingInsights}
              userFirstName={userFirstName}
            />
          )}

          {activeTab === 'ledger' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TransactionList
                   transactions={transactions}
                   onDeleteTransaction={handleDeleteTransaction}
                   onEditTransaction={(tx) => {
                     setEditingTx(tx);
                   }}
                   currencySymbol={currencySymbol}
                   onAskAIAboutTrends={(q) => {
                     setActiveTab('ai');
                     handleSendMessage(q);
                   }}
                />
              </div>
              <div className="lg:col-span-1">
                <TransactionForm
                  onAddTransaction={handleAddTransaction}
                  onUpdateTransaction={handleUpdateTransaction}
                  editingTransaction={editingTx}
                  onCancelEdit={() => setEditingTx(null)}
                  currencySymbol={currencySymbol}
                />
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <BudgetManager
              budgets={budgets}
              transactions={transactions}
              onUpdateBudget={handleUpdateBudget}
              onDeleteBudget={handleDeleteBudget}
              currencySymbol={currencySymbol}
              onAskAIAboutBudget={triggerAIBudgetAssistant}
            />
          )}

          {activeTab === 'savings' && (
            <SavingsGoals
              goals={goals}
              onAddGoal={handleAddGoal}
              onUpdateGoalProgress={handleUpdateGoalProgress}
              onDeleteGoal={handleDeleteGoal}
              currencySymbol={currencySymbol}
            />
          )}

          {activeTab === 'ai' && (
            <AIAssistant
              transactions={transactions}
              budgets={budgets}
              savingsGoals={goals}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isGenerating={isGeneratingMessage}
              onClearHistory={handleClearHistory}
            />
          )}

          {activeTab === 'templates' && (
            <BudgetTemplates
              templates={customTemplates}
              onSaveTemplate={handleSaveTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onApplyTemplate={handleApplyTemplate}
              currencySymbol={currencySymbol}
            />
          )}

          {activeTab === 'recurring' && (
            <RecurringManager
              recurringItems={recurringItems}
              onAddRecurring={handleAddRecurring}
              onDeleteRecurring={handleDeleteRecurring}
              onTriggerRecurringManually={handleTriggerRecurringManually}
              currencySymbol={currencySymbol}
            />
          )}

          {activeTab === 'reports' && (
            <MonthlyReports
              transactions={transactions}
              currencySymbol={currencySymbol}
              snapshots={snapshots}
              onAddSnapshot={handleAddSnapshot}
              onDeleteSnapshot={handleDeleteSnapshot}
            />
          )}

        </section>

      </main>

      {/* Mobile Bottom Navigation Bar styled cleanly with dynamic indicators */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800 flex items-center justify-around py-2 px-1 lg:hidden shadow-lg transition-colors duration-150">
        <button 
          onClick={() => { setActiveTab('dash'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'dash' ? 'text-blue-600 dark:text-blue-400 font-bold scale-105' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Overview</span>
        </button>
        <button 
          onClick={() => { setActiveTab('ledger'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'ledger' ? 'text-blue-600 dark:text-blue-400 font-bold scale-105' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Ledger</span>
        </button>
        <button 
          onClick={() => { setActiveTab('finance'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'finance' ? 'text-blue-600 dark:text-blue-400 font-bold scale-105' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <Scale className="w-5 h-5" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Budgets</span>
        </button>
        <button 
          onClick={() => { setActiveTab('reports'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'reports' ? 'text-blue-600 dark:text-blue-400 font-bold scale-105' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Reports</span>
        </button>
        <button 
          onClick={() => { setActiveTab('recurring'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'recurring' ? 'text-blue-600 dark:text-blue-400 font-bold scale-105' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <CalendarClock className="w-5 h-5" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Fixed</span>
        </button>
        <button 
          onClick={() => { setActiveTab('ai'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'ai' ? 'text-blue-600 dark:text-blue-400 font-bold scale-105' : 'text-slate-400 dark:text-slate-500'}`}
        >
          <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Gemini</span>
        </button>
      </nav>

      {/* Footer info line */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-150 dark:border-slate-800 py-5 text-center mt-12 text-[10px] font-medium font-mono text-gray-400 dark:text-slate-500 transition-colors">
        Ledger Smart Tracker Portfolio Corporation © 2026. All statistics are encrypted securely client-side.
      </footer>

      {/* Reset Confirmation Drawer / Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-150 dark:border-slate-800 relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-red-550/10 text-red-650 dark:text-red-400 rounded-2xl mt-0.5">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Reset Application Data</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  You are about to wipe out all seed placeholder transactions, category budgets, and savings goals. This allows you to start tracking your real funds and statistics on a completely clean canvas.
                </p>
              </div>
            </div>

            <div className="bg-red-50/50 dark:bg-red-955/10 rounded-xl p-4 border border-red-100 dark:border-red-900/30 text-[11px] leading-relaxed text-red-800 dark:text-red-305 space-y-2">
              <p className="font-bold uppercase tracking-wider text-[9px] text-red-650 dark:text-red-400">Warning: Irreversible Operation</p>
              <ul className="list-disc pl-4 space-y-1 font-medium">
                <li>Permanently deletes the {transactions.length} pre-filled placeholder transactions inside your Ledger ledger.</li>
                <li>Clears your {budgets.length} budget limit constraints entirely.</li>
                <li>Wipes out {goals.length} active savings Goals and their accrued progressions.</li>
                <li>Purges historical conversational chatbot logs.</li>
              </ul>
              <p className="mt-2 text-red-700/80 dark:text-red-300/80">
                Your selected currency settings (<span className="font-bold underline">{currency}</span>) will be retained.
              </p>
            </div>

            {/* Checkbox option to also erase custom templates */}
            <div className="flex items-center gap-2 pt-1 font-sans">
              <input
                type="checkbox"
                id="delete-templates-chk"
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-750 bg-white dark:bg-slate-950 rounded-md focus:ring-blue-500 cursor-pointer"
                defaultChecked={false}
              />
              <label htmlFor="delete-templates-chk" className="text-xs text-gray-650 dark:text-slate-350 font-medium select-none cursor-pointer">
                Also remove my {customTemplates.length} custom saved budget templates/blueprints
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => setShowResetModal(false)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-750 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const checkEl = document.getElementById('delete-templates-chk') as HTMLInputElement;
                  if (checkEl && checkEl.checked) {
                    setCustomTemplates([]);
                    localStorage.removeItem('fin_tracker_custom_templates');
                  }
                  handleResetAllData();
                }}
                className="py-2.5 px-5 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Clean App Slate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modification Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 transition-all animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-150 dark:border-slate-800 relative space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-650 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-blue-105 bg-blue-50 dark:bg-blue-955 text-blue-600 dark:text-blue-400 rounded-2xl mt-0.5">
                <User className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-905 dark:text-slate-100">Edit Profile Name</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Update your identity details below. Your new first name will display on your workspace and reports.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                  Registered Email Address
                </label>
                <div className="py-2 px-3.5 border border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-950 text-xs font-mono font-medium text-slate-500 dark:text-slate-400 select-all truncate">
                  {user?.email}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="editFirstName" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                    First Name
                  </label>
                  <input
                    id="editFirstName"
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="e.g. John"
                    className="block w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-955 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="editLastName" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
                    Last Name
                  </label>
                  <input
                    id="editLastName"
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="e.g. Doe"
                    className="block w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-955 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all shadow-xs"
                  />
                </div>
              </div>

              {profileError && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-950 p-2.5 flex gap-2">
                  <p className="text-[10px] text-red-800 dark:text-red-400 font-medium leading-relaxed">
                    ⚠️ {profileError}
                  </p>
                </div>
              )}

              {profileSuccess && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-950 p-2.5 flex gap-2">
                  <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-medium leading-relaxed">
                    ✓ {profileSuccess}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="py-2 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-750 dark:text-slate-305 text-xs font-bold rounded-xl transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProfileUpdating}
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border-0"
                >
                  {isProfileUpdating ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-white animate-spin" />
                  ) : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
