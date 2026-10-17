# Ledger Smart — Google Sheets & Google Drive Live Sync Integration

Connect Ledger Smart directly with Google Sheets and Google Drive so your financial ledger, budgets, multi-account balances, and net worth items stay synchronized with a live, formatted master spreadsheet in your Google Drive.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product choices have been configured based on your selections:

- **Confirmed Decision 1 — Comprehensive Multi-Tab Workflows**:
  - **Live Transaction Export & Sync**: Push and pull ledger transactions (`Date`, `Description`, `Category`, `Type`, `Amount`, `Account`, `ID`) to a dedicated `Transactions` sheet tab.
  - **Formatted Multi-Tab Financial Reports**: Generate executive-ready tabs (`Executive Summary`, `Monthly Cash Flow`) complete with styled header bands, currency formatting, and live `SUM`/`SUMIFS` spreadsheet formulas.
  - **Two-Way Sync for Budgets, Accounts & Net Worth**: Read and write updates between Ledger Smart and dedicated `Budgets`, `Accounts & Wallets`, and `Net Worth & Debt` tabs so edits made directly inside Google Sheets can be pulled back into Ledger Smart.
- **Confirmed Decision 2 — Dedicated Sync Hub + Contextual Quick-Export Buttons**:
  - Add a **Google Sheets Sync Hub** view in the grouped sidebar navigation (and `Cmd+K` Command Palette) alongside contextual **"Sync to Sheets"** quick action buttons inside the Transaction Ledger, Accounts, Budgets, and Net Worth views.
- **Confirmed Decision 3 — Automatic Single Master Spreadsheet Management**:
  - Automatically locate or provision a single master workbook named **`Ledger Smart — Master Financial Workbook`** in Google Drive, while also displaying your connected Drive spreadsheet status, direct "Open in Google Sheets" link, and an option to inspect or relink existing spreadsheets in Drive.
- **Confirmed Decision 4 — Mandatory Confirmation Before Mutating Drive/Sheets Data**:
  - Every operation that overwrites, updates, or clears cells in Google Sheets or modifies files in Google Drive will present Ledger Smart's custom confirmation modal detailing the affected sheet tabs and record counts before executing.

---

### 1. Overview & Core Concept

- **What It Does**: Bridges Ledger Smart's local/Supabase financial engine with Google Workspace. With one click after signing in with Google, users can provision a structured 5-tab Master Financial Workbook in Google Drive, push live updates from any module, pull spreadsheet edits back into the app, or generate formatted monthly financial statement tabs.
- **Target Audience / Persona**: Personal finance power users, freelancers, and household CFOs who love the speed, AI receipt scanning, and guided analytics of Ledger Smart while wanting full spreadsheet ownership and formula flexibility in Google Sheets.
- **Key Value**: Eliminates manual CSV downloads and re-imports by treating a structured Google Sheet in the user's Drive as a live, two-way companion ledger.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Google Workspace Authentication**: Users click the official **"Sign in with Google"** button in the Google Sheets Sync Hub (or from a quick-export action). Authentication uses Firebase Google OAuth in-memory token management with the approved Google Drive and Google Sheets scopes.
  2. **Automatic Master Workbook Discovery & Provisioning**: Upon connecting, Ledger Smart searches Google Drive for `Ledger Smart — Master Financial Workbook`. If found, it binds automatically and displays last-synced metadata; if not found, users can create and format all 5 structured tabs with a single click.
  3. **Two-Way Sync & Conflict-Safe Pull**:
     - **Push to Google Sheets**: Users can push all modules at once or push individual tabs (`Transactions`, `Budgets`, `Accounts`, `Net Worth`). A confirmation dialog summarizes the exact rows and tabs that will be updated.
     - **Pull from Google Sheets**: Users can pull changes edited in the `Transactions`, `Budgets`, `Accounts`, or `Net Worth` tabs back into Ledger Smart, previewing row counts before confirming the merge.
  4. **Formatted Multi-Tab Executive Report Builder**: Users can trigger **"Generate Formatted Financial Report Tab"**, which builds or updates a styled summary sheet using `spreadsheets.batchUpdate` (boldemerald/slate header styling, frozen header rows, currency number formats, and live `=SUM()` formulas).
  5. **Drive Spreadsheet Browser & Backup Snapshots**: Inside the Sync Hub, users can view their Master Workbook metadata, open it directly in a new browser tab, switch to another existing spreadsheet in their Google Drive, or save a timestamped read-only monthly snapshot sheet in Drive.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-craft financial precision matching Ledger Smart's existing SaaS workspace canvas—clean `1px` structural borders (`border-slate-200 dark:border-slate-800`), crisp single-elevation cards, and zero visual clutter.
  - *Color Palette & Semantic Accents*: Deep slate workspace surfaces paired with Google Sheets emerald (`#16A34A` / `emerald-600`) for active sync states, royal blue (`#2563EB`) for primary actions, amber (`#D97706`) for pending sync diffs, and crimson (`#DC2626`) for destructive confirmations.
  - *Typography & Tabular Numerals*: `Plus Jakarta Sans` for headings and navigation paired with `JetBrains Mono` / `tabular-nums` for all row counts, monetary totals, spreadsheet cell ranges, and sync timestamps.
  - *State Completeness*: Every panel in the Sync Hub supports unauthenticated (official Google Sign-In button), connected/idle, active syncing skeleton/progress indicators, and empty/error states with one-click retry.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Single Master Multi-Tab Workbook vs. Separate Files per Module**
  - *Chosen Approach*: A single master spreadsheet (`Ledger Smart — Master Financial Workbook`) containing five standardized tabs: `Overview & Summary`, `Transactions`, `Budgets`, `Accounts & Wallets`, and `Net Worth & Debt`.
  - *Why*: Keeps all financial data in one cohesive file in Google Drive so cross-tab formulas (like `Overview & Summary` referencing `Transactions` and `Accounts`) work seamlessly without cluttering the user's Google Drive root folder.
  - *Alternatives Considered*: Creating separate spreadsheets for transactions, budgets, and net worth—rejected because it fragments reporting and complicates Drive file management.

