import React, { useState, useEffect } from 'react';
import { Budget, Transaction } from '../types';
import { CATEGORIES } from '../data/categories';
import { formatCurrency } from '../utils/currencyFormatter';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Scale, 
  DollarSign, 
  TrendingDown, 
  AlertTriangle 
} from 'lucide-react';

interface BudgetManagerProps {
  budgets: Budget[];
  transactions: Transaction[];
  onUpdateBudget: (category: string, limit: number) => void;
  onDeleteBudget: (category: string) => void;
  currencySymbol?: string;
  onAskAIAboutBudget?: () => void; // Trigger callback to talk to the AI advisor
}

export default function BudgetManager({
  budgets,
  transactions,
  onUpdateBudget,
  onDeleteBudget,
  currencySymbol = "$",
  onAskAIAboutBudget
}: BudgetManagerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Food');
  const [inputLimit, setInputLimit] = useState<string>('');

  const [warningThreshold, setWarningThreshold] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('fin_tracker_budget_warning_threshold');
      return stored ? parseInt(stored) : 80;
    } catch {
      return 80;
    }
  });

  useEffect(() => {
    localStorage.setItem('fin_tracker_budget_warning_threshold', warningThreshold.toString());
  }, [warningThreshold]);

  // Compute actual spent amounts per category
  const categorySpent = React.useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      }
    });
    return map;
  }, [transactions]);

  // Handle form submission to update limits
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(inputLimit);
    if (!selectedCategory || isNaN(limitNum) || limitNum < 0) return;
    onUpdateBudget(selectedCategory, limitNum);
    setInputLimit(''); // Clear input after successful creation
  };

  // Identify categories with over-budget or close-to-budget alerts
  const alertCategories = React.useMemo(() => {
    return budgets.map(b => {
      const spent = categorySpent[b.category] || 0;
      const ratio = b.limit > 0 ? spent / b.limit : 0;
      return {
        category: b.category,
        spent,
        limit: b.limit,
        ratio,
        percent: Math.round(ratio * 100)
      };
    }).filter(item => item.percent >= warningThreshold);
  }, [budgets, categorySpent, warningThreshold]);

  // Aggregate stats
  const aggregateBudgets = React.useMemo(() => {
    const totalLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + (categorySpent[b.category] || 0), 0);
    const ratio = totalLimit > 0 ? totalSpent / totalLimit : 0;
    return {
      totalLimit,
      totalSpent,
      percent: Math.min(100, Math.round(ratio * 100)),
      ratio
    };
  }, [budgets, categorySpent]);

  return (
    <div className="space-y-6">
      {/* Page Description */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Active Budget Allocation</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Configure monthly parameters for specific category targets and track real-time utilization caps.
          </p>
        </div>
        
        {onAskAIAboutBudget && (
          <button
            onClick={onAskAIAboutBudget}
            className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300 font-medium py-2 px-4 rounded-xl text-sm transition-colors cursor-pointer w-fit"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            Optimize with Gemini
          </button>
        )}
      </div>

      {/* Aggregate Overview Card & Set Budget Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Aggregated budget limit view */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-800 rounded-lg text-amber-400">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-md text-slate-100">Consolidated Budgets</h3>
            </div>
            
            <div className="pt-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Limit Cap</span>
              <h2 className="text-2xl font-bold font-mono text-white mt-1">
                {formatCurrency(aggregateBudgets.totalLimit, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h2>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Utilized</span>
              <p className="text-lg font-bold font-mono text-slate-300 mt-1">
                {formatCurrency(aggregateBudgets.totalSpent, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Overall Utilization Rate</span>
              <span className="font-mono font-bold text-slate-200">{aggregateBudgets.percent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  aggregateBudgets.percent >= 90 
                    ? 'bg-red-400' 
                    : aggregateBudgets.percent >= 75 
                    ? 'bg-amber-400' 
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${aggregateBudgets.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Form setting budget parameters */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            Set Budget & Alert Threshold
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 focus:border-blue-500 transition-shadow transition-colors"
                >
                  {Object.keys(CATEGORIES).filter(cat => cat !== 'Income').map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Limit selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Monthly Cap Limit ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-gray-400">{currencySymbol}</span>
                  <input
                    id="budget-limit-input"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={inputLimit}
                    onChange={(e) => setInputLimit(e.target.value)}
                    placeholder="Type limit amount"
                    className="w-full border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl pl-8 pr-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 focus:border-blue-500 transition-all font-mono font-medium"
                  />
                </div>
              </div>

              {/* Warning percentage limit input */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Alert Trigger Line ({warningThreshold}%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 block my-3"
                  />
                  <span className="text-xs font-mono font-bold text-gray-700 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-150 shrink-0 select-none">
                    {warningThreshold}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Apply Target Limit
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Alert items panel */}
      {alertCategories.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-100 p-5 rounded-2xl flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-amber-900">Budget Threshold Warnings</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                You've consumed more than {warningThreshold}% of constraints in {alertCategories.length} categor{alertCategories.length === 1 ? 'y' : 'ies'}.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {alertCategories.map(item => (
              <span key={item.category} className="text-[10px] font-mono font-bold bg-amber-100/80 text-amber-800 border border-amber-200 rounded-full py-1 px-2.5">
                {item.category}: {item.percent}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Budget progression list */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs transition-colors">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-gray-400" />
          Track Spending caps
        </h3>

        {budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 m-2 p-8">
            <div className="p-4 bg-rose-50 dark:bg-slate-800 text-rose-500 rounded-3xl mb-4">
              <Scale className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No budgets configured yet</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed font-sans mb-5">
              Specify monthly spending limits across food, housing, entertainment, or utilities to safeguard your savings pipeline.
            </p>
            <button
              onClick={() => {
                document.getElementById('budget-limit-input')?.focus();
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all shadow-md shadow-blue-500/10 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add your first budget
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {budgets.map(b => {
              const spent = categorySpent[b.category] || 0;
              const percent = b.limit > 0 ? (spent / b.limit) * 100 : 0;
              const roundedPercent = Math.min(100, Math.round(percent));
              const categoryDetails = CATEGORIES[b.category];
              const IconComp = categoryDetails?.icon;

              const isExceeded = spent > b.limit;
              const isWarning = spent > b.limit * (warningThreshold / 100) && spent <= b.limit;

              return (
                <div key={b.category} className="border border-gray-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/30 p-4 rounded-xl space-y-3 shadow-2xs hover:border-gray-250 dark:hover:border-slate-705 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${categoryDetails?.bgColor || 'bg-gray-50 dark:bg-slate-950'} ${categoryDetails ? '' : 'text-gray-500'}`} style={categoryDetails ? { color: categoryDetails.color } : undefined}>
                        {IconComp ? <IconComp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-800">{b.category}</h4>
                        <span className={`text-[10px] font-bold uppercase py-0.5 px-2 rounded-full border tracking-wide inline-block mt-0.5 ${
                          isExceeded 
                            ? 'bg-red-50 text-red-600 border-red-100' 
                            : isWarning 
                            ? 'bg-amber-50 text-amber-600 border-amber-100' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {isExceeded ? 'Exceeded' : isWarning ? 'Warning' : 'On Track'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs text-gray-400 font-mono">Limit target:</span>
                        <p className="text-xs font-bold text-gray-800 font-mono">
                          {formatCurrency(spent, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / {formatCurrency(b.limit, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <button
                        onClick={() => onDeleteBudget(b.category)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete limit"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>

                  {/* Meter line */}
                  <div className="space-y-1">
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isExceeded 
                            ? 'bg-red-500' 
                            : isWarning 
                            ? 'bg-amber-400' 
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${roundedPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                      <span>{roundedPercent}% spent</span>
                      <span>
                        {isExceeded 
                          ? `${formatCurrency(spent - b.limit, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} over` 
                          : `${formatCurrency(b.limit - spent, currencySymbol, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} left`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
