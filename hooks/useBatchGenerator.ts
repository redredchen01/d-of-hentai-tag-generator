import { useState, useRef, useCallback, useEffect } from 'react';
import type { BatchItem, GenerationSettings, GeneratedTagsResult } from '../types';
import { generateTags } from '../services/llmService';
import type { ToastType } from '../components/Toast';

interface UseBatchGeneratorProps {
  tagDataCsv: string | null;
  settings: GenerationSettings;
  onToast: (message: string, type: ToastType) => void;
  onItemSuccess?: (result: GeneratedTagsResult, base64: string) => void;
}

export const useBatchGenerator = ({
  tagDataCsv,
  settings,
  onToast,
  onItemSuccess
}: UseBatchGeneratorProps) => {
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [activeBatchItemId, setActiveBatchItemId] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<{completed: number, failed: number} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const addItems = useCallback((files: { file: File, base64: string }[]) => {
    const newItems: BatchItem[] = files.map(f => ({
        id: `${f.file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: f.file,
        base64: f.base64,
        status: 'pending',
    }));
    setBatchItems(newItems);
    setActiveBatchItemId(null);
    setBatchSummary(null);
  }, []);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsProcessing(false);
        onToast("已停止批次生成", 'info');
    }
  }, [onToast]);

  const generateBatch = useCallback(async (tagLibrary: string) => {
      if (isProcessing || !tagDataCsv) return;
      
      // Reset abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      setIsProcessing(true);
      setBatchSummary(null);
      
      let completedCount = 0;
      let failedCount = 0;

      // Iterate through items, but we need access to the latest state if we were to support dynamic addition
      // For now, we iterate over the snapshot 'batchItems'
      for (const item of batchItems) {
          // Check cancellation
          if (abortControllerRef.current?.signal.aborted) break;
          if (item.status === 'completed') {
              completedCount++; // Already done
              continue;
          }

          // Update status to processing
          setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
          setActiveBatchItemId(item.id);
          
          try {
              const response = await generateTags(
                  item.base64, 
                  item.file.type, 
                  tagLibrary, 
                  settings, 
                  undefined, // No pinned/excluded for batch initially
                  undefined, 
                  abortControllerRef.current.signal
              );
              
              // Update Item Success
              setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed', result: response.result } : i));
              completedCount++;
              
              if (onItemSuccess) {
                  onItemSuccess(response.result, item.base64);
              }

          } catch(err) {
              if (err instanceof DOMException && err.name === 'AbortError') {
                  setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending' } : i)); // Reset to pending if aborted
                  break;
              }
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: errorMessage } : i));
              failedCount++;
          }
      }
      
      setIsProcessing(false);
      abortControllerRef.current = null;

      if (completedCount > 0 || failedCount > 0) {
        // Select first item to show something
        if (!activeBatchItemId && batchItems.length > 0) {
             setActiveBatchItemId(batchItems[0].id);
        }
        setBatchSummary({ completed: completedCount, failed: failedCount });
        onToast(`批次處理結束：${completedCount} 成功，${failedCount} 失敗`, completedCount > 0 ? 'success' : 'info');
      }
  }, [batchItems, isProcessing, tagDataCsv, settings, onItemSuccess, onToast, activeBatchItemId]);

  const reset = useCallback(() => {
      setBatchSummary(null);
      setActiveBatchItemId(null);
  }, []);

  return {
      batchItems,
      setBatchItems,
      activeBatchItemId,
      setActiveBatchItemId,
      batchSummary,
      setBatchSummary,
      isProcessing,
      addItems,
      generateBatch,
      stopGeneration,
      reset
  };
};