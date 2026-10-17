import React, { useState } from 'react';
import { useUIModal } from '../context/UIModalContext';
import {
  getGoogleAccessToken,
  googleSignIn,
  findMasterWorkbook,
  provisionMasterWorkbook,
  pushTabToMasterSheet,
  REQUIRED_TAB_TITLES,
  SyncTabKey,
  MasterFinancialPayload,
  MASTER_WORKBOOK_TITLE,
} from '../services/googleWorkspace';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';

interface SheetsQuickSyncButtonProps {
  tabKey: SyncTabKey;
  payload: MasterFinancialPayload;
  recordCountLabel: string;
  onOpenSheetsHub?: () => void;
}

export default function SheetsQuickSyncButton({
  tabKey,
  payload,
  recordCountLabel,
  onOpenSheetsHub,
}: SheetsQuickSyncButtonProps) {
  const { confirmAction, showToast } = useUIModal();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleQuickSync = async () => {
    const tabTitle = REQUIRED_TAB_TITLES[tabKey];

    const confirmed = await confirmAction({
      title: `Sync ${tabTitle} to Google Sheets`,
      message: `Update the "${tabTitle}" tab inside "${MASTER_WORKBOOK_TITLE}" in your Google Drive with ${recordCountLabel}?`,
      confirmLabel: 'Sync to Google Sheets',
      variant: 'info',
    });

    if (!confirmed) return;

    setIsSyncing(true);
    try {
      let token = getGoogleAccessToken();
      if (!token) {
        const authResult = await googleSignIn();
        token = authResult.accessToken;
      }

      let sheetId = localStorage.getItem('fin_tracker_master_sheet_id');
      if (!sheetId) {
        const found = await findMasterWorkbook();
        if (found) {
          sheetId = found.id;
          localStorage.setItem('fin_tracker_master_sheet_id', sheetId);
        } else {
          const created = await provisionMasterWorkbook(payload);
          sheetId = created.spreadsheetId;
          localStorage.setItem('fin_tracker_master_sheet_id', sheetId);
          showToast(
            `Created "${MASTER_WORKBOOK_TITLE}" and synced ${recordCountLabel}!`,
            'success'
          );
          setIsSyncing(false);
          return;
        }
      }

      const res = await pushTabToMasterSheet(sheetId, tabKey, payload);
      if (tabKey !== 'overview') {
        await pushTabToMasterSheet(sheetId, 'overview', payload);
      }
      showToast(
        `Synced ${res.updatedRows} rows to "${res.tabTitle}" in Google Sheets!`,
        'success'
      );
    } catch (err: any) {
      console.error('Quick sync to Google Sheets error:', err);
      showToast(
        err?.message || 'Could not sync to Google Sheets. Open the Sheets Hub to check connection.',
        'error'
      );
      if (onOpenSheetsHub) {
        onOpenSheetsHub();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleQuickSync}
      disabled={isSyncing}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
      title={`Push ${REQUIRED_TAB_TITLES[tabKey]} directly to Google Sheets`}
    >
      {isSyncing ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
      ) : (
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      )}
      <span>{isSyncing ? 'Syncing Sheet...' : 'Sync to Sheets'}</span>
    </button>
  );
}
