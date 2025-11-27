
export type LlmProvider = 'gemini' | 'openai' | 'grok' | 'ollama' | 'lmstudio' | 'custom';

export interface LlmConfig {
  provider: LlmProvider;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  enableFailover?: boolean;
  failoverProvider?: LlmProvider;
}

export interface OpenAICompatConfig {
    baseUrl: string;
    apiKey?: string;
    modelName?: string;
}

export interface GenerationSettings {
  tagsCount: number;
  descriptionStyle: 'default' | 'emotion' | 'plot' | 'teen';
  useThinking?: boolean;
  tagLanguage: 'sc' | 'tc' | 'en';
}

export interface GenerationResponse {
    result: GeneratedTagsResult;
    usedFailover: boolean;
    providerName: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export interface LlmProviderService {
  generateTags(
    imageBase64: string,
    mimeType: string,
    tagLibraryCsv: string,
    settings: GenerationSettings,
    pinnedTags?: string[],
    excludedTags?: string[],
    signal?: AbortSignal
  ): Promise<GeneratedTagsResult>;
  explainTag(
    imageBase64: string,
    mimeType: string,
    tagName: string,
    tagDescription: string,
    signal?: AbortSignal
  ): Promise<string>;
  // Optional methods for advanced features
  generateImage?(
    prompt: string,
    aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16',
    signal?: AbortSignal
  ): Promise<string>; // Returns base64 image
  chat?(
    history: ChatMessage[],
    newMessage: string,
    imageBase64?: string,
    mimeType?: string,
    signal?: AbortSignal
  ): Promise<string>;
}


export interface TagData {
  originalLabel: string;
  name: string;
  taiwanTranslation: string;
  notes: string;
  description: string;
  externalLink: string;
}

export interface GeneratedTag {
  name:string;
  score: number;
}

export interface GeneratedMarketingCopy {
    logline: string;
    catchphrases: string[];
    dialogueSnippet: string;
}

export interface GeneratedTagsResult {
  description: string;
  tags: GeneratedTag[];
  marketingCopy?: GeneratedMarketingCopy;
}

export interface HistoryEntry {
  id: number;
  image: string; // base64 string
  result: GeneratedTagsResult;
}

export interface MultilingualTag {
  en: string;
  sc: string;
  tc: string;
  description: string;
}

export type AppMode = 'single' | 'batch';
export type BatchItemStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface BatchItem {
  id: string;
  file: File;
  base64: string;
  status: BatchItemStatus;
  result?: GeneratedTagsResult;
  error?: string;
}
