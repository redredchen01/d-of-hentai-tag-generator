
import { GoogleGenAI } from "@google/genai";
import type { GeneratedTagsResult, LlmProviderService, GenerationSettings, ChatMessage } from '../types';
import { withRetry } from '../utils/retry';
import { cleanJsonOutput } from '../utils/textHelpers';
import { normalizeTags } from '../utils/tagHelpers';

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64.split(',')[1],
      mimeType
    },
  };
};

export const testGeminiConnection = async ({ apiKey }: { apiKey?: string }): Promise<void> => {
  if (!apiKey) throw new Error("Gemini API key is required to test the connection.");
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'In one word, respond with "OK".',
    });

    if (!response.text?.includes("OK")) {
        throw new Error("Received an unexpected response from the model.");
    }
  } catch (error) {
    console.error("Gemini connection test failed:", error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
      throw new Error("The provided Gemini API key is invalid.");
    }
    throw new Error("Connection failed. Please check your network status and API key.");
  }
};

const getDescriptionStyleInstruction = (style: GenerationSettings['descriptionStyle']): string => {
    switch (style) {
        case 'emotion':
            return 'Focus intensively on the emotional core. Analyze the character\'s gaze, the color psychology, and the tension in the composition. Describe the unspoken feelings.';
        case 'plot':
            return 'Analyze the image as a story hook. What conflict is being shown? What is the impending action? Describe the narrative stakes implied by the visual elements.';
        case 'teen':
            return 'Write in a punchy, high-energy style appealing to a Young Adult audience. Use dynamic verbs and focus on the "cool" or "dramatic" factors.';
        case 'default':
        default:
            return 'Provide a balanced professional analysis covering the mood, character archetypes, setting, and potential genre tropes.';
    }
};

export class GeminiProvider implements LlmProviderService {
  private ai: GoogleGenAI;
  private apiKey: string;

  constructor({ apiKey }: { apiKey?: string }) {
    const finalApiKey = apiKey || process.env.API_KEY;
    if (!finalApiKey) {
      throw new Error("Gemini API key is not provided in settings and not found in the environment.");
    }
    this.apiKey = finalApiKey;
    this.ai = new GoogleGenAI({ apiKey: finalApiKey });
  }

