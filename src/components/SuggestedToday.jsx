import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { syncService } from '../services/syncService';
import './SuggestedToday.css';
export default function SuggestedToday() {
    const navigate = useNavigate();

    // Use Dexie hooks to live-query the most recent 3 notes that have AI titles/insights
    // For UI mockup purposes, we'll gracefully fallback if empty
    const suggestedNotes = useLiveQuery(
        () => db.notes
            .orderBy('updatedAt')
            .reverse()
            .limit(3)
            .toArray()
    );

    if (!suggestedNotes) return null; // loading

    const handleClick = (id) => {
        navigate(`/note/${id}`);
    };

    const getIcon = (title) => {
        // Simple heuristic for icons, in real app AI would add an icon to insights
        const t = (title || '').toLowerCase();
        if (t.includes('meet') || t.includes('client')) return 'users';
        if (t.includes('grocer') || t.includes('list')) return 'list';
        if (t.includes('journal') || t.includes('reflect')) return 'clock';
        return 'file';
    };

    const renderIcon = (type) => {
        switch (type) {
            case 'users':
                return <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>; // simplified
            case 'list':
                return <g><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></g>;
            case 'clock':
                return <g><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></g>;
            default:
                return <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>;
        }
    };

    if (suggestedNotes.length === 0) {
        return (
            <div className="suggested-empty">
                <p>Your suggestions will appear here soon.</p>
            </div>
        );
    }

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this thought?")) {
            await db.notes.delete(id);
            await syncService.queueAction(id, 'delete');
        }
    };

    return (
        <div className="suggested-list">
            {suggestedNotes.map((note, idx) => {
                const title = note.title || 'Untitled Thought';
                // Extract plain text snippet if no summary
                const subtitle = note.summary || (note.content ? note.content.substring(0, 60) + '...' : '');
                const timeFormatted = new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                    <div key={note.id} className="suggested-card" onClick={() => handleClick(note.id)}>
                        <div className={`card-accent accent-${idx % 3}`}></div>

                        <div className="card-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {renderIcon(getIcon(title))}
                            </svg>
                        </div>

                        <div className="card-content">
                            <h3 className="card-title">{title}</h3>
                            <p className="card-subtitle">{subtitle}</p>

                            {(note.tags?.length > 0 || note.insights?.todos?.length > 0) && (
                                <div className="card-badges">
                                    {note.insights?.todos && note.insights.todos.length > 0 && (
                                        <span className="badge insight-badge">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                                            {note.insights.todos.length} Next Steps{note.insights.todos.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {note.tags && note.tags.slice(0, 3).map((tag, i) => (
                                        <span key={i} className="badge tag-badge">#{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="card-meta">
                            <span className="card-time">{timeFormatted}</span>
                            <button className="card-delete-btn" onClick={(e) => handleDelete(e, note.id)} title="Delete thought">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
