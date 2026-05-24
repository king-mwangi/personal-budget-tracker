import React, { useState, useMemo } from 'react';
import { BudgetTemplate, TemplateIncomeSource, TemplateCategory, Transaction, Budget } from '../types';
import { CATEGORIES } from '../data/categories';
import { 
  Plus, 
  Trash2, 
  FolderPlus, 
  Play, 
  Check, 
  DollarSign, 
  Tag, 
  FolderHeart, 
  Info, 
  X,
  PlusCircle,
  HelpCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface BudgetTemplatesProps {
  templates: BudgetTemplate[];
  onSaveTemplate: (template: BudgetTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onApplyTemplate: (options: {
    templateId: string;
    targetMonth: string; // YYYY-MM
    updateBudgets: boolean;
    generateTransactions: boolean;
  }) => void;
  currencySymbol?: string;
}

const DEFAULT_TEMPLATES: BudgetTemplate[] = [
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
      { name: 'Freelance Side Work', expectedAmount: 800 }
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

export default function BudgetTemplates({
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onApplyTemplate,
  currencySymbol = "$"
}: BudgetTemplatesProps) {
  // Combine custom saved templates with default templates
  const allTemplates = useMemo(() => {
    return [...DEFAULT_TEMPLATES, ...templates];
  }, [templates]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(allTemplates[0]?.id || '');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Edit Template Mode parameters
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [incomes, setIncomes] = useState<TemplateIncomeSource[]>([]);
  const [expenses, setExpenses] = useState<TemplateCategory[]>([]);

  // Add Income Item form state
  const [newIncName, setNewIncName] = useState('');
  const [newIncAmt, setNewIncAmt] = useState('');

  // Add Expense Item form state
  const [newExpCat, setNewExpCat] = useState('Food');
  const [newExpAmt, setNewExpAmt] = useState('');

  // Apply template popup panel
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyTemplateId, setApplyTemplateId] = useState<string | null>(null);
  const [applyMonth, setApplyMonth] = useState('2526-06'); // Next period default simulator placeholder
  const [applyUpdateBudgets, setApplyUpdateBudgets] = useState(true);
  const [applyGenerateLogs, setApplyGenerateLogs] = useState(true);
  const [showApplySuccess, setShowApplySuccess] = useState(false);

  const activeTemplate = useMemo(() => {
    return allTemplates.find(t => t.id === selectedTemplateId) || allTemplates[0];
  }, [allTemplates, selectedTemplateId]);

  // Set default modern formatted month for applying
  React.useEffect(() => {
    const today = new Date();
    // default set to next month
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const mStr = nextMonth.toISOString().slice(0, 7);
    setApplyMonth(mStr);
  }, []);

  // Enter creation mode
  const startNewTemplate = () => {
    setIsCreatingNew(true);
    setTemplateName('My Customizable Budget Plan');
    setTemplateDesc('A customized monthly layout plan.');
    setIncomes([{ name: 'Monthly Paycheck', expectedAmount: 3000 }]);
    setExpenses([
      { category: 'Housing', targetAmount: 1200 },
      { category: 'Food', targetAmount: 400 }
    ]);
  };

  // Quick edit items inside lists
  const addIncomeItem = () => {
    const amt = parseFloat(newIncAmt);
    if (!newIncName.trim() || isNaN(amt) || amt <= 0) return;
    setIncomes(prev => [...prev, { name: newIncName.trim(), expectedAmount: amt }]);
    setNewIncName('');
    setNewIncAmt('');
  };

  const removeIncomeItem = (idx: number) => {
    setIncomes(prev => prev.filter((_, i) => i !== idx));
  };

  const addExpenseItem = () => {
    const amt = parseFloat(newExpAmt);
    if (isNaN(amt) || amt <= 0) return;
    
    // Check if category already configured in this list, if so overwrite/add
    setExpenses(prev => {
      const existingIdx = prev.findIndex(e => e.category === newExpCat);
      if (existingIdx !== -1) {
        return prev.map((e, idx) => idx === existingIdx ? { ...e, targetAmount: amt } : e);
      }
      return [...prev, { category: newExpCat, targetAmount: amt }];
    });
    setNewExpAmt('');
  };

  const removeExpenseItem = (idx: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== idx));
  };

  // Save the custom template to app state
  const handleSaveAndSelect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    const freshTemp: BudgetTemplate = {
      id: 't-custom-' + Math.random().toString(36).substring(2, 9),
      name: templateName.trim(),
      description: templateDesc.trim() || 'Custom financial template allocation.',
      incomes,
      expenses
    };

    onSaveTemplate(freshTemp);
    setSelectedTemplateId(freshTemp.id);
    setIsCreatingNew(false);
  };

  const handleApplyWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyTemplateId) return;

    onApplyTemplate({
      templateId: applyTemplateId,
      targetMonth: applyMonth,
      updateBudgets: applyUpdateBudgets,
      generateTransactions: applyGenerateLogs
    });

    setShowApplySuccess(true);
    setTimeout(() => {
      setShowApplySuccess(false);
      setShowApplyModal(false);
    }, 1800);
  };

  // Computations for totals
  const totalIncome = (incomesList: TemplateIncomeSource[]) => 
    incomesList.reduce((sum, item) => sum + item.expectedAmount, 0);

  const totalExpense = (expensesList: TemplateCategory[]) => 
    expensesList.reduce((sum, item) => sum + item.targetAmount, 0);

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Customized Budget Templates</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Build specialized financial outlines (e.g., standard months, holiday periods, low-expense seasons) and spin up budget targets for new months instantly.
          </p>
        </div>

        {!isCreatingNew && (
          <button
            onClick={startNewTemplate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer w-fit shadow-2xs"
          >
            <FolderPlus className="w-4 h-4" />
            Build Template
          </button>
        )}
      </div>

      {isCreatingNew ? (
        /* Template Constructor Panel */
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs space-y-6 animate-fadeIn transition-colors">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Configure Budget Blueprint</h3>
              <p className="text-xs text-gray-400 dark:text-slate-505 mt-0.5">Define expected recurring incomes and specific target boundaries.</p>
            </div>
            <button
              onClick={() => setIsCreatingNew(false)}
              className="p-1 px-3 text-xs text-gray-405 hover:text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>

          <form onSubmit={handleSaveAndSelect} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Template Metadata */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Blueprint Name</label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Vacation Month Budget, Standard 2026 Season..."
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Blueprint Description</label>
                  <textarea
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Quick explanation of layout purposes..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Blueprint Summary Calculations */}
              <div className="bg-gray-50/70 border border-gray-150 p-5 rounded-xl flex flex-col justify-between h-full">
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-2">Allocations Dashboard</h4>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <span className="text-[10px] text-gray-400 font-medium uppercase font-mono">Expected Inflow</span>
                      <p className="text-lg font-bold text-emerald-600 font-mono mt-0.5">
                        {currencySymbol}{totalIncome(incomes).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-medium uppercase font-mono">Simulated Limits Cap</span>
                      <p className="text-lg font-bold text-amber-600 font-mono mt-0.5">
                        {currencySymbol}{totalExpense(expenses).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 mt-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-gray-550">
                    <span>Remaining Balance Allocation</span>
                    <span className="font-mono font-bold text-gray-700">
                      {currencySymbol}{(totalIncome(incomes) - totalExpense(expenses)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {totalExpense(expenses) > totalIncome(incomes) && (
                    <div className="text-[10px] text-red-650 bg-red-50 p-2.5 rounded-lg font-medium flex gap-1.5 items-center border border-red-100">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      Target expenses exceed target inflows. This plan triggers monthly deficits.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Incomes & Expenses configuration sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              {/* Expected Inflow sources config */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <FolderHeart className="w-4 h-4 text-emerald-500" />
                  Expected Income Sources
                </h4>

                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {incomes.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3">No income sources listed. Add entries below.</p>
                  ) : (
                    incomes.map((inc, i) => (
                      <div key={i} className="flex justify-between items-center p-2.5 border border-gray-150 rounded-lg">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{inc.name}</p>
                          <span className="text-[10px] font-mono text-gray-400">Recurring Inflow</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-emerald-600">
                            {currencySymbol}{inc.expectedAmount}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeIncomeItem(i)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Income Source mini-form */}
                <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-150 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                  <div className="sm:col-span-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Source Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Salary, Side-gig"
                      value={newIncName}
                      onChange={(e) => setNewIncName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Amount</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newIncAmt}
                      onChange={(e) => setNewIncAmt(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-hidden mt-1"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={addIncomeItem}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Expense Targets config */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-amber-500" />
                  Target Expense Categories
                </h4>

                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {expenses.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3">No expense target categories configured yet.</p>
                  ) : (
                    expenses.map((exp, i) => {
                      const details = CATEGORIES[exp.category];
                      const Icon = details?.icon;
                      
                      return (
                        <div key={i} className="flex justify-between items-center p-2.5 border border-gray-150 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="p-1 px-1.5 bg-gray-50 rounded-md">
                              {Icon && <Icon className="w-3.5 h-3.5 text-gray-500" />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{exp.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-amber-600">
                              {currencySymbol}{exp.targetAmount}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeExpenseItem(i)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Expense Category Target mini-form */}
                <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-150 grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                  <div className="sm:col-span-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Category</label>
                    <select
                      value={newExpCat}
                      onChange={(e) => setNewExpCat(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-blue-500 mt-1 cursor-pointer"
                    >
                      {Object.keys(CATEGORIES).filter(cat => cat !== 'Income').map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Target Cap</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newExpAmt}
                      onChange={(e) => setNewExpAmt(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-hidden mt-1"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={addExpenseItem}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold p-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Triggers */}
            <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl text-xs transition-colors cursor-pointer shadow-3xs"
              >
                Save and Select Blueprint
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Standard Blueprint Selector & Visualizer */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Blueprints options column */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-xs lg:col-span-1 space-y-3 h-fit transition-colors">
            <span className="text-[9px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block px-1">Available Blueprints</span>
            
            <div className="space-y-2">
              {allTemplates.map(temp => {
                const isCustom = temp.id.startsWith('t-custom-');
                const isSelected = temp.id === selectedTemplateId;

                return (
                  <div 
                    key={temp.id}
                    onClick={() => setSelectedTemplateId(temp.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-blue-50/70 dark:bg-slate-950 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-400 shadow-3xs font-semibold' 
                        : 'border-gray-100/85 dark:border-slate-800/85 hover:border-gray-250 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-350'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-xs font-bold font-sans tracking-tight">{temp.name}</h4>
                      {isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTemplate(temp.id);
                            // fallback selection
                            setSelectedTemplateId(allTemplates[0]?.id || '');
                          }}
                          className="p-1 rounded-md text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-55/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Erase Blueprint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-slate-450 mt-1.5 line-clamp-2 leading-relaxed">
                      {temp.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-3 text-[9px] font-mono font-bold text-gray-400 dark:text-slate-500">
                      <span>Inflows: {temp.incomes.length}</span>
                      <span>•</span>
                      <span>Expense targets: {temp.expenses.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Blueprint Details & Sandbox operations */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs lg:col-span-2 space-y-6 transition-colors">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[9px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest border border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-slate-950 rounded-full py-0.5 px-2.5">
                  Selected Blueprint Outline
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mt-2">{activeTemplate?.name}</h3>
                <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">{activeTemplate?.description}</p>
              </div>

              {activeTemplate && (
                <button
                  onClick={() => {
                    setApplyTemplateId(activeTemplate.id);
                    setShowApplyModal(true);
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4.5 rounded-xl text-xs shadow-3xs shrink-0 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Apply Blueprint to month
                </button>
              )}
            </div>

            {/* Calculations summaries */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-gray-100 p-3.5 rounded-xl bg-gray-50/40">
                <span className="text-[9px] uppercase font-bold text-gray-405 font-mono">Expected Revenues</span>
                <h4 className="text-md font-bold font-mono text-emerald-600 mt-0.5">
                  {currencySymbol}{totalIncome(activeTemplate?.incomes || []).toLocaleString()}
                </h4>
              </div>
              <div className="border border-gray-100 p-3.5 rounded-xl bg-gray-50/40">
                <span className="text-[9px] uppercase font-bold text-gray-450 font-mono">Target Spends Cap</span>
                <h4 className="text-md font-bold font-mono text-amber-600 mt-0.5">
                  {currencySymbol}{totalExpense(activeTemplate?.expenses || []).toLocaleString()}
                </h4>
              </div>
              <div className="border border-gray-100 p-3.5 rounded-xl bg-gray-50/40">
                <span className="text-[9px] uppercase font-bold text-gray-450 font-mono">Blueprint Surplus</span>
                <h4 className="text-md font-bold font-mono text-slate-800 mt-0.5">
                  {currencySymbol}{(totalIncome(activeTemplate?.incomes || []) - totalExpense(activeTemplate?.expenses || [])).toLocaleString()}
                </h4>
              </div>
            </div>

            {/* Structure preview comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Expected Inflows breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Expected Inflows</h4>
                <div className="space-y-2">
                  {activeTemplate?.incomes.length === 0 ? (
                    <p className="text-xs text-gray-400">No estimated income lines listed.</p>
                  ) : (
                    activeTemplate?.incomes.map((inc, index) => (
                      <div key={index} className="flex justify-between items-center p-2.5 bg-slate-50/50 rounded-lg border border-slate-100">
                        <span className="text-xs font-semibold text-gray-700">{inc.name}</span>
                        <span className="text-xs font-mono font-bold text-emerald-600">
                          {currencySymbol}{inc.expectedAmount.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Expense Targets breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Target Limits list</h4>
                <div className="space-y-2">
                  {activeTemplate?.expenses.length === 0 ? (
                    <p className="text-xs text-gray-400">No limit targets created in this blueprint.</p>
                  ) : (
                    activeTemplate?.expenses.map((exp, index) => {
                      const det = CATEGORIES[exp.category];
                      const Icon = det?.icon;
                      
                      return (
                        <div key={index} className="flex justify-between items-center p-2.5 bg-slate-50/50 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2">
                            {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
                            <span className="text-xs font-semibold text-gray-700">{exp.category}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-amber-600">
                            {currencySymbol}{exp.targetAmount.toLocaleString()}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Apply Template Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-990/70 dark:bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-5 relative">
            
            <button
               onClick={() => setShowApplyModal(false)}
               className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 dark:bg-slate-950 text-blue-600 dark:text-blue-400 rounded-xl">
                <Play className="w-6 h-6 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Apply Blueprint Layout</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500">Deploy allocations immediately into tracking modules.</p>
              </div>
            </div>

            {showApplySuccess ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
                  ✓
                </div>
                <h4 className="font-bold text-sm text-gray-800">Month Configured Successfully!</h4>
                <p className="text-xs text-gray-400">Budgets and initial transactions logs applied.</p>
              </div>
            ) : (
              <form onSubmit={handleApplyWorkflow} className="space-y-4">
                {/* Period month picker */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Financial Month / Period
                  </label>
                  <input
                    type="month"
                    required
                    value={applyMonth}
                    onChange={(e) => setApplyMonth(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Starting logs and target limits will lock onto this period index.</p>
                </div>

                {/* Overwrite Active Budgets options checkbox */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Configuration triggers</span>
                  
                  <label className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 cursor-pointer transition-colors block">
                    <input
                      type="checkbox"
                      checked={applyUpdateBudgets}
                      onChange={(e) => setApplyUpdateBudgets(e.target.checked)}
                      className="mt-0.5 w-4.5 h-4.5 rounded-md text-blue-600 focus:ring-blue-100 border-gray-250"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">Overwrite active budget targets</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Set active limits/caps per category matching this template's quotas.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 cursor-pointer transition-colors block">
                    <input
                      type="checkbox"
                      checked={applyGenerateLogs}
                      onChange={(e) => setApplyGenerateLogs(e.target.checked)}
                      className="mt-0.5 w-4.5 h-4.5 rounded-md text-blue-600 focus:ring-blue-100 border-gray-250"
                    />
                    <div>
                      <span className="text-xs font-bold text-gray-800 block">Pre-fill starting transactions list</span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Automatically log starting expected incomes and baseline expense categories in your Ledger for rapid tracking.
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="border border-gray-200 hover:bg-gray-55/65 text-gray-500 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-xl text-xs transition-colors shadow-3xs cursor-pointer"
                  >
                    Configure Period
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
