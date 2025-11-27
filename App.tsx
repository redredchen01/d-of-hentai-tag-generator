
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { TagDisplay } from './components/TagDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { explainTag } from './services/llmService';
import { BatchSidebar } from './components/BatchSidebar';
import { BatchItemDisplay } from './components/BatchItemDisplay';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { FailoverNotification } from './components/FailoverNotification';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { XCircleIcon } from './components/icons/XCircleIcon';
import { MagnifyingGlassIcon } from './components/icons/MagnifyingGlassIcon';
import { useTagData } from './hooks/useTagData';
import { useSingleGenerator } from './hooks/useSingleGenerator';
import { useBatchGenerator } from './hooks/useBatchGenerator';
import { ChatBot } from './components/ChatBot';
import { ImageGeneratorModal } from './components/ImageGeneratorModal';
import type { GeneratedTagsResult, HistoryEntry, GenerationSettings, AppMode } from './types';

const MAX_HISTORY_ITEMS = 5;
const HISTORY_STORAGE_KEY = 'manga-tag-history';
const GENERATION_SETTINGS_STORAGE_KEY = 'manga-tag-generation-settings';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('single');
  const [tagDataCsv, setTagDataCsv] = useState<string | null>(null);
  
  // UI States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Image Gen UI
  const [isImageGenOpen, setIsImageGenOpen] = useState(false);
  const [imageGenPrompt, setImageGenPrompt] = useState('');

  // App Data States
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [uploadedImage, setUploadedImage] = useState<{ file: File; base64: string } | null>(null);
  
  // Interactive Tag States
  const [pinnedTags, setPinnedTags] = useState<string[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);

  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>(() => {
    try {
        const storedSettings = localStorage.getItem(GENERATION_SETTINGS_STORAGE_KEY);
        if (storedSettings) {
            return JSON.parse(storedSettings);
        }
    } catch (e) {
        console.error("Failed to load generation settings from localStorage", e);
    }
    return {
        tagsCount: 8,
        descriptionStyle: 'default',
        useThinking: false,
        tagLanguage: 'sc', // Default to Simplified Chinese
    };
  });

  // Custom Hooks
  const { tagLibrary, tagMap } = useTagData(tagDataCsv);

  // Toast Handlers
  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // History Helper
  const addToHistory = useCallback((result: GeneratedTagsResult, imageBase64: string) => {
      setHistory(prevHistory => {
        const newEntry: HistoryEntry = {
          id: Date.now(),
          image: imageBase64,
          result: result,
        };
        const updatedHistory = [newEntry, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
        return updatedHistory;
      });
  }, []);

  // Generators
  const singleGen = useSingleGenerator({
      tagDataCsv,
      settings: generationSettings,
      pinnedTags,
      excludedTags,
      onToast: addToast,
      onSuccess: addToHistory
  });

  const batchGen = useBatchGenerator({
      tagDataCsv,
      settings: generationSettings,
      onToast: addToast,
      onItemSuccess: addToHistory
  });

  // Load Tag Data
  useEffect(() => {
    const loadData = async () => {
        try {
            const module = await import('./lib/tagData');
            setTagDataCsv(module.tagDataCsv);
        } catch (e) {
            console.error("Failed to load tag data library", e);
            addToast("無法載入標籤庫，請重新整理頁面。", 'error');
        }
    }
    loadData();
  }, [addToast]);

  // Persist Settings
  useEffect(() => {
    try {
      localStorage.setItem(GENERATION_SETTINGS_STORAGE_KEY, JSON.stringify(generationSettings));
    } catch (e) {
      console.error("Failed to save generation settings to localStorage", e);
    }
  }, [generationSettings]);

  // Load History
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      setHistory([]);
    }
  }, []);

  // Reset feedback when image changes
  useEffect(() => {
      setPinnedTags([]);
      setExcludedTags([]);
  }, [uploadedImage, singleGen.generatedResult]);

  // Unload Protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (batchGen.isProcessing || singleGen.isLoading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [batchGen.isProcessing, singleGen.isLoading]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter to Generate
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'single' && !singleGen.isLoading && uploadedImage) {
           singleGen.generate(uploadedImage.file, uploadedImage.base64, tagLibrary);
        } else if (mode === 'batch' && !batchGen.isProcessing && batchGen.batchItems.length > 0) {
           batchGen.generateBatch(tagLibrary);
        }
      }
      // Esc to Stop
      if (e.key === 'Escape') {
          if (singleGen.isLoading) singleGen.stopGeneration();
          if (batchGen.isProcessing) batchGen.stopGeneration();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, singleGen, batchGen, uploadedImage, tagLibrary]);


  const handleImageUpload = (file: File, base64: string) => {
    setUploadedImage({ file, base64 });
    singleGen.reset();
  };

  const handleModeChange = (newMode: AppMode) => {
      setMode(newMode);
      singleGen.reset();
      batchGen.reset();
  };

  const [historyViewResult, setHistoryViewResult] = useState<GeneratedTagsResult | null>(null);
  
  const onHistoryLoad = (entry: HistoryEntry) => {
      const isDataUrl = entry.image.startsWith('data:');
      if (!isDataUrl) {
          addToast("無效的圖片數據", 'error');
          return;
      }
      const dummyFile = new File([], "history.jpg", { type: "image/jpeg" });
      setMode('single');
      setUploadedImage({ file: dummyFile, base64: entry.image });
      setHistoryViewResult(entry.result);
      singleGen.reset();
      setIsHistoryOpen(false);
      addToast("已載入歷史紀錄", 'info');
  };

  useEffect(() => {
      if (singleGen.generatedResult) {
          setHistoryViewResult(null);
      }
  }, [singleGen.generatedResult]);


  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    addToast("歷史紀錄已清除", 'success');
  };

  const handleExplainTag = useCallback(async (tagName: string, tagDescription: string): Promise<string> => {
    let activeImageBase64: string | undefined;
    let activeImageType: string | undefined;
    
    if (mode === 'single' && uploadedImage) {
        activeImageBase64 = uploadedImage.base64;
        activeImageType = uploadedImage.file.type;
    } else if (mode === 'batch' && batchGen.activeBatchItemId) {
        const activeItem = batchGen.batchItems.find(item => item.id === batchGen.activeBatchItemId);
        activeImageBase64 = activeItem?.base64;
        activeImageType = activeItem?.file.type;
    }
    
    if (!activeImageBase64 || !activeImageType) {
      throw new Error("Cannot explain tag without an active image.");
    }
    
    return await explainTag(
      activeImageBase64,
      activeImageType,
      tagName,
      tagDescription
    );
  }, [mode, uploadedImage, batchGen.batchItems, batchGen.activeBatchItemId]);

  // Interactive Tags
  const handleTogglePin = (tagName: string) => {
      setPinnedTags(prev => prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]);
      setExcludedTags(prev => prev.filter(t => t !== tagName));
  };

  const handleToggleExclude = (tagName: string) => {
      setExcludedTags(prev => prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]);
      setPinnedTags(prev => prev.filter(t => t !== tagName));
  };

  const openImageGen = (prompt: string) => {
      setImageGenPrompt(prompt);
      setIsImageGenOpen(true);
  }

  const activeBatchItem = useMemo(() => {
    if (mode === 'batch' && batchGen.activeBatchItemId) {
      return batchGen.batchItems.find(item => item.id === batchGen.activeBatchItemId);
    }
    return null;
  }, [mode, batchGen.activeBatchItemId, batchGen.batchItems]);

  const currentSingleResult = singleGen.generatedResult || historyViewResult;
  
  // Determine active image for Chat
  const activeChatImage = useMemo(() => {
      if (mode === 'single' && uploadedImage) return uploadedImage;
      if (mode === 'batch' && activeBatchItem) return { base64: activeBatchItem.base64, file: activeBatchItem.file };
      return null;
  }, [mode, uploadedImage, activeBatchItem]);

  return (
    <div className="min-h-screen text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8 overflow-x-hidden relative selection:bg-purple-500/30 selection:text-purple-200">
      
      {/* Content constraint wrapper */}
      <div className="w-full max-w-[1600px] mx-auto relative z-10 animate-fade-in font-sans p-4 md:p-8 lg:p-10 transition-transform duration-500 ease-out hover:scale-[1.002] bg-black/30 backdrop-blur-2xl border border-white/10 shadow-[0_0_60px_-15px_rgba(124,58,237,0.1)] rounded-[3rem] min-h-[calc(100vh-4rem)]">
        <Header 
            onSettingsClick={() => setIsSettingsOpen(true)}
            onHistoryClick={() => setIsHistoryOpen(true)}
        />
        <main className="mt-8 mb-24">
          {!tagDataCsv ? (
              <div className="text-center text-gray-500 my-8 animate-pulse flex flex-col items-center gap-4">
                 <LoadingSpinner message="正在初始化 AI 編輯引擎..." />
              </div>
          ) : (
              <>
                  <ImageUploader
                    mode={mode}
                    onModeChange={handleModeChange}
                    onImageUpload={handleImageUpload}
                    onBatchUpload={batchGen.addItems}
                    onGenerate={() => uploadedImage && singleGen.generate(uploadedImage.file, uploadedImage.base64, tagLibrary)}
                    onGenerateBatch={() => batchGen.generateBatch(tagLibrary)}
                    isGenerating={mode === 'single' ? singleGen.isLoading : batchGen.isProcessing}
                    settings={generationSettings}
                    onSettingsChange={setGenerationSettings}
                    batchCount={batchGen.batchItems.length}
                    hasFeedback={pinnedTags.length > 0 || excludedTags.length > 0}
                    onRegenerate={() => uploadedImage && singleGen.generate(uploadedImage.file, uploadedImage.base64, tagLibrary, true)}
                    onStop={mode === 'single' ? singleGen.stopGeneration : batchGen.stopGeneration}
                  />

                  {mode === 'single' && (
                      <>
                        {singleGen.loadingStep && <LoadingSpinner message={singleGen.loadingStep} />}

                        {singleGen.error && (
                            <div className="mt-8 animate-fade-in bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                                <div className="text-red-400 flex-shrink-0 mt-0.5">
                                    <XCircleIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-red-400 font-bold text-sm">生成失敗</h3>
                                    <p className="text-red-300 text-sm mt-1">{singleGen.error}</p>
                                </div>
                            </div>
                        )}

                        {currentSingleResult && !singleGen.isLoading && (
                            <div className="mt-8 animate-fade-in grid grid-cols-1 lg:grid-cols-[1fr,1.5fr] gap-8 lg:gap-12 items-start">
                            <div className="w-full animate-slide-in-up sticky top-24" style={{ animationDelay: '50ms' }}>
                                {uploadedImage && (
                                <div>
                                    <h3 className="text-2xl font-bold text-purple-300 mb-4">分析的封面</h3>
                                    <div 
                                        className="relative group cursor-zoom-in overflow-hidden rounded-2xl shadow-2xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300"
                                        onClick={() => setPreviewImageSrc(uploadedImage.base64)}
                                    >
                                        <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <img
                                            src={uploadedImage.base64}
                                            alt="Uploaded manga cover"
                                            className="w-full object-contain transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none backdrop-blur-[2px]">
                                            <span className="text-white bg-black/60 px-4 py-2 rounded-full text-sm font-medium border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-2">
                                                <MagnifyingGlassIcon className="w-4 h-4" /> 點擊放大
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                )}
                            </div>
                            <div className="w-full animate-slide-in-up" style={{ animationDelay: '200ms' }}>
                                {singleGen.failoverInfo?.used && (
                                    <FailoverNotification providerName={singleGen.failoverInfo.provider} onClose={() => singleGen.setFailoverInfo(null)} />
                                )}
                                <TagDisplay 
                                    result={currentSingleResult} 
                                    tagMap={tagMap} 
                                    onExplainTag={handleExplainTag}
                                    pinnedTags={pinnedTags}
                                    excludedTags={excludedTags}
                                    onTogglePin={handleTogglePin}
                                    onToggleExclude={handleToggleExclude}
                                    onToast={addToast}
                                    onGenerateImage={openImageGen}
                                />
                            </div>
                            </div>
                        )}
                      </>
                  )}

                  {mode === 'batch' && batchGen.batchItems.length > 0 && (
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-8 items-start">
                        <BatchSidebar 
                            items={batchGen.batchItems} 
                            activeItemId={batchGen.activeBatchItemId}
                            onSelectItem={batchGen.setActiveBatchItemId}
                            onPreviewImage={setPreviewImageSrc}
                        />
                        <main className="min-w-0">
                            <BatchItemDisplay
                                activeItem={activeBatchItem}
                                tagMap={tagMap}
                                onExplainTag={handleExplainTag}
                                onToast={addToast}
                            />
                        </main>
                    </div>
                  )}
              </>
          )}
        </main>
        <footer className="text-center text-xs text-gray-500 mt-auto pb-6 font-mono opacity-60 hover:opacity-100 transition-opacity">
          <p>Powered by HenHenTai v2.0.0 (Main Tags Focus)</p>
        </footer>
      </div>
      
      {/* ChatBot */}
      <ChatBot 
        activeImageBase64={activeChatImage?.base64} 
        activeImageType={activeChatImage?.file.type}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <HistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        history={history}
        onLoad={onHistoryLoad}
        onClear={handleClearHistory}
      />
      <ImagePreviewModal 
        isOpen={!!previewImageSrc}
        onClose={() => setPreviewImageSrc(null)}
        imageSrc={previewImageSrc}
      />
      <ImageGeneratorModal 
        isOpen={isImageGenOpen}
        onClose={() => setIsImageGenOpen(false)}
        initialPrompt={imageGenPrompt}
      />
    </div>
  );
};

export default App;
