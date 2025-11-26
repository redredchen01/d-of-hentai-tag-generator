
import React, { useState, useEffect } from 'react';
import { generateImage } from '../services/llmService';
import { XCircleIcon } from './icons/XCircleIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';

interface ImageGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt: string;
}

export const ImageGeneratorModal: React.FC<ImageGeneratorModalProps> = ({ isOpen, onClose, initialPrompt }) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4' | '4:3' | '16:9' | '9:16'>('3:4');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
        setPrompt(initialPrompt);
        setGeneratedImage(null);
        setError(null);
    }
  }, [isOpen, initialPrompt]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
        const base64 = await generateImage(prompt, aspectRatio);
        setGeneratedImage(base64);
    } catch (err: any) {
        setError(err.message || "生成失敗");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleDownload = () => {
      if (!generatedImage) return;
      const a = document.createElement('a');
      a.href = generatedImage;
      a.download = `generated-cover-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] animate-fade-in p-4" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Left: Controls */}
        <div className="w-full md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-gray-700 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-purple-300 flex items-center gap-2">
                    <PhotoIcon className="w-6 h-6" />
                    AI 封面生成
                </h3>
                <button onClick={onClose} className="md:hidden text-gray-400"><XCircleIcon className="w-6 h-6"/></button>
            </div>

            <div className="space-y-4 flex-grow">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">提示詞 (Prompt)</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full h-32 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 resize-none custom-scrollbar"
                        placeholder="描述你想生成的封面..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">長寬比 (Aspect Ratio)</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['1:1', '3:4', '4:3', '16:9', '9:16'].map((ratio) => (
                            <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio as any)}
                                className={`py-2 text-xs font-bold rounded border ${aspectRatio === ratio ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'}`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="mt-6 w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
                {isGenerating ? '繪製中...' : '生成封面'}
            </button>
        </div>

        {/* Right: Preview */}
        <div className="w-full md:w-2/3 bg-gray-900/50 flex items-center justify-center relative min-h-[400px]">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white hidden md:block"><XCircleIcon className="w-8 h-8"/></button>
            
            {isGenerating ? (
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-purple-300 animate-pulse">Imagen 4.0 正在創作...</p>
                </div>
            ) : generatedImage ? (
                <div className="relative group max-h-full p-4">
                    <img src={generatedImage} alt="Generated Cover" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={handleDownload} className="bg-black/70 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-black">
                            <ArrowDownTrayIcon className="w-4 h-4" /> 下載圖片
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-gray-600 text-center">
                    <PhotoIcon className="w-16 h-16 mx-auto mb-2 opacity-20" />
                    <p>預覽將顯示於此</p>
                </div>
            )}
            
            {error && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-900/80 text-white p-3 rounded-lg text-sm text-center border border-red-500">
                    {error}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
