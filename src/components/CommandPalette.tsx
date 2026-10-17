import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveTab, Transaction } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { useUIModal } from '../context/UIModalContext';
import {
  Search,
  LayoutDashboard,
  Receipt,
  WalletCards,
  Camera,
  Scale,
  PiggyBank,
  CalendarClock,
  FolderHeart,
  TrendingUp,
  Flame,
  Sparkles,
  BarChart3,
  Sun,
  Moon,
  RefreshCw,
  ArrowRight,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  transactions: Transaction[];
  currencySymbol: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onRefreshInsights: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  group: 'Navigation' | 'Quick Actions';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export default function CommandPalette({
  onSelectTab,
  transactions,
  currencySymbol,
  darkMode,
  onToggleDarkMode,
  onRefreshInsights,
}: CommandPaletteProps) {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useUIModal();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'nav-dash',
        title: 'Go to Overview Dashboard',
        subtitle: 'Core KPIs, spend velocity & Gemini diagnostics',
        group: 'Navigation',
        icon: LayoutDashboard,
        action: () => onSelectTab('dash'),
      },
      {
        id: 'nav-ledger',
        title: 'Go to Transaction Ledger',
        subtitle: 'Search, filter, bulk-recategorize & log entries',
        group: 'Navigation',
        icon: Receipt,
        action: () => onSelectTab('ledger'),
      },
      {
        id: 'nav-accounts',
        title: 'Go to Accounts & Wallets Hub',
        subtitle: 'Manage Bank, Mobile Money, Cash, Credit & Transfers',
        group: 'Navigation',
        icon: WalletCards,
        action: () => onSelectTab('accounts'),
      },
      {
        id: 'nav-import',
        title: 'Scan Receipt or Import Bank CSV',
        subtitle: 'Gemini Vision receipt parser & Excel/CSV bulk importer',
        group: 'Quick Actions',
        icon: Camera,
        action: () => onSelectTab('import'),
      },
      {
        id: 'nav-networth',
        title: 'Go to Net Worth & Debt Payoff Planner',
        subtitle: 'Assets sheet & Snowball vs. Avalanche debt simulator',
        group: 'Navigation',
        icon: TrendingUp,
        action: () => onSelectTab('networth'),
      },
      {
        id: 'nav-finance',
        title: 'Go to Category Budget Targets',
        subtitle: 'Configure monthly spending ceilings & alerts',
        group: 'Navigation',
        icon: Scale,
        action: () => onSelectTab('finance'),
      },
      {
        id: 'nav-savings',
        title: 'Go to Savings Reserve Goals',
        subtitle: 'Track emergency funds & milestone targets',
        group: 'Navigation',
        icon: PiggyBank,
        action: () => onSelectTab('savings'),
      },
      {
        id: 'nav-recurring',
        title: 'Go to Fixed Monthly Spends',
        subtitle: 'Automated recurring bills & subscriptions',
        group: 'Navigation',
        icon: CalendarClock,
        action: () => onSelectTab('recurring'),
      },
      {
        id: 'nav-templates',
        title: 'Go to Budget Blueprints',
        subtitle: 'Apply 50/30/20 or custom budget templates',
        group: 'Navigation',
        icon: FolderHeart,
        action: () => onSelectTab('templates'),
      },
      {
        id: 'nav-labs',
        title: 'Go to Financial Labs',
        subtitle: 'FIRE simulator & wealth stress-testing',
        group: 'Navigation',
        icon: Flame,
        action: () => onSelectTab('labs'),
      },
      {
        id: 'nav-reports',
        title: 'Go to Monthly Reports & Excel Export',
        subtitle: 'Executive PDF statements & historical snapshots',
        group: 'Navigation',
        icon: BarChart3,
        action: () => onSelectTab('reports'),
      },
      {
        id: 'nav-ai',
        title: 'Ask Gemini Wealth Advisor',
        subtitle: 'Interactive AI financial chat & strategy',
        group: 'Quick Actions',
        icon: Sparkles,
        action: () => onSelectTab('ai'),
      },
      {
        id: 'act-theme',
        title: darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme',
        subtitle: 'Toggle workspace visual appearance',
        group: 'Quick Actions',
        icon: darkMode ? Sun : Moon,
        action: () => onToggleDarkMode(),
      },
      {
        id: 'act-insights',
        title: 'Refresh AI Financial Diagnostics',
        subtitle: 'Re-analyze current period spending and budgets',
        group: 'Quick Actions',
        icon: RefreshCw,
        action: () => {
          onSelectTab('dash');
          onRefreshInsights();
        },
      },
    ],
    [onSelectTab, darkMode, onToggleDarkMode, onRefreshInsights]
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) => c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)
    );
  }, [commands, query]);

  const matchingTransactions = useMemo(() => {
    if (!query.trim() || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return transactions
      .filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.date.includes(q)
      )
      .slice(0, 5);
  }, [transactions, query]);

  // Keyboard navigation inside Command Palette
  useEffect(() => {
    if (!isCommandPaletteOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredCommands.length > 0
            ? (prev - 1 + filteredCommands.length) % filteredCommands.length
            : 0
        );
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isCommandPaletteOpen, filteredCommands, selectedIndex, setCommandPaletteOpen]);

  return (
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <div
          className="fixed inset-0 z-100 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command, jump to a module, or search ledger entries..."
                className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setCommandPaletteOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-4">
              {filteredCommands.length === 0 && matchingTransactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No matching commands or transactions found for "{query}".
                </div>
              ) : (
                <>
                  {filteredCommands.length > 0 && (
                    <div className="space-y-1">
                      <span className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 block">
                        Workspace Actions & Modules
                      </span>
                      {filteredCommands.map((cmd, idx) => {
                        const Icon = cmd.icon;
                        const active = idx === selectedIndex;
                        return (
                          <button
                            key={cmd.id}
                            type="button"
                            onMouseEnter={() => setSelectedIndex(idx)}
                            onClick={() => {
                              cmd.action();
                              setCommandPaletteOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                              active
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  active ? 'text-white' : 'text-blue-500 dark:text-blue-400'
                                }`}
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">{cmd.title}</p>
                                <p
                                  className={`text-[11px] truncate ${
                                    active
                                      ? 'text-blue-100'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {cmd.subtitle}
                                </p>
                              </div>
                            </div>
                            <ArrowRight
                              className={`w-3.5 h-3.5 shrink-0 ${
                                active ? 'text-white' : 'text-slate-400'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {matchingTransactions.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 block">
                        Matching Ledger Transactions
                      </span>
                      {matchingTransactions.map((tx) => (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() => {
                            onSelectTab('ledger');
                            setCommandPaletteOpen(false);
                          }}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {tx.description}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {tx.category} · {tx.date}
                            </p>
                          </div>
                          <span
                            className={`font-mono tabular-nums font-bold shrink-0 ${
                              tx.type === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-900 dark:text-slate-200'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount, currencySymbol)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Keyboard Hints */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Use ↑↓ arrows to navigate, Enter to select, Esc to close</span>
              <span className="font-mono">Cmd + K</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
