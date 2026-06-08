import React, { useState } from 'react';
import { SavingsGoal, Transaction } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { 
  Plus, 
  Trash2, 
  PiggyBank, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Coins,
  CheckCircle,
  HelpCircle,
  Clock,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

const triggerSavingsConfetti = () => {
  // Main energetic burst
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
  });

  // continuous side shooters waterfall stream for 2 seconds
  const end = Date.now() + 2000;
  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.85 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.85 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
};

interface SavingsGoalCardProps {
  key?: React.Key;
  goal: SavingsGoal;
  transactions: Transaction[];
  onUpdateGoalProgress: (id: string, amount: number) => void;
  onDeleteGoal: (id: string) => void;
  currencySymbol: string;
}

function SavingsGoalCard({
  goal,
  transactions,
  onUpdateGoalProgress,
  onDeleteGoal,
  currencySymbol
}: SavingsGoalCardProps) {
  const percent = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
  const roundedPercent = Math.min(100, Math.round(percent));
  const isComplete = goal.current >= goal.target;

  // Local state for deposit inputs
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  // 1. Calculate historical stats to recommend default contribution
  const autoMonthlyRate = React.useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netSurplus = Math.max(0, totalIncome - totalExpense);

    const uniqueMonths = Array.from(new Set(
      transactions
        .filter(t => t.date && t.date.length >= 7)
        .map(t => t.date.substring(0, 7))
    ));
    const activeMonths = uniqueMonths.length || 1;
    const averageMonthlySurplus = netSurplus / activeMonths;

    const storageKey = `fin_tracker_savings_history_${goal.id}`;
    let recentSavingsSum = 0;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const historyMap = JSON.parse(stored);
        const dates: string[] = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          dates.push(d.toISOString().substring(0, 10));
        }
        let lastBal = 0;
        dates.forEach((date, index) => {
          const bal = historyMap[date] !== undefined ? historyMap[date] : lastBal;
          if (index > 0) {
            const prevDate = dates[index - 1];
            const prevBal = historyMap[prevDate] !== undefined ? historyMap[prevDate] : 0;
            const dep = Math.max(0, bal - prevBal);
            recentSavingsSum += dep;
          } else {
            recentSavingsSum += Math.max(0, bal - lastBal);
          }
          lastBal = bal;
        });
      }
    } catch (e) {
      console.warn(e);
    }

    if (recentSavingsSum > 5) {
      return Math.round(recentSavingsSum);
    } else if (averageMonthlySurplus > 20) {
      return Math.round(averageMonthlySurplus * 0.25);
    } else {
      return Math.max(100, Math.round(goal.target / 12));
    }
  }, [goal.id, goal.target, transactions]);

  const neededRateForDeadline = React.useMemo(() => {
    if (!goal.deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(goal.deadline);
    const remaining = goal.target - goal.current;
    if (remaining <= 0) return 0;

    const timeDiff = deadlineDate.getTime() - today.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    const months = daysDiff / 30.4375;
    if (months <= 0.1) return remaining;
    return Math.max(1, Math.round(remaining / months));
  }, [goal.deadline, goal.target, goal.current]);

  const [monthlyContribution, setMonthlyContribution] = useState<number>(() => {
    if (neededRateForDeadline && neededRateForDeadline > 0) {
      return neededRateForDeadline;
    }
    return autoMonthlyRate;
  });

  const projection = React.useMemo(() => {
    const remaining = Math.max(0, goal.target - goal.current);
    if (remaining <= 0) {
      return {
        remaining,
        monthsLeft: 0,
        weeksLeft: 0,
        targetDateText: 'Complete',
        status: 'Achieved',
        statusColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/10'
      };
    }

    const contribution = monthlyContribution > 0 ? monthlyContribution : 1;
    const monthsLeft = remaining / contribution;
    const weeksLeft = monthsLeft * 4.3452425;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + Math.ceil(monthsLeft * 30.4375));
    const targetDateText = targetDate.toLocaleDateString('default', { month: 'short', year: 'numeric' });

    let status = 'Accumulating';
    let statusColor = 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/10';

    if (goal.deadline) {
      const dDate = new Date(goal.deadline);
      const isAhead = targetDate.getTime() <= dDate.getTime() + (24 * 3600 * 1000);
      if (isAhead) {
        status = 'On Track';
        statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/10';
      } else {
        status = 'Behind Schedule';
        statusColor = 'text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-150 dark:border-amber-900/20';
      }
    }

    return {
      remaining,
      monthsLeft,
      weeksLeft,
      targetDateText,
      status,
      statusColor
    };
  }, [goal.target, goal.current, goal.deadline, monthlyContribution]);

  const handleDepositSubmit = () => {
    const depNum = parseFloat(depositAmount);
    if (isNaN(depNum)) return;
    onUpdateGoalProgress(goal.id, depNum);

    const todayStr = new Date().toISOString().substring(0, 10);
    const storageKey = `fin_tracker_savings_history_${goal.id}`;
    let historyMap: Record<string, number> = {};
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        historyMap = JSON.parse(stored);
      }
    } catch (e) {
      console.warn(e);
    }

    const nextBalance = parseFloat((goal.current + depNum).toFixed(2));
    if (nextBalance >= goal.target && goal.current < goal.target) {
      triggerSavingsConfetti();
    }

    historyMap[todayStr] = nextBalance;
    try {
      localStorage.setItem(storageKey, JSON.stringify(historyMap));
    } catch (e) {
      console.error(e);
    }

    setIsDepositOpen(false);
    setDepositAmount('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs flex flex-col justify-between hover:border-gray-200 dark:hover:border-slate-700 transition-colors">
      <div className="space-y-4">
        {/* Top Header & Circular Progress Indicator Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`p-2 rounded-xl border shrink-0 ${
              isComplete 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/10' 
                : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/10'
            }`}>
              <PiggyBank className="w-5 h-5" />
            </div>
            <div className="min-w-0 font-sans">
              <h4 className="font-semibold text-sm text-gray-850 dark:text-slate-100 truncate" title={goal.name}>
                {goal.name}
              </h4>
              {goal.deadline ? (
                <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-500 font-medium mt-0.5">
                  <Calendar className="w-3 h-3" />
                  Target: {goal.deadline}
                </div>
              ) : (
                <div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium mt-0.5">
                  No target date
                </div>
              )}
            </div>
          </div>

          {/* Circular Progress Indicator */}
          <div className="relative flex items-center justify-center w-14 h-14 shrink-0" title={`${roundedPercent}% saved`}>
            <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 64 64">
              <circle
                className="text-slate-105 dark:text-slate-800"
                stroke="currentColor"
                strokeWidth={6}
                fill="transparent"
                r={24}
                cx="32"
                cy="32"
              />
              <circle
                className={`${
                  isComplete ? 'text-emerald-500 dark:text-emerald-400' : 'text-blue-500 dark:text-blue-450'
                } transition-all duration-500 ease-in-out`}
                stroke="currentColor"
                strokeWidth={6}
                strokeDasharray={150.8}
                strokeDashoffset={150.8 - (Math.min(100, roundedPercent) / 100) * 150.8}
                strokeLinecap="round"
                fill="transparent"
                r={24}
                cx="32"
                cy="32"
              />
            </svg>
            <span className="text-[10px] font-mono font-extrabold text-gray-850 dark:text-slate-200">
              {roundedPercent}%
            </span>
          </div>
        </div>

        {/* Horizontal Progress Bar & Milestones */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[9px] text-gray-400 dark:text-slate-500 font-mono font-bold tracking-wider">
            <span>PROGRESS BAR TRACK</span>
            <span>{roundedPercent}% reached</span>
          </div>
          
          <div className="relative h-2.5 w-full bg-slate-105 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-800/60 shadow-inner">
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isComplete 
                  ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500' 
                  : 'bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600'
              }`}
              style={{ width: `${roundedPercent}%` }}
            />
          </div>

          {/* Notch Milestone Indicators */}
          <div className="relative flex justify-between px-1 text-[8.5px] font-mono text-gray-400 dark:text-slate-500 font-semibold pt-0.5">
            <div className="flex flex-col items-center">
              <span className={`h-1.5 w-1.5 rounded-full mb-0.5 ${roundedPercent >= 25 ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-slate-700'}`} />
              <span className={roundedPercent >= 25 ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}>25%</span>
            </div>
            <div className="flex flex-col items-center">
              <span className={`h-1.5 w-1.5 rounded-full mb-0.5 ${roundedPercent >= 50 ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-slate-700'}`} />
              <span className={roundedPercent >= 50 ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}>50%</span>
            </div>
            <div className="flex flex-col items-center">
              <span className={`h-1.5 w-1.5 rounded-full mb-0.5 ${roundedPercent >= 75 ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-slate-300 dark:bg-slate-700'}`} />
              <span className={roundedPercent >= 75 ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}>75%</span>
            </div>
            <div className="flex flex-col items-center">
              <span className={`h-1.5 w-1.5 rounded-full mb-0.5 ${roundedPercent >= 100 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-300 dark:bg-slate-700'}`} />
              <span className={roundedPercent >= 100 ? 'text-emerald-500 dark:text-emerald-400 font-black' : ''}>Target</span>
            </div>
          </div>
        </div>

        {/* Time-to-Goal Forecast Estimator Component */}
        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-xl border border-dashed border-slate-150 dark:border-slate-800/80 space-y-3 text-left">
          <div className="flex justify-between items-center pb-1 border-b border-slate-100/60 dark:border-slate-800/40">
            <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              <span>Goal Forecaster</span>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${projection.statusColor}`}>
              {projection.status}
            </span>
          </div>

          {/* Core Estimates Output Grid */}
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="p-1.5 rounded-lg bg-white/40 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-800/40">
              <span className="text-[8.5px] text-slate-400 uppercase font-semibold block leading-tight">Time to Target</span>
              <span className="font-mono font-black text-[12px] text-slate-750 dark:text-slate-100 block mt-0.5">
                {isComplete ? 'Goal met 🎉' : projection.monthsLeft <= 0.25 ? 'Within days! ⚡' : `${projection.monthsLeft.toFixed(1)} mos`}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-white/40 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-800/40">
              <span className="text-[8.5px] text-slate-400 uppercase font-semibold block leading-tight">Estimated Date</span>
              <span className="font-mono font-black text-[12px] text-slate-750 dark:text-slate-100 block mt-0.5">
                {isComplete ? 'Reached' : projection.targetDateText}
              </span>
            </div>
          </div>

          {/* Interactive Calculator Slider (simulate other rates) */}
          {!isComplete && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[8.5px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                <span>Simulate Rate:</span>
                <span className="text-purple-600 dark:text-purple-400 font-black">
                  {formatCurrency(monthlyContribution, currencySymbol, { minimumFractionDigits: 0 })}/mo
                </span>
              </div>
              <input 
                type="range"
                min={Math.max(10, Math.round(goal.target / 100))}
                max={Math.max(500, Math.round(goal.target))}
                step={Math.max(5, Math.round(goal.target / 100))}
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Math.max(1, parseInt(e.target.value) || 120))}
                className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              
              {/* Intelligent context tip */}
              <div className="text-[8px] text-gray-400 dark:text-slate-500 font-medium italic flex items-center gap-1.5 pt-0.5">
                <HelpCircle className="w-3 h-3 shrink-0 text-slate-400" />
                <span>
                  {goal.deadline && neededRateForDeadline ? (
                    monthlyContribution >= neededRateForDeadline 
                      ? "Your custom speed easily beats the set target date!" 
                      : `Save ${formatCurrency(neededRateForDeadline - monthlyContribution, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo more to meet the deadline.`
                  ) : (
                    `Change slider to forecast months needed to finish remaining balance of ${formatCurrency(projection.remaining, currencySymbol, { minimumFractionDigits: 0 })}.`
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cash balances info */}
        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-2.5 rounded-xl space-y-1.5 text-left">
          <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-slate-500 font-mono">
            <span className="font-bold uppercase tracking-widest text-[9px]">Deposit Summary Ledger</span>
            {isComplete ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                <CheckCircle className="w-3 h-3" /> Fully Funded
              </span>
            ) : (
              <span className="text-blue-600 dark:text-blue-400 font-bold">Funding Needed</span>
            )}
          </div>
          <p className="text-xs font-mono font-bold text-gray-800 dark:text-slate-200 flex justify-between">
            <span>Currently Saved:</span>
            <span className={isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}>
              {formatCurrency(goal.current, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </p>
          <p className="text-xs font-mono text-gray-400 dark:text-slate-500 flex justify-between border-t border-slate-100/60 dark:border-slate-800/50 pt-1">
            <span>Overall Target:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-350">
              {formatCurrency(goal.target, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </p>
        </div>

        {/* Integrated 30-Day daily breakdown chart of consistency */}
        <SavingsGoalProgressChart
          goalId={goal.id}
          current={goal.current}
          target={goal.target}
          currencySymbol={currencySymbol}
        />
      </div>

      {/* Deposit transaction actions / delete */}
      <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex-1">
          {isDepositOpen ? (
            <div className="flex gap-1.5 items-center">
              <div className="relative flex-1">
                <span className="absolute left-2 top-1.5 text-xs font-bold text-gray-400 dark:text-slate-505">{currencySymbol}</span>
                <input
                  type="number"
                  required
                  placeholder="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-700/80 rounded-lg pl-5 pr-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-950 focus:outline-hidden font-mono text-gray-800 dark:text-slate-100"
                />
              </div>
              
              <button
                onClick={handleDepositSubmit}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg cursor-pointer shrink-0"
              >
                Add
              </button>
              
              <button
                onClick={() => setIsDepositOpen(false)}
                className="text-gray-400 hover:text-gray-650 dark:hover:text-slate-300 rounded-lg cursor-pointer p-0.5 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsDepositOpen(true)}
              className="w-full text-center border border-dashed border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/10 dark:hover:bg-blue-900/10 text-blue-600 dark:text-blue-400 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all cursor-pointer"
            >
              Add Outflow
            </button>
          )}
        </div>

        <button
          onClick={() => {
            try {
              localStorage.removeItem(`fin_tracker_savings_history_${goal.id}`);
            } catch (_) {}
            onDeleteGoal(goal.id);
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Delete Goal parameters"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface SavingsGoalsProps {
  goals: SavingsGoal[];
  transactions: Transaction[];
  onAddGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  onUpdateGoalProgress: (id: string, amount: number) => void;
  onDeleteGoal: (id: string) => void;
  currencySymbol?: string;
}

export default function SavingsGoals({
  goals,
  transactions,
  onAddGoal,
  onUpdateGoalProgress,
  onDeleteGoal,
  currencySymbol = "$"
}: SavingsGoalsProps) {
  // New Goal Form Parameters
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  
  // Quick Deposit Options
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(target);
    if (!name.trim() || isNaN(targetNum) || targetNum <= 0) return;

    onAddGoal({
      name: name.trim(),
      target: targetNum,
      current: 0,
      deadline: deadline || undefined
    });

    setName('');
    setTarget('');
    setDeadline('');
  };

  const handleDeposit = (id: string) => {
    const depNum = parseFloat(depositAmount);
    if (isNaN(depNum)) return;
    onUpdateGoalProgress(id, depNum);
    
    // Save immediate balance update to localStorage for progress chart
    const currentGoal = goals.find(g => g.id === id);
    if (currentGoal) {
      const todayStr = new Date().toISOString().substring(0, 10);
      const storageKey = `fin_tracker_savings_history_${id}`;
      let historyMap: Record<string, number> = {};
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          historyMap = JSON.parse(stored);
        }
      } catch (e) {
        console.warn(e);
      }
      
      const nextBalance = parseFloat((currentGoal.current + depNum).toFixed(2));
      
      // Trigger elegant confetti cascade if user hits 100% of their savings target
      if (nextBalance >= currentGoal.target && currentGoal.current < currentGoal.target) {
        triggerSavingsConfetti();
      }

      historyMap[todayStr] = nextBalance;
      try {
        localStorage.setItem(storageKey, JSON.stringify(historyMap));
      } catch (e) {
        console.error(e);
      }
    }

    // reset Deposit state
    setActiveDepositId(null);
    setDepositAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Description header */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs transition-colors">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Savings Goals & Milestones</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Lock target sums for emergency reserves, future splurges, or travel budgets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form & Savings Rate Trend */}
        <div className="lg:col-span-1 space-y-6 flex flex-col h-fit">
          {/* Form to establish savings targets */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs transition-colors">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-gray-500" />
              Establish Goal Target
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Goal name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Goal Identifier</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Europe trip, Tesla purchase..."
                  className="w-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 focus:border-blue-500 block"
                />
              </div>

              {/* Target sum */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Target Lock sum ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-gray-400">{currencySymbol}</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono font-medium"
                  />
                </div>
              </div>

              {/* Target Deadline */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Target Date (Optional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl text-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Lock Target Goal
              </button>
            </form>
          </div>

          {/* 6-Month Savings Rate Trend Widget */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs transition-colors">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              6-Month Savings Trend
            </h3>
            <p className="text-xs text-gray-505 dark:text-slate-400 mb-4 font-medium">
              Monthly savings rate progression based on income versus net surplus cashflow.
            </p>
            <SavingsRateTrend transactions={transactions} currencySymbol={currencySymbol} />
          </div>
        </div>

        {/* Goals interactive cards list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-gray-500" />
            Active Savings Reserve Goals
          </h3>

          {goals.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-12 rounded-2xl text-center shadow-xs transition-colors">
              <PiggyBank className="w-10 h-10 text-gray-300 dark:text-slate-700 mx-auto animate-pulse" />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-3">No savings goals created. Feed parameters on the left to activate metrics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map(goal => (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  transactions={transactions}
                  onUpdateGoalProgress={onUpdateGoalProgress}
                  onDeleteGoal={onDeleteGoal}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

interface SavingsGoalProgressChartProps {
  goalId: string;
  current: number;
  target: number;
  currencySymbol: string;
}

export function SavingsGoalProgressChart({
  goalId,
  current,
  target,
  currencySymbol
}: SavingsGoalProgressChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Generate 30 days history dates and values
  const history = React.useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().substring(0, 10)); // "YYYY-MM-DD"
    }

    const storageKey = `fin_tracker_savings_history_${goalId}`;
    let historyMap: Record<string, number> = {};
    let exists = false;

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        historyMap = JSON.parse(raw);
        exists = true;
      }
    } catch (e) {
      console.warn(e);
    }

    // Generate stair-steps to end exactly at current
    if (!exists) {
      const step1 = Math.round(current * 0.15);
      const step2 = Math.round(current * 0.45);
      const step3 = Math.round(current * 0.75);
      const step4 = current;

      for (let i = 0; i < 30; i++) {
        const date = dates[i];
        if (current === 0) {
          historyMap[date] = 0;
        } else {
          if (i < 6) {
            historyMap[date] = step1;
          } else if (i < 13) {
            historyMap[date] = step2;
          } else if (i < 21) {
            historyMap[date] = step3;
          } else {
            historyMap[date] = step4;
          }
        }
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(historyMap));
      } catch (e) {
        console.error(e);
      }
    }

    // Synchronize today's date balance with actual current amount (handles new updates)
    const todayStr = dates[29];
    if (historyMap[todayStr] !== current) {
      historyMap[todayStr] = current;
      try {
        localStorage.setItem(storageKey, JSON.stringify(historyMap));
      } catch (_) {}
    }

    let lastKnownBalance = 0;
    return dates.map((date, index) => {
      let balance = historyMap[date];
      if (balance === undefined) {
        balance = lastKnownBalance;
      } else {
        lastKnownBalance = balance;
      }

      // Calculate deposit compared to previous day
      let previousBalance = 0;
      if (index > 0) {
        const prevDate = dates[index - 1];
        previousBalance = historyMap[prevDate] !== undefined ? historyMap[prevDate] : 0;
      }
      const depositAmt = index === 0 ? balance : Math.max(0, balance - previousBalance);

      // format month day labeled readout (e.g. "May 24")
      const dParts = date.split('-');
      const dObj = new Date(parseInt(dParts[0]), parseInt(dParts[1]) - 1, parseInt(dParts[2]));
      const dayLabel = dObj.toLocaleDateString('default', { month: 'short', day: 'numeric' });

      return {
        date,
        dayLabel,
        balance,
        deposit: depositAmt
      };
    });
  }, [goalId, current, target]);

  // Compute boundaries for drawing
  const yMax = Math.max(target, current * 1.05, 1);
  const chartHeight = 65;
  const chartWidth = 320;

  // Map each data points to visual coordinate
  const points = history.map((item, index) => {
    const x = (index / 29) * chartWidth;
    const y = chartHeight - (item.balance / yMax) * (chartHeight - 8); // Preserve tight margin top
    return { x, y, ...item };
  });

  // Construct Area Path (from (0, height) -> points -> (last_x, height) -> close)
  let areaD = "";
  let lineD = "";
  if (points.length > 0) {
    lineD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    areaD = `${lineD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;
  }

  // Calculate coordinates of target line
  const targetY = chartHeight - (target / yMax) * (chartHeight - 8);
  const targetLabelOffsetY = targetY < 15 ? targetY + 11 : targetY - 4;

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="space-y-2 mt-4">
      {/* Chart Title & Hover Readout */}
      <div className="flex justify-between items-center text-[10px] font-mono">
        <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">30-Day Progress Stream</span>
        {hoveredPoint ? (
          <span className="text-blue-600 dark:text-blue-400 font-semibold px-1 rounded-sm">
            {hoveredPoint.dayLabel}: {formatCurrency(hoveredPoint.balance, currencySymbol)}
            {hoveredPoint.deposit > 0 ? ` (+${formatCurrency(hoveredPoint.deposit, currencySymbol)})` : ''}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-slate-600">Hover graph to audit</span>
        )}
      </div>

      {/* Graphical Stage */}
      <div className="relative bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl p-2 select-none overflow-hidden hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Gradients */}
          <defs>
            <linearGradient id={`savings-gradient-${goalId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id={`target-line-gradient`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Grid target line (if inside chart boundaries) */}
          {targetY >= 0 && targetY <= chartHeight && (
            <g>
              <line 
                x1="0" 
                y1={targetY} 
                x2={chartWidth} 
                y2={targetY} 
                stroke="url(#target-line-gradient)" 
                strokeWidth="1.5" 
                strokeDasharray="4 4" 
              />
              <text 
                x={chartWidth - 5} 
                y={targetLabelOffsetY} 
                textAnchor="end" 
                className="fill-slate-400 font-sans text-[7px] font-medium tracking-wide uppercase"
              >
                Target Level: {formatCurrency(target, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </text>
            </g>
          )}

          {/* Area under the progress line */}
          {areaD && (
            <path 
              d={areaD} 
              fill={`url(#savings-gradient-${goalId})`} 
            />
          )}

          {/* Primary curve */}
          {lineD && (
            <path 
              d={lineD} 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="dark:stroke-blue-400"
            />
          )}

          {/* Active Deposit Markings */}
          {points.map((p, idx) => {
            if (p.deposit > 0 && idx > 0) {
              return (
                <circle
                  key={`dep-node-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r="2.5"
                  className="fill-emerald-500 dark:fill-emerald-400 stroke-white dark:stroke-slate-900"
                  strokeWidth="1"
                />
              );
            }
            return null;
          })}

          {/* Hover effects vertical guide line and circle anchor */}
          {hoveredPoint && (
            <g>
              <line 
                x1={hoveredPoint.x} 
                y1="0" 
                x2={hoveredPoint.x} 
                y2={chartHeight} 
                stroke="#60a5fa" 
                strokeWidth="1" 
                strokeDasharray="2 2" 
              />
              <circle 
                cx={hoveredPoint.x} 
                cy={hoveredPoint.y} 
                r="4.5" 
                className="fill-blue-600 dark:fill-blue-400 stroke-white dark:stroke-slate-900 shadow-xs" 
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Transparent interaction zones */}
          {points.map((p, index) => {
            const tapZoneWidth = chartWidth / 30;
            const tapZoneX = p.x - tapZoneWidth / 2;
            return (
              <rect
                key={`trigger-${index}`}
                x={tapZoneX}
                y="0"
                width={tapZoneWidth}
                height={chartHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>
      </div>

      {/* Simple Stats consistency summary label */}
      <h5 className="text-[9px] text-gray-400 dark:text-slate-500 text-center font-semibold uppercase tracking-wider">
        Consistency Benchmark: {history.filter(h => h.deposit > 0).length} Deposits logged this period
      </h5>
    </div>
  );
}

interface SavingsRateTrendProps {
  transactions: Transaction[];
  currencySymbol: string;
}

export function SavingsRateTrend({ transactions, currencySymbol }: SavingsRateTrendProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const trendData = React.useMemo(() => {
    const months = [];
    const now = new Date();
    // Get last 6 months chronologically in ascending order
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        monthNum: d.getMonth(),
        label: d.toLocaleDateString('default', { month: 'short' }),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` // "YYYY-MM"
      });
    }

    return months.map(m => {
      const monthTxs = transactions.filter(tx => {
        if (!tx.date) return false;
        return tx.date.startsWith(m.key);
      });

      let income = 0;
      let expense = 0;
      let savingsExpense = 0;

      monthTxs.forEach(tx => {
        if (tx.type === 'income') {
          income += tx.amount;
        } else {
          expense += tx.amount;
          if (tx.category && tx.category.toLowerCase() === 'savings') {
            savingsExpense += tx.amount;
          }
        }
      });

      const netSavings = (income - expense) + savingsExpense;
      const rate = income > 0 ? (netSavings / income) * 100 : 0;

      return {
        ...m,
        income,
        expense,
        netSavings,
        rate: Math.max(0, parseFloat(rate.toFixed(1)))
      };
    });
  }, [transactions]);

  const maxRate = Math.max(...trendData.map(d => d.rate), 10);
  const chartHeight = 85;
  const chartWidth = 280;
  const barWidth = 22;
  const gap = 16;
  const totalBarWidth = barWidth + gap;
  const paddingLeft = (chartWidth - (6 * totalBarWidth - gap)) / 2;

  return (
    <div className="space-y-4">
      {/* Visual Chart Graphic with SVG bars */}
      <div className="relative bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl p-3 select-none overflow-hidden transition-colors">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="trend-bar-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="trend-bar-hover-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Guidelines */}
          <line x1="0" y1={chartHeight - 16} x2={chartWidth} y2={chartHeight - 16} stroke="#e2e8f0" className="dark:stroke-slate-800" strokeWidth="1" />
          <line x1="0" y1={(chartHeight - 16) / 2} x2={chartWidth} y2={(chartHeight - 16) / 2} stroke="#e2e8f1" className="dark:stroke-slate-800/80" strokeWidth="1" strokeDasharray="3 3" />

          {trendData.map((d, idx) => {
            const x = paddingLeft + idx * totalBarWidth;
            const barHeight = d.rate > 0 ? (d.rate / maxRate) * (chartHeight - 34) : 2;
            const y = chartHeight - 16 - barHeight - 1;
            const isHovered = hoveredIdx === idx;

            return (
              <g key={d.key} className="transition-all duration-300">
                {/* Background Shadow Bar */}
                <rect
                  x={x}
                  y={4}
                  width={barWidth}
                  height={chartHeight - 20}
                  rx={3.5}
                  ry={3.5}
                  fill="#f1f5f9"
                  className="dark:fill-slate-900/40 opacity-50"
                />

                {/* Styled Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={3.5}
                  ry={3.5}
                  fill={`url(${isHovered ? '#trend-bar-hover-gradient' : '#trend-bar-gradient'})`}
                  className="transition-all duration-300 cursor-pointer"
                />

                {/* Value display overlay when hovered */}
                {isHovered && (
                  <g>
                    <rect
                      x={x + barWidth / 2 - 24}
                      y={y - 18 < 1 ? 1 : y - 18}
                      width={48}
                      height={13}
                      rx={3}
                      fill="#1e293b"
                      className="dark:fill-slate-100"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 18 < 1 ? 10 : y - 9}
                      textAnchor="middle"
                      className="fill-white dark:fill-slate-900 font-mono text-[7.5px] font-black"
                    >
                      {d.rate.toFixed(1)}%
                    </text>
                  </g>
                )}

                {/* X axis month labels */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className={`text-[8.5px] font-mono transition-colors duration-200 ${
                    isHovered 
                      ? 'fill-purple-600 dark:fill-purple-400 font-black' 
                      : 'fill-gray-400 dark:fill-slate-500 font-semibold'
                  }`}
                >
                  {d.label}
                </text>

                {/* Hover hotspot */}
                <rect
                  x={x - gap / 2}
                  y={0}
                  width={barWidth + gap}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Historical List Rows */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-widest">Monthly Details</h4>
        <div className="divide-y divide-gray-100/50 dark:divide-slate-800/40 max-h-48 overflow-y-auto pr-1">
          {trendData.slice().reverse().map((d, index) => {
            const hasActivity = d.income > 0 || d.expense > 0;
            return (
              <div 
                key={d.key} 
                className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-1 rounded-lg transition-colors"
                onMouseEnter={() => setHoveredIdx(5 - index)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="flex flex-col text-left">
                  <span className="font-bold text-gray-800 dark:text-slate-200">{d.label} {d.year}</span>
                  <span className="text-[10px] text-gray-450 dark:text-slate-500 font-mono font-medium">
                    Net: {d.netSavings >= 0 ? '+' : ''}{d.netSavings.toLocaleString('en-US', { style: 'currency', currency: currencySymbol, maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="text-right flex flex-col items-end">
                  {hasActivity ? (
                    <>
                      <span className="font-mono font-black text-purple-600 dark:text-purple-400 text-sm">
                        {d.rate.toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-wider">Rate</span>
                    </>
                  ) : (
                    <span className="text-[10.5px] text-gray-400 dark:text-slate-600 font-medium italic">No transactions</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
