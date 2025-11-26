import { useMemo } from 'react';

export const useTagData = (csvContent: string | null) => {
  return useMemo(() => {
    if (!csvContent) {
        return { tagLibrary: '', tagMap: new Map<string, string>() };
    }
    const lines = csvContent.split('\n');
    const relevantLines: string[] = [];
    const map = new Map<string, string>();

    const enIndex = 0;
    const scIndex = 1;
    const tcIndex = 2;
    const descriptionIndex = 4;

    // Detect format from first data line
    const firstDataLine = lines.slice(1).find(line => line.trim().length > 0 && !line.trim().startsWith(',=='));
    const isSimpleFormat = firstDataLine && firstDataLine.split(',').length === 2;

    for (const line of lines.slice(1)) {
        try {
            const trimmed = line.trim();
            if (trimmed.length > 0 && !trimmed.startsWith(',==')) {
                const values = trimmed.split(',');

                // Handle simple 2-column format (標籤,標籤定義)
                if (isSimpleFormat && values.length >= 2) {
                    const tag = values[0]?.trim();
                    const description = values[1]?.trim();
                    
                    if (tag) {
                        relevantLines.push(trimmed);
                        // Map tag to its description
                        if (description) {
                            map.set(tag, description);
                        }
                    }
                } else if (values.length > descriptionIndex) {
                    // Original logic for multi-column format
                    relevantLines.push(trimmed);

                    const enName = values[enIndex]?.trim();
                    const scName = values[scIndex]?.trim();
                    const tcName = values[tcIndex]?.trim();
                    const description = values[descriptionIndex]?.trim();
                    
                    // Store descriptions keyed by ALL language variants
                    if (description) {
                        if (enName) map.set(enName, description);
                        if (scName) map.set(scName, description);
                        if (tcName) map.set(tcName, description);
                    }
                }
            }
        } catch (e) {
            console.warn(`Skipping malformed CSV line`, e);
        }
    }

    // Determine header based on format
    const header = isSimpleFormat ? '標籤,標籤定義' : '原始标签,名称,台灣翻譯,備註,描述';
    const library = `${header}\n${relevantLines.join('\n')}`;
    return { 
        tagLibrary: library, 
        tagMap: map
    };
  }, [csvContent]);
};
