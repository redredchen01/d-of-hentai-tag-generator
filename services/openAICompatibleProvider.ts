
import type { GeneratedTagsResult, OpenAICompatConfig, LlmProviderService, GenerationSettings } from '../types';
import { withRetry } from '../utils/retry';
import { cleanJsonOutput } from '../utils/textHelpers';
import { normalizeTags } from '../utils/tagHelpers';

const getDescriptionStyleInstruction = (style: GenerationSettings['descriptionStyle']): string => {
    switch (style) {
        case 'emotion':
            return 'Focus intensively on the emotional core. Analyze the character\'s gaze, the color psychology, and the tension in the composition.';
        case 'plot':
            return 'Analyze the image as a story hook. What conflict is being shown? What is the impending action?';
        case 'teen':
            return 'Write in a punchy, high-energy style appealing to a Young Adult audience. Use dynamic verbs.';
        case 'default':
        default:
            return 'Provide a balanced professional analysis covering the mood, character archetypes, setting, and potential genre tropes.';
    }
};

const createPrompt = (tagLibraryCsv: string, settings: GenerationSettings, pinnedTags?: string[], excludedTags?: string[]) => {
    const descriptionInstruction = getDescriptionStyleInstruction(settings.descriptionStyle);
    
    let feedbackInstruction = "";
    if (pinnedTags && pinnedTags.length > 0) {
      feedbackInstruction += `\n\n**CRITICAL FEEDBACK:** The user has explicitly **PINNED** these tags. You MUST include them in your selection if they are even remotely applicable: ${pinnedTags.join(', ')}.`;
    }
    if (excludedTags && excludedTags.length > 0) {
      feedbackInstruction += `\n\n**CRITICAL FEEDBACK:** The user has explicitly **EXCLUDED** these tags. Do NOT use them: ${excludedTags.join(', ')}.`;
    }

    // Dynamic Instruction based on Language Selection
    const lang = settings.tagLanguage || 'sc';
    let langInstruction = "";
    if (lang === 'en') {
        langInstruction = "- **CRITICAL CONSTRAINT:** You MUST return the exact string from the **'原始标签' (English)** column.\n- **STRICTLY FORBIDDEN:** Do NOT use Chinese characters for tags.";
    } else if (lang === 'tc') {
        langInstruction = "- **CRITICAL CONSTRAINT:** You MUST return the exact string from the **'台灣翻譯' (Traditional Chinese)** column.\n- **STRICTLY FORBIDDEN:** Do NOT use English or Simplified Chinese for tags.";
    } else {
        // Default SC
        langInstruction = "- **CRITICAL CONSTRAINT:** You MUST return the exact string from the **'名称' (Simplified Chinese)** column.\n- **STRICTLY FORBIDDEN:** Do NOT use English or Traditional Chinese for tags.";
    }

    return `
    Role: You are a veteran Manga Editor and Creative Director at a top-tier publishing house.
    Task: Analyze the provided manga cover art to generate metadata.

    Step 1: **Visual Analysis**
    Analyze the composition, lighting, and character details. ${descriptionInstruction}
    Output this as the 'description' in Traditional Chinese (繁體中文).

    Step 2: **Tag Selection**
    From the "Tag Library" provided below, select the most accurate tags.
    - Tags: Select exactly ${settings.tagsCount} tags.
    ${langInstruction}
    - Score: Assign a relevance score (0-100).
    ${feedbackInstruction}

    Tag Library Data:
    ${tagLibraryCsv}

    **Response Format:**
    Return raw JSON only.
    {
      "description": "...",
      "tags": [ { "name": "Tag Name", "score": 95 } ]
    }
    `;
};

export const testOpenAICompatConnection = async ({ baseUrl, apiKey, modelName = 'test-model' }: { baseUrl: string; apiKey?: string; modelName?: string }): Promise<void> => {
    try {
      const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const endpoint = new URL('chat/completions', sanitizedBaseUrl).toString();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: 'Respond with only the word "OK".' }],
          max_tokens: 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Authentication failed. The API key is invalid or missing.");
        }
        const errorBody = await response.json().catch(() => ({ error: { message: 'Unknown server error' }}));
        if (errorBody?.error?.message?.includes('model') || response.status === 404) {
            return; 
        }
        throw new Error(`Server responded with status ${response.status}.`);
      }
      
      await response.json();

    } catch (error) {
      console.error("Connection test failed:", error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
             throw new Error("Connection timed out. The server is unresponsive.");
        }
         if (error.message.includes('Failed to fetch') || error instanceof TypeError) {
             throw new Error(`Connection failed. Check if server is running at ${baseUrl} and CORS is configured.`);
        }
        throw error;
      }
      throw new Error("An unknown error occurred.");
    }
  };

