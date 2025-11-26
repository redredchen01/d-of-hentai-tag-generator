
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { GeneratedTagsResult, GeneratedTag } from '../types';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { PromptBuilder } from './PromptBuilder';
import { TagSection } from './TagSection';
import { CreativeExpansionPanel } from './CreativeExpansionPanel';
import type { ToastType } from './Toast';

interface TagDisplayProps {
  result: GeneratedTagsResult;
  tagMap: Map<string, string>;
  onExplainTag: (tagName: string, tagDescription: string) => Promise<string>;
  pinnedTags?: string[];
  excludedTags?: string[];
  onTogglePin?: (tagName: string) => void;
  onToggleExclude?: (tagName: string) => void;
  onToast: (message: string, type: ToastType) => void;
  onGenerateImage?: (prompt: string) => void;
}

export const TagDisplay: React.FC<TagDisplayProps> = ({ 
  result, 
  tagMap, 
  onExplainTag, 
  pinnedTags, 
  excludedTags, 
  onTogglePin, 
  onToggleExclude,
  onToast,
  onGenerateImage
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    setSelectedTags([]);
    setSearchTerm('');
  }, [result]);

  const filterTags = useCallback((tags: GeneratedTag[]) => {
    if (!searchTerm.trim()) return tags;
    const lowerTerm = searchTerm.toLowerCase();
    return tags.filter(tag => tag.name.toLowerCase().includes(lowerTerm));
  }, [searchTerm]);

  const filteredMainTags = useMemo(() => filterTags(result.mainTags), [result.mainTags, filterTags]);
  const filteredPotentialTags = useMemo(() => filterTags(result.potentialTags), [result.potentialTags, filterTags]);

  const handleCopyAll = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    onToast("內容已複製到剪貼簿", 'success');
  };
  
  const handleCopyTags = (tags: GeneratedTag[]) => {
      const text = tags.map(tag => tag.name).join(', ');
      handleCopyAll(text);
  }

  const handleDownloadReport = () => {
      const lines = [
          `【故事詳述】`, result.description, ``,
          `【主要標籤】`, result.mainTags.map(t => `${t.name} (${t.score})`).join(', '), ``,
          `【潛力標籤】`, result.potentialTags.map(t => `${t.name} (${t.score})`).join(', '),
      ];

      if (result.marketingCopy) {
          lines.push(``, `【創意延伸】`);
          lines.push(`Logline: ${result.marketingCopy.logline}`);
          lines.push(`對白: ${result.marketingCopy.dialogueSnippet}`);
          lines.push(`宣傳短句:`);
          result.marketingCopy.catchphrases.forEach(c => lines.push(`- ${c}`));
      }

      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tag-analysis-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast("報告下載已開始", 'success');
  };

  const handleDownloadJson = () => {
      const jsonString = JSON.stringify(result, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tag-analysis-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast("JSON 下載已開始", 'success');
  };

  const handleToggleSelect = (tagName: string) => {
      setSelectedTags(prev => prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]);
  };

  return (
    <div className="space-y-12 pb-48">
      {/* Description Section */}
      <div className="animate-slide-in-up">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5">
            <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                <span className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]"></span>
                故事詳述
            </h3>
             <div className="flex gap-2">
                <button
                    onClick={handleDownloadReport}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all text-xs font-bold text-gray-300 hover:text-white hover:border-gray-600 hover:shadow-lg active:scale-95"
                    title="下載文字報告 (.txt)"
                >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>TXT</span>
                </button>
                 <button
                    onClick={handleDownloadJson}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all text-xs font-bold text-gray-300 hover:text-white hover:border-gray-600 hover:shadow-lg active:scale-95"
                    title="下載結構化數據 (.json)"
                >
                    <span className="font-mono font-bold opacity-80 text-xs">&lt;/&gt;</span>
                    <span>JSON</span>
                </button>
            </div>
        </div>
        <div className="relative group">
            {/* Decorative Gradient Background */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl blur-md opacity-50 group-hover:opacity-80 transition duration-700"></div>
            
            <blockquote className="relative p-8 bg-[#09090b]/80 border border-white/10 rounded-2xl text-gray-300 leading-loose backdrop-blur-md shadow-2xl">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-500 via-purple-400 to-transparent rounded-l-2xl opacity-50"></div>
                <div className="px-4 text-lg font-medium tracking-wide text-gray-200/90 font-serif whitespace-pre-wrap">
                    {result.description}
                </div>
            </blockquote>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group animate-slide-in-up z-20" style={{ animationDelay: '100ms' }}>
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="篩選標籤關鍵字..."
          className="w-full pl-12 pr-12 py-3.5 bg-[#18181b]/80 border border-gray-700/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-gray-200 placeholder-gray-600 backdrop-blur-xl shadow-lg hover:bg-[#27272a]"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
          >
            <XCircleIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-in-up" style={{ animationDelay: '200ms' }}>
        <TagSection 
          title="主要標籤"
          tags={filteredMainTags}
          colorTheme="purple"
          tagMap={tagMap}
          onExplainTag={onExplainTag}
          pinnedTags={pinnedTags}
          excludedTags={excludedTags}
          selectedTags={selectedTags}
          onTogglePin={onTogglePin}
          onToggleExclude={onToggleExclude}
          onToggleSelect={handleToggleSelect}
          onCopyTags={handleCopyTags}
        />

        <TagSection 
          title="潛力標籤"
          tags={filteredPotentialTags}
          colorTheme="amber"
          tagMap={tagMap}
          onExplainTag={onExplainTag}
          pinnedTags={pinnedTags}
          excludedTags={excludedTags}
          selectedTags={selectedTags}
          onTogglePin={onTogglePin}
          onToggleExclude={onToggleExclude}
          onToggleSelect={handleToggleSelect}
          onCopyTags={handleCopyTags}
        />
      </div>

      {/* Creative Expansion Section */}
      {result.marketingCopy && (
        <CreativeExpansionPanel 
          marketingCopy={result.marketingCopy}
          onCopy={handleCopyAll}
        />
      )}

      {selectedTags.length > 0 && (
          <PromptBuilder 
            selectedTags={selectedTags} 
            onClear={() => setSelectedTags([])}
            onRemoveTag={handleToggleSelect}
            onToast={onToast}
            onGenerateImage={onGenerateImage || (() => {})}
          />
      )}
    </div>
  );
};
