import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useMemo(() => ({
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    info: (msg: string) => addToast('info', msg),
  }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div 
        id="toast-notifications-container"
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            let bgColor = 'bg-slate-900 border-slate-800';
            let icon = <Info className="w-5 h-5 text-blue-400" />;
            let textColor = 'text-white';
            let progressBg = 'bg-blue-500';

            if (t.type === 'success') {
              bgColor = 'bg-emerald-950 border-emerald-800/50';
              icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
              textColor = 'text-emerald-50';
              progressBg = 'bg-emerald-500';
            } else if (t.type === 'error') {
              bgColor = 'bg-rose-950 border-rose-800/50';
              icon = <AlertCircle className="w-5 h-5 text-rose-405 shrink-0" />;
              textColor = 'text-rose-50';
              progressBg = 'bg-rose-500';
            } else if (t.type === 'info') {
              bgColor = 'bg-slate-900 border-slate-800';
              icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;
              textColor = 'text-sky-50';
              progressBg = 'bg-sky-500';
            }

            return (
              <motion.div
                key={t.id}
                id={`toast-${t.id}`}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className={`pointer-events-auto flex flex-col items-stretch overflow-hidden rounded-2xl border ${bgColor} p-4 shadow-xl shadow-black/35 min-w-[280px]`}
              >
                <div className="flex items-start gap-3">
                  {icon}
                  <div className="flex-1 text-sm font-medium leading-relaxed font-sans mt-[1px] break-words">
                    <span className={textColor}>{t.message}</span>
                  </div>
                  <button
                    onClick={() => removeToast(t.id)}
                    className="text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded-lg hover:bg-white/10 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Progress bar simulation indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/15">
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: 0 }}
                    transition={{ duration: 4.5, ease: 'linear' }}
                    className={`h-full ${progressBg}`}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
