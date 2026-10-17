import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  Transaction,
  Budget,
  Account,
  AssetItem,
  LiabilityItem,
} from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { useUIModal } from '../context/UIModalContext';
import {
  initGoogleAuth,
  googleSignIn,
  googleLogout,
  getGoogleAccessToken,
  getCurrentGoogleUser,
  findMasterWorkbook,
  listUserSpreadsheets,
  getSpreadsheetMetadata,
  provisionMasterWorkbook,
  pushAllToMasterSheet,
  pushTabToMasterSheet,
  pullFromMasterSheet,
  generateFormattedReportTab,
  deleteDriveSpreadsheet,
  DriveSpreadsheetFile,
  SpreadsheetMetadata,
  MASTER_WORKBOOK_TITLE,
  REQUIRED_TAB_TITLES,
  SyncTabKey,
} from '../services/googleWorkspace';
import {
  FileSpreadsheet,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  ExternalLink,
  CheckCircle2,
  FolderOpen,
  Sparkles,
  Trash2,
  Link2,
  Plus,
  LogOut,
  ShieldCheck,
  Layers,
  Receipt,
  Scale,
  WalletCards,
  TrendingUp,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface GoogleSheetsHubProps {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  assets: AssetItem[];
  liabilities: LiabilityItem[];
  currencySymbol: string;
  selectedPeriod: string;
  onReplaceTransactions: (txs: Transaction[]) => Promise<void> | void;
  onReplaceBudgets: (budgets: Budget[]) => Promise<void> | void;
  onReplaceAccounts: (accounts: Account[]) => void;
  onReplaceAssets: (assets: AssetItem[]) => void;
  onReplaceLiabilities: (liabilities: LiabilityItem[]) => void;
}

interface SyncHistoryEntry {
  id: string;
  timestamp: string;
  direction: 'push' | 'pull' | 'report' | 'provision';
  summary: string;
}

export default function GoogleSheetsHub({
  transactions,
  budgets,
  accounts,
  assets,
  liabilities,
  currencySymbol,
  selectedPeriod,
  onReplaceTransactions,
  onReplaceBudgets,
  onReplaceAccounts,
  onReplaceAssets,
  onReplaceLiabilities,
}: GoogleSheetsHubProps) {
  const { confirmAction, showToast } = useUIModal();

  const [googleUser, setGoogleUser] = useState<User | null>(() => getCurrentGoogleUser());
  const [token, setToken] = useState<string | null>(() => getGoogleAccessToken());
  const [needsAuth, setNeedsAuth] = useState<boolean>(() => !getGoogleAccessToken());
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [masterMeta, setMasterMeta] = useState<SpreadsheetMetadata | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportPeriodInput, setReportPeriodInput] = useState<string>(
    selectedPeriod === 'all' ? new Date().toISOString().substring(0, 7) : selectedPeriod
  );

  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('fin_tracker_sheets_sync_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const appendHistory = useCallback(
    (direction: SyncHistoryEntry['direction'], summary: string) => {
      const entry: SyncHistoryEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        direction,
        summary,
      };
      setSyncHistory((prev) => {
        const next = [entry, ...prev].slice(0, 12);
        try {
          localStorage.setItem('fin_tracker_sheets_sync_history', JSON.stringify(next));
        } catch (_) {}
        return next;
      });
    },
    []
  );

  const payload = {
    transactions,
    budgets,
    accounts,
    assets,
    liabilities,
    currencySymbol,
    selectedPeriod,
  };

  // Discover or load bound Master Workbook from Google Drive
  const discoverWorkspace = useCallback(async () => {
    if (!getGoogleAccessToken()) {
      setNeedsAuth(true);
      return;
    }
    setIsDiscovering(true);
    setErrorMessage(null);
    try {
      const files = await listUserSpreadsheets(15);
      setDriveFiles(files);

      const storedSheetId = localStorage.getItem('fin_tracker_master_sheet_id');
      let targetId: string | null = null;

      if (storedSheetId && files.some((f) => f.id === storedSheetId)) {
        targetId = storedSheetId;
      } else {
        const foundMaster = await findMasterWorkbook();
        if (foundMaster) {
          targetId = foundMaster.id;
          localStorage.setItem('fin_tracker_master_sheet_id', foundMaster.id);
        }
      }

      if (targetId) {
        const meta = await getSpreadsheetMetadata(targetId);
        setMasterMeta(meta);
      } else {
        setMasterMeta(null);
      }
    } catch (err: any) {
      console.error('Google Drive discovery error:', err);
      if (err?.message?.includes('AUTH_REQUIRED')) {
        setNeedsAuth(true);
        setToken(null);
      } else {
        setErrorMessage(err?.message || 'Unable to inspect Google Drive spreadsheets.');
      }
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (usr, accessToken) => {
        setGoogleUser(usr);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      (usr) => {
        setGoogleUser(usr || null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (token && !needsAuth) {
      discoverWorkspace();
    }
  }, [token, needsAuth, discoverWorkspace]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      setGoogleUser(result.user);
      setToken(result.accessToken);
      setNeedsAuth(false);
      showToast('Connected to Google Sheets & Google Drive!', 'success');
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setErrorMessage(err?.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleLogout();
    setGoogleUser(null);
    setToken(null);
    setNeedsAuth(true);
    setMasterMeta(null);
    showToast('Disconnected from Google Workspace.', 'info');
  };

  // Provision Master Workbook
  const handleCreateMasterWorkbook = async () => {
    const confirmed = await confirmAction({
      title: 'Create Master Financial Workbook in Google Drive',
      message: `This will create "${MASTER_WORKBOOK_TITLE}" in your Google Drive with 5 formatted tabs (Overview, Transactions, Budgets, Accounts, and Net Worth) and populate it with your current Ledger Smart data (${transactions.length} transactions, ${budgets.length} budgets, ${accounts.length} accounts).`,
      confirmLabel: 'Create & Sync Workbook',
      variant: 'info',
    });
    if (!confirmed) return;

    setActiveOperation('provision');
    setErrorMessage(null);
    try {
      const meta = await provisionMasterWorkbook(payload);
      localStorage.setItem('fin_tracker_master_sheet_id', meta.spreadsheetId);
      setMasterMeta(meta);
      const files = await listUserSpreadsheets(15);
      setDriveFiles(files);
      appendHistory(
        'provision',
        `Created "${meta.title}" with 5 tabs and initial financial dataset.`
      );
      showToast('Master Financial Workbook created and synced in Google Drive!', 'success');
    } catch (err: any) {
      if (err?.message?.includes('AUTH_REQUIRED')) setNeedsAuth(true);
      setErrorMessage(err?.message || 'Failed to provision Master Financial Workbook.');
    } finally {
      setActiveOperation(null);
    }
  };

  // Push All Modules to Master Workbook
  const handlePushAll = async () => {
    if (!masterMeta) return;
    const totalRecords =
      transactions.length + budgets.length + accounts.length + assets.length + liabilities.length;

    const confirmed = await confirmAction({
      title: 'Push All Financial Data to Google Sheets',
      message: `Are you sure you want to update "${masterMeta.title}" across all 5 tabs? This will write ${transactions.length} transactions, ${budgets.length} budgets, ${accounts.length} accounts, and ${assets.length + liabilities.length} net worth items (${totalRecords} total records).`,
      confirmLabel: 'Push All to Sheets',
      variant: 'warning',
    });
    if (!confirmed) return;

    setActiveOperation('push-all');
    setErrorMessage(null);
    try {
      const res = await pushAllToMasterSheet(masterMeta.spreadsheetId, payload);
      const updatedMeta = await getSpreadsheetMetadata(masterMeta.spreadsheetId);
      setMasterMeta(updatedMeta);
      appendHistory(
        'push',
        `Pushed all 5 tabs (${res.totalRowsWritten} records) to "${masterMeta.title}".`
      );
      showToast(`Synced ${res.totalRowsWritten} records across all 5 tabs in Google Sheets!`, 'success');
    } catch (err: any) {
      if (err?.message?.includes('AUTH_REQUIRED')) setNeedsAuth(true);
      setErrorMessage(err?.message || 'Failed to push data to Google Sheets.');
    } finally {
      setActiveOperation(null);
    }
  };

  // Push Single Tab
  const handlePushSingleTab = async (tabKey: SyncTabKey, countDesc: string) => {
    if (!masterMeta) return;
    const tabTitle = REQUIRED_TAB_TITLES[tabKey];

    const confirmed = await confirmAction({
      title: `Update "${tabTitle}" Tab in Google Sheets`,
      message: `Overwrite the "${tabTitle}" tab in "${masterMeta.title}" with ${countDesc} from Ledger Smart?`,
      confirmLabel: `Sync ${tabTitle}`,
      variant: 'warning',
    });
    if (!confirmed) return;

    setActiveOperation(`push-${tabKey}`);
    setErrorMessage(null);
    try {
      const res = await pushTabToMasterSheet(masterMeta.spreadsheetId, tabKey, payload);
      // Also refresh Overview & Summary formulas so KPIs stay accurate
      if (tabKey !== 'overview') {
        await pushTabToMasterSheet(masterMeta.spreadsheetId, 'overview', payload);
      }
      appendHistory('push', `Updated "${res.tabTitle}" (${res.updatedRows} rows) in Google Sheets.`);
      showToast(`Synced ${res.updatedRows} rows to "${res.tabTitle}" tab!`, 'success');
    } catch (err: any) {
      if (err?.message?.includes('AUTH_REQUIRED')) setNeedsAuth(true);
      setErrorMessage(err?.message || `Failed to sync ${tabTitle}.`);
    } finally {
      setActiveOperation(null);
    }
  };

  // Two-Way Pull from Google Sheets back into Ledger Smart
  const handlePullFromSheets = async (targetScope: 'all' | 'transactions' | 'budgets' | 'accounts' | 'networth' = 'all') => {
    if (!masterMeta) return;
    setActiveOperation(`pull-${targetScope}`);
    setErrorMessage(null);

    try {
      const pulled = await pullFromMasterSheet(masterMeta.spreadsheetId);

      const summaryParts: string[] = [];
      if (targetScope === 'all' || targetScope === 'transactions') {
        summaryParts.push(`${pulled.transactions.length} transactions`);
      }
      if (targetScope === 'all' || targetScope === 'budgets') {
        summaryParts.push(`${pulled.budgets.length} category budgets`);
      }
      if (targetScope === 'all' || targetScope === 'accounts') {
        summaryParts.push(`${pulled.accounts.length} accounts`);
      }
      if (targetScope === 'all' || targetScope === 'networth') {
        summaryParts.push(`${pulled.assets.length} assets & ${pulled.liabilities.length} liabilities`);
      }

      const confirmed = await confirmAction({
        title: 'Pull & Merge Changes from Google Sheets',
        message: `Detected ${summaryParts.join(', ')} in "${masterMeta.title}". Apply these spreadsheet updates directly to your Ledger Smart workspace?`,
        confirmLabel: 'Apply Spreadsheet Data',
        variant: 'info',
      });

      if (!confirmed) {
        setActiveOperation(null);
        return;
      }

      if ((targetScope === 'all' || targetScope === 'transactions') && pulled.transactions.length > 0) {
        await onReplaceTransactions(pulled.transactions);
      }
      if ((targetScope === 'all' || targetScope === 'budgets') && pulled.budgets.length > 0) {
        await onReplaceBudgets(pulled.budgets);
      }
      if ((targetScope === 'all' || targetScope === 'accounts') && pulled.accounts.length > 0) {
        onReplaceAccounts(pulled.accounts);
      }
      if (targetScope === 'all' || targetScope === 'networth') {
        if (pulled.assets.length > 0) onReplaceAssets(pulled.assets);
        if (pulled.liabilities.length > 0) onReplaceLiabilities(pulled.liabilities);
      }

      appendHistory(
        'pull',
        `Pulled ${summaryParts.join(', ')} from Google Sheets into Ledger Smart.`
      );
      showToast('Successfully pulled live changes from Google Sheets!', 'success');
    } catch (err: any) {
      if (err?.message?.includes('AUTH_REQUIRED')) setNeedsAuth(true);
      setErrorMessage(err?.message || 'Failed to pull data from Google Sheets.');
    } finally {
      setActiveOperation(null);
    }
  };

  // Generate Formatted Executive Financial Report Tab
  const handleGenerateReportTab = async () => {
    if (!masterMeta) return;
    const label = reportPeriodInput || 'All-Time';

    const confirmed = await confirmAction({
      title: 'Generate Formatted Financial Report Tab',
      message: `Create or update the executive report tab "Report — ${label}" inside "${masterMeta.title}" with styled headers, category variance matrix, and live spreadsheet formulas?`,
      confirmLabel: 'Generate Report Tab',
      variant: 'info',
    });
    if (!confirmed) return;

    setActiveOperation('report');
    setErrorMessage(null);
    try {
      const res = await generateFormattedReportTab(masterMeta.spreadsheetId, label, {
        ...payload,
        selectedPeriod: label,
      });
      const updatedMeta = await getSpreadsheetMetadata(masterMeta.spreadsheetId);
      setMasterMeta(updatedMeta);
      appendHistory('report', `Generated formatted tab "${res.tabTitle}" (${res.rowCount} rows).`);
      showToast(`Created formatted report tab "${res.tabTitle}" in Google Sheets!`, 'success');
    } catch (err: any) {
      if (err?.message?.includes('AUTH_REQUIRED')) setNeedsAuth(true);
      setErrorMessage(err?.message || 'Failed to generate report tab.');
    } finally {
      setActiveOperation(null);
    }
  };

  // Link to an existing Spreadsheet from Drive list
  const handleLinkSpreadsheet = async (file: DriveSpreadsheetFile) => {
    const confirmed = await confirmAction({
      title: 'Switch Connected Master Workbook',
      message: `Link Ledger Smart to "${file.name}"? Required Ledger Smart tabs will be verified when you sync.`,
      confirmLabel: 'Link Spreadsheet',
      variant: 'info',
    });
    if (!confirmed) return;

    setActiveOperation(`link-${file.id}`);
    try {
      localStorage.setItem('fin_tracker_master_sheet_id', file.id);
      const meta = await getSpreadsheetMetadata(file.id);
      setMasterMeta(meta);
      showToast(`Linked to "${file.name}"`, 'success');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to link spreadsheet.');
    } finally {
      setActiveOperation(null);
    }
  };

  // Delete a spreadsheet in Google Drive (with mandatory confirmation)
  const handleDeleteSpreadsheet = async (file: DriveSpreadsheetFile) => {
    const confirmed = await confirmAction({
      title: 'Delete Spreadsheet from Google Drive',
      message: `Are you sure you want to permanently delete "${file.name}" from your Google Drive? This action cannot be undone.`,
      confirmLabel: 'Delete from Drive',
      variant: 'danger',
    });
    if (!confirmed) return;

    setActiveOperation(`delete-${file.id}`);
    try {
      await deleteDriveSpreadsheet(file.id);
      setDriveFiles((prev) => prev.filter((f) => f.id !== file.id));
      if (masterMeta?.spreadsheetId === file.id) {
        localStorage.removeItem('fin_tracker_master_sheet_id');
        setMasterMeta(null);
      }
      showToast(`Deleted "${file.name}" from Google Drive.`, 'info');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to delete spreadsheet from Google Drive.');
    } finally {
      setActiveOperation(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Google Sheets & Drive Live Sync Hub
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Two-way synchronization between Ledger Smart and your Master Financial Workbook in Google Drive
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!needsAuth && token ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-emerald-900 dark:text-emerald-200 truncate max-w-[180px]">
                  {googleUser?.email || 'Google Connected'}
                </span>
              </div>
              <button
                type="button"
                onClick={discoverWorkspace}
                disabled={isDiscovering}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin' : ''}`} />
                <span>Refresh Drive</span>
              </button>
              <button
                type="button"
                onClick={handleGoogleSignOut}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Google Workspace Sync Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Unauthenticated Gate: Official Sign in with Google Card */}
      {needsAuth || !token ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-6 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Connect Your Google Drive & Google Sheets
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              Sign in with your Google account to automatically manage your{' '}
              <strong className="text-slate-700 dark:text-slate-200">
                {MASTER_WORKBOOK_TITLE}
              </strong>
              , push live transactions, generate executive formula reports, and pull spreadsheet edits back into Ledger Smart.
            </p>
          </div>

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 shadow-xs font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="w-5 h-5 shrink-0">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="w-full h-full block"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span>{isLoggingIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">5-Tab Master Sheet</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Overview, Transactions, Budgets, Wallets & Net Worth
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Live Two-Way Sync</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Edit rows in Google Sheets and pull them back anytime
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Formula Reports</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Dynamic SUM & SUMIF executive statements
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Master Financial Workbook Status & Primary Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400">
                    Active Master Workbook
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {masterMeta ? masterMeta.title : 'No Master Workbook Provisioned Yet'}
                  </h3>
                </div>
                {masterMeta && (
                  <a
                    href={masterMeta.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs shrink-0"
                  >
                    <span>Open in Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {isDiscovering ? (
                <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                  <p className="text-xs font-mono">Inspecting Google Drive for Master Workbook...</p>
                </div>
              ) : !masterMeta ? (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-center space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                    We didn't find <strong className="font-semibold">{MASTER_WORKBOOK_TITLE}</strong> in your Google Drive yet. Provision it now with one click or link an existing spreadsheet below.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateMasterWorkbook}
                    disabled={activeOperation !== null}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {activeOperation === 'provision'
                        ? 'Provisioning 5-Tab Master Workbook...'
                        : 'Create Master Financial Workbook'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Detected Sheet Tabs */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        <span>Active Workbook Tabs ({masterMeta.sheets.length})</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ID: {masterMeta.spreadsheetId.slice(0, 14)}...
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {masterMeta.sheets.map((s) => (
                        <span
                          key={s.sheetId}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300"
                        >
                          {s.title}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Primary Master Sync Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handlePushAll}
                      disabled={activeOperation !== null}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>
                        {activeOperation === 'push-all'
                          ? 'Pushing All 5 Tabs...'
                          : 'Push All Data to Google Sheets'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePullFromSheets('all')}
                      disabled={activeOperation !== null}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <DownloadCloud className="w-4 h-4 text-emerald-400" />
                      <span>
                        {activeOperation === 'pull-all'
                          ? 'Reading From Google Sheets...'
                          : 'Pull Changes from Google Sheets'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Executive Report Builder Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Formatted Report Tab Builder
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Generate a dedicated monthly financial statement tab inside your Master Workbook with bold emerald header bands, category variance formulas, and period ledger rows.
                </p>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 block">
                    Target Report Period (YYYY-MM)
                  </label>
                  <input
                    type="month"
                    value={reportPeriodInput}
                    onChange={(e) => setReportPeriodInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateReportTab}
                disabled={!masterMeta || activeOperation !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>
                  {activeOperation === 'report'
                    ? 'Formatting Report Tab...'
                    : `Generate "Report — ${reportPeriodInput}"`}
                </span>
              </button>
            </div>
          </div>

          {/* Individual Module Two-Way Sync Cards */}
          {masterMeta && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Transactions Sync Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                      <Receipt className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
                      {transactions.length} rows
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Transactions Tab
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sync full ledger history or pull rows added in Google Sheets.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={activeOperation !== null}
                    onClick={() =>
                      handlePushSingleTab('transactions', `${transactions.length} transactions`)
                    }
                    className="py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Push Tab
                  </button>
                  <button
                    type="button"
                    disabled={activeOperation !== null}
                    onClick={() => handlePullFromSheets('transactions')}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Pull Tab
                  </button>
                </div>
              </div>

              {/* Budgets Sync Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                      <Scale className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
                      {budgets.length} caps
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Budgets Tab
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Two-way category monthly limits with live utilization formulas.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={activeOperation !== null}
                    onClick={() =>
                      handlePushSingleTab('budgets', `${budgets.length} category budgets`)
                    }
                    className="py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Push Tab
                  </button>
                  <button
                    type="button"
                    disabled={activeOperation !== null}
                    onClick={() => handlePullFromSheets('budgets')}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Pull Tab
                  </button>
                </div>
              </div>

              {/* Accounts & Wallets Sync Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                      <WalletCards className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
                      {accounts.length} wallets
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Accounts & Wallets
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sync checking, savings, mobile money, and crypto balances.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={activeOperation !== null}
                    onClick={() =>
                      handlePushSingleTab('accounts', `${accounts.length} accounts & wallets`)
                    }
                    className="py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Push Tab
                  </button>
                  <button
                    type="button"
                    disabled={activeOperation !== null}
                    onClick={() => handlePullFromSheets('accounts')}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Pull Tab
                  </button>
                </div>
              </div>

              {/* Net Worth & Debt Sync Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
                      {assets.length + liabilities.length} items
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Net Worth & Debt
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Two-way sync for assets, property, and debt payoff balances.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={activeOperation !== null}
                    onClick={() =>
                      handlePushSingleTab(
                        'networth',
                        `${assets.length} assets and ${liabilities.length} liabilities`
                      )
                    }
                    className="py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Push Tab
                  </button>
                  <button
                    type="button"
                    disabled={activeOperation !== null}
                    onClick={() => handlePullFromSheets('networth')}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Pull Tab
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Google Drive Spreadsheets Browser & Sync Activity Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Drive Spreadsheet Browser */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Your Google Drive Spreadsheets
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCreateMasterWorkbook}
                  disabled={activeOperation !== null}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Master Workbook</span>
                </button>
              </div>

              {driveFiles.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No Google Spreadsheets found in your Drive yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                  {driveFiles.map((file) => {
                    const isCurrentMaster = masterMeta?.spreadsheetId === file.id;
                    return (
                      <div
                        key={file.id}
                        className="py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {file.name}
                            </p>
                            {isCurrentMaster && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold shrink-0">
                                Linked Master
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Modified: {new Date(file.modifiedTime).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isCurrentMaster && (
                            <button
                              type="button"
                              onClick={() => handleLinkSpreadsheet(file)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title="Use as Master Workbook"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>Link</span>
                            </button>
                          )}
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Open in Google Sheets"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteSpreadsheet(file)}
                            className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 cursor-pointer"
                            title="Delete from Google Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Sync Audit Log */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Clock className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recent Sheets Sync Activity
                </h3>
              </div>

              {syncHistory.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No sync operations recorded in this session yet.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {syncHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {item.direction}
                        </span>
                        <span className="text-slate-400">{item.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">
                        {item.summary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
