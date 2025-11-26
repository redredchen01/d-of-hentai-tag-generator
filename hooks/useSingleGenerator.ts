import { useState, useRef, useCallback, useEffect } from 'react';
import type { GeneratedTagsResult, GenerationSettings, GenerationResponse } from '../types';
import { generateTags } from '../services/llmService';
import type { ToastType } from '../components/Toast';

interface UseSingleGeneratorProps {
  tagDataCsv: string | null;
  settings: GenerationSettings;
  pinnedTags: string[];
  excludedTags: string[];
  onToast: (message: string, type: ToastType) => void;
  onSuccess?: (result: GeneratedTagsResult, base64: string) => void;
}

export const useSingleGenerator = ({
  tagDataCsv,
  settings,
  pinnedTags,
  excludedTags,
  onToast,
  onSuccess
}: UseSingleGeneratorProps) => {
  const [generatedResult, setGeneratedResult] = useState<GeneratedTagsResult | null>(null);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failoverInfo, setFailoverInfo] = useState<{ used: boolean; provider: string } | null>(null);
  
  const loadingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      loadingTimers.current.forEach(clearTimeout);
      abortControllerRef.current?.abort();
    };
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      loadingTimers.current.forEach(clearTimeout);
      loadingTimers.current = [];
      setLoadingStep(null);
      onToast("已停止生成", 'info');
    }
  }, [onToast]);

  const generate = useCallback(async (
    file: File, 
    base64: string, 
    tagLibrary: string, 
    isRegeneration: boolean = false
  ) => {
    if (!tagDataCsv) {
        setError("標籤庫尚未載入");
        return;
    }

    // Reset previous abort controller
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Reset UI State
    loadingTimers.current.forEach(clearTimeout);
    loadingTimers.current = [];
    setError(null);
    
    if (!isRegeneration) {
        setLoadingStep("正在準備圖像...");
        setGeneratedResult(null);
        setFailoverInfo(null);
    } else {
        setLoadingStep("正在根據您的回饋重新思考...");
    }

    try {
      const effectivePinned = isRegeneration ? pinnedTags : undefined;
      const effectiveExcluded = isRegeneration ? excludedTags : undefined;

      // Fake progress steps for UX
      const timers = [
        setTimeout(() => setLoadingStep("正在連接 AI 服務..."), 1000),
        setTimeout(() => setLoadingStep("AI 編輯正在解讀封面靈魂..."), 3000),
        setTimeout(() => setLoadingStep("分析畫面構圖與色彩..."), 6000),
        setTimeout(() => setLoadingStep(isRegeneration ? "微調標籤建議中..." : "生成標籤與描述中..."), 9000),
        setTimeout(() => setLoadingStep("幾乎完成了，正在最後潤飾..."), 12000)
      ];
      loadingTimers.current = timers;

      const response: GenerationResponse = await generateTags(
          base64, 
          file.type, 
          tagLibrary, 
          settings,
          effectivePinned,
          effectiveExcluded,
          abortControllerRef.current.signal
      );
      
      setGeneratedResult(response.result);
      
      if (response.usedFailover) {
          setFailoverInfo({ used: true, provider: response.providerName });
          onToast(`已自動切換至 ${response.providerName} 服務`, 'info');
      } else {
          setFailoverInfo(null);
      }
      
      onToast("生成完成！", 'success');
      
      if (onSuccess) {
          onSuccess(response.result, base64);
      }

    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
          return; // User stopped, do nothing
      }
      console.error(err);
      const msg = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(msg);
      onToast("生成失敗", 'error');
    } finally {
      loadingTimers.current.forEach(clearTimeout);
      loadingTimers.current = [];
      setLoadingStep(null);
      abortControllerRef.current = null;
    }
  }, [tagDataCsv, settings, pinnedTags, excludedTags, onToast, onSuccess]);

  const reset = useCallback(() => {
      setGeneratedResult(null);
      setFailoverInfo(null);
      setError(null);
      setLoadingStep(null);
  }, []);

  return {
    generatedResult,
    loadingStep,
    error,
    failoverInfo,
    setFailoverInfo, // Needed to close notification
    generate,
    stopGeneration,
    reset,
    isLoading: loadingStep !== null
  };
};