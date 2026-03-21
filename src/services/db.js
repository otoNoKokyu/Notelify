import Dexie from 'dexie';

export const db = new Dexie('ReflectNotes');

db.version(1).stores({
    notes: 'id, title, content, summary, tags, insights, isProcessed, createdAt, updatedAt, syncStatus',
    syncQueue: '++id, noteId, action, timestamp'
});

db.version(3).stores({
    notes: 'id, title, content, summary, tags, insights, isProcessed, timeOfDayBucket, topic, wordCount, charLength, inputMethod, lastRecalledAt, rawContent, isSynthesis, clusterIds, createdAt, updatedAt, syncStatus'
});
