import React, { useState } from 'react';
import { RecurringTransaction, TransactionType } from '../types';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Play, 
  Info,
  CalendarClock,
  ArrowRight,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

interface RecurringManagerProps {
  recurringItems: RecurringTransaction[];
  onAddRecurring: (item: Omit<RecurringTransaction, 'id'>) => void;
  onDeleteRecurring: (id: string) => void;
  onTriggerRecurringManually: (id: string) => void;
  currencySymbol: string;
}

const COMMON_CATEGORIES = [
  'Housing',
  'Utilities',
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Subscriptions',
  'Insurance',
  'Other'
];

export default function RecurringManager({
  recurringItems,
  onAddRecurring,
  onDeleteRecurring,
  onTriggerRecurringManually,
  currencySymbol
}: RecurringManagerProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Subscriptions');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [autoLog, setAutoLog] = useState(true);
  const [type, setType] = useState<TransactionType>('expense');

  const [notification, setNotification] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    onAddRecurring({
      type,
      amount: parseFloat(amount),
      category,
      description: description.trim(),
      dayOfMonth: Math.min(31, Math.max(1, parseInt(dayOfMonth) || 1)),
      autoLog
    });

    setDescription('');
    setAmount('');
    setNotification('Recurring expense template scheduled successfully!');
    setTimeout(() => setNotification(null), 3500);
  };

  const handleManualTrigger = (item: RecurringTransaction) => {
    onTriggerRecurringManually(item.id);
    setNotification(`Successfully posted invoice of ${currencySymbol}${item.amount} for "${item.description}" into the transaction ledger!`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600/10 via-emerald-600/5 to-transparent border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl p-5 sm:p-6 shadow-3xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="py-1 px-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] tracking-wider uppercase rounded-full font-mono flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Continuous Trackers
              </span>
            </div>
            <h2 className="text-xl font-bold font-sans tracking-tight text-slate-900 dark:text-white">
              Fixed Monthly Expenses
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set automated utility bills, streaming services, rent contracts, or gym dues. We check monthly schedules and automatically post recurring records, or trigger them instantly with one click.
            </p>
          </div>
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-mono text-xs">
            <CalendarClock className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-slate-600 dark:text-slate-300">Set once, worry-free</span>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-teal-50 dark:bg-teal-950/20 text-teal-800 dark:text-teal-300 text-xs font-semibold rounded-xl border border-teal-100 dark:border-teal-900 flex items-center gap-2.5 shadow-sm animate-in fade-in duration-200">
          <Sparkles className="w-4.5 h-4.5 text-teal-600" />
          <span>{notification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scheduler Form */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-3xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Plus className="w-4 h-4 text-teal-600" />
            Schedule New Fixed Expense
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                Subscription / Expense Name
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Netflix Subscription, Apartment Rent"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Amount */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Amount ({currencySymbol.trim()})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 transition-colors"
                />
              </div>

              {/* Day of Month */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Post Day of Month
                </label>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 transition-colors cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Day {d} {d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Category */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 transition-colors cursor-pointer"
                >
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TransactionType)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-950/40 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 transition-colors cursor-pointer"
                >
                  <option value="expense">Expense (Fixed Outflow)</option>
                  <option value="income">Income (Recurring Salary/Inflow)</option>
                </select>
              </div>
            </div>

            {/* Toggle Switch Auto Log */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-800/80">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Automated Ledger Logging</span>
                <span className="text-[10px] text-slate-500 block">Auto-insert to ledger when due on month change to save clicks.</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoLog(!autoLog)}
                className="text-teal-600 focus:outline-hidden cursor-pointer"
              >
                {autoLog ? (
                  <ToggleRight className="w-10 h-10 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                )}
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4.5 h-4.5" />
              Schedule Fixed Expense
            </button>
          </form>

          {/* Educational tip block */}
          <div className="p-3.5 bg-sky-50 dark:bg-sky-950/10 rounded-xl border border-sky-100 dark:border-sky-900/40 text-[10px] text-sky-700 dark:text-sky-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
            <p className="leading-relaxed font-medium">
              Fixed costs (the "Needs" in 50/30/20 budget framework) shouldn't be added manually each iteration. Let Ledger Smart automate logging so you get clean historical visualizations effortlessly.
            </p>
          </div>
        </div>

        {/* Existing Trackers List */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 shadow-3xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Active Fixed Subscriptions & Expenses ({recurringItems.length})
            </h3>
            <span className="bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-1 rounded-md font-mono">
              Monthly Cycle
            </span>
          </div>

          {recurringItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <CalendarClock className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <p className="text-xs font-semibold">No fixed monthly trackers scheduled yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Schedule your landlord payments, phone plans, gym memberships, software subscriptions, or recurring investment portfolios above.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {recurringItems.map((item) => (
                <div 
                  key={item.id} 
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-750 bg-slate-50/30 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] uppercase font-bold text-center min-w-12 tracking-tighter">
                      <div className="text-[8px] text-slate-400 tracking-normal">DAY</div>
                      <div className="text-sm text-slate-800 dark:text-slate-100 font-bold">{item.dayOfMonth}</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.description}</span>
                        <span className="px-1.5 py-0.5 text-[8px] font-extrabold font-mono tracking-wider rounded-md uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {item.category}
                        </span>
                        {item.autoLog ? (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold font-mono rounded-md bg-emerald-50 dark:bg-emerald-950/25 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-800/40">
                            Auto
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold font-mono rounded-md bg-amber-50 dark:bg-amber-950/25 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-800/40">
                            Manual Key
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Type: {item.type === 'income' ? 'Recurring Salary Inflow' : 'Fixed Monthly Cost'} • 
                        {item.lastLoggedDate ? ` Last posted: ${item.lastLoggedDate}` : ' Not posted yet this month'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800/80">
                    <div className="font-bold text-xs text-right font-mono text-slate-800 dark:text-slate-100">
                      <span className={item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}>
                        {item.type === 'income' ? '+' : '-'}{currencySymbol}{item.amount.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Trigger manually button */}
                      <button
                        onClick={() => handleManualTrigger(item)}
                        title="Trigger template & print record to Ledger main log immediately."
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-emerald-600 dark:fill-emerald-300" />
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => onDeleteRecurring(item.id)}
                        title="Delete scheduling template"
                        className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Statistics summary metrics */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">Total Fixed Expenses</span>
              <p className="text-sm font-bold text-rose-600 mt-1 font-mono">
                {currencySymbol}
                {recurringItems
                  .filter(i => i.type === 'expense')
                  .reduce((sum, item) => sum + item.amount, 0)
                  .toLocaleString()}
                <span className="text-[10px] font-medium text-slate-400 block font-sans">Per Month Scheduled</span>
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl">
              <span className="text-[9px] font-bold text-slate-400 uppercase block font-mono">Automated Outflows Rate</span>
              <p className="text-sm font-bold text-emerald-600 mt-1 font-mono hover:underline">
                {recurringItems.length > 0
                  ? Math.round((recurringItems.filter(i => i.autoLog && i.type === 'expense').length / Math.max(1, recurringItems.filter(i => i.type === 'expense').length)) * 100)
                  : 0}
                %
                <span className="text-[10px] font-medium text-slate-400 block font-sans">Self-executing bills</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
