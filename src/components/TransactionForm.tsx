import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { CATEGORIES } from '../data/categories';
import { 
  Plus, 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  Save, 
  Check,
  Tag,
  Calendar,
  DollarSign,
  FileText
} from 'lucide-react';

interface TransactionFormProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction?: (id: string, updated: Partial<Transaction>) => void;
  editingTransaction?: Transaction | null;
  onCancelEdit?: () => void;
  currencySymbol?: string;
}

export default function TransactionForm({
  onAddTransaction,
  onUpdateTransaction,
  editingTransaction,
  onCancelEdit,
  currencySymbol = "$"
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('Food');
  const [date, setDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // Set default current date on startup
  useEffect(() => {
    if (!editingTransaction) {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
    }
  }, [editingTransaction]);

  // Load editing transaction if provided
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setDescription(editingTransaction.description);
    } else {
      setAmount('');
      setDescription('');
      // Set to appropriate category default
      setCategory(type === 'income' ? 'Income' : 'Food');
    }
  }, [editingTransaction, type]);

  // Sync category default on type switch
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (!editingTransaction) {
      setCategory(newType === 'income' ? 'Income' : 'Food');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0 || !category || !date) return;

    const payload = {
      type,
      amount: amountNum,
      category,
      date,
      description: description.trim() || `${category} log`
    };

    if (editingTransaction && onUpdateTransaction) {
      onUpdateTransaction(editingTransaction.id, payload);
    } else {
      onAddTransaction(payload);
      // Briefly show visual checklist confirmation and reset
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // Clean form parameters
      setAmount('');
      setDescription('');
    }
  };

  return (
    <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs">
      {/* Dynamic Form Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-900">
          {editingTransaction ? 'Modify Transaction Log' : 'Record Transaction'}
        </h3>
        {editingTransaction && onCancelEdit && (
          <button 
            type="button" 
            onClick={onCancelEdit}
            className="p-1 px-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Toggle Slider style */}
        <div className="grid grid-cols-2 p-1 bg-gray-50 border border-gray-150 rounded-xl">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              type === 'expense'
                ? 'bg-white text-amber-600 shadow-xs border border-gray-150/50'
                : 'text-gray-500 hover:text-gray-800'
            } cursor-pointer`}
          >
            <ArrowDownRight className="w-4 h-4" />
            Monthly Expense
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              type === 'income'
                ? 'bg-white text-emerald-600 shadow-xs border border-gray-150/50'
                : 'text-gray-500 hover:text-gray-800'
            } cursor-pointer`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Monthly Income
          </button>
        </div>

        {/* Input Details */}
        <div className="space-y-4">
          
          {/* Outflow Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Transaction Volume
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-gray-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl pl-8 pr-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">
                  <Tag className="w-4 h-4" />
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-200 hover:border-gray-300 rounded-xl pl-9 pr-3.5 py-2.5 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all cursor-pointer"
                >
                  {type === 'income' ? (
                    <>
                      <option value="Income">Salary / Income</option>
                      <option value="Other">Other Incoming</option>
                    </>
                  ) : (
                    Object.keys(CATEGORIES).filter(cat => cat !== 'Income').map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Date selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
                />
              </div>
            </div>

          </div>

          {/* Optional notes or tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Note (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">
                <FileText className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Weekly grocery haul, salary payday..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-100 focus:border-blue-500 block"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={showSuccess}
          className={`w-full flex items-center justify-center gap-2 font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-2xs ${
            showSuccess 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.99]'
          }`}
        >
          {showSuccess ? (
            <>
              <Check className="w-4.5 h-4.5 animate-bounce" /> Logged Successfully
            </>
          ) : editingTransaction ? (
            <>
              <Save className="w-4.5 h-4.5" /> Update Log Entry
            </>
          ) : (
            <>
              <Plus className="w-4.5 h-4.5" /> Save Transaction log
            </>
          )}
        </button>
      </form>
    </div>
  );
}
