import React, { useState, useEffect } from 'react';
import { Transaction, Budget, SavingsGoal, ChatMessage, BudgetTemplate } from './types';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import BudgetManager from './components/BudgetManager';
import SavingsGoals from './components/SavingsGoals';
import AIAssistant from './components/AIAssistant';
import BudgetTemplates from './components/BudgetTemplates';
import { 
  Building2, 
  LayoutDashboard, 
  WalletCards, 
  Receipt, 
  PiggyBank, 
  Sparkles,
  Info,
  Scale,
  BrainCircuit,
  Settings,
  RefreshCw,
  FolderHeart,
  X
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

const SEED_BUDGETS: Budget[] = [
  { category: 'Housing', limit: 1400 },
  { category: 'Food', limit: 500 },
  { category: 'Utilities', limit: 200 },
  { category: 'Transport', limit: 150 },
  { category: 'Shopping', limit: 300 },
  { category: 'Entertainment', limit: 200 }
];

const SEED_SAVINGS: SavingsGoal[] = [
  { id: 's1', name: 'Emergency Safety Lock', target: 8000, current: 3500, deadline: '2026-12-31' },
  { id: 's2', name: 'Alps Snowboarding Vacation', target: 2500, current: 850, deadline: '2026-09-15' }
];

export default function App() {
  // Current active frame tab
  const [activeTab, setActiveTab] = useState<'dash' | 'finance' | 'ledger' | 'savings' | 'ai' | 'templates'>('dash');

  const [customTemplates, setCustomTemplates] = useState<BudgetTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('fin_tracker_custom_templates');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Load state stores from LocalStorage if matching, otherwise fallback to seed data
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem('fin_tracker_transactions');
      return stored ? JSON.parse(stored) : SEED_TRANSACTIONS;
    } catch {
      return SEED_TRANSACTIONS;
    }
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      const stored = localStorage.getItem('fin_tracker_budgets');
      return stored ? JSON.parse(stored) : SEED_BUDGETS;
    } catch {
      return SEED_BUDGETS;
    }
  });

  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    try {
      const stored = localStorage.getItem('fin_tracker_goals');
      return stored ? JSON.parse(stored) : SEED_SAVINGS;
    } catch {
      return SEED_SAVINGS;
    }
  });

  // Chat memory state stores
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem('fin_tracker_chats');
      return stored ? JSON.parse(stored) : [];
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

  // Synchronizers syncing state changes into localStorage target
  useEffect(() => {
    localStorage.setItem('fin_tracker_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('fin_tracker_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('fin_tracker_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('fin_tracker_chats', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem('fin_tracker_custom_templates', JSON.stringify(customTemplates));
  }, [customTemplates]);

  // Request real-time structured advisors tips using `/api/insights`
  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, budgets, savingsGoals: goals })
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

  // Run dynamic advisor insights on startup
  useEffect(() => {
    fetchAIInsights();
  }, []);

  // Handler adding transactions
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const fresh: Transaction = {
      ...newTx,
      id: Math.random().toString(36).substring(2, 9)
    };
    setTransactions(prev => [fresh, ...prev]);
    // Refresh insights automatically to match new balance logs
    setTimeout(() => fetchAIInsights(), 1500);
  };

  // Handler editing transactions
  const handleUpdateTransaction = (id: string, updated: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
    setEditingTx(null);
    setTimeout(() => fetchAIInsights(), 1500);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm("Are you sure you want to delete this log entry?")) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      setTimeout(() => fetchAIInsights(), 1550);
    }
  };

  // Handler modifying limits
  const handleUpdateBudget = (category: string, limit: number) => {
    setBudgets(prev => {
      const idx = prev.findIndex(b => b.category === category);
      if (idx !== -1) {
        return prev.map(b => b.category === category ? { ...b, limit } : b);
      } else {
        return [...prev, { category, limit }];
      }
    });
    setTimeout(() => fetchAIInsights(), 500);
  };

  const handleDeleteBudget = (category: string) => {
    setBudgets(prev => prev.filter(b => b.category !== category));
    setTimeout(() => fetchAIInsights(), 500);
  };

  // Goal update handler
  const handleAddGoal = (newGoal: Omit<SavingsGoal, 'id'>) => {
    const fresh: SavingsGoal = {
      ...newGoal,
      id: Math.random().toString(36).substring(2, 9)
    };
    setGoals(prev => [...prev, fresh]);
  };

  const handleUpdateGoalProgress = (id: string, amount: number) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current: parseFloat((g.current + amount).toFixed(2)) } : g));
  };

  const handleDeleteGoal = (id: string) => {
    if (confirm("Are you sure you want to delete this savings target?")) {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
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

    try {
      const history = [...chatMessages, userMsg];
      const response = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          transactions,
          budgets,
          savingsGoals: goals
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

  const handleClearHistory = () => {
    if (confirm("Confirm erasing chatbot conversational memory?")) {
      setChatMessages([]);
    }
  };

  const handleSaveTemplate = (newTemplate: BudgetTemplate) => {
    setCustomTemplates(prev => {
      const idx = prev.findIndex(t => t.id === newTemplate.id);
      if (idx !== -1) {
        return prev.map(t => t.id === newTemplate.id ? newTemplate : t);
      }
      return [newTemplate, ...prev];
    });
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this blueprint?")) {
      setCustomTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleApplyTemplate = (options: {
    templateId: string;
    targetMonth: string;
    updateBudgets: boolean;
    generateTransactions: boolean;
  }) => {
    const { templateId, targetMonth, updateBudgets, generateTransactions } = options;
    
    // Fallback options combining default system templates with custom ones
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
          { category: 'Savings', targetAmount: 2600 }
        ]
      }
    ];

    const template = [...defaults, ...customTemplates].find(t => t.id === templateId);
    if (!template) return;

    // Overwrite category budgets limits if selected
    if (updateBudgets) {
      setBudgets(prev => {
        const updated = [...prev];
        template.expenses.forEach(exp => {
          const idx = updated.findIndex(b => b.category === exp.category);
          if (idx !== -1) {
            updated[idx] = { category: exp.category, limit: exp.targetAmount };
          } else {
            updated.push({ category: exp.category, limit: exp.targetAmount });
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
        generated.push({
          id: 'gen-inc-' + Math.random().toString(36).substring(2, 9),
          type: 'income',
          amount: inc.expectedAmount,
          category: 'Income',
          date: fullDatePattern,
          description: `Loaded Expected Inflow: ${inc.name}`
        });
      });

      // Targets Spends (skip savings category logs since that acts strictly as transfer in actual app)
      template.expenses.forEach(exp => {
        if (exp.category === 'Savings') return;
        generated.push({
          id: 'gen-exp-' + Math.random().toString(36).substring(2, 9),
          type: 'expense',
          amount: exp.targetAmount,
          category: exp.category,
          date: fullDatePattern,
          description: `Loaded Target: Rent/Baseline for ${exp.category}`
        });
      });

      setTransactions(prev => [...generated, ...prev]);
    }

    // Auto update advisor insight summaries
    setTimeout(() => {
      fetchAIInsights();
    }, 1500);
  };

  // Helper trigger action chip matching budget optimizes queries
  const triggerAIBudgetAssistant = () => {
    setActiveTab('ai');
    handleSendMessage("Analyze my category budgets constraints vs spent volumes, and suggest optimization strategies.");
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-gray-800 antialiased flex flex-col font-sans">
      
      {/* Top Elegant bar */}
      <header className="bg-white border-b border-gray-150 py-4 px-6 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-905 tracking-tight">Ledger Smart</h1>
              <p className="text-[10px] text-gray-400 font-mono tracking-wider font-semibold">PERSONAL FINANCE COMPANION</p>
            </div>
          </div>

          {/* Quick Stats Header */}
          <div className="hidden md:flex items-center gap-6 text-xs">
            <div className="border-l border-gray-200 pl-4">
              <span className="text-gray-400 font-medium font-mono text-[9px] uppercase">Cash Flow Velocity</span>
              <p className="font-bold text-gray-800 font-mono mt-0.5">May 2026 Tracking Period</p>
            </div>
            {aiInsights && (
              <div className="border-l border-gray-200 pl-4 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  aiInsights.overallStatus === 'On Track' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`} />
                <div>
                  <span className="text-gray-400 font-medium font-mono text-[9px] uppercase">Smart Status</span>
                  <p className="font-bold text-gray-800 font-mono mt-0.5">{aiInsights.overallStatus}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Core */}
      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar Drawer */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-3xs space-y-2">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 block mb-2">Workspace Modules</span>

            {/* Dashboard Link */}
            <button
              onClick={() => { setActiveTab('dash'); setEditingTx(null); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'dash'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
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
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
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
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
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
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
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
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <FolderHeart className="w-4.5 h-4.5" />
              Budget Blueprints
            </button>

            {/* AI advisor link */}
            <button
              onClick={() => { setActiveTab('ai'); setEditingTx(null); }}
              className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Sparkles className="w-4.5 h-4.5" />
              Gemini Advisor Chat
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
            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs space-y-5">
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
                /* Gemini unavailable fallback template */
                <div className="flex items-start gap-4 p-4.5 bg-gray-50 border border-gray-150 rounded-xl">
                  <Info className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-700">Advisory Demo Mode</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      To activate custom live diagnostic metrics, supply your <span className="font-mono text-[10px] bg-gray-150 font-bold px-1.5 py-0.5 rounded text-gray-700">GEMINI_API_KEY</span> inside your app secrets or `.env` configuration file. 
                    </p>
                    <div className="pt-2 text-[11px] font-medium text-purple-700">
                      💡 Quick Budget Tip: Try keeping total fixed expenses under 50% of monthly income to guarantee a 20% savings margin.
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
                              <span className="text-emerald-700 font-mono">+${op.savingEstimate}</span>
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
          )}

          {/* Active rendering tabs content */}
          {activeTab === 'dash' && (
            <Dashboard 
              transactions={transactions} 
              budgets={budgets} 
              currencySymbol="$"
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
                  currencySymbol="$"
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
                  currencySymbol="$"
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
              currencySymbol="$"
              onAskAIAboutBudget={triggerAIBudgetAssistant}
            />
          )}

          {activeTab === 'savings' && (
            <SavingsGoals
              goals={goals}
              onAddGoal={handleAddGoal}
              onUpdateGoalProgress={handleUpdateGoalProgress}
              onDeleteGoal={handleDeleteGoal}
              currencySymbol="$"
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
              currencySymbol="$"
            />
          )}

        </section>

      </main>

      {/* Footer info line */}
      <footer className="bg-white border-t border-gray-150 py-5 text-center mt-12 text-[10px] font-medium font-mono text-gray-400">
        Ledger Smart Tracker Portfolio Corporation © 2026. All statistics are encrypted securely client-side.
      </footer>

    </div>
  );
}
