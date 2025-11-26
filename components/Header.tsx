
import React from 'react';
import { HenHenTaiLogoIcon } from './icons/HenHenTaiLogoIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { ClockIcon } from './icons/ClockIcon';

interface HeaderProps {
  onSettingsClick: () => void;
  onHistoryClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick, onHistoryClick }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#09090b]/60 backdrop-blur-xl transition-all duration-300 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3 group cursor-default select-none">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              <HenHenTaiLogoIcon className="w-8 h-8 sm:w-9 sm:h-9 text-purple-400 relative z-10 transition-transform duration-500 ease-out group-hover:rotate-12 group-hover:scale-110 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-gray-400 group-hover:from-purple-200 group-hover:to-white transition-all duration-500">HenTai</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 font-black">Generator</span>
              </h1>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md shadow-inner">
            <button
              onClick={onHistoryClick}
              className="p-2 text-gray-400 hover:text-blue-200 hover:bg-white/10 rounded-xl transition-all duration-200 group relative flex items-center justify-center"
              aria-label="History"
            >
              <ClockIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
               <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-[10px] font-bold text-gray-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 pointer-events-none whitespace-nowrap border border-gray-700 shadow-2xl z-50">
                歷史紀錄
              </span>
            </button>
            
            <div className="w-px h-5 bg-white/10 mx-0.5"></div>
            
            <button
              onClick={onSettingsClick}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 group relative flex items-center justify-center"
              aria-label="Settings"
            >
              <SettingsIcon className="w-5 h-5 transition-transform group-hover:rotate-90 duration-500" />
               <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-900 text-[10px] font-bold text-gray-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 pointer-events-none whitespace-nowrap border border-gray-700 shadow-2xl z-50">
                設定
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
