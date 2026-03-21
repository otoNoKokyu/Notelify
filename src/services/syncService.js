import { db } from './db';
import { getUserId } from './authService';

// Uses same-origin (Vite proxy during dev, or set VITE_API_URL for production)
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const syncService = {
    isSyncing: false,

    async processQueue() {
        if (!navigator.onLine) return;

        const queue = await db.syncQueue.orderBy('timestamp').toArray();
        for (const item of queue) {
            try {
                const note = await db.notes.get(item.noteId);
                if (!note && item.action !== 'delete') {
                    await db.syncQueue.delete(item.id);
                    continue;
                }

                let response;
                if (item.action === 'create') {
                    response = await fetch(`${API_URL}/notes`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'ngrok-skip-browser-warning': 'true',
                            'x-user-id': getUserId()
                        },
                        body: JSON.stringify({ id: note.id, content: note.content, inputMethod: note.inputMethod })
                    });
                } else if (item.action === 'update') {
                    response = await fetch(`${API_URL}/notes/${item.noteId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'ngrok-skip-browser-warning': 'true',
                            'x-user-id': getUserId()
                        },
                        body: JSON.stringify({ content: note.content, inputMethod: note.inputMethod })
                    });
                } else if (item.action === 'delete') {
                    response = await fetch(`${API_URL}/notes/${item.noteId}`, {
                        method: 'DELETE',
                        headers: {
                            'ngrok-skip-browser-warning': 'true',
                            'x-user-id': getUserId()
                        }
                    });
                }

                if (response && (response.ok || (response.status === 404 && item.action === 'delete'))) {
                    if (item.action !== 'delete') {
                        await db.notes.update(item.noteId, { syncStatus: 'synced' });
                    }
                    await db.syncQueue.delete(item.id);
                } else if (response && response.status === 404 && item.action === 'update') {
                    // If we try to update a note that doesn't exist on server, 
                    // it might have been deleted elsewhere. Stop retrying.
                    await db.syncQueue.delete(item.id);
                }
            } catch (error) {
                console.error('Sync failed for item', item, error);
            }
        }
    },

    async queueAction(noteId, action) {
        await db.syncQueue.add({
            noteId,
            action,
            timestamp: Date.now()
        });
        if (navigator.onLine) {
            this.runSync();
        }
    },

    async pullUpdates() {
        if (!navigator.onLine) return;
        try {
            const response = await fetch(`${API_URL}/notes?limit=100`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'x-user-id': getUserId()
                }
            });
            if (response.ok) {
                const data = await response.json();
                const notesArray = Array.isArray(data) ? data : (data.data || []);

                // 1. Get all local IDs to check for deletions
                const localNotes = await db.notes.toArray();
                const serverIds = new Set(notesArray.map(n => n.id));

                // 2. Remove local notes that are no longer on the server (and are not pending creation)
                for (const localNote of localNotes) {
                    if (!serverIds.has(localNote.id) && localNote.syncStatus === 'synced') {
                        console.log(`Removing locally deleted note: ${localNote.id}`);
                        await db.notes.delete(localNote.id);
                    }
                }

                // 3. Update or Add notes from server
                for (const serverNote of notesArray) {
                    const localNote = await db.notes.get(serverNote.id);

                    // Conflict Resolution: Check if this note has unsynced local changes
                    const isInQueue = await db.syncQueue.where('noteId').equals(serverNote.id).count() > 0;

                    // If note doesn't exist locally OR (server version is newer than local synced version AND not currently being edited locally)
                    if (!localNote || (localNote.syncStatus === 'synced' && !isInQueue && new Date(serverNote.updatedAt) > new Date(localNote.updatedAt))) {
                        await db.notes.put({ ...serverNote, syncStatus: 'synced' });
                    }
                }
            }
        } catch (err) {
            console.error('Pull updates failed', err);
        }
    },

    isSyncRequested: false,

    async runSync() {
        if (this.isSyncing) {
            this.isSyncRequested = true;
            return;
        }
        this.isSyncing = true;
        this.isSyncRequested = false;
        try {
            await this.processQueue();
            await this.pullUpdates();
        } finally {
            this.isSyncing = false;
            if (this.isSyncRequested) {
                this.runSync();
            }
        }
    }

};

// Initial sync on load
syncService.runSync();

setInterval(() => {
    syncService.runSync();
}, 30000);

window.addEventListener('online', () => {
    syncService.runSync();
});
