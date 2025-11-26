
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { GenerationSettings, AppMode } from '../types';
import { AdjustmentsIcon } from './icons/AdjustmentsIcon';
import { StopIcon } from './icons/StopIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { compressImage, getImageDimensions } from '../utils/imageHelpers';
import { GenerationSettingsPanel } from './GenerationSettingsPanel';

interface ImageUploaderProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onImageUpload: (file: File, base64: string) => void;
  onBatchUpload: (files: { file: File, base64: string }[]) => void;
  onGenerate: () => void;
  onGenerateBatch: () => void;
  isGenerating: boolean;
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
  batchCount: number;
  hasFeedback?: boolean;
  onRegenerate?: () => void;
  onStop?: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  mode, 
  onModeChange, 
  onImageUpload, 
  onBatchUpload, 
  onGenerate, 
  onGenerateBatch, 
  isGenerating, 
  settings, 
  onSettingsChange, 
  batchCount, 
  hasFeedback, 
  onRegenerate, 
  onStop 
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [batchPreviews, setBatchPreviews] = useState<{name: string; base64: string}[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if(imageFiles.length === 0) return;
    
    let filesToProcess = imageFiles;
    if (mode === 'batch' && imageFiles.length > 100) {
        alert(`You selected ${imageFiles.length} images. Only the first 100 will be processed.`);
        filesToProcess = imageFiles.slice(0, 100);
    }

    if (mode === 'single') {
        const file = filesToProcess[0];
        try {
            const { width, height } = await getImageDimensions(file);
            if (width < 256 || height < 256) {
              if (!window.confirm(`警告：圖片 "${file.name}" 尺寸過小 (${width}x${height}px)。這可能會影響分析品質。是否繼續？`)) {
                return; 
              }
            }
            const { file: compressedFile, base64: compressedBase64 } = await compressImage(file);
            setFileName(compressedFile.name);
            setPreview(compressedBase64);
            onImageUpload(compressedFile, compressedBase64);
        } catch (error) {
            console.error("Image processing failed:", error);
            // Fallback to basic file reading
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setFileName(file.name);
                setPreview(base64String);
                onImageUpload(file, base64String);
            };
            reader.readAsDataURL(file);
        }
    } else { // Batch mode
        const compressedPromises = filesToProcess.map(file => compressImage(file).catch(err => {
            return new Promise<{ file: File, base64: string }>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ file, base64: reader.result as string });
                reader.readAsDataURL(file);
            });
        }));
        
        const compressedFiles = await Promise.all(compressedPromises);
        setBatchPreviews(compressedFiles.map(f => ({ name: f.file.name, base64: f.base64 })));
        onBatchUpload(compressedFiles);
    }
  }, [mode, onImageUpload, onBatchUpload]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        e.preventDefault();
        processFiles(e.clipboardData.files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFiles]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFiles(event.target.files);
    }
  };
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
       processFiles(e.dataTransfer.files);
     }
  }, [processFiles]);
  
  const isGenerateDisabled = mode === 'single' ? !preview : batchCount === 0;

  const renderActionButton = () => {
      if (isGenerating) {
          return (
             <button
                onClick={onStop}
                className="px-6 py-3 bg-red-500/10 border border-red-500/50 text-red-400 font-bold rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all duration-300 hover:bg-red-500 hover:text-white hover:scale-105 focus:ring-2 focus:ring-red-500 flex items-center gap-2 active:scale-95"
             >
                <StopIcon className="w-5 h-5 animate-pulse" />
                停止生成
             </button>
          );
      }

      if (hasFeedback && onRegenerate) {
          return (
            <button
              onClick={onRegenerate}
              className="px-8 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-pink-900/30 transition-all duration-300 hover:shadow-pink-500/40 hover:scale-105 focus:ring-2 focus:ring-pink-500 active:scale-95 flex items-center gap-2"
            >
               <SparklesIcon className="w-5 h-5" />
               基於回饋再生成
            </button>
          );
      }

      return (
        <button
          onClick={mode === 'single' ? onGenerate : onGenerateBatch}
          disabled={isGenerateDisabled}
          className="relative group px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-purple-900/30 transition-all duration-300 hover:shadow-purple-500/50 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none focus:ring-2 focus:ring-purple-500 active:scale-95 flex items-center gap-2 overflow-hidden"
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
          <SparklesIcon className="w-5 h-5 relative z-10 transition-transform group-hover:scale-110 group-hover:rotate-12" />
          <span className="relative z-10">{mode === 'single' ? '開始分析封面' : `開始批次分析 (${batchCount})`}</span>
        </button>
      );
  };

  return (
    <div className="w-full glass-panel rounded-3xl p-1.5 transition-all duration-500 hover:border-purple-500/30 group shadow-2xl relative z-10">
        <div className="bg-[#131316]/90 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
            {/* Toggle Buttons */}
            <div className="flex justify-center mb-8">
                <div className="bg-gray-900/80 rounded-xl p-1 flex items-center border border-white/5 shadow-inner">
                    <button 
                        onClick={() => onModeChange('single')}
                        disabled={isGenerating}
                        className={`px-8 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${mode === 'single' ? 'bg-[#27272a] text-white shadow-lg ring-1 ring-white/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
                        單張模式
                    </button>
                    <button 
                        onClick={() => onModeChange('batch')}
                        disabled={isGenerating}
                        className={`px-8 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${mode === 'batch' ? 'bg-[#27272a] text-white shadow-lg ring-1 ring-white/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
                        批次模式
                    </button>
                </div>
            </div>
            
        <div className="flex flex-col md:flex-row items-stretch gap-8 lg:gap-12">
            {mode === 'single' ? (
                <label 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`flex-shrink-0 w-full md:w-80 h-96 border-2 border-dashed rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden relative group/upload transition-all duration-500 ease-out ${preview ? 'border-purple-500/30 bg-gray-900/50' : 'border-gray-700 bg-gray-900/20 hover:border-purple-500 hover:bg-purple-900/5 hover:shadow-[inset_0_0_40px_rgba(168,85,247,0.1)]'}`}
                >
                    {preview ? (
                    <div className="relative w-full h-full p-2 group-hover/upload:p-3 transition-all duration-300">
                        <img src={preview} alt="Preview" className="w-full h-full object-contain rounded-xl shadow-2xl" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/upload:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] rounded-xl">
                            <div className="text-center transform translate-y-4 group-hover/upload:translate-y-0 transition-transform duration-300">
                                <p className="text-white font-bold text-lg mb-1">更換圖片</p>
                                <p className="text-xs text-gray-400">點擊或拖曳</p>
                            </div>
                        </div>
                    </div>
                    ) : (
                    <div className="text-center text-gray-500 group-hover/upload:text-purple-300 transition-colors p-6">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800/50 border border-gray-700 flex items-center justify-center group-hover/upload:scale-110 transition-transform duration-500 group-hover/upload:border-purple-500/50 group-hover/upload:bg-purple-500/10 group-hover/upload:shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <p className="text-lg font-bold mb-2 text-gray-300 group-hover/upload:text-white transition-colors">點擊或拖曳圖片</p>
                        <p className="text-xs opacity-50 font-mono uppercase tracking-wider">JPG · PNG · WEBP</p>
                    </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        disabled={isGenerating}
                    />
                </label>
            ) : (
                <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => !isGenerating && fileInputRef.current?.click()}
                    className={`flex-shrink-0 w-full md:w-80 h-96 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center bg-gray-900/20 overflow-hidden relative group/upload transition-all duration-500 p-4 ${!isGenerating ? 'cursor-pointer hover:border-purple-500 hover:bg-purple-900/5 border-gray-700 hover:shadow-[inset_0_0_40px_rgba(168,85,247,0.1)]' : 'cursor-not-allowed opacity-80 border-gray-800'}`}
                >
                    {batchPreviews.length > 0 ? (
                        <div className="grid grid-cols-3 gap-3 w-full h-full overflow-y-auto custom-scrollbar pr-1 content-start">
                            {batchPreviews.map((p, i) => (
                                <div key={i} className="aspect-[2/3] rounded-lg overflow-hidden border border-gray-700 relative group/item shadow-md">
                                    <img src={p.base64} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110" />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 group-hover/upload:text-purple-300 transition-colors p-6">
                             <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800/50 border border-gray-700 flex items-center justify-center group-hover/upload:scale-110 transition-transform duration-500 group-hover/upload:border-purple-500/50 group-hover/upload:bg-purple-500/10 group-hover/upload:shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            <p className="text-lg font-bold mb-2 text-gray-300 group-hover/upload:text-white transition-colors">批次上傳多張</p>
                            <p className="text-xs opacity-50 font-mono">MAX 100 IMAGES</p>
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        multiple={mode === 'batch'}
                        disabled={isGenerating}
                    />
                </div>
            )}
            
            <div className="flex-grow flex flex-col items-center md:items-start text-center md:text-left space-y-8 py-4">
            <div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                    {mode === 'single' ? '解讀畫面靈魂' : `準備分析 ${batchCount} 張封面`}
                </h2>
                <p className="text-gray-400 max-w-lg leading-relaxed text-lg font-light">
                    AI 將深入分析圖像中的構圖、光影與情緒，為您生成最精準的標籤與行銷文案，激發您的創作靈感。
                </p>
            </div>
            
            {fileName && mode === 'single' && (
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gray-800/50 border border-gray-700 text-sm text-gray-200 backdrop-blur-md animate-fade-in shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse"></div>
                    <span className="font-mono tracking-wide opacity-90">{fileName}</span>
                </div>
            )}
            
            <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start w-full mt-auto">
                {renderActionButton()}
                
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl border transition-all duration-200 ${showAdvanced ? 'bg-gray-800 text-white border-gray-600 shadow-inner' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-white hover:bg-white/5'}`}
                    aria-expanded={showAdvanced}
                    disabled={isGenerating}
                >
                    <AdjustmentsIcon className="w-5 h-5" />
                    <span>{showAdvanced ? '收起設定' : '進階設定'}</span>
                </button>
            </div>
            </div>
        </div>

            <div className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${showAdvanced ? 'grid-rows-[1fr] opacity-100 pt-8' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <GenerationSettingsPanel 
                    settings={settings} 
                    onChange={onSettingsChange} 
                    disabled={isGenerating} 
                  />
                </div>
            </div>
        </div>
    </div>
  );
};
