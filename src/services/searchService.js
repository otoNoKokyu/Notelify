import { db } from './db';
import { getUserId } from './authService';

// Uses same-origin (Vite proxy during dev, or set VITE_API_URL for production)
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const searchService = {
    async search(query) {
        if (!query || query.trim() === '') return [];

        let results = [];

        // 1. Local offline exact search
        const lowerQuery = query.toLowerCase();
        const localNotes = await db.notes.toArray();
        const localMatches = localNotes.filter(note =>
            (note.title && note.title.toLowerCase().includes(lowerQuery)) ||
            (note.content && note.content.toLowerCase().includes(lowerQuery))
        ).map(note => ({ note, similarityScore: 1.0, source: 'local' }));

        results = [...localMatches];

        // 2. Online Semantic Search fallback
        if (navigator.onLine) {
            try {
                const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&limit=10`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                        'x-user-id': getUserId()
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.results) {
                        const semanticResults = data.results.map(r => ({ ...r, source: 'semantic' }));

                        // Merge avoiding duplicates (prefer semantic if score > 0, else keep local)
                        const existingIds = new Set(results.map(r => r.note.id));
                        for (const sr of semanticResults) {
                            if (!existingIds.has(sr.note.id)) {
                                results.push(sr);
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn("Semantic search failed, falling back to local only", error);
            }
        }

        return results;
    }
};
