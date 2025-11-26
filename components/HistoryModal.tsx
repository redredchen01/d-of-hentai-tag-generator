import React, { useEffect } from 'react';
import type { HistoryEntry } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
  onLoad: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onLoad, onClear }) => {
  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl w-full max-w-3xl m-4 text-white relative transform transition-all animate-slide-in-up flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-purple-300">生成歷史紀錄</h2>
             <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors" aria-label="Close history">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>這裡還沒有任何紀錄。</p>
              <p className="text-sm mt-1">試著生成一些標籤吧！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div key={entry.id} className="bg-gray-900/50 p-4 rounded-lg flex items-start gap-4 border border-transparent hover:border-purple-500 transition-colors">
                  <img src={entry.image} alt="History thumbnail" className="w-24 h-36 object-cover rounded-md flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-gray-300 text-sm mb-2 italic line-clamp-2">"{entry.result.description}"</p>
                    <div className="text-xs space-y-1">
                      <p><span className="font-semibold text-purple-300">主要:</span> {entry.result.mainTags.map(t => t.name).join(', ')}</p>
                      <p><span className="font-semibold text-amber-300">潛力:</span> {entry.result.potentialTags.map(t => t.name).join(', ')}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onLoad(entry)}
                    className="ml-auto flex-shrink-0 self-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg text-sm transition-colors hover:bg-purple-700"
                   >
                    載入
                   </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {history.length > 0 && (
            <div className="p-4 border-t border-gray-700 text-right">
                <button 
                    onClick={onClear} 
                    className="flex items-center gap-2 px-4 py-2 bg-red-800/80 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                    <TrashIcon className="w-4 h-4" />
                    清除所有紀錄
                </button>
            </div>
        )}
      </div>
    </div>
  );
};