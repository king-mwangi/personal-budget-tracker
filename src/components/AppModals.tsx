import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, User, UserX, X } from 'lucide-react';

interface AppModalsProps {
  // Reset Modal
  showResetModal: boolean;
  setShowResetModal: (val: boolean) => void;
  transactionsCount: number;
  budgetsCount: number;
  goalsCount: number;
  customTemplatesCount: number;
  currency: string;
  onClearTemplates: () => void;
  onResetAllData: () => void;

  // Profile Modal
  showProfileModal: boolean;
  setShowProfileModal: (val: boolean) => void;
  userEmail?: string;
  editFirstName: string;
  setEditFirstName: (val: string) => void;
  editLastName: string;
  setEditLastName: (val: string) => void;
  profileError: string | null;
  profileSuccess: string | null;
  isProfileUpdating: boolean;
  onUpdateProfile: (e: React.FormEvent) => void;
  onOpenDeleteAccountModal: () => void;

  // Delete Account Modal
  showDeleteAccountModal: boolean;
  setShowDeleteAccountModal: (val: boolean) => void;
  isDeletingAccount: boolean;
  deleteAccountError: string | null;
  onDeleteAccount: () => void;
}

export default function AppModals({
  showResetModal,
  setShowResetModal,
  transactionsCount,
  budgetsCount,
  goalsCount,
  customTemplatesCount,
  currency,
  onClearTemplates,
  onResetAllData,
  showProfileModal,
  setShowProfileModal,
  userEmail,
  editFirstName,
  setEditFirstName,
  editLastName,
  setEditLastName,
  profileError,
  profileSuccess,
  isProfileUpdating,
  onUpdateProfile,
  onOpenDeleteAccountModal,
  showDeleteAccountModal,
  setShowDeleteAccountModal,
  isDeletingAccount,
  deleteAccountError,
  onDeleteAccount,
}: AppModalsProps) {
  return (
    <>
      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-4"
            >
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl mt-0.5">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Reset Application Data
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    You are about to wipe out all transactions, category budgets, and savings goals to start on a clean canvas.
                  </p>
                </div>
              </div>

              <div className="bg-red-50/55 dark:bg-red-950/20 rounded-xl p-4 border border-red-100 dark:border-red-900/30 text-[11px] leading-relaxed text-red-700 dark:text-red-300 space-y-2">
                <p className="font-bold text-xs text-red-600 dark:text-red-400">
                  Warning: Irreversible Operation
                </p>
                <ul className="list-disc pl-4 space-y-1 font-medium">
                  <li>Permanently deletes {transactionsCount} transactions inside your Ledger.</li>
                  <li>Clears {budgetsCount} budget limit constraints entirely.</li>
                  <li>Wipes out {goalsCount} active savings goals and accrued progress.</li>
                  <li>Purges historical conversational chatbot logs.</li>
                </ul>
                <p className="mt-2 text-red-700/80 dark:text-red-300/80">
                  Your selected currency (<span className="font-bold underline">{currency}</span>) will be retained.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="delete-templates-chk"
                  className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-md cursor-pointer"
                  defaultChecked={false}
                />
                <label
                  htmlFor="delete-templates-chk"
                  className="text-xs text-slate-600 dark:text-slate-300 font-medium select-none cursor-pointer"
                >
                  Also remove my {customTemplatesCount} custom saved budget templates
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const checkEl = document.getElementById('delete-templates-chk') as HTMLInputElement;
                    if (checkEl && checkEl.checked) {
                      onClearTemplates();
                    }
                    onResetAllData();
                  }}
                  className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Clean App Slate
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modification Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-4"
            >
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/45 text-blue-600 dark:text-blue-400 rounded-2xl mt-0.5">
                  <User className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Edit Profile Name
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Update your identity details below. Your first name displays on your workspace and reports.
                  </p>
                </div>
              </div>

              <form onSubmit={onUpdateProfile} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Registered Email Address
                  </label>
                  <div className="py-2 px-3.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-950 text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                    {userEmail}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label
                      htmlFor="editFirstName"
                      className="block text-[11px] font-bold text-slate-500 dark:text-slate-400"
                    >
                      First Name
                    </label>
                    <input
                      id="editFirstName"
                      type="text"
                      required
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="e.g. John"
                      className="block w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="editLastName"
                      className="block text-[11px] font-bold text-slate-500 dark:text-slate-400"
                    >
                      Last Name
                    </label>
                    <input
                      id="editLastName"
                      type="text"
                      required
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="e.g. Doe"
                      className="block w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-950 text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500 dark:text-white"
                    />
                  </div>
                </div>

                {profileError && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-950 p-2.5">
                    <p className="text-[11px] text-red-800 dark:text-red-400 font-medium">
                      {profileError}
                    </p>
                  </div>
                )}

                {profileSuccess && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-950 p-2.5">
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-400 font-medium">
                      ✓ {profileSuccess}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProfileUpdating}
                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isProfileUpdating && (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-white animate-spin" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>

              <div className="border-t border-red-200/40 dark:border-red-950/40 pt-4 mt-6">
                <h4 className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                  Danger Zone
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Permanently terminate your Ledger Smart account and erase all records.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false);
                    onOpenDeleteAccountModal();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold text-red-600 bg-red-50/50 hover:bg-red-50 dark:text-red-400 dark:bg-red-950/15 dark:hover:bg-red-950/30 border border-red-200/50 dark:border-red-900/35 transition-all cursor-pointer"
                >
                  <UserX className="w-4 h-4" />
                  Terminate Account & Purge Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteAccountModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative space-y-4"
            >
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                disabled={isDeletingAccount}
                className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl mt-0.5">
                  <UserX className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Permanently Terminate Account
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    You are about to permanently terminate your account and erase all of your data from both local storage and database servers.
                  </p>
                </div>
              </div>

              <div className="bg-red-50/55 dark:bg-red-950/20 rounded-xl p-4 border border-red-100 dark:border-red-900/30 text-[11px] leading-relaxed text-red-700 dark:text-red-300 space-y-2">
                <p className="font-bold text-xs text-red-600 dark:text-red-400">
                  Critical Warning: Deletion is Permanent
                </p>
                <ul className="list-disc pl-4 space-y-1 font-medium">
                  <li>Permanently purges all ledger transaction records on the cloud database.</li>
                  <li>Erases all active and archived category budgets and wallets.</li>
                  <li>Wipes out all milestones, net worth assets, and savings goals.</li>
                  <li>Deletes your chatbot logs and system settings forever.</li>
                </ul>
              </div>

              {deleteAccountError && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-950 p-2.5">
                  <p className="text-[11px] text-red-800 dark:text-red-400 font-medium">
                    {deleteAccountError}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountModal(false)}
                  disabled={isDeletingAccount}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onDeleteAccount}
                  disabled={isDeletingAccount}
                  className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isDeletingAccount ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-white animate-spin" />
                  ) : (
                    <UserX className="w-3.5 h-3.5" />
                  )}
                  <span>{isDeletingAccount ? 'Purging Account Data...' : 'Terminate Account'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
