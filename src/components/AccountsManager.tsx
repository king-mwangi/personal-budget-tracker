import React, { useState, useMemo } from 'react';
import { Account, AccountType, Transaction } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { useUIModal } from '../context/UIModalContext';
import {
  Landmark,
  Wallet,
  CreditCard,
  Smartphone,
  Coins,
  TrendingUp,
  Plus,
  ArrowLeftRight,
  Trash2,
  Edit3,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface AccountsManagerProps {
  accounts: Account[];
  transactions: Transaction[];
  onAddAccount: (account: Omit<Account, 'id'>) => void;
  onUpdateAccount: (id: string, updated: Partial<Account>) => void;
  onDeleteAccount: (id: string) => void;
  onTransferFunds: (fromAccountId: string, toAccountId: string, amount: number, date: string, note: string) => void;
  currencySymbol: string;
}

const ACCOUNT_TYPE_META: Record<
  AccountType,
  { label: string; icon: React.ComponentType<{ className?: string }>; defaultColor: string }
> = {
  checking: { label: 'Bank Checking', icon: Landmark, defaultColor: '#2563EB' },
  savings: { label: 'High-Yield Savings', icon: Landmark, defaultColor: '#059669' },
  mobile_money: { label: 'Mobile Money / M-Pesa', icon: Smartphone, defaultColor: '#16A34A' },
  cash: { label: 'Cash Wallet', icon: Wallet, defaultColor: '#D97706' },
  credit: { label: 'Credit Card', icon: CreditCard, defaultColor: '#DC2626' },
  investment: { label: 'Brokerage / Equity', icon: TrendingUp, defaultColor: '#4F46E5' },
  crypto: { label: 'Crypto / Web3 Vault', icon: Coins, defaultColor: '#7C3AED' },
};

export default function AccountsManager({
  accounts,
  transactions,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onTransferFunds,
  currencySymbol,
}: AccountsManagerProps) {
  const { confirmAction, showToast } = useUIModal();

  // New / Edit Account Form state
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [initialBalance, setInitialBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [last4, setLast4] = useState('');

  // Transfer Modal state
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [fromId, setFromId] = useState<string>(accounts[0]?.id || '');
  const [toId, setToId] = useState<string>(accounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [transferNote, setTransferNote] = useState('');

  // Selected Account Filter for Activity inspection
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  // Compute live balances per account
  const accountStats = useMemo(() => {
    const map: Record<
      string,
      { currentBalance: number; inflows: number; outflows: number; txCount: number }
    > = {};

    accounts.forEach((acc) => {
      map[acc.id] = {
        currentBalance: acc.initialBalance,
        inflows: 0,
        outflows: 0,
        txCount: 0,
      };
    });

    // If transactions don't have an explicit accountId, assign them to the primary/first checking account for unified visibility
    const primaryAccountId = accounts[0]?.id;

    transactions.forEach((tx) => {
      const targetId = tx.accountId || primaryAccountId;
      if (targetId && map[targetId]) {
        map[targetId].txCount += 1;
        if (tx.type === 'income') {
          map[targetId].inflows += tx.amount;
          map[targetId].currentBalance += tx.amount;
        } else {
          map[targetId].outflows += tx.amount;
          map[targetId].currentBalance -= tx.amount;
        }
      }
    });

    return map;
  }, [accounts, transactions]);

  const totalLiquidBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      const bal = accountStats[acc.id]?.currentBalance ?? acc.initialBalance;
      return sum + bal;
    }, 0);
  }, [accounts, accountStats]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setType('checking');
    setInitialBalance('');
    setInstitution('');
    setLast4('');
    setShowAccountForm(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingId(acc.id);
    setName(acc.name);
    setType(acc.type);
    setInitialBalance(String(acc.initialBalance));
    setInstitution(acc.institution || '');
    setLast4(acc.accountNumberLast4 || '');
    setShowAccountForm(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const parsedInitial = parseFloat(initialBalance) || 0;
    const color = ACCOUNT_TYPE_META[type].defaultColor;

    if (editingId) {
      onUpdateAccount(editingId, {
        name: name.trim(),
        type,
        initialBalance: parsedInitial,
        institution: institution.trim() || undefined,
        accountNumberLast4: last4.trim() || undefined,
        color,
      });
      showToast(`Updated account "${name.trim()}"`);
    } else {
      onAddAccount({
        name: name.trim(),
        type,
        initialBalance: parsedInitial,
        institution: institution.trim() || undefined,
        accountNumberLast4: last4.trim() || undefined,
        color,
      });
      showToast(`Created account "${name.trim()}"`);
    }
    setShowAccountForm(false);
  };

  const handleDelete = async (acc: Account) => {
    const ok = await confirmAction({
      title: `Remove "${acc.name}"?`,
      message:
        'Removing this wallet will unlink it from your account overview. Your historical ledger transactions will remain intact.',
      confirmLabel: 'Remove Wallet',
      variant: 'danger',
    });
    if (ok) {
      onDeleteAccount(acc.id);
      if (selectedAccountId === acc.id) setSelectedAccountId('all');
      showToast(`Removed wallet "${acc.name}"`, 'info');
    }
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!fromId || !toId || fromId === toId || isNaN(amt) || amt <= 0) return;

    onTransferFunds(fromId, toId, amt, transferDate, transferNote.trim());
    setTransferAmount('');
    setTransferNote('');
    setShowTransferForm(false);
    showToast(`Transferred ${formatCurrency(amt, currencySymbol)} between wallets`);
  };

  const primaryAccountId = accounts[0]?.id;
  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') return transactions.slice(0, 12);
    return transactions
      .filter((t) => (t.accountId || primaryAccountId) === selectedAccountId)
      .slice(0, 12);
  }, [transactions, selectedAccountId, primaryAccountId]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <span>Multi-Account & Wallet Hub</span>
            <span aria-hidden="true">·</span>
            <span>{accounts.length} Active Wallets</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Consolidated Liquidity:{' '}
            <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400">
              {formatCurrency(totalLiquidBalance, currencySymbol)}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track bank checking, mobile money, cash reserves, credit cards, and investment wallets in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {accounts.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setFromId(accounts[0]?.id || '');
                setToId(accounts[1]?.id || '');
                setShowTransferForm((prev) => !prev);
                setShowAccountForm(false);
              }}
              className="py-2 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
              Transfer Funds
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="py-2 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Account / Wallet
          </button>
        </div>
      </div>

      {/* Add / Edit Account Form Drawer */}
      {showAccountForm && (
        <form
          onSubmit={handleSaveAccount}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {editingId ? 'Edit Wallet Configuration' : 'Create New Financial Account'}
            </h3>
            <button
              type="button"
              onClick={() => setShowAccountForm(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Account Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Primary Checking, M-Pesa"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Wallet Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {Object.entries(ACCOUNT_TYPE_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Starting / Baseline Balance ({currencySymbol.trim()})
              </label>
              <input
                type="number"
                step="any"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Institution / Last 4 Digits (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Bank / Provider"
                  className="w-2/3 px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  maxLength={4}
                  value={last4}
                  onChange={(e) => setLast4(e.target.value)}
                  placeholder="4821"
                  className="w-1/3 px-2.5 py-2.5 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowAccountForm(false)}
              className="py-2 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {editingId ? 'Save Changes' : 'Create Wallet'}
            </button>
          </div>
        </form>
      )}

      {/* Inter-Account Transfer Drawer */}
      {showTransferForm && (
        <form
          onSubmit={handleExecuteTransfer}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-blue-500" />
              Instant Inter-Account Transfer
            </h3>
            <button
              type="button"
              onClick={() => setShowTransferForm(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                From Source Wallet
              </label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(accountStats[a.id]?.currentBalance ?? a.initialBalance, currencySymbol)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                To Destination Wallet
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === fromId}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Transfer Amount ({currencySymbol.trim()})
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Transfer Memo & Date
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="e.g. Savings sweep"
                  className="w-1/2 px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-1/2 px-2.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowTransferForm(false)}
              className="py-2 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={fromId === toId || !transferAmount}
              className="py-2 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Execute Transfer
            </button>
          </div>
        </form>
      )}

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc, idx) => {
          const meta = ACCOUNT_TYPE_META[acc.type] || ACCOUNT_TYPE_META.checking;
          const IconComponent = meta.icon;
          const stats = accountStats[acc.id] || {
            currentBalance: acc.initialBalance,
            inflows: 0,
            outflows: 0,
            txCount: 0,
          };
          const isSelected = selectedAccountId === acc.id;

          return (
            <div
              key={acc.id}
              onClick={() => setSelectedAccountId(isSelected ? 'all' : acc.id)}
              className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                isSelected
                  ? 'border-blue-600 dark:border-blue-500 ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: acc.color || meta.defaultColor }}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {acc.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{meta.label}</span>
                      {acc.institution && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{acc.institution}</span>
                        </>
                      )}
                      {acc.accountNumberLast4 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">•••• {acc.accountNumberLast4}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(acc)}
                    title="Edit Account"
                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDelete(acc)}
                      title="Delete Account"
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                    Available Balance {idx === 0 ? '(Primary Default)' : ''}
                  </span>
                  <p
                    className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                      stats.currentBalance < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {formatCurrency(stats.currentBalance, currencySymbol)}
                  </p>
                </div>
                <div className="text-right text-[11px] font-mono tabular-nums space-y-0.5">
                  <div className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                    <ArrowUpRight className="w-3 h-3" />
                    {formatCurrency(stats.inflows, currencySymbol, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-amber-600 dark:text-amber-400 flex items-center justify-end gap-0.5">
                    <ArrowDownRight className="w-3 h-3" />
                    {formatCurrency(stats.outflows, currencySymbol, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Activity Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Wallet Activity Stream
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any wallet card above or use the filter tabs to inspect account-specific cash flows.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedAccountId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedAccountId === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Wallets
            </button>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setSelectedAccountId(acc.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedAccountId === acc.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {acc.name}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No transactions logged for this wallet yet.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Record a transaction in the Ledger or run an Inter-Account Transfer above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {filteredTransactions.map((tx) => {
              const linkedAcc =
                accounts.find((a) => a.id === (tx.accountId || primaryAccountId)) || accounts[0];
              return (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{tx.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{tx.date}</span>
                      {linkedAcc && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {linkedAcc.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={`font-mono tabular-nums font-bold shrink-0 ${
                      tx.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, currencySymbol)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
