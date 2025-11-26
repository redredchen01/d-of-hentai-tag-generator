
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import type { GenerationSettings } from '../types';

interface GenerationSettingsPanelProps {
  settings: GenerationSettings;
  onChange: (settings: GenerationSettings) => void;
  disabled: boolean;
}

export const GenerationSettingsPanel: React.FC<GenerationSettingsPanelProps> = ({ settings, onChange, disabled }) => {
  const handleSettingChange = (field: keyof GenerationSettings, value: any) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  return (
    <div className="bg-[#18181b]/50 rounded-3xl border border-white/5 p-8 grid grid-cols-1 md:grid-cols-2 gap-10 text-sm relative shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none rounded-3xl"></div>

      <div className="space-y-8 relative z-10">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label htmlFor="main-tags-count" className="font-bold text-gray-200 flex items-center gap-2">
              主要標籤
              <span className="text-[10px] font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">Core Themes</span>
            </label>
            <span className="text-purple-300 font-bold bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-lg text-xs">{settings.mainTagsCount}</span>
          </div>
          <input
            id="main-tags-count"
            type="range"
            min="2"
            max="10"
            value={settings.mainTagsCount}
            onChange={(e) => handleSettingChange('mainTagsCount', parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
            disabled={disabled}
          />
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label htmlFor="potential-tags-count" className="font-bold text-gray-200 flex items-center gap-2">
              潛力標籤
              <span className="text-[10px] font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded border border-gray-700">Sub-Genres</span>
            </label>
            <span className="text-purple-300 font-bold bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-lg text-xs">{settings.potentialTagsCount}</span>
          </div>
          <input
            id="potential-tags-count"
            type="range"
            min="2"
            max="5"
            value={settings.potentialTagsCount}
            onChange={(e) => handleSettingChange('potentialTagsCount', parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="description-style" className="block font-bold text-gray-200 mb-3">描述風格 (Style)</label>
                <div className="relative group/select">
                    <select
                    id="description-style"
                    value={settings.descriptionStyle}
                    onChange={(e) => handleSettingChange('descriptionStyle', e.target.value)}
                    className="w-full pl-3 pr-8 py-3 bg-[#27272a] border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none text-gray-200 hover:bg-gray-700 font-medium text-xs"
                    disabled={disabled}
                    >
                    <option value="default">⚖️ 平衡分析</option>
                    <option value="emotion">🎭 注重情感</option>
                    <option value="plot">⚔️ 注重情節</option>
                    <option value="teen">🔥 熱血少年</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 group-hover/select:text-white transition-colors">
                    <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="tag-language" className="block font-bold text-gray-200 mb-3">輸出標籤語言</label>
                <div className="relative group/select">
                    <select
                    id="tag-language"
                    value={settings.tagLanguage || 'sc'}
                    onChange={(e) => handleSettingChange('tagLanguage', e.target.value)}
                    className="w-full pl-3 pr-8 py-3 bg-[#27272a] border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all appearance-none text-gray-200 hover:bg-gray-700 font-medium text-xs"
                    disabled={disabled}
                    >
                    <option value="sc">🇨🇳 简体中文</option>
                    <option value="tc">🇹🇼 繁體中文</option>
                    <option value="en">🇺🇸 English</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 group-hover/select:text-white transition-colors">
                    <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                </div>
            </div>
        </div>

        <label className="flex items-start gap-4 p-5 rounded-xl border border-blue-500/20 bg-blue-900/5 cursor-pointer hover:bg-blue-900/10 hover:border-blue-500/40 transition-all group duration-300">
          <div className="relative mt-1">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.useThinking || false}
              onChange={(e) => handleSettingChange('useThinking', e.target.checked)}
              disabled={disabled}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
          <div>
            <span className="text-sm font-bold text-blue-200 group-hover:text-blue-100 flex items-center gap-2 mb-1.5">
              深度思考模式 (Gemini Thinking)
              <SparklesIcon className="w-4 h-4 text-blue-400 animate-pulse" />
            </span>
            <p className="text-xs text-gray-400 leading-relaxed">啟用 Gemini 3 Pro 的邏輯推理能力，進行更深層次的語意分析。會消耗更多 Token 並增加生成時間，但結果更精準。</p>
          </div>
        </label>
      </div>
    </div>
  );
};
