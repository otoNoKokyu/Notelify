/**
 * Detects whether the given text is intended to be a list or prose.
 * @param {string} text The content to analyze
 * @returns {'list' | 'prose'}
 */
export function detectLayout(text) {
    if (!text || text.trim() === '') return 'prose';

    // Remove HTML tags for accurate length and line counting
    const plainText = text.replace(/<[^>]*>?/gm, '\n').replace(/&nbsp;/g, ' ');

    // Split by newlines and filter out completely empty lines
    const lines = plainText
        .split(/\n/g)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    if (lines.length === 0) return 'prose';

    // 1. Explicit List Markers Heuristic
    // Look for common list prefixes: -, *, •, checking boxes, or numbered lists (e.g., "1. ")
    const listMarkerRegex = /^([-*•] |\[[ xX]\] |\d+\.\s+)/i;
    let explicitListLines = 0;

    for (const line of lines) {
        if (listMarkerRegex.test(line)) {
            explicitListLines++;
        }
    }

    // If more than 30% of non-empty lines start with a list marker, it's a list.
    const explicitRatio = explicitListLines / lines.length;
    if (lines.length >= 2 && explicitRatio >= 0.3) {
        return 'list';
    }

    // 2. Implicit Short-Line Structure Heuristic
    // If the user is typing many distinct, short lines separated by returns,
    // they are conceptually writing a list even without bullet points.
    if (lines.length >= 3) {
        let totalLength = 0;
        let veryShortLinesCount = 0;

        for (const line of lines) {
            totalLength += line.length;
            if (line.length < 50) {
                veryShortLinesCount++;
            }
        }

        const averageLength = totalLength / lines.length;
        const shortLineRatio = veryShortLinesCount / lines.length;

        // If the average line is short (< 60 chars) and most lines are very short (< 50 chars)
        if (averageLength < 60 && shortLineRatio > 0.6) {
            return 'list';
        }
    }

    // 3. Comma-Separated List Heuristic
    // If the text contains many comma-separated items but very few periods, it's likely an inline list.
    const commasCount = (plainText.match(/,/g) || []).length;
    const periodsCount = (plainText.match(/\./g) || []).length;

    if (commasCount >= 4 && periodsCount <= 1) {
        return 'list';
    }

    return 'prose';
}
