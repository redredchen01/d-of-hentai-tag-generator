
import React, { useState, useRef, useEffect } from 'react';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { sendChatMessage } from '../services/llmService';
import type { ChatMessage } from '../types';

interface ChatBotProps {
  activeImageBase64?: string | null;
  activeImageType?: string;
}

export const ChatBot: React.FC<ChatBotProps> = ({ activeImageBase64, activeImageType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset chat history when the active image changes
  useEffect(() => {
    setMessages([]);
  }, [activeImageBase64]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendChatMessage(messages, userMsg.text, activeImageBase64 || undefined, activeImageType || undefined);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "抱歉，發生錯誤。請檢查您的設定或稍後再試。",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all duration-500 hover:scale-110 hover:shadow-[0_0_50px_rgba(124,58,237,0.7)] border border-white/20 group ${
          isOpen ? 'scale-0 opacity-0 rotate-90 pointer-events-none' : 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white rotate-0'
        }`}
        aria-label="Open AI Chat"
      >
        <div className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
        <ChatBubbleBottomCenterTextIcon className="w-7 h-7 drop-shadow-md relative z-10" />
        {!isOpen && messages.length === 0 && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#09090b] animate-ping"></span>
        )}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-[#0e0e11]/95 border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden transition-all duration-500 cubic-bezier(0.2, 0.8, 0.2, 1) origin-bottom-right backdrop-blur-2xl ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'
        }`}
        style={{ height: '650px', maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-xl p-5 border-b border-white/5 flex justify-between items-center relative z-10">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2 text-lg tracking-tight">
               AI 編輯助手
            </h3>
            <div className="flex items-center gap-2 mt-1">
                 <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </div>
                 <span className="text-[11px] font-medium text-gray-400">Gemini 3 Pro Online</span>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all duration-200 hover:rotate-90"
          >
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-grow overflow-y-auto p-5 space-y-6 custom-scrollbar bg-[#0e0e11]" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20 px-6 animate-fade-in">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-[2rem] mx-auto mb-6 flex items-center justify-center border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                  <ChatBubbleBottomCenterTextIcon className="w-10 h-10 text-purple-500/80" />
              </div>
              <p className="text-white font-bold mb-3 text-lg">👋 有什麼想問的嗎？</p>
              <p className="text-sm leading-relaxed text-gray-400">我可以解釋為什麼選擇這些標籤，或是幫您修改文案、發想新的劇情走向。</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`max-w-[85%] px-5 py-3.5 text-sm leading-relaxed shadow-md ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-[20px] rounded-br-none shadow-purple-900/20' 
                  : 'bg-[#27272a] text-gray-200 rounded-[20px] rounded-bl-none border border-white/5 shadow-lg'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-[#27272a] rounded-[20px] rounded-bl-none px-5 py-4 flex gap-2 border border-white/5 shadow-sm items-center">
                <span className="text-xs text-gray-500 font-bold tracking-wider mr-1">THINKING</span>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-[bounce_1s_infinite_-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-[bounce_1s_infinite_-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-[bounce_1s_infinite]"></span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-[#0e0e11] border-t border-white/5 flex gap-3 backdrop-blur-md">
          <div className="relative flex-grow group">
            <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="輸入訊息..."
                className="w-full bg-[#1d1d20] border border-gray-700/50 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-purple-500/80 focus:bg-[#252529] transition-all placeholder-gray-600 relative z-10"
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-white hover:bg-gray-200 text-black p-3.5 rounded-2xl transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 transform rotate-[-45deg] translate-x-0.5 -translate-y-0.5">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
};
