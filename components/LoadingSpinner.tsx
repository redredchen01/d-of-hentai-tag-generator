
import React from 'react';
import { HenHenTaiLogoIcon } from './icons/HenHenTaiLogoIcon';

interface LoadingSpinnerProps {
  message: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center my-12 space-y-8 relative z-10">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-tr from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      
      <div className="relative w-24 h-24">
         {/* Outer Rotating Ring with Gradient */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500 border-b-pink-500 border-l-transparent animate-[spin_1.5s_linear_infinite] shadow-[0_0_20px_rgba(168,85,247,0.3)]"></div>
        
        {/* Inner Reverse Rotating Ring */}
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-transparent border-l-blue-400 border-b-purple-400 border-r-transparent animate-[spin_2s_linear_infinite_reverse] opacity-70"></div>

        {/* Central Logo Container */}
        <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-16 h-16 rounded-full bg-gray-900/90 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-inner">
                 <HenHenTaiLogoIcon className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 animate-pulse drop-shadow-lg" />
             </div>
        </div>
      </div>

      {/* Text & Dots */}
      <div className="space-y-3 text-center z-10 max-w-md px-4">
        <p className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-200 to-pink-300 animate-pulse tracking-wide">
          {message}
        </p>
        
        <div className="flex justify-center gap-2 pt-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-[bounce_1s_infinite_-0.3s]"></div>
          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-[bounce_1s_infinite_-0.15s]"></div>
          <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-[bounce_1s_infinite]"></div>
        </div>
      </div>
    </div>
  );
};
