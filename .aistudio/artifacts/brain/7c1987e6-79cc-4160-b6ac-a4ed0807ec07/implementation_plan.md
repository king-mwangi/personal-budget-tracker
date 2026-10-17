# Ledger Smart — Next-Generation Architecture & Wealth Suite

This upgrade transforms Ledger Smart from a single-file monolithic state container into a modular, offline-resilient personal finance workspace, while introducing multi-account wallet tracking, a net worth and debt payoff strategist, and an AI receipt scanner with bulk statement import.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core feature and architectural priorities from our planning session have been locked in below. Review the proposed UX flows and architecture, then click **Proceed** to begin implementation.

- **Confirmed Decision 1 (New Financial Capabilities)**: Add **Multi-Account & Wallet Tracking** (Bank, Cash, Credit Card, Mobile Money, Crypto), **Net Worth, Assets & Debt Payoff Planner** (Snowball vs. Avalanche amortization engine), and **Smart Receipt Scanner & CSV/Bank Statement Bulk Importer** (server-side Gemini multimodal extraction + interactive CSV column mapper).
- **Confirmed Decision 2 (Architectural Overhaul)**: Decompose the monolithic application state into domain-specific React Contexts and custom hooks, replace browser `window.confirm` / `window.alert` calls with a **Unified Modal & Confirmation Manager**, and introduce an **Offline-First Local Cache with a Real-Time Supabase Sync Queue**.
- **Confirmed Decision 3 (Workspace Navigation & Layout)**: Upgrade the interface to a **Collapsible Grouped Sidebar** paired with a **Top Quick-Action & Breadcrumb Bar** and a keyboard-driven **Global Command Palette (`Cmd+K` / `Ctrl+K`)**.

---

## 1. Overview & Core Concept

- **What It Does**: Provides an end-to-end personal wealth command center where users can track daily cash flow across multiple accounts, scan receipts or bulk-import bank CSV statements, simulate debt payoff timelines, monitor net worth growth, and interact with an AI financial advisor—all backed by instant local persistence and resilient background cloud synchronization.
- **Target Audience / Persona**: Individuals, freelancers, and household financial planners who want institutional-grade clarity over their accounts, liabilities, and budgets without spreadsheet friction.
- **Key Value**: Eliminates manual data-entry bottlenecks via receipt scanning and CSV batch imports, unifies fragmented accounts into a single net-worth view, and replaces a 4,100-line monolithic component with a fast, maintainable, keyboard-navigable workspace.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Collapsible Grouped Navigation & Command Palette (`Cmd+K`)**:
   - Navigation is organized into four clear domain groups: **Core** (Overview, Ledger, Accounts & Wallets), **Planning** (Budgets, Savings Goals, Recurring Bills, Templates), **Wealth & Debt** (Net Worth & Assets, Debt Payoff Planner, Financial Labs), and **Intelligence** (AI Advisor, Monthly Reports).
   - Pressing `Cmd+K` (or clicking the command trigger in the top bar) opens an instant search modal to jump to any view, trigger quick actions (*Scan Receipt*, *Import CSV*, *Log Transaction*, *Toggle Theme*), or filter ledger entries by keyword.
2. **Multi-Account & Wallet Management**:
   - Users can create and manage accounts (*Checking*, *Savings*, *Cash*, *Credit Card*, *Mobile Money / M-Pesa*, *Investment / Crypto*) with starting balances, custom colors, and account-specific filtering.
   - Logging or importing a transaction optionally links it to an account and automatically computes live running balances, plus supports inter-account transfers.
3. **Smart Receipt Scanner & Bulk CSV Importer**:
   - **Receipt Scanner**: Users drop or capture a photo of a paper or digital receipt. The server-side Gemini vision endpoint (`gemini-3.8-flash`) extracts merchant name, date, total amount, line items, and suggested category into an editable preview card before committing to the ledger.
   - **CSV / Statement Importer**: Users upload any bank CSV/Excel file, map columns (Date, Description, Amount or Debit/Credit, Category, Account), auto-categorize unrecognized rows, preview duplicate detection, and batch-import hundreds of rows in one click.
