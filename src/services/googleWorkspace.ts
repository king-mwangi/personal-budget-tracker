import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Transaction,
  Budget,
  Account,
  AssetItem,
  LiabilityItem,
  AccountType,
} from '../types';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

export const MASTER_WORKBOOK_TITLE = 'Ledger Smart — Master Financial Workbook';

export const REQUIRED_TAB_TITLES = {
  overview: 'Overview & Summary',
  transactions: 'Transactions',
  budgets: 'Budgets',
  accounts: 'Accounts & Wallets',
  networth: 'Net Worth & Debt',
} as const;

export type SyncTabKey = keyof typeof REQUIRED_TAB_TITLES;

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'consent',
});

// Strictly in-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure(user);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure(null);
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Workspace access token from sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getCurrentGoogleUser = (): User | null => {
  return auth.currentUser;
};

export const googleLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Helper for authenticated Google Workspace REST requests
async function googleFetch(url: string, options: RequestInit = {}) {
  if (!cachedAccessToken) {
    throw new Error('AUTH_REQUIRED: Please sign in with Google to access Google Sheets & Drive.');
  }
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${cachedAccessToken}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    let errText = '';
    try {
      const errJson = await res.json();
      errText = errJson?.error?.message || '';
    } catch (_) {}
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('AUTH_REQUIRED: Your Google Workspace session expired. Please sign in again.');
    }
    throw new Error(errText || 'Permission denied by Google Workspace API.');
  }

  if (!res.ok) {
    let errMsg = `Google API Error (${res.status})`;
    try {
      const errData = await res.json();
      errMsg = errData?.error?.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  if (res.status === 204) return null;
  return res.json();
}

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink: string;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: Array<{
    sheetId: number;
    title: string;
    rowCount?: number;
    columnCount?: number;
  }>;
}

export interface MasterFinancialPayload {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  assets: AssetItem[];
  liabilities: LiabilityItem[];
  currencySymbol: string;
  selectedPeriod?: string;
}

export interface PulledSheetData {
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  assets: AssetItem[];
  liabilities: LiabilityItem[];
}

/**
 * List Google Spreadsheets in the user's Google Drive
 */
export async function listUserSpreadsheets(pageSize = 20): Promise<DriveSpreadsheetFile[]> {
  const q = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=${pageSize}&orderBy=modifiedTime desc&fields=${fields}`;
  const data = await googleFetch(url);
  return (data?.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime || new Date().toISOString(),
    webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
  }));
}

/**
 * Search for the Master Financial Workbook in Google Drive
 */
export async function findMasterWorkbook(): Promise<DriveSpreadsheetFile | null> {
  const escapedTitle = MASTER_WORKBOOK_TITLE.replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.spreadsheet' and name='${escapedTitle}' and trashed=false`
  );
  const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=5&orderBy=modifiedTime desc&fields=${fields}`;
  const data = await googleFetch(url);
  if (data?.files && data.files.length > 0) {
    const f = data.files[0];
    return {
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime || new Date().toISOString(),
      webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
    };
  }
  return null;
}

/**
 * Fetch spreadsheet metadata and tab definitions dynamically
 */
export async function getSpreadsheetMetadata(spreadsheetId: string): Promise<SpreadsheetMetadata> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`;
  const data = await googleFetch(url);
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || MASTER_WORKBOOK_TITLE,
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title || 'Sheet1',
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

/**
 * Build header styling request for a given sheetId
 */
function buildHeaderStyleRequest(sheetId: number, columnCount: number, rgbBg: { red: number; green: number; blue: number }) {
  return [
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: columnCount,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: rgbBg,
            horizontalAlignment: 'LEFT',
            verticalAlignment: 'MIDDLE',
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10,
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    },
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    },
  ];
}

/**
 * Provision a brand new 5-tab Master Financial Workbook in Google Drive and populate initial data
 */