export class OpenAICompatibleProvider implements LlmProviderService {
  private config: OpenAICompatConfig;

  constructor(config: OpenAICompatConfig) {
     if (!config.baseUrl) {
      throw new Error("Base URL is required for OpenAI-compatible provider.");
    }
    this.config = config;
  }

  async generateTags(
    imageBase64: string,
    _mimeType: string,
    tagLibraryCsv: string,
    settings: GenerationSettings,
    pinnedTags?: string[],
    excludedTags?: string[],
    signal?: AbortSignal
  ): Promise<GeneratedTagsResult> {
    const performGeneration = async () => {
        const prompt = createPrompt(tagLibraryCsv, settings, pinnedTags, excludedTags);
        const sanitizedBaseUrl = this.config.baseUrl.endsWith('/') ? this.config.baseUrl : `${this.config.baseUrl}/`;
        const endpoint = new URL('chat/completions', sanitizedBaseUrl).toString();

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: this.config.modelName,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: imageBase64 } }
                        ]
                    }
                ],
                max_tokens: 2048,
                temperature: 0.5,
                response_format: { type: 'json_object' } 
            }),
            signal: signal
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText }));
            const errorMessage = errorBody.error?.message || errorBody.message || JSON.stringify(errorBody);
            
            if (response.status === 429) {
                throw new Error(`Rate limit exceeded (429): ${errorMessage}`);
            }
            if (response.status >= 500) {
                throw new Error(`Server error (${response.status}): ${errorMessage}`);
            }
            
            if (response.status === 401 || response.status === 403) throw new Error(`Auth failed: ${errorMessage}`);
            
            throw new Error(`API Request failed (${response.status}): ${errorMessage}`);
        }

        const data = await response.json();
        const text = data.choices[0]?.message?.content?.trim();
        return text;
    };

    try {
        const rawText = await withRetry(performGeneration);
        if (!rawText) throw new Error("Model returned an empty response.");

        const cleanedJson = cleanJsonOutput(rawText);
        let parsedResult;
        try {
            parsedResult = JSON.parse(cleanedJson);
        } catch (e) {
            console.error("JSON Parse Error:", e, "Raw:", rawText);
            throw new Error("Failed to parse valid JSON from model response.");
        }

        if (!parsedResult.description || !Array.isArray(parsedResult.tags)) {
            throw new Error("Invalid JSON structure.");
        }

        // --- POST-PROCESSING VALIDATION ---
        // Forcefully map tags to the requested language using the internal CSV library
        const targetLang = settings.tagLanguage || 'sc';
        parsedResult.tags = normalizeTags(parsedResult.tags, targetLang);
        // ----------------------------------

        return parsedResult as GeneratedTagsResult;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
      }
      console.error("OpenAI-compatible generation error:", error);
      if (error instanceof Error) {
         if (error.message.includes('Auth failed')) {
             throw new Error(`驗證失敗：API 金鑰無效。`);
         }
         if (error.message.includes('Rate limit')) {
             throw new Error(`請求頻率超限：重試多次後仍失敗。`);
         }
      }
      throw error;
    }
  }

  async explainTag(
    imageBase64: string,
    _mimeType: string,
    tagName: string,
    tagDescription: string,
    signal?: AbortSignal
  ): Promise<string> {
    const performExplanation = async () => {
        const prompt = `
        Role: Manga Editor.
        Task: Explain visually why the tag "${tagName}" applies to this image.
        Description of tag: ${tagDescription}
        Instructions: Concise (2 sentences), Traditional Chinese (繁體中文), Professional tone.
        `;
        
        const sanitizedBaseUrl = this.config.baseUrl.endsWith('/') ? this.config.baseUrl : `${this.config.baseUrl}/`;
        const endpoint = new URL('chat/completions', sanitizedBaseUrl).toString();

        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: this.config.modelName,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: imageBase64 } }
                        ]
                    }
                ],
                max_tokens: 300,
                temperature: 0.6,
            }),
            signal: signal
        });

        if (!response.ok) {
             throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content?.trim();
    };

    try {
        const text = await withRetry(performExplanation);
        return text || "無法生成解釋。";
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
        }
        console.error("Explanation error:", error);
        throw new Error("無法獲取 AI 解釋。");
    }
  }
}
