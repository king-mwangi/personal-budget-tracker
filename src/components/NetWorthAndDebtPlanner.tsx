import React, { useState, useMemo } from 'react';
import { Account, AssetItem, LiabilityItem, Transaction } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { useUIModal } from '../context/UIModalContext';
import {
  TrendingUp,
  ShieldAlert,
  Plus,
  Trash2,
  Zap,
  Snowflake,
  Building2,
  CheckCircle2,
  Calendar,
  ArrowRight,
  DollarSign,
} from 'lucide-react';

interface NetWorthAndDebtPlannerProps {
  accounts: Account[];
  transactions: Transaction[];
  assets: AssetItem[];
  liabilities: LiabilityItem[];
  onAddAsset: (asset: Omit<AssetItem, 'id'>) => void;
  onDeleteAsset: (id: string) => void;
  onAddLiability: (liability: Omit<LiabilityItem, 'id'>) => void;
  onUpdateLiability: (id: string, updated: Partial<LiabilityItem>) => void;
  onDeleteLiability: (id: string) => void;
  onRecordDebtPayment: (liability: LiabilityItem, paymentAmount: number) => void;
  currencySymbol: string;
}

const ASSET_CATEGORY_LABELS: Record<AssetItem['category'], string> = {
  real_estate: 'Real Estate & Property',
  vehicle: 'Vehicles & Mobility',
  equity: 'Stocks, Index Funds & Retirement',
  crypto: 'Digital Assets & Crypto',
  valuables: 'Collectibles & Precious Metals',
  other: 'Business & Other Assets',
};

const LIABILITY_CATEGORY_LABELS: Record<LiabilityItem['category'], string> = {
  credit_card: 'Credit Card Revolving',
  student_loan: 'Student / Education Loan',
  mortgage: 'Home Mortgage',
  auto_loan: 'Auto / Vehicle Financing',
  personal_loan: 'Personal / Business Loan',
};

interface PayoffSimulationResult {
  monthsToPayoff: number;
  totalInterestPaid: number;
  totalPaid: number;
  payoffDateLabel: string;
  schedule: Array<{
    monthIndex: number;
    label: string;
    remainingBalance: number;
    interestPaid: number;
    principalPaid: number;
  }>;
  orderedDebts: LiabilityItem[];
}

