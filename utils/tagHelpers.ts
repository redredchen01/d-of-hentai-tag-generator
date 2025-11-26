
import type { GeneratedTag } from '../types';
import { tagDataCsv } from '../lib/tagData';

/**
 * Calculates the Levenshtein distance between two strings.
 * Used for fuzzy matching tags.
 */
const levenshteinDistance = (s: string, t: string): number => {
  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  const d = [];
  for (let i = 0; i <= s.length; i++) d[i] = [i];
  for (let j = 0; j <= t.length; j++) d[0][j] = j;

  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s.charAt(i - 1) === t.charAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[s.length][t.length];
};

/**
 * Creates a lookup function that maps ANY language variation (EN, SC, TC) 
 * to the specific TARGET language using the internal tag library.
 * Includes fuzzy matching to correct AI typos or near-matches.
 */
export const createTagLookup = (targetLang: 'sc' | 'tc' | 'en') => {
  const lines = tagDataCsv.split('\n').slice(1); // Skip header
  const lookupMap = new Map<string, string>(); // Key (normalized) -> Target Value
  const validKeys: string[] = []; // List of all valid keys for fuzzy search
  
  lines.forEach(line => {
    const parts = line.split(',');
    if (parts.length < 2) return;
    
    // Check if this is the simple "標籤,標籤定義" format (2 columns)
    if (parts.length === 2) {
      const tag = parts[0]?.trim(); // 標籤
      const definition = parts[1]?.trim(); // 標籤定義
      
      if (tag) {
        // For simple format, always return the tag name regardless of targetLang
        const norm = tag.toLowerCase();
        lookupMap.set(norm, tag);
        validKeys.push(norm);
        // Also map the definition to the tag (in case AI generates definitions)
        if (definition) {
          const defNorm = definition.toLowerCase();
          lookupMap.set(defNorm, tag);
          validKeys.push(defNorm);
        }
      }
    } else {
      // Original logic for multi-column format (EN, SC, TC)
      const en = parts[0]?.trim(); // 原始标签 (English)
      const sc = parts[1]?.trim(); // 名称 (Simplified Chinese)
      const tc = parts[2]?.trim(); // 台灣翻譯 (Traditional Chinese)
      
      // Target Value based on selection
      let targetValue = '';
      if (targetLang === 'en') targetValue = en;
      else if (targetLang === 'sc') targetValue = sc;
      else if (targetLang === 'tc') targetValue = tc;

      if (targetValue) {
          // Map ALL sources to the target value
          if (en) {
              const norm = en.toLowerCase();
              lookupMap.set(norm, targetValue);
              validKeys.push(norm);
          }
          if (sc) {
              lookupMap.set(sc, targetValue);
              validKeys.push(sc);
          }
          if (tc) {
              lookupMap.set(tc, targetValue);
              validKeys.push(tc);
          }
      }
    }
  });

  return (tagName: string): string | null => {
    if (!tagName) return null;
    const normalizedInput = tagName.toLowerCase().trim();
    
    // 1. Try Exact Match
    if (lookupMap.has(normalizedInput)) {
        return lookupMap.get(normalizedInput)!;
    }

    // 2. Fuzzy Match (Levenshtein Distance)
    // Allow a distance of up to 3 edits, but stricter for short words
    let bestMatch: string | null = null;
    let minDistance = Infinity;
    
    // Heuristic: If word is short (< 4 chars), max distance is 0 (must match exactly)
    // If word is medium (4-7), max distance 1 or 2
    // If word is long (> 7), max distance 3
    const maxDistance = normalizedInput.length < 4 ? 0 : normalizedInput.length < 8 ? 2 : 3;

    for (const key of validKeys) {
        // Optimization: Skip if length difference is already greater than maxDistance
        if (Math.abs(key.length - normalizedInput.length) > maxDistance) continue;

        const dist = levenshteinDistance(normalizedInput, key);
        
        if (dist <= maxDistance && dist < minDistance) {
            minDistance = dist;
            bestMatch = key;
        }
    }

    if (bestMatch) {
        // console.log(`Fuzzy match found: '${tagName}' -> '${bestMatch}' (dist: ${minDistance})`);
        return lookupMap.get(bestMatch)!;
    }
    
    // 3. No match found -> Return null (Strict Mode: Filter out)
    // console.warn(`Tag rejected (not in library): ${tagName}`);
    return null;
  };
};

/**
 * Process a list of tags and ensure they are converted to the target language.
 * Filters out any tags that do not exist in the library (Strict Mode).
 */
export const normalizeTags = (
    tags: GeneratedTag[], 
    targetLang: 'sc' | 'tc' | 'en' = 'sc'
): GeneratedTag[] => {
    const lookup = createTagLookup(targetLang);
    
    const normalized = tags.map(tag => {
        const match = lookup(tag.name);
        if (match) {
            return { ...tag, name: match };
        }
        return null;
    }).filter(tag => tag !== null) as GeneratedTag[];

    // Remove duplicates that might occur after normalization
    const seen = new Set();
    return normalized.filter(tag => {
        const duplicate = seen.has(tag.name);
        seen.add(tag.name);
        return !duplicate;
    });
};
