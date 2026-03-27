import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import './AllNotesPage.css';

export default function AllNotesPage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const notesData = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray());
    const notes = notesData || [];
    const loading = notesData === undefined;

    // Filter by search query based on title, content, summary
    const filteredNotes = notes.filter(n => {
        const query = searchQuery.toLowerCase();
        return (
            (n.title && n.title.toLowerCase().includes(query)) ||
            (n.content && n.content.toLowerCase().includes(query)) ||
            (n.summary && n.summary.toLowerCase().includes(query)) ||
            (n.topic && n.topic.toLowerCase().includes(query))
        );
    });

    const formatFeedDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) return 'TODAY';
        if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY';

        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    };

    // Very basic list vs prose detection
    const isListNote = (text) => {
        if (!text) return false;
        const lines = text.split('\n');
        let listItemsCount = 0;
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./)) {
                listItemsCount++;
            }
        }
        // If more than 30% of non-empty lines are list items, treat as list
        const nonEmptyLines = lines.filter(l => l.trim().length > 0).length;
        if (nonEmptyLines === 0) return false;
        return (listItemsCount / nonEmptyLines) > 0.3;
    };

    const renderCardContent = (note) => {
        const textToRender = note.summary || note.content || '';
        if (!textToRender) return null;

        const isList = isListNote(textToRender);

        if (isList) {
            // Extract some text pieces to render as bullets
            const items = textToRender.split('\n')
                .map(l => l.trim().replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, ''))
                .filter(l => l.length > 0)
                .slice(0, 3); // Max 3 items shown

            return (
                <ul className="list-content">
                    {items.map((item, idx) => (
                        <li key={idx} className="list-item">{item}</li>
                    ))}
                    {textToRender.split('\n').filter(l => l.trim().length > 0).length > 3 && (
                        <li className="list-item" style={{ opacity: 0.5 }}>...</li>
                    )}
                </ul>
            );
        }

        return (
            <p className="prose-text">
                {textToRender.substring(0, 200)}{textToRender.length > 200 ? '...' : ''}
            </p>
        );
    };

    return (
        <div className="all-notes-page fade-in page-container">
            {/* Header (Time/Status simulated to match the screenshot if desired, but typically we let OS handle it. We will just add the Search bar) */}
            <div className="search-bar-container">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Retrieve a thought..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', marginTop: '20px', color: '#888' }}>Loading notes...</div>
            ) : (
                <div className="notes-masonry">
                    {filteredNotes.map(note => (
                        <div key={note.id} className="masonry-item" onClick={() => navigate(`/note/${note.id}`)}>
                            <div className="feed-note-card">
                                <div className="feed-card-header">
                                    <h3 className="feed-card-title">{note.title || 'Untitled'}</h3>
                                    <span className="feed-card-date">{note.topic === 'Daily' ? 'DAILY' : formatFeedDate(note.createdAt)}</span>
                                </div>
                                <div className="feed-card-content">
                                    {renderCardContent(note)}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredNotes.length === 0 && !loading && (
                        <div style={{ padding: '20px', color: '#999' }}>No thoughts found.</div>
                    )}
                </div>
            )}

            {/* Floating Action Bar */}
            <div className="floating-action-bar">
                <button className="fab-btn" aria-label="Pin">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                    </svg>
                </button>
                <button className="fab-btn" aria-label="Filter">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                </button>
                <button className="fab-btn" aria-label="More">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                </button>
            </div>
        </div>
    );
}