function simulateDebtPayoff(
  liabilities: LiabilityItem[],
  extraMonthlyPayment: number,
  strategy: 'avalanche' | 'snowball'
): PayoffSimulationResult {
  const activeDebts = liabilities
    .filter((d) => d.balance > 0)
    .map((d) => ({ ...d }));

  if (activeDebts.length === 0) {
    return {
      monthsToPayoff: 0,
      totalInterestPaid: 0,
      totalPaid: 0,
      payoffDateLabel: 'Debt Free Now',
      schedule: [],
      orderedDebts: [],
    };
  }

  // Sort according to chosen strategy
  const sortedOrder = [...activeDebts].sort((a, b) =>
    strategy === 'avalanche' ? b.apr - a.apr : a.balance - b.balance
  );

  const simDebts = sortedOrder.map((d) => ({ ...d, currentBalance: d.balance }));
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const maxMonths = 360; // 30-year cap
  const schedule: PayoffSimulationResult['schedule'] = [];
  const now = new Date();

  while (simDebts.some((d) => d.currentBalance > 0.01) && month < maxMonths) {
    month += 1;
    let monthInterest = 0;
    let monthPrincipal = 0;
    let availableExtra = extraMonthlyPayment;

    // 1. Accrue monthly interest and pay minimum on each active debt
    for (const debt of simDebts) {
      if (debt.currentBalance <= 0.01) {
        // Snowball/Avalanche rollover: minimum payment of paid-off debt rolls into availableExtra!
        availableExtra += debt.minimumPayment;
        continue;
      }

      const monthlyRate = (debt.apr / 100) / 12;
      const interest = debt.currentBalance * monthlyRate;
      monthInterest += interest;
      totalInterest += interest;

      const balanceWithInterest = debt.currentBalance + interest;
      const minPay = Math.min(balanceWithInterest, Math.max(debt.minimumPayment, interest + 1));
      const principal = minPay - interest;

      debt.currentBalance = Math.max(0, balanceWithInterest - minPay);
      monthPrincipal += principal;
      totalPaid += minPay;
    }

    // 2. Direct all availableExtra + rolled-over minimums to the highest-priority remaining debt
    for (const debt of simDebts) {
      if (debt.currentBalance > 0.01 && availableExtra > 0) {
        const applied = Math.min(debt.currentBalance, availableExtra);
        debt.currentBalance -= applied;
        availableExtra -= applied;
        monthPrincipal += applied;
        totalPaid += applied;
      }
    }

    const totalRemaining = simDebts.reduce((sum, d) => sum + d.currentBalance, 0);
    const futureDate = new Date(now.getFullYear(), now.getMonth() + month, 1);
    const label = futureDate.toLocaleDateString('default', { month: 'short', year: 'numeric' });

    if (month <= 36 || month % 6 === 0 || totalRemaining <= 0.01) {
      schedule.push({
        monthIndex: month,
        label,
        remainingBalance: parseFloat(totalRemaining.toFixed(2)),
        interestPaid: parseFloat(monthInterest.toFixed(2)),
        principalPaid: parseFloat(monthPrincipal.toFixed(2)),
      });
    }
  }

  const payoffDate = new Date(now.getFullYear(), now.getMonth() + month, 1);
  const payoffDateLabel =
    month >= maxMonths
      ? '30+ Years (Increase Monthly Payment)'
      : payoffDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  return {
    monthsToPayoff: month,
    totalInterestPaid: parseFloat(totalInterest.toFixed(2)),
    totalPaid: parseFloat(totalPaid.toFixed(2)),
    payoffDateLabel,
    schedule,
    orderedDebts: sortedOrder,
  };
}

