import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Budget, SavingsGoal, ChatMessage, BudgetTemplate, RecurringTransaction, MonthlySnapshot } from './types';
import { formatCurrency } from './utils/currencyFormatter';
import Login from './components/Login';
import LedgerSmartLogo from './components/Logo';

// Optimally lazy loaded major performance modules to secure instantaneous loading
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const TransactionForm = React.lazy(() => import('./components/TransactionForm'));
const TransactionList = React.lazy(() => import('./components/TransactionList'));
const BudgetManager = React.lazy(() => import('./components/BudgetManager'));
const SavingsGoals = React.lazy(() => import('./components/SavingsGoals'));
const AIAssistant = React.lazy(() => import('./components/AIAssistant'));
const BudgetTemplates = React.lazy(() => import('./components/BudgetTemplates'));
const RecurringManager = React.lazy(() => import('./components/RecurringManager'));
const MonthlyReports = React.lazy(() => import('./components/MonthlyReports'));
const FinancialLabs = React.lazy(() => import('./components/FinancialLabs'));
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
  Download,
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
  CheckCircle,
  Check,
  HelpCircle,
  Flame
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
  const [activeTab, setActiveTab] = useState<'dash' | 'finance' | 'ledger' | 'savings' | 'ai' | 'templates' | 'recurring' | 'reports' | 'labs'>('dash');
  const [isExcelExporting, setIsExcelExporting] = useState(false);
  const [excelExportSuccess, setExcelExportSuccess] = useState(false);
  const [excelExportTimestamp, setExcelExportTimestamp] = useState<string>('');
  const [toastAnimateIn, setToastAnimateIn] = useState(false);
  const [lastExportBlob, setLastExportBlob] = useState<Blob | null>(null);
  const [lastExportFilename, setLastExportFilename] = useState<string>('');
  const [excelToastPosition, setExcelToastPosition] = useState<'top-right' | 'bottom-right'>(() => {
    try {
      const stored = localStorage.getItem('fin_tracker_excel_toast_position');
      return (stored as 'top-right' | 'bottom-right') || 'top-right';
    } catch {
      return 'top-right';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('fin_tracker_excel_toast_position', excelToastPosition);
    } catch (e) {
      console.error('Failed to save excel toast position', e);
    }
  }, [excelToastPosition]);

  const prevExportingRef = useRef(isExcelExporting);

  useEffect(() => {
    if (prevExportingRef.current && !isExcelExporting) {
      setExcelExportSuccess(true);
      setExcelExportTimestamp(new Date().toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' }));
      
      // Play a subtle high-quality UI chime
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const playTone = (freq: number, start: number, duration: number, volume: number) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            
            gainNode.gain.setValueAtTime(0, start);
            gainNode.gain.linearRampToValueAtTime(volume, start + 0.04);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);
            
            osc.start(start);
            osc.stop(start + duration);
          };
          
          const now = ctx.currentTime;
          // Distinct high-frequency confirmation crystal chime (E6 -> G6 -> C7)
          playTone(1318.51, now, 0.25, 0.03);        // E6
          playTone(1567.98, now + 0.06, 0.3, 0.035);  // G6
          playTone(2093.00, now + 0.12, 0.4, 0.025);  // C7 (crisp high peak)
        }
      } catch (err) {
        console.warn('UI chime playback failed:', err);
      }

      const timer = setTimeout(() => {
        setExcelExportSuccess(false);
      }, 3500); // feedback persists for 3.5 seconds
      return () => clearTimeout(timer);
    }
    prevExportingRef.current = isExcelExporting;
  }, [isExcelExporting]);

  useEffect(() => {
    if (excelExportSuccess) {
      const timer = setTimeout(() => {
        setToastAnimateIn(true);
      }, 40);
      return () => clearTimeout(timer);
    } else {
      setToastAnimateIn(false);
    }
  }, [excelExportSuccess]);

  const handleReDownloadExcel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lastExportBlob) return;
    try {
      const url = URL.createObjectURL(lastExportBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = lastExportFilename || 'Ledger_Master_Portfolio_Report.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to re-download generated excel report:', err);
    }
  };

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
  const currentSystemMonth = React.useMemo(() => {
    return new Date().toISOString().substring(0, 7);
  }, []);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => currentSystemMonth);
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

  const [excelPreviewCustom, setExcelPreviewCustom] = useState<{
    count: number;
    label: string;
    details: string;
    currentMonthTrends?: number[];
    prevMonthTrends?: number[];
    currentMonthLabel?: string;
    prevMonthLabel?: string;
  } | null>(null);

  const [overlayPrevMonth, setOverlayPrevMonth] = useState<boolean>(false);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [excelIncludeCategoryId, setExcelIncludeCategoryId] = useState<boolean>(false);
  const [excelStyleTheme, setExcelStyleTheme] = useState<'professional' | 'minimal'>('professional');
  const [excelEnableDateFiltering, setExcelEnableDateFiltering] = useState<boolean>(true);
  const [filterExcelByDate, setFilterExcelByDate] = useState<boolean>(false);
  const [excelStartDate, setExcelStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().substring(0, 10);
  });
  const [excelEndDate, setExcelEndDate] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10);
  });
  const [excelDatePreset, setExcelDatePreset] = useState<'active' | 'last-7' | 'last-30' | 'last-90' | 'this-year' | 'custom'>('active');
  const [comparePeriodA, setComparePeriodA] = useState<string>('');
  const [comparePeriodB, setComparePeriodB] = useState<string>('');

  const availableMonths = React.useMemo(() => {
    return Array.from(
      new Set<string>(
        transactions
          .filter(t => t.date)
          .map(t => t.date.substring(0, 7))
      )
    ).sort((a: string, b: string) => b.localeCompare(a));
  }, [transactions]);

  // Dynamic Comparison Trends for any two chosen months
  const comparisonTrends = React.useMemo(() => {
    const defaultA = availableMonths.length > 0 ? availableMonths[0] : new Date().toISOString().substring(0, 7);
    const defaultB = availableMonths.length > 1 ? availableMonths[1] : (availableMonths[0] || new Date().toISOString().substring(0, 7));

    const activeA = comparePeriodA || defaultA;
    const activeB = comparePeriodB || defaultB;

    const daysInMonth = 30;

    // Period A
    const aDayTotals = Array(daysInMonth).fill(0);
    const aTrends = Array(daysInMonth).fill(0);
    transactions.forEach(t => {
      if (t.type === 'expense' && t.date && t.date.startsWith(activeA)) {
        const day = parseInt(t.date.substring(8, 10));
        const index = Math.min(daysInMonth - 1, Math.max(0, (isNaN(day) ? 1 : day) - 1));
        aDayTotals[index] += t.amount;
      }
    });
    let aSum = 0;
    for (let i = 0; i < daysInMonth; i++) {
      aSum += aDayTotals[i];
      aTrends[i] = parseFloat(aSum.toFixed(2));
    }

    // Period B
    const bDayTotals = Array(daysInMonth).fill(0);
    const bTrends = Array(daysInMonth).fill(0);
    transactions.forEach(t => {
      if (t.type === 'expense' && t.date && t.date.startsWith(activeB)) {
        const day = parseInt(t.date.substring(8, 10));
        const index = Math.min(daysInMonth - 1, Math.max(0, (isNaN(day) ? 1 : day) - 1));
        bDayTotals[index] += t.amount;
      }
    });
    let bSum = 0;
    for (let i = 0; i < daysInMonth; i++) {
      bSum += bDayTotals[i];
      bTrends[i] = parseFloat(bSum.toFixed(2));
    }

    const formatMonthNameSmall = (monthStr: string) => {
      const parts = monthStr.split('-');
      if (parts.length !== 2) return monthStr;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      return d.toLocaleDateString('default', { month: 'short', year: '2-digit' });
    };

    return {
      trendsA: aTrends,
      trendsB: bTrends,
      labelA: formatMonthNameSmall(activeA),
      labelB: formatMonthNameSmall(activeB),
      activeA,
      activeB,
    };
  }, [transactions, availableMonths, comparePeriodA, comparePeriodB]);

  // Helper inside useMemo to get previous month
  const fallbackTrends = React.useMemo(() => {
    const currentSystemMonth = new Date().toISOString().substring(0, 7);
    const selectedMonth = availableMonths.length > 0 ? availableMonths[0] : currentSystemMonth;

    const [yearText, monthText] = selectedMonth.split('-');
    const year = parseInt(yearText);
    const month = parseInt(monthText);
    const prevDate = new Date(year, month - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthIdx = prevDate.getMonth() + 1;
    const prevMonthIdxStr = prevMonthIdx < 10 ? `0${prevMonthIdx}` : `${prevMonthIdx}`;
    const prevMonth = `${prevYear}-${prevMonthIdxStr}`;

    const daysInMonth = 30;
    const currentDayTotals = Array(daysInMonth).fill(0);
    const currentTrends = Array(daysInMonth).fill(0);
    transactions.forEach(t => {
      if (t.type === 'expense' && t.date && t.date.startsWith(selectedMonth)) {
        const day = parseInt(t.date.substring(8, 10));
        const index = Math.min(daysInMonth - 1, Math.max(0, (isNaN(day) ? 1 : day) - 1));
        currentDayTotals[index] += t.amount;
      }
    });
    let currentSum = 0;
    for (let i = 0; i < daysInMonth; i++) {
      currentSum += currentDayTotals[i];
      currentTrends[i] = parseFloat(currentSum.toFixed(2));
    }

    const prevDayTotals = Array(daysInMonth).fill(0);
    const prevTrends = Array(daysInMonth).fill(0);
    transactions.forEach(t => {
      if (t.type === 'expense' && t.date && t.date.startsWith(prevMonth)) {
        const day = parseInt(t.date.substring(8, 10));
        const index = Math.min(daysInMonth - 1, Math.max(0, (isNaN(day) ? 1 : day) - 1));
        prevDayTotals[index] += t.amount;
      }
    });
    let prevSum = 0;
    for (let i = 0; i < daysInMonth; i++) {
      prevSum += prevDayTotals[i];
      prevTrends[i] = parseFloat(prevSum.toFixed(2));
    }

    const formatMonthNameSmall = (monthStr: string) => {
      const parts = monthStr.split('-');
      if (parts.length !== 2) return monthStr;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      return d.toLocaleDateString('default', { month: 'short', year: '2-digit' });
    };

    return {
      currentMonthTrends: currentTrends,
      prevMonthTrends: prevTrends,
      currentMonthLabel: formatMonthNameSmall(selectedMonth),
      prevMonthLabel: formatMonthNameSmall(prevMonth)
    };
  }, [transactions]);

  const currentMonthTrends = excelPreviewCustom?.currentMonthTrends ?? fallbackTrends.currentMonthTrends;
  const prevMonthTrends = excelPreviewCustom?.prevMonthTrends ?? fallbackTrends.prevMonthTrends;
  const currentMonthLabel = excelPreviewCustom?.currentMonthLabel ?? fallbackTrends.currentMonthLabel;
  const prevMonthLabel = excelPreviewCustom?.prevMonthLabel ?? fallbackTrends.prevMonthLabel;

  const fallbackCount = React.useMemo(() => {
    const availableMonths = Array.from(
      new Set<string>(
        transactions
          .filter(t => t.date)
          .map(t => t.date.substring(0, 7))
      )
    ).sort((a: string, b: string) => b.localeCompare(a));
    const currentSystemMonth = new Date().toISOString().substring(0, 7);
    const selectedMonth = availableMonths.length > 0 ? availableMonths[0] : currentSystemMonth;
    return transactions.filter(t => t.date && t.date.startsWith(selectedMonth)).length;
  }, [transactions]);

  const defaultPeriodLabel = React.useMemo(() => {
    const availableMonths = Array.from(
      new Set<string>(
        transactions
          .filter(t => t.date)
          .map(t => t.date.substring(0, 7))
      )
    ).sort((a: string, b: string) => b.localeCompare(a));
    if (availableMonths.length > 0) {
      const parentMonth = availableMonths[0];
      const [year, month] = parentMonth.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monName = date.toLocaleString('default', { month: 'long' });
      return `${monName} ${year}`;
    }
    const today = new Date();
    const monName = today.toLocaleString('default', { month: 'long' });
    return `${monName} ${today.getFullYear()}`;
  }, [transactions]);

  const excelPreviewCount = excelPreviewCustom !== null ? excelPreviewCustom.count : fallbackCount;
  const excelPreviewLabel = excelPreviewCustom !== null ? excelPreviewCustom.label : defaultPeriodLabel;
  const excelPreviewDetails = excelPreviewCustom !== null ? excelPreviewCustom.details : `Active month selection: ${defaultPeriodLabel}`;

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

  // Handle popup window logic if this app is rendered inside an OAuth popup
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    if (window.opener) {
      const notifyAndClose = (session: any) => {
        try {
          window.opener.postMessage({
            type: 'OAUTH_AUTH_SUCCESS',
            session: session
          }, '*');
          setTimeout(() => {
            try {
              window.close();
            } catch (closeErr) {
              console.error("Popup window self-close blocked:", closeErr);
            }
          }, 150);
        } catch (msgErr) {
          console.error("Failed to post message to parent window:", msgErr);
        }
      };

      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          notifyAndClose(data.session);
        }
      }).catch(err => {
        console.error("Popup check fetch session error:", err);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
          notifyAndClose(session);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Hook subscription monitoring Supabase authentication session lifecycle
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsAuthLoading(false);
      return;
    }
    setIsAuthLoading(true);

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        // Log less aggressively or check for known auth refresh token problems to avoid blocking the app
        const isRefreshTokenError = 
          error.message?.includes('Refresh Token') || 
          error.message?.includes('refresh_token') || 
          error.message?.includes('invalid_grant') ||
          error.message?.includes('Not Found') ||
          error.status === 400 ||
          error.status === 401;

        if (isRefreshTokenError) {
          console.warn("Retrieve active auth session: session expired or refresh token invalid. Signing out locally.");
          // Clear Supabase local storage keys to ensure clean slate
          try {
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
              }
            });
          } catch (e) {
            console.error("Local storage clear error:", e);
          }
          supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          setUser(null);
        } else {
          console.error("Retrieve active auth session error:", error);
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
      console.warn("Retrieve active auth session raw error occurred, signing out locally:", err);
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {}
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
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
    if (!isSupabaseConfigured || !supabase) return;
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



  // Request real-time structured advisors tips using `/api/analyze`
  const fetchAIInsights = async () => {
    if (transactions.length === 0 && budgets.length === 0) return;
    setLoadingInsights(true);
    setInsightsError(null);

    let isFallbackNeeded = false;
    let fallbackErrorMessage = "";
    
    // Construct period-specific cache key to prevent leaks across select periods
    const cacheKey = user 
      ? `fin_tracker_ai_insights_${selectedPeriod}_${user.id}` 
      : `fin_tracker_ai_insights_${selectedPeriod}_demo`;

    try {
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const session = data?.session;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({ transactions, budgets, savingsGoals: goals, currency, selectedPeriod })
      });

      if (!response.ok) {
        // Standard non-ok check. If 404 (NOT_FOUND) from Vercel/similar, mark fallback.
        if (response.status === 404) {
          isFallbackNeeded = true;
          fallbackErrorMessage = "Endpoint /api/analyze returned 404 NOT FOUND.";
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
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch (e) {
            console.warn("Could not cache insights locally:", e);
          }
        }
      }
    } catch (err: any) {
      console.warn("Standard /api/analyze failed, preparing fallback mode:", err);
      isFallbackNeeded = true;
      fallbackErrorMessage = err.message || "Unknown error calling server-side insights.";
    }

    // Execute fallback routines (Local mathematically generated budget insights)
    if (isFallbackNeeded) {
      // Helper inside fallback to get previous month YYYY-MM
      const getPreviousMonthString = (yearMonthStr: string): string => {
        const parts = yearMonthStr.split('-');
        if (parts.length !== 2) return yearMonthStr;
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const prevDate = new Date(year, month - 2, 1);
        const prevYear = prevDate.getFullYear();
        const prevMonth = prevDate.getMonth() + 1;
        const prevMonthStr = prevMonth < 10 ? `0${prevMonth}` : `${prevMonth}`;
        return `${prevYear}-${prevMonthStr}`;
      };

      // Compute local data-driven smart insights when no API key exists on client
      const filteredForAnalysis = selectedPeriod === 'all'
        ? transactions
        : transactions.filter(t => t.date && t.date.startsWith(selectedPeriod));

      const totalExpenses = filteredForAnalysis
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const categorySpend: Record<string, number> = {};
      filteredForAnalysis.filter(t => t.type === 'expense').forEach(t => {
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

      let mathCompText = "";
      if (selectedPeriod !== 'all') {
        const prevP = getPreviousMonthString(selectedPeriod);
        const prevMonthTx = transactions.filter(t => t.date && t.date.startsWith(prevP));
        const prevExpenses = prevMonthTx
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        
        const variance = totalExpenses - prevExpenses;
        const trendStr = variance > 0 ? "increased" : "decreased";
        mathCompText = ` Compare to previous cycle (${prevP}), spend total ${trendStr} by ${currency} ${Math.abs(variance).toLocaleString()}.`;
      }

      const computedLocalInsights = {
        overallStatus: overallStatus,
        summaryMessage: `Budget analysis computed locally. Expenses for ${selectedPeriod === 'all' ? 'All-Time' : selectedPeriod}: ${currency} ${(totalExpenses || 0).toLocaleString()}. Budget Limit: ${currency} ${(totalBudgetLimit || 0).toLocaleString()}.${mathCompText}`,
        actionableInsights: [
          overspentCategories.length > 0
            ? `⚠️ Overspent Alerts: Check: ${overspentCategories.map(c => c.category).join(', ')}.`
            : `✅ Spending control is outstanding for this period!`,
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
        localStorage.setItem(cacheKey, JSON.stringify(computedLocalInsights));
      } catch (_) {}
    }

    setLoadingInsights(false);
  };

  // Run dynamic advisor insights on startup, active period switch, or currency change
  useEffect(() => {
    if (isDataLoaded) {
      const cacheKey = user 
        ? `fin_tracker_ai_insights_${selectedPeriod}_${user.id}` 
        : `fin_tracker_ai_insights_${selectedPeriod}_demo`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setAIInsights(parsed);
          setIsInsightsStale(false);
        } catch (e) {
          console.warn("Could not parse cached insights:", e);
          fetchAIInsights();
        }
      } else {
        fetchAIInsights();
      }
    }
  }, [currency, isDataLoaded, user, selectedPeriod]);

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
  ? goals.map(g => `   - **${g.name}:** Saved **${currency} ${(g.current || 0).toLocaleString()}** of **${currency} ${(g.target || 0).toLocaleString()}** (${g.target > 0 ? Math.round(((g.current || 0) / g.target) * 100) : 0}%). Target Date: ${g.deadline || "No date set"}.`).join('\n')
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

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div id="unconfigured-banner" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
        <div className="bg-slate-800 border border-slate-700/65 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center flex flex-col items-center gap-5 transition-all">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <AlertTriangle className="w-8 h-8 text-rose-500 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white font-sans">App not configured — contact the administrator.</h2>
            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              The Supabase credentials are missing or set to placeholders in our environment variables. Please provide active VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to proceed securely.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
    <div className={`min-h-screen w-full max-w-full overflow-x-hidden ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50/70 text-gray-800'} transition-colors duration-200 antialiased flex flex-col font-sans pb-16 lg:pb-6`}>
      
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

      {/* Excel Export Success Toast */}
      <AnimatePresence>
        {excelExportSuccess && (
          <div 
            id="excel-success-toast" 
            className={`fixed right-5 z-100 max-w-sm w-full pointer-events-auto transform transition-all duration-500 ease-out hover:scale-[1.02] ${
              toastAnimateIn 
                ? 'translate-x-0 opacity-100' 
                : 'translate-x-[110%] opacity-0'
            } ${
              excelToastPosition === 'bottom-right' ? 'bottom-5' : 'top-20'
            }`}
          >
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.95, 
                filter: 'blur(10px)',
                boxShadow: excelStyleTheme === 'minimal'
                  ? '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)'
                  : '0 10px 15px -3px rgba(16, 185, 129, 0.05), 0 4px 6px -4px rgba(16, 185, 129, 0.05)'
              }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0.95, 1, 1, 0.95],
                filter: ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(5px)'],
                boxShadow: excelStyleTheme === 'minimal'
                  ? [
                      '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                      '0 20px 25px -5px rgba(147, 51, 234, 0.35), 0 8px 10px -6px rgba(147, 51, 234, 0.35)', // Purple glow pulse
                      '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)', // shadow-xl solid state
                      '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    ]
                  : [
                      '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                      '0 20px 25px -5px rgba(16, 185, 129, 0.5), 0 8px 10px -6px rgba(16, 185, 129, 0.5)', // Emerald success glow pulse
                      '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)', // shadow-xl solid state
                      '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    ]
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.95, 
                filter: 'blur(10px)',
                transition: { duration: 0.35, ease: 'easeIn' }
              }}
              transition={{ 
                duration: 3.5, 
                times: [0, 0.08, 0.85, 1], 
                ease: 'easeInOut' 
              }}
              onClick={() => setExcelExportSuccess(false)}
              className={`relative overflow-hidden rounded-2xl p-4 pb-5 flex items-center justify-between gap-4 backdrop-blur-md cursor-pointer select-none border transition-colors duration-300 ${
                excelStyleTheme === 'minimal'
                  ? 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                  : 'border-emerald-500/30 text-white'
              }`}
            >
              {/* Secondary Fade-in Background */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.95 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`absolute inset-0 -z-10 transition-colors duration-300 ${
                  excelStyleTheme === 'minimal'
                    ? 'bg-white dark:bg-slate-950'
                    : 'bg-slate-900'
                }`}
              />

              <div className="flex items-center gap-3.5 text-left pr-6">
                <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90 select-none pointer-events-none" viewBox="0 0 36 36">
                    {/* Background track */}
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      strokeWidth={2.5}
                      className={`fill-none transition-colors duration-300 ${
                        excelStyleTheme === 'minimal'
                          ? 'stroke-slate-100 dark:stroke-slate-800/60'
                          : 'stroke-emerald-500/10 dark:stroke-emerald-500/15'
                      }`}
                    />
                    {/* Draining countdown ring */}
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="16"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      className={`fill-none transition-colors duration-300 ${
                        excelStyleTheme === 'minimal'
                          ? 'stroke-slate-500 dark:stroke-slate-400'
                          : 'stroke-emerald-400'
                      }`}
                      initial={{ strokeDasharray: "100.5 100.5", strokeDashoffset: 0 }}
                      animate={{ strokeDashoffset: 100.5 }}
                      transition={{ duration: 3.5, ease: "linear" }}
                    />
                  </svg>

                  {/* Inner check icon */}
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [0.8, 1.15, 0.95, 1], opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                    className={`flex items-center justify-center rounded-full transition-colors duration-300 ${
                      excelStyleTheme === 'minimal'
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'text-emerald-400'
                    }`}
                  >
                    <svg
                      className="w-4.5 h-4.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <motion.path
                        d="M20 6L9 17l-5-5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, ease: "easeInOut", delay: 0.2 }}
                      />
                    </svg>
                  </motion.div>
                </div>
                <div>
                  <h4 className={`text-xs font-extrabold tracking-wide leading-tight transition-colors duration-300 ${
                    excelStyleTheme === 'minimal' ? 'text-slate-900 dark:text-slate-100' : 'text-white'
                  }`}>
                    Spreadsheet Exported!
                  </h4>
                  {excelExportTimestamp && (
                    <span 
                      id="excel-export-timestamp"
                      className={`text-[9px] font-mono block mt-0.5 font-bold tracking-wider opacity-90 transition-colors duration-300 ${
                        excelStyleTheme === 'minimal' ? 'text-slate-450 dark:text-slate-500' : 'text-emerald-400'
                      }`}
                    >
                      Exported at: {excelExportTimestamp}
                    </span>
                  )}
                  <p className={`text-[10px] mt-1 leading-normal font-sans transition-colors duration-300 ${
                    excelStyleTheme === 'minimal' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-350'
                  }`}>
                    Your custom Excel report has been downloaded successfully.
                  </p>
                  {lastExportBlob && (
                    <button
                      type="button"
                      id="btn-re-download-toast"
                      onClick={handleReDownloadExcel}
                      className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold tracking-wider transition-all uppercase cursor-pointer select-none border whitespace-nowrap active:scale-95 ${
                        excelStyleTheme === 'minimal'
                          ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50'
                      }`}
                      title="Download the generated report again instantly"
                    >
                      <Download className="w-3.5 h-3.5 text-current" />
                      <span>Re-download</span>
                    </button>
                  )}
                </div>
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExcelExportSuccess(false);
                }}
                className={`absolute top-2 right-2 p-1 rounded-lg transition-colors border-0 bg-transparent cursor-pointer shrink-0 z-10 ${
                  excelStyleTheme === 'minimal'
                    ? 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
                aria-label="Close notification"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              {/* Progress Bar Removed. Visual countdown is handled by the circular progress ring. */}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Top Elegant bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-150 dark:border-slate-800 py-3 sm:py-4 px-4 sm:px-6 sticky top-0 z-40 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between w-full">
          <div className="flex items-center gap-2.5 self-start md:self-auto w-full md:w-auto">
            <LedgerSmartLogo showText={false} iconSize="w-9 h-9" className="hover:scale-105 transition-transform duration-200" />
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                <h1 className="text-base font-bold text-gray-950 dark:text-white tracking-tight shrink-0">Ledger Smart</h1>
                <span className="hidden sm:inline-block h-3.5 w-px bg-gray-200 dark:bg-slate-800" />
                <button
                  onClick={handleOpenProfileModal}
                  title="Click to edit profile name"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-left truncate max-w-[150px] sm:max-w-none"
                >
                  Welcome, {userFirstName}!
                </button>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono tracking-wider font-semibold">PERSONAL FINANCE COMPANION</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 sm:gap-3 w-full md:w-auto">
            {/* Supabase Authentication Status & Sign Out */}
            {user && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mr-0 sm:mr-1">
                <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400 max-w-[150px] truncate hidden sm:inline" title={user.email}>
                  {user.isDemo ? (user.email === 'demo_user@ledgersmart.com' ? 'Local Workspace' : user.email) : user.email}
                </span>
                <button
                  onClick={handleOpenProfileModal}
                  title="Edit Profile Name (First & Last Name)"
                  className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all cursor-pointer flex items-center justify-center h-8.5 w-8.5"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
                <a
                  href="https://wa.me/254703887696?text=Hi!%20I%20need%20support%20with%20my%20Budget%20Tracker."
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Customer WhatsApp Support"
                  className="p-2 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 h-8.5 w-8.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </a>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setAIInsights(null);
                  }}
                  title="Sign Out of Ledger Smart"
                  className="p-2 border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl transition-all cursor-pointer flex items-center justify-center h-8.5 w-8.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Switch to Light App Theme" : "Switch to Dark App Theme"}
              className="p-2 border border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer text-slate-500 dark:text-slate-400 h-8.5 w-8.5 flex items-center justify-center"
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



            {/* Notification Bell with Dropdown Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                title="Current Month Budget Alerts & Notifications"
                className={`p-2 border rounded-xl transition-all cursor-pointer flex items-center justify-center relative ${
                  unreadBudgetAlerts.length > 0 
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-100 dark:hover:bg-slate-900' 
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {unreadBudgetAlerts.length > 0 ? (
                  <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <Bell className="w-4 h-4 shrink-0" />
                )}
                {unreadBudgetAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-[9px] text-white flex items-center justify-center rounded-full font-extrabold border-2 border-white dark:border-slate-900">
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
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 p-2 rounded-xl text-[10px] text-blue-800 dark:text-blue-400 font-medium animate-fade-in text-center">
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
                              : 'bg-gray-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-300 dark:hover:bg-slate-750'
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

                    {/* Toast Position Configuration */}
                    <div className="bg-slate-50/70 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-gray-800 dark:text-slate-200 text-[11px]">Excel Toast Position</p>
                          <p className="text-[9px] text-slate-400 leading-normal">Configure screen location for download notifications</p>
                        </div>
                        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 shadow-2xs shrink-0 select-none">
                          <button
                            type="button"
                            onClick={() => setExcelToastPosition('top-right')}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer border-0 ${
                              excelToastPosition === 'top-right'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            Top-Right
                          </button>
                          <button
                            type="button"
                            onClick={() => setExcelToastPosition('bottom-right')}
                            className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer border-0 ${
                              excelToastPosition === 'bottom-right'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-500 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            Bottom-Right
                          </button>
                        </div>
                      </div>
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
                          <div key={alert.category} className="p-2.5 border border-amber-200/50 dark:border-amber-900/40 bg-amber-50/25 dark:bg-amber-950/10 rounded-xl flex items-center justify-between gap-3">
                            <div className="space-y-0.5 text-left flex-1 min-w-0">
                              <p className="font-bold text-gray-800 dark:text-slate-200 truncate">{alert.category}</p>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden my-1">
                                <div 
                                  className={`h-full transition-all duration-300 ${alert.percent >= 100 ? 'bg-red-500' : 'bg-amber-500'}`} 
                                  style={{ width: `${Math.min(alert.percent, 100)}%` }} 
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tight block">
                                {currencySymbol}{alert.spent.toFixed(0)} spent / {currencySymbol}{alert.limit.toFixed(0)} limit
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono select-none shrink-0 border ${
                              alert.percent >= 100 
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-750 dark:text-red-350 border-red-200 dark:border-red-900/40' 
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-750 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/40'
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
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold hover:underline cursor-pointer bg-transparent border-0 p-0"
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

            {/* Financial Labs Link */}
            <button
              onClick={() => { setActiveTab('labs'); setEditingTx(null); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'labs'
                  ? 'bg-purple-600 text-white shadow-xs font-bold font-semibold'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Flame className="w-4.5 h-4.5 text-orange-500 shrink-0 fill-orange-500/10" />
              Financial Labs
              <span className="ml-auto bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-extrabold px-1.5 py-0.5 rounded text-[8.5px] font-mono tracking-wide uppercase leading-none">
                Lab
              </span>
            </button>

            {/* Monthly Reports Link */}
            <div className="relative group/reports w-full">
              <motion.button
                id="sidebar-nav-reports"
                disabled={isExcelExporting}
                onClick={() => { setActiveTab('reports'); setEditingTx(null); }}
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isExcelExporting
                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 opacity-80 cursor-not-allowed animate-pulse'
                    : excelExportSuccess
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : activeTab === 'reports'
                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                        : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/60 cursor-pointer'
                }`}
              >
                <AnimatePresence mode="wait">
                  {isExcelExporting ? (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-3 w-full"
                    >
                      <div className="w-4.5 h-4.5 border-2 border-amber-600 dark:border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      <span className="truncate">Generating...</span>
                    </motion.div>
                  ) : excelExportSuccess ? (
                    <motion.div 
                      key="success"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      transition={{ type: 'spring', damping: 15, stiffness: 120 }}
                      className="flex items-center gap-3 w-full"
                    >
                      <Check className="w-4.5 h-4.5 text-emerald-650 dark:text-emerald-400 shrink-0 stroke-[3.5]" />
                      <span className="font-extrabold text-emerald-750 dark:text-emerald-400">Exported !</span>
                      <span className="ml-auto bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                        Saved
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center gap-3 w-full"
                    >
                      <BarChart3 className="w-4.5 h-4.5 shrink-0" />
                      <span>Monthly Reports</span>
                      <span className="ml-auto bg-gray-100 dark:bg-slate-800 text-gray-550 dark:text-slate-350 px-1.5 py-0.5 rounded text-[10px] font-mono group-hover/reports:bg-blue-500 group-hover/reports:text-white duration-150">
                        {excelPreviewCount}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Popover Hover Info Overlay */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-72 bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-xl shadow-xl border border-slate-800 opacity-0 pointer-events-none group-hover/reports:opacity-100 group-hover/reports:pointer-events-auto transition-all duration-200 z-50 transform scale-95 group-hover/reports:scale-100">
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-slate-900 dark:border-r-slate-950" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Excel Export Estimate</span>
                    <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold font-mono tracking-wider">
                      LIVE
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-sans tracking-tight text-white">{excelPreviewCount}</span>
                    <span className="text-[10px] text-slate-350 font-medium">transactions queued</span>
                  </div>
                  <div className="border-t border-slate-800/85 pt-2">
                    <p className="text-[10.5px] text-slate-300 leading-relaxed font-sans">
                      Preserved Scope: <strong className="text-blue-400 font-bold">{excelPreviewLabel}</strong>
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1 italic leading-tight">
                      {excelPreviewDetails}
                    </p>
                  </div>

                  {/* Sparkline Visual Spending Trend Chart */}
                  <div className="border-t border-slate-800/85 pt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 leading-none">
                      <span className="font-semibold text-slate-350">Cumulative Outflow</span>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono">
                        <span className="flex items-center gap-0.5 text-blue-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          {comparisonTrends.labelA}
                        </span>
                        <span className="flex items-center gap-1 text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" strokeDasharray="1 1" />
                          {comparisonTrends.labelB}
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-full bg-slate-950/60 rounded-lg p-1.5 border border-slate-800/50 h-[80px] flex items-center justify-center">
                      {comparisonTrends.trendsA && comparisonTrends.trendsA.length > 0 ? (
                        (() => {
                          const trendsA = comparisonTrends.trendsA;
                          const trendsB = comparisonTrends.trendsB;
                          const maxVal = Math.max(...trendsA, ...trendsB, 100);
                          const points = trendsA.map((val, i) => {
                            const x = (i / 29) * 220 + 10;
                            const y = 50 - (val / maxVal) * 40 + 10;
                            return `${x},${y}`;
                          }).join(' ');

                          const prevPointsStr = trendsB.map((val, i) => {
                            const x = (i / 29) * 220 + 10;
                            const y = 50 - (val / maxVal) * 40 + 10;
                            return `${x},${y}`;
                          }).join(' ');

                          return (
                            <svg
                              viewBox="0 0 240 70"
                              className="w-full h-full overflow-visible select-none cursor-crosshair touch-none"
                              onPointerMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const mouseX = e.clientX - rect.left;
                                const svgX = (mouseX / rect.width) * 240;
                                const N = trendsA.length;
                                if (N > 0) {
                                  const relativeX = svgX - 10;
                                  const pct = relativeX / 220;
                                  const rawIdx = Math.round(pct * (N - 1));
                                  const idx = Math.max(0, Math.min(N - 1, rawIdx));
                                  setHoveredTrendIdx(idx);
                                }
                              }}
                              onPointerLeave={() => {
                                setHoveredTrendIdx(null);
                              }}
                            >
                              {/* Horizontal Grid lines */}
                              <line x1="5" y1="60" x2="235" y2="60" stroke="#1e293b" strokeWidth="1" pointerEvents="none" />
                              <line x1="5" y1="35" x2="235" y2="35" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" pointerEvents="none" />
                              <line x1="5" y1="10" x2="235" y2="10" stroke="#1e293b" strokeWidth="1" pointerEvents="none" />

                              {/* Period B Trend Line (Amber) */}
                              {prevPointsStr && (
                                <polyline
                                  fill="none"
                                  stroke="#fbbf24"
                                  strokeWidth="2"
                                  strokeDasharray="3 3"
                                  points={prevPointsStr}
                                  className="transition-all duration-305"
                                  pointerEvents="none"
                                />
                              )}

                              {/* Period A Trend Line (Blue) */}
                              {points && (
                                <polyline
                                  fill="none"
                                  stroke="#60a5fa"
                                  strokeWidth="2.5"
                                  points={points}
                                  className="transition-all duration-305"
                                  pointerEvents="none"
                                />
                              )}

                              {/* Endpoint indicators when not hovering */}
                              {hoveredTrendIdx === null && trendsA.length > 0 && (
                                <circle
                                  cx={(29 / 29) * 220 + 10}
                                  cy={50 - (trendsA[trendsA.length - 1] / maxVal) * 40 + 10}
                                  r="3"
                                  fill="#60a5fa"
                                  stroke="#0f172a"
                                  strokeWidth="1.5"
                                  pointerEvents="none"
                                />
                              )}

                              {hoveredTrendIdx === null && trendsB.length > 0 && (
                                <circle
                                  cx={(29 / 29) * 220 + 10}
                                  cy={50 - (trendsB[trendsB.length - 1] / maxVal) * 40 + 10}
                                  r="3"
                                  fill="#fbbf24"
                                  stroke="#0f172a"
                                  strokeWidth="1.5"
                                  pointerEvents="none"
                                />
                              )}

                              {/* Interactive Snapping Crosshair and custom tooltip overlays */}
                              {hoveredTrendIdx !== null && hoveredTrendIdx < trendsA.length && (() => {
                                const hoverX = (hoveredTrendIdx / 29) * 220 + 10;
                                const hoverYCurrent = 50 - ((trendsA[hoveredTrendIdx] || 0) / maxVal) * 40 + 10;
                                const hoverValCurrent = trendsA[hoveredTrendIdx] || 0;
                                const prevValCurrent = hoveredTrendIdx > 0 ? (trendsA[hoveredTrendIdx - 1] || 0) : 0;
                                const daySpendCurrent = parseFloat((hoverValCurrent - prevValCurrent).toFixed(2));

                                const hoverYPrev = trendsB[hoveredTrendIdx] !== undefined
                                  ? 50 - ((trendsB[hoveredTrendIdx] || 0) / maxVal) * 40 + 10
                                  : 0;
                                const hoverValPrev = trendsB[hoveredTrendIdx] || 0;
                                const prevValPrev = hoveredTrendIdx > 0 ? (trendsB[hoveredTrendIdx - 1] || 0) : 0;
                                const daySpendPrev = parseFloat((hoverValPrev - prevValPrev).toFixed(2));

                                return (
                                  <>
                                    <line
                                      x1={hoverX}
                                      y1={5}
                                      x2={hoverX}
                                      y2={65}
                                      stroke="#475569"
                                      strokeWidth="1"
                                      strokeDasharray="3 3"
                                      pointerEvents="none"
                                    />
                                    <circle
                                      cx={hoverX}
                                      cy={hoverYCurrent}
                                      r="5"
                                      fill="#60a5fa"
                                      stroke="#1d4ed8"
                                      strokeWidth="1.5"
                                      pointerEvents="none"
                                    />
                                    <circle
                                      cx={hoverX}
                                      cy={hoverYCurrent}
                                      r="2"
                                      fill="#ffffff"
                                      pointerEvents="none"
                                    />

                                    {trendsB[hoveredTrendIdx] !== undefined && (
                                      <>
                                        <circle
                                          cx={hoverX}
                                          cy={hoverYPrev}
                                          r="5"
                                          fill="#fbbf24"
                                          stroke="#b45309"
                                          strokeWidth="1.5"
                                          pointerEvents="none"
                                        />
                                        <circle
                                          cx={hoverX}
                                          cy={hoverYPrev}
                                          r="2"
                                          fill="#ffffff"
                                          pointerEvents="none"
                                        />
                                      </>
                                    )}

                                    <g pointerEvents="none">
                                      <rect
                                        x={2}
                                        y={2}
                                        width={236}
                                        height={14}
                                        rx="3"
                                        fill="#0f172a"
                                        fillOpacity="0.95"
                                        stroke="#334155"
                                        strokeWidth="0.5"
                                      />
                                      <text
                                        x={6}
                                        y={11}
                                        fill="#94a3b8"
                                        fontSize="6.5"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                      >
                                        D{hoveredTrendIdx + 1}:
                                      </text>
                                      <text
                                        x={32}
                                        y={11}
                                        fill="#60a5fa"
                                        fontSize="6.5"
                                        fontWeight="bold"
                                        fontFamily="monospace"
                                      >
                                        {comparisonTrends.labelA}: {formatCurrency(hoverValCurrent, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (+{daySpendCurrent})
                                      </text>
                                      {trendsB[hoveredTrendIdx] !== undefined && (
                                        <text
                                          x={134}
                                          y={11}
                                          fill="#fbbf24"
                                          fontSize="6.5"
                                          fontWeight="bold"
                                          fontFamily="monospace"
                                        >
                                          {comparisonTrends.labelB}: {formatCurrency(hoverValPrev, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (+{daySpendPrev})
                                        </text>
                                      )}
                                    </g>
                                  </>
                                );
                              })()}
                            </svg>
                          );
                        })()
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No trend data available</span>
                      )}
                    </div>
                  </div>

                  {/* Compare Period selectors */}
                  <div className="border-t border-slate-800/85 pt-2.5 mt-0.5 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider font-sans">Compare Periods</span>
                      <span className="text-[9px] bg-blue-500/10 text-blue-400 font-mono px-1 rounded uppercase font-bold tracking-wider">OVERLAY SPEND</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label htmlFor="compare-period-a" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Period A</label>
                        <select
                          id="compare-period-a"
                          value={comparisonTrends.activeA}
                          onChange={(e) => setComparePeriodA(e.target.value)}
                          className="w-full text-[10.5px] font-semibold text-slate-200 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          {availableMonths.map((m) => (
                            <option key={`comp-a-${m}`} value={m} className="bg-slate-950 text-slate-200">{m}</option>
                          ))}
                          {availableMonths.length === 0 && (
                            <option value={comparisonTrends.activeA} className="bg-slate-950 text-slate-200">{comparisonTrends.activeA}</option>
                          )}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="compare-period-b" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Period B</label>
                        <select
                          id="compare-period-b"
                          value={comparisonTrends.activeB}
                          onChange={(e) => setComparePeriodB(e.target.value)}
                          className="w-full text-[10.5px] font-semibold text-slate-200 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                        >
                          {availableMonths.map((m) => (
                            <option key={`comp-b-${m}`} value={m} className="bg-slate-950 text-slate-200">{m}</option>
                          ))}
                          {availableMonths.length === 0 && (
                            <option value={comparisonTrends.activeB} className="bg-slate-950 text-slate-200">{comparisonTrends.activeB}</option>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Include Category ID Toggle */}
                  <div className="flex items-center justify-between border-t border-slate-800/85 pt-2.5 mt-0.5">
                    <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider font-sans">Include Category ID</span>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="excel-include-category-id-sidebar"
                        checked={excelIncludeCategoryId}
                        onChange={(e) => {
                          e.stopPropagation();
                          setExcelIncludeCategoryId(e.target.checked);
                        }}
                        className="w-4 h-4 text-emerald-500 bg-slate-800 rounded border-slate-700 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                      />
                    </label>
                  </div>

                  {/* Excel Theme Toggle */}
                  <div className="flex items-center justify-between border-t border-slate-800/85 pt-2.5 mt-0.5">
                    <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider font-sans">Minimalist Excel Layout</span>
                    <button
                      type="button"
                      id="excel-style-theme-sidebar"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setExcelStyleTheme(excelStyleTheme === 'professional' ? 'minimal' : 'professional');
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        excelStyleTheme === 'minimal' ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                          excelStyleTheme === 'minimal' ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Excel Custom Date Range Limit */}
                  <div className="border-t border-slate-800/85 pt-2.5 mt-0.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider font-sans">Filter Excel By Date</span>
                      <button
                        type="button"
                        id="excel-filter-by-date-sidebar"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const updatedVal = !filterExcelByDate;
                          setFilterExcelByDate(updatedVal);
                          if (updatedVal) {
                            setExcelDatePreset('custom');
                          } else {
                            setExcelDatePreset('active');
                          }
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          filterExcelByDate ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                            filterExcelByDate ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {filterExcelByDate && (
                      <div className="grid grid-cols-2 gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">Start Date</label>
                          <input
                            type="date"
                            value={excelStartDate}
                            onChange={(e) => setExcelStartDate(e.target.value)}
                            className="w-full text-[10px] font-medium text-slate-200 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">End Date</label>
                          <input
                            type="date"
                            value={excelEndDate}
                            onChange={(e) => setExcelEndDate(e.target.value)}
                            className="w-full text-[10px] font-medium text-slate-200 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp Support Link */}
            <a
              href="https://wa.me/254703887696?text=Hi!%20I%20need%20support%20with%20my%20Budget%20Tracker."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 border border-transparent hover:border-emerald-100/30 dark:hover:border-emerald-900/30"
            >
              <HelpCircle className="w-4.5 h-4.5 shrink-0 text-emerald-500" />
              WhatsApp Support
            </a>
          </div>

          {/* Preferences & Utilities Card */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-2xl shadow-3xs space-y-2.5 transition-colors">
            <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-3 block">System Utilities</span>
            
            <button
              onClick={() => setShowResetModal(true)}
              className="w-full flex items-center gap-3 py-2 px-3.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-750 dark:hover:text-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-100/30 dark:hover:border-red-900/30 transition-all cursor-pointer"
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
                 <div className="p-4 bg-amber-50/70 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
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
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-bold text-sm text-slate-800 dark:text-[#FFFFFF] uppercase tracking-wider">Gemini Smart Diagnostics</h3>
                </div>
                <button
                  onClick={fetchAIInsights}
                  disabled={loadingInsights || transactions.length === 0}
                  className="text-[10px] font-bold border border-gray-200 text-gray-500 hover:bg-gray-50 py-1 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer relative disabled:opacity-40 disabled:cursor-not-allowed"
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
              ) : transactions.length === 0 ? (
                <div className="p-6 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl text-center space-y-2.5 animate-in fade-in duration-300">
                  <div className="p-3 bg-purple-50/50 dark:bg-slate-950 inline-flex rounded-full text-purple-600 dark:text-purple-400">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                    Welcome to Ledger Smart! Add your monthly income and your first transaction below to unlock your real-time Gemini AI financial diagnostics.
                  </p>
                </div>
              ) : insightsError ? (
                /* Sleek static general wealth tips fallback with specific error handling alerts */
                <div className="space-y-4">
                  {insightsError.includes("QUOTA_EXHAUSTED") ? (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 rounded-xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-[11px] font-bold uppercase tracking-wider font-mono">Gemini Rate Limit Throttled (429)</span>
                      </div>
                      <p className="text-[11px] font-medium text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                        You have fully consumed the 20 queries daily standard Gemini free quota limit on your API key. To safeguard your experience, Ledger Smart has automatically engaged the offline analytical framework below!
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl space-y-1 my-1">
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
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[9px] font-bold uppercase py-0.5 px-2.5 rounded-full ${
                      aiInsights.overallStatus === 'On Track' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                        : 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
                    }`}>
                      {aiInsights.overallStatus}
                    </span>
                    <p className="text-xs font-bold text-slate-800 dark:text-[#FFFFFF] leading-relaxed">
                      {aiInsights.summaryMessage}
                    </p>
                  </div>

                  {/* Bullet tips list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3.5 border-t border-gray-100 dark:border-slate-800">
                    <div className="space-y-2.5">
                      <span className="text-[10px] uppercase font-black text-slate-500 dark:text-[#F1F5F9] tracking-wider block">OBSERVED SPEND TRENDS</span>
                      <ul className="space-y-2">
                        {aiInsights.actionableInsights.map((insight, idx) => (
                          <li key={idx} className="text-xs text-slate-700 dark:text-[#F1F5F9] leading-relaxed font-semibold flex items-start gap-2">
                            <span className="text-blue-600 dark:text-cyan-400 mt-1 shrink-0 font-bold">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2.5">
                      <span className="text-[10px] uppercase font-black text-slate-500 dark:text-[#F1F5F9] tracking-wider block">ESTIMATED SAVINGS SUGGESTIONS</span>
                      <div className="space-y-2">
                        {aiInsights.savingsOpportunities.map((op, idx) => (
                          <div key={idx} className="p-3 bg-purple-50/90 border border-purple-200/50 dark:bg-slate-950 dark:border-2 dark:border-indigo-500/80 rounded-xl leading-relaxed shadow-xs">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-purple-950 dark:text-[#FFFFFF] font-extrabold">{op.category} Savings target</span>
                              <span className="text-emerald-700 dark:text-emerald-300 font-bold font-mono">+{currencySymbol}{op.savingEstimate}</span>
                            </div>
                            <p className="text-[10px] text-purple-900 dark:text-[#E2E8F0] font-semibold mt-1.5">
                              {op.actionableTip}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl text-center space-y-2.5">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 inline-flex rounded-full text-slate-400 dark:text-slate-500">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <p className="text-xs font-semibold text-slate-505 dark:text-slate-405 max-w-sm mx-auto leading-relaxed">
                    Personalized AI financial diagnostics are ready. Click "Refresh" to trigger your live analysis.
                  </p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Active rendering tabs content */}
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center p-12 min-h-[400px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs transition-colors pr-4 animate-pulsate">
              <div className="relative w-12 h-12 flex items-center justify-center mb-4">
                <div className="absolute inset-0 w-full h-full rounded-full border-4 border-slate-200 dark:border-slate-800" />
                <div className="absolute inset-0 w-full h-full rounded-full border-4 border-t-blue-600 dark:border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              </div>
              <p className="text-sm font-semibold text-slate-705 dark:text-slate-250">Loading application segment...</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[280px] text-center leading-relaxed">Splitting asset bundle into instant dynamic micro-chunks for performance.</p>
            </div>
          }>
            {activeTab === 'dash' && (
              <Dashboard 
                transactions={transactions} 
                budgets={budgets} 
                currencySymbol={currencySymbol}
                aiInsights={aiInsights}
                loadingInsights={loadingInsights}
                userFirstName={userFirstName}
                showPrevMonthTrend={overlayPrevMonth}
                selectedPeriod={selectedPeriod}
                setSelectedPeriod={setSelectedPeriod}
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
                transactions={transactions}
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
                isExportingExcel={isExcelExporting}
                onExcelExportStateChange={setIsExcelExporting}
                onLastExportStored={(blob: Blob, filename: string) => {
                  setLastExportBlob(blob);
                  setLastExportFilename(filename);
                }}
                onExcelPreviewChange={setExcelPreviewCustom}
                excelIncludeCategoryId={excelIncludeCategoryId}
                onExcelIncludeCategoryIdChange={setExcelIncludeCategoryId}
                excelStyleTheme={excelStyleTheme}
                onExcelStyleThemeChange={setExcelStyleTheme}
                excelEnableDateFiltering={excelEnableDateFiltering}
                onExcelEnableDateFilteringChange={setExcelEnableDateFiltering}
                excelStartDate={excelStartDate}
                onExcelStartDateChange={setExcelStartDate}
                excelEndDate={excelEndDate}
                onExcelEndDateChange={setExcelEndDate}
                filterExcelByDate={filterExcelByDate}
                onFilterExcelByDateChange={setFilterExcelByDate}
                excelDatePreset={excelDatePreset}
                onExcelDatePresetChange={setExcelDatePreset}
                selectedPeriod={selectedPeriod}
                setSelectedPeriod={setSelectedPeriod}
                aiInsights={aiInsights}
                loadingInsights={loadingInsights}
              />
            )}

            {activeTab === 'labs' && (
              <FinancialLabs
                transactions={transactions}
                recurringItems={recurringItems}
                currencySymbol={currencySymbol}
              />
            )}
          </React.Suspense>

        </section>

      </main>

      {/* Mobile Bottom Navigation Bar styled cleanly with dynamic indicators */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800 flex items-center justify-around py-2 px-1 lg:hidden shadow-lg transition-colors duration-150">
        <button 
          onClick={() => { setActiveTab('dash'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'dash' ? 'text-blue-600 dark:text-[#FFFFFF] font-extrabold scale-105' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#FFFFFF]'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Overview</span>
        </button>
        <button 
          onClick={() => { setActiveTab('ledger'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'ledger' ? 'text-blue-600 dark:text-[#FFFFFF] font-extrabold scale-105' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#FFFFFF]'}`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Ledger</span>
        </button>
        <button 
          onClick={() => { setActiveTab('finance'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'finance' ? 'text-blue-600 dark:text-[#FFFFFF] font-extrabold scale-105' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#FFFFFF]'}`}
        >
          <Scale className="w-5 h-5" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Budgets</span>
        </button>
        <button 
          onClick={() => { setActiveTab('reports'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'reports' ? 'text-blue-600 dark:text-[#FFFFFF] font-extrabold scale-105' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#FFFFFF]'}`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Reports</span>
        </button>
        <button 
          onClick={() => { setActiveTab('recurring'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'recurring' ? 'text-blue-600 dark:text-[#FFFFFF] font-extrabold scale-105' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#FFFFFF]'}`}
        >
          <CalendarClock className="w-5 h-5" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Fixed</span>
        </button>
        <button 
          onClick={() => { setActiveTab('labs'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'labs' ? 'text-purple-600 dark:text-[#FFFFFF] font-extrabold scale-105' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#FFFFFF]'}`}
        >
          <Flame className="w-5 h-5 text-orange-500" />
          <span className="text-[9px] uppercase font-bold tracking-wider">Labs</span>
        </button>
        <button 
          onClick={() => { setActiveTab('ai'); setEditingTx(null); }}
          className={`flex flex-col items-center gap-1 flex-1 py-1 cursor-pointer transition-all ${activeTab === 'ai' ? 'text-purple-600 dark:text-[#FFFFFF] font-extrabold scale-105' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#FFFFFF]'}`}
        >
          <Sparkles className={`w-5 h-5 animate-pulse ${activeTab === 'ai' ? 'text-purple-600 dark:text-purple-400' : 'text-purple-500 dark:text-purple-300'}`} />
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
              <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl mt-0.5">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Reset Application Data</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                  You are about to wipe out all seed placeholder transactions, category budgets, and savings goals. This allows you to start tracking your real funds and statistics on a completely clean canvas.
                </p>
              </div>
            </div>

            <div className="bg-red-50/55 dark:bg-red-950/20 rounded-xl p-4 border border-red-100 dark:border-red-900/30 text-[11px] leading-relaxed text-red-700 dark:text-red-300 space-y-2">
              <p className="font-bold uppercase tracking-wider text-[9px] text-red-600 dark:text-red-400">Warning: Irreversible Operation</p>
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
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-md focus:ring-blue-500 cursor-pointer"
                defaultChecked={false}
              />
              <label htmlFor="delete-templates-chk" className="text-xs text-gray-600 dark:text-slate-300 font-medium select-none cursor-pointer">
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
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/45 text-blue-600 dark:text-blue-400 rounded-2xl mt-0.5">
                <User className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Edit Profile Name</h3>
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
                    className="block w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all shadow-xs"
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
                    className="block w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white transition-all shadow-xs"
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