4. **Net Worth, Assets & Debt Payoff Strategist**:
   - **Net Worth Tracker**: Aggregates liquid account balances, manual assets (Real Estate, Vehicles, Equity, Crypto), and liabilities into a live Net Worth balance sheet with asset-allocation breakdowns.
   - **Debt Payoff Planner**: Users enter liabilities (balance, APR %, minimum payment) and an optional extra monthly payment slider. The engine compares **Debt Avalanche** (highest APR first) vs. **Debt Snowball** (lowest balance first), displaying total interest saved, payoff date acceleration, and an interactive month-by-month amortization schedule.

### Visual Identity & Theme

- **Aesthetic Direction**: High-craft financial workspace combining crisp editorial clarity with dense, scannable tabular precision.
- **Color Palette & Mood** (60-30-10 Discipline):
  - **60% Canvas**: Crisp cool alabaster (`#F8FAFC`) in light mode; deep obsidian slate (`#0F172A`) in dark mode.
  - **30% Structural Surfaces**: Pure white (`#FFFFFF`) or elevated slate (`#1E293B`) containers with `1px` hairline borders (`border-slate-200` / `dark:border-slate-800`) and single-elevation depth.
  - **10% Semantic & Action Accents**: Royal cobalt (`#2563EB`) for primary actions and active states; emerald (`#16A34A`) for inflows/assets; amber (`#D97706`) for approaching budget thresholds; crimson (`#DC2626`) for outflows/liabilities.
- **Typography & Hierarchy**:
  - **Display & Navigation**: `Plus Jakarta Sans` (600/700 weights) for crisp section headers and navigation labels.
  - **Body & Controls**: `Plus Jakarta Sans` / `DM Sans` (400/500 weights) for effortless legibility at 12px–15px.
  - **Financial Telemetry & Figures**: `JetBrains Mono` with strict `tabular-nums` alignment across all balances, tables, percentages, and amortization schedules.
- **Interactive Feedback & Motion**:
  - Fast $\le 180\text{ms}$ compositor transitions (`transform`, `opacity`) for sidebar collapse, command palette reveal, and tab switches.
  - Non-blocking sync status indicator in the workspace header showing offline cache readiness and background cloud sync queue completion.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Context + Custom Hook Domain Architecture vs. Single-Component State**
  - *Chosen Approach*: Extract state and business logic into dedicated providers (`FinanceDataContext`, `UIModalContext`, `SyncQueueContext`) and focused workspace shell components (`AppSidebar`, `AppHeader`, `CommandPalette`, `ConfirmDialog`).
  - *Why*: Reduces the root application component size by over 70%, prevents unnecessary full-tree re-renders when typing or filtering, and makes every financial module independently testable and maintainable.
  - *Alternatives Considered*: Keeping state in the root file and passing props down; rejected due to severe prop-drilling and maintenance complexity.
- **Decision 2: Offline-First Local Storage + Optimistic Sync Queue**
  - *Chosen Approach*: Persist all state mutations immediately to indexed `localStorage` namespaces and enqueue Supabase mutations in a resilient background sync queue that retries automatically when connectivity returns.
  - *Why*: Guarantees zero data loss and instantaneous UI responsiveness whether the user is in demo mode, on a flaky connection, or authenticated with Supabase.
- **Decision 3: Server-Side Gemini Vision (`gemini-3.8-flash`) with Structured JSON Schema for Receipt Parsing**
  - *Chosen Approach*: Route receipt images through an Express endpoint (`/api/scan-receipt`) using `@google/genai` and `gemini-3.8-flash` with a strict `responseSchema` returning merchant, date, amount, category, and confidence.
  - *Why*: Keeps the Gemini API key strictly server-side while delivering fast, deterministic JSON extraction that populates the transaction preview without manual typing.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         Application Providers Layer                          │
│  ┌────────────────────────┐ ┌──────────────────────┐ ┌────────────────────┐  │
│  │   FinanceDataContext   │ │   SyncQueueManager   │ │   UIModalContext   │  │
│  │ (Tx, Accounts, Debts,  │◄┼─(Offline LocalCache  │ │ (ConfirmDialog,    │  │
│  │  Assets, Budgets, AI)  │ │  + Supabase Sync)    │ │  Toast, Cmd+K)     │  │
│  └───────────┬────────────┘ └──────────┬───────────┘ └─────────┬──────────┘  │
└──────────────┼─────────────────────────┼───────────────────────┼─────────────┘
               │                         │                       │
               ▼                         ▼                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Workspace Layout Shell                             │
