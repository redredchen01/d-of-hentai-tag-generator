
import React from 'react';
import type { BatchItem } from '../types';
import { CheckBadgeIcon } from './icons/CheckBadgeIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';

interface BatchSidebarProps {
  items: BatchItem[];
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  onPreviewImage: (base64: string) => void;
}

const StatusIndicator: React.FC<{ status: BatchItem['status'] }> = ({ status }) => {
    switch (status) {
        case 'processing':
            return (
                <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[1px] flex items-center justify-center rounded-md z-10 transition-all duration-500">
                    <div className="relative w-6 h-6">
                        <div className="absolute inset-0 rounded-full border-2 border-t-purple-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                    </div>
                </div>
            );
        case 'completed':
            return (
                <div className="absolute top-1 right-1 bg-green-500/90 backdrop-blur-sm rounded-full text-white z-10 shadow-lg shadow-green-500/20 animate-scale-in p-0.5">
                    <CheckBadgeIcon className="w-3 h-3" />
                </div>
            );
        case 'error':
             return (
                <div className="absolute top-1 right-1 bg-red-500/90 backdrop-blur-sm rounded-full text-white z-10 shadow-lg shadow-red-500/20 animate-scale-in p-0.5">
                    <ExclamationCircleIcon className="w-3 h-3" />
                </div>
            );
        default: // pending
            return null;
    }
};

const getStatusLabel = (status: BatchItem['status']) => {
    switch (status) {
        case 'pending': return '等待中';
        case 'processing': return 'AI 分析中...';
        case 'completed': return '完成';
        case 'error': return '失敗';
        default: return status;
    }
};

export const BatchSidebar: React.FC<BatchSidebarProps> = ({ items, activeItemId, onSelectItem, onPreviewImage }) => {
  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === 'completed');
  const processedItems = items.filter(i => i.status === 'completed' || i.status === 'error').length;
  const progress = totalItems > 0 ? (processedItems / totalItems) * 100 : 0;

  const handleExportJson = () => {
      if (completedItems.length === 0) return;
      
      const exportData = completedItems.map(item => ({
          fileName: item.file.name,
          result: item.result
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-results-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  return (
    <aside className="w-full bg-gray-800/60 border border-gray-700 rounded-2xl self-start sticky top-8 flex flex-col max-h-[85vh] shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* Header Section */}
        <div className="p-5 border-b border-gray-700 bg-gray-900/50 z-20">
            <div className="flex justify-between items-end mb-3">
                 <h3 className="text-base font-bold text-purple-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)] animate-pulse"></span>
                    批次佇列
                 </h3>
                 <span className="text-[10px] font-mono font-medium bg-gray-800 text-gray-300 px-2.5 py-0.5 rounded-full border border-gray-600">
                    {processedItems} / {totalItems}
                 </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4 border border-gray-700/50 shadow-inner">
                <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {completedItems.length > 0 && (
                <button
                    onClick={handleExportJson}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-purple-600/20 text-purple-200 hover:text-white border border-gray-600 hover:border-purple-500/50 text-xs font-medium rounded-lg transition-all duration-200 group"
                >
                    <ArrowDownTrayIcon className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                    匯出已完成結果 (.json)
                </button>
            )}
        </div>
        
        {/* List Section */}
        <div className="p-3 space-y-2 overflow-y-auto flex-grow custom-scrollbar">
            {items.map(item => {
                const isProcessing = item.status === 'processing';
                const isActive = activeItemId === item.id;
                
                return (
                    <div
                        key={item.id}
                        onClick={() => onSelectItem(item.id)}
                        className={`
                            relative w-full p-3 rounded-xl flex items-center gap-4 transition-all duration-300 cursor-pointer group overflow-hidden border
                            ${isActive 
                                ? 'bg-purple-900/20 border-purple-500/50 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]' 
                                : 'border-transparent hover:bg-gray-800/80 hover:border-gray-700'}
                            ${isProcessing ? 'border-purple-500/30 bg-purple-900/10' : ''}
                        `}
                    >
                        {/* Active Indicator Strip */}
                        {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
                        )}
                        
                        {/* Thumbnail */}
                        <div className={`
                            relative flex-shrink-0 w-12 h-16 rounded-lg overflow-hidden border border-gray-700 group/image z-10 transition-all duration-300
                            ${isProcessing ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-gray-800 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : ''}
                            ${isActive ? 'border-purple-400/50' : ''}
                        `}>
                            <img 
                                src={item.base64} 
                                alt={item.file.name} 
                                className={`w-full h-full object-cover transition-transform duration-700 ${isProcessing ? 'scale-110' : 'group-hover:scale-105'}`} 
                            />
                            
                            {isProcessing && (
                                <div className="absolute inset-0 bg-purple-500/10 animate-pulse z-20 pointer-events-none"></div>
                            )}

                            <StatusIndicator status={item.status} />
                            
                            {/* Hover Preview Button */}
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPreviewImage(item.base64);
                                }}
                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-all duration-200 z-30 backdrop-blur-[1px]"
                                title="預覽大圖"
                            >
                                <MagnifyingGlassIcon className="w-5 h-5 text-white drop-shadow-md hover:scale-110 transition-transform" />
                            </button>
                        </div>
                        
                        {/* Text Content */}
                        <div className="flex-grow overflow-hidden min-w-0 z-10 flex flex-col justify-center">
                            <p className={`text-sm font-medium truncate transition-colors ${isActive ? 'text-purple-100' : 'text-gray-300 group-hover:text-white'} ${isProcessing ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200 animate-pulse' : ''}`}>
                                {item.file.name}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                                <p className={`text-[10px] flex items-center gap-1.5 font-medium ${
                                    item.status === 'completed' ? 'text-green-400' : 
                                    item.status === 'error' ? 'text-red-400' : 
                                    item.status === 'processing' ? 'text-purple-300' : 'text-gray-500'
                                }`}>
                                    {isProcessing && <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping"></span>}
                                    {getStatusLabel(item.status)}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    </aside>
  );
};
