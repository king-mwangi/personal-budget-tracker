import React, { useState } from 'react';
import { Transaction } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Copy, 
  Check, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Printer, 
  BadgePercent, 
  ListOrdered,
  FileSpreadsheet,
  FileText,
  AlertCircle
} from 'lucide-react';

interface MonthlyReportsProps {
  transactions: Transaction[];
  currencySymbol: string;
}

export default function MonthlyReports({ transactions, currencySymbol }: MonthlyReportsProps) {
  // Extract all available months (YYYY-MM) from transactions
  const availableMonths = Array.from(
    new Set(
      transactions
        .filter(t => t.date)
        .map(t => t.date.substring(0, 7))
    )
  ).sort((a, b) => b.localeCompare(a)); // Sort newest first

  // Get current system month in YYYY-MM format as a fallback
  const currentSystemMonth = new Date().toISOString().substring(0, 7);
  
  // Default selected month
  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths.length > 0 ? availableMonths[0] : currentSystemMonth
  );

  const [copied, setCopied] = useState(false);

  // Filter transactions for the selected month
  const monthlyTransactions = transactions.filter(t => t.date?.startsWith(selectedMonth));

  // Math totals
  const incomeTransactions = monthlyTransactions.filter(t => t.type === 'income');
  const expenseTransactions = monthlyTransactions.filter(t => t.type === 'expense');

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Breakdown by categories for income
  const incomeCategoryMap: Record<string, number> = {};
  incomeTransactions.forEach(t => {
    incomeCategoryMap[t.category] = (incomeCategoryMap[t.category] || 0) + t.amount;
  });
  const incomeCategories = Object.entries(incomeCategoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // Breakdown by categories for expense
  const expenseCategoryMap: Record<string, number> = {};
  expenseTransactions.forEach(t => {
    expenseCategoryMap[t.category] = (expenseCategoryMap[t.category] || 0) + t.amount;
  });
  const expenseCategories = Object.entries(expenseCategoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // Format month name (e.g. "2026-05" -> "May 2026")
  const formatMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    if (!year || !month) return monthStr;
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const monthLabel = formatMonthName(selectedMonth);

  // --- Export Actions ---

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Description'];
    const rows = monthlyTransactions.map(t => [
      t.id,
      t.date,
      t.type,
      t.category,
      t.amount,
      `"${t.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Ledger_Transactions_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to formatted txt summary
  const handleExportTXT = () => {
    const txtReport = `==================================================
              LEDGER MONTHLY FINANCIAL SUMMARY
==================================================
Report Period:  ${monthLabel} (${selectedMonth})
Generated On:   ${new Date().toLocaleDateString()}
--------------------------------------------------

CORE PERFORMANCE METRICS:
  - Total Income:      ${currencySymbol}${totalIncome.toFixed(2)}
  - Total Expenses:    ${currencySymbol}${totalExpense.toFixed(2)}
  - Net Cash Savings:  ${currencySymbol}${netSavings.toFixed(2)}
  - Private Earn Rate: ${savingsRate.toFixed(1)}%

--------------------------------------------------
INCOME BREAKDOWN:
${incomeCategories.length === 0 ? '  No incomes logged for this month' : incomeCategories.map(c => `  * ${c.category.padEnd(16)}: ${currencySymbol}${c.amount.toFixed(2).padStart(9)} (${c.percentage.toFixed(1)}%)`).join('\n')}

--------------------------------------------------
EXPENSE BREAKDOWN:
${expenseCategories.length === 0 ? '  No expenses logged for this month' : expenseCategories.map(c => `  * ${c.category.padEnd(16)}: ${currencySymbol}${c.amount.toFixed(2).padStart(9)} (${c.percentage.toFixed(1)}%)`).join('\n')}

--------------------------------------------------
TRANSACTION ALMANAC (${monthlyTransactions.length} items):
${monthlyTransactions.length === 0 ? '  No ledger details' : monthlyTransactions.map(t => `  [${t.date}] ${t.type.toUpperCase().padEnd(7)} - ${t.category.padEnd(14)}: ${currencySymbol}${t.amount.toFixed(2).padStart(8)} | ${t.description}`).join('\n')}

==================================================
Created by Lincoln Mwangi © All Rights Reserved.
==================================================`;

    const blob = new Blob([txtReport], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Ledger_Financial_Summary_${selectedMonth}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Markdown to clipboard
  const handleCopyMarkdown = () => {
    const mdReport = `## Ledger Monthly Financial Report - ${monthLabel}

### Core Summary Metrics
| Metric | Amount |
| :--- | :--- |
| **Total Income** | ${currencySymbol}${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })} |
| **Total Expenses** | ${currencySymbol}${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })} |
| **Net Cash Flow** | **${currencySymbol}${netSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}** |
| **Savings Rate** | ${savingsRate.toFixed(1)}% |

### Category Expense Breakdown
${expenseCategories.length === 0 ? '_No expenses logged for this period_' : `
| Category | Total Outlay | Proportion |
| :--- | :--- | :--- |
${expenseCategories.map(c => `| ${c.category} | ${currencySymbol}${c.amount.toFixed(2)} | ${c.percentage.toFixed(1)}% |`).join('\n')}
`}