export async function provisionMasterWorkbook(
  payload: MasterFinancialPayload
): Promise<SpreadsheetMetadata> {
  const createBody = {
    properties: {
      title: MASTER_WORKBOOK_TITLE,
    },
    sheets: [
      {
        properties: {
          sheetId: 100,
          title: REQUIRED_TAB_TITLES.overview,
          gridProperties: { rowCount: 60, columnCount: 8, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          sheetId: 101,
          title: REQUIRED_TAB_TITLES.transactions,
          gridProperties: { rowCount: 1000, columnCount: 8, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          sheetId: 102,
          title: REQUIRED_TAB_TITLES.budgets,
          gridProperties: { rowCount: 100, columnCount: 6, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          sheetId: 103,
          title: REQUIRED_TAB_TITLES.accounts,
          gridProperties: { rowCount: 100, columnCount: 8, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          sheetId: 104,
          title: REQUIRED_TAB_TITLES.networth,
          gridProperties: { rowCount: 200, columnCount: 9, frozenRowCount: 1 },
        },
      },
    ],
  };

  const created = await googleFetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    body: JSON.stringify(createBody),
  });

  const spreadsheetId = created.spreadsheetId;

  // Apply clean header styling across all 5 tabs
  const styleRequests = [
    ...buildHeaderStyleRequest(100, 6, { red: 0.06, green: 0.09, blue: 0.16 }), // Deep Slate
    ...buildHeaderStyleRequest(101, 7, { red: 0.09, green: 0.4, blue: 0.25 }),  // Emerald
    ...buildHeaderStyleRequest(102, 5, { red: 0.15, green: 0.39, blue: 0.92 }), // Royal Blue
    ...buildHeaderStyleRequest(103, 7, { red: 0.06, green: 0.09, blue: 0.16 }), // Deep Slate
    ...buildHeaderStyleRequest(104, 8, { red: 0.31, green: 0.27, blue: 0.9 }),  // Indigo
  ];

  await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: styleRequests }),
  });

  // Push initial full data
  await pushAllToMasterSheet(spreadsheetId, payload);

  return getSpreadsheetMetadata(spreadsheetId);
}

/**
 * Ensure all 5 required tabs exist in an existing spreadsheet before syncing
 */
export async function ensureRequiredTabs(spreadsheetId: string): Promise<SpreadsheetMetadata> {
  const meta = await getSpreadsheetMetadata(spreadsheetId);
  const existingTitles = new Set(meta.sheets.map((s) => s.title));
  const missingTitles = Object.values(REQUIRED_TAB_TITLES).filter((t) => !existingTitles.has(t));

  if (missingTitles.length > 0) {
    const requests = missingTitles.map((title) => ({
      addSheet: {
        properties: {
          title,
          gridProperties: {
            rowCount: 500,
            columnCount: 8,
            frozenRowCount: 1,
          },
        },
      },
    }));

    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });

    return getSpreadsheetMetadata(spreadsheetId);
  }

  return meta;
}

/**
 * Build rows for each tab
 */
function buildTransactionsRows(transactions: Transaction[], accounts: Account[]): any[][] {
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const header = ['Record ID', 'Date', 'Type', 'Category', 'Description', 'Amount', 'Account ID / Wallet'];
  const rows = transactions.map((t) => [
    t.id,
    t.date,
    t.type,
    t.category,
    t.description || '',
    t.amount,
    t.accountId ? `${t.accountId} (${accMap.get(t.accountId) || 'Wallet'})` : 'acc-1 (Primary)',
  ]);
  return [header, ...rows];
}

function buildBudgetsRows(budgets: Budget[], transactions: Transaction[]): any[][] {
  const spentByCategory: Record<string, number> = {};
  transactions.forEach((tx) => {
    if (tx.type === 'expense') {
      spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + tx.amount;
    }
  });

  const header = ['Category', 'Monthly Limit', 'Current Spent', 'Remaining Balance', 'Utilization %'];
  const rows = budgets.map((b, idx) => {
    const rowNum = idx + 2;
    const spent = spentByCategory[b.category] || 0;
    return [
      b.category,
      b.limit,
      spent,
      `=B${rowNum}-C${rowNum}`,
      `=IF(B${rowNum}>0, ROUND((C${rowNum}/B${rowNum})*100, 1), 0)`,
    ];
  });
  return [header, ...rows];
}

function buildAccountsRows(accounts: Account[], transactions: Transaction[]): any[][] {
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

  const header = [
    'Account ID',
    'Account Name',
    'Account Type',
    'Institution',
    'Initial Balance',
    'Live Calculated Balance',
    'Color Hex',
  ];
  const rows = accounts.map((a) => [
    a.id,
    a.name,
    a.type,
    a.institution || 'Personal',
    a.initialBalance,
    Number((balances[a.id] ?? a.initialBalance).toFixed(2)),
    a.color || '#2563EB',
  ]);
  return [header, ...rows];
}

