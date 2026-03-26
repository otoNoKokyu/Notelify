import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId } from '../services/authService';
import { formatFriendlyDate } from '../utils/dateUtils';
import { db } from '../services/db';
import './TimelinePage.css';

export default function TimelinePage() {
    const navigate = useNavigate();
    const [timelineNotes, setTimelineNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Versions modal state
    const [versionsModaledId, setVersionsModaledId] = useState(null);
    const [versions, setVersions] = useState([]);
    const [loadingVersions, setLoadingVersions] = useState(false);
    const [selectedVersionId, setSelectedVersionId] = useState(null);
    const [isRollingBack, setIsRollingBack] = useState(false);

    // Connections modal state
    const [activeConnectionsNote, setActiveConnectionsNote] = useState(null);

    const fetchTimeline = async () => {
        setLoading(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${API_URL}/notes/timeline`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'x-user-id': getUserId()
                }
            });
            if (response.ok) {
                const data = await response.json();
                setTimelineNotes(data);
            }
        } catch (err) {
            console.error('Failed to fetch timeline', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimeline();
    }, []);

    const openVersions = async (e, id) => {
        e.stopPropagation();
        setVersionsModaledId(id);
        setLoadingVersions(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${API_URL}/notes/${id}/versions`, {
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'x-user-id': getUserId()
                }
            });
            if (response.ok) {
                const data = await response.json();
                setVersions(data);
                if (data.length > 0) {
                    setSelectedVersionId(data[data.length - 1].id); // default to immediate previous version
                }
            }
        } catch (err) {
            console.error('Failed to fetch versions', err);
        } finally {
            setLoadingVersions(false);
        }
    };

    const openConnections = (e, note) => {
        e.stopPropagation();
        setActiveConnectionsNote(note);
    };

    const handleRollback = async () => {
        if (!selectedVersionId || isRollingBack) return;
        setIsRollingBack(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${API_URL}/notes/${versionsModaledId}/rollback/${selectedVersionId}`, {
                method: 'POST',
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'x-user-id': getUserId()
                }
            });
            if (response.ok) {
                const updatedNote = await response.json();
                await db.notes.put(updatedNote);
                setVersionsModaledId(null);
                fetchTimeline(); // refresh timeline list
            } else {
                alert('Rollback failed. Please try again.');
            }
        } catch (err) {
            console.error('Rollback error', err);
            alert('Rollback failed.');
        } finally {
            setIsRollingBack(false);
        }
    };

    return (
        <div className="timeline-page fade-in page-container">
            <div className="timeline-header">
                <h1 className="timeline-greeting">
                    {new Date().getHours() < 12 ? 'Good morning.' : new Date().getHours() < 18 ? 'Good afternoon.' : 'Good evening.'}
                </h1>
                <p className="timeline-summary">You have <strong>{timelineNotes.length}</strong> notes in your recent timeline.</p>
            </div>

            {loading ? (
                <div className="timeline-loading">Loading your timeline...</div>
            ) : (
                <div className="timeline-container">
                    {timelineNotes.length === 0 && <p className="timeline-empty">Your timeline is empty.</p>}

                    {/* Simplified grouping logic purely visual for now based on createdAt */}
                    {timelineNotes.map((note, index) => {
                        const noteDateStr = new Date(note.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                        const prevNoteDateStr = index > 0 ? new Date(timelineNotes[index - 1].createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;
                        const showDateHeader = noteDateStr !== prevNoteDateStr;
                        const readingTime = Math.max(1, Math.ceil((note.content || '').length / 200));

                        return (
                            <React.Fragment key={note.id}>
                                {showDateHeader && (
                                    <div className="timeline-date-header">
                                        <div className="date-marker"></div>
                                        <span className="date-text">{noteDateStr.toUpperCase()}</span>
                                    </div>
                                )}
                                <div className="timeline-item" onClick={() => navigate(`/note/${note.id}`)}>
                                    <div className="timeline-marker">
                                        <div className="timeline-dot"></div>
                                        <div className="horizontal-connector"></div>
                                    </div>
                                    <div className="timeline-content">
                                        <div className="timeline-item-header">
                                            <h3 className="timeline-note-title">{note.title || 'Untitled Thought'}</h3>
                                            {!note.isProcessed && (
                                                <div className="processing-indicator">
                                                    <div className="dot-pulse"></div>
                                                    <span>AI is thinking...</span>
                                                </div>
                                            )}
                                            <button className="timeline-item-more" onClick={(e) => { e.stopPropagation(); }}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                            </button>
                                        </div>

                                        <div className="timeline-inline-meta">
                                            <span className="inline-meta-item">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                {formatFriendlyDate(note.createdAt)}
                                            </span>
                                            <span className="inline-meta-item">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
                                                {readingTime} MIN
                                            </span>
                                        </div>
                                        <p className="timeline-note-preview">
                                            {note.summary || (note.content || '').substring(0, 160) + (note.content?.length > 160 ? '...' : '')}
                                        </p>

                                        <div className="timeline-item-tags">
                                            {(note.tags && note.tags.length > 0) ? (
                                                note.tags.map(tag => (
                                                    <span key={tag} className="timeline-tag">{tag}</span>
                                                ))
                                            ) : (
                                                <span className="timeline-tag">General</span>
                                            )}
                                        </div>

                                        {(note.versionCount > 0 || (note.linkedNoteIds && note.linkedNoteIds.length > 0)) && (
                                            <div className="timeline-item-actions">
                                                {note.versionCount > 0 && (
                                                    <button className="action-badge evolution-badge" onClick={(e) => openVersions(e, note.id)}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="23 4 23 10 17 10"></polyline>
                                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                                        </svg>
                                                        <span>{note.versionCount} {note.versionCount === 1 ? 'Evolution' : 'Evolutions'}</span>
                                                    </button>
                                                )}
                                                {note.linkedNoteIds && note.linkedNoteIds.length > 0 && (
                                                    <button className="action-badge connection-badge" onClick={(e) => openConnections(e, note)}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                                        </svg>
                                                        <span>{note.linkedNoteIds.length} {note.linkedNoteIds.length === 1 ? 'Connection' : 'Connections'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}

                    {timelineNotes.length > 0 && (
                        <div className="timeline-footer-finis">
                            <div className="finis-line"></div>
                            <span className="finis-text">FINIS</span>
                        </div>
                    )}
                </div>
            )
            }

            {/* Versions Modal */}
            {
                versionsModaledId && (
                    <div className="versions-modal-backdrop fade-in" onClick={() => setVersionsModaledId(null)}>
                        <div className="versions-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Idea Evolution</h2>
                                <button className="close-btn" onClick={() => setVersionsModaledId(null)}>&times;</button>
                            </div>
                            <div className="modal-content">
                                {loadingVersions ? (
                                    <p>Loading versions...</p>
                                ) : (
                                    <div className="side-by-side-view">
                                        <div className="version-col">
                                            <div className="version-header-row">
                                                <h3>Previous Versions</h3>
                                                {versions.length > 1 && (
                                                    <select
                                                        className="version-select"
                                                        value={selectedVersionId}
                                                        onChange={e => setSelectedVersionId(e.target.value)}
                                                    >
                                                        {versions.map((v, idx) => (
                                                            <option key={v.id} value={v.id}>
                                                                Version {idx + 1} ({new Date(v.createdAt).toLocaleDateString()})
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>

                                            {selectedVersionId && versions.find(v => v.id === selectedVersionId) && (
                                                <>
                                                    <div className="version-meta-row">
                                                        <span className="version-date">
                                                            {new Date(versions.find(v => v.id === selectedVersionId).createdAt).toLocaleString()}
                                                        </span>
                                                        <button
                                                            className="rollback-btn fade-in"
                                                            onClick={handleRollback}
                                                            disabled={isRollingBack}
                                                        >
                                                            {isRollingBack ? 'Restoring...' : 'Restore this version'}
                                                        </button>
                                                    </div>
                                                    <div className="version-text original-text">
                                                        {versions.find(v => v.id === selectedVersionId).content}
                                                    </div>
                                                </>
                                            )}
                                            {versions.length === 0 && (
                                                <div className="version-text original-text">
                                                    No previous versions found.
                                                </div>
                                            )}
                                        </div>
                                        <div className="version-col">
                                            <h3>Current Refined</h3>
                                            <span className="version-date">{new Date(timelineNotes.find(n => n.id === versionsModaledId)?.updatedAt || new Date()).toLocaleString()}</span>
                                            <div className="version-text current-text">
                                                {timelineNotes.find(n => n.id === versionsModaledId)?.content}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Connections Modal */}
            {
                activeConnectionsNote && (
                    <div className="versions-modal-backdrop fade-in" onClick={() => setActiveConnectionsNote(null)}>
                        <div className="versions-modal connections-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-header-title">
                                    <h2>Idea Connections</h2>
                                    <p className="modal-subtitle">Direct thematic links found by AI</p>
                                </div>
                                <button className="close-btn" onClick={() => setActiveConnectionsNote(null)}>&times;</button>
                            </div>
                            <div className="modal-content">
                                <div className="connected-notes-list">
                                    {activeConnectionsNote.linkedNoteIds.map(linkedId => {
                                        const linkedNote = timelineNotes.find(n => n.id === linkedId);
                                        if (!linkedNote) return null;
                                        return (
                                            <div
                                                key={linkedId}
                                                className="connected-note-card"
                                                onClick={() => navigate(`/note/${linkedId}`)}
                                            >
                                                <div className="card-header">
                                                    <span className="card-topic">{linkedNote.topic || 'General'}</span>
                                                    <span className="card-date">{new Date(linkedNote.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <h3>{linkedNote.title || 'Untitled Thought'}</h3>
                                                <p>{linkedNote.summary || (linkedNote.content || '').substring(0, 120) + '...'}</p>
                                                <div className="card-footer">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                                                    <span>View Note</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
