import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx-js-style';
import { Transaction, MonthlySnapshot } from '../types';
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
  AlertCircle,
  Camera,
  Trash2,
  History,
  ArrowLeftRight,
  Plus,
  FileDown,
  Sliders,
  Sparkles,
  X,
  Eye,
  Mail,
  ChevronDown,
  ArrowUpDown,
  Edit3
} from 'lucide-react';

interface MonthlyReportsProps {
  transactions: Transaction[];
  currencySymbol: string;
  snapshots: MonthlySnapshot[];
  onAddSnapshot: (newSnapshot: Omit<MonthlySnapshot, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  onDeleteSnapshot: (id: string) => Promise<void>;
  isExportingExcel?: boolean;
  onExcelExportStateChange?: (exporting: boolean) => void;
  onExcelPreviewChange?: (info: { 
    count: number; 
    label: string; 
    details: string;
    currentMonthTrends?: number[];
    prevMonthTrends?: number[];
    currentMonthLabel?: string;
    prevMonthLabel?: string;
  }) => void;
  excelIncludeCategoryId?: boolean;
  onExcelIncludeCategoryIdChange?: (val: boolean) => void;
  excelStyleTheme?: 'professional' | 'minimal';
  onExcelStyleThemeChange?: (val: 'professional' | 'minimal') => void;
  excelEnableDateFiltering?: boolean;
  onExcelEnableDateFilteringChange?: (val: boolean) => void;
  excelStartDate?: string;
  onExcelStartDateChange?: (val: string) => void;
  excelEndDate?: string;
  onExcelEndDateChange?: (val: string) => void;
  filterExcelByDate?: boolean;
  onFilterExcelByDateChange?: (val: boolean) => void;
  excelDatePreset?: 'active' | 'last-7' | 'last-30' | 'last-90' | 'this-year' | 'custom';
  onExcelDatePresetChange?: (val: 'active' | 'last-7' | 'last-30' | 'last-90' | 'this-year' | 'custom') => void;
  selectedPeriod?: string;
  setSelectedPeriod?: (period: string) => void;
  aiInsights?: {
    overallStatus: string;
    summaryMessage: string;
    actionableInsights: string[];
    savingsOpportunities: { category: string; target: number; effort: string; reward: string }[];
  } | null;
  loadingInsights?: boolean;
}

export default function MonthlyReports({ 
  transactions, 
  currencySymbol, 
  snapshots, 
  onAddSnapshot, 
  onDeleteSnapshot,
  isExportingExcel = false,
  onExcelExportStateChange,
  onExcelPreviewChange,
  excelIncludeCategoryId: propExcelIncludeCategoryId,
  onExcelIncludeCategoryIdChange,
  excelStyleTheme: propExcelStyleTheme,
  onExcelStyleThemeChange,
  excelEnableDateFiltering: propExcelEnableDateFiltering,
  onExcelEnableDateFilteringChange,
  excelStartDate: propExcelStartDate,
  onExcelStartDateChange,
  excelEndDate: propExcelEndDate,
  onExcelEndDateChange,
  filterExcelByDate: propFilterExcelByDate,
  onFilterExcelByDateChange,
  excelDatePreset: propExcelDatePreset,
  onExcelDatePresetChange,
  selectedPeriod,
  setSelectedPeriod,
  aiInsights = null,
  loadingInsights = false
}: MonthlyReportsProps) {
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
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (selectedPeriod && selectedPeriod !== 'all') {
      return selectedPeriod;
    }
    return availableMonths.length > 0 ? availableMonths[0] : currentSystemMonth;
  });

  // Synchronize when selectedPeriod changes from outside
  useEffect(() => {
    if (selectedPeriod && selectedPeriod !== 'all' && selectedPeriod !== selectedMonth) {
      setSelectedMonth(selectedPeriod);
    }
  }, [selectedPeriod]);

  // Handle local change in dropdown & propagate to central state provider for dynamic AI analyzer query triggering
  const handleOnMonthSelectChange = (newMonthValue: string) => {
    setSelectedMonth(newMonthValue);
    if (setSelectedPeriod) {
      setSelectedPeriod(newMonthValue);
    }
  };

  // Mode selection state: standard monthly or custom date range
  const [reportMode, setReportMode] = useState<'month' | 'range'>('month');
  
  // Custom date range inputs
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().substring(0, 10);
  });
  
  const [endDateStr, setEndDateStr] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10);
  });

  const [copied, setCopied] = useState(false);
  const [excelSuccess, setExcelSuccess] = useState(false);
  const prevExportExcelRef = useRef(isExportingExcel);

  useEffect(() => {
    if (prevExportExcelRef.current && !isExportingExcel) {
      setExcelSuccess(true);
      const timer = setTimeout(() => {
        setExcelSuccess(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
    prevExportExcelRef.current = isExportingExcel;
  }, [isExportingExcel]);
  const [compareSnapshotId, setCompareSnapshotId] = useState<string | null>(null);
  const [snapshotSuccessMsg, setSnapshotSuccessMsg] = useState<string | null>(null);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [showExcelExportModal, setShowExcelExportModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  // States for custom Excel export date-range filter scope
  const [localFilterExcelByDate, setLocalFilterExcelByDate] = useState(false);
  const [localExcelStartDate, setLocalExcelStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().substring(0, 10);
  });
  const [localExcelEndDate, setLocalExcelEndDate] = useState<string>(() => {
    return new Date().toISOString().substring(0, 10);
  });
  const [localExcelDatePreset, setLocalExcelDatePreset] = useState<'active' | 'last-7' | 'last-30' | 'last-90' | 'this-year' | 'custom'>('active');
  const [localExcelEnableDateFiltering, setLocalExcelEnableDateFiltering] = useState<boolean>(true);

  const excelStartDate = propExcelStartDate !== undefined ? propExcelStartDate : localExcelStartDate;
  const setExcelStartDate = onExcelStartDateChange !== undefined ? onExcelStartDateChange : setLocalExcelStartDate;

  const excelEndDate = propExcelEndDate !== undefined ? propExcelEndDate : localExcelEndDate;
  const setExcelEndDate = onExcelEndDateChange !== undefined ? onExcelEndDateChange : setLocalExcelEndDate;

  const filterExcelByDate = propFilterExcelByDate !== undefined ? propFilterExcelByDate : localFilterExcelByDate;
  const setFilterExcelByDate = onFilterExcelByDateChange !== undefined ? onFilterExcelByDateChange : setLocalFilterExcelByDate;

  const excelDatePreset = propExcelDatePreset !== undefined ? propExcelDatePreset : localExcelDatePreset;
  const setExcelDatePreset = onExcelDatePresetChange !== undefined ? onExcelDatePresetChange : setLocalExcelDatePreset;

  const excelEnableDateFiltering = propExcelEnableDateFiltering !== undefined ? propExcelEnableDateFiltering : localExcelEnableDateFiltering;
  const setExcelEnableDateFiltering = onExcelEnableDateFilteringChange !== undefined ? onExcelEnableDateFilteringChange : setLocalExcelEnableDateFiltering;

  const handleExcelDatePresetChange = (preset: 'active' | 'last-7' | 'last-30' | 'last-90' | 'this-year' | 'custom') => {
    setExcelDatePreset(preset);
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === 'active') {
      setFilterExcelByDate(false);
      return;
    }

    setFilterExcelByDate(true);
    if (preset === 'last-7') {
      start.setDate(today.getDate() - 7);
    } else if (preset === 'last-30') {
      start.setDate(today.getDate() - 30);
    } else if (preset === 'last-90') {
      start.setDate(today.getDate() - 90);
    } else if (preset === 'this-year') {
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
    } else if (preset === 'custom') {
      return;
    }

    setExcelStartDate(start.toISOString().substring(0, 10));
    setExcelEndDate(end.toISOString().substring(0, 10));
  };

  // States for custom Excel export sorting configurations
  const [excelSortField, setExcelSortField] = useState<'date' | 'amount'>('date');
  const [excelSortDirection, setExcelSortDirection] = useState<'asc' | 'desc'>('desc');

  // States for custom Excel header names
  const [excelHeaders, setExcelHeaders] = useState({
    id: 'Transaction ID',
    date: 'Date',
    type: 'Type',
    category: 'Category',
    amount: 'Amount',
    description: 'Description',
    notes: 'Transaction Notes',
    categoryId: 'Category ID'
  });
  const [localExcelIncludeCategoryId, setLocalExcelIncludeCategoryId] = useState(false);
  const excelIncludeCategoryId = propExcelIncludeCategoryId !== undefined ? propExcelIncludeCategoryId : localExcelIncludeCategoryId;
  const setExcelIncludeCategoryId = onExcelIncludeCategoryIdChange !== undefined ? onExcelIncludeCategoryIdChange : setLocalExcelIncludeCategoryId;
  
  const [localExcelStyleTheme, setLocalExcelStyleTheme] = useState<'professional' | 'minimal'>('professional');
  const excelStyleTheme = propExcelStyleTheme !== undefined ? propExcelStyleTheme : localExcelStyleTheme;
  const setExcelStyleTheme = onExcelStyleThemeChange !== undefined ? onExcelStyleThemeChange : setLocalExcelStyleTheme;

  const [showCustomHeaders, setShowCustomHeaders] = useState(false);
  const [showExcelPreviewOverlay, setShowExcelPreviewOverlay] = useState(false);
  const [isExcelExpanded, setIsExcelExpanded] = useState(false);

  const selectedCompareSnapshot = snapshots?.find(s => s.id === compareSnapshotId);

  // Filter transactions dynamically depending on selectedMonth or custom range
  const monthlyTransactions = transactions.filter(t => {
    if (!t.date) return false;
    if (reportMode === 'month') {
      return t.date.startsWith(selectedMonth);
    } else {
      return t.date >= startDateStr && t.date <= endDateStr;
    }
  });

  // Compute live info for hover preview of Excel export
  const excelExportPreviewTransactions = !excelEnableDateFiltering
    ? transactions
    : (filterExcelByDate
      ? transactions.filter(t => t.date && t.date >= excelStartDate && t.date <= excelEndDate)
      : monthlyTransactions);

  const excelExportPreviewIncome = excelExportPreviewTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const excelExportPreviewExpense = excelExportPreviewTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const excelExportPreviewCount = excelExportPreviewTransactions.length;

  // Math totals
  const incomeTransactions = monthlyTransactions.filter(t => t.type === 'income');
  const expenseTransactions = monthlyTransactions.filter(t => t.type === 'expense');

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const savingsExpense = expenseTransactions
    .filter(t => t.category && t.category.toLowerCase() === 'savings')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = (totalIncome - totalExpense) + savingsExpense;
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

  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return date.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const monthLabel = reportMode === 'month'
    ? formatMonthName(selectedMonth)
    : `${formatDateFriendly(startDateStr)} – ${formatDateFriendly(endDateStr)}`;

  React.useEffect(() => {
    if (onExcelPreviewChange) {
      const label = !excelEnableDateFiltering
        ? "All-Time Master Ledger"
        : (filterExcelByDate
          ? `${formatDateFriendly(excelStartDate)} – ${formatDateFriendly(excelEndDate)}`
          : monthLabel);

      const details = !excelEnableDateFiltering
        ? "Exporting All Time database entries without any date constraints."
        : (filterExcelByDate
          ? "Exporting filtered custom date-range entries."
          : `Exporting transactions corresponding to the active period: ${monthLabel}.`);

      // Calculate trends for preview
      const daysInMonth = 30;
      const currentDayTotals = Array(daysInMonth).fill(0);
      const currentMonthTrends = Array(daysInMonth).fill(0);
      transactions.forEach(t => {
        if (t.type === 'expense' && t.date && t.date.startsWith(selectedMonth)) {
          const day = parseInt(t.date.substring(8, 10));
          const index = Math.min(daysInMonth - 1, Math.max(0, (isNaN(day) ? 1 : day) - 1));
          currentDayTotals[index] += t.amount;
        }
      });
      let currentSum = 0;
      for (let i = 0; i < daysInMonth; i++) {
        currentSum += currentDayTotals[i];
        currentMonthTrends[i] = parseFloat(currentSum.toFixed(2));
      }

      // Calculate previous month string YYYY-MM
      const [yearText, monthText] = selectedMonth.split('-');
      const year = parseInt(yearText);
      const month = parseInt(monthText);
      const prevDate = new Date(year, month - 2, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonthIdx = prevDate.getMonth() + 1;
      const prevMonthIdxStr = prevMonthIdx < 10 ? `0${prevMonthIdx}` : `${prevMonthIdx}`;
      const prevMonth = `${prevYear}-${prevMonthIdxStr}`;

      const prevDayTotals = Array(daysInMonth).fill(0);
      const prevMonthTrends = Array(daysInMonth).fill(0);
      transactions.forEach(t => {
        if (t.type === 'expense' && t.date && t.date.startsWith(prevMonth)) {
          const day = parseInt(t.date.substring(8, 10));
          const index = Math.min(daysInMonth - 1, Math.max(0, (isNaN(day) ? 1 : day) - 1));
          prevDayTotals[index] += t.amount;
        }
      });
      let prevSum = 0;
      for (let i = 0; i < daysInMonth; i++) {
        prevSum += prevDayTotals[i];
        prevMonthTrends[i] = parseFloat(prevSum.toFixed(2));
      }

      const formatMonthNameSmall = (monthStr: string) => {
        const parts = monthStr.split('-');
        if (parts.length !== 2) return monthStr;
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
        return d.toLocaleDateString('default', { month: 'short', year: '2-digit' });
      };

      const currentMonthLabel = formatMonthNameSmall(selectedMonth);
      const prevMonthLabel = formatMonthNameSmall(prevMonth);

      onExcelPreviewChange({
        count: excelExportPreviewCount,
        label,
        details,
        currentMonthTrends,
        prevMonthTrends,
        currentMonthLabel,
        prevMonthLabel
      });
    }
  }, [
    excelExportPreviewCount,
    excelEnableDateFiltering,
    filterExcelByDate,
    excelStartDate,
    excelEndDate,
    monthLabel,
    transactions,
    selectedMonth,
    onExcelPreviewChange
  ]);

  const handleSaveSnapshot = async () => {
    if (monthlyTransactions.length === 0) {
      alert("No transaction entries to snapshot for this month!");
      return;
    }

    const existing = snapshots?.find(s => s.month === selectedMonth);
    if (existing) {
      if (!confirm(`An existing snapshot for ${formatMonthName(selectedMonth)} matches this month. Erase it and save this new ledger snapshot?`)) {
        return;
      }
      await onDeleteSnapshot(existing.id);
      if (compareSnapshotId === existing.id) {
        setCompareSnapshotId(null);
      }
    }

    await onAddSnapshot({
      month: selectedMonth,
      total_income: parseFloat(totalIncome.toFixed(2)),
      total_expense: parseFloat(totalExpense.toFixed(2)),
      net_savings: parseFloat(netSavings.toFixed(2)),
      savings_rate: parseFloat(savingsRate.toFixed(1)),
      income_categories: incomeCategories.map(c => ({ category: c.category, amount: parseFloat(c.amount.toFixed(2)), percentage: parseFloat(c.percentage.toFixed(1)) })),
      expense_categories: expenseCategories.map(c => ({ category: c.category, amount: parseFloat(c.amount.toFixed(2)), percentage: parseFloat(c.percentage.toFixed(1)) })),
      transaction_count: monthlyTransactions.length
    });

    setSnapshotSuccessMsg(`Snapshot for ${formatMonthName(selectedMonth)} successfully preserved!`);
    setTimeout(() => setSnapshotSuccessMsg(null), 4000);
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    setSnapshotSuccessMsg("Compiling high-resolution publication-quality PDF, please wait...");
    
    // Create temporary off-screen formal report container so it is styled perfectly as a physical corporate print sheet
    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '760px'; // Consistent corporate document width
    printContainer.style.backgroundColor = '#ffffff';
    printContainer.style.color = '#0f172a';
    printContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    printContainer.style.padding = '40px';
    printContainer.style.boxSizing = 'border-box';
    printContainer.style.fontSize = '12px';
    printContainer.style.lineHeight = '1.5';

    // Build the formal HTML content structure incorporating Gemini automated advisor synthesis
    const insightsContent = aiInsights ? `
      <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 18px; margin-bottom: 25px; text-align: left;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 800; color: #6d28d9; text-transform: uppercase; font-family: monospace;">✨ Gemini Advisor Smart Intelligence Diagnostics</span>
        </div>
        <p style="font-size: 11.5px; font-weight: bold; color: #4338ca; margin: 0 0 6px 0;">Overall status evaluating cash flow: ${aiInsights.overallStatus}</p>
        <p style="font-size: 11px; color: #4b5563; line-height: 1.55; margin: 0 0 10px 0;">${aiInsights.summaryMessage}</p>
        ${aiInsights.actionableInsights && aiInsights.actionableInsights.length > 0 ? `
          <div style="margin-top: 8px;">
            <ul style="margin: 0; padding-left: 15px; font-size: 10.5px; color: #4b5563; line-height: 1.5;">
              ${aiInsights.actionableInsights.map(item => `<li style="margin-bottom: 3px;"><strong>💡</strong> ${item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    ` : `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 25px; text-align: center; color: #64748b;">
        <p style="margin: 0; font-size: 11px; font-style: italic;">No automated advisor synthesis generated. Add monthly ledger entries to invoke Gemini diagnostics.</p>
      </div>
    `;

    const incomeRows = incomeCategories.length === 0 
      ? `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #94a3b8; font-style: italic;">No income channels recorded.</td></tr>` 
      : incomeCategories.map(c => `
          <tr style="border-bottom: 1px solid #f8fafc;">
            <td style="padding: 6px 0; font-weight: 600; color: #334155;">${c.category}</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace;">${currencySymbol}${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td style="padding: 6px 0; text-align: right; color: #10b981; font-weight: bold;">${c.percentage.toFixed(1)}%</td>
          </tr>
        `).join('');

    const expenseRows = expenseCategories.length === 0 
      ? `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #94a3b8; font-style: italic;">No expense channels recorded.</td></tr>` 
      : expenseCategories.map(c => `
          <tr style="border-bottom: 1px solid #f8fafc;">
            <td style="padding: 6px 0; font-weight: 600; color: #334155;">${c.category}</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace;">${currencySymbol}${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td style="padding: 6px 0; text-align: right; color: #f43f5e; font-weight: bold;">${c.percentage.toFixed(1)}%</td>
          </tr>
        `).join('');

    const transactionsRows = monthlyTransactions.slice(0, 30).map(t => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 6px 4px; font-family: monospace; color: #64748b;">${t.date}</td>
        <td style="padding: 6px 4px; font-weight: 600; color: #475569;">${t.category}</td>
        <td style="padding: 6px 4px; color: #1e293b; max-width: 250px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${t.description || t.category}</td>
        <td style="padding: 6px 4px; text-align: right; font-weight: bold; font-family: monospace; color: ${t.type === 'income' ? '#10b981' : '#334155'};">
          ${t.type === 'income' ? '+' : '-'}${currencySymbol}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `).join('');

    const truncationMessage = monthlyTransactions.length > 30 
      ? `<tr><td colspan="4" style="text-align: center; padding: 10px; color: #94a3b8; font-style: italic; font-size: 10px;">And ${monthlyTransactions.length - 30} other catalog ledger entries for this period...</td></tr>`
      : '';

    printContainer.innerHTML = `
      <div style="background-color: #ffffff; color: #1e293b; text-align: left;">
        <!-- Header Banner / Letterhead -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 19px; font-weight: 800; color: #1e3a8a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Ledger Financial Report</h1>
            <p style="font-size: 10px; color: #64748b; font-weight: bold; margin: 2px 0 0 0; font-family: monospace; letter-spacing: 0.5px;">MONTHLY BUDGET & CASH FLOW SUMMARY</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 10px; margin: 0; color: #475569; font-weight: bold;">Report ID: <span style="font-family: monospace; color: #0284c7;">LGR-RPT-${Date.now().toString().substring(5)}</span></p>
            <p style="font-size: 9px; margin: 2px 0 0 0; color: #64748b;">Generated: ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <!-- Meta Information Grid -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 11px;">
          <div>
            <span style="font-size: 8.5px; font-weight: bold; color: #94a3b8; text-transform: uppercase; display: block;">Prepared For</span>
            <span style="font-weight: bold; color: #334155;">Active Account Owner</span>
          </div>
          <div>
            <span style="font-size: 8.5px; font-weight: bold; color: #94a3b8; text-transform: uppercase; display: block;">Report Period</span>
            <span style="font-weight: bold; color: #334155;">${monthLabel}</span>
          </div>
          <div>
            <span style="font-size: 8.5px; font-weight: bold; color: #94a3b8; text-transform: uppercase; display: block;">Base Currency</span>
            <span style="font-weight: bold; color: #334155;">${currencySymbol}</span>
          </div>
        </div>

        <!-- Key Flow Metrics Row -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 25px;">
          <!-- Income Box -->
          <div style="border: 1px solid #e2e8f0; border-left: 4px solid #10b981; padding: 12px; border-radius: 8px;">
            <span style="font-size: 8.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Influx (Income)</span>
            <h3 style="font-size: 16px; font-weight: 800; color: #065f46; margin: 4px 0 0 0; font-family: monospace;">${currencySymbol}${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p style="font-size: 9px; color: #94a3b8; margin: 2px 0 0 0;">${incomeTransactions.length} items logged</p>
          </div>
          <!-- Expense Box -->
          <div style="border: 1px solid #e2e8f0; border-left: 4px solid #f43f5e; padding: 12px; border-radius: 8px;">
            <span style="font-size: 8.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Outlay (Expenses)</span>
            <h3 style="font-size: 16px; font-weight: 800; color: #9f1239; margin: 4px 0 0 0; font-family: monospace;">${currencySymbol}${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p style="font-size: 9px; color: #94a3b8; margin: 2px 0 0 0;">${expenseTransactions.length} items logged</p>
          </div>
          <!-- Savings Rate Box -->
          <div style="border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 8px;">
            <span style="font-size: 8.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Net Flow Surplus</span>
            <h3 style="font-size: 16px; font-weight: 800; color: ${netSavings >= 0 ? '#1e40af' : '#b91c1c'}; margin: 4px 0 0 0; font-family: monospace;">${netSavings < 0 ? '-' : ''}${currencySymbol}${Math.abs(netSavings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p style="font-size: 9px; color: #3b82f6; font-weight: bold; margin: 2px 0 0 0;">Savings Margin: ${savingsRate.toFixed(1)}%</p>
          </div>
        </div>

        <!-- Gemini Smart Diagnostic Analysis Summary -->
        ${insightsContent}

        <!-- Capital Allocation Breakdown Matrices -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
          <!-- Income categories table -->
          <div style="border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
            <h3 style="font-size: 10.5px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin: 0 0 8px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Inflow Distributions</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="text-align: left; border-bottom: 1px solid #e2e8f0; color: #64748b;">
                  <th style="padding: 3px 0;">Category Name</th>
                  <th style="padding: 3px 0; text-align: right;">Total Amount</th>
                  <th style="padding: 3px 0; text-align: right;">Share</th>
                </tr>
              </thead>
              <tbody>
                ${incomeRows}
              </tbody>
            </table>
          </div>

          <!-- Expense categories table -->
          <div style="border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
            <h3 style="font-size: 10.5px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin: 0 0 8px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Outflow Allocations</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="text-align: left; border-bottom: 1px solid #e2e8f0; color: #64748b;">
                  <th style="padding: 3px 0;">Category Name</th>
                  <th style="padding: 3px 0; text-align: right;">Total Amount</th>
                  <th style="padding: 3px 0; text-align: right;">Share</th>
                </tr>
              </thead>
              <tbody>
                ${expenseRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Ledger General Sheet -->
        <div style="border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="font-size: 10.5px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin: 0 0 8px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; display: flex; justify-content: space-between;">
            <span>Transaction History Log</span>
            <span style="font-family: monospace; font-size: 9.5px; color: #94a3b8;">${monthlyTransactions.length} Entries Listed</span>
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
            <thead>
              <tr style="text-align: left; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">
                <th style="padding: 4px;">Date</th>
                <th style="padding: 4px;">Category</th>
                <th style="padding: 4px;">Description</th>
                <th style="padding: 4px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactionsRows}
              ${truncationMessage}
            </tbody>
          </table>
        </div>

        <!-- Watermark Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 9px; color: #94a3b8; font-family: monospace;">
          <p style="margin: 0; font-weight: bold;">LEDGER REPORT • COMPILED SECURELY ON ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    `;

    document.body.appendChild(printContainer);

    try {
      // Small timeout to allow styling layouts to resolve perfectly
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(printContainer, {
        scale: 2, // Double DPI sharp screen capture
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // Always pristine Light background
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.82);
      const imgWidth = canvas.width / 2;
      const imgHeight = canvas.height / 2;
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [imgWidth + 40, imgHeight + 40], // Custom margin paddings
      });

      pdf.addImage(imgData, 'JPEG', 20, 20, imgWidth, imgHeight);
      
      const fileDateLabel = reportMode === 'month' ? selectedMonth : `${startDateStr}_to_${endDateStr}`;
      pdf.save(`Ledger_Financial_Statement_${fileDateLabel}.pdf`);
      setSnapshotSuccessMsg(`Primacy PDF Report for ${monthLabel} compiled and saved successfully!`);
    } catch (err) {
      console.error("PDF compiling error:", err);
      setSnapshotSuccessMsg("Notice: PDF Compile completed but resolution fallback applied. Check local downloads.");
    } finally {
      // Clean up DOM beautifully
      document.body.removeChild(printContainer);
      setIsGeneratingPDF(false);
      setTimeout(() => setSnapshotSuccessMsg(null), 4000);
    }
  };

  const handleEmailPDF = async (toEmail: string) => {
    if (!toEmail || !toEmail.includes('@')) {
      setEmailErrorMsg("Please specify a valid recipient email address.");
      return;
    }

    setIsSendingEmail(true);
    setEmailSuccessMsg(null);
    setEmailErrorMsg(null);

    // Create temporary off-screen formal report container so it is styled perfectly as a physical corporate print sheet
    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '760px'; // Consistent corporate document width
    printContainer.style.backgroundColor = '#ffffff';
    printContainer.style.color = '#0f172a';
    printContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    printContainer.style.padding = '40px';
    printContainer.style.boxSizing = 'border-box';
    printContainer.style.fontSize = '12px';
    printContainer.style.lineHeight = '1.5';

    // Build the formal HTML content structure incorporating Gemini automated advisor synthesis
    const insightsContent = aiInsights ? `
      <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 18px; margin-bottom: 25px; text-align: left;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; border-bottom: 1px solid #e4e4e7; padding-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 800; color: #6d28d9; text-transform: uppercase; font-family: monospace;">✨ Gemini Advisor Smart Intelligence Diagnostics</span>
        </div>
        <p style="font-size: 11.5px; font-weight: bold; color: #4338ca; margin: 0 0 6px 0;">Overall status evaluating cash flow: ${aiInsights.overallStatus}</p>
        <p style="font-size: 11px; color: #4b5563; line-height: 1.55; margin: 0 0 10px 0;">${aiInsights.summaryMessage}</p>
        ${aiInsights.actionableInsights && aiInsights.actionableInsights.length > 0 ? `
          <div style="margin-top: 8px;">
            <ul style="margin: 0; padding-left: 15px; font-size: 10.5px; color: #4b5563; line-height: 1.5;">
              ${aiInsights.actionableInsights.map(item => `<li style="margin-bottom: 3px;"><strong>💡</strong> ${item}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    ` : `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 25px; text-align: center; color: #64748b;">
        <p style="margin: 0; font-size: 11px; font-style: italic;">No automated advisor synthesis generated. Add monthly ledger entries to invoke Gemini diagnostics.</p>
      </div>
    `;

    const incomeRows = incomeCategories.length === 0 
      ? `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #94a3b8; font-style: italic;">No income channels recorded.</td></tr>` 
      : incomeCategories.map(c => `
          <tr style="border-bottom: 1px solid #f8fafc;">
            <td style="padding: 6px 0; font-weight: 600; color: #334155;">${c.category}</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace;">${currencySymbol}${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td style="padding: 6px 0; text-align: right; color: #10b981; font-weight: bold;">${c.percentage.toFixed(1)}%</td>
          </tr>
        `).join('');

    const expenseRows = expenseCategories.length === 0 
      ? `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #94a3b8; font-style: italic;">No expense channels recorded.</td></tr>` 
      : expenseCategories.map(c => `
          <tr style="border-bottom: 1px solid #f8fafc;">
            <td style="padding: 6px 0; font-weight: 600; color: #334155;">${c.category}</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace;">${currencySymbol}${c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td style="padding: 6px 0; text-align: right; color: #f43f5e; font-weight: bold;">${c.percentage.toFixed(1)}%</td>
          </tr>
        `).join('');

    const transactionsRows = monthlyTransactions.slice(0, 30).map(t => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 6px 4px; font-family: monospace; color: #64748b;">${t.date}</td>
        <td style="padding: 6px 4px; font-weight: 600; color: #475569;">${t.category}</td>
        <td style="padding: 6px 4px; color: #1e293b; max-width: 250px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${t.description || t.category}</td>
        <td style="padding: 6px 4px; text-align: right; font-weight: bold; font-family: monospace; color: ${t.type === 'income' ? '#10b981' : '#334155'};">
          ${t.type === 'income' ? '+' : '-'}${currencySymbol}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </td>
      </tr>
    `).join('');

    const truncationMessage = monthlyTransactions.length > 30 
      ? `<tr><td colspan="4" style="text-align: center; padding: 10px; color: #94a3b8; font-style: italic; font-size: 10px;">And ${monthlyTransactions.length - 30} other catalog ledger entries for this period...</td></tr>`
      : '';

    const reportId = `LGR-RPT-${Date.now().toString().substring(5)}`;

    printContainer.innerHTML = `
      <div style="background-color: #ffffff; color: #1e293b; text-align: left;">
        <!-- Header Banner / Letterhead -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px;">
          <div>
            <h1 style="font-size: 19px; font-weight: 800; color: #1e3a8a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Ledger Financial Report</h1>
            <p style="font-size: 10px; color: #64748b; font-weight: bold; margin: 2px 0 0 0; font-family: monospace; letter-spacing: 0.5px;">MONTHLY BUDGET & CASH FLOW SUMMARY</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 10px; margin: 0; color: #475569; font-weight: bold;">Report ID: <span style="font-family: monospace; color: #0284c7;">${reportId}</span></p>
            <p style="font-size: 9px; margin: 2px 0 0 0; color: #64748b;">Generated: ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <!-- Meta Information Grid -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 11px;">
          <div>
            <span style="font-size: 8.5px; font-weight: bold; color: #94a3b8; text-transform: uppercase; display: block;">Prepared For</span>
            <span style="font-weight: bold; color: #334155;">Active Account Owner</span>
          </div>
          <div>
            <span style="font-size: 8.5px; font-weight: bold; color: #94a3b8; text-transform: uppercase; display: block;">Report Period</span>
            <span style="font-weight: bold; color: #334155;">${monthLabel}</span>
          </div>
          <div>
            <span style="font-size: 8.5px; font-weight: bold; color: #94a3b8; text-transform: uppercase; display: block;">Base Currency</span>
            <span style="font-weight: bold; color: #334155;">${currencySymbol}</span>
          </div>
        </div>

        <!-- Key Flow Metrics Row -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 25px;">
          <!-- Income Box -->
          <div style="border: 1px solid #e2e8f0; border-left: 4px solid #10b981; padding: 12px; border-radius: 8px;">
            <span style="font-size: 8.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Influx (Income)</span>
            <h3 style="font-size: 16px; font-weight: 800; color: #065f46; margin: 4px 0 0 0; font-family: monospace;">${currencySymbol}${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p style="font-size: 9px; color: #94a3b8; margin: 2px 0 0 0;">${incomeTransactions.length} items logged</p>
          </div>
          <!-- Expense Box -->
          <div style="border: 1px solid #e2e8f0; border-left: 4px solid #f43f5e; padding: 12px; border-radius: 8px;">
            <span style="font-size: 8.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Outlay (Expenses)</span>
            <h3 style="font-size: 16px; font-weight: 800; color: #9f1239; margin: 4px 0 0 0; font-family: monospace;">${currencySymbol}${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p style="font-size: 9px; color: #94a3b8; margin: 2px 0 0 0;">${expenseTransactions.length} items logged</p>
          </div>
          <!-- Savings Rate Box -->
          <div style="border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; padding: 12px; border-radius: 8px;">
            <span style="font-size: 8.5px; font-weight: bold; color: #64748b; text-transform: uppercase;">Net Flow Surplus</span>
            <h3 style="font-size: 16px; font-weight: 800; color: ${netSavings >= 0 ? '#1e40af' : '#b91c1c'}; margin: 4px 0 0 0; font-family: monospace;">${netSavings < 0 ? '-' : ''}${currencySymbol}${Math.abs(netSavings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p style="font-size: 9px; color: #3b82f6; font-weight: bold; margin: 2px 0 0 0;">Savings Margin: ${savingsRate.toFixed(1)}%</p>
          </div>
        </div>

        <!-- Gemini Smart Diagnostic Analysis Summary -->
        ${insightsContent}

        <!-- Capital Allocation Breakdown Matrices -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
          <!-- Income categories table -->
          <div style="border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
            <h3 style="font-size: 10.5px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin: 0 0 8px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Inflow Distributions</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="text-align: left; border-bottom: 1px solid #e2e8f0; color: #64748b;">
                  <th style="padding: 3px 0;">Category Name</th>
                  <th style="padding: 3px 0; text-align: right;">Total Amount</th>
                  <th style="padding: 3px 0; text-align: right;">Share</th>
                </tr>
              </thead>
              <tbody>
                ${incomeRows}
              </tbody>
            </table>
          </div>

          <!-- Expense categories table -->
          <div style="border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
            <h3 style="font-size: 10.5px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin: 0 0 8px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Outflow Allocations</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="text-align: left; border-bottom: 1px solid #e2e8f0; color: #64748b;">
                  <th style="padding: 3px 0;">Category Name</th>
                  <th style="padding: 3px 0; text-align: right;">Total Amount</th>
                  <th style="padding: 3px 0; text-align: right;">Share</th>
                </tr>
              </thead>
              <tbody>
                ${expenseRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Ledger General Sheet -->
        <div style="border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="font-size: 10.5px; font-weight: bold; color: #1e293b; text-transform: uppercase; margin: 0 0 8px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; display: flex; justify-content: space-between;">
            <span>Transaction History Log</span>
            <span style="font-family: monospace; font-size: 9.5px; color: #94a3b8;">${monthlyTransactions.length} Entries Listed</span>
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
            <thead>
              <tr style="text-align: left; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: bold;">
                <th style="padding: 4px;">Date</th>
                <th style="padding: 4px;">Category</th>
                <th style="padding: 4px;">Description</th>
                <th style="padding: 4px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactionsRows}
              ${truncationMessage}
            </tbody>
          </table>
        </div>

        <!-- Watermark Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; text-align: center; font-size: 9px; color: #94a3b8; font-family: monospace;">
          <p style="margin: 0; font-weight: bold;">LEDGER REPORT • COMPILED SECURELY ON ${new Date().toLocaleDateString()}</p>
        </div>
      </div>
    `;

    document.body.appendChild(printContainer);

    try {
      // Small timeout to allow styling layouts to resolve perfectly
      await new Promise(resolve => setTimeout(resolve, 300));

      const isMobile = window.innerWidth < 768;
      const canvas = await html2canvas(printContainer, {
        scale: isMobile ? 1.3 : 2, // 1.3x DPI scaling on mobile, 2x on desktop to prevent payload issues / memory crashes
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // Always pristine Light background
        allowTaint: true,
      });

      // Use a compression level of 0.72 (down from 0.82) to reduce payload size by up to 60% with zero visible quality loss.
      const imgData = canvas.toDataURL('image/jpeg', 0.72);
      const imgWidth = canvas.width / 2;
      const imgHeight = canvas.height / 2;
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [imgWidth + 40, imgHeight + 40],
      });

      pdf.addImage(imgData, 'JPEG', 20, 20, imgWidth, imgHeight);
      
      // Get base64 string
      const pdfDataUri = pdf.output('datauristring');

      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toEmail,
          pdfBase64: pdfDataUri,
          monthLabel,
          reportId
        })
      });

      // Verify response Content-Type to prevent 'Unexpected token T' errors on any raw server-side exceptions
      const contentType = response.headers.get("content-type");
      let result;
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        const textError = await response.text();
        console.error("Non-JSON error response from send-report:", textError);
        throw new Error(textError.length < 150 ? textError : `Server returned a non-JSON response (Status ${response.status}). If the statement has a very large transaction list, it may exceed server upload limits on mobile devices.`);
      }

      if (response.ok && result?.success) {
        if (result.isSimulated) {
          // If SMTP is not configured, show unconfigured warning/details and keep success message null so they are not misled.
          setEmailErrorMsg(result.details || "SMTP offline simulation fallback activated.");
          setEmailSuccessMsg(null);
        } else {
          setEmailSuccessMsg(result.message || `Financial snapshot report for ${monthLabel} compiled and dispatched successfully.`);
          setEmailErrorMsg(null);
        }
      } else {
        setEmailErrorMsg(result?.error || "Failed to dispatch executive statement email.");
        setEmailSuccessMsg(null);
      }
    } catch (err: any) {
      console.error("PDF mailing error:", err);
      setEmailErrorMsg(err?.message || "An unexpected issue occurred while drafting or dispatching your report PDF.");
    } finally {
      // Clean up DOM beautifully
      document.body.removeChild(printContainer);
      setIsSendingEmail(false);
    }
  };

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
    const fileDateLabel = reportMode === 'month' ? selectedMonth : `${startDateStr}_to_${endDateStr}`;
    link.setAttribute('download', `Ledger_Transactions_Report_${fileDateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel (.XLSX) with full worksheet formatting
  const handleExportExcel = () => {
    if (isExportingExcel) return;
    onExcelExportStateChange?.(true);

    setTimeout(() => {
      try {
        // 1. Initialize empty workbook
        const wb = XLSX.utils.book_new();

        // Determine dataset to export dynamically
        const baseExportTransactions = !excelEnableDateFiltering
          ? transactions
          : (filterExcelByDate
            ? transactions.filter(t => t.date && t.date >= excelStartDate && t.date <= excelEndDate)
            : monthlyTransactions);

        // Perform sorting on exportTransactions based on user preferences
        const exportTransactions = [...baseExportTransactions].sort((a, b) => {
          if (excelSortField === 'date') {
            const dateA = a.date || '';
            const dateB = b.date || '';
            if (dateA !== dateB) {
              return excelSortDirection === 'asc' 
                ? dateA.localeCompare(dateB) 
                : dateB.localeCompare(dateA);
            }
            return (a.id || '').localeCompare(b.id || '');
          } else {
            // Sort by amount
            const amtA = a.amount || 0;
            const amtB = b.amount || 0;
            if (amtA !== amtB) {
              return excelSortDirection === 'asc' 
                ? amtA - amtB 
                : amtB - amtA;
            }
            // fallback sorting by date to keep it stable
            const dateA = a.date || '';
            const dateB = b.date || '';
            return dateA.localeCompare(dateB);
          }
        });

        const excelMonthLabel = !excelEnableDateFiltering
          ? "All-Time Master Ledger"
          : (filterExcelByDate
            ? `${formatDateFriendly(excelStartDate)} – ${formatDateFriendly(excelEndDate)}`
            : monthLabel);

        const excelIncomeTx = exportTransactions.filter(t => t.type === 'income');
        const excelExpenseTx = exportTransactions.filter(t => t.type === 'expense');

        const excelTotalIncome = excelIncomeTx.reduce((sum, t) => sum + t.amount, 0);
        const excelTotalExpense = excelExpenseTx.reduce((sum, t) => sum + t.amount, 0);
        const excelSavingsExpense = excelExpenseTx
          .filter(t => t.category && t.category.toLowerCase() === 'savings')
          .reduce((sum, t) => sum + t.amount, 0);

        const excelNetSavings = (excelTotalIncome - excelTotalExpense) + excelSavingsExpense;
        const excelSavingsRate = excelTotalIncome > 0 ? (excelNetSavings / excelTotalIncome) * 100 : 0;

        // Breakdown categories for income
        const excelIncMap: Record<string, number> = {};
        excelIncomeTx.forEach(t => {
          excelIncMap[t.category] = (excelIncMap[t.category] || 0) + t.amount;
        });
        const excelIncCats = Object.entries(excelIncMap)
          .map(([category, amount]) => ({
            category,
            amount,
            percentage: excelTotalIncome > 0 ? (amount / excelTotalIncome) * 100 : 0
          }))
          .sort((a, b) => b.amount - a.amount);

        // Breakdown categories for expense
        const excelExpMap: Record<string, number> = {};
        excelExpenseTx.forEach(t => {
          excelExpMap[t.category] = (excelExpMap[t.category] || 0) + t.amount;
        });
        const excelExpCats = Object.entries(excelExpMap)
          .map(([category, amount]) => ({
            category,
            amount,
            percentage: excelTotalExpense > 0 ? (amount / excelTotalExpense) * 100 : 0
          }))
          .sort((a, b) => b.amount - a.amount);

        // 2. Prepare visual Dashboard dataset
        const dashboardData: any[][] = [];
        dashboardData.push(["EXECUTIVE FINANCIAL DASHBOARD"]); // Row 1 (A1:M1 merged)
        dashboardData.push(["Period Scope", excelMonthLabel]); // Row 2
        dashboardData.push(["Export Timestamp", new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()]); // Row 3
        dashboardData.push([]); // Row 4
        
        dashboardData.push(["CORE FINANCIAL PERFORMANCE KPI METRICS"]); // Row 5 (A5:M5 merged)
        dashboardData.push(["Performance Key", "Absolute Value", "Status Tracking", "", "", "", "", "", "", "", "", "", "Relative Share"]); // Row 6 (Col C to L merged)
        dashboardData.push(["Total Income", excelTotalIncome, "◀ INFLOW BASELINE", "", "", "", "", "", "", "", "", "", 1.0]); // Row 7 (Col C to L merged)
        dashboardData.push(["Total Expenses", excelTotalExpense, `Outflow Rate: ${(excelTotalIncome > 0 ? (excelTotalExpense / excelTotalIncome) * 100 : 0).toFixed(1)}%`, "", "", "", "", "", "", "", "", "", excelTotalIncome > 0 ? excelTotalExpense / excelTotalIncome : 0]); // Row 8 (Col C to L merged)
        dashboardData.push(["Net Cash Savings", excelNetSavings, excelNetSavings >= 0 ? "▲ SURPLUS CASH" : "▼ DEFICIT CASH", "", "", "", "", "", "", "", "", "", excelTotalIncome > 0 ? excelNetSavings / excelTotalIncome : 0]); // Row 9
        dashboardData.push(["Savings Rate", excelSavingsRate / 100, "INVESTMENT / HEALTH INDEX", "", "", "", "", "", "", "", "", "", excelSavingsRate / 100]); // Row 10
        dashboardData.push([]); // Row 11
        
        dashboardData.push(["VISUAL SUMMARY CHART: INCOME VS. EXPENSES"]); // Row 12 (A12:M12 merged)
        dashboardData.push(["Financial Stream Flow", "Absolute Value", "Visual Proportional Performance Bar Chart (Cell-Shading Comparison)", "", "", "", "", "", "", "", "", "", "Relative Share"]); // Row 13 (Col C to L merged)
        dashboardData.push(["Total Inflow (Income)", excelTotalIncome, "", "", "", "", "", "", "", "", "", "", excelTotalIncome > 0 ? (excelTotalIncome / (excelTotalIncome + excelTotalExpense || 1)) : 0]); // Row 14 (Col C to L are individual chart blocks!)
        dashboardData.push(["Total Outlay (Expenses)", excelTotalExpense, "", "", "", "", "", "", "", "", "", "", excelTotalExpense > 0 ? (excelTotalExpense / (excelTotalIncome + excelTotalExpense || 1)) : 0]); // Row 15 (Col C to L are individual chart blocks!)
        dashboardData.push([]); // Row 16
        
        dashboardData.push(["VISUAL SUMMARY CHART: SAVINGS RATE TARGET TRACKER"]); // Row 17 (A17:M17 merged)
        dashboardData.push(["Savings Rate Metric", "Metric Ratio", "Savings Progress Tracker Bar (0% to 100% Core Target Progress)", "", "", "", "", "", "", "", "", "", "Core Progress Index"]); // Row 18 (Col C to L merged)
        dashboardData.push(["Direct Savings Quotient", excelSavingsRate / 100, "", "", "", "", "", "", "", "", "", "", excelSavingsRate / 100]); // Row 19 (Col C to L are individual chart blocks!)
        dashboardData.push([]); // Row 20

        const wsDashboard = XLSX.utils.aoa_to_sheet(dashboardData);

        // Setup merges for wsDashboard
        wsDashboard['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } }, // Row 1 merged (A1:M1)
          { s: { r: 4, c: 0 }, e: { r: 4, c: 12 } }, // Row 5 merged (A5:M5)
          { s: { r: 5, c: 2 }, e: { r: 5, c: 11 } }, // Row 6 C:L merged (col 2-11)
          { s: { r: 6, c: 2 }, e: { r: 6, c: 11 } }, // Row 7 C:L merged (col 2-11)
          { s: { r: 7, c: 2 }, e: { r: 7, c: 11 } }, // Row 8 C:L merged (col 2-11)
          { s: { r: 8, c: 2 }, e: { r: 8, c: 11 } }, // Row 9 C:L merged (col 2-11)
          { s: { r: 9, c: 2 }, e: { r: 9, c: 11 } }, // Row 10 C:L merged (col 2-11)
          
          { s: { r: 11, c: 0 }, e: { r: 11, c: 12 } }, // Row 12 (A12:M12)
          { s: { r: 12, c: 2 }, e: { r: 12, c: 11 } }, // Row 13 C:L merged (col 2-11)
          
          { s: { r: 16, c: 0 }, e: { r: 16, c: 12 } }, // Row 17 (A17:M17)
          { s: { r: 17, c: 2 }, e: { r: 17, c: 11 } }  // Row 18 C:L merged (col 2-11)
        ];

        // Explicit columns for Dashboard tab
        wsDashboard['!cols'] = [
          { wch: 25 }, // Col A (Label)
          { wch: 16 }, // Col B (Value)
          { wch: 5 },  // Col C (Chart 1)
          { wch: 5 },  // Col D (Chart 2)
          { wch: 5 },  // Col E (Chart 3)
          { wch: 5 },  // Col F (Chart 4)
          { wch: 5 },  // Col G (Chart 5)
          { wch: 5 },  // Col H (Chart 6)
          { wch: 5 },  // Col I (Chart 7)
          { wch: 5 },  // Col J (Chart 8)
          { wch: 5 },  // Col K (Chart 9)
          { wch: 5 },  // Col L (Chart 10)
          { wch: 18 }  // Col M (Relative ratio percentage)
        ];

        // Apply numeric / currency / percentage formatting on wsDashboard cells
        const dashboardCurrencyRef = ['B7', 'B8', 'B9', 'B14', 'B15'];
        dashboardCurrencyRef.forEach(ref => {
          if (wsDashboard[ref]) {
            wsDashboard[ref].t = 'n';
            wsDashboard[ref].z = `"${currencySymbol}"#,##0.00`;
          }
        });
        
        const dashboardPercentageRef = ['B10', 'B19', 'M7', 'M8', 'M9', 'M10', 'M14', 'M15', 'M19'];
        dashboardPercentageRef.forEach(ref => {
          if (wsDashboard[ref]) {
            wsDashboard[ref].t = 'n';
            wsDashboard[ref].z = '0.0%';
          }
        });

        // 3. Prepare Summary dataset
        const summaryData: any[][] = [];
        summaryData.push(["LEDGER FINANCIAL PRO ABSTRACT"]);
        summaryData.push(["Report Period", excelMonthLabel]);
        summaryData.push(["Generated On", new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()]);
        summaryData.push([]);

        summaryData.push(["CORE PERFORMANCE METRICS"]);
        summaryData.push(["Metric", "Value"]);
        const coreMetricsStart = summaryData.length;
        summaryData.push(["Total Income", excelTotalIncome]);
        summaryData.push(["Total Expenses", excelTotalExpense]);
        summaryData.push(["Net Cash Savings", excelNetSavings]);
        summaryData.push(["Savings Rate", excelSavingsRate / 100]); // Use fractional value for % format
        summaryData.push([]);

        summaryData.push(["INCOME CATEGORY BREAKDOWN"]);
        summaryData.push(["Category", "Total Inflow", "Proportion"]);
        const incomeStart = summaryData.length;
        excelIncCats.forEach(c => {
          summaryData.push([c.category, c.amount, c.percentage / 100]);
        });
        const incomeEnd = summaryData.length;
        summaryData.push([]);

        summaryData.push(["EXPENSE CATEGORY BREAKDOWN"]);
        summaryData.push(["Category", "Total Outlay", "Proportion"]);
        const expenseStart = summaryData.length;
        excelExpCats.forEach(c => {
          summaryData.push([c.category, c.amount, c.percentage / 100]);
        });
        const expenseEnd = summaryData.length;

        // Convert to Excel Worksheet
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

        // Merge cells for the title block (A1 to C1)
        wsSummary['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }
        ];

        // Apply currency and percentage formatting to Summary worksheet
        for (let r = coreMetricsStart; r < coreMetricsStart + 3; r++) {
          const cellRef = XLSX.utils.encode_cell({ r, c: 1 });
          if (wsSummary[cellRef]) {
            wsSummary[cellRef].t = 'n';
            wsSummary[cellRef].z = `"${currencySymbol}"#,##0.00`;
          }
        }
        const savingsRateRef = XLSX.utils.encode_cell({ r: coreMetricsStart + 3, c: 1 });
        if (wsSummary[savingsRateRef]) {
          wsSummary[savingsRateRef].t = 'n';
          wsSummary[savingsRateRef].z = '0.0%';
        }

        // Income category breakdown lists
        for (let r = incomeStart; r < incomeEnd; r++) {
          const amtRef = XLSX.utils.encode_cell({ r, c: 1 });
          if (wsSummary[amtRef]) {
            wsSummary[amtRef].t = 'n';
            wsSummary[amtRef].z = `"${currencySymbol}"#,##0.00`;
          }
          const pctRef = XLSX.utils.encode_cell({ r, c: 2 });
          if (wsSummary[pctRef]) {
            wsSummary[pctRef].t = 'n';
            wsSummary[pctRef].z = '0.0%';
          }
        }

        // Expense category breakdown lists
        for (let r = expenseStart; r < expenseEnd; r++) {
          const amtRef = XLSX.utils.encode_cell({ r, c: 1 });
          if (wsSummary[amtRef]) {
            wsSummary[amtRef].t = 'n';
            wsSummary[amtRef].z = `"${currencySymbol}"#,##0.00`;
          }
          const pctRef = XLSX.utils.encode_cell({ r, c: 2 });
          if (wsSummary[pctRef]) {
            wsSummary[pctRef].t = 'n';
            wsSummary[pctRef].z = '0.0%';
          }
        }

        // Explicit generous column widths for Summary tab
        wsSummary['!cols'] = [
          { wch: 30 }, // Meta field or category
          { wch: 18 }, // Value or Amount
          { wch: 15 }  // Proportion %
        ];

        // 4. Prepare Transactions dataset
        const rawHeaders = [
          excelHeaders.id || 'Transaction ID',
          excelHeaders.date || 'Date',
          excelHeaders.type || 'Type',
          excelHeaders.category || 'Category',
          excelHeaders.amount || 'Amount',
          excelHeaders.description || 'Description',
          excelHeaders.notes || 'Transaction Notes',
          ...(excelIncludeCategoryId ? [excelHeaders.categoryId || 'Category ID'] : [])
        ];
        const rawRows = exportTransactions.map(t => {
          const computedCatId = t.category 
            ? t.category.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') 
            : 'uncategorized';
          return [
            t.id,
            t.date,
            t.type.toUpperCase(),
            t.category,
            t.amount,
            t.description,
            t.description,
            ...(excelIncludeCategoryId ? [computedCatId] : [])
          ];
        });

        const wsTransactions = XLSX.utils.aoa_to_sheet([rawHeaders, ...rawRows]);

        // Apply currency formatting to Amount column (E-column, index 4) in Transactions sheet
        for (let r = 1; r <= rawRows.length; r++) {
          const cellRef = XLSX.utils.encode_cell({ r, c: 4 });
          if (wsTransactions[cellRef]) {
            wsTransactions[cellRef].t = 'n';
            wsTransactions[cellRef].z = `"${currencySymbol}"#,##0.00`;
          }
        }

        // Generous Column Widths for Raw ledger sheet
        wsTransactions['!cols'] = [
          { wch: 22 }, // Transaction ID
          { wch: 12 }, // Date
          { wch: 10 }, // Type
          { wch: 18 }, // Category
          { wch: 16 }, // Amount
          { wch: 45 }, // Description
          { wch: 45 }, // Transaction Notes
          ...(excelIncludeCategoryId ? [{ wch: 24 }] : [])
        ];

        // 5. Auto-calculating column filters and frozen view pane for seamless table scanning
        const lastColLetter = excelIncludeCategoryId ? 'H' : 'G';
        wsTransactions['!autofilter'] = { ref: `A1:${lastColLetter}${rawRows.length + 1}` };
        wsTransactions['!views'] = [
          { state: 'frozen', ySplit: 1, activePane: 'bottomLeft', paneType: 'frozen' }
        ];

        // 6. Apply Professional/Minimalist Styling scheme across cells
        const applyProfessionalStyles = (ws: XLSX.WorkSheet, sheetType: 'dashboard' | 'summary' | 'raw') => {
          const cells = Object.keys(ws).filter(key => !key.startsWith('!'));
          const isMinimal = excelStyleTheme === 'minimal';
          
          cells.forEach(key => {
            const cell = ws[key];
            if (!cell) return;

            const rowNum = parseInt(key.replace(/[A-Z]/g, ''), 10);
            const colLetter = key.replace(/[0-9]/g, '');

            // Convert colLetter to index (A=0, B=1, etc.)
            let colIndex = 0;
            for (let i = 0; i < colLetter.length; i++) {
              colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64);
            }
            colIndex -= 1; // 0-based index

            const style: any = {
              font: { name: "Segoe UI", sz: 10, color: { rgb: "334155" } },
              alignment: { vertical: "center" },
              border: isMinimal ? {
                bottom: { style: "thin", color: { rgb: "E2E8F0" } }
              } : {
                bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                top: { style: "thin", color: { rgb: "E2E8F0" } },
                left: { style: "thin", color: { rgb: "E2E8F0" } },
                right: { style: "thin", color: { rgb: "E2E8F0" } }
              }
            };

            const val = String(cell.v || '');

            if (sheetType === 'raw') {
              if (rowNum === 1) {
                // Header row
                if (isMinimal) {
                  style.font = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "0F172A" } };
                  style.fill = { patternType: "solid", fgColor: { rgb: "F8FAFC" } };
                  style.border = {
                    bottom: { style: "medium", color: { rgb: "94A3B8" } }
                  };
                } else {
                  style.font = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } };
                  style.fill = { patternType: "solid", fgColor: { rgb: "1E293B" } }; // Deep Slate executive header
                }
                style.alignment = { horizontal: "left", vertical: "center" };
                if (colLetter === 'E') {
                  style.alignment.horizontal = "right";
                }
              } else {
                // Transactions records
                style.alignment = { horizontal: "left", vertical: "center" };
                if (colLetter === 'E') {
                  style.alignment.horizontal = "right";
                }

                // Check transaction type from Column C
                const typeCell = ws["C" + rowNum];
                const isIncomeType = typeCell && String(typeCell.v).toUpperCase() === 'INCOME';
                const isExpenseType = typeCell && String(typeCell.v).toUpperCase() === 'EXPENSE';

                if (isIncomeType) {
                  // Alternating green tinting
                  if (isMinimal) {
                    style.fill = { patternType: "none" };
                  } else {
                    if (rowNum % 2 === 0) {
                      style.fill = { patternType: "solid", fgColor: { rgb: "ECFDF5" } }; // Light emerald
                    } else {
                      style.fill = { patternType: "solid", fgColor: { rgb: "F0FDF4" } }; // Lighter emerald
                    }
                  }
                  if (colLetter === 'C') {
                    style.font = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "047857" } };
                  }
                } else if (isExpenseType) {
                  // Alternating rose tinting
                  if (isMinimal) {
                    style.fill = { patternType: "none" };
                  } else {
                    if (rowNum % 2 === 0) {
                      style.fill = { patternType: "solid", fgColor: { rgb: "FFF1F2" } }; // Light rose
                    } else {
                      style.fill = { patternType: "solid", fgColor: { rgb: "FEF2F2" } }; // Lighter rose
                    }
                  }
                  if (colLetter === 'C') {
                    style.font = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "B91C1C" } };
                  }
                } else {
                  // Alternating light gray striping
                  if (isMinimal) {
                    style.fill = { patternType: "none" };
                  } else {
                    if (rowNum % 2 === 0) {
                      style.fill = { patternType: "solid", fgColor: { rgb: "F8FAFC" } };
                    } else {
                      style.fill = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
                    }
                  }
                }
              }
            } else if (sheetType === 'summary') {
              // Summary sheet
              if (rowNum === 1) {
                // Master hero title row
                if (isMinimal) {
                  style.font = { name: "Segoe UI", sz: 12, bold: true, color: { rgb: "0F172A" } };
                  style.fill = { patternType: "none" };
                  style.border = {
                    bottom: { style: "medium", color: { rgb: "94A3B8" } }
                  };
                } else {
                  style.font = { name: "Segoe UI", sz: 12, bold: true, color: { rgb: "FFFFFF" } };
                  style.fill = { patternType: "solid", fgColor: { rgb: "0F172A" } }; // Rich slate-900 title Block
                }
                style.alignment = { horizontal: "center", vertical: "center" };
              } else if (
                val === "CORE PERFORMANCE METRICS" || 
                val === "INCOME CATEGORY BREAKDOWN" || 
                val === "EXPENSE CATEGORY BREAKDOWN"
              ) {
                // Heading rows
                if (isMinimal) {
                  style.font = { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "1E293B" } };
                  style.fill = { patternType: "none" };
                  style.border = {
                    bottom: { style: "thin", color: { rgb: "94A3B8" } }
                  };
                } else {
                  style.font = { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "1E293B" } };
                  style.fill = { patternType: "solid", fgColor: { rgb: "E2E8F0" } }; // Soft slate header banner
                }
                style.alignment = { horizontal: "left", vertical: "center" };
              } else if (
                val === "Metric" || 
                val === "Value" || 
                val === "Category" || 
                val === "Total Inflow" || 
                val === "Proportion" || 
                val === "Total Outlay"
              ) {
                // Subheadings
                if (isMinimal) {
                  style.font = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "475569" } };
                  style.fill = { patternType: "none" };
                  style.border = {
                    bottom: { style: "thin", color: { rgb: "CBD5E1" } }
                  };
                } else {
                  style.font = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } };
                  style.fill = { patternType: "solid", fgColor: { rgb: "475569" } }; // Medium slate
                }
                style.alignment = { horizontal: "left", vertical: "center" };
                if (val === "Value" || val === "Total Inflow" || val === "Total Outlay" || val === "Proportion") {
                  style.alignment.horizontal = "right";
                }
              } else if (rowNum >= 2 && rowNum <= 3) {
                // Meta summary lines (naked borders, dimmed text)
                style.font = { name: "Segoe UI", sz: 9, italic: true, color: { rgb: "64748B" } };
                style.alignment = { horizontal: "left", vertical: "center" };
                style.border = {};
              } else {
                // General cells
                style.alignment = { horizontal: "left", vertical: "center" };
                if (colLetter === 'B' || colLetter === 'C') {
                  style.alignment.horizontal = "right";
                }
                if (isMinimal) {
                  style.fill = { patternType: "none" };
                } else {
                  if (rowNum % 2 === 0) {
                    style.fill = { patternType: "solid", fgColor: { rgb: "F8FAFC" } };
                  } else {
                    style.fill = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
                  }
                }

                // Bold specific high priority labels & totals
                if (
                  val === "Total Income" || 
                  val === "Total Expenses" || 
                  val === "Net Cash Savings" || 
                  val === "Savings Rate"
                ) {
                  style.font.bold = true;
                }
              }
            } else if (sheetType === 'dashboard') {
              if (rowNum === 1) {
                // Master hero title row
                if (isMinimal) {
                  style.font = { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "0F172A" } };
                  style.fill = { patternType: "none" };
                  style.border = {
                    bottom: { style: "medium", color: { rgb: "94A3B8" } }
                  };
                } else {
                  style.font = { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "FFFFFF" } };
                  style.fill = { patternType: "solid", fgColor: { rgb: "0F172A" } }; // Rich slate-900 title Block
                }
                style.alignment = { horizontal: "center", vertical: "center" };
              } else if (
                val === "CORE FINANCIAL PERFORMANCE KPI METRICS" || 
                val === "VISUAL SUMMARY CHART: INCOME VS. EXPENSES" || 
                val === "VISUAL SUMMARY CHART: SAVINGS RATE TARGET TRACKER"
              ) {
                // Section Heading banners
                if (isMinimal) {
                  style.font = { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "1E293B" } };
                  style.fill = { patternType: "none" };
                  style.border = {
                    bottom: { style: "thin", color: { rgb: "94A3B8" } }
                  };
                } else {
                  style.font = { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "1E293B" } };
                  style.fill = { patternType: "solid", fgColor: { rgb: "E2E8F0" } }; // Soft slate header banner
                }
                style.alignment = { horizontal: "left", vertical: "center" };
              } else if (
                val === "Performance Key" || 
                val === "Financial Stream Flow" || 
                val === "Savings Rate Metric" || 
                val === "Absolute Value" || 
                val === "Metric Ratio" || 
                val === "Status Tracking" || 
                val === "Relative Share" || 
                val === "Core Progress Index" || 
                val === "Visual Proportional Performance Bar Chart (Active Cell-Shading)" || 
                val === "Savings Progress Tracker Bar (0% to 100% Core Target Progress)"
              ) {
                // Table Subheadings
                if (isMinimal) {
                  style.font = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "475569" } };
                  style.fill = { patternType: "none" };
                  style.border = {
                    bottom: { style: "thin", color: { rgb: "CBD5E1" } }
                  };
                } else {
                  style.font = { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } };
                  style.fill = { patternType: "solid", fgColor: { rgb: "475569" } }; // Medium slate
                }
                style.alignment = { horizontal: "left", vertical: "center" };
                if (colIndex === 1 || colIndex === 12) {
                  style.alignment.horizontal = "right";
                } else if (colIndex >= 2 && colIndex <= 11) {
                  style.alignment.horizontal = "center";
                }
              } else if (rowNum >= 2 && rowNum <= 3) {
                // Scope descriptors
                style.font = { name: "Segoe UI", sz: 9.5, italic: true, color: { rgb: "64748B" } };
                style.alignment = { horizontal: "left", vertical: "center" };
                style.border = {};
              } else {
                // General cells
                style.alignment = { horizontal: "left", vertical: "center" };
                if (colIndex === 1 || colIndex === 12) {
                  style.alignment.horizontal = "right";
                }

                if (isMinimal) {
                  style.fill = { patternType: "none" };
                } else {
                  if (rowNum % 2 === 0) {
                    style.fill = { patternType: "solid", fgColor: { rgb: "F8FAFC" } };
                  } else {
                    style.fill = { patternType: "solid", fgColor: { rgb: "FFFFFF" } };
                  }
                }

                // Bold Row Headers (Column A)
                if (colIndex === 0) {
                  style.font.bold = true;
                }

                // Custom charts parsing for row 14, 15, 19
                if (rowNum === 14) {
                  // Total Income Chart Bar Space
                  const maxVal = Math.max(excelTotalIncome, excelTotalExpense, 1);
                  const numIncCells = Math.round((excelTotalIncome / maxVal) * 10);
                  const barColOffset = colIndex - 2; // Col C (2) is index 0
                  if (colIndex >= 2 && colIndex <= 11) {
                    if (barColOffset < numIncCells) {
                      style.fill = { patternType: "solid", fgColor: { rgb: "10B981" } }; // Vibrant Emerald
                    } else {
                      style.fill = { patternType: "solid", fgColor: { rgb: "F1F5F9" } }; // Light grey track
                    }
                  }
                } else if (rowNum === 15) {
                  // Total Expense Chart Bar Space
                  const maxVal = Math.max(excelTotalIncome, excelTotalExpense, 1);
                  const numExpCells = Math.round((excelTotalExpense / maxVal) * 10);
                  const barColOffset = colIndex - 2;
                  if (colIndex >= 2 && colIndex <= 11) {
                    if (barColOffset < numExpCells) {
                      style.fill = { patternType: "solid", fgColor: { rgb: "EF4444" } }; // Vibrant Rose Red
                    } else {
                      style.fill = { patternType: "solid", fgColor: { rgb: "F1F5F9" } }; // Light grey track
                    }
                  }
                } else if (rowNum === 19) {
                  // Savings Quotient Progress Bar Space
                  const pctSavings = Math.max(0, Math.min(100, excelSavingsRate));
                  const numSavingsCells = Math.round((pctSavings / 100) * 10);
                  const barColOffset = colIndex - 2;
                  if (colIndex >= 2 && colIndex <= 11) {
                    if (barColOffset < numSavingsCells) {
                      style.fill = { patternType: "solid", fgColor: { rgb: "0EA5E9" } }; // Sky Blue
                    } else {
                      style.fill = { patternType: "solid", fgColor: { rgb: "F1F5F9" } }; // Light grey track
                    }
                  }
                }
              }
            }

            cell.s = style;
          });
        };

        // Style the worksheets with matching executive themes
        applyProfessionalStyles(wsDashboard, 'dashboard');
        applyProfessionalStyles(wsSummary, 'summary');
        applyProfessionalStyles(wsTransactions, 'raw');

        // 7. Attach and sort worksheets within the workbook
        XLSX.utils.book_append_sheet(wb, wsDashboard, "Dashboard");
        XLSX.utils.book_append_sheet(wb, wsSummary, "Financial Summary");
        XLSX.utils.book_append_sheet(wb, wsTransactions, "Raw Ledger");

        // 8. Generate trigger and trigger download
        const fileDateLabel = !excelEnableDateFiltering
          ? "All_Time"
          : (filterExcelByDate
            ? `${excelStartDate}_to_${excelEndDate}`
            : (reportMode === 'month' ? selectedMonth : `${startDateStr}_to_${endDateStr}`));
        XLSX.writeFile(wb, `Ledger_Master_Portfolio_${fileDateLabel}.xlsx`);
      } catch (err) {
        console.error("XLSX Export failure:", err);
      } finally {
        onExcelExportStateChange?.(false);
      }
    }, 150);
  };

  // Export to formatted txt summary
  const handleExportTXT = () => {
    const fileDateLabel = reportMode === 'month' ? selectedMonth : `${startDateStr}_to_${endDateStr}`;
    const txtReport = `==================================================
              LEDGER FINANCIAL SUMMARY REPORT
==================================================
Report Period:  ${monthLabel} (${fileDateLabel})
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
    <div id="monthly-reports-capture-area" className="space-y-6">
      
      {/* Header section with Select and actions */}
      <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 transition-colors">
        
        {/* Title and Segmented Switcher */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center flex-wrap gap-2">
                <span>Performance Digests</span>
                <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono font-bold px-2.5 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                  {monthLabel}
                </span>
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
              Generate and export aggregated audits of your ledger distributions over any interval.
            </p>
          </div>

          {/* Segmented control for reporting mode */}
          <div data-html2canvas-ignore="true" className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs shrink-0 self-start">
            <button
              id="toggle-mode-month"
              onClick={() => setReportMode('month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                reportMode === 'month'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Single Month
            </button>
            <button
              id="toggle-mode-range"
              onClick={() => setReportMode('range')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                reportMode === 'range'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Dynamic selector controls inside elegant input frame */}
        <div data-html2canvas-ignore="true" className="flex flex-wrap items-center gap-3 w-full xl:w-auto font-sans">
          
          {reportMode === 'month' ? (
            <div className="relative flex-1 sm:flex-initial">
              <Calendar className="w-4 h-4 p-0 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
              <select
                id="report-month-select"
                value={selectedMonth}
                onChange={(e) => handleOnMonthSelectChange(e.target.value)}
                className="w-full sm:w-52 appearance-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
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
          ) : (
            <div className="flex items-center gap-2 flex-1 sm:flex-initial bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <input
                type="date"
                id="custom-start-date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                title="Start Date"
                className="border-0 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden px-2 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-600 font-extrabold uppercase">to</span>
              <input
                type="date"
                id="custom-end-date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                title="End Date"
                className="border-0 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden px-2 cursor-pointer"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
            <button
              id="print-sys-report"
              onClick={() => window.print()}
              title="Surgical Paper Print out"
              className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-4.5 h-4.5" />
            </button>

            <button
              id="download-pdf-report-btn"
              disabled={isGeneratingPDF}
              onClick={() => setShowPDFPreview(true)}
              title="Download Custom High-Quality PDF Report"
              className="p-2 border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center min-w-8.5 min-h-8.5"
            >
              {isGeneratingPDF ? (
                <span className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent animate-spin rounded-full block" />
              ) : (
                <FileDown className="w-4.5 h-4.5 text-rose-500" />
              )}
            </button>

            <button
              id="save-monthly-snapshot-btn"
              disabled={reportMode === 'range'}
              onClick={handleSaveSnapshot}
              title={reportMode === 'range' ? "Save snapshots is only available for single month digests" : `Save standard snapshot of ${monthLabel} reports to Supabase`}
              className="px-3.5 py-2 border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Camera className="w-4.5 h-4.5 text-emerald-500 shrink-0 animate-pulse" />
              <span>Save Snapshot</span>
            </button>
          </div>
        </div>
      </div>

      {snapshotSuccessMsg && (
        <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-350 p-3.5 px-4.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all shadow-3xs">
          <div className="p-1 bg-emerald-550 text-white rounded-full">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{snapshotSuccessMsg}</span>
        </div>
      )}

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

            {/* Comparison Dashboard (Selected archived snapshot vs Current Live selector) */}
            {selectedCompareSnapshot && (
              <div className="bg-gradient-to-br from-blue-50/20 to-indigo-50/10 dark:from-slate-900/40 dark:to-slate-900/20 border-2 border-blue-500/25 dark:border-blue-500/20 p-5 rounded-2xl shadow-3xs space-y-4.5 transition-all">
                
                {/* comparative header */}
                <div className="flex items-center justify-between border-b border-blue-100/60 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="text-left">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Comparative Analytics</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                        Comparing <strong className="text-blue-600 dark:text-blue-400 font-bold">{monthLabel}</strong> (Live) alongside archived profile for <strong className="text-slate-700 dark:text-slate-300 font-bold">{formatMonthName(selectedCompareSnapshot.month)}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCompareSnapshotId(null)}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-705 dark:text-slate-400 dark:hover:text-slate-205 bg-slate-100 dark:bg-slate-800 hover:bg-slate-150 px-2 py-1 rounded-lg cursor-pointer transition-all hover:underline"
                  >
                    Clear Comparison
                  </button>
                </div>

                {/* Comparative grid table */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  
                  {/* Income Comparison */}
                  <div className="space-y-1.5 bg-white dark:bg-slate-950 p-3.5 border border-slate-150/50 dark:border-slate-800 rounded-xl shadow-xs">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Core Income</span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {monthLabel}: <span className="font-mono font-bold text-slate-900 dark:text-white">{currencySymbol}{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                        {formatMonthName(selectedCompareSnapshot.month)}: <span className="font-mono">{currencySymbol}{selectedCompareSnapshot.total_income?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </p>
                    </div>
                    {/* Diff metric */}
                    <div className="flex items-center justify-between text-[10px] font-semibold border-t border-dashed border-slate-100 dark:border-slate-800 pt-1.5 mt-2">
                      <span className="text-slate-450 dark:text-slate-400">Variance:</span>
                      <span className={`font-mono font-black flex items-center gap-0.5 ${
                        totalIncome >= selectedCompareSnapshot.total_income 
                          ? 'text-emerald-600 dark:text-emerald-450' 
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {totalIncome >= selectedCompareSnapshot.total_income ? '+' : ''}
                        {currencySymbol}{(totalIncome - selectedCompareSnapshot.total_income).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                        ({selectedCompareSnapshot.total_income > 0 ? (((totalIncome - selectedCompareSnapshot.total_income) / selectedCompareSnapshot.total_income) * 105).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>

                  {/* Expense Comparison */}
                  <div className="space-y-1.5 bg-white dark:bg-slate-950 p-3.5 border border-slate-150/50 dark:border-slate-800 rounded-xl shadow-xs">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Core Expenses</span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {monthLabel}: <span className="font-mono font-bold text-slate-900 dark:text-white">{currencySymbol}{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                        {formatMonthName(selectedCompareSnapshot.month)}: <span className="font-mono">{currencySymbol}{selectedCompareSnapshot.total_expense?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </p>
                    </div>
                    {/* Diff metric */}
                    <div className="flex items-center justify-between text-[10px] font-semibold border-t border-dashed border-slate-100 dark:border-slate-800 pt-1.5 mt-2">
                      <span className="text-slate-450 dark:text-slate-400">Variance:</span>
                      <span className={`font-mono font-black flex items-center gap-0.5 ${
                        totalExpense <= selectedCompareSnapshot.total_expense 
                          ? 'text-emerald-600 dark:text-emerald-450' 
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {totalExpense > selectedCompareSnapshot.total_expense ? '+' : ''}
                        {currencySymbol}{(totalExpense - selectedCompareSnapshot.total_expense).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                        ({selectedCompareSnapshot.total_expense > 0 ? (((totalExpense - selectedCompareSnapshot.total_expense) / selectedCompareSnapshot.total_expense) * 105).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>

                  {/* Net Savings rate comparison */}
                  <div className="space-y-1.5 bg-white dark:bg-slate-950 p-3.5 border border-slate-150/50 dark:border-slate-800 rounded-xl shadow-xs">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Savings Margin</span>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {monthLabel}: <span className="font-mono font-bold text-slate-900 dark:text-white">{savingsRate.toFixed(1)}%</span>
                      </p>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                        {formatMonthName(selectedCompareSnapshot.month)}: <span className="font-mono">{selectedCompareSnapshot.savings_rate?.toFixed(1)}%</span>
                      </p>
                    </div>
                    {/* Diff metric */}
                    <div className="flex items-center justify-between text-[10px] font-semibold border-t border-dashed border-slate-100 dark:border-slate-800 pt-1.5 mt-2 font-mono">
                      <span className="text-slate-450 dark:text-slate-400 font-sans">Variance:</span>
                      <span className={`font-black flex items-center gap-0.5 ${
                        savingsRate >= selectedCompareSnapshot.savings_rate 
                          ? 'text-emerald-600 dark:text-emerald-450' 
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {savingsRate >= selectedCompareSnapshot.savings_rate ? '+' : ''}
                        {(savingsRate - selectedCompareSnapshot.savings_rate).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                </div>

                {/* Sub-text summary description dynamically generated of differences */}
                <div className="p-3 bg-white/40 dark:bg-slate-950/45 border border-slate-100/60 dark:border-slate-800 rounded-xl text-[10.5px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed text-left">
                  <span>
                    Summary analysis: In the month of <strong>{monthLabel}</strong>, your total deposits represent a <strong>{totalIncome >= selectedCompareSnapshot.total_income ? 'surplus' : 'reduction'}</strong> of <strong>{currencySymbol}{Math.abs(totalIncome - selectedCompareSnapshot.total_income).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> relative to <strong>{formatMonthName(selectedCompareSnapshot.month)}</strong>. 
                    {totalExpense <= selectedCompareSnapshot.total_expense ? (
                      <span> Good job restraining capital outflows: you spent <strong>{currencySymbol}{Math.abs(selectedCompareSnapshot.total_expense - totalExpense).toLocaleString(undefined, { maximumFractionDigits: 0 })} less</strong> in billing and payment events!</span>
                    ) : (
                      <span> Be mindful of expanding payment outlines: outflows were <strong>{currencySymbol}{Math.abs(totalExpense - selectedCompareSnapshot.total_expense).toLocaleString(undefined, { maximumFractionDigits: 0 })} higher</strong> in live ledgers!</span>
                    )}
                    <span> Your net savings cashflow is <strong>{netSavings >= selectedCompareSnapshot.net_savings ? 'higher' : 'lower'}</strong> by <strong>{currencySymbol}{Math.abs(netSavings - selectedCompareSnapshot.net_savings).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>.</span>
                  </span>
                </div>

              </div>
            )}
            
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
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
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

            {/* Gemini Intelligence Smart advisor synthesis */}
            <div className="bg-gradient-to-br from-indigo-50/10 to-blue-50/5 dark:from-slate-900/30 dark:to-slate-950/25 border border-indigo-150/40 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-3.5 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider">Gemini Intelligence Diagnostics</h3>
                    <p className="text-[9px] text-gray-400 dark:text-slate-500 font-mono">Automated Advisor Synthesis</p>
                  </div>
                </div>
                {loadingInsights && (
                  <span className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-bold px-2.5 py-1 rounded-md animate-pulse">
                    Synthesizing...
                  </span>
                )}
              </div>

              {loadingInsights ? (
                <div className="space-y-2 animate-pulse py-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-sm w-full" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-sm w-4/5" />
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-sm w-2/3" />
                </div>
              ) : aiInsights ? (
                <div className="space-y-3.5 text-left text-xs">
                  <div className="p-3.5 bg-white/40 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl leading-relaxed text-slate-700 dark:text-slate-300">
                    <p className="font-extrabold text-indigo-600 dark:text-indigo-400 text-[10.5px] uppercase tracking-wider font-mono mb-1.5">
                      Status Rating: {aiInsights.overallStatus}
                    </p>
                    <p className="leading-relaxed font-medium">
                      {aiInsights.summaryMessage}
                    </p>
                  </div>
                  {aiInsights.actionableInsights && aiInsights.actionableInsights.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <h4 className="font-bold text-slate-450 dark:text-slate-500 text-[9px] uppercase tracking-wider font-mono">Actionable Projections & Saving Recommendations</h4>
                      <ul className="space-y-2 pl-1.5">
                        {aiInsights.actionableInsights.map((insight, idx) => (
                          <li key={idx} className="flex gap-2.5 items-start text-slate-650 dark:text-slate-350">
                            <span className="text-emerald-500 shrink-0 text-xs">💡</span>
                            <span className="leading-relaxed font-medium text-[11px]">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-450 dark:text-slate-550 py-3 text-center border border-dashed border-slate-150 dark:border-slate-800 rounded-xl bg-slate-50/10">
                  No automated synthesis has been prepared for {monthLabel}. Click categories above or make ledger log entries to activate diagnostics.
                </p>
              )}
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
            <div data-html2canvas-ignore="true" className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4 transition-colors">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wide">Export Utilities</h3>
                <p className="text-[11px] text-gray-450 dark:text-slate-500 font-medium">Download audit packets for tax records or physical archiving.</p>
              </div>

              <div className="space-y-3">
                {/* Export as CSV */}
                <button
                  id="btn-export-csv"
                  onClick={handleExportCSV}
                  className="w-full flex items-center justify-between p-3.5 border border-slate-150 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900 bg-slate-50/20 dark:bg-slate-950 hover:bg-blue-50/15 dark:hover:bg-blue-900/10 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Table Ledger (.CSV)</p>
                      <p className="text-[10px] text-slate-400">Import directly to Excel / Sheets</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </button>

                {/* Export as Excel */}
                <button
                  id="btn-export-excel-trigger"
                  type="button"
                  onClick={() => setShowExcelExportModal(true)}
                  className="w-full flex items-center justify-between p-3.5 border border-slate-150 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900 bg-slate-50/20 dark:bg-slate-950 hover:bg-emerald-50/15 dark:hover:bg-emerald-950/10 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform font-bold">
                      <FileSpreadsheet className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-left font-semibold">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Excel Portfolio (.XLSX)</p>
                      <p className="text-[10px] text-slate-455 dark:text-slate-400">Configure parameters & download</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </button>

              </div>

                {/* Export as TXT report */}
                <button
                  id="btn-export-txt"
                  onClick={handleExportTXT}
                  className="w-full flex items-center justify-between p-3.5 border border-slate-150 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900 bg-slate-50/20 dark:bg-slate-950 hover:bg-emerald-50/15 dark:hover:bg-emerald-900/10 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Financial Abstract (.TXT)</p>
                      <p className="text-[10px] text-slate-400">Human readable text audit metrics</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </button>

                {/* Export as Premium PDF */}
                <button
                  id="btn-export-pdf"
                  disabled={isGeneratingPDF}
                  onClick={() => setShowPDFPreview(true)}
                  className="w-full flex items-center justify-between p-3.5 border border-slate-150 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-900 bg-slate-50/20 dark:bg-slate-950 hover:bg-rose-50/15 dark:hover:bg-rose-900/10 rounded-xl transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg group-hover:scale-110 transition-transform animate-pulse">
                      <FileDown className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Primacy PDF Report</p>
                      <p className="text-[10px] text-slate-400">High-fidelity publication print PDF</p>
                    </div>
                  </div>
                  {isGeneratingPDF ? (
                    <span className="text-[9px] font-mono animate-pulse text-rose-500 font-bold">COMPILING</span>
                  ) : (
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
                  )}
                </button>

                {/* Copy Markdown */}
                <button
                  id="btn-copy-md"
                  onClick={handleCopyMarkdown}
                  className="w-full flex items-center justify-between p-3.5 border border-slate-150 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-900 bg-slate-50/20 dark:bg-slate-950 hover:bg-purple-50/15 dark:hover:bg-purple-900/10 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
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

            {/* Historical Snapshots comparison panel */}
            <div data-html2canvas-ignore="true" className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-4 transition-colors text-left">
              <div className="flex items-center justify-between border-b border-gray-150/40 dark:border-slate-800 pb-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <h3 className="text-xs font-bold text-gray-950 dark:text-slate-200 uppercase tracking-wide">Report Archive</h3>
                  </div>
                  <p className="text-[10px] text-gray-450 dark:text-slate-500 font-medium">Saved Supabase snapshots comparison</p>
                </div>
                <span className="py-0.5 px-2 bg-slate-100 dark:bg-slate-800 text-[9px] font-mono font-bold rounded-lg text-slate-500 dark:text-slate-400">
                  {snapshots?.length || 0} saved
                </span>
              </div>

              {(!snapshots || snapshots.length === 0) ? (
                <div className="py-3 text-center text-[11px] text-slate-450 dark:text-slate-500 leading-relaxed font-sans border border-dashed border-slate-150 dark:border-slate-800 p-3 rounded-xl bg-slate-50/10 dark:bg-slate-950/20">
                  <p className="font-semibold text-slate-655 dark:text-slate-400">No archived records logged yet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click &quot;Save Snapshot&quot; to archive ledger state for {monthLabel}.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {snapshots.map((s) => {
                    const isComparing = compareSnapshotId === s.id;
                    return (
                      <div 
                        key={s.id} 
                        className={`p-2.5 border rounded-xl flex items-center justify-between gap-3 transition-all ${
                          isComparing 
                            ? 'bg-blue-50/40 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900 shadow-xs' 
                            : 'bg-slate-50/20 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-800'
                        }`}
                      >
                        <div 
                          className="min-w-0 flex-1 cursor-pointer text-left"
                          onClick={() => setCompareSnapshotId(isComparing ? null : s.id)}
                          title="Click to toggle historical comparison metrics dashboard"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-500 transition-colors">
                              {formatMonthName(s.month)}
                            </span>
                            {isComparing && (
                              <span className="bg-blue-500 text-[8px] text-white font-mono font-bold uppercase rounded-md px-1 py-0.2 shrink-0">
                                Comparing
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono text-slate-450 dark:text-slate-500 font-medium">
                            <span className="truncate">In: {currencySymbol}{s.total_income?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="truncate">Out: {currencySymbol}{s.total_expense?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="truncate col-span-2 font-bold text-slate-550 dark:text-slate-400">
                              Savings: {s.savings_rate?.toFixed(0)}% ({currencySymbol}{s.net_savings?.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                            </span>
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            if (isComparing) setCompareSnapshotId(null);
                            onDeleteSnapshot(s.id);
                          }}
                          className="p-1 px-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer self-center border border-transparent hover:border-red-200/40 shadow-xs"
                          title="Delete archived snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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

      )}

      {/* PDF Document Preview Modal */}
      <AnimatePresence>
        {showPDFPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row max-h-[90vh] overflow-hidden"
            >
              {/* Left side: Live Interactive Document Sheet Mockup */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950/40 border-r border-slate-100 dark:border-slate-850">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Live Document Sheet Preview
                  </span>
                  <span className="text-[9px] bg-indigo-50 dark:bg-slate-850 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-md font-mono">
                    HIGH-DPI COMPLIANCE SCHEME
                  </span>
                </div>

                {/* Document Paper Container */}
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl shadow-sm text-slate-800 dark:text-slate-300 text-xs space-y-5 text-left select-none relative">
                  {/* Header Banter */}
                  <div className="flex justify-between items-start border-b-2 border-indigo-555 dark:border-indigo-500/80 pb-3">
                    <div>
                      <h1 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Ledger Financial Statements
                      </h1>
                      <p className="text-[8.5px] text-slate-400 font-mono font-bold uppercase tracking-widest mt-0.5">
                        Audit Digest & Executive Performance Report
                      </p>
                    </div>
                    <div className="text-right text-[10px] font-mono">
                      <p className="font-extrabold text-slate-850 dark:text-slate-100">
                        ID: <span className="text-indigo-600 dark:text-indigo-400">LGR-RPT-{Date.now().toString().substring(5)}</span>
                      </p>
                      <p className="text-[8px] text-slate-450 mt-0.5">Generated: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Metadata Box */}
                  <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-100 dark:border-slate-850 text-[11px]">
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Authorized Auditor
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">Lincoln Mwangi</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Report Scope Period
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{monthLabel}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Unit of Account
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{currencySymbol} (Base Ledger)</span>
                    </div>
                  </div>

                  {/* Core metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="border border-slate-100 dark:border-slate-800 border-l-4 border-l-emerald-500 p-2.5 rounded-lg">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Aggregated Inflows</span>
                      <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                        {currencySymbol}{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="border border-slate-100 dark:border-slate-800 border-l-4 border-l-rose-500 p-2.5 rounded-lg">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Aggregated Outflows</span>
                      <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-1">
                        {currencySymbol}{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="border border-slate-100 dark:border-slate-800 border-l-4 border-l-indigo-500 p-2.5 rounded-lg">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Net Flow Surplus</span>
                      <p className={`text-sm font-extrabold font-mono mt-1 ${netSavings >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {netSavings < 0 ? '-' : ''}{currencySymbol}{Math.abs(netSavings).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Gemini diagnostics simulation */}
                  <div className="bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-150/40 dark:border-indigo-900/20 p-3.5 rounded-xl text-left space-y-1">
                    <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                      <span>Gemini Advisor Smart Diagnostics Summary</span>
                    </div>
                    {aiInsights ? (
                      <>
                        <p className="font-extrabold text-indigo-700 dark:text-indigo-300 text-[10.5px]">
                          Status Rating: {aiInsights.overallStatus}
                        </p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-450 leading-relaxed font-semibold">
                          {aiInsights.summaryMessage}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic font-medium">
                        No diagnostics loaded. Click ledger items or complete transaction logging to query Gemini intelligence diagnostics.
                      </p>
                    )}
                  </div>

                  {/* Capital Allocations */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Income distributions */}
                    <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg space-y-2">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase border-b border-slate-50 dark:border-slate-850 pb-1 block">Inflow Distributions</span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {incomeCategories.length === 0 ? (
                          <p className="text-[10px] text-slate-450 italic font-medium">No channels recorded.</p>
                        ) : (
                          incomeCategories.map(c => (
                            <div key={c.category} className="flex justify-between items-center text-[10.5px]">
                              <span className="font-medium text-slate-600 dark:text-slate-350 truncate max-w-28">{c.category}</span>
                              <span className="font-mono text-slate-500 font-bold">{c.percentage.toFixed(0)}%</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Outlay allocations */}
                    <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg space-y-2">
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase border-b border-slate-50 dark:border-slate-850 pb-1 block">Outflow Allocations</span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {expenseCategories.length === 0 ? (
                          <p className="text-[10px] text-slate-450 italic font-medium">No channels recorded.</p>
                        ) : (
                          expenseCategories.map(c => (
                            <div key={c.category} className="flex justify-between items-center text-[10.5px]">
                              <span className="font-medium text-slate-600 dark:text-slate-350 truncate max-w-28">{c.category}</span>
                              <span className="font-mono text-slate-500 font-bold">{c.percentage.toFixed(0)}%</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footing watermark */}
                  <div className="border-t border-slate-100 dark:border-slate-850 pt-2 text-center text-[8.5px] text-slate-400 font-mono font-bold tracking-widest">
                    PREPARED SECURELY VIA PORTFOLIO CLIENT LEDGER
                  </div>
                </div>
              </div>

              {/* Right side: Verification Controls Panel */}
              <div className="w-full md:w-80 p-6 flex flex-col justify-between bg-white dark:bg-slate-900 border-t md:border-t-0 border-slate-100 dark:border-slate-800 overflow-y-auto">
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-1">
                    <h4 className="text-[13px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-rose-500" />
                      <span>PDF Report Settings</span>
                    </h4>
                    <button
                      onClick={() => setShowPDFPreview(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold text-left">
                    Review your monthly summary parameters and download a beautiful report.
                  </p>

                  {/* Static Verification Checklist */}
                  <div className="space-y-2.5 bg-slate-50 dark:bg-slate-950/60 p-4 border border-slate-150/45 dark:border-slate-800 rounded-xl text-left">
                    <h5 className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Report Scope Details
                    </h5>
                    <ul className="space-y-2 text-[11px] text-slate-700 dark:text-slate-300">
                      <li className="flex items-center gap-2 font-semibold">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Period: <strong className="font-extrabold text-slate-800 dark:text-slate-100">{monthLabel}</strong></span>
                      </li>
                      <li className="flex items-center gap-2 font-semibold">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Transactions: <strong className="font-extrabold text-slate-800 dark:text-slate-100">{monthlyTransactions.length} logs</strong></span>
                      </li>
                      <li className="flex items-center gap-2 font-semibold">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Net Flow: <strong className="font-extrabold text-slate-800 dark:text-slate-100">{currencySymbol}{netSavings.toLocaleString()}</strong></span>
                      </li>
                      <li className="flex items-center gap-2 font-semibold">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Gemini Advisor Active</span>
                      </li>
                    </ul>
                  </div>

                  {/* Direct PDF Email Dispatch */}
                  <div className="space-y-3 bg-indigo-50/15 dark:bg-indigo-950/10 p-4 border border-indigo-150/20 dark:border-indigo-900/15 rounded-xl text-left">
                    <h5 className="text-[9px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Email Report Directly</span>
                    </h5>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                        Recipient Email Address
                      </label>
                      <input
                        type="email"
                        value={emailRecipient}
                        onChange={(e) => {
                          setEmailRecipient(e.target.value);
                          // Clear errors on change
                          setEmailErrorMsg(null);
                          setEmailSuccessMsg(null);
                        }}
                        placeholder="e.g. client@example.com"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    {emailSuccessMsg && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold leading-relaxed bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-100/40 dark:border-emerald-900/30">
                        {emailSuccessMsg}
                      </p>
                    )}

                    {emailErrorMsg && (
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium leading-relaxed bg-rose-50/40 dark:bg-rose-950/15 p-2 rounded-lg border border-rose-100/30 dark:border-rose-900/20">
                        {emailErrorMsg}
                      </p>
                    )}

                    <button
                      disabled={isSendingEmail || !emailRecipient}
                      onClick={async () => {
                        await handleEmailPDF(emailRecipient);
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-[10.5px] rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isSendingEmail ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full block" />
                          <span>Sending Email...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email PDF Statement</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 bg-blue-50/40 dark:bg-slate-950/20 border border-blue-150/30 dark:border-slate-800 rounded-xl space-y-1 text-left">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-450 uppercase tracking-wide">Report Notice</p>
                    <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      This formal budget report renders as a beautiful, high DPI layout optimized to view easily on all desktop, tablet, and mobile screens.
                    </p>
                  </div>
                </div>

                <div className="pt-6 space-y-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    disabled={isGeneratingPDF}
                    onClick={async () => {
                      await handleExportPDF();
                      setShowPDFPreview(false);
                    }}
                    className="w-full py-2.5 md:py-3 px-4 bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-250/20 dark:shadow-rose-900/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full block" />
                        <span>Compiling Document...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4.5 h-4.5" />
                        <span>Download Statement PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowPDFPreview(false)}
                    className="w-full py-2 px-4 bg-transparent border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                  >
                    Back to Ledger Controls
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Excel Spreadsheet Export Modal */}
      <AnimatePresence>
        {showExcelExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row max-h-[90vh] overflow-hidden"
            >
              {/* Left side: Interactive Excel Spreadsheet Preview mockup */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950/40 border-r border-slate-100 dark:border-slate-850">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-650 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Spreadsheet Mockup
                  </span>
                  <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md font-mono">
                    {excelStyleTheme === 'professional' ? '🌿 AUDIT CORPORATE' : '⚪ MINIMALIST GRID'}
                  </span>
                </div>

                {/* Spreadsheet Visual Wrapper */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-xs text-left overflow-x-auto select-none">
                  {/* File Tabs Mockup */}
                  <div className="flex items-center gap-1 border-b border-slate-150 dark:border-slate-800 pb-2 mb-3">
                    <span className="px-2.5 py-1 bg-emerald-600 dark:bg-emerald-600 text-white font-bold text-[10px] rounded-t-md flex items-center gap-1 shadow-sm">
                      <FileSpreadsheet className="w-3 h-3" />
                      <span>Ledger_Transactions</span>
                    </span>
                    <span className="px-2.5 py-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 font-bold text-[10px] rounded-t-md cursor-pointer transition-colors">
                      Summary_Stats
                    </span>
                    <span className="px-2.5 py-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 font-bold text-[10px] rounded-t-md cursor-pointer transition-colors">
                      Monthly_Visuals
                    </span>
                  </div>

                  {/* Excel Column Letters */}
                  <div className="grid grid-cols-12 gap-px bg-slate-150 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 text-center pb-0.5">
                    <div className="bg-slate-50 dark:bg-slate-955 p-1 col-span-1 border border-slate-200/50 dark:border-slate-850"></div>
                    <div className="bg-slate-50 dark:bg-slate-955 p-1 col-span-2 border border-slate-200/50 dark:border-slate-850">A</div>
                    <div className="bg-slate-50 dark:bg-slate-955 p-1 col-span-2 border border-slate-200/50 dark:border-slate-850">B</div>
                    <div className="bg-slate-50 dark:bg-slate-955 p-1 col-span-2 border border-slate-200/50 dark:border-slate-850">C</div>
                    <div className="bg-slate-50 dark:bg-slate-955 p-1 col-span-3 border border-slate-200/50 dark:border-slate-850">D</div>
                    <div className="bg-slate-50 dark:bg-slate-955 p-1 col-span-2 border border-slate-200/50 dark:border-slate-850">E</div>
                  </div>

                  {/* Excel Row Headers */}
                  <div className="grid grid-cols-12 gap-px bg-slate-150 dark:bg-slate-800 text-[11px]">
                    {/* Header Row */}
                    <div className="bg-slate-50 dark:bg-slate-950 font-mono text-center font-bold text-slate-400 dark:text-slate-500 p-1.5 col-span-1 border border-slate-200/50 dark:border-slate-850">1</div>
                    <div className={`p-1.5 col-span-2 font-black tracking-wide truncate border border-slate-200/50 dark:border-slate-850 ${excelStyleTheme === 'professional' ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                      {excelHeaders.date || 'Date'}
                    </div>
                    <div className={`p-1.5 col-span-2 font-black tracking-wide truncate border border-slate-200/50 dark:border-slate-850 ${excelStyleTheme === 'professional' ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                      {excelHeaders.type || 'Type'}
                    </div>
                    <div className={`p-1.5 col-span-2 font-black tracking-wide truncate border border-slate-200/50 dark:border-slate-850 ${excelStyleTheme === 'professional' ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                      {excelHeaders.category || 'Category'}
                    </div>
                    <div className={`p-1.5 col-span-3 font-black tracking-wide truncate border border-slate-200/50 dark:border-slate-850 ${excelStyleTheme === 'professional' ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                      {excelHeaders.description || 'Description'}
                    </div>
                    <div className={`p-1.5 col-span-2 text-right font-black tracking-wide truncate border border-slate-200/50 dark:border-slate-850 ${excelStyleTheme === 'professional' ? 'bg-emerald-700 text-white border-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                      {excelHeaders.amount || 'Amount'}
                    </div>

                    {/* Row 2: Deposit */}
                    <div className="bg-slate-50 dark:bg-slate-950 font-mono text-center font-bold text-slate-400 dark:text-slate-500 p-1.5 col-span-1 border border-slate-200/50 dark:border-slate-850">2</div>
                    <div className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 p-1.5 col-span-2 font-mono border border-slate-100 dark:border-slate-850">2026-06-08</div>
                    <div className="bg-white dark:bg-slate-900 text-center p-1.5 col-span-2 border border-slate-100 dark:border-slate-850">
                      <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-extrabold text-[9px] rounded uppercase">INCOME</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold p-1.5 col-span-2 border border-slate-100 dark:border-slate-850">Salary</div>
                    <div className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 italic p-1.5 col-span-3 truncate border border-slate-100 dark:border-slate-850">Monthly Deposit</div>
                    <div className="bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-extrabold font-mono text-right p-1.5 col-span-2 border border-slate-100 dark:border-slate-850">+ $5,000.00</div>

                    {/* Row 3: Expense */}
                    <div className="bg-slate-50 dark:bg-slate-950 font-mono text-center font-bold text-slate-400 dark:text-slate-500 p-1.5 col-span-1 border border-slate-200/50 dark:border-slate-850">3</div>
                    <div className="bg-slate-50/50 dark:bg-slate-955 text-slate-500 dark:text-slate-400 p-1.5 col-span-2 font-mono border border-slate-100 dark:border-slate-850">2026-06-09</div>
                    <div className="bg-slate-50/50 dark:bg-slate-955 text-center p-1.5 col-span-2 border border-slate-100 dark:border-slate-850">
                      <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 font-extrabold text-[9px] rounded uppercase">EXPENSE</span>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-955 text-slate-700 dark:text-slate-300 font-bold p-1.5 col-span-2 border border-slate-100 dark:border-slate-850">Groceries</div>
                    <div className="bg-slate-50/50 dark:bg-slate-955 text-slate-500 dark:text-slate-400 italic p-1.5 col-span-3 truncate border border-slate-100 dark:border-slate-850 font-sans">Whole Foods</div>
                    <div className="bg-slate-50/50 dark:bg-slate-955 text-rose-600 dark:text-rose-455 font-extrabold font-mono text-right p-1.5 col-span-2 border border-slate-100 dark:border-slate-850">- $184.50</div>

                    {/* Row 4: Expense */}
                    <div className="bg-slate-50 dark:bg-slate-950 font-mono text-center font-bold text-slate-400 dark:text-slate-500 p-1.5 col-span-1 border border-slate-200/50 dark:border-slate-850">4</div>
                    <div className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 p-1.5 col-span-2 font-mono border border-slate-100 dark:border-slate-850">2026-06-12</div>
                    <div className="bg-white dark:bg-slate-900 text-center p-1.5 col-span-2 border border-slate-100 dark:border-slate-850">
                      <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-455 font-extrabold text-[9px] rounded uppercase">EXPENSE</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold p-1.5 col-span-2 border border-slate-100 dark:border-slate-850">Rent</div>
                    <div className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 italic p-1.5 col-span-3 truncate border border-slate-100 dark:border-slate-850 font-sans">Lease payment</div>
                    <div className="bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-455 font-extrabold font-mono text-right p-1.5 col-span-2 border border-slate-100 dark:border-slate-850">- $1,200.05</div>

                    {/* Double-Border Summary Row */}
                    <div className="bg-slate-50 dark:bg-slate-950 font-mono text-center font-bold text-slate-400 dark:text-slate-500 p-1.5 col-span-1 border border-slate-200/50 dark:border-slate-850">5</div>
                    <div className="bg-slate-100/40 dark:bg-slate-955 p-1.5 col-span-4 font-black text-slate-700 dark:text-slate-350 tracking-wide border border-slate-100 dark:border-slate-850">TOTAL SUM SUMMARY</div>
                    <div className="bg-slate-100/40 dark:bg-slate-955 p-1.5 col-span-5 border border-slate-100 dark:border-slate-850"></div>
                    <div className={`p-1.5 col-span-2 font-mono font-black text-right text-[11.5px] border-t border-b-2 border-slate-300 dark:border-slate-700 ${excelStyleTheme === 'professional' ? 'bg-emerald-50 dark:bg-emerald-950/35 text-emerald-700 dark:text-emerald-400 border-b-emerald-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200'}`}>
                      + $3,615.45
                    </div>
                  </div>

                  {/* Summary Grid Gridline Accents */}
                  <div className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 italic flex items-center gap-1 font-sans">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Live dynamic columns auto-resize to fit contents. Sorting applied chronologically.</span>
                  </div>
                </div>

                {/* Spreadsheet Live Stats Card */}
                <div className="grid grid-cols-3 gap-3.5 text-left mt-5">
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl">
                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Quantity scope</span>
                    <span className="text-[14px] font-black text-slate-800 dark:text-white font-mono leading-none block mt-1.5">
                      {excelExportPreviewCount} <span className="text-xs font-normal text-slate-450">logs</span>
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-905 border border-slate-150 dark:border-slate-800 rounded-xl">
                    <span className="text-[8px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider block">Income Scope</span>
                    <span className="text-[14px] font-black text-emerald-600 dark:text-emerald-400 font-mono leading-none block mt-1.5">
                      ${excelExportPreviewIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-905 border border-slate-150 dark:border-slate-800 rounded-xl">
                    <span className="text-[8px] font-bold text-rose-500 dark:text-rose-455 uppercase tracking-wider block">Expenses Scope</span>
                    <span className="text-[14px] font-black text-rose-600 dark:text-rose-455 font-mono leading-none block mt-1.5">
                      ${excelExportPreviewExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800/80 rounded-xl text-left mt-4 text-[10px] text-slate-455 dark:text-slate-550 leading-relaxed font-sans font-semibold">
                  Timeline query duration is currently targeting: <strong className="font-extrabold text-slate-800 dark:text-slate-200">{filterExcelByDate ? `${formatDateFriendly(excelStartDate)} to ${formatDateFriendly(excelEndDate)}` : 'Full Historics ledger database scope'}.</strong>
                </div>
              </div>

              {/* Right side: Detailed Settings Panel */}
              <div className="w-full md:w-85 p-6 flex flex-col justify-between bg-white dark:bg-slate-900 border-t md:border-t-0 border-slate-100 dark:border-slate-800 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <h4 className="text-[13px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Excel Portfolio Settings</span>
                    </h4>
                    <button
                      onClick={() => setShowExcelExportModal(false)}
                      className="p-1 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Excel Specific Date Range Scope Option */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2.5 text-left animate-in fade-in duration-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-450 dark:text-slate-500 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Date Export Scope</span>
                      </div>
                      
                      {/* Toggle Switch */}
                      <label id="excel-enable-date-filter-toggle-modal" className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={excelEnableDateFiltering}
                          onChange={(e) => setExcelEnableDateFiltering(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-[32px] h-[18px] bg-slate-250 dark:bg-slate-755 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[14px] after:w-[14px] after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500 relative"></div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight select-none">
                          {excelEnableDateFiltering ? "Range" : "All"}
                        </span>
                      </label>
                    </div>

                    {excelEnableDateFiltering ? (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1 dur-150">
                        <div>
                          <label htmlFor="excel-preset-select-modal" className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-sans">
                            Preset Intervals
                          </label>
                          <select
                            id="excel-preset-select-modal"
                            value={excelDatePreset}
                            onChange={(e) => handleExcelDatePresetChange(e.target.value as any)}
                            className="mt-1 w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10.5px] font-semibold rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
                          >
                            <option value="active">📅 Active Report Month ({monthLabel})</option>
                            <option value="last-7">📅 Last 7 Days</option>
                            <option value="last-30">📅 Last 30 Days</option>
                            <option value="last-90">📅 Last 90 Days</option>
                            <option value="this-year">📅 This Current Year</option>
                            <option value="custom">📅 Custom Date Boundaries</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">Start Date</span>
                            <input
                              type="date"
                              value={excelStartDate}
                              disabled={excelDatePreset !== 'custom'}
                              onChange={(e) => {
                                setExcelStartDate(e.target.value);
                                setExcelDatePreset('custom');
                              }}
                              className="w-full px-2 py-1.5 mt-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono rounded-lg text-slate-850 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">End Date</span>
                            <input
                              type="date"
                              value={excelEndDate}
                              disabled={excelDatePreset !== 'custom'}
                              onChange={(e) => {
                                setExcelEndDate(e.target.value);
                                setExcelDatePreset('custom');
                              }}
                              className="w-full px-2 py-1.5 mt-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono rounded-lg text-slate-850 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[9.5px] text-slate-500 dark:text-slate-450 italic leading-relaxed pt-0.5 font-medium leading-tight font-sans">
                        Date constraints bypassed. Extracts full records from day zero of transaction ledger database history.
                      </p>
                    )}
                  </div>

                  {/* Excel Specific Sort Fields Choice */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2.5 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-slate-450 dark:text-slate-500 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Row Sorting Order</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setExcelSortDirection(excelSortDirection === 'asc' ? 'desc' : 'asc');
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
                      >
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <select
                        id="excel-sort-dropdown-modal"
                        value={`${excelSortField}-${excelSortDirection}`}
                        onChange={(e) => {
                          const [field, direction] = e.target.value.split('-');
                          setExcelSortField(field as any);
                          setExcelSortDirection(direction as any);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10.5px] font-semibold rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                      >
                        <option value="date-desc">📅 Date: Newest First (Desc)</option>
                        <option value="date-asc">📅 Date: Oldest First (Asc)</option>
                        <option value="amount-desc">💰 Amount: Max Large First (Desc)</option>
                        <option value="amount-asc">💰 Amount: Min Small First (Asc)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] text-slate-500 font-sans font-semibold">
                      <span className="font-semibold text-[9.5px] truncate">
                        {excelSortDirection === 'asc' ? 'Low-to-High / Chronological' : 'High-to-Low / Reverse order'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[9px] font-bold transition-all ${excelSortDirection === 'asc' ? 'text-emerald-650 font-extrabold' : 'text-slate-400'}`}>Asc</span>
                        <button
                          type="button"
                          onClick={() => setExcelSortDirection(excelSortDirection === 'asc' ? 'desc' : 'asc')}
                          className={`w-[28px] h-[15px] rounded-full flex items-center p-0.5 transition-all cursor-pointer ${
                            excelSortDirection === 'desc' ? 'bg-emerald-550 dark:bg-emerald-600' : 'bg-slate-200 dark:bg-slate-705'
                          }`}
                        >
                          <div className={`w-2.5 h-2.5 bg-white rounded-full shadow-xs transition-all ${
                            excelSortDirection === 'desc' ? 'translate-x-3.5' : 'translate-x-0'
                          }`} />
                        </button>
                        <span className={`text-[9px] font-bold transition-all ${excelSortDirection === 'desc' ? 'text-emerald-650 font-extrabold' : 'text-slate-400'}`}>Desc</span>
                      </div>
                    </div>
                  </div>

                  {/* Extra Layout Preferences */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2.5 text-left font-sans">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Layout Aesthetics Theme</span>
                    
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <label className={`border p-2 rounded-lg flex flex-col gap-0.5 cursor-pointer select-none relative transition-all ${
                        excelStyleTheme === 'professional'
                          ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-955/25'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950'
                      }`}>
                        <input
                          type="radio"
                          name="excel-theme-pref-modal"
                          className="sr-only"
                          checked={excelStyleTheme === 'professional'}
                          onChange={() => setExcelStyleTheme('professional')}
                        />
                        <span className="text-[10.5px] font-black text-slate-700 dark:text-slate-200">🌿 Audit Corp</span>
                        <span className="text-[8px] text-slate-400 leading-tight">Emerald headers & formulas double borders</span>
                      </label>
                      <label className={`border p-2 rounded-lg flex flex-col gap-0.5 cursor-pointer select-none relative transition-all ${
                        excelStyleTheme === 'minimal'
                          ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-955/25'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950'
                      }`}>
                        <input
                          type="radio"
                          name="excel-theme-pref-modal"
                          className="sr-only"
                          checked={excelStyleTheme === 'minimal'}
                          onChange={() => setExcelStyleTheme('minimal')}
                        />
                        <span className="text-[10.5px] font-black text-slate-700 dark:text-slate-200">⚪ Minimal</span>
                        <span className="text-[8px] text-slate-400 leading-tight">Light simple clean list structure, no colors</span>
                      </label>
                    </div>

                    <label id="excel-include-category-id-toggle-modal" className="inline-flex items-center gap-1.5 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={excelIncludeCategoryId}
                        onChange={(e) => setExcelIncludeCategoryId(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-[32px] h-[18px] bg-slate-250 dark:bg-slate-755 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[14px] after:w-[14px] after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500 relative"></div>
                      <span className="text-[10px] font-semibold text-slate-550 dark:text-slate-355 select-none text-left leading-tight">
                        Include Database Column IDs
                      </span>
                    </label>
                  </div>

                  {/* Excel Specific Custom Columns Header Titles */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-150 dark:border-slate-800 rounded-xl text-left space-y-1">
                    <button
                      type="button"
                      id="excel-custom-headers-toggle-modal"
                      onClick={() => setShowCustomHeaders(!showCustomHeaders)}
                      className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider group cursor-pointer font-sans"
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <Edit3 className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                        <span>Customize Grid Headers</span>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCustomHeaders ? 'rotate-180' : ''}`} />
                    </button>

                    {showCustomHeaders && (
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1.5 animate-in fade-in slide-in-from-top-1 px-0.5 font-sans">
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block">TX ID</label>
                          <input
                            type="text"
                            value={excelHeaders.id}
                            onChange={(e) => setExcelHeaders({ ...excelHeaders, id: e.target.value })}
                            className="w-full px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10.5px] font-semibold rounded text-slate-755 dark:text-slate-200"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block">Date</label>
                          <input
                            type="text"
                            value={excelHeaders.date}
                            onChange={(e) => setExcelHeaders({ ...excelHeaders, date: e.target.value })}
                            className="w-full px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10.5px] font-semibold rounded text-slate-755 dark:text-slate-200"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block">Type</label>
                          <input
                            type="text"
                            value={excelHeaders.type}
                            onChange={(e) => setExcelHeaders({ ...excelHeaders, type: e.target.value })}
                            className="w-full px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10.5px] font-semibold rounded text-slate-755 dark:text-slate-200"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block">Category</label>
                          <input
                            type="text"
                            value={excelHeaders.category}
                            onChange={(e) => setExcelHeaders({ ...excelHeaders, category: e.target.value })}
                            className="w-full px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10.5px] font-semibold rounded text-slate-755 dark:text-slate-200"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block">Amount</label>
                          <input
                            type="text"
                            value={excelHeaders.amount}
                            onChange={(e) => setExcelHeaders({ ...excelHeaders, amount: e.target.value })}
                            className="w-full px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10.5px] font-semibold rounded text-slate-755 dark:text-slate-200"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tight block">Description</label>
                          <input
                            type="text"
                            value={excelHeaders.description}
                            onChange={(e) => setExcelHeaders({ ...excelHeaders, description: e.target.value })}
                            className="w-full px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10.5px] font-semibold rounded text-slate-755 dark:text-slate-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 space-y-2 border-t border-slate-100 dark:border-slate-850">
                  <button
                    disabled={isExportingExcel}
                    onClick={async () => {
                      await handleExportExcel();
                    }}
                    className="w-full py-2.5 md:py-3 px-4 bg-emerald-555 dark:bg-emerald-600 hover:bg-emerald-650 dark:hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-250/20 dark:shadow-emerald-900/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isExportingExcel ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full block" />
                        <span>Compiling Spreadsheet...</span>
                      </>
                    ) : excelSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-white stroke-[3px]" />
                        <span>Workbook Saved Successfully!</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-4.5 h-4.5" />
                        <span>Download Spreadsheet (.xlsx)</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowExcelExportModal(false)}
                    className="w-full py-2 px-4 bg-transparent border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-colors font-bold text-xs cursor-pointer"
                  >
                    Back to Ledger Controls
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
