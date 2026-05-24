import React, { useState, useEffect } from 'react';
import { Transaction, Budget, SavingsGoal, ChatMessage, BudgetTemplate, RecurringTransaction } from './types';
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
  LogOut
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

  // Authentication & Loading State
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

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

  // Hook subscription monitoring Supabase authentication session lifecycle
  useEffect(() => {
    setIsAuthLoading(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
    }).catch((err) => {
      console.error("Retrieve active auth session error:", err);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
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

        setBudgets(budgetsLoaded);
        setTransactions(transactionsLoaded);
        setGoals(goalsLoaded);
        setCustomTemplates(templatesLoaded);
        setRecurringItems(recurringLoaded);
        setChatMessages(chatsLoaded);
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

  // Request real-time structured advisors tips using `/api/insights`
  const fetchAIInsights = async () => {
    if (transactions.length === 0 && budgets.length === 0) return;
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, budgets, savingsGoals: goals, currency })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server returned and error invoking Insights.');
      }
      const data = await response.json();
      setAIInsights(data);
    } catch (err: any) {
      console.error(err);
      setInsightsError(err.message || "Insights could not be computed.");
    } finally {
      setLoadingInsights(false);
    }
  };

  // Run dynamic advisor insights on startup or currency change
  useEffect(() => {
    if (isDataLoaded) {
      fetchAIInsights();
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

    // Refresh insights automatically to match new balance logs
    setTimeout(() => fetchAIInsights(), 1500);
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

    setTimeout(() => fetchAIInsights(), 1500);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm("Are you sure you want to delete this log entry?")) {
      setTransactions(prev => prev.filter(t => t.id !== id));

      if (user && !user.isDemo) {
        await supabase.from('transactions').delete().eq('id', id);
      }

      setTimeout(() => fetchAIInsights(), 1550);
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

    setTimeout(() => fetchAIInsights(), 500);
  };

  const handleDeleteBudget = async (category: string) => {
    setBudgets(prev => prev.filter(b => b.category !== category));

    if (user && !user.isDemo) {
      await supabase.from('budgets').delete().eq('user_id', user.id).eq('category', category);
    }

    setTimeout(() => fetchAIInsights(), 500);
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

    setTimeout(() => {
      fetchAIInsights();
    }, 1500);
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
        const errDetails = await response.json();
        throw new Error(errDetails.error || "Advisor is temporarily locked.");
      }

      const result = await response.json();
      
      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        text: result.text || "I was unable to formulate financial responses. Please check settings parameters.",
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
    } catch (e: any) {
      console.error(e);
      const errBubble: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        text: `⚠️ Advisor Error: ${e.message || "An issue occurred. If you haven't set up your GEMINI_API_KEY inside Settings > Secrets, make sure to add it is configured."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errBubble]);
    } finally {
      setIsGeneratingMessage(false);
    }
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

    if (user && !user.isDemo) {
      await supabase.from('transactions').delete().eq('user_id', user.id);
      await supabase.from('budgets').delete().eq('user_id', user.id);
      await supabase.from('savings_goals').delete().eq('user_id', user.id);
      await supabase.from('chat_messages').delete().eq('user_id', user.id);
      await supabase.from('recurring_transactions').delete().eq('user_id', user.id);
    }
    
    setShowResetModal(false);
    
    setTimeout(() => {
      fetchAIInsights();
    }, 500);
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

    // Auto update advisor insight summaries
    setTimeout(() => {
      fetchAIInsights();
    }, 1500);
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

  // Detect if database contains seeded dummy data to offer one-click cleanup
  const hasSeededData = transactions.some(t => t.id === '1' || t.id === '2');

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50/70 text-gray-800'} transition-colors duration-200 antialiased flex flex-col font-sans pb-16 lg:pb-6`}>
      
      {/* Top Elegant bar */}
      <header className="bg-white dark:bg-slate-905 border-b border-gray-150 dark:border-slate-805/80 py-4 px-6 sticky top-0 z-40 shadow-2xs transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-905 dark:text-white tracking-tight">Ledger Smart</h1>
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
      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
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
                  className="text-[10px] font-bold border border-gray-200 text-gray-500 hover:bg-gray-50 py-1 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingInsights ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {loadingInsights ? (
                <div className="flex items-center gap-3 py-6 justify-center">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-purple-600 animate-spin" />
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-widest font-mono">Synthesizing spend logs...</span>
                </div>
              ) : insightsError ? (
                /* Sleek static general wealth tips fallback */
                <div className="space-y-4">
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

    </div>
  );
}