│  ┌────────────────────────┐ ┌─────────────────────────────────────────────┐  │
│  │   CollapsibleSidebar   │ │              TopWorkspaceHeader             │  │
│  │ (Grouped Nav: Core,    │ │ (Breadcrumbs, Account Filter, Sync Badge,   │  │
│  │  Planning, Wealth, AI) │ │  Quick Scan/Import CTA, Cmd+K Trigger)      │  │
│  └────────────────────────┘ └──────────────────────┬──────────────────────┘  │
│                                                    │                         │
│  ┌─────────────────────────────────────────────────▼──────────────────────┐  │
│  │                        Active Module Viewport                          │  │
│  │  • Overview Dashboard          • Multi-Account & Wallet Manager        │  │
│  │  • Ledger + Bulk Categorizer   • Smart Receipt & CSV Bulk Importer     │  │
│  │  • Net Worth & Asset Sheet     • Debt Payoff Planner (Snowball/Avl.)   │  │
│  │  • Budgets / Goals / Recurring • Financial Labs / Reports / AI Chat    │  │
│  └─────────────────────────────────────────────────┬──────────────────────┘  │
└────────────────────────────────────────────────────┼─────────────────────────┘
                                                     │
                                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Express Backend Proxy (/api/*)                        │
│  • POST /api/scan-receipt  ──► Gemini 3.8 Flash Multimodal Receipt Parser    │
│  • POST /api/insights      ──► Gemini 3.8 Flash Financial Diagnostics        │
│  • POST /api/advisor       ──► Gemini 3.8 Flash Wealth Advisor Chat          │
│  • POST /api/send-report   ──► Executive PDF Statement Email Dispatch        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State Extensions

- **`Account` (Wallet)**: `id`, `name`, `type` (`'checking' | 'savings' | 'credit' | 'cash' | 'mobile_money' | 'crypto' | 'investment'`), `initialBalance`, `currency`, `color`, `institution`.
- **`Transaction` (Extended)**: Adds optional `accountId`, `receiptItems`, and `tags` while maintaining 100% backward compatibility with existing ledger records.
- **`AssetItem` & `LiabilityItem`**:
  - `AssetItem`: `id`, `name`, `category` (`'real_estate' | 'vehicle' | 'equity' | 'crypto' | 'valuables' | 'other'`), `value`, `notes`, `lastUpdated`.
  - `LiabilityItem`: `id`, `name`, `category` (`'credit_card' | 'student_loan' | 'mortgage' | 'auto_loan' | 'personal_loan'`), `balance`, `apr`, `minimumPayment`, `dueDate`.
- **`SyncQueueItem`**: `id`, `entity`, `action` (`'insert' | 'update' | 'delete'`), `payload`, `timestamp`, `retryCount`.

### Interactive Component & State Mapping

- **Global Command Palette (`Cmd+K`)**: Listens for `keydown` (`Meta+K` / `Ctrl+K`), filters navigation destinations, accounts, and quick actions in real time, and executes view switches or modal triggers on `Enter`.
- **Unified Confirmation Dialog**: Exposes an async `confirmAction({ title, message, confirmLabel, variant })` hook so destructive actions (deleting transactions, resetting data, removing accounts) render an accessible modal instead of native `window.confirm()`.
- **Smart Receipt & CSV Importer**:
  - *Receipt Mode*: Converts uploaded image to base64, posts to `/api/scan-receipt`, renders extracted fields in an editable form, and commits to the selected account and ledger.
  - *CSV Mode*: Parses CSV/Excel files client-side, auto-detects headers (`date`, `amount`, `description`, `category`), flags potential duplicates against existing transactions, and commits approved rows in a single batch state update.
- **Debt Payoff Engine**: Pure calculation utility computing month-by-month amortization arrays under both Snowball and Avalanche rules, dynamically updating payoff date, total interest paid, and interest saved as the user adjusts their extra monthly contribution slider.
