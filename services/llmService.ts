import { GeminiProvider } from './geminiProvider';
import { OpenAICompatibleProvider } from './openAICompatibleProvider';
import type { LlmConfig, GeneratedTagsResult, LlmProviderService, GenerationSettings, LlmProvider, GenerationResponse, ChatMessage } from '../types';

export const LLM_CONFIG_STORAGE_KEY = 'llm-config';
export const LLM_CREDENTIALS_STORAGE_KEY = 'llm-credentials';

const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const GROK_DEFAULT_BASE_URL = 'https://api.x.ai/v1';
const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434/v1';
const LMSTUDIO_DEFAULT_BASE_URL = 'http://localhost:1234/v1';

export const OPENAI_DEFAULT_MODEL = 'gpt-4o';
export const GROK_DEFAULT_MODEL = 'grok-beta';
export const LOCAL_DEFAULT_MODEL = 'llava';

let activeProvider: LlmProviderService | null = null;

// Helper to retrieve saved credentials for a specific provider
const getStoredCredentials = (provider: LlmProvider) => {
    try {
        const stored = localStorage.getItem(LLM_CREDENTIALS_STORAGE_KEY);
        if (stored) {
            const credentials = JSON.parse(stored);
            return credentials[provider] || {};
        }
    } catch (e) {
        console.error("Failed to load credentials", e);
    }
    return {};
};

// Factory function to create a provider instance
const createProvider = (providerType: LlmProvider, overrideConfig?: Partial<LlmConfig>): LlmProviderService => {
    // 1. Get credentials from separate storage to ensure we have keys even if not active
    const storedCreds = getStoredCredentials(providerType);
    
    // 2. Merge: Config passed in > Stored Credentials > Defaults
    const apiKey = overrideConfig?.apiKey || storedCreds.apiKey;
    const baseUrl = overrideConfig?.baseUrl || storedCreds.baseUrl;
    const modelName = overrideConfig?.modelName || storedCreds.modelName;

    switch (providerType) {
        case 'openai':
            if (!apiKey) throw new Error("OpenAI provider requires an API Key.");
            return new OpenAICompatibleProvider({
                baseUrl: baseUrl || OPENAI_DEFAULT_BASE_URL,
                apiKey: apiKey,
                modelName: modelName || OPENAI_DEFAULT_MODEL,
            });
        case 'grok':
            if (!apiKey) throw new Error("Grok provider requires an API Key.");
            return new OpenAICompatibleProvider({
                baseUrl: baseUrl || GROK_DEFAULT_BASE_URL,
                apiKey: apiKey,
                modelName: modelName || GROK_DEFAULT_MODEL,
            });
        case 'ollama':
            return new OpenAICompatibleProvider({
                baseUrl: baseUrl || OLLAMA_DEFAULT_BASE_URL,
                apiKey: apiKey, // Ollama usually doesn't need key, but good to pass
                modelName: modelName || LOCAL_DEFAULT_MODEL,
            });
        case 'lmstudio':
            return new OpenAICompatibleProvider({
                baseUrl: baseUrl || LMSTUDIO_DEFAULT_BASE_URL,
                apiKey: apiKey,
                modelName: modelName || LOCAL_DEFAULT_MODEL,
            });
        case 'custom':
            if (!baseUrl) throw new Error("Custom Endpoint provider requires a Base URL.");
            return new OpenAICompatibleProvider({
                baseUrl: baseUrl,
                apiKey: apiKey,
                modelName: modelName || LOCAL_DEFAULT_MODEL,
            });
        case 'gemini':
        default:
            // Gemini provider handles process.env fallback internally if apiKey is undefined
            return new GeminiProvider({ apiKey: apiKey });
    }
};

export const setActiveProvider = (config: LlmConfig): void => {
  console.log("Setting active provider:", config.provider);
  // We pass the config directly here, assuming the UI passed the current form state
  activeProvider = createProvider(config.provider, config);
};

export const clearActiveProvider = (): void => {
  activeProvider = null;
  console.log("Active provider cleared.");
};

const getLlmConfig = (): LlmConfig => {
  const configString = localStorage.getItem(LLM_CONFIG_STORAGE_KEY);
  const defaultConfig: LlmConfig = { provider: 'gemini' };

  if (!configString) {
    return defaultConfig;
  }
  return { ...defaultConfig, ...JSON.parse(configString) };
};

const ensureProviderIsActive = (): LlmProviderService => {
  if (activeProvider) {
    return activeProvider;
  }
  
  console.log("No active provider found, initializing from storage.");
  const config = getLlmConfig();
  setActiveProvider(config);
  
  if (!activeProvider) {
    throw new Error("Fatal error: Could not initialize LLM provider.");
  }
  return activeProvider;
};