*Report prepared securely via Ledger Portfolio Corporate Client. Copyright © Lincoln Mwangi.*`;

    navigator.clipboard.writeText(mdReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header section with Select and actions */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="space-y-1 self-start md:self-auto">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">Monthly Performance Digests</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
            Generate and export aggregated audits of your monthly ledger distributions.
          </p>
        </div>

        {/* Dropdown controls inside elegant input frame */}
        <div className="flex items-center gap-3 w-full md:w-auto self-stretch md:self-auto shrink-0 font-sans">
          <div className="relative flex-1 md:flex-initial">
            <Calendar className="w-4 h-4 p-0 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
            <select
              id="report-month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full md:w-56 appearance-none border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 dark:text-slate-350 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
            >
              {availableMonths.length === 0 ? (
                <option value={currentSystemMonth}>{formatMonthName(currentSystemMonth)} (This Month)</option>
              ) : (
                availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthName(m)}</option>
                ))
              )}
            </select>
          </div>

          <button
            id="print-sys-report"
            onClick={() => window.print()}
            title="Surgical Paper Print out"
            className="p-2 border border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-105 rounded-xl transition-all cursor-pointer"
          >
            <Printer className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {monthlyTransactions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-2xl shadow-3xs text-center space-y-4 transition-colors">
          <div className="p-3 bg-slate-50 dark:bg-slate-950 inline-block rounded-full">
            <AlertCircle className="w-8 h-8 text-slate-450 dark:text-slate-500" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-gray-800 dark:text-slate-200">No transactions recorded for {monthLabel}</h3>
            <p className="text-[11px] text-gray-450 dark:text-slate-500 font-medium leading-relaxed">
              Amounts will be shown as {currencySymbol}0.00 since no ledger records exist matching this month. Go to the Transaction Ledger to insert entries!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left panel: Core numerical dashboard & breakdown categories */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Visual core balance cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Total Income Card */}
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-2.5 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">Reported Income</span>
                  <div className="p-1 px-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 text-[10px] font-bold">
                    <TrendingUp className="w-3.5 h-3.5" /> IN
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-2xl font-mono font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    {currencySymbol}{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">
                    From {incomeTransactions.length} secure deposits
                  </p>
                </div>
              </div>

              {/* Total Expense Card */}
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-2.5 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">Reported Outflow</span>
                  <div className="p-1 px-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center gap-0.5 text-[10px] font-bold">
                    <TrendingDown className="w-3.5 h-3.5" /> OUT
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-2xl font-mono font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    {currencySymbol}{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">
                    Over {expenseTransactions.length} bills & payments
                  </p>
                </div>
              </div>

              {/* Net Savings & rate */}
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-2.5 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">Net Savings Rate</span>
                  <div className={`p-1 px-1.5 rounded-lg text-[10px] font-bold flex items-center gap-0.5 ${
                    netSavings >= 0 
                      ? 'bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400' 
                      : 'bg-red-50 dark:bg-red-955/20 text-red-600 dark:text-red-400'
                  }`}>
                    <BadgePercent className="w-3.5 h-3.5" /> {savingsRate.toFixed(1)}%
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className={`text-2xl font-mono font-black tracking-tight ${
                    netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-red-550 dark:text-red-400'
                  }`}>
                    {netSavings < 0 ? '-' : ''}{currencySymbol}{Math.abs(netSavings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">
                    {netSavings >= 0 ? 'Positive net surplus' : 'Deficit spends offset'}
                  </p>
                </div>
              </div>

            </div>

            {/* Income vs Expense progress bar viz */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4 transition-colors">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wide">Inflow Distribution Weight</h3>
                <p className="text-[11px] text-gray-450 dark:text-slate-500 font-medium">Mathematical comparison of total capital in vs capital out.</p>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-red-100 dark:bg-red-950/30 h-4.5 rounded-full overflow-hidden flex">
                  {totalIncome > 0 && (
                    <div 
                      className="bg-emerald-500 dark:bg-emerald-605 h-full transition-all duration-300 relative group"
                      style={{ width: `${(totalIncome / (totalIncome + totalExpense)) * 100}%` }}
                      title={`Income represent ${((totalIncome / (totalIncome + totalExpense)) * 100).toFixed(1)}% of flow`}
                    />
                  )}
                  {totalExpense > 0 && (
                    <div 
                      className="bg-rose-500 dark:bg-rose-600 h-full transition-all duration-300 relative group"
                      style={{ width: `${(totalExpense / (totalIncome + totalExpense)) * 100}%` }}
                      title={`Expenses represent ${((totalExpense / (totalIncome + totalExpense)) * 100).toFixed(1)}% of flow`}
                    />
                  )}
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-gray-450 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-505 shrink-0" /> Income Proportion ({totalIncome > 0 ? ((totalIncome / (totalIncome + totalExpense)) * 100).toFixed(0) : 0}%)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-505 shrink-0" /> Expense Proportion ({totalExpense > 0 ? ((totalExpense / (totalIncome + totalExpense)) * 100).toFixed(0) : 0}%)</span>
                </div>
              </div>
            </div>

            {/* In-depth Category Allocations details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Income allocation category listings */}
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-3 transition-colors">
                <div className="border-b border-gray-50 dark:border-slate-800 pb-2 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    Income Components
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">{incomeCategories.length} Categories</span>
                </div>

                {incomeCategories.length === 0 ? (
                  <p className="text-[11px] text-gray-400 font-medium py-3 text-center">No income categories logged.</p>
                ) : (
                  <div className="space-y-3.5 pt-1.5">
                    {incomeCategories.map(c => (
                      <div key={c.category} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-700 dark:text-slate-300">{c.category}</span>
                          <span className="font-mono font-bold text-gray-900 dark:text-slate-150">
                            {currencySymbol}{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${c.percentage}%` }} />
                        </div>
                        <div className="text-[9px] font-mono text-gray-400 text-right">
                          {c.percentage.toFixed(1)}% of total income
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expense allocation category listings */}
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-3 transition-colors">
                <div className="border-b border-gray-50 dark:border-slate-800 pb-2 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4 text-rose-500" />
                    Expense Components
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">{expenseCategories.length} Categories</span>
                </div>

                {expenseCategories.length === 0 ? (
                  <p className="text-[11px] text-gray-400 font-medium py-3 text-center">No expense categories logged.</p>
                ) : (
                  <div className="space-y-3.5 pt-1.5">
                    {expenseCategories.map(c => (
                      <div key={c.category} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-700 dark:text-slate-300">{c.category}</span>
                          <span className="font-mono font-bold text-gray-900 dark:text-slate-150">
                            {currencySymbol}{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: `${c.percentage}%` }} />
                        </div>
                        <div className="text-[9px] font-mono text-gray-400 text-right">
                          {c.percentage.toFixed(1)}% of total outlay
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Right panel: Exporters & Copyable summary cards */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Export Summary Panel */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4 transition-colors">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wide">Export Utilities</h3>
                <p className="text-[11px] text-gray-450 dark:text-slate-500 font-medium">Download audit packets for tax records or physical archiving.</p>
              </div>

              <div className="space-y-3">
                {/* Export as CSV */}
                <button
                  id="btn-export-csv"
                  onClick={handleExportCSV}
                  className="w-full flex items-center justify-between p-3.5 border border-slate-150 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-750 bg-slate-50/20 dark:bg-slate-950 hover:bg-blue-50/15 dark:hover:bg-blue-955/10 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Table Ledger (.CSV)</p>
                      <p className="text-[10px] text-slate-400">Import directly to Excel / Sheets</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </button>

                {/* Export as TXT report */}
                <button
                  id="btn-export-txt"
                  onClick={handleExportTXT}
                  className="w-full flex items-center justify-between p-3.5 border border-slate-150 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-750 bg-slate-50/20 dark:bg-slate-950 hover:bg-emerald-50/15 dark:hover:bg-emerald-955/10 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Financial Abstract (.TXT)</p>
                      <p className="text-[10px] text-slate-400">Human readable text audit metrics</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </button>

                {/* Copy Markdown */}
                <button
                  id="btn-copy-md"
                  onClick={handleCopyMarkdown}
                  className="w-full flex items-center justify-between p-3.5 border border-slate-150 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-750 bg-slate-50/20 dark:bg-slate-950 hover:bg-purple-50/15 dark:hover:bg-purple-955/10 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-955/20 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                      {copied ? <Check className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4.5 h-4.5" />}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Copy Markdown Summary</p>
                      <p className="text-[10px] text-slate-400">Share or upload compiled layout code</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                    {copied ? 'Copied!' : 'Click'}
                  </span>
                </button>

              </div>
            </div>

            {/* Quick-look list card */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4.5 transition-colors">
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-slate-800 pb-2">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wide">Flow Catalog</h3>
                  <p className="text-[10px] text-gray-400">Ledger details for {monthLabel}</p>
                </div>
                <span className="py-0.5 px-2 bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold rounded-lg text-slate-600 dark:text-slate-300 text-right">
                  {monthlyTransactions.length} events
                </span>
              </div>

              <div className="space-y-3 max-h-76 overflow-y-auto pr-1">
                {monthlyTransactions.map((t) => (
                  <div key={t.id} className="flex justify-between items-center text-xs gap-3 py-1.5 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-750 dark:text-slate-200 truncate" title={t.description || t.category}>
                        {t.description || t.category}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400">{t.date} • {t.category}</p>
                    </div>
                    <span className={`font-mono font-bold shrink-0 text-right ${
                      t.type === 'income' ? 'text-emerald-555 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{currencySymbol}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Micro-attribution inside report module */}
            <div className="text-center text-[10px] text-slate-450 dark:text-slate-500 font-mono font-medium">
              Created by Lincoln Mwangi © All Rights Reserved.
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
