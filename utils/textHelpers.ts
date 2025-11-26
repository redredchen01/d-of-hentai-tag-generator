
/**
 * Cleans LLM output to extract valid JSON.
 * Removes Markdown code blocks (```json ... ```) and finds the first '{' and last '}'.
 */
export function cleanJsonOutput(text: string): string {
  if (!text) return "{}";

  let cleaned = text.trim();

  // Remove markdown code blocks if present
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/, "");

  // Find the first '{' and the last '}'
  const firstOpenBrace = cleaned.indexOf("{");
  const lastCloseBrace = cleaned.lastIndexOf("}");

  if (firstOpenBrace !== -1 && lastCloseBrace !== -1 && lastCloseBrace > firstOpenBrace) {
    cleaned = cleaned.substring(firstOpenBrace, lastCloseBrace + 1);
  }

  return cleaned;
}