export const generateTags = async (
  imageBase64: string,
  mimeType: string,
  tagLibraryCsv: string,
  settings: GenerationSettings,
  pinnedTags?: string[],
  excludedTags?: string[],
  signal?: AbortSignal
): Promise<GenerationResponse> => {
  const config = getLlmConfig();
  
  try {
    const provider = ensureProviderIsActive();
    const result = await provider.generateTags(imageBase64, mimeType, tagLibraryCsv, settings, pinnedTags, excludedTags, signal);
    return { result, usedFailover: false, providerName: config.provider };
  } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
          throw err; // Don't failover if aborted by user
      }

      console.error(`Primary provider (${config.provider}) failed:`, err);

      // Modified check: Allow failover even if providers are the same (e.g. Gemini -> Gemini with backup key)
      if (config.enableFailover && config.failoverProvider) {
          console.log(`Attempting failover to ${config.failoverProvider}...`);
          try {
              // Logic for Gemini specific backup key
              let failoverConfig: Partial<LlmConfig> = {};
              
              if (config.failoverProvider === 'gemini') {
                  const creds = getStoredCredentials('gemini');
                  // Prioritize backup key, fall back to main key
                  if (creds.backupApiKey) {
                      console.log("Using dedicated Backup Gemini API Key.");
                      failoverConfig.apiKey = creds.backupApiKey;
                  }
              }

              const failoverProvider = createProvider(config.failoverProvider, failoverConfig);
              
              const result = await failoverProvider.generateTags(imageBase64, mimeType, tagLibraryCsv, settings, pinnedTags, excludedTags, signal);
              console.log("Failover successful.");
              return { result, usedFailover: true, providerName: config.failoverProvider };
          } catch (failoverErr) {
              if (failoverErr instanceof DOMException && failoverErr.name === 'AbortError') {
                  throw failoverErr;
              }
              console.error(`Failover provider (${config.failoverProvider}) also failed:`, failoverErr);
              throw new Error(`主要服務 (${config.provider}) 失敗: ${err instanceof Error ? err.message : 'Unknown'}. \n備援服務 (${config.failoverProvider}) 也失敗: ${failoverErr instanceof Error ? failoverErr.message : 'Unknown'}`);
          }
      }

       if (err instanceof TypeError) {
          throw new Error(`無法連接到 AI 服務。請檢查伺服器是否運行中，網址是否正確，以及 CORS 設定。`);
      }
      throw err;
  }
};

export const explainTag = async (
  imageBase64: string,
  mimeType: string,
  tagName: string,
  tagDescription: string,
  signal?: AbortSignal
): Promise<string> => {
    const config = getLlmConfig();
    try {
        const provider = ensureProviderIsActive();
        return await provider.explainTag(imageBase64, mimeType, tagName, tagDescription, signal);
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw err;
        }
        console.error(`Error explaining tag with active provider:`, err);

        // Modified check: Allow failover even if providers are the same
        if (config.enableFailover && config.failoverProvider) {
             try {
                let failoverConfig: Partial<LlmConfig> = {};
                if (config.failoverProvider === 'gemini') {
                    const creds = getStoredCredentials('gemini');
                    if (creds.backupApiKey) {
                        failoverConfig.apiKey = creds.backupApiKey;
                    }
                }

                const failoverProvider = createProvider(config.failoverProvider, failoverConfig);
                return await failoverProvider.explainTag(imageBase64, mimeType, tagName, tagDescription, signal);
             } catch (failoverErr) {
                 console.error("Failover explanation failed", failoverErr);
             }
        }

        if (err instanceof TypeError) {
          throw new Error(`Failed to connect to the endpoint for explanation.`);
        }
        throw err;
    }
};

export const generateImage = async (
    prompt: string,
    aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16',
    signal?: AbortSignal
): Promise<string> => {
    const provider = ensureProviderIsActive();
    if (!provider.generateImage) {
        throw new Error("當前 AI 服務不支援圖片生成功能 (僅 Gemini 支援)。");
    }
    return await provider.generateImage(prompt, aspectRatio, signal);
};

export const sendChatMessage = async (
    history: ChatMessage[],
    message: string,
    imageBase64?: string,
    mimeType?: string,
    signal?: AbortSignal
): Promise<string> => {
    const provider = ensureProviderIsActive();
    if (!provider.chat) {
        throw new Error("當前 AI 服務不支援聊天功能 (僅 Gemini 支援)。");
    }
    return await provider.chat(history, message, imageBase64, mimeType, signal);
};