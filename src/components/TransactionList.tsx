import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Transaction } from '../types';
import { CATEGORIES } from '../data/categories';
import { formatCurrency } from '../utils/currencyFormatter';
import { 
  Search, 
  Trash2, 
  Edit3, 
  ArrowUpDown, 
  TrendingUp, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Download,
  Calendar,
  Receipt,
  Plus
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  currencySymbol?: string;
  onAskAIAboutTrends?: (question: string) => void;
  onBulkUpdateCategory?: (ids: string[], category: string) => Promise<void>;
}

export default function TransactionList({
  transactions,
  onDeleteTransaction,
  onEditTransaction,
  currencySymbol = "$",
  onAskAIAboutTrends,
  onBulkUpdateCategory
}: TransactionListProps) {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  
  const [dateRangePreset, setDateRangePreset] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Bulk category selection state
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Synchronize selection with transactions to drop any deleted ones
  useEffect(() => {
    const validIds = new Set(transactions.map(t => t.id));
    setSelectedTxIds(prev => prev.filter(id => validIds.has(id)));
  }, [transactions]);

  const handlePresetChange = (preset: string) => {
    setDateRangePreset(preset);
    setCurrentPage(1);

    const today = new Date();
    
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === '7days') {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 7);
      setStartDate(pastDate.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - 30);
      setStartDate(pastDate.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'thismonth') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(startOfMonth.toISOString().split('T')[0]);
      setEndDate(endOfMonth.toISOString().split('T')[0]);
    } else if (preset === 'lastmonth') {
      const startOfLast = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLast = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(startOfLast.toISOString().split('T')[0]);
      setEndDate(endOfLast.toISOString().split('T')[0]);
    } else if (preset === 'custom') {
      setStartDate('');
      setEndDate('');
    }
  };
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Descriptions helper for expanding row details
  const categoryDescriptions: Record<string, string> = {
    Housing: "Rent, property mortgage, or general home maintenance expenses.",
    Food: "Groceries, restaurant meals, takeaways, and food delivery.",
    Entertainment: "Streaming subscriptions, events, cinema, and social outings.",
    Transport: "Fuel, vehicle amortization, public transport, or taxi fees.",
    Utilities: "Electricity, heating, gas, water supply, broadband, and cell plans.",
    Shopping: "Apparel, standard electronics, home appliances, or accessories.",
    Healthcare: "Medical insurance, pharmacy copays, and general wellness needs.",
    Savings: "Liquid cash transfers, portfolio investments, or retirement lockups.",
    Income: "Monthly wage payments, investment dividends, cash-ins, and bonuses.",
    Other: "Miscellaneous items or auxiliary tracking lines of custom nature."
  };

  // CSV Export action
  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'Type', 'Amount', 'Category', 'Date', 'Description'];
      const rows = transactions.map(tx => [
        tx.id,
        tx.type,
        tx.amount,
        tx.category,
        tx.date,
        `"${tx.description.replace(/"/g, '""')}"`
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ledger_smart_transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error", err);
    }
  };


  // Derived list of matching transactions
  const processedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // 1. Text Search matching (Category or notes)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.description.toLowerCase().includes(q) || 
        tx.category.toLowerCase().includes(q)
      );
    }

    // 2. Class Type filtering
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    // 3. Category filtering
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(tx => tx.category === categoryFilter);
    }

    // 4. Custom Date Range filtering
    if (startDate) {
      filtered = filtered.filter(tx => tx.date && tx.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(tx => tx.date && tx.date <= endDate);
    }

    // 5. Sorting logic
    filtered.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'amount-desc') {
        return b.amount - a.amount;
      } else {
        return a.amount - b.amount;
      }
    });

    return filtered;
  }, [transactions, searchQuery, typeFilter, categoryFilter, sortBy, startDate, endDate]);

  // Paginated chunk
  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [processedTransactions, currentPage]);

  const changePage = (p: number) => {
    if (p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  // Get active expense categories for secondary filters
  const uniqueCategories = useMemo(() => {
    const set = new Set(transactions.map(t => t.category));
    return Array.from(set).sort();
  }, [transactions]);

  // Trigger conversational trends inspection
  const handleAIQuery = () => {
    if (!onAskAIAboutTrends) return;
    const topCategorySpent = processedTransactions
      .filter(t => t.type === 'expense')
      .slice(0, 3)
      .map(t => `${t.category} (${currencySymbol}${t.amount})`)
      .join(', ');
    onAskAIAboutTrends(`Can you analyze my recent financial entries? My logged purchases are: ${topCategorySpent}`);
  };

  const handleApplyBulkUpdate = async () => {
    if (!bulkCategory || selectedTxIds.length === 0 || !onBulkUpdateCategory) return;
    setIsBulkUpdating(true);
    try {
      await onBulkUpdateCategory(selectedTxIds, bulkCategory);
      setSelectedTxIds([]);
      setBulkCategory('');
    } catch (err) {
      console.error("Bulk update failed", err);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between h-full transition-colors">
      
      {/* Search and Filters Header */}
      <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-450" />
            Transaction Ledger
          </h3>

          <div className="flex items-center gap-2 flex-wrap">
            {transactions.length > 0 && (
              <button
                onClick={handleExportCSV}
                title="Download spreadsheet backup of logged transactions."
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold py-1 px-3 rounded-lg text-xs transition-colors cursor-pointer w-fit"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Export CSV
              </button>
            )}

            {onAskAIAboutTrends && transactions.length > 0 && (
              <button
                onClick={handleAIQuery}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold py-1 px-3 rounded-lg text-xs transition-colors cursor-pointer w-fit"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Analyze Outflows
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Action bars */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Key Text query matching */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              id="transaction-search"
              placeholder="Search description or category..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700/80 rounded-xl pl-9 pr-8 py-2.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-2.5 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-md transition-colors cursor-pointer"
                title="Clear Search"
              >
                <span className="text-[10px] font-bold font-mono">✕</span>
              </button>
            )}
          </div>

          {/* Type trigger Select */}
          <div>
            <select
              value={typeFilter}
              id="transaction-type-filter"
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-150 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">📊 All Records</option>
              <option value="income">💸 Income Only</option>
              <option value="expense">🛒 Expenses Only</option>
            </select>
          </div>

          {/* Sort trigger selection */}
          <div>
            <select
              value={sortBy}
              id="transaction-sort-by"
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-150 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="date-desc">📅 Newest Date</option>
              <option value="date-asc">📅 Oldest Date</option>
              <option value="amount-desc">📈 Highest Amount</option>
              <option value="amount-asc">📉 Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Date Range & Presets Filter */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" /> Date Filter:
            </span>
            <select
              value={dateRangePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg py-1 px-2 text-xs font-semibold cursor-pointer dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="thismonth">This Month</option>
              <option value="lastmonth">Last Month</option>
              <option value="custom">Custom Range...</option>
            </select>
          </div>

          {dateRangePreset === 'custom' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="bg-gray-50 border border-gray-200 rounded-lg py-1 px-2 text-xs focus:ring-1 focus:ring-blue-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:outline-hidden"
              />
              <span className="text-gray-405 dark:text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="bg-gray-50 border border-gray-200 rounded-lg py-1 px-2 text-xs focus:ring-1 focus:ring-blue-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:outline-hidden"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); setDateRangePreset('all'); setCurrentPage(1); }}
                  className="text-red-500 hover:text-red-600 font-semibold cursor-pointer text-xs ml-1 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          ) : dateRangePreset !== 'all' ? (
            <div className="text-gray-500 dark:text-slate-400 text-xs font-mono">
              Active: <span className="font-bold text-gray-800 dark:text-white">{startDate}</span> to <span className="font-bold text-gray-800 dark:text-white">{endDate}</span>
            </div>
          ) : (
            <div className="text-gray-450 dark:text-slate-500 text-xs italic font-mono">
              Showing life-time records
            </div>
          )}
        </div>

        {/* Categories Pills */}
        <div className="flex gap-1.5 flex-wrap pt-1">
          <button
            onClick={() => { setCategoryFilter('all'); setCurrentPage(1); }}
            className={`text-[10px] font-bold py-1 px-3 rounded-full border tracking-wide transition-all cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-450 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
            }`}
          >
            All Categories
          </button>
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => { setCategoryFilter(cat); setCurrentPage(1); }}
              className={`text-[10px] font-bold py-1 px-3 rounded-full border tracking-wide transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-450 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Update Categories Action Bar */}
      {selectedTxIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mx-5 mb-4 bg-blue-50/80 dark:bg-blue-950/35 border border-blue-100 dark:border-blue-900/40 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-800 dark:text-blue-300">
              {selectedTxIds.length} transaction{selectedTxIds.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedTxIds([])}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline font-semibold cursor-pointer"
            >
              Deselect all
            </button>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-750 dark:text-slate-300 font-semibold">Change category to:</span>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg py-1 px-2 text-xs font-semibold cursor-pointer dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="">-- Choose Category --</option>
              {Object.keys(CATEGORIES).map(catKey => (
                <option key={catKey} value={catKey}>{catKey}</option>
              ))}
            </select>
            
            <button
              onClick={handleApplyBulkUpdate}
              disabled={!bulkCategory || isBulkUpdating}
              className="bg-blue-600 hover:bg-blue-750 disabled:bg-blue-400 disabled:opacity-55 disabled:cursor-not-allowed text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {isBulkUpdating ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Apply'
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Ledger grid list */}
      <div className="flex-1 overflow-x-auto min-h-[350px]">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-900 m-4 p-8">
            <div className="p-4 bg-blue-50 dark:bg-slate-800 text-blue-500 rounded-2xl mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-sans">No transactions yet</h3>
            <p className="text-sm text-slate-400 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed font-sans mb-6">
              Track your daily earnings, groceries, bill payments, and entertainment outlays in a fast personal database.
            </p>
            <button
              onClick={() => {
                document.getElementById('tx-description-input')?.focus();
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-750 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add your first transaction
            </button>
          </div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center p-8">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl mb-4">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-705 dark:text-slate-200">No transactions match your search</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed mb-5">
              We couldn't locate any records matching active queries. Try pruning search parameters or reset fields.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setCategoryFilter('all');
                setDateRangePreset('all');
                setStartDate('');
                setEndDate('');
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-805/50 rounded-xl text-xs font-semibold text-slate-605 dark:text-slate-350 transition-colors cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/30">
                <th className="py-3 px-5 text-center w-12" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-305 dark:border-slate-700 bg-white dark:bg-slate-950 rounded focus:ring-blue-500 cursor-pointer"
                    checked={paginatedTransactions.length > 0 && paginatedTransactions.every(tx => selectedTxIds.includes(tx.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const toAdd = paginatedTransactions.filter(tx => !selectedTxIds.includes(tx.id)).map(tx => tx.id);
                        setSelectedTxIds(prev => [...prev, ...toAdd]);
                      } else {
                        const pageIds = paginatedTransactions.map(tx => tx.id);
                        setSelectedTxIds(prev => prev.filter(id => !pageIds.includes(id)));
                      }
                    }}
                  />
                </th>
                <th className="py-3 px-5">Details</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5 text-right">Value</th>
                <th className="py-3 px-5 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/80">
              {paginatedTransactions.map((tx, idx) => {
                const categoryDetails = CATEGORIES[tx.category];
                const IconComp = categoryDetails?.icon;
                const isExpanded = expandedTxId === tx.id;
                
                return (
                  <React.Fragment key={tx.id}>
                    <motion.tr 
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.45), ease: "easeOut" }}
                      onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                      className={`transaction-row hover:bg-gray-100/60 dark:hover:bg-slate-800/60 group transition-all duration-150 cursor-pointer border-b border-gray-100/50 dark:border-slate-800/40 ${selectedTxIds.includes(tx.id) ? 'bg-blue-50/20 dark:bg-blue-950/20' : ''}`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-5 text-center w-12" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-305 dark:border-slate-700 bg-white dark:bg-slate-950 rounded focus:ring-blue-500 cursor-pointer"
                          checked={selectedTxIds.includes(tx.id)}
                          onChange={() => {
                            setSelectedTxIds(prev => 
                              prev.includes(tx.id) 
                                ? prev.filter(id => id !== tx.id) 
                                : [...prev, tx.id]
                            );
                          }}
                        />
                      </td>

                      {/* Primary notes label */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-400 font-mono select-none transition-transform duration-150 text-center w-3">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          <div className="max-w-[170px] sm:max-w-[230px]">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate" title={tx.description}>
                              {tx.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category pill label */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${yToBg(tx.category)}`}>
                          {IconComp && <IconComp className="w-3 h-3" />}
                          {tx.category}
                        </span>
                      </td>

                      {/* Calendar date string */}
                      <td className="py-3.5 px-5 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                        {tx.date}
                      </td>

                      {/* Amount value tags */}
                      <td className="py-3.5 px-5 text-right font-mono font-bold text-xs">
                        <span className={tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-100'}>
                          {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.type === 'income' ? tx.amount : -tx.amount, currencySymbol, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Quick controls */}
                      <td className="py-3.5 px-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditTransaction(tx)}
                            className="p-1 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit transaction log"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Delete transaction log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    
                    {/* Expanded details template */}
                    {isExpanded && (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className="bg-slate-50/50 dark:bg-slate-950/30"
                      >
                        <td colSpan={6} className="px-5 py-4 border-b border-gray-150 dark:border-slate-800/80">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="space-y-1 p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-xs">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono tracking-wider block">ID Reference</span>
                              <code className="text-[10.5px] font-mono text-slate-600 dark:text-slate-300 break-all select-all block bg-slate-50/50 dark:bg-slate-950/50 px-1.5 py-1 rounded border border-gray-150 dark:border-slate-800">
                                {tx.id}
                              </code>
                            </div>
                            
                            <div className="space-y-1 p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-xs">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono tracking-wider block">Created Timestamp</span>
                              <div className="text-slate-600 dark:text-slate-300 font-medium">
                                📅 Record date: <span className="font-mono font-bold text-slate-800 dark:text-white">{tx.date}</span>
                              </div>
                              <span className="text-[10px] text-gray-450 dark:text-gray-500 font-mono block">Status: Confirmed & Persisted</span>
                            </div>
                            
                            <div className="space-y-1 p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl shadow-xs">
                              <span className="text-[10px] font-bold text-slate-405 dark:text-slate-500 uppercase font-mono tracking-wider block">Budget Category Insight</span>
                              <p className="text-slate-600 dark:text-slate-350 leading-relaxed text-[11px]">
                                {categoryDescriptions[tx.category] || "No description loaded."}
                              </p>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination controls footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100/80 flex items-center justify-between text-xs bg-gray-50/20">
          <span className="text-gray-400 font-medium">
            Showing Page <span className="text-gray-700 font-bold">{currentPage}</span> of <span className="text-gray-750 font-semibold">{totalPages}</span>
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border border-gray-200 hover:border-gray-300 rounded-lg bg-white shadow-3xs disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-200 hover:border-gray-300 rounded-lg bg-white shadow-3xs disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple dynamic color mapper for categories
function yToBg(category: string): string {
  const meta = CATEGORIES[category];
  if (!meta) return 'bg-gray-50 text-gray-600 border-gray-200';
  return `${meta.bgColor} ${meta.borderColor} style-color-${category}`;
}
