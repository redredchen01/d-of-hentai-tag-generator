
import React from 'react';
import type { BatchItem } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { TagDisplay } from './TagDisplay';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import type { ToastType } from './Toast';

interface BatchItemDisplayProps {
  activeItem: BatchItem | null | undefined;
  tagMap: Map<string, string>;
  onExplainTag: (tagName: string, tagDescription: string) => Promise<string>;
  onToast: (message: string, type: ToastType) => void;
}

export const BatchItemDisplay: React.FC<BatchItemDisplayProps> = ({ activeItem, tagMap, onExplainTag, onToast }) => {
  if (!activeItem) {
      return (
        <div className="flex items-center justify-center h-96 bg-gray-800/30 rounded-lg border border-gray-700 border-dashed">
          <p className="text-gray-500">從左側選擇一個項目以查看結果。</p>
        </div>
      );
  }

  if (activeItem.status === 'processing') {
    return (
        <div className="h-96 flex flex-col items-center justify-center bg-gray-800/20 rounded-lg">
            <LoadingSpinner message={`正在分析 ${activeItem.file.name}...`} />
        </div>
    );
  }

  if (activeItem.status === 'error') {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 flex flex-col items-center text-center">
        <div className="bg-red-900/30 p-4 rounded-full mb-4">
             <ExclamationCircleIcon className="w-12 h-12 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-red-400 mb-2">分析失敗</h3>
        <p className="text-gray-300 mb-4 font-mono text-sm bg-black/30 px-3 py-1 rounded">{activeItem.file.name}</p>
        <p className="text-gray-400 max-w-md bg-red-950/30 border border-red-900/50 p-4 rounded-lg text-sm">
            {activeItem.error}
        </p>
      </div>
    );
  }

  if (activeItem.status === 'completed' && activeItem.result) {
    return (
      <div className="animate-fade-in grid grid-cols-1 xl:grid-cols-[1fr,2fr] gap-8 items-start">
        {/* Left Side: Image */}
        <div className="space-y-4 sticky top-8">
            <div className="rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg">
                <img 
                    src={activeItem.base64} 
                    alt={activeItem.file.name} 
                    className="w-full h-auto object-cover"
                />
            </div>
            <p className="text-sm text-gray-400 text-center break-all">{activeItem.file.name}</p>
        </div>

        {/* Right Side: Tags */}
        <div className="min-w-0"> {/* min-w-0 prevents flex child overflow */}
            <TagDisplay 
              result={activeItem.result} 
              tagMap={tagMap} 
              onExplainTag={onExplainTag}
              onToast={onToast}
            />
        </div>
      </div>
    );
  }

  // Fallback (pending)
  return (
    <div className="flex items-center justify-center h-96 bg-gray-800/30 rounded-lg">
      <p className="text-gray-500">等待分析...</p>
    </div>
  );
};
