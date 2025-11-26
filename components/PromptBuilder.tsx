
import React, { useState, useEffect } from 'react';
import { CopyIcon } from './icons/CopyIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SwatchIcon } from './icons/SwatchIcon';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { PlusIcon } from './icons/PlusIcon';
import { MinusIcon } from './icons/MinusIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import type { ToastType } from './Toast';

interface PromptBuilderProps {
  selectedTags: string[];
  onClear: () => void;
  onRemoveTag: (tag: string) => void;
  onToast: (message: string, type: ToastType) => void;
  onGenerateImage: (prompt: string) => void;
}

interface PromptItem {
    id: string;
    text: string;
    weight: number; // 0 = normal, 1 = (), 2 = (()), -1 = [], etc.
    isCustom?: boolean;
}

export const PromptBuilder: React.FC<PromptBuilderProps> = ({ selectedTags, onClear, onRemoveTag, onToast, onGenerateImage }) => {
  const [format, setFormat] = useState<'comma' | 'space'>('comma');
  const [items, setItems] = useState<PromptItem[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // Efficiently sync internal state with parent props
  useEffect(() => {
      setItems(prev => {
          // Create a map of existing items for O(1) lookup to preserve weights
          const existingMap = new Map(prev.map(item => [item.text, item]));
          
          // Keep custom tags that haven't been explicitly removed by user (handled in removeInternal)
          const customItems = prev.filter(i => i.isCustom);
          
          // Rebuild list from selectedTags, preserving weights if they existed
          const tagItems = selectedTags.map(tag => {
              const existing = existingMap.get(tag);
              if (existing) return existing;
              return { id: tag, text: tag, weight: 0 };
          });
          
          // Combine custom items (usually appended) - basic logic, can be refined for ordering
          // For now, we just reconstruct. Ideally, we should merge intelligently to keep order.
          // Simple merge: Keep everything from prev that is still valid + new ones.
          
          const newValidTexts = new Set(selectedTags);
          const merged: PromptItem[] = [];
          
          // 1. Keep existing items that are either valid selected tags or custom tags
          prev.forEach(item => {
              if (item.isCustom || newValidTexts.has(item.text)) {
                  merged.push(item);
              }
          });

          // 2. Add new selected tags that weren't in prev
          selectedTags.forEach(tag => {
              if (!merged.some(m => m.text === tag)) {
                  merged.push({ id: tag, text: tag, weight: 0 });
              }
          });

          return merged;
      });
  }, [selectedTags]);

  const formatItem = (item: PromptItem) => {
      let text = item.text;
      if (item.weight > 0) {
          text = '('.repeat(item.weight) + text + ')'.repeat(item.weight);
      } else if (item.weight < 0) {
          text = '['.repeat(Math.abs(item.weight)) + text + ']'.repeat(Math.abs(item.weight));
      }
      return text;
  };

  const getFullPrompt = () => {
      const separator = format === 'comma' ? ', ' : ' ';
      return items.map(formatItem).join(separator);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFullPrompt());
    onToast("咒語已複製到剪貼簿！", 'success');
  };

  const moveItem = (index: number, direction: -1 | 1) => {
      const newItems = [...items];
      if (index + direction < 0 || index + direction >= newItems.length) return;
      const temp = newItems[index];
      newItems[index] = newItems[index + direction];
      newItems[index + direction] = temp;
      setItems(newItems);
  };

  const changeWeight = (index: number, delta: number) => {
      const newItems = [...items];
      newItems[index].weight += delta;
      setItems(newItems);
  };

  const removeInternal = (item: PromptItem) => {
      if (item.isCustom) {
          setItems(prev => prev.filter(i => i !== item));
      } else {
          onRemoveTag(item.text);
      }
  };
  
  const addCustomTag = (e: React.FormEvent) => {
      e.preventDefault();
      if (!customTagInput.trim()) return;
      const newTag = customTagInput.trim();
      setItems(prev => [...prev, { id: `custom-${Date.now()}`, text: newTag, weight: 0, isCustom: true }]);
      setCustomTagInput('');
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4 z-40 animate-slide-in-up">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-purple-300">咒語構建器</span>
            <span className="text-xs bg-purple-900/50 text-purple-200 px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setFormat(prev => prev === 'comma' ? 'space' : 'comma')} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="切換分隔符">
              <SwatchIcon className="w-4 h-4" />
            </button>
            <div className="h-4 w-[1px] bg-gray-600 mx-1"></div>
            <button onClick={onClear} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors" title="清除全部">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="p-3 max-h-48 overflow-y-auto custom-scrollbar">
            <div className="flex flex-wrap gap-2">
            {items.length === 0 ? (
                <p className="text-gray-500 text-sm w-full text-center py-4 italic">點擊上方標籤或輸入自定義標籤...</p>
            ) : (
                items.map((item, index) => (
                <div key={item.id} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 group hover:border-purple-500 transition-colors select-none">
                    <div className="flex flex-col -space-y-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveItem(index, -1)} disabled={index === 0} className="text-gray-500 hover:text-white disabled:opacity-30"><ChevronLeftIcon className="w-3 h-3" /></button>
                    </div>
                    <span className={`font-mono ${item.weight !== 0 ? 'text-purple-300 font-bold' : ''}`}>{formatItem(item)}</span>
                    <div className="flex flex-col -space-y-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity border-l border-gray-700 pl-1">
                        <button onClick={() => changeWeight(index, 1)} className="text-gray-500 hover:text-green-400"><PlusIcon className="w-3 h-3" /></button>
                        <button onClick={() => changeWeight(index, -1)} className="text-gray-500 hover:text-red-400"><MinusIcon className="w-3 h-3" /></button>
                    </div>
                     <div className="flex flex-col -space-y-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30"><ChevronRightIcon className="w-3 h-3" /></button>
                    </div>
                    <button onClick={() => removeInternal(item)} className="ml-1 p-0.5 text-gray-500 hover:text-red-400 focus:outline-none rounded-full hover:bg-gray-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                </div>
                ))
            )}
            </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-800/30 p-2 border-t border-gray-700 flex gap-2">
            <form onSubmit={addCustomTag} className="flex-grow relative">
                <input type="text" value={customTagInput} onChange={(e) => setCustomTagInput(e.target.value)} placeholder="輸入自定義標籤 + Enter..." className="w-full bg-gray-900 border border-gray-600 text-gray-300 text-xs rounded px-3 py-2 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"/>
                <button type="submit" className="absolute right-1 top-1 bottom-1 text-gray-400 hover:text-white px-2"><PlusIcon className="w-4 h-4" /></button>
            </form>
            <button onClick={() => onGenerateImage(getFullPrompt())} disabled={items.length === 0} className={`px-3 py-1.5 rounded text-sm font-bold transition-all duration-300 flex items-center gap-2 ${items.length === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                <PhotoIcon className="w-4 h-4" /> 生成封面
            </button>
            <button onClick={handleCopy} disabled={items.length === 0} className={`px-4 py-1.5 rounded text-sm font-bold transition-all duration-300 flex items-center gap-2 ${items.length === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20'}`}>
                <CopyIcon className="w-4 h-4" /> 複製
            </button>
        </div>
      </div>
    </div>
  );
};
