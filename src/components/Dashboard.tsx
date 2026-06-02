import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Budget } from '../types';
import { CATEGORIES } from '../data/categories';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Percent, 
  Calendar, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  budgets: Budget[];
  currencySymbol?: string;
  aiInsights?: {
    overallStatus: string;
    summaryMessage: string;
    actionableInsights: string[];
    savingsOpportunities: { category: string; savingEstimate: number; actionableTip: string }[];
  } | null;
  loadingInsights?: boolean;
  userFirstName?: string;
  showPrevMonthTrend?: boolean;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
}

export default function Dashboard({ 
  transactions, 
  budgets, 
  currencySymbol = "$",
  aiInsights = null,
  loadingInsights = false,
  userFirstName = "User",
  showPrevMonthTrend = false,
  selectedPeriod,
  setSelectedPeriod
}: DashboardProps) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);

  // System month automatically defaults to June 2026 i.e. "2026-06"
  const currentSystemMonth = useMemo(() => {
    return new Date().toISOString().substring(0, 7);
  }, []);

  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Available unique periods extraction from transactions plus the current active tracking period
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentSystemMonth); // Ensure the brand new June 2026 is always selectable
    
    transactions.forEach(tx => {
      if (tx.date && tx.date.length >= 7) {
        const yyyymm = tx.date.substring(0, 7);
        if (/^\d{4}-\d{2}$/.test(yyyymm)) {
          monthsSet.add(yyyymm);
        }
      }
    });

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [transactions, currentSystemMonth]);

  // Convert month key to user-friendly label (e.g., "2026-06" -> "June 2026")
  const getPeriodLabel = (period: string) => {
    if (period === 'all') return 'Combine All Periods (All-Time)';
    const [year, month] = period.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNames[monthIndex]} ${year}`;
    }
    return period;
  };

  // Dynamically filter transactions based on selected tracking period
  const filteredTransactions = useMemo(() => {
    if (selectedPeriod === 'all') {
      return transactions;
    }
    return transactions.filter(t => t.date && t.date.startsWith(selectedPeriod));
  }, [transactions, selectedPeriod]);

  // Core Financial Compilations mapped on the active tracking period selection
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTransactions.forEach(tx => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });

    const totalBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      totalBalance,
      savingsRate: Math.max(0, parseFloat(savingsRate.toFixed(1)))
    };
  }, [filteredTransactions]);

  // Donut Allocation Split data compilation mapped on active selection
  const categorySplit = useMemo(() => {
    const map: Record<string, number> = {};
    let totalExp = 0;

    filteredTransactions.forEach(tx => {
      if (tx.type === 'expense') {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
        totalExp += tx.amount;
      }
    });

    return Object.entries(map).map(([category, amount]) => {
      const percentage = totalExp > 0 ? (amount / totalExp) * 100 : 0;
      return {
        category,
        amount,
        percentage: parseFloat(percentage.toFixed(1)),
        color: CATEGORIES[category]?.color || '#9ca3af'
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  // Helper to compute selectedMonth and prevMonth for daily breakdown trend charts
  const trendMonth = useMemo(() => {
    if (selectedPeriod !== 'all') {
      return selectedPeriod;
    }
    // If combined view is active, plot curves for the latest available month
    return availableMonths[0] || currentSystemMonth;
  }, [selectedPeriod, availableMonths, currentSystemMonth]);

  const prevMonth = useMemo(() => {
    const [yearText, monthText] = trendMonth.split('-');
    const year = parseInt(yearText);
    const month = parseInt(monthText);
    const prevDate = new Date(year, month - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthIdx = prevDate.getMonth() + 1;
    const prevMonthIdxStr = prevMonthIdx < 10 ? `0${prevMonthIdx}` : `${prevMonthIdx}`;
    return `${prevYear}-${prevMonthIdxStr}`;
  }, [trendMonth]);

  // Spend over days trend compilation for current selected month
  const dailyBreakdownCurrent = useMemo(() => {
    const daysInMonth = 30; // standard month simulation
    const dayTotals = Array(daysInMonth).fill(0);
    const cumulativeTotals = Array(daysInMonth).fill(0);

    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.date && tx.date.startsWith(trendMonth)) {
        const day = parseInt(tx.date.substring(8, 10));
        const index = Math.min(daysInMonth - 1, Math.max(0, (isNaN(day) ? 1 : day) - 1));
        dayTotals[index] += tx.amount;
      }
    });

    let runningSum = 0;
    for (let i = 0; i < daysInMonth; i++) {
      runningSum += dayTotals[i];
      cumulativeTotals[i] = parseFloat(runningSum.toFixed(2));
    }

    return cumulativeTotals.map((val, idx) => ({
      day: idx + 1,
      amount: val,
      dailySpend: parseFloat(dayTotals[idx].toFixed(2))
    }));
  }, [transactions, trendMonth]);

  // Spend over days trend compilation for previous selected month
  const dailyBreakdownPrev = useMemo(() => {
    const daysInMonth = 30; // standard month simulation
    const dayTotals = Array(daysInMonth).fill(0);
    const cumulativeTotals = Array(daysInMonth).fill(0);

    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.date && tx.date.startsWith(prevMonth)) {
        const day = parseInt(tx.date.substring(8, 10));
        const index = Math.min(daysInMonth - 1, Math.max(0, (isNaN(day) ? 1 : day) - 1));
        dayTotals[index] += tx.amount;
      }
    });

    let runningSum = 0;
    for (let i = 0; i < daysInMonth; i++) {
      runningSum += dayTotals[i];
      cumulativeTotals[i] = parseFloat(runningSum.toFixed(2));
    }

    return cumulativeTotals.map((val, idx) => ({
      day: idx + 1,
      amount: val,
      dailySpend: parseFloat(dayTotals[idx].toFixed(2))
    }));
  }, [transactions, prevMonth]);

  // Donut Circle Math
  const donutRadius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * donutRadius;
  
  const slices = useMemo(() => {
    let accumulatedAngle = 0;
    return categorySplit.map(item => {
      const angle = (item.percentage / 100) * 360;
      const strokeDashoffset = circumference - (item.percentage / 100) * circumference;
      const rotation = accumulatedAngle - 90; // Align to top
      accumulatedAngle += angle;

      return {
        ...item,
        strokeDashoffset,
        rotation
      };
    });
  }, [categorySplit, circumference]);

  // Trend plot math coordinates matching SVG area
  const svgWidth = 500;
  const svgHeight = 200;
  
  const maxCumulative = useMemo(() => {
    const maxCurrent = dailyBreakdownCurrent.length > 0 ? Math.max(...dailyBreakdownCurrent.map(d => d.amount)) : 0;
    const maxPrev = dailyBreakdownPrev.length > 0 ? Math.max(...dailyBreakdownPrev.map(d => d.amount)) : 0;
    return Math.max(maxCurrent, maxPrev, 100);
  }, [dailyBreakdownCurrent, dailyBreakdownPrev]);
  
  const trendPoints = useMemo(() => {
    return dailyBreakdownCurrent.map((d, index) => {
      const x = (index / (dailyBreakdownCurrent.length - 1)) * (svgWidth - 40) + 20;
      const y = svgHeight - 25 - (d.amount / maxCumulative) * (svgHeight - 50);
      return { x, y, ...d };
    });
  }, [dailyBreakdownCurrent, svgWidth, svgHeight, maxCumulative]);

  const prevTrendPoints = useMemo(() => {
    return dailyBreakdownPrev.map((d, index) => {
      const x = (index / (dailyBreakdownPrev.length - 1)) * (svgWidth - 40) + 20;
      const y = svgHeight - 25 - (d.amount / maxCumulative) * (svgHeight - 50);
      return { x, y, ...d };
    });
  }, [dailyBreakdownPrev, svgWidth, svgHeight, maxCumulative]);

  const sparklinePath = useMemo(() => {
    if (trendPoints.length === 0) return '';
    return trendPoints.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');
  }, [trendPoints]);

  const prevSparklinePath = useMemo(() => {
    if (prevTrendPoints.length === 0) return '';
    return prevTrendPoints.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');
  }, [prevTrendPoints]);

  const gradientAreaPath = useMemo(() => {
    if (trendPoints.length === 0) return '';
    const first = trendPoints[0];
    const last = trendPoints[trendPoints.length - 1];
    return `${sparklinePath} L ${last.x} ${svgHeight - 20} L ${first.x} ${svgHeight - 20} Z`;
  }, [trendPoints, sparklinePath, svgHeight]);

  // Find highest expense category
  const { fastestCategory, fastestAmount } = useMemo(() => {
    const expenseMap: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        expenseMap[tx.category] = (expenseMap[tx.category] || 0) + tx.amount;
      }
    });

    let topCategory = '';
    let topAmount = 0;
    Object.entries(expenseMap).forEach(([cat, amt]) => {
      if (amt > topAmount) {
        topAmount = amt;
        topCategory = cat;
      }
    });

    return { fastestCategory: topCategory, fastestAmount: topAmount };
  }, [transactions]);

  // Standard local fallback advice tips
  const activeSavingTip = useMemo(() => {
    if (!fastestCategory) {
      return "Start by logging a few expenses (e.g., Food, Utilities, Transport) to receive custom automated saving tips based on your local velocities.";
    }
    switch (fastestCategory) {
      case 'Food':
        return `Your food spend is at high velocity. Try planning 2 bulk home-cooked dinners this week to shave off restaurant premiums and potentially save up to ${currencySymbol}100!`;
      case 'Housing':
        return "Housing constitutes a major chunk. Consider negotiating fixed utility bundles or switching providers on water/broadband rates to claim monthly savings.";
      case 'Transport':
      case 'Transport:':
        return "Commuter costs adding up? Look into weekly travel-passes or cycle sharing options to trim of excess per-mile taxi charges.";
      case 'Utilities':
        return "Unplug phantom appliances, audit your digital subscriptions list, and install smart temperature timers to notice rapid drops in electricity outflows.";
      case 'Shopping':
        return "Introduce a strict '48-hour cool-down check' before placing shopping orders to completely weed out impulse buys and secure your savings reserves.";
      case 'Entertainment':
        return "Look into free community events, library card options, or gather friends for local potluck games instead of high cost club bookings!";
      default:
        return `Consider placing a strict spending budget constraint of around 85% of your current spent on category "${fastestCategory}" to create instant savings of ${currencySymbol}${(fastestAmount * 0.15).toFixed(0)}!`;
    }
  }, [fastestCategory, fastestAmount, currencySymbol]);

  // Compiled data for Recharts Budget vs Spent distribution
  const budgetUtilizationData = useMemo(() => {
    const expenseMap: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        expenseMap[tx.category] = (expenseMap[tx.category] || 0) + tx.amount;
      }
    });

    const categoriesWithActivity = Array.from(new Set([
      ...budgets.map(b => b.category),
      ...Object.keys(expenseMap)
    ])).filter(cat => cat !== 'Income');

    return categoriesWithActivity.map(cat => {
      const budgetItem = budgets.find(b => b.category === cat);
      const limit = budgetItem ? budgetItem.limit : 0;
      const spent = expenseMap[cat] || 0;
      const ratio = limit > 0 ? (spent / limit) * 100 : 0;

      return {
        category: cat,
        Spent: parseFloat(spent.toFixed(2)),
        Budget: parseFloat(limit.toFixed(2)),
        utilization: Math.round(ratio),
        color: CATEGORIES[cat]?.color || '#9ca3af'
      };
    }).sort((a, b) => b.Spent - a.Spent); // Sort by highest spending first
  }, [transactions, budgets]);

  return (
    <div className="space-y-6">
      {/* Top Welcome Panel */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs transition-colors"
      >
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Welcome, {userFirstName}!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time balances, tracking statistics, and cash flow velocities.</p>
        </div>
        <div className="mt-4 sm:mt-0 relative">
          <button
            onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3.5 text-xs font-mono text-gray-700 dark:text-slate-300 font-bold transition-all shadow-xs cursor-pointer select-none"
          >
            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
            <span>{getPeriodLabel(selectedPeriod)}</span>
            <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded font-sans uppercase font-bold tracking-wider leading-none">
              {selectedPeriod === 'all' ? 'Combined' : 'Active'}
            </span>
          </button>

          <AnimatePresence>
            {showPeriodDropdown && (
              <>
                {/* Backdrop overlay to close when clicking outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowPeriodDropdown(false)} 
                />
                
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-50 text-left"
                >
                  <p className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-2.5 py-1.5 font-sans border-b border-gray-100 dark:border-slate-900">
                    Switch Tracking Period
                  </p>
                  <div className="max-h-60 overflow-y-auto mt-1 space-y-0.5">
                    {/* Combine option */}
                    <button
                      onClick={() => {
                        setSelectedPeriod('all');
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all text-left font-sans font-semibold cursor-pointer ${
                        selectedPeriod === 'all'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="truncate">Combine All Periods (All-Time)</span>
                      {selectedPeriod === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white ml-2" />}
                    </button>

                    {/* Divider */}
                    <div className="h-px bg-gray-150 dark:bg-slate-800 my-1" />

                    {/* Available Months */}
                    {availableMonths.map((period) => {
                      const isSelected = selectedPeriod === period;
                      return (
                        <button
                          key={period}
                          onClick={() => {
                            setSelectedPeriod(period);
                            setShowPeriodDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all text-left font-mono font-semibold cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white font-bold'
                              : 'text-gray-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span>{getPeriodLabel(period)}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
        className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-slate-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-150">AI Smart Insights</h3>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">Automated Advisor Synthesis</p>
            </div>
          </div>
          {loadingInsights && (
            <span className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-bold px-2.5 py-1 rounded-md animate-pulse">
              Analyzing cash flow...
            </span>
          )}
        </div>

        {/* Content detail layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loadingInsights ? (
            <>
              {/* Shimmering Loader Col 1 */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3 animate-pulse">
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-sm w-1/2" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-sm w-full" />
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-sm w-5/6" />
                </div>
              </div>

              {/* Shimmering Loader Col 2 & 3 */}
              <div className="md:col-span-2 p-4 bg-slate-50/50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col justify-between gap-4 animate-pulse">
                <div className="space-y-3">
                  <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-sm w-1/4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-11/12" />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-150 dark:border-slate-800 flex gap-2">
                  <div className="h-5 bg-blue-100/50 dark:bg-slate-800/60 rounded-md w-24" />
                  <div className="h-5 bg-blue-100/50 dark:bg-slate-800/60 rounded-md w-32" />
                </div>
              </div>
            </>
          ) : transactions.length === 0 ? (
            <div className="md:col-span-3 p-6 bg-slate-50/50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-center space-y-2 animate-in fade-in duration-300">
              <div className="p-3 bg-purple-50/55 dark:bg-slate-950 inline-flex rounded-full text-purple-600 dark:text-purple-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                Welcome to Ledger Smart! Add your monthly income and your first transaction below to unlock your real-time Gemini AI financial diagnostics.
              </p>
            </div>
          ) : (
            <>
              {/* Col 1: Spending Velocity analysis */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono tracking-wider">Top Expenditure Category</span>
                <p className="text-sm font-black text-slate-800 dark:text-white">
                  {fastestCategory ? `${fastestCategory} (${currencySymbol}${fastestAmount.toLocaleString('en-US', {maximumFractionDigits:0})})` : "No Spends Recorded"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal mt-1">
                  {fastestCategory 
                    ? `Expense patterns show "${fastestCategory}" has the absolute highest spending volume in this tracking period.` 
                    : "Active journal contains no expense lines yet. Log expenses to pinpoint leakage."}
                </p>
              </div>

              {/* Col 2 & 3: Recommendation summary */}
              <div className="md:col-span-2 p-4 bg-slate-50/50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono tracking-wider">Recommended Strategy</span>
                  <p className="text-xs text-slate-705 dark:text-slate-250 leading-relaxed mt-1">
                    {aiInsights?.summaryMessage || activeSavingTip}
                  </p>
                </div>

                {aiInsights?.actionableInsights && aiInsights.actionableInsights.length > 0 && (
                  <div className="pt-2 border-t border-slate-150 dark:border-slate-800 flex flex-wrap gap-2 text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                    {aiInsights.actionableInsights.slice(0, 2).map((insight, idx) => (
                      <span key={idx} className="bg-blue-50/50 dark:bg-slate-950/40 px-2 py-0.5 rounded-md border border-blue-100/30">
                        💡 {insight}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Grid Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Balance */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:border-blue-200 dark:hover:border-blue-900/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Net Balance</span>
            <div className="p-2 bg-blue-50 dark:bg-slate-950 text-blue-600 dark:text-blue-400 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
              {stats.totalBalance < 0 ? '-' : ''}{currencySymbol}{Math.abs(stats.totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Total revenue minus logged expenditure</p>
          </div>
        </motion.div>

        {/* Monthly Income */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:border-emerald-200 dark:hover:border-emerald-900/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Inflow Revenue</span>
            <div className="p-2 bg-emerald-50 dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {currencySymbol}{stats.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{transactions.filter(t => t.type === 'income').length} active income stream logs</p>
          </div>
        </motion.div>

        {/* Monthly Outflow */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:border-amber-200 dark:hover:border-amber-900/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Outflow Spent</span>
            <div className="p-2 bg-amber-50 dark:bg-slate-950 text-amber-600 dark:text-amber-400 rounded-lg">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-450">
              {currencySymbol}{stats.totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{transactions.filter(t => t.type === 'expense').length} active expenditure lines</p>
          </div>
        </motion.div>

        {/* Savings Rate */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:border-purple-200 dark:hover:border-purple-900/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Savings Rate</span>
            <div className="p-2 bg-purple-50 dark:bg-slate-950 text-purple-600 dark:text-purple-400 rounded-lg">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {stats.savingsRate}%
            </h3>
            <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full mt-2">
              <div 
                className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, stats.savingsRate)}%` }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Visualizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Cumulative Billing Run */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.28, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs lg:col-span-3 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Spending Velocity Curve</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                  {selectedPeriod === 'all' 
                    ? `Cumulative daily spends for ${getPeriodLabel(trendMonth)} (latest active period).`
                    : `Cumulative daily spend logged for ${getPeriodLabel(selectedPeriod)}.`
                  }
                </p>
                
                {/* Active Legend Indicators */}
                <div className="flex items-center gap-3 mt-1.5 leading-none">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <span className="w-2.5 h-0.5 bg-blue-500 rounded-full inline-block" /> {selectedPeriod === 'all' ? getPeriodLabel(trendMonth) : 'Selected Period'}
                  </span>
                  {showPrevMonthTrend && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      <span className="w-2.5 h-0.5 bg-amber-500 rounded-full inline-block border-t border-dashed animate-pulse" /> Prev Month
                    </span>
                  )}
                </div>
              </div>
              
              {hoveredTrendIndex !== null && (
                <div className="text-right space-y-0.5">
                  <div className="text-xs">
                    <span className="text-slate-400 dark:text-slate-500 font-mono font-bold">Day {trendPoints[hoveredTrendIndex]?.day}</span>
                  </div>
                  <div className="text-[11px] font-semibold flex items-center justify-end gap-1 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-slate-400 dark:text-slate-500">Current: </span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {currencySymbol}{trendPoints[hoveredTrendIndex]?.amount.toLocaleString()}
                    </span>
                  </div>
                  {showPrevMonthTrend && prevTrendPoints[hoveredTrendIndex] && (
                    <div className="text-[11px] font-semibold flex items-center justify-end gap-1 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-slate-400 dark:text-slate-400">Prev Mon: </span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {currencySymbol}{prevTrendPoints[hoveredTrendIndex]?.amount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SVG Graph Canvas */}
            <div className="relative mt-6 w-full h-[220px]">
              {transactions.filter(t => t.type === 'expense').length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">No expenses logged. Please log entries to display curves.</p>
                </div>
              ) : (
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="20" y1={svgHeight - 25} x2={svgWidth - 20} y2={svgHeight - 25} stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="20" y1={svgHeight / 2} x2={svgWidth - 20} y2={svgHeight / 2} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="20" y1="25" x2={svgWidth - 20} y2="25" stroke="#f3f4f6" strokeWidth="1" />

                  {/* Filled Gradient Area */}
                  {gradientAreaPath && (
                    <path d={gradientAreaPath} fill="url(#trend-gradient)" className="transition-all duration-300" />
                  )}

                  {/* Prev Month Curve Line if enabled */}
                  {showPrevMonthTrend && prevSparklinePath && (
                    <path 
                      d={prevSparklinePath} 
                      fill="none" 
                      stroke="#fbbf24" 
                      strokeWidth="2" 
                      strokeDasharray="4 4"
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Main Curve Line */}
                  {sparklinePath && (
                    <path 
                      d={sparklinePath} 
                      fill="none" 
                      stroke="#3b82f6" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Coordinates Nodes/Dots & Hover Zones */}
                  {trendPoints.map((pt, idx) => {
                    const isHovered = hoveredTrendIndex === idx;
                    return (
                      <g key={idx}>
                        {/* Hidden ultra-wide bar for frictionless hover */}
                        <rect
                          x={pt.x - 8}
                          y="10"
                          width="16"
                          height={svgHeight - 20}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredTrendIndex(idx)}
                          onMouseLeave={() => setHoveredTrendIndex(null)}
                        />
                        {/* Current Interactive Dot */}
                        {(isHovered || idx === trendPoints.length - 1) && (
                          <circle 
                            cx={pt.x} 
                            cy={pt.y} 
                            r={isHovered ? 5 : 3.5} 
                            fill={isHovered ? "#3b82f6" : "#ffffff"} 
                            stroke="#3b82f6" 
                            strokeWidth="2.5" 
                            pointerEvents="none"
                          />
                        )}
                        {/* Previous Month Interactive Dot */}
                        {showPrevMonthTrend && prevTrendPoints[idx] && (isHovered || idx === prevTrendPoints.length - 1) && (
                          <circle 
                            cx={prevTrendPoints[idx].x} 
                            cy={prevTrendPoints[idx].y} 
                            r={isHovered ? 4.5 : 3} 
                            fill={isHovered ? "#fbbf24" : "#ffffff"} 
                            stroke="#fbbf24" 
                            strokeWidth="2" 
                            pointerEvents="none"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center text-[10px] font-mono font-medium text-gray-400 mt-2">
            <span>Day 1</span>
            <span>Day 10</span>
            <span>Day 20</span>
            <span>Day 30</span>
          </div>
        </motion.div>

        {/* Category breakdown Pie Donut */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.32, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs lg:col-span-2 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Allocation Split</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Budget category ratio allocation comparison.</p>
          </div>

          <div className="flex flex-col items-center justify-center my-4 relative h-[160px]">
            {categorySplit.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">Log expenses to analyze categories.</p>
            ) : (
              <div className="relative w-[150px] h-[150px]">
                <svg width="100%" height="100%" viewBox="0 0 180 180" className="transform rotate-0">
                  {slices.map((slice, i) => {
                    const isHovered = hoveredSlice === slice.category;
                    return (
                      <circle
                        key={slice.category}
                        cx="90"
                        cy="90"
                        r={donutRadius}
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={slice.strokeDashoffset}
                        style={{
                          transformOrigin: '90px 90px',
                          transform: `rotate(${slice.rotation}deg)`,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        onMouseEnter={() => setHoveredSlice(slice.category)}
                        onMouseLeave={() => setHoveredSlice(null)}
                        className="cursor-pointer"
                      />
                    );
                  })}
                </svg>

                {/* Center Core label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {hoveredSlice ? (
                    <>
                      <span className="text-xs font-bold text-gray-705 dark:text-slate-200 max-w-[80px] truncate text-center">
                        {hoveredSlice}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400">
                        {categorySplit.find(c => c.category === hoveredSlice)?.percentage}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 tracking-wider">Total</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-slate-100 font-mono">
                        {currencySymbol}{stats.totalExpense.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Legend Items breakdown */}
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
            {categorySplit.slice(0, 4).map(item => (
              <div 
                key={item.category} 
                className={`flex items-center justify-between p-1 rounded-md transition-all ${
                  hoveredSlice === item.category ? 'bg-gray-50 dark:bg-slate-800/60' : ''
                }`}
                onMouseEnter={() => setHoveredSlice(item.category)}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600 dark:text-slate-300 font-medium">{item.category}</span>
                </div>
                <div className="text-right flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-800 dark:text-slate-100 font-mono">
                    {currencySymbol}{item.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">({item.percentage}%)</span>
                </div>
              </div>
            ))}
            {categorySplit.length > 4 && (
              <div className="text-center text-[10px] text-gray-500 dark:text-slate-500 font-medium pt-1">
                + {categorySplit.length - 4} more spending categories
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Monthly spending distribution & Budget Utilization Chart using Recharts */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.36, ease: "easeOut" }}
        className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Utilization & Spending Distribution</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              Compare actual category outlays against set monthly budget allocations.
            </p>
          </div>
          {/* Legend indicator badges */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-950 px-3 py-1.5 border border-gray-100 dark:border-slate-800 rounded-lg text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-slate-400 font-medium">Actual Spent</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-950 px-3 py-1.5 border border-gray-100 dark:border-slate-800 rounded-lg text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-slate-700" />
              <span className="text-gray-600 dark:text-slate-400 font-medium">Budget Limit</span>
            </div>
          </div>
        </div>

        {budgetUtilizationData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-[280px]">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-3">
              <AlertCircle className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">No category transactions or budgets found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[280px] mt-1">
              Add budgets under the Budgets tab or log transactions in the Ledger to generate utilization curves.
            </p>
          </div>
        ) : (
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={budgetUtilizationData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" strokeOpacity={0.4} />
                <XAxis 
                  dataKey="category" 
                  tick={{ fill: '#888888', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                  className="dark:stroke-slate-800"
                />
                <YAxis
                  tickFormatter={(val) => `${currencySymbol}${val}`}
                  tick={{ fill: '#888888', fontSize: 11 }}
                  axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                  className="dark:stroke-slate-800"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const spent = payload[0]?.value as number || 0;
                      const budget = payload[1]?.value as number || 0;
                      const util = payload[0]?.payload?.utilization || 0;
                      return (
                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-gray-900 dark:text-white mb-1.5">{label}</p>
                          <div className="flex items-center gap-2 justify-between">
                            <span className="text-gray-500 dark:text-slate-400">Spent:</span>
                            <span className="font-mono font-bold text-gray-900 dark:text-white">
                              {currencySymbol}{spent.toLocaleString()}
                            </span>
                          </div>
                          {budget > 0 && (
                            <>
                              <div className="flex items-center gap-2 justify-between">
                                <span className="text-gray-500 dark:text-slate-400">Budget:</span>
                                <span className="font-mono font-semibold text-gray-500 dark:text-slate-400">
                                  {currencySymbol}{budget.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-gray-500 dark:text-slate-400">Utilization:</span>
                                <span className={`font-bold font-mono ${util > 100 ? 'text-red-500' : util > 85 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                  {util}%
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }}
                />
                <Bar dataKey="Spent" radius={[4, 4, 0, 0]}>
                  {budgetUtilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
                <Bar dataKey="Budget" fill="#e2e8f0" radius={[4, 4, 0, 0]}>
                  {budgetUtilizationData.map((entry, index) => (
                    <Cell 
                      key={`cell-budget-${index}`} 
                      fill={entry.Budget > 0 ? (entry.Spent > entry.Budget ? '#ef4444' : '#e2e8f0') : 'transparent'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>
    </div>
  );
}