function buildNetWorthRows(assets: AssetItem[], liabilities: LiabilityItem[]): any[][] {
  const header = [
    'Record Type',
    'Record ID',
    'Item Name',
    'Category',
    'Value or Balance',
    'APR %',
    'Minimum Monthly Payment',
    'Notes / Updated',
  ];
  const assetRows = assets.map((a) => [
    'ASSET',
    a.id,
    a.name,
    a.category,
    a.value,
    0,
    0,
    a.notes || a.lastUpdated || '',
  ]);
  const liabilityRows = liabilities.map((l) => [
    'LIABILITY',
    l.id,
    l.name,
    l.category,
    l.balance,
    l.apr,
    l.minimumPayment,
    l.dueDate ? `Due Day ${l.dueDate}` : '',
  ]);
  return [header, ...assetRows, ...liabilityRows];
}

function buildOverviewRows(payload: MasterFinancialPayload): any[][] {
  const { transactions, budgets, accounts, assets, liabilities, currencySymbol } = payload;
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const netCashFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Number(((netCashFlow / totalIncome) * 100).toFixed(1)) : 0;

  const totalAssetsVal = assets.reduce((s, a) => s + a.value, 0);
  const totalLiabilitiesVal = liabilities.reduce((s, l) => s + l.balance, 0);
  const totalAccountsInitial = accounts.reduce((s, a) => s + a.initialBalance, 0);
  const totalLiquid = totalAccountsInitial + netCashFlow;
  const netWorth = totalLiquid + totalAssetsVal - totalLiabilitiesVal;

  const categoryTotals: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const rows: any[][] = [
    ['LEDGER SMART — EXECUTIVE FINANCIAL WORKBOOK', '', '', '', '', ''],
    [
      'Last Synchronized',
      new Date().toLocaleString(),
      'Currency',
      currencySymbol.trim() || 'USD',
      'Total Records',
      transactions.length,
    ],
    ['', '', '', '', '', ''],
    ['EXECUTIVE KPI METRIC', 'LIVE FORMULA / VALUE', 'NOTES & SOURCE TAB', '', '', ''],
    [
      'Total Cumulative Income',
      `=SUMIF('${REQUIRED_TAB_TITLES.transactions}'!C2:C1000, "income", '${REQUIRED_TAB_TITLES.transactions}'!F2:F1000)`,
      'Dynamic sum from Transactions tab',
      '',
      '',
      '',
    ],
    [
      'Total Cumulative Expenses',
      `=SUMIF('${REQUIRED_TAB_TITLES.transactions}'!C2:C1000, "expense", '${REQUIRED_TAB_TITLES.transactions}'!F2:F1000)`,
      'Dynamic sum from Transactions tab',
      '',
      '',
      '',
    ],
    ['Net Cash Flow Savings', '=B5-B6', 'Total Income minus Total Expenses', '', '', ''],
    ['Savings Efficiency Rate (%)', savingsRate, `${savingsRate}% of inflows retained`, '', '', ''],
    [
      'Liquid Account Balances',
      `=SUM('${REQUIRED_TAB_TITLES.accounts}'!F2:F100)`,
      `Across ${accounts.length} tracked wallets`,
      '',
      '',
      '',
    ],
    [
      'Total Tracked Assets',
      `=SUMIF('${REQUIRED_TAB_TITLES.networth}'!A2:A200, "ASSET", '${REQUIRED_TAB_TITLES.networth}'!E2:E200)`,
      `${assets.length} asset items`,
      '',
      '',
      '',
    ],
    [
      'Total Liabilities & Debt',
      `=SUMIF('${REQUIRED_TAB_TITLES.networth}'!A2:A200, "LIABILITY", '${REQUIRED_TAB_TITLES.networth}'!E2:E200)`,
      `${liabilities.length} debt accounts`,
      '',
      '',
      '',
    ],
    [
      'Total Estimated Net Worth',
      '=B9+B10-B11',
      `Snapshot Net Worth: ${currencySymbol}${netWorth.toLocaleString()}`,
      '',
      '',
      '',
    ],
    ['', '', '', '', '', ''],
    ['CATEGORY EXPENSE BREAKDOWN', 'TOTAL SPENT', 'BUDGET CEILING', 'VARIANCE', 'SHARE OF SPEND %', ''],
  ];

  const budgetMap = new Map(budgets.map((b) => [b.category, b.limit]));
  sortedCategories.forEach(([cat, spent]) => {
    const limit = budgetMap.get(cat) || 0;
    const share = totalExpense > 0 ? Number(((spent / totalExpense) * 100).toFixed(1)) : 0;
    rows.push([
      cat,
      spent,
      limit,
      limit > 0 ? limit - spent : 0,
      `${share}%`,
      '',
    ]);
  });

  return rows;
}

