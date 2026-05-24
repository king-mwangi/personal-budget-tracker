import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { CATEGORIES } from '../data/categories';
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
  Download
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  currencySymbol?: string;
  onAskAIAboutTrends?: (question: string) => void;
}

export default function TransactionList({
  transactions,
  onDeleteTransaction,
  onEditTransaction,
  currencySymbol = "$",
  onAskAIAboutTrends
}: TransactionListProps) {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

    // 4. Sorting logic
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
  }, [transactions, searchQuery, typeFilter, categoryFilter, sortBy]);

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

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between h-full">
      
      {/* Search and Filters Header */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
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
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search description or category..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gray-200 hover:border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Type trigger Select */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium cursor-pointer focus:outline-hidden"
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
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium cursor-pointer focus:outline-hidden"
            >
              <option value="date-desc">📅 Newest Date</option>
              <option value="date-asc">📅 Oldest Date</option>
              <option value="amount-desc">📈 Highest Amount</option>
              <option value="amount-asc">📉 Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex gap-1.5 flex-wrap pt-1">
          <button
            onClick={() => { setCategoryFilter('all'); setCurrentPage(1); }}
            className={`text-[10px] font-bold py-1 px-3 rounded-full border tracking-wide transition-all cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
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
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Ledger grid list */}
      <div className="flex-1 overflow-x-auto min-h-[350px]">
        {paginatedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-3 bg-gray-50 text-gray-400 rounded-full">
              <Filter className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-gray-500 mt-3">No transactions found matching requirements.</p>
            <p className="text-xs text-gray-400 mt-1">Try relaxing filters or log fresh inputs.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/30">
                <th className="py-3 px-5">Details</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5 text-right">Value</th>
                <th className="py-3 px-5 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/80">
              {paginatedTransactions.map((tx) => {
                const categoryDetails = CATEGORIES[tx.category];
                const IconComp = categoryDetails?.icon;
                
                return (
                  <tr key={tx.id} className="hover:bg-gray-50/50 group transition-colors">
                    {/* Primary notes label */}
                    <td className="py-3 px-5">
                      <div className="max-w-[180px] sm:max-w-[240px]">
                        <p className="text-xs font-semibold text-gray-800 truncate" title={tx.description}>
                          {tx.description}
                        </p>
                      </div>
                    </td>

                    {/* Category pill label */}
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${yToBg(tx.category)}`}>
                        {IconComp && <IconComp className="w-3 h-3" />}
                        {tx.category}
                      </span>
                    </td>

                    {/* Calendar date string */}
                    <td className="py-3 px-5 font-mono text-[11px] text-gray-500">
                      {tx.date}
                    </td>

                    {/* Amount value tags */}
                    <td className="py-3 px-5 text-right font-mono font-bold text-xs">
                      <span className={tx.type === 'income' ? 'text-emerald-600' : 'text-gray-800'}>
                        {tx.type === 'income' ? '+' : '-'}{currencySymbol}{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Quick controls */}
                    <td className="py-3 px-5">
                      <div className="flex justify-center items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="p-1 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit transaction log"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete transaction log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
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