export default function NetWorthAndDebtPlanner({
  accounts,
  transactions,
  assets,
  liabilities,
  onAddAsset,
  onDeleteAsset,
  onAddLiability,
  onDeleteLiability,
  onRecordDebtPayment,
  currencySymbol,
}: NetWorthAndDebtPlannerProps) {
  const { confirmAction, showToast } = useUIModal();

  // Sub-view toggle: 'networth' | 'debt'
  const [subView, setSubView] = useState<'networth' | 'debt'>('networth');

  // Asset Form State
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState<AssetItem['category']>('real_estate');
  const [assetValue, setAssetValue] = useState('');
  const [assetNotes, setAssetNotes] = useState('');

  // Liability Form State
  const [debtName, setDebtName] = useState('');
  const [debtCategory, setDebtCategory] = useState<LiabilityItem['category']>('credit_card');
  const [debtBalance, setDebtBalance] = useState('');
  const [debtApr, setDebtApr] = useState('');
  const [debtMinPayment, setDebtMinPayment] = useState('');

  // Payoff Strategy State
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraPayment, setExtraPayment] = useState<number>(150);

  // Compute liquid cash across all accounts
  const liquidAccountsTotal = useMemo(() => {
    const primaryId = accounts[0]?.id;
    const balances: Record<string, number> = {};
    accounts.forEach((a) => {
      balances[a.id] = a.initialBalance;
    });
    transactions.forEach((tx) => {
      const targetId = tx.accountId || primaryId;
      if (targetId && balances[targetId] !== undefined) {
        balances[targetId] += tx.type === 'income' ? tx.amount : -tx.amount;
      }
    });
    return Object.values(balances).reduce((sum, v) => sum + v, 0);
  }, [accounts, transactions]);

  const manualAssetsTotal = useMemo(
    () => assets.reduce((sum, a) => sum + a.value, 0),
    [assets]
  );

  const totalAssets = liquidAccountsTotal + manualAssetsTotal;
  const totalLiabilities = useMemo(
    () => liabilities.reduce((sum, l) => sum + l.balance, 0),
    [liabilities]
  );
  const netWorth = totalAssets - totalLiabilities;

  // Debt Simulations (Avalanche vs Snowball vs Minimum-Only baseline)
  const avalancheSim = useMemo(
    () => simulateDebtPayoff(liabilities, extraPayment, 'avalanche'),
    [liabilities, extraPayment]
  );
  const snowballSim = useMemo(
    () => simulateDebtPayoff(liabilities, extraPayment, 'snowball'),
    [liabilities, extraPayment]
  );
  const baselineMinOnlySim = useMemo(
    () => simulateDebtPayoff(liabilities, 0, 'avalanche'),
    [liabilities]
  );

  const activeSim = strategy === 'avalanche' ? avalancheSim : snowballSim;
  const interestSavedVsMinimum = Math.max(
    0,
    baselineMinOnlySim.totalInterestPaid - activeSim.totalInterestPaid
  );
  const monthsSavedVsMinimum = Math.max(
    0,
    baselineMinOnlySim.monthsToPayoff - activeSim.monthsToPayoff
  );

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(assetValue);
    if (!assetName.trim() || isNaN(val) || val < 0) return;
    onAddAsset({
      name: assetName.trim(),
      category: assetCategory,
      value: val,
      notes: assetNotes.trim() || undefined,
      lastUpdated: new Date().toISOString().split('T')[0],
    });
    setAssetName('');
    setAssetValue('');
    setAssetNotes('');
    showToast(`Added asset "${assetName.trim()}"`);
  };

  const handleCreateLiability = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(debtBalance);
    const apr = parseFloat(debtApr) || 0;
    const minPay = parseFloat(debtMinPayment) || Math.max(25, bal * 0.03);
    if (!debtName.trim() || isNaN(bal) || bal <= 0) return;

    onAddLiability({
      name: debtName.trim(),
      category: debtCategory,
      balance: bal,
      apr,
      minimumPayment: minPay,
    });
    setDebtName('');
    setDebtBalance('');
    setDebtApr('');
    setDebtMinPayment('');
    showToast(`Added liability "${debtName.trim()}"`);
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Assets (Liquid + Property/Equity)
          </span>
          <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalAssets, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
            Wallets: {formatCurrency(liquidAccountsTotal, currencySymbol)} · Property/Investments:{' '}
            {formatCurrency(manualAssetsTotal, currencySymbol)}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Liabilities & Debt Principal
          </span>
          <p className="text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-red-400">
            {formatCurrency(totalLiabilities, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
            {liabilities.length} active debt obligations tracked
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Estimated Net Worth
          </span>
          <p
            className={`text-2xl font-bold font-mono tabular-nums ${
              netWorth >= 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {formatCurrency(netWorth, currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Debt-to-Asset Ratio:{' '}
            <span className="font-mono tabular-nums font-semibold">
              {totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0}%
            </span>
          </p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
          <button
            type="button"
            onClick={() => setSubView('networth')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${
              subView === 'networth'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-500" />
            Net Worth & Asset Sheet
          </button>
          <button
            type="button"
            onClick={() => setSubView('debt')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 ${
              subView === 'debt'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Debt Payoff Planner (Snowball / Avalanche)
          </button>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400">
          {subView === 'networth'
            ? 'Manage non-cash assets alongside your liquid wallets and liabilities.'
            : 'Simulate accelerated debt elimination using Avalanche (APR) or Snowball (Balance) ordering.'}
        </span>
      </div>

      {subView === 'networth' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assets Column */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Portfolio Assets & Holdings
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Includes automatic liquid wallet balances plus manually tracked property, equity, and valuables.
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalAssets, currencySymbol)}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Liquid Wallets Summary Row */}
              <div className="py-3 flex items-center justify-between gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    Liquid Cash & Bank Wallets ({accounts.length} Accounts)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Automatically synchronized from your active Multi-Account Hub
                  </p>
                </div>
                <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(liquidAccountsTotal, currencySymbol)}
                </span>
              </div>

              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="py-3.5 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {asset.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{ASSET_CATEGORY_LABELS[asset.category]}</span>
                      {asset.notes && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{asset.notes}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Updated {asset.lastUpdated}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      {formatCurrency(asset.value, currencySymbol)}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirmAction({
                          title: `Delete asset "${asset.name}"?`,
                          message: 'This will remove the asset from your Net Worth calculation.',
                          confirmLabel: 'Delete Asset',
                          variant: 'danger',
                        });
                        if (ok) {
                          onDeleteAsset(asset.id);
                          showToast(`Removed asset "${asset.name}"`, 'info');
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Asset Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 h-fit">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Record New Asset
            </h3>
            <form onSubmit={handleCreateAsset} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Asset Name
                </label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g. Index Fund ETF, Apartment, Car"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Asset Class
                </label>
                <select
                  value={assetCategory}
                  onChange={(e) => setAssetCategory(e.target.value as AssetItem['category'])}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer"
                >
                  {Object.entries(ASSET_CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Valuation ({currencySymbol.trim()})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={assetValue}
                  onChange={(e) => setAssetValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Ticker (Optional)
                </label>
                <input
                  type="text"
                  value={assetNotes}
                  onChange={(e) => setAssetNotes(e.target.value)}
                  placeholder="e.g. S&P 500 Vanguard"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Asset to Balance Sheet
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Debt Payoff Strategist View */
        <div className="space-y-6">
          {/* Strategy Simulator Controls */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Accelerated Debt Payoff Simulator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Compare mathematical interest minimization (Avalanche) against quick psychological wins (Snowball).
                </p>
              </div>

              {/* Strategy Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStrategy('avalanche')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                    strategy === 'avalanche'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Debt Avalanche (Highest APR First)
                </button>
                <button
                  type="button"
                  onClick={() => setStrategy('snowball')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                    strategy === 'snowball'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  Debt Snowball (Lowest Balance First)
                </button>
              </div>
            </div>

            {/* Extra Payment Slider & Simulation Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              <div className="space-y-3 bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Extra Monthly Contribution
                  </label>
                  <span className="text-sm font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                    +{formatCurrency(extraPayment, currencySymbol)} / mo
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2500}
                  step={25}
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{currencySymbol}0</span>
                  <span>{currencySymbol}500</span>
                  <span>{currencySymbol}1,250</span>
                  <span>{currencySymbol}2,500</span>
                </div>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Projected Debt-Free Date
                  </span>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {activeSim.payoffDateLabel}
                  </p>
                  <span className="text-[11px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 block">
                    {activeSim.monthsToPayoff} months ({monthsSavedVsMinimum} mo faster)
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Total Cumulative Interest
                  </span>
                  <p className="text-base font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {formatCurrency(activeSim.totalInterestPaid, currencySymbol)}
                  </p>
                  <span className="text-[11px] text-slate-400 block">
                    Total Outflow: {formatCurrency(activeSim.totalPaid, currencySymbol)}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-1">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">
                    Interest Saved vs. Minimums
                  </span>
                  <p className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(interestSavedVsMinimum, currencySymbol)}
                  </p>
                  <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 block">
                    Using {strategy === 'avalanche' ? 'Avalanche' : 'Snowball'} Priority
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Priority Ordered Debt Queue */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Payoff Execution Queue ({strategy === 'avalanche' ? 'Highest APR First' : 'Smallest Balance First'})
                </h3>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  Min Monthly Total:{' '}
                  {formatCurrency(
                    liabilities.reduce((s, d) => s + d.minimumPayment, 0),
                    currencySymbol
                  )}
                </span>
              </div>

              {activeSim.orderedDebts.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Zero Active Liabilities Recorded
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Add a credit card, loan, or mortgage on the right to simulate payoff timelines.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSim.orderedDebts.map((debt, index) => (
                    <div
                      key={debt.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            0{index + 1}.
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {debt.name}
                          </h4>
                          {index === 0 && (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              · Active Focus Target
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{LIABILITY_CATEGORY_LABELS[debt.category]}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                            {debt.apr}% APR
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            Min: {formatCurrency(debt.minimumPayment, currencySymbol)}/mo
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Remaining Principal</span>
                          <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(debt.balance, currencySymbol)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const payAmt =
                              index === 0
                                ? Math.min(debt.balance, debt.minimumPayment + extraPayment)
                                : Math.min(debt.balance, debt.minimumPayment);
                            onRecordDebtPayment(debt, payAmt);
                            showToast(
                              `Logged ${formatCurrency(payAmt, currencySymbol)} payment toward ${debt.name}`
                            );
                          }}
                          title="Log monthly payment to Ledger and reduce principal"
                          className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Log Payment
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await confirmAction({
                              title: `Remove "${debt.name}"?`,
                              message: 'This obligation will be removed from your payoff schedule.',
                              confirmLabel: 'Remove Debt',
                              variant: 'danger',
                            });
                            if (ok) {
                              onDeleteLiability(debt.id);
                              showToast(`Removed "${debt.name}"`, 'info');
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Amortization Milestones Table */}
              {activeSim.schedule.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Amortization Trajectory Preview
                  </h4>
                  <div className="overflow-x-auto max-h-60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                          <th className="py-2 pr-4 font-semibold">Cycle</th>
                          <th className="py-2 px-4 font-semibold text-right">Principal Paid</th>
                          <th className="py-2 px-4 font-semibold text-right">Interest Cost</th>
                          <th className="py-2 pl-4 font-semibold text-right">Ending Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono tabular-nums">
                        {activeSim.schedule.slice(0, 12).map((row) => (
                          <tr key={row.monthIndex}>
                            <td className="py-2 pr-4 font-sans font-medium text-slate-700 dark:text-slate-300">
                              Month {row.monthIndex} ({row.label})
                            </td>
                            <td className="py-2 px-4 text-right text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(row.principalPaid, currencySymbol)}
                            </td>
                            <td className="py-2 px-4 text-right text-amber-600 dark:text-amber-400">
                              {formatCurrency(row.interestPaid, currencySymbol)}
                            </td>
                            <td className="py-2 pl-4 text-right font-bold text-slate-900 dark:text-white">
                              {formatCurrency(row.remainingBalance, currencySymbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Add Liability Form */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 h-fit">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Liability / Loan
              </h3>
              <form onSubmit={handleCreateLiability} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lender / Liability Name
                  </label>
                  <input
                    type="text"
                    required
                    value={debtName}
                    onChange={(e) => setDebtName(e.target.value)}
                    placeholder="e.g. Visa Platinum, Auto Loan"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Liability Type
                  </label>
                  <select
                    value={debtCategory}
                    onChange={(e) => setDebtCategory(e.target.value as LiabilityItem['category'])}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer"
                  >
                    {Object.entries(LIABILITY_CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Balance ({currencySymbol.trim()})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={debtBalance}
                    onChange={(e) => setDebtBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Interest Rate (APR %)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                      value={debtApr}
                      onChange={(e) => setDebtApr(e.target.value)}
                      placeholder="18.9"
                      className="w-full px-3 py-2.5 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Min. Payment ({currencySymbol.trim()})
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={debtMinPayment}
                      onChange={(e) => setDebtMinPayment(e.target.value)}
                      placeholder="75"
                      className="w-full px-3 py-2.5 text-xs font-mono tabular-nums rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add to Payoff Planner
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
