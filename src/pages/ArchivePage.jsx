import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { searchService } from '../services/searchService';
import NoteCard from '../components/NoteCard';
import ShareModal from '../components/ShareModal';
import './ArchivePage.css';

export default function ArchivePage() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [searchedNotes, setSearchedNotes] = useState(null);
    const [sharingNote, setSharingNote] = useState(null);

    const allNotes = useLiveQuery(
        () => db.notes.orderBy('updatedAt').reverse().toArray(),
        []
    );

    useEffect(() => {
        if (!query) {
            setSearchedNotes(null);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            const results = await searchService.search(query);
            setSearchedNotes(results.map(r => r.note));
        }, 400);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const displayNotes = query ? searchedNotes : allNotes;

    return (
        <div className="archive-container fade-in page-container">
            <div className="search-header">
                <div className="search-bar">
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Retrieve a thought..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="masonry-grid">
                {displayNotes && displayNotes.length > 0 ? (
                    displayNotes.map(note => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            onClick={() => navigate(`/note/${note.id}`)}
                            onShare={(n) => setSharingNote(n)}
                        />
                    ))
                ) : (
                    <div className="archive-empty">
                        {query ? 'No matching thoughts found.' : 'You have no captured thoughts yet.'}
                    </div>
                )}
            </div>

            {sharingNote && (
                <ShareModal
                    note={sharingNote}
                    onClose={() => setSharingNote(null)}
                />
            )}
        </div>
    );
}
