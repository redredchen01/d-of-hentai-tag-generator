import React, { useState, useRef, useEffect } from 'react';
import type { GeneratedTag } from '../types';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { PinIcon } from './icons/PinIcon';
import { SlashIcon } from './icons/SlashIcon';

interface TagChipProps {
  tag: GeneratedTag;
  description?: string;
  onExplainTag: (tagName: string, tagDescription: string) => Promise<string>;
  isPinned?: boolean;
  isExcluded?: boolean;
  isSelected?: boolean;
  onTogglePin?: (tagName: string) => void;
  onToggleExclude?: (tagName: string) => void;
  onToggleSelect?: (tagName: string) => void;
}

const getScoreColor = (score: number) => {
  if (score >= 85) return 'bg-red-500';
  if (score >= 70) return 'bg-orange-500';
  return 'bg-amber-500';
};

export const TagChip: React.FC<TagChipProps> = ({ 
  tag, 
  description, 
  onExplainTag,
  isPinned,
  isExcluded,
  isSelected,
  onTogglePin,
  onToggleExclude,
  onToggleSelect
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [aiExplanation, setAiExplanation] = useState<{ loading: boolean; text: string | null; error: string | null }>({
    loading: false,
    text: null,
    error: null,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleExplain = async () => {
    if (!description || aiExplanation.loading) return;
    setAiExplanation({ loading: true, text: null, error: null });
    try {
        const explanation = await onExplainTag(tag.name, description);
        setAiExplanation({ loading: false, text: explanation, error: null });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get explanation.';
        setAiExplanation({ loading: false, text: null, error: message });
    }
  };

  const handleTogglePopover = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering selection
    const willBeOpen = !isPopoverOpen;
    setIsPopoverOpen(willBeOpen);

    if (willBeOpen && !aiExplanation.text && !aiExplanation.error && !aiExplanation.loading) {
      handleExplain();
    }
  };

  const handlePinClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onTogglePin?.(tag.name);
  }

  const handleExcludeClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExclude?.(tag.name);
  }

  const handleSelectClick = () => {
      onToggleSelect?.(tag.name);
  }

  const scoreColorClass = getScoreColor(tag.score);

  // Dynamic Styles
  let borderClass = 'border-gray-600';
  let bgClass = 'bg-gray-800';
  let textClass = 'text-gray-200';
  let opacityClass = 'opacity-100';

  if (isPinned) {
      borderClass = 'border-purple-500 ring-1 ring-purple-500';
      bgClass = 'bg-purple-900/40';
  } else if (isExcluded) {
      borderClass = 'border-gray-700';
      bgClass = 'bg-gray-900';
      textClass = 'text-gray-500 line-through decoration-gray-500';
      opacityClass = 'opacity-60';
  } else if (isSelected) {
      borderClass = 'border-blue-400 ring-1 ring-blue-400';
      bgClass = 'bg-blue-900/30';
      textClass = 'text-blue-100';
  }

  return (
    <div ref={popoverRef} className={`relative ${opacityClass}`}>
      <div 
        onClick={handleSelectClick}
        className={`relative group flex items-center gap-2 rounded-full pl-3 pr-2 py-1 text-sm font-medium border transition-all duration-200 cursor-pointer select-none ${borderClass} ${bgClass} ${textClass} hover:brightness-110`}
      >
        {!isExcluded && (
            <div className={`absolute left-0 top-0 h-full ${scoreColorClass} opacity-20`} style={{ width: `${tag.score}%` }}></div>
        )}
        
        <span className="relative z-10">{tag.name}</span>
        <span className="relative z-10 text-xs opacity-80">🔥{tag.score}</span>
        
        {/* Hover Actions for Pin/Exclude */}
        <div className="hidden group-hover:flex items-center gap-1 ml-1 relative z-20 bg-gray-900/80 rounded-full px-1">
             {onTogglePin && (
                <button 
                    onClick={handlePinClick}
                    className={`p-0.5 rounded-full hover:bg-gray-700 ${isPinned ? 'text-purple-400' : 'text-gray-400'}`}
                    title={isPinned ? "取消釘選" : "釘選標籤"}
                >
                    <PinIcon className="w-3 h-3" />
                </button>
             )}
             {onToggleExclude && (
                 <button 
                    onClick={handleExcludeClick}
                    className={`p-0.5 rounded-full hover:bg-gray-700 ${isExcluded ? 'text-red-400' : 'text-gray-400'}`}
                    title={isExcluded ? "取消排除" : "排除標籤"}
                >
                    <SlashIcon className="w-3 h-3" />
                </button>
             )}
        </div>

        {description && (
           <button 
            onClick={handleTogglePopover}
            className="relative z-10 p-0.5 text-gray-400 hover:text-purple-300 transition-colors ml-1"
            aria-label="Show tag description"
          >
            <QuestionMarkCircleIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {isPopoverOpen && description && (
         <div 
          className="absolute bottom-full mb-2 w-64 bg-gray-900 border border-purple-500/50 rounded-lg shadow-xl p-3 z-50 text-xs text-gray-300 animate-fade-in backdrop-blur-md"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center justify-between mb-1">
             <p className="font-bold text-purple-300 text-sm">{tag.name}</p>
             <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">Score: {tag.score}</span>
          </div>
          
          <p className="leading-relaxed">{description}</p>
          
          <div className="mt-2 pt-2 border-t border-gray-700/80">
            <p className="font-semibold text-gray-300 mb-1 flex items-center gap-1">
                <span>🤖 AI 解釋</span>
            </p>
            {aiExplanation.loading && (
                <p className="text-purple-300 animate-pulse">AI 編輯思考中...</p>
            )}
            {aiExplanation.error && (
                <div className="text-red-400">
                    <p>{aiExplanation.error}</p>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleExplain(); }}
                        className="mt-1 text-purple-400 hover:text-purple-300 font-semibold transition-colors text-xs"
                    >
                        重試
                    </button>
                </div>
            )}
            {aiExplanation.text && (
                <p className="italic text-gray-300 border-l-2 border-purple-500/30 pl-2 py-1">"{aiExplanation.text}"</p>
            )}
        </div>
        {/* Triangle Pointer */}
        <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-900 border-b border-r border-purple-500/50 rotate-45"></div>
        </div>
      )}
    </div>
  );
};