/**
 * Push a single tab to the Master Workbook
 */
export async function pushTabToMasterSheet(
  spreadsheetId: string,
  tabKey: SyncTabKey,
  payload: MasterFinancialPayload
): Promise<{ updatedRows: number; tabTitle: string }> {
  await ensureRequiredTabs(spreadsheetId);
  const tabTitle = REQUIRED_TAB_TITLES[tabKey];

  let values: any[][] = [];
  if (tabKey === 'overview') {
    values = buildOverviewRows(payload);
  } else if (tabKey === 'transactions') {
    values = buildTransactionsRows(payload.transactions, payload.accounts);
  } else if (tabKey === 'budgets') {
    values = buildBudgetsRows(payload.budgets, payload.transactions);
  } else if (tabKey === 'accounts') {
    values = buildAccountsRows(payload.accounts, payload.transactions);
  } else if (tabKey === 'networth') {
    values = buildNetWorthRows(payload.assets, payload.liabilities);
  }

  // Clear existing values in tab first
  const encodedClearRange = encodeURIComponent(`'${tabTitle}'!A1:I1000`);
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedClearRange}:clear`,
    { method: 'POST' }
  );

  // Write updated values with USER_ENTERED so formulas work
  const encodedWriteRange = encodeURIComponent(`'${tabTitle}'!A1`);
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedWriteRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: `'${tabTitle}'!A1`,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  return { updatedRows: Math.max(0, values.length - 1), tabTitle };
}

/**
 * Push all 5 modules to the Master Workbook in a single coordinated operation
 */
export async function pushAllToMasterSheet(
  spreadsheetId: string,
  payload: MasterFinancialPayload
): Promise<{ totalRowsWritten: number }> {
  await ensureRequiredTabs(spreadsheetId);

  const overviewRows = buildOverviewRows(payload);
  const txRows = buildTransactionsRows(payload.transactions, payload.accounts);
  const budgetRows = buildBudgetsRows(payload.budgets, payload.transactions);
  const accountRows = buildAccountsRows(payload.accounts, payload.transactions);
  const networthRows = buildNetWorthRows(payload.assets, payload.liabilities);

  // Batch clear all 5 tabs
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      body: JSON.stringify({
        ranges: [
          `'${REQUIRED_TAB_TITLES.overview}'!A1:H200`,
          `'${REQUIRED_TAB_TITLES.transactions}'!A1:H1000`,
          `'${REQUIRED_TAB_TITLES.budgets}'!A1:F100`,
          `'${REQUIRED_TAB_TITLES.accounts}'!A1:H100`,
          `'${REQUIRED_TAB_TITLES.networth}'!A1:I200`,
        ],
      }),
    }
  );

  // Batch write all 5 tabs
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `'${REQUIRED_TAB_TITLES.overview}'!A1`, majorDimension: 'ROWS', values: overviewRows },
          { range: `'${REQUIRED_TAB_TITLES.transactions}'!A1`, majorDimension: 'ROWS', values: txRows },
          { range: `'${REQUIRED_TAB_TITLES.budgets}'!A1`, majorDimension: 'ROWS', values: budgetRows },
          { range: `'${REQUIRED_TAB_TITLES.accounts}'!A1`, majorDimension: 'ROWS', values: accountRows },
          { range: `'${REQUIRED_TAB_TITLES.networth}'!A1`, majorDimension: 'ROWS', values: networthRows },
        ],
      }),
    }
  );

  const totalRowsWritten =
    txRows.length + budgetRows.length + accountRows.length + networthRows.length - 4;
  return { totalRowsWritten };
}

/**
 * Generate a dedicated Formatted Executive Financial Report tab for a selected period
 */
export async function generateFormattedReportTab(
  spreadsheetId: string,
  periodLabel: string,
  payload: MasterFinancialPayload
): Promise<{ tabTitle: string; rowCount: number }> {
  const safePeriod = periodLabel.replace(/[:/\\?*[\]]/g, '-').slice(0, 22);
  const tabTitle = `Report — ${safePeriod}`;

  const meta = await getSpreadsheetMetadata(spreadsheetId);
  const existing = meta.sheets.find((s) => s.title === tabTitle);
  let targetSheetId = existing?.sheetId;

  if (targetSheetId === undefined) {
    const addRes = await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabTitle,
                  gridProperties: { rowCount: 250, columnCount: 7, frozenRowCount: 1 },
                },
              },
            },
          ],
        }),
      }
    );
    targetSheetId = addRes?.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
  }

  // Filter transactions for period if specified
  const periodFilter = payload.selectedPeriod && payload.selectedPeriod !== 'all' ? payload.selectedPeriod : null;
  const filteredTx = periodFilter
    ? payload.transactions.filter((t) => t.date && t.date.startsWith(periodFilter))
    : payload.transactions;

  const incomeTx = filteredTx.filter((t) => t.type === 'income');
  const expenseTx = filteredTx.filter((t) => t.type === 'expense');
  const totalIn = incomeTx.reduce((s, t) => s + t.amount, 0);
  const totalOut = expenseTx.reduce((s, t) => s + t.amount, 0);
  const net = totalIn - totalOut;

  const catSpend: Record<string, number> = {};
  expenseTx.forEach((t) => {
    catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
  });

  const rows: any[][] = [
    [`LEDGER SMART EXECUTIVE REPORT — ${periodLabel.toUpperCase()}`, '', '', '', '', ''],
    ['Generated At', new Date().toLocaleString(), 'Transactions Analyzed', filteredTx.length, '', ''],
    ['', '', '', '', '', ''],
    ['CASH FLOW SUMMARY', 'AMOUNT', 'SHARE / RATIO', '', '', ''],
    ['Total Period Inflows', totalIn, '100.0%', '', '', ''],
    ['Total Period Outflows', totalOut, totalIn > 0 ? `${((totalOut / totalIn) * 100).toFixed(1)}%` : '0%', '', '', ''],
    ['Net Retained Savings', '=B5-B6', totalIn > 0 ? `${((net / totalIn) * 100).toFixed(1)}%` : '0%', '', '', ''],
    ['', '', '', '', '', ''],
    ['CATEGORY SPEND MATRIX', 'EXPENSE TOTAL', 'BUDGET CEILING', 'REMAINING', 'STATUS', ''],
  ];

  const budgetMap = new Map(payload.budgets.map((b) => [b.category, b.limit]));
  const allCategories = Array.from(new Set([...Object.keys(catSpend), ...payload.budgets.map((b) => b.category)]));

  allCategories.forEach((cat) => {
    const spent = catSpend[cat] || 0;
    const limit = budgetMap.get(cat) || 0;
    const rem = limit > 0 ? limit - spent : 0;
    const status = limit === 0 ? 'Unbudgeted' : spent > limit ? 'OVER BUDGET' : spent >= limit * 0.85 ? 'Near Cap' : 'On Track';
    rows.push([cat, spent, limit, rem, status, '']);
  });

  rows.push(['', '', '', '', '', '']);
  rows.push(['PERIOD TRANSACTION LEDGER', 'DATE', 'CATEGORY', 'TYPE', 'AMOUNT', 'DESCRIPTION']);
  filteredTx.slice(0, 150).forEach((t) => {
    rows.push([t.id, t.date, t.category, t.type.toUpperCase(), t.amount, t.description || '']);
  });

  const clearRange = encodeURIComponent(`'${tabTitle}'!A1:G300`);
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`,
    { method: 'POST' }
  );

  const writeRange = encodeURIComponent(`'${tabTitle}'!A1`);
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: `'${tabTitle}'!A1`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (targetSheetId !== undefined) {
    await googleFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: buildHeaderStyleRequest(targetSheetId, 6, { red: 0.05, green: 0.45, blue: 0.32 }),
      }),
    });
  }

  return { tabTitle, rowCount: rows.length };
}

