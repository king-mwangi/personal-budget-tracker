import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, Trash2, X } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface UIModalContextValue {
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
  showToast: (message: string, type?: ToastItem['type']) => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

const UIModalContext = createContext<UIModalContextValue | null>(null);

export function UIModalProvider({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global Cmd+K / Ctrl+K shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const confirmAction = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmClose = (approved: boolean) => {
    if (confirmState) {
      confirmState.resolve(approved);
      setConfirmState(null);
    }
  };

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  return (
    <UIModalContext.Provider
      value={{
        confirmAction,
        showToast,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
      }}
    >
      {children}

      {/* Unified Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmState && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative"
            >
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3.5">
                <div
                  className={`p-3 rounded-xl shrink-0 ${
                    confirmState.options.variant === 'danger'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                      : confirmState.options.variant === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {confirmState.options.variant === 'danger' ? (
                    <Trash2 className="w-5 h-5" />
                  ) : confirmState.options.variant === 'warning' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Info className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1.5 pr-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {confirmState.options.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {confirmState.options.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleConfirmClose(false)}
                  className="py-2 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {confirmState.options.cancelLabel || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmClose(true)}
                  className={`py-2 px-4 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer ${
                    confirmState.options.variant === 'danger'
                      ? 'bg-red-600 hover:bg-red-700'
                      : confirmState.options.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {confirmState.options.confirmLabel || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Non-Blocking Toast Stack */}
      <div className="fixed bottom-6 right-5 z-90 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="pointer-events-auto bg-slate-900 dark:bg-slate-800 text-white border border-slate-700/80 rounded-xl px-4 py-3 shadow-xl flex items-center justify-between gap-3 text-xs font-medium"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    t.type === 'error'
                      ? 'text-red-400'
                      : t.type === 'warning'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                />
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </UIModalContext.Provider>
  );
}

export function useUIModal() {
  const ctx = useContext(UIModalContext);
  if (!ctx) {
    throw new Error('useUIModal must be used within a UIModalProvider');
  }
  return ctx;
}
