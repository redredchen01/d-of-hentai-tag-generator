
import React, { useEffect } from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircleIcon className="w-5 h-5 text-green-400" />,
    error: <XCircleIcon className="w-5 h-5 text-red-400" />,
    info: <InformationCircleIcon className="w-5 h-5 text-blue-400" />,
  };

  const styles = {
    success: 'bg-gray-800 border-green-500/30 text-green-100',
    error: 'bg-gray-800 border-red-500/30 text-red-100',
    info: 'bg-gray-800 border-blue-500/30 text-blue-100',
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl shadow-black/50 backdrop-blur-md animate-slide-in-up ${styles[toast.type]}`}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <p className="text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-2 text-white/50 hover:text-white transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
