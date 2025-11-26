import React, { useState, useEffect } from 'react';
import type { LlmProvider, LlmConfig } from '../types';
import { LLM_CONFIG_STORAGE_KEY, LLM_CREDENTIALS_STORAGE_KEY, setActiveProvider, clearActiveProvider, OPENAI_DEFAULT_MODEL, GROK_DEFAULT_MODEL, LOCAL_DEFAULT_MODEL } from '../services/llmService';
import { testGeminiConnection } from '../services/geminiProvider';
import { testOpenAICompatConnection } from '../services/openAICompatibleProvider';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const GROK_DEFAULT_BASE_URL = 'https://api.x.ai/v1';
const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434/v1';
const LMSTUDIO_DEFAULT_BASE_URL = 'http://localhost:1234/v1';

interface ProviderCredentials {
    apiKey?: string;
    baseUrl?: string;
    modelName?: string;
    backupApiKey?: string; // Added for Gemini specific backup
}

type AllCredentials = Record<LlmProvider, ProviderCredentials>;

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeProviderType, setActiveProviderType] = useState<LlmProvider>('gemini');
  
  const [credentials, setCredentials] = useState<AllCredentials>({
      gemini: {},
      openai: {},
      grok: {},
      ollama: {},
      lmstudio: {},
      custom: {}
  });

  const [enableFailover, setEnableFailover] = useState(false);
  const [failoverProvider, setFailoverProvider] = useState<LlmProvider | undefined>(undefined);

  const [saved, setSaved] = useState(false);
  const [testState, setTestState] = useState<{ status: TestStatus; message: string | null }>({ status: 'idle', message: null });

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const configString = localStorage.getItem(LLM_CONFIG_STORAGE_KEY);
      const storedConfig: Partial<LlmConfig> = configString ? JSON.parse(configString) : { provider: 'gemini' };
      
      setActiveProviderType(storedConfig.provider || 'gemini');
      setEnableFailover(storedConfig.enableFailover || false);
      setFailoverProvider(storedConfig.failoverProvider);

      const credsString = localStorage.getItem(LLM_CREDENTIALS_STORAGE_KEY);
      if (credsString) {
          setCredentials(JSON.parse(credsString));
      } else {
          if (storedConfig.provider) {
              setCredentials(prev => ({
                  ...prev,
                  [storedConfig.provider!]: {
                      apiKey: storedConfig.apiKey,
                      baseUrl: storedConfig.baseUrl,
                      modelName: storedConfig.modelName
                  }
              }));
          }
      }
      
      setSaved(false);
      setTestState({ status: 'idle', message: null });
    }
  }, [isOpen]);

  const updateCredential = (provider: LlmProvider, field: keyof ProviderCredentials, value: string) => {
      setCredentials(prev => ({
          ...prev,
          [provider]: {
              ...prev[provider],
              [field]: value
          }
      }));
      setTestState({ status: 'idle', message: null });
      setSaved(false);
  };

  const currentCreds = credentials[activeProviderType];

  const handleTestConnection = async () => {
    setTestState({ status: 'testing', message: null });
    try {
      switch (activeProviderType) {
        case 'gemini':
          await testGeminiConnection({ apiKey: currentCreds.apiKey });
          break;
        case 'openai':
          await testOpenAICompatConnection({
            baseUrl: currentCreds.baseUrl || OPENAI_DEFAULT_BASE_URL,
            apiKey: currentCreds.apiKey,
            modelName: currentCreds.modelName || OPENAI_DEFAULT_MODEL
          });
          break;
        case 'grok':
           if (!currentCreds.apiKey) throw new Error("Grok API key is required.");
           await testOpenAICompatConnection({
            baseUrl: currentCreds.baseUrl || GROK_DEFAULT_BASE_URL,
            apiKey: currentCreds.apiKey,
            modelName: currentCreds.modelName || GROK_DEFAULT_MODEL
          });
          break;
        case 'ollama':
           await testOpenAICompatConnection({
            baseUrl: currentCreds.baseUrl || OLLAMA_DEFAULT_BASE_URL,
            apiKey: currentCreds.apiKey,
            modelName: currentCreds.modelName || LOCAL_DEFAULT_MODEL
          });
          break;
        case 'lmstudio':
           await testOpenAICompatConnection({
            baseUrl: currentCreds.baseUrl || LMSTUDIO_DEFAULT_BASE_URL,
            modelName: currentCreds.modelName || LOCAL_DEFAULT_MODEL
          });
          break;
        case 'custom':
          if (!currentCreds.baseUrl) throw new Error("Base URL is required for custom endpoints.");
          await testOpenAICompatConnection({
            baseUrl: currentCreds.baseUrl,
            apiKey: currentCreds.apiKey,
            modelName: currentCreds.modelName
          });
          break;
      }
      setTestState({ status: 'success', message: 'Connection successful!' });
    } catch (err) {
      setTestState({ status: 'error', message: err instanceof Error ? err.message : 'An unknown error occurred.' });
    }
  };

  const handleSave = () => {
    localStorage.setItem(LLM_CREDENTIALS_STORAGE_KEY, JSON.stringify(credentials));

    const activeConfig: LlmConfig = {
        provider: activeProviderType,
        apiKey: currentCreds.apiKey,
        baseUrl: currentCreds.baseUrl,
        modelName: currentCreds.modelName,
        enableFailover,
        failoverProvider
    };

    if (!activeConfig.apiKey) delete activeConfig.apiKey;
    if (!activeConfig.baseUrl) delete activeConfig.baseUrl;
    if (!activeConfig.modelName) delete activeConfig.modelName;

    localStorage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(activeConfig));
    
    try {
      setActiveProvider(activeConfig);
    } catch (err) {
      console.error("Failed to set active provider on save:", err);
      setTestState({ status: 'error', message: 'Settings saved, but failed to initialize provider.' });
      return;
    }

    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleReset = () => {
    if(window.confirm("Are you sure you want to reset all settings? This will clear all API keys.")) {
        localStorage.removeItem(LLM_CONFIG_STORAGE_KEY);
        localStorage.removeItem(LLM_CREDENTIALS_STORAGE_KEY);
        clearActiveProvider();
        setActiveProviderType('gemini');
        setCredentials({gemini:{}, openai:{}, grok:{}, ollama:{}, lmstudio:{}, custom:{}});
        setEnableFailover(false);
        setFailoverProvider(undefined);
        onClose();
    }
  };
  
  if (!isOpen) return null;

  const renderProviderButton = (provider: LlmProvider, label: string) => (
    <button onClick={() => { setActiveProviderType(provider); setTestState({status:'idle', message:null}); }} 
      className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeProviderType === provider ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-gray-400 hover:bg-gray-700'}`}>
      {label}
    </button>
  );
  
  const isCorsError = testState.status === 'error' && (testState.message?.includes('CORS') || testState.message?.includes('Failed to fetch'));

  const availableProviders: {value: LlmProvider, label: string}[] = [
      { value: 'gemini', label: 'Gemini' },
      { value: 'openai', label: 'OpenAI' },
      { value: 'grok', label: 'Grok' },
      { value: 'ollama', label: 'Ollama' },
      { value: 'lmstudio', label: 'LM Studio' },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[#09090b]/90 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg m-4 p-6 sm:p-8 text-white relative transform transition-all animate-slide-in-up overflow-y-auto max-h-[90vh] custom-scrollbar glass-panel-tech"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6 tracking-tight">系統核心控制台 (System Core)</h2>
        
        <div className="mb-6">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Primary Provider</label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 rounded-xl bg-black/40 p-1.5 border border-white/5">
            {renderProviderButton('gemini', 'Gemini')}
            {renderProviderButton('openai', 'OpenAI')}
            {renderProviderButton('grok', 'Grok')}
            {renderProviderButton('ollama', 'Ollama')}
            {renderProviderButton('lmstudio', 'LM Studio')}
            {renderProviderButton('custom', 'Custom')}
          </div>
        </div>
        
        <div className="min-h-[200px] space-y-5">
            {activeProviderType === 'gemini' && (
              <div className="animate-fade-in space-y-4">
                <p className="text-gray-400 text-xs bg-purple-900/20 border border-purple-500/20 p-3 rounded-lg">
                  Gemini provides the best balance of speed and quality for manga analysis.
                </p>
                <div>
                  <label htmlFor="gemini-api-key" className="text-sm font-medium text-gray-300 mb-1 block">Gemini API Key (Primary)</label>
                  <input 
                    id="gemini-api-key" 
                    type="password" 
                    value={credentials.gemini.apiKey || ''} 
                    onChange={(e) => updateCredential('gemini', 'apiKey', e.target.value)} 
                    placeholder="Enter your Gemini API Key" 
                    className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                  />
                </div>
              </div>
            )}
            {activeProviderType === 'openai' && (
              <div className="animate-fade-in space-y-4">
                <div>
                  <label htmlFor="openai-api-key" className="text-sm font-medium text-gray-300 mb-1 block">OpenAI API Key</label>
                  <input id="openai-api-key" type="password" value={credentials.openai.apiKey || ''} onChange={(e) => updateCredential('openai', 'apiKey', e.target.value)} placeholder="sk-..." className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"/>
                </div>
                <div>
                  <label htmlFor="openai-base-url" className="text-sm font-medium text-gray-300 mb-1 block">Base URL (Optional)</label>
                  <input id="openai-base-url" type="text" value={credentials.openai.baseUrl || ''} onChange={(e) => updateCredential('openai', 'baseUrl', e.target.value)} placeholder={OPENAI_DEFAULT_BASE_URL} className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"/>
                </div>
              </div>
            )}
             {activeProviderType === 'grok' && (
              <div className="animate-fade-in space-y-4">
                <div>
                  <label htmlFor="grok-api-key" className="text-sm font-medium text-gray-300 mb-1 block">Grok API Key</label>
                  <input id="grok-api-key" type="password" value={credentials.grok.apiKey || ''} onChange={(e) => updateCredential('grok', 'apiKey', e.target.value)} placeholder="gsk_..." className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"/>
                </div>
              </div>
            )}
            {activeProviderType === 'ollama' && (
               <div className="animate-fade-in space-y-4">
                <div>
                  <label htmlFor="ollama-base-url" className="text-sm font-medium text-gray-300 mb-1 block">Server Base URL</label>
                  <input id="ollama-base-url" type="text" value={credentials.ollama.baseUrl || ''} onChange={(e) => updateCredential('ollama', 'baseUrl', e.target.value)} placeholder={OLLAMA_DEFAULT_BASE_URL} className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"/>
                </div>
                 <div>
                  <label htmlFor="ollama-model" className="text-sm font-medium text-gray-300 mb-1 block">Model Name (Optional)</label>
                  <input id="ollama-model" type="text" value={credentials.ollama.modelName || ''} onChange={(e) => updateCredential('ollama', 'modelName', e.target.value)} placeholder="e.g., llava" className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"/>
                </div>
              </div>
            )}
            {activeProviderType === 'lmstudio' && (
               <div className="animate-fade-in space-y-4">
                <div>
                  <label htmlFor="lmstudio-base-url" className="text-sm font-medium text-gray-300 mb-1 block">Server Base URL</label>
                  <input id="lmstudio-base-url" type="text" value={credentials.lmstudio.baseUrl || ''} onChange={(e) => updateCredential('lmstudio', 'baseUrl', e.target.value)} placeholder={LMSTUDIO_DEFAULT_BASE_URL} className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"/>
                </div>
              </div>
            )}
            {activeProviderType === 'custom' && (
               <div className="animate-fade-in space-y-4">
                <div>
                  <label htmlFor="custom-base-url" className="text-sm font-medium text-gray-300 mb-1 block">Server Base URL</label>
                  <input id="custom-base-url" type="text" value={credentials.custom.baseUrl || ''} onChange={(e) => updateCredential('custom', 'baseUrl', e.target.value)} placeholder="http://localhost:11434/v1" className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"/>
                </div>
                 <div>
                  <label htmlFor="custom-api-key" className="text-sm font-medium text-gray-300 mb-1 block">API Key (Optional)</label>
                  <input id="custom-api-key" type="password" value={credentials.custom.apiKey || ''} onChange={(e) => updateCredential('custom', 'apiKey', e.target.value)} className="w-full px-4 py-2.5 bg-black/40 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"/>
                </div>
              </div>
            )}
        </div>

        {/* Failover Settings */}
        <div className="mt-8 pt-6 border-t border-gray-800">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">System Resilience (Plan B)</h3>
                    <p className="text-xs text-gray-500 mt-1">Auto-switch provider on failure</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={enableFailover}
                        onChange={(e) => setEnableFailover(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-800 border border-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white"></div>
                </label>
            </div>
            
            {enableFailover && (
                <div className="animate-fade-in p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 mb-1.5 block">Backup Provider</label>
                        <select 
                            value={failoverProvider || ''}
                            onChange={(e) => setFailoverProvider(e.target.value as LlmProvider)}
                            className="w-full px-3 py-2.5 bg-black/40 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-purple-500 transition-all text-gray-200"
                        >
                            <option value="" disabled>Select a backup provider</option>
                            {availableProviders.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Gemini Specific Backup Key Input */}
                    {failoverProvider === 'gemini' && (
                        <div className="animate-fade-in pt-2 border-t border-gray-800/50">
                             <label className="text-xs text-purple-300 mb-1.5 block flex items-center gap-2">
                                <span>Backup Gemini API Key (Optional)</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 border border-purple-500/30 text-purple-200">Recommended</span>
                             </label>
                             <p className="text-[10px] text-gray-500 mb-2">
                                 Use a different API key for the backup to avoid rate limits on the primary key.
                             </p>
                             <input 
                                type="password" 
                                value={credentials.gemini.backupApiKey || ''} 
                                onChange={(e) => updateCredential('gemini', 'backupApiKey', e.target.value)} 
                                placeholder="Enter Backup Gemini API Key" 
                                className="w-full px-3 py-2.5 bg-black/40 border border-gray-700 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
        
        <div className="mt-8">
          <button onClick={handleTestConnection} disabled={testState.status === 'testing'} className="w-full px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-wait shadow-lg">
            {testState.status === 'testing' ? 'Testing Connection...' : `Test ${activeProviderType.toUpperCase()} Connection`}
          </button>
          <div className="h-auto min-h-6 mt-2 text-sm text-center flex flex-col items-center justify-center">
            {testState.status === 'success' && <div className="flex items-center gap-2 text-green-400 animate-fade-in bg-green-900/20 px-3 py-1 rounded-full border border-green-500/30"><CheckCircleIcon className="w-4 h-4" /><span>{testState.message}</span></div>}
            {testState.status === 'error' && <div className="flex items-center gap-2 text-red-400 animate-fade-in bg-red-900/20 px-3 py-1 rounded-full border border-red-500/30"><XCircleIcon className="w-4 h-4" /><span>{testState.message}</span></div>}
            
            {isCorsError && (
              <div className="mt-3 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-xl text-xs text-yellow-200 text-left animate-fade-in w-full">
                  <p className="font-bold mb-2 text-yellow-400">Connection Help: CORS Issue</p>
                  <p className="opacity-80 mb-2">Your local server is blocking the connection. Please configure:</p>
                  <ul className="list-disc list-inside space-y-1.5 opacity-80 ml-1">
                      <li>
                          <strong>Ollama:</strong> Set environment variable <code>OLLAMA_ORIGINS='*'</code>
                      </li>
                      <li>
                          <strong>LM Studio:</strong> Enable "CORS" in the Server tab settings.
                      </li>
                  </ul>
                  <p className="mt-3 font-bold text-yellow-400">⚠️ Restart your server after changes.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-800">
           <button onClick={handleSave} className={`w-full px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] ${saved ? 'bg-green-600 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-[1.02]'}`} disabled={saved}>
             {saved ? 'Settings Saved' : 'Save Configuration'}
           </button>
           <button onClick={handleReset} className="w-full sm:w-auto px-6 py-3 bg-transparent border border-gray-700 hover:border-gray-500 hover:bg-white/5 text-gray-400 hover:text-white font-semibold rounded-xl transition-all duration-300">
              Reset
            </button>
        </div>
        
         <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full" aria-label="Close settings">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};