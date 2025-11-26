
import React from 'react';
import { MegaphoneIcon } from './icons/MegaphoneIcon';
import { CopyIcon } from './icons/CopyIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import type { GeneratedMarketingCopy } from '../types';

interface CreativeExpansionPanelProps {
  marketingCopy: GeneratedMarketingCopy;
  onCopy: (text: string) => void;
}

export const CreativeExpansionPanel: React.FC<CreativeExpansionPanelProps> = ({ marketingCopy, onCopy }) => {
  return (
    <div className="mt-20 animate-slide-in-up" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center gap-4 mb-10">
        <div className="p-3.5 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-2xl border border-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.15)] backdrop-blur-sm">
          <MegaphoneIcon className="w-7 h-7 text-pink-400" />
        </div>
        <h3 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-indigo-200 tracking-tighter filter drop-shadow-lg">創意延伸</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Logline & Dialogue (7/12) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Logline Card */}
          <div className="group relative bg-[#121214]/60 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl hover:border-purple-500/40 transition-all duration-500 overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-500 to-pink-500"></div>
            {/* Glowing orb effect */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-purple-600/20 transition-all duration-700"></div>

            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <button onClick={() => onCopy(marketingCopy.logline || '')} className="text-gray-400 hover:text-white bg-gray-800/80 p-2.5 rounded-xl backdrop-blur-md border border-white/10 hover:border-purple-500/50 shadow-lg active:scale-95 transition-all"><CopyIcon className="w-4 h-4" /></button>
            </div>

            <h4 className="text-xs font-extrabold text-purple-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
              </span>
              Logline
            </h4>
            <p className="text-xl md:text-3xl font-bold text-white leading-relaxed font-serif tracking-wide drop-shadow-md">
              "{marketingCopy.logline}"
            </p>
          </div>

          {/* Dialogue Card */}
          <div className="group relative bg-[#121214]/60 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl hover:border-blue-500/40 transition-all duration-500">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-cyan-500"></div>
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <button onClick={() => onCopy(marketingCopy.dialogueSnippet || '')} className="text-gray-400 hover:text-white bg-gray-800/80 p-2.5 rounded-xl backdrop-blur-md border border-white/10 hover:border-blue-500/50 shadow-lg active:scale-95 transition-all"><CopyIcon className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-400" />
              <h4 className="text-xs font-extrabold text-blue-400 uppercase tracking-[0.25em]">情境對白</h4>
            </div>
            <div className="pl-6 py-4 border-l-2 border-gray-700/50 space-y-4 bg-black/20 rounded-r-xl">
              <p className="text-gray-200 whitespace-pre-line leading-8 font-mono text-sm md:text-base">
                {marketingCopy.dialogueSnippet}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Catchphrases (5/12) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#121214]/80 to-[#09090b]/80 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl flex flex-col h-full hover:border-white/20 transition-colors duration-500">
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-[0.25em]">Catchphrases</h4>
            <button
              onClick={() => onCopy(marketingCopy.catchphrases.join('\n') || '')}
              className="text-[10px] font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg border border-gray-700 transition-all flex items-center gap-2 active:scale-95"
            >
              <CopyIcon className="w-3 h-3" />
              複製全部
            </button>
          </div>
          <div className="space-y-4 flex-grow">
            {marketingCopy.catchphrases.map((phrase, index) => (
              <div key={index} className="group/item flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/40 hover:bg-purple-900/10 transition-all duration-300 cursor-default shadow-sm hover:shadow-purple-500/10 hover:-translate-y-1">
                <span className="text-purple-500 font-black text-xl leading-none mt-1 opacity-50 group-hover/item:opacity-100 transition-opacity select-none">#</span>
                <p className="text-gray-300 font-medium group-hover/item:text-white transition-colors text-sm md:text-base leading-relaxed">
                  {phrase}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
