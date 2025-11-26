
import React from 'react';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface FailoverNotificationProps {
  providerName: string;
  onClose: () => void;
}

export const FailoverNotification: React.FC<FailoverNotificationProps> = ({ providerName, onClose }) => {
  return (
    <div className="mb-6 animate-fade-in bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 flex items-start gap-3 relative">
        <div className="text-blue-400 flex-shrink-0 mt-0.5">
            <InformationCircleIcon className="w-5 h-5" />
        </div>
        <div className="flex-grow pr-6">
            <h3 className="text-blue-300 font-bold text-sm">自動切換供應商</h3>
            <p className="text-blue-200 text-sm mt-1">
                主要 AI 服務連線失敗，系統已自動切換至 <strong>{providerName}</strong> 完成分析。
            </p>
        </div>
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-blue-400 hover:text-blue-200 transition-colors"
        >
            <XCircleIcon className="w-5 h-5" />
        </button>
    </div>
  );
};