/**
 * Pull and parse all two-way sync tabs from Google Sheets back into Ledger Smart
 */
export async function pullFromMasterSheet(spreadsheetId: string): Promise<PulledSheetData> {
  await ensureRequiredTabs(spreadsheetId);

  const ranges = [
    encodeURIComponent(`'${REQUIRED_TAB_TITLES.transactions}'!A2:G1000`),
    encodeURIComponent(`'${REQUIRED_TAB_TITLES.budgets}'!A2:C100`),
    encodeURIComponent(`'${REQUIRED_TAB_TITLES.accounts}'!A2:G100`),
    encodeURIComponent(`'${REQUIRED_TAB_TITLES.networth}'!A2:H200`),
  ];

  const query = ranges.map((r) => `ranges=${r}`).join('&');
  const data = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${query}&valueRenderOption=UNFORMATTED_VALUE`
  );

  const valueRanges = data?.valueRanges || [];
  const rawTxRows: any[][] = valueRanges[0]?.values || [];
  const rawBudgetRows: any[][] = valueRanges[1]?.values || [];
  const rawAccountRows: any[][] = valueRanges[2]?.values || [];
  const rawNetWorthRows: any[][] = valueRanges[3]?.values || [];

  const parseNum = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const transactions: Transaction[] = rawTxRows
    .filter((r) => r && r.length >= 4 && (r[1] || r[4] || r[5]))
    .map((r, idx) => {
      const rawId = String(r[0] || '').trim();
      const rawDate = String(r[1] || new Date().toISOString().split('T')[0]).trim();
      const rawType = String(r[2] || 'expense').trim().toLowerCase();
      const type: 'income' | 'expense' = rawType === 'income' ? 'income' : 'expense';
      const category = String(r[3] || (type === 'income' ? 'Income' : 'Food')).trim();
      const description = String(r[4] || 'Synced from Google Sheets').trim();
      const amount = Math.abs(parseNum(r[5]));
      const rawAccCell = String(r[6] || '').trim();
      const accountId = rawAccCell ? rawAccCell.split(' ')[0] : 'acc-1';

      return {
        id: rawId || `sheet-tx-${idx}-${Date.now().toString(36)}`,
        date: rawDate,
        type,
        category,
        description,
        amount,
        accountId,
      };
    })
    .filter((t) => t.amount > 0);

  const budgets: Budget[] = rawBudgetRows
    .filter((r) => r && r[0])
    .map((r) => ({
      category: String(r[0]).trim(),
      limit: Math.max(0, parseNum(r[1])),
    }))
    .filter((b) => b.category.length > 0 && b.limit > 0);

  const validAccountTypes: AccountType[] = [
    'checking',
    'savings',
    'credit',
    'cash',
    'mobile_money',
    'crypto',
    'investment',
  ];

  const accounts: Account[] = rawAccountRows
    .filter((r) => r && r[1])
    .map((r, idx) => {
      const rawId = String(r[0] || '').trim();
      const name = String(r[1] || 'Synced Account').trim();
      const rawType = String(r[2] || 'checking').trim().toLowerCase() as AccountType;
      const type: AccountType = validAccountTypes.includes(rawType) ? rawType : 'checking';
      const institution = String(r[3] || 'Personal').trim();
      const initialBalance = parseNum(r[4]);
      const color = String(r[6] || '#2563EB').trim();

      return {
        id: rawId || `acc-sheet-${idx}`,
        name,
        type,
        institution,
        initialBalance,
        color,
      };
    });

  const assets: AssetItem[] = [];
  const liabilities: LiabilityItem[] = [];

  rawNetWorthRows.forEach((r, idx) => {
    if (!r || !r[2]) return;
    const recordKind = String(r[0] || 'ASSET').trim().toUpperCase();
    const rawId = String(r[1] || '').trim();
    const name = String(r[2] || '').trim();
    const categoryRaw = String(r[3] || '').trim().toLowerCase();
    const valueOrBal = Math.max(0, parseNum(r[4]));

    if (recordKind.includes('LIAB') || recordKind.includes('DEBT')) {
      const validDebtCats: LiabilityItem['category'][] = [
        'credit_card',
        'student_loan',
        'mortgage',
        'auto_loan',
        'personal_loan',
      ];
      const cat = validDebtCats.includes(categoryRaw as any)
        ? (categoryRaw as LiabilityItem['category'])
        : 'credit_card';
      liabilities.push({
        id: rawId || `debt-sheet-${idx}`,
        name,
        category: cat,
        balance: valueOrBal,
        apr: Math.max(0, parseNum(r[5])),
        minimumPayment: Math.max(0, parseNum(r[6])),
      });
    } else {
      const validAssetCats: AssetItem['category'][] = [
        'real_estate',
        'vehicle',
        'equity',
        'crypto',
        'valuables',
        'other',
      ];
      const cat = validAssetCats.includes(categoryRaw as any)
        ? (categoryRaw as AssetItem['category'])
        : 'other';
      assets.push({
        id: rawId || `ast-sheet-${idx}`,
        name,
        category: cat,
        value: valueOrBal,
        notes: String(r[7] || '').trim(),
        lastUpdated: new Date().toISOString().split('T')[0],
      });
    }
  });

  return {
    transactions,
    budgets,
    accounts,
    assets,
    liabilities,
  };
}

/**
 * Delete a spreadsheet from Google Drive (requires explicit user confirmation before calling)
 */
export async function deleteDriveSpreadsheet(fileId: string): Promise<void> {
  await googleFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
  });
}