  async generateTags(
    imageBase64: string,
    mimeType: string,
    tagLibraryCsv: string,
    settings: GenerationSettings,
    pinnedTags?: string[],
    excludedTags?: string[],
    signal?: AbortSignal
  ): Promise<GeneratedTagsResult> {
    const performGeneration = async () => {
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        // Logic for Thinking Mode
        let model = 'gemini-2.5-flash';
        let config: any = {
            responseMimeType: "application/json",
        };

        if (settings.useThinking) {
            model = 'gemini-3-pro-preview';
            config = {
                ...config,
                thinkingConfig: { thinkingBudget: 32768 }
            };
        }

        const imagePart = fileToGenerativePart(imageBase64, mimeType);
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

        const prompt = `
        Role: You are a veteran Manga Editor and Creative Director at a top-tier publishing house. You have an eagle eye for visual storytelling, genre nuances, and market trends.

        Task: Analyze the provided manga cover art to generate metadata.

        Step 1: **Visual Analysis**
        Analyze the composition, lighting, character anatomy, clothing, and background. ${descriptionInstruction}
        Output this as the 'description' in Traditional Chinese (繁體中文).

        Step 2: **Tag Selection**
        From the "Tag Library" provided below, select the most accurate tags.
        - Tags: Select exactly ${settings.tagsCount} tags that define the core themes and story elements.
        ${langInstruction}
        - Score: Assign a relevance score (0-100).
        ${feedbackInstruction}

        Tag Library Data:
        ${tagLibraryCsv}

        **Response Format:**
        Return raw JSON only. No Markdown. No explanations outside the JSON.
        {
          "description": "...",
          "tags": [ { "name": "Tag Name", "score": 95 } ]
        }
        `;

        const response = await this.ai.models.generateContent({
          model: model,
          contents: { parts: [imagePart, { text: prompt }] },
          config: config,
        });
        
        if (signal?.aborted) {
             throw new DOMException('Aborted', 'AbortError');
        }

        return response.text;
    };

    try {
        const rawText = await withRetry(performGeneration);
        
        if (!rawText) throw new Error("AI returned an empty response.");

        const cleanedJson = cleanJsonOutput(rawText);
        let parsedResult;
        try {
            parsedResult = JSON.parse(cleanedJson);
        } catch (e) {
            console.error("JSON Parse Error:", e, "\nRaw text:", rawText);
            throw new SyntaxError("Failed to parse AI response as JSON.");
        }

        if (!parsedResult.description || !Array.isArray(parsedResult.tags)) {
            throw new Error("Invalid JSON structure: missing core fields.");
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
      console.error("Gemini generation error:", error);
      if (error instanceof Error) {
        if (error.message.includes('API key')) throw new Error("驗證失敗：API 金鑰無效或遺失。");
        if (error.message.includes('429')) throw new Error("請求頻率超限：系統重試後仍然失敗。");
        if (error.message.includes('blocked')) throw new Error("內容被封鎖：請求被 AI 的安全過濾器阻擋。");
      }
      throw error;
    }
  }

  async explainTag(
    imageBase64: string,
    mimeType: string,
    tagName: string,
    tagDescription: string,
    signal?: AbortSignal
  ): Promise<string> {
    const performExplanation = async () => {
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        const model = 'gemini-2.5-flash';
        const imagePart = fileToGenerativePart(imageBase64, mimeType);

        const prompt = `
        Role: Manga Editor.
        Task: Explain the relevance of a specific tag to this image.
        
        Target Tag: "${tagName}" (Description: ${tagDescription})

        Instructions:
        - Explain *visually* why this tag applies to the image. Point out specific details (clothing, pose, expression).
        - Keep it concise (2-3 sentences).
        - Language: Traditional Chinese (繁體中文).
        - Tone: Professional yet insightful.
        `;

        const response = await this.ai.models.generateContent({
          model: model,
          contents: { parts: [imagePart, { text: prompt }] },
        });

        return response.text;
    };

    try {
        const text = await withRetry(performExplanation);
        return text?.trim() || "無法生成解釋。";
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      console.error("Gemini explanation error:", error);
      throw new Error("AI 無法解釋此標籤，請稍後再試。");
    }
  }

  async generateImage(
    prompt: string,
    aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16',
    signal?: AbortSignal
  ): Promise<string> {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      try {
          const response = await this.ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              aspectRatio: aspectRatio,
              outputMimeType: 'image/jpeg',
            },
          });
          
          if (!response.generatedImages?.[0]?.image?.imageBytes) {
              throw new Error("No image generated.");
          }
          
          return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
      } catch (error) {
          console.error("Gemini Image Gen Error:", error);
          throw new Error("圖片生成失敗。請確認您的 API Key 支援 Imagen 4.0。");
      }
  }

  async chat(
      history: ChatMessage[],
      newMessage: string,
      imageBase64?: string,
      mimeType?: string,
      signal?: AbortSignal
  ): Promise<string> {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      try {
          const model = 'gemini-3-pro-preview';
          const fullContents = [];

          for (const msg of history) {
             fullContents.push({
                 role: msg.role,
                 parts: [{ text: msg.text }]
             });
          }

          const currentParts: any[] = [{ text: newMessage }];
          if (imageBase64 && mimeType) {
             currentParts.push(fileToGenerativePart(imageBase64, mimeType));
          }

          fullContents.push({
              role: 'user',
              parts: currentParts
          });

          const response = await this.ai.models.generateContent({
              model: model,
              contents: fullContents,
              config: {
                  systemInstruction: "You are a helpful AI assistant for a Manga Tag Generator app. You are looking at a manga cover. Answer questions about the visual details, tags, or story ideas based on the image. Be concise, professional, and helpful.",
              }
          });

          return response.text || "I didn't get that.";

      } catch (error) {
          console.error("Gemini Chat Error:", error);
          throw new Error("聊天功能暫時無法使用。");
      }
  }
}
