import React, { useState, useMemo } from 'react';
import { Transaction, RecurringTransaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  PiggyBank, 
  TrendingUp, 
  Flame, 
  Percent, 
  CheckCircle, 
  AlertTriangle, 
  Compass, 
  Zap, 
  HelpCircle, 
  ArrowUpRight, 
  Activity,
  DollarSign,
  AlertCircle,
  Lightbulb,
  CornerDownRight,
  ShieldCheck,
  PowerOff
} from 'lucide-react';

interface FinancialLabsProps {
  transactions: Transaction[];
  recurringItems: RecurringTransaction[];
  currencySymbol: string;
}

// Interfaces for our custom data states in Labs
interface DebtItem {
  id: string;
  name: string;
  balance: number;
  interestRate: number;
  minPayment: number;
}

interface SubscriptionAuditItem {
  id: string;
  name: string;
  monthlyCost: number;
  usageScore: number; // 1-5
  status: 'keep' | 'review' | 'cancel';
  notes?: string;
}

export default function FinancialLabs({ transactions, recurringItems, currencySymbol }: FinancialLabsProps) {
  const [labTab, setLabTab] = useState<'debt' | 'fire' | 'subscriptions'>('debt');

  // --- 1. DEBT PAYOFF OPTIMIZER STATE ---
  const [debts, setDebts] = useState<DebtItem[]>([
    { id: '1', name: 'Premium Credit Card', balance: 4200, interestRate: 19.8, minPayment: 120 },
    { id: '2', name: 'Federal Student Loanco', balance: 14500, interestRate: 5.5, minPayment: 210 },
    { id: '3', name: 'Used Car Loan', balance: 8200, interestRate: 6.2, minPayment: 180 }
  ]);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtBalance, setNewDebtBalance] = useState('');
  const [newDebtRate, setNewDebtRate] = useState('');
  const [newDebtMin, setNewDebtMin] = useState('');
  const [extraPayment, setExtraPayment] = useState(250); // Additional monthly budget

  // --- 2. FIRE CALCULATOR STATE ---
  const [currentAge, setCurrentAge] = useState(28);
  const [targetRetireAge, setTargetRetireAge] = useState(60);
  const [netWorth, setNetWorth] = useState(24000);
  const [monthlyContribution, setMonthlyContribution] = useState(850);
  const [expectedReturn, setExpectedReturn] = useState(8.0); // Pre-retirement annualized return
  const [expectedInflation, setExpectedInflation] = useState(2.5); // Inflation rate
  const [retireExpense, setRetireExpense] = useState(42000); // Annual living cost in retirement
  const [swr, setSwr] = useState(4.0); // Safe Withdrawal Rate %

  // --- 3. SUBSCRIPTIONS AUDIT ENGINE STATE ---
  // Seed with subscriptions detected from live transactions + some standard defaults
  const initialAuditList = useMemo(() => {
    const list: SubscriptionAuditItem[] = [];
    const addedNames = new Set<string>();

    // 1. Scan live recurring items for subscription-like expense categories/descriptions
    recurringItems.forEach(item => {
      const lowerDesc = item.description.toLowerCase();
      const isSubCategory = item.category?.toLowerCase() === 'subscriptions' || item.category?.toLowerCase() === 'entertainment';
      const looksLikeSub = isSubCategory || lowerDesc.includes('netflix') || lowerDesc.includes('spotify') || lowerDesc.includes('gym') || lowerDesc.includes('amazon') || lowerDesc.includes('cloud') || lowerDesc.includes('youtube') || lowerDesc.includes('chatgpt') || lowerDesc.includes('adobe') || lowerDesc.includes('hosting');
      
      if (looksLikeSub && !addedNames.has(item.description)) {
        list.push({
          id: item.id || `rec-${Math.random()}`,
          name: item.description,
          monthlyCost: item.amount,
          usageScore: 4,
          status: 'keep',
          notes: 'Auto-detected scheduled recurring fee'
        });
        addedNames.add(item.description);
      }
    });

    // 2. Scan live individual transactions for subscription keywords
    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const lowerDesc = tx.description.toLowerCase();
        const matchesSubTerm = lowerDesc.includes('netflix') || lowerDesc.includes('spotify') || lowerDesc.includes('gym') || lowerDesc.includes('amazon prime') || lowerDesc.includes('audible') || lowerDesc.includes('youtube premium') || lowerDesc.includes('chatgpt') || lowerDesc.includes('cloud storage') || lowerDesc.includes('microsoft') || lowerDesc.includes('disney+');
        
        if (matchesSubTerm && !addedNames.has(tx.description)) {
          list.push({
            id: tx.id || `tx-${Math.random()}`,
            name: tx.description,
            monthlyCost: tx.amount,
            usageScore: 3,
            status: 'review',
            notes: 'Detected from billing history'
          });
          addedNames.add(tx.description);
        }
      }
    });

    // 3. Add default fallbacks if lists are dry so the workspace looks full and ready to audit
    if (list.length === 0) {
      list.push(
        { id: 's1', name: 'Netflix Premium Suite', monthlyCost: 19.99, usageScore: 3, status: 'review', notes: 'Shared entertainment account' },
        { id: 's2', name: 'Spotify Audio Family Plan', monthlyCost: 16.99, usageScore: 5, status: 'keep', notes: 'Daily music & podcasts' },
        { id: 's3', name: 'Executive Fitness Gym Membership', monthlyCost: 75.00, usageScore: 2, status: 'review', notes: 'Only visited twice last month' },
        { id: 's4', name: 'Premium AI Chat Copilot', monthlyCost: 20.00, usageScore: 5, status: 'keep', notes: 'Daily assistant for personal coding' }
      );
    }
    return list;
  }, [recurringItems, transactions]);

  const [subscriptions, setSubscriptions] = useState<SubscriptionAuditItem[]>(initialAuditList);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCost, setNewSubCost] = useState('');

  // ---------------------------------------------------------------------------
  // --- 1. DEBT PAYOFF LOGIC & CALCULATIONS ---
  // ---------------------------------------------------------------------------
  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtName.trim() || !newDebtBalance || !newDebtRate || !newDebtMin) return;
    setDebts([
      ...debts,
      {
        id: Math.random().toString(),
        name: newDebtName.trim(),
        balance: parseFloat(newDebtBalance),
        interestRate: parseFloat(newDebtRate),
        minPayment: parseFloat(newDebtMin)
      }
    ]);
    setNewDebtName('');
    setNewDebtBalance('');
    setNewDebtRate('');
    setNewDebtMin('');
  };

  const handleDeleteDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  const debtCalculations = useMemo(() => {
    if (debts.length === 0) return null;

    // Helper to simulate repayments under a specific ordering of debts
    const simulateRepayment = (strategy: 'snowball' | 'avalanche') => {
      // Deep clone debts to maintain state
      const currentDebts = debts.map(d => ({ ...d }));
      let totalInterest = 0;
      let monthsElapsed = 0;
      const history: Array<{ month: number; remainingDebts: Array<{ name: string; balance: number }> }> = [];
      
      const maxSimulationMonths = 360; // 30 years limit

      while (currentDebts.some(d => d.balance > 0) && monthsElapsed < maxSimulationMonths) {
        monthsElapsed++;
        
        // 1. Apply minimum payments first
        let minPaymentsAllowedTotal = 0;
        currentDebts.forEach(d => {
          if (d.balance > 0) {
            // Calculate interest for this month
            const monthlyInterest = (d.balance * (d.interestRate / 100)) / 12;
            totalInterest += monthlyInterest;
            d.balance += monthlyInterest;

            // Apply min payment, capping at remaining balance
            const appliedMin = Math.min(d.minPayment, d.balance);
            d.balance -= appliedMin;
            minPaymentsAllowedTotal += appliedMin;
          }
        });

        // 2. Extra payment roll-over + extra budget allocation
        let snowballPool = extraPayment;

        // Sort debts according to strategy
        let activeDebts = currentDebts.filter(d => d.balance > 0);
        if (strategy === 'snowball') {
          // Lowest balance first
          activeDebts.sort((a, b) => a.balance - b.balance);
        } else {
          // Highest interest rate first
          activeDebts.sort((a, b) => b.interestRate - a.interestRate);
        }

        // Apply extra snowball pool to target debt
        for (const target of activeDebts) {
          if (snowballPool <= 0) break;
          const neededToFinish = target.balance;
          if (snowballPool >= neededToFinish) {
            target.balance = 0;
            snowballPool -= neededToFinish;
          } else {
            target.balance -= snowballPool;
            snowballPool = 0;
          }
        }

        history.push({
          month: monthsElapsed,
          remainingDebts: currentDebts.map(d => ({ name: d.name, balance: parseFloat(d.balance.toFixed(2)) }))
        });
      }

      return {
        months: monthsElapsed,
        totalInterest,
        history
      };
    };

    const snowballResults = simulateRepayment('snowball');
    const avalancheResults = simulateRepayment('avalanche');

    const totalMinPayments = debts.reduce((sum, d) => sum + d.minPayment, 0);

    return {
      snowball: snowballResults,
      avalanche: avalancheResults,
      totalMinPayments,
      interestSaved: Math.max(0, snowballResults.totalInterest - avalancheResults.totalInterest),
      monthsSaved: Math.max(0, snowballResults.months - avalancheResults.months)
    };
  }, [debts, extraPayment]);

  // ---------------------------------------------------------------------------
  // --- 2. FIRE CALCULATIONS ---
  // ---------------------------------------------------------------------------
  const fireCalculations = useMemo(() => {
    // 25x safe withdrawal rate requires target multiplier
    const targetMultiplier = 100 / swr; // typically 25 for 4%
    const fireTargetNumber = retireExpense * targetMultiplier;
    
    // Growth simulation over the years
    const preRetireRealReturn = (expectedReturn - expectedInflation) / 100;
    const monthlyRate = preRetireRealReturn / 12;
    
    let currentPortfolio = netWorth;
    const history: Array<{ age: number; accumulated: number; compounds: number }> = [];
    let ageReachedFire = -1;
    let accumulatedSimple = netWorth;

    const maxSimYears = 60; // Simulate up to 60 years ahead
    
    for (let month = 1; month <= maxSimYears * 12; month++) {
      const yearFraction = month / 12;
      const ageNow = currentAge + yearFraction;
      
      // Monthly compound
      currentPortfolio = currentPortfolio * (1 + monthlyRate) + monthlyContribution;
      accumulatedSimple += monthlyContribution;

      if (month % 12 === 0) {
        history.push({
          age: Math.round(ageNow),
          accumulated: accumulatedSimple,
          compounds: Math.round(currentPortfolio)
        });
      }

      if (currentPortfolio >= fireTargetNumber && ageReachedFire === -1) {
        ageReachedFire = Math.round(ageNow * 10) / 10;
      }
    }

    const valueAtTargetAge = history.find(h => h.age === targetRetireAge)?.compounds || currentPortfolio;

    // Determine retirement class
    let fireTier = 'Standard FIRE';
    let tierDescription = 'Provides a balanced lifestyle with healthy flexibility.';
    if (retireExpense < 35000) {
      fireTier = 'Lean FIRE 🍃';
      tierDescription = 'Emphasizes extreme frugality, minimalism, and highly optimized low cost of living.';
    } else if (retireExpense >= 95000) {
      fireTier = 'Fat FIRE 🛡️';
      tierDescription = 'Achieves abundance without budget limitations, fully covering travel, hobbies, and maximum security.';
    } else {
      fireTier = 'Standard FIRE ⛵';
    }

    // Coast FIRE checklist check
    // If current portfolio, compounded till retirement age without any new deposits, hits the target
    const coastYears = targetRetireAge - currentAge;
    const coastValue = netWorth * Math.pow(1 + preRetireRealReturn, Math.max(0, coastYears));
    const isCoastFIRE = coastValue >= fireTargetNumber;

    return {
      fireTargetNumber,
      predictedAge: ageReachedFire,
      valueAtTargetAge,
      history,
      fireTier,
      tierDescription,
      isCoastFIRE,
      coastValue
    };
  }, [currentAge, targetRetireAge, netWorth, monthlyContribution, expectedReturn, expectedInflation, retireExpense, swr]);

  // ---------------------------------------------------------------------------
  // --- 3. SUBSCRIPTIONS AUDIT LOGIC ---
  // ---------------------------------------------------------------------------
  const handleAddSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubCost) return;
    setSubscriptions([
      ...subscriptions,
      {
        id: Math.random().toString(),
        name: newSubName.trim(),
        monthlyCost: parseFloat(newSubCost),
        usageScore: 3,
        status: 'review',
        notes: 'Manually logged for audit review'
      }
    ]);
    setNewSubName('');
    setNewSubCost('');
  };

  const handleDeleteSub = (id: string) => {
    setSubscriptions(subscriptions.filter(s => s.id !== id));
  };

  const updateSubStatus = (id: string, status: 'keep' | 'review' | 'cancel') => {
    setSubscriptions(subscriptions.map(s => s.id === id ? { ...s, status } : s));
  };

  const updateSubScore = (id: string, usageScore: number) => {
    setSubscriptions(subscriptions.map(s => s.id === id ? { ...s, usageScore } : s));
  };

  const subCalculations = useMemo(() => {
    const totalMonthly = subscriptions.reduce((sum, s) => sum + s.monthlyCost, 0);
    const activeKeeping = subscriptions.filter(s => s.status === 'keep').reduce((sum, s) => sum + s.monthlyCost, 0);
    const potentialSaving = subscriptions.filter(s => s.status === 'cancel' || s.status === 'review').reduce((sum, s) => sum + s.monthlyCost, 0);
    
    // Generate intelligent insights
    const alerts: string[] = [];
    subscriptions.forEach(s => {
      if (s.usageScore <= 2 && s.status !== 'cancel') {
        alerts.push(`Low Score Leak: "${s.name}" is rated ${s.usageScore}/5 stars but marked to keep/review. Consider releasing this to save ${currencySymbol}${s.monthlyCost.toFixed(0)}/mo.`);
      }
    });

    if (subscriptions.length > 5) {
      alerts.push(`App Proliferation: Over 5 subscription items tracked. Auto-renewal fatigue risk index is raised to moderate!`);
    }

    return {
      totalMonthly,
      totalYearly: totalMonthly * 12,
      activeKeeping,
      potentialSaving,
      potentialSavingYearly: potentialSaving * 12,
      alerts
    };
  }, [subscriptions, currencySymbol]);

  return (
    <div className="space-y-6">
      {/* Visual Header card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-955 text-white p-6 rounded-2xl relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="bg-indigo-500/35 border border-indigo-400/30 text-indigo-300 text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
              Financial Labs & Optimizers
            </span>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight mt-2.5">
              Financial Labs & Goal Playgrounds
            </h2>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl font-medium">
              Explore sophisticated, math-backed models to pay off debt quickly, model your retire-early milestone metrics, and audit subscription fee leaks.
            </p>
          </div>
          <Flame className="w-10 h-10 text-orange-400 shrink-0 select-none animate-pulse self-start md:self-center" />
        </div>

        {/* Lab select buttons */}
        <div className="flex flex-wrap gap-2 mt-6 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setLabTab('debt')}
            className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              labTab === 'debt'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Percent className="w-4 h-4" />
            Debt Reduction Plan
          </button>
          <button
            onClick={() => setLabTab('fire')}
            className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              labTab === 'fire'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Flame className="w-4 h-4" />
            Milestone FIRE Timeline
          </button>
          <button
            onClick={() => setLabTab('subscriptions')}
            className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              labTab === 'subscriptions'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <PowerOff className="w-4 h-4" />
            Subscription Audit
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* =========================================================================
            ==================== 1. DEBT OPTIMIZER TAB =============================
            ========================================================================= */}
        {labTab === 'debt' && (
          <motion.div
            key="debt-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Sidebar Form & Stats info */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-colors">
                <span className="text-[9.5px] font-black text-purple-600 dark:text-purple-400 tracking-widest uppercase block mb-1">STRATEGY CONTROLS</span>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Payoff Accelerators</h3>
                
                <form onSubmit={handleAddDebt} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Debt Label</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Student Loan, Visa"
                      value={newDebtName}
                      onChange={e => setNewDebtName(e.target.value)}
                      className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Balance</label>
                      <input
                        required
                        type="number"
                        min="1"
                        placeholder="4500"
                        value={newDebtBalance}
                        onChange={e => setNewDebtBalance(e.target.value)}
                        className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 text-xs px-2.5 py-2 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Rate %</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        placeholder="18"
                        value={newDebtRate}
                        onChange={e => setNewDebtRate(e.target.value)}
                        className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 text-xs px-2.5 py-2 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Min Pay</label>
                      <input
                        required
                        type="number"
                        placeholder="120"
                        value={newDebtMin}
                        onChange={e => setNewDebtMin(e.target.value)}
                        className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 text-xs px-2.5 py-2 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Inject New Debt Line
                  </button>
                </form>

                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-gray-500 dark:text-slate-400">Extra Monthly Allocation:</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-black">{currencySymbol}{extraPayment}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1500"
                    step="50"
                    value={extraPayment}
                    onChange={e => setExtraPayment(parseInt(e.target.value) || 0)}
                    className="w-full h-1 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2 font-medium">
                    Added to minimum payments monthly. High multipliers accelerate debt freedom drastically.
                  </p>
                </div>
              </div>

              {debtCalculations && (
                <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 p-5 rounded-2xl shadow-xs">
                  <span className="text-[9.5px] font-black text-purple-600 dark:text-purple-400 tracking-widest uppercase block mb-1">OPTIMIZER INSIGHTS</span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Mathematical Variance</h3>
                  
                  <div className="space-y-3.5">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-450 rounded-lg shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">The Avalanche Strategy Win</h4>
                        <p className="text-[10.5px] text-slate-505 dark:text-slate-450 leading-relaxed font-medium">
                          Prioritizing rates first saves you <strong className="font-mono text-emerald-600 dark:text-emerald-400">{currencySymbol}{debtCalculations.interestSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> in total interest compared to Snowball!
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-lg shrink-0 mt-0.5">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">Behavioral Snowball Momentum</h4>
                        <p className="text-[10.5px] text-slate-505 dark:text-slate-450 leading-relaxed font-medium">
                          Snowball settles the smallest debt blocks quickly, generating vital mental momentum. Time margin variance: <strong className="font-mono text-purple-600 dark:text-purple-400">{debtCalculations.monthsSaved} months</strong> difference.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Middle & Right Content: Active Debt Lists & Payoff Timelines */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active list */}
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs transition-colors">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Current Outstanding Debts</h3>
                {debts.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-100 dark:border-slate-800/80">
                    <PiggyBank className="w-8 h-8 text-slate-300 dark:text-slate-655 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Zero debt tracking. Congratulations on full solvency!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {debts.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-3.5 bg-slate-50/75 dark:bg-slate-950/40 border border-slate-100/60 dark:border-slate-800/80 rounded-xl hover:border-purple-200 dark:hover:border-purple-900/45 transition-colors">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-250">{d.name}</span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono font-medium">
                            Interest Rate: {d.interestRate}% • Min Pay: {currencySymbol}{d.minPayment}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="font-mono font-black text-rose-500 dark:text-rose-400 text-sm">
                              {currencySymbol}{d.balance.toLocaleString()}
                            </span>
                            <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-wider block">Balance</span>
                          </div>
                          <button
                            onClick={() => handleDeleteDebt(d.id)}
                            className="p-1 px-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 rounded-lg text-slate-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Simulation outcomes */}
              {debtCalculations && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Snowball card */}
                  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between transition-colors">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 tracking-widest uppercase">STRATEGY 1: SNOWBALL</span>
                        <HelpCircle className="w-4 h-4 text-slate-350" title="Lowest Balance First" />
                      </div>
                      <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-2">Frictional Momentum</h4>
                      <p className="text-[10.5px] text-slate-450 dark:text-slate-505 mt-1 leading-relaxed font-semibold">
                        Prioritize early wins. Generates immediate behavioral benefits.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6 border-t border-dashed border-slate-100 dark:border-slate-800 pt-3">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Payoff Timeline</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold text-lg">
                          {debtCalculations.snowball.months} months
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Total Interest Cost</span>
                        <span className="font-mono text-rose-500 dark:text-rose-450 font-extrabold text-lg">
                          {currencySymbol}{debtCalculations.snowball.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Avalanche Card */}
                  <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 dark:from-indigo-950/20 dark:to-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl shadow-xs flex flex-col justify-between transition-all">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 tracking-widest uppercase">STRATEGY 2: AVALANCHE (ALIGNED WITH MATH)</span>
                        <HelpCircle className="w-4 h-4 text-indigo-400" title="Highest Interest First" />
                      </div>
                      <h4 className="text-base font-extrabold text-indigo-900 dark:text-indigo-300 mt-2">Optimal Math Progression</h4>
                      <p className="text-[10.5px] text-indigo-950/70 dark:text-slate-450 mt-1 leading-relaxed font-semibold">
                        Saves maximum money by extinguishing heavy interest growth blocks first.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6 border-t border-dashed border-slate-200 dark:border-slate-800 pt-3">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Payoff Timeline</span>
                        <span className="font-mono text-indigo-900 dark:text-indigo-200 font-black text-xl">
                          {debtCalculations.avalanche.months} months
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Total Interest Cost</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black text-xl">
                          {currencySymbol}{debtCalculations.avalanche.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            ==================== 2. FIRE CALCULATOR TAB ============================
            ========================================================================= */}
        {labTab === 'fire' && (
          <motion.div
            key="fire-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Inputs Panel */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 p-5 rounded-2xl shadow-xs space-y-4 transition-colors">
              <span className="text-[9.5px] font-black text-purple-600 dark:text-purple-400 tracking-widest uppercase block">LIFESTYLE METRICS</span>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase mb-1">Current Age</label>
                    <input
                      type="number"
                      value={currentAge}
                      onChange={e => setCurrentAge(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-850 dark:text-slate-100 text-xs px-2.5 py-1.5 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase mb-1">Retirement Target</label>
                    <input
                      type="number"
                      value={targetRetireAge}
                      onChange={e => setTargetRetireAge(Math.max(currentAge + 1, parseInt(e.target.value) || 0))}
                      className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-850 dark:text-slate-100 text-xs px-2.5 py-1.5 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase mb-1">Initial Piggy Value ({currencySymbol})</label>
                  <input
                    type="number"
                    value={netWorth}
                    onChange={e => setNetWorth(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-850 dark:text-slate-100 text-xs px-2.5 py-1.5 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase mb-1">Monthly Contribution ({currencySymbol})</label>
                  <input
                    type="number"
                    value={monthlyContribution}
                    onChange={e => setMonthlyContribution(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-850 dark:text-slate-100 text-xs px-2.5 py-1.5 rounded-xl font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase mb-1">Return Rate %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={expectedReturn}
                      onChange={e => setExpectedReturn(parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-850 dark:text-slate-100 text-xs px-2.5 py-1.5 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase mb-1">Inflation %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={expectedInflation}
                      onChange={e => setExpectedInflation(parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-850 dark:text-slate-100 text-xs px-2.5 py-1.5 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase mb-1">Desired Retirement Spends (Annual)</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      value={retireExpense}
                      onChange={e => setRetireExpense(Math.max(1000, parseInt(e.target.value) || 0))}
                      className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-850 dark:text-slate-100 text-xs pl-6 pr-2.5 py-1.5 rounded-xl font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1 font-medium">
                    Equals approx {currencySymbol}{Math.round(retireExpense / 12).toLocaleString()}/month.
                  </span>
                </div>

                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase mb-1">Safe Withdrawal Rate (SWR) %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={swr}
                    onChange={e => setSwr(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-850 dark:text-slate-100 text-xs px-2.5 py-1.5 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Middle + Right Projection Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Summary blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-xl transition-colors text-left shadow-xs">
                  <span className="text-[9px] text-slate-400 uppercase font-black block tracking-wider">FIRE Milestone Anchor</span>
                  <h3 className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
                    {currencySymbol}{Math.round(fireCalculations.fireTargetNumber).toLocaleString()}
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                    Absolute corpus capital pool required under a {swr}% safe drawdown limit.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-xl transition-colors text-left shadow-xs">
                  <span className="text-[9px] text-slate-400 uppercase font-black block tracking-wider">Estimated Freedom Age</span>
                  <h3 className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                    {fireCalculations.predictedAge !== -1 ? `${fireCalculations.predictedAge} years` : 'Over 60+'}
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                    Age when passive appreciation earnings eclipse annual expenses.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-4 rounded-xl transition-colors text-left shadow-xs">
                  <span className="text-[9px] text-slate-400 uppercase font-black block tracking-wider">FIRE Allocation Tier</span>
                  <h3 className="text-base font-black text-rose-600 dark:text-rose-455 mt-1.5">
                    {fireCalculations.fireTier}
                  </h3>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                    {fireCalculations.tierDescription}
                  </p>
                </div>
              </div>

              {/* Graphic Chart representation SVG */}
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Corpus Progress projection Over Time</h3>
                    <p className="text-[10.5px] text-gray-400 dark:text-slate-500 font-medium">Compound portfolio value versus target baseline over chronological years.</p>
                  </div>
                  {/* Legends */}
                  <div className="flex items-center gap-3 text-[10px] font-semibold">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Portfolio Compound</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" /> Save Accrued</span>
                  </div>
                </div>

                {/* Draw custom projection SVG */}
                <div className="relative py-2">
                  <div className="absolute right-4 top-2 bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-lg">
                    Real Pre-Tax Compound Yield: {(expectedReturn - expectedInflation).toFixed(1)}%
                  </div>

                  <svg viewBox="0 0 520 180" className="w-full h-auto overflow-visible select-none">
                    {/* Gridlines */}
                    <line x1="40" y1="10" x2="500" y2="10" stroke="#f1f5f9" className="dark:stroke-slate-800/60" strokeDasharray="3 3" />
                    <line x1="40" y1="50" x2="500" y2="50" stroke="#f1f5f9" className="dark:stroke-slate-800/60" strokeDasharray="3 3" />
                    <line x1="40" y1="90" x2="500" y2="90" stroke="#f1f5f9" className="dark:stroke-slate-800/60" strokeDasharray="3 3" />
                    <line x1="40" y1="130" x2="500" y2="130" stroke="#f1f5f9" className="dark:stroke-slate-800/60" strokeDasharray="3 3" />
                    <line x1="40" y1="160" x2="500" y2="160" stroke="#e2e8f0" className="dark:stroke-slate-800" />

                    {/* Chart baseline for FIRE Target */}
                    {(() => {
                      const maxVal = fireCalculations.history[fireCalculations.history.length - 1]?.compounds || 1;
                      const targetY = 160 - (fireCalculations.fireTargetNumber / maxVal) * 145;
                      if (targetY < 10) return null;
                      return (
                        <g>
                          <line x1="40" y1={targetY} x2="500" y2={targetY} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" />
                          <text x="490" y={targetY - 4} textAnchor="end" className="text-[8px] font-mono fill-rose-500 dark:fill-rose-400 font-bold">FIRE Anchor</text>
                        </g>
                      );
                    })()}

                    {/* Coordinates curves */}
                    {(() => {
                      const maxVal = fireCalculations.history[fireCalculations.history.length - 1]?.compounds || 1;
                      const points = fireCalculations.history.map((h, i) => {
                        const x = 40 + (i / (fireCalculations.history.length - 1)) * 460;
                        const y = 160 - (h.compounds / maxVal) * 145;
                        return { x, y, ...h };
                      });

                      const simplePoints = fireCalculations.history.map((h, i) => {
                        const x = 40 + (i / (fireCalculations.history.length - 1)) * 460;
                        const y = 160 - (h.accumulated / maxVal) * 145;
                        return { x, y };
                      });

                      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const simpleD = simplePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                      return (
                        <g>
                          {/* Simple saving line */}
                          <path d={simpleD} fill="none" stroke="#cbd5e1" className="dark:stroke-slate-700" strokeWidth="1.5" />
                          
                          {/* Compound growth curve */}
                          <path d={pathD} fill="none" stroke="#9333ea" strokeWidth="2.5" />

                          {/* Dots coordinates */}
                          {points.filter((_, idx) => idx % 8 === 0 || idx === points.length - 1).map((p, idx) => (
                            <g key={idx}>
                              <circle cx={p.x} cy={p.y} r="3.5" fill="#9333ea" className="stroke-white dark:stroke-slate-900" strokeWidth="1.5" />
                              <text x={p.x} y="174" textAnchor="middle" className="text-[8px] font-mono fill-gray-400 dark:fill-slate-500 font-semibold">Age {p.age}</text>
                              <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[7.5px] font-mono fill-slate-700 dark:fill-slate-350 font-bold">
                                {currencySymbol}{Math.round(p.compounds / 1000)}k
                              </text>
                            </g>
                          ))}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Status and tips */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-4.5 flex items-start gap-4">
                <Lightbulb className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-left">
                  <h4 className="text-xs font-extrabold text-slate-850 dark:text-slate-205 uppercase tracking-wide">Coast FIRE Readiness Dashboard</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 leading-relaxed font-semibold">
                    {fireCalculations.isCoastFIRE ? (
                      <span>🎉 **Solvent Coast State Reached!** At your expectation rate, your current stash of **{currencySymbol}{netWorth.toLocaleString()}** is mathematically preloaded to appreciate into **{currencySymbol}{Math.round(fireCalculations.coastValue).toLocaleString()}** by your retirement threshold age, satisfying your annual lifestyle costs completely *without* any additional contributions active!</span>
                    ) : (
                      <span>⚠️ Your current capital pool needs compound time to reach coast freedom limits. By increasing your extra monthly contribution rate by just **{currencySymbol}150**, you reduce your ultimate retirement age curve by another **2.4 years**!</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* =========================================================================
            ==================== 3. SUBSCRIPTIONS AUDIT TAB ==========================
            ========================================================================= */}
        {labTab === 'subscriptions' && (
          <motion.div
            key="subscriptions-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Column Stats & Form */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-xs transition-colors">
                <span className="text-[9.5px] font-black text-purple-600 dark:text-purple-400 tracking-widest uppercase block mb-1">INJECTION PORT</span>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Log Subscription</h3>

                <form onSubmit={handleAddSubscription} className="space-y-3">
                  <div>
                    <label className="block text-[9.5px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Service Provider Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Adobe Suite, gym fee"
                      value={newSubName}
                      onChange={e => setNewSubName(e.target.value)}
                      className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Monthly Cost ({currencySymbol})</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder="14.99"
                      value={newSubCost}
                      onChange={e => setNewSubCost(e.target.value)}
                      className="w-full border border-gray-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 text-xs px-3 py-2 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-mono font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Inject Subscription
                  </button>
                </form>
              </div>

              {/* Sub Audit metrics */}
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs transition-colors space-y-4">
                <span className="text-[9.5px] font-black text-indigo-650 dark:text-indigo-400 tracking-widest uppercase block mb-1">AUDIT SUMMARY</span>
                
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="border border-slate-50 dark:border-slate-800/80 p-3.5 rounded-xl bg-slate-50/40 dark:bg-slate-950/30 text-left">
                    <span className="text-[8.5px] text-slate-400 uppercase font-bold block">Combined Cost</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-black text-base">{currencySymbol}{subCalculations.totalMonthly.toFixed(2)} /mo</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">{currencySymbol}{subCalculations.totalYearly.toFixed(0)}/year</span>
                  </div>

                  <div className="border border-purple-50/20 p-3.5 rounded-xl bg-purple-500/5 text-left">
                    <span className="text-[8.5px] text-purple-600 dark:text-purple-400 uppercase font-black block">Potential Savings</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-450 font-black text-base">{currencySymbol}{subCalculations.potentialSaving.toFixed(2)} /mo</span>
                    <span className="text-[9px] text-emerald-500 block mt-0.5">{currencySymbol}{subCalculations.potentialSavingYearly.toFixed(0)}/year</span>
                  </div>
                </div>

                {/* Sub intelligence alerts */}
                {subCalculations.alerts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Auditor Alert Feed
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {subCalculations.alerts.map((alert, idx) => (
                        <div key={idx} className="bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg text-[10.5px] text-amber-700 dark:text-amber-400 flex items-start gap-2 leading-relaxed font-semibold text-left">
                          <CheckCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>{alert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* List & Detailed Audits */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs transition-colors text-left">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Subscription Line Item Audit</h3>
              
              <div className="space-y-3.5">
                {subscriptions.map(s => {
                  return (
                    <div key={s.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/35 dark:bg-slate-950/10 hover:border-purple-200 dark:hover:border-purple-800/40 transition-colors">
                      <div className="space-y-1 text-left flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{s.name}</h4>
                          <span className="font-mono text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                            {currencySymbol}{s.monthlyCost.toFixed(2)}/mo
                          </span>
                        </div>
                        {s.notes && (
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 italic font-medium">{s.notes}</p>
                        )}
                        
                        {/* Interactive stars */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">Usage Value:</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => updateSubScore(s.id, star)}
                                className={`text-xs focus:outline-hidden transition-all duration-150 cursor-pointer ${
                                  star <= s.usageScore ? 'text-amber-400 scale-105' : 'text-slate-300 dark:text-slate-700'
                                }`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action state selectors */}
                      <div className="flex items-center gap-3.5">
                        <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 overflow-hidden scale-95 md:scale-100 transition-all select-none bg-white dark:bg-slate-950">
                          <button
                            type="button"
                            onClick={() => updateSubStatus(s.id, 'keep')}
                            className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md shadow-xs transition-colors cursor-pointer ${
                              s.status === 'keep'
                                ? 'bg-emerald-500 text-white'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                          >
                            Keep
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSubStatus(s.id, 'review')}
                            className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md shadow-xs transition-colors cursor-pointer ${
                              s.status === 'review'
                                ? 'bg-amber-500 text-white'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSubStatus(s.id, 'cancel')}
                            className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md shadow-xs transition-colors cursor-pointer ${
                              s.status === 'cancel'
                                ? 'bg-rose-500 text-white'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteSub(s.id)}
                          className="p-1 px-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 rounded-lg text-slate-405 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