- **Decision 2: In-Memory OAuth Access Token Caching via Firebase Auth**
  - *Chosen Approach*: Authenticate client-side using Firebase `signInWithPopup` with `GoogleAuthProvider` configured with the user-approved Drive and Sheets scopes, caching the OAuth access token strictly in memory.
  - *Why*: Complies with security best practices (never persisting raw OAuth access tokens to `localStorage`) and avoids server-side OAuth redirect URI mismatches in dynamic preview environments.

- **Decision 3: Deterministic ID Column for Two-Way Sync**
  - *Chosen Approach*: Include a stable `Record ID` column in the `Transactions`, `Budgets`, `Accounts & Wallets`, and `Net Worth & Debt` tabs (while generating new IDs for rows added manually in Google Sheets without an ID).
  - *Why*: Enables reliable two-way reconciliation when pulling rows back from Google Sheets into Ledger Smart without duplicating existing items.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Ledger Smart Workspace Shell                          │
│  ┌──────────────────────┐   ┌─────────────────────────────────────────────┐  │
│  │ Grouped Sidebar Nav  │   │ Top Header Bar & Command Palette (Cmd+K)    │  │
│  │ + Google Sheets Hub  │   │ + Quick "Sync to Sheets" Action Triggers    │  │
│  └──────────┬───────────┘   └──────────────────────┬──────────────────────┘  │
└─────────────┼──────────────────────────────────────┼─────────────────────────┘
              │                                      │
              ▼                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Google Sheets Sync Hub & Quick Actions                   │
│  ┌────────────────────────┐ ┌──────────────────────┐ ┌────────────────────┐  │
│  │ Google OAuth Card      │ │ Master Workbook      │ │ Two-Way Sync       │  │
│  │ (Official GSI Button & │ │ Controller (Auto-    │ │ Inspector (Push /  │  │
│  │  In-Memory Token State)│ │ Find / Create / Link)│ │ Pull / Report Gen) │  │
│  └───────────┬────────────┘ └──────────┬───────────┘ └─────────┬──────────┘  │
└──────────────┼─────────────────────────┼───────────────────────┼─────────────┘
               │                         │                       │
               ▼                         ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  Confirmation Modal Gate (showConfirm)                       │
│   Verifies user approval before any Sheets write, clear, or Drive mutation   │
└────────────────────────────────────────┬─────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│               Google Workspace Client Service (REST APIs)                    │
│  ┌───────────────────────────────────┐ ┌──────────────────────────────────┐  │
│  │ Google Drive API v3               │ │ Google Sheets API v4             │  │
│  │ • Search Master Workbook by name  │ │ • Provision 5 structured tabs    │  │
│  │ • List user spreadsheets          │ │ • values.batchUpdate / clear     │  │
│  │ • Delete / unlink files (confirmed│ │ •values.batchGet (Two-Way Pull)  │  │
│  │   by user)                        │ │ • batchUpdate ( Cell Styling &   │  │
│  │                                   │ │   Executive Report Formulas)     │  │
│  └───────────────────────────────────┘ └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & Master Spreadsheet Tab Schema**:
  - **Tab 1 — `Overview & Summary`**: Executive financial report header, generation timestamp, KPI summary block (`Total Income`, `Total Expenses`, `Net Savings`, `Savings Rate %`, `Total Liquid Accounts`, `Total Net Worth`), and live category breakdown formulas.
  - **Tab 2 — `Transactions`**: Columns `ID | Date | Type | Category | Description | Amount | Account ID`. Supports full push from Ledger Smart and two-way pull (updating matching IDs and importing newly added spreadsheet rows).
  - **Tab 3 — `Budgets`**: Columns `Category | Monthly Limit ($) | Current Spent ($) | Remaining ($) | Utilization %`. Supports two-way sync of category budget limits.
  - **Tab 4 — `Accounts & Wallets`**: Columns `ID | Account Name | Type | Institution | Initial Balance | Current Calculated Balance | Color`. Supports two-way sync of account definitions and starting balances.
  - **Tab 5 — `Net Worth & Debt`**: Two structured sections or unified table with `Record Type (Asset / Liability) | ID | Name | Category | Value / Balance ($) | APR % | Minimum Payment ($) | Notes`. Supports two-way sync back into Assets and Liabilities state.

- **Interactive Component & State Mapping**:
  - **Google Workspace Auth State**: Tracks `googleUser`, `accessToken` (in-memory), `needsGoogleAuth`, and `isAuthenticating`. Automatically prompts with the official Google Sign-In button when a token is needed.
  - **Master Sheet Controller**: Stores the bound `masterSpreadsheetId` and `spreadsheetUrl` in user preferences, verifies existence via Drive API `files.list`, and creates + formats the 5 tabs if missing.
  - **Quick Export Triggers**: Contextual buttons in the **Transaction Ledger**, **Accounts**, **Budgets**, and **Net Worth** modules let users push the current module's table directly to its corresponding tab in the Master Workbook (with confirmation dialog and completion toast).
  - **Two-Way Pull Reconciliation**: Reads ranges via `spreadsheets.values.batchGet`, parses numeric and date cells safely, asks for confirmation with a summary of detected records, and updates both React state and the offline-first Supabase sync queue.
