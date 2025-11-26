
import React, { useState, useMemo } from 'react';
import { CopyIcon } from './icons/CopyIcon';
import { TagChip } from './TagChip';
import type { GeneratedTag } from '../types';

type SortOption = 'score-desc' | 'score-asc' | 'name-asc';

interface TagSectionProps {
  title: string;
  tags: GeneratedTag[];
  colorTheme: 'purple' | 'amber';
  tagMap: Map<string, string>;
  onExplainTag: (tagName: string, tagDescription: string) => Promise<string>;
  pinnedTags?: string[];
  excludedTags?: string[];
  selectedTags?: string[];
  onTogglePin?: (tagName: string) => void;
  onToggleExclude?: (tagName: string) => void;
  onToggleSelect?: (tagName: string) => void;
  onCopyTags: (tags: GeneratedTag[]) => void;
}

export const TagSection: React.FC<TagSectionProps> = ({
  title,
  tags,
  colorTheme,
  tagMap,
  onExplainTag,
  pinnedTags,
  excludedTags,
  selectedTags,
  onTogglePin,
  onToggleExclude,
  onToggleSelect,
  onCopyTags,
}) => {
  const [sortOption, setSortOption] = useState<SortOption>('score-desc');

  const sortedTags = useMemo(() => {
    const sorted = [...tags];
    switch (sortOption) {
      case 'score-desc': return sorted.sort((a, b) => b.score - a.score);
      case 'score-asc': return sorted.sort((a, b) => a.score - b.score);
      case 'name-asc': return sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
      default: return sorted;
    }
  }, [tags, sortOption]);

  const themeClasses = {
    purple: {
      borderTop: 'border-t-purple-500/50 hover:border-t-purple-400',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      bgGradient: 'bg-gradient-to-b from-purple-900/5 to-transparent',
    },
    amber: {
      borderTop: 'border-t-amber-500/50 hover:border-t-amber-400',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      bgGradient: 'bg-gradient-to-b from-amber-900/5 to-transparent',
    },
  }[colorTheme];

  return (
    <div className={`glass-panel rounded-3xl overflow-hidden flex flex-col border-t-4 transition-colors duration-300 shadow-xl ${themeClasses.borderTop}`}>
      <div className="px-6 py-5 bg-gray-900/50 border-b border-white/5 flex flex-wrap justify-between items-center gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${themeClasses.badge}`}>{sortedTags.length}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-[#18181b] text-[10px] sm:text-xs text-gray-300 border border-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors hover:bg-gray-800 cursor-pointer appearance-none pr-6"
            >
              <option value="score-desc">分數 (高 → 低)</option>
              <option value="score-asc">分數 (低 → 高)</option>
              <option value="name-asc">名稱 (A → Z)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
            </div>
          </div>
          <button
            onClick={() => onCopyTags(sortedTags)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all border border-transparent hover:border-gray-600 active:scale-95"
            title="複製全部"
          >
            <CopyIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className={`p-6 min-h-[200px] backdrop-blur-sm ${themeClasses.bgGradient}`}>
        <div className="flex flex-wrap gap-2.5">
          {sortedTags.length > 0 ? (
            sortedTags.map((tag) => (
              <TagChip
                key={tag.name}
                tag={tag}
                description={tagMap.get(tag.name)}
                onExplainTag={onExplainTag}
                isPinned={pinnedTags?.includes(tag.name)}
                isExcluded={excludedTags?.includes(tag.name)}
                isSelected={selectedTags?.includes(tag.name)}
                onTogglePin={onTogglePin}
                onToggleExclude={onToggleExclude}
                onToggleSelect={onToggleSelect}
              />
            ))
          ) : (
            <p className="text-gray-500 text-sm italic w-full text-center py-12">沒有符合的標籤</p>
          )}
        </div>
      </div>
    </div>
  );
};
