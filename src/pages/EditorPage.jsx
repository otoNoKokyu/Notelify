import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { db } from '../services/db';
import { syncService } from '../services/syncService';
import FloatingToolbar from '../components/FloatingToolbar';
import { detectLayout } from '../utils/layoutDetection';
import './EditorPage.css';

export default function EditorPage() {
    const isOnline = useOnlineStatus();
    const { id } = useParams();
    const navigate = useNavigate();
    const [note, setNote] = useState(null);
    const titleRef = useRef(null);
    const contentRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const [isNavVisible, setIsNavVisible] = useState(true);
    const [layoutType, setLayoutType] = useState('prose');
    const scrollTimeoutRef = useRef(null);

    // Ghost Compiler state
    const [isRefining, setIsRefining] = useState(false);
    const [showRaw, setShowRaw] = useState(false);

    // Accordion state
    const [expandedSections, setExpandedSections] = useState({
        todos: false,
        recommendations: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Load Note
    useEffect(() => {
        db.notes.get(id).then(item => {
            if (item) {
                setNote(item);
                setLayoutType(detectLayout(item.content || ''));
            } else {
                navigate('/home'); // Handle not found
            }
        });
    }, [id, navigate]);

    // Handle Scroll to fade out nav
    useEffect(() => {
        const handleScroll = () => {
            setIsNavVisible(false);
            clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
                setIsNavVisible(true);
            }, 1000);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    const debouncedSave = useCallback((updatedNote) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            await db.notes.update(id, {
                ...updatedNote,
                updatedAt: new Date().toISOString(),
                isProcessed: false,
                syncStatus: 'pending'
            });
            await syncService.queueAction(id, 'update');
        }, 1000);
    }, [id]);

    // Use a ref to hold the latest note data for saving,
    // so we don't trigger React re-renders on every keystroke
    // (which would cause dangerouslySetInnerHTML to reset the cursor)
    const noteDataRef = useRef(null);

    // Sync noteDataRef when the note first loads
    useEffect(() => {
        if (note) noteDataRef.current = note;
    }, [note]);

    const handleTitleInput = () => {
        if (!titleRef.current || !noteDataRef.current) return;
        const newTitle = titleRef.current.innerText;
        noteDataRef.current = { ...noteDataRef.current, title: newTitle };
        debouncedSave(noteDataRef.current);
    };

    const handleContentInput = () => {
        if (!contentRef.current || !noteDataRef.current) return;
        const newContent = contentRef.current.innerHTML;
        noteDataRef.current = { ...noteDataRef.current, content: newContent };

        const newLayout = detectLayout(newContent);
        if (newLayout !== layoutType) {
            setLayoutType(newLayout);
        }

        debouncedSave(noteDataRef.current);
    };

    if (!note) return <div className="editor-container page-container">Loading...</div>;

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this thought?")) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            await db.notes.delete(id);
            await syncService.queueAction(id, 'delete');
            navigate('/home');
        }
    };

    const handleRefine = async () => {
        if (isRefining) return;
        setIsRefining(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            // We need userId headers which we can get from authService
            // For now let's construct it properly
            const { getUserId } = await import('../services/authService');

            const response = await fetch(`${API_URL}/notes/${id}/refine`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                    'x-user-id': getUserId()
                }
            });

            if (response.ok) {
                const updatedNote = await response.json();

                // Update local DB
                await db.notes.update(id, updatedNote);

                // Update component state
                setNote(updatedNote);
                noteDataRef.current = updatedNote;
                if (contentRef.current) {
                    contentRef.current.innerHTML = updatedNote.content;
                }
            } else {
                alert('Refinement failed. Please try again.');
            }
        } catch (err) {
            console.error('Refine error:', err);
            alert('Refinement failed.');
        } finally {
            setIsRefining(false);
        }
    };


    return (
        <div className="editor-container page-container">
            <nav className={`editor-nav ${isNavVisible ? 'visible' : 'hidden'}`}>
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <div className="editor-nav-right">
                    {note.rawContent && (
                        <button
                            className={`editor-toggle-raw ${showRaw ? 'active' : ''}`}
                            onClick={() => setShowRaw(!showRaw)}
                            title="Toggle Original Version"
                        >
                            {showRaw ? 'View Refined' : 'View Original'}
                        </button>
                    )}

                    {!showRaw && (
                        <>

                            <button
                                className={`editor-refine-btn ${isRefining ? 'spinning' : ''} ${!isOnline ? 'offline' : ''}`}
                                onClick={handleRefine}
                                title={!isOnline ? "Refinement requires internet" : "Refine Note"}
                                disabled={isRefining || !isOnline}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"></path>
                                    <path d="m14 7 3 3"></path>
                                    <path d="M5 6v4"></path>
                                    <path d="M19 14v4"></path>
                                    <path d="M10 2v2"></path>
                                    <path d="M7 8H3"></path>
                                    <path d="M21 16h-4"></path>
                                    <path d="M11 3H9"></path>
                                </svg>
                            </button>
                        </>
                    )}

                    <span className="editor-meta">
                        Last edited {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button className="editor-delete-btn" onClick={handleDelete} title="Delete thought">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </nav>

            <div className="editor-body fade-in">

                <h1
                    className="editor-title"
                    contentEditable
                    suppressContentEditableWarning
                    ref={titleRef}
                    onInput={handleTitleInput}
                    data-placeholder="Untitled"
                >
                    {note.title || ''}
                </h1>

                <hr className="editor-divider" />

                <div
                    className={`editor-content ${showRaw ? 'raw-mode' : ''} layout-${layoutType}`}
                    contentEditable={!showRaw}
                    suppressContentEditableWarning
                    ref={contentRef}
                    onInput={handleContentInput}
                    dangerouslySetInnerHTML={{ __html: showRaw ? (note.rawContent || note.content) : (note.content || '') }}
                />

                <div className="insights-container">

                    {note.insights?.todos?.length > 0 && (
                        <div className={`insight-accordion ${expandedSections.todos ? 'expanded' : ''}`}>
                            <button
                                className="accordion-header"
                                onClick={() => toggleSection('todos')}
                            >
                                <div className="header-left">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 11 12 14 22 4"></polyline>
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                    </svg>
                                    <h2>Next Steps</h2>
                                    <span className="count-badge">{note.insights.todos.length}</span>
                                </div>
                                <svg className="chevron-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                            <div className="accordion-content">
                                <ul className="insight-list">
                                    {note.insights.todos.map((todo, idx) => (
                                        <li key={idx} className="insight-item">
                                            <span className="bullet">•</span>
                                            <span>{todo}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {note.insights?.recommendations?.length > 0 && (
                        <div className={`insight-accordion ${expandedSections.recommendations ? 'expanded' : ''}`}>
                            <button
                                className="accordion-header"
                                onClick={() => toggleSection('recommendations')}
                            >
                                <div className="header-left">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="16" x2="12" y2="12"></line>
                                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                    </svg>
                                    <h2>Recommendations</h2>
                                    <span className="count-badge">{note.insights.recommendations.length}</span>
                                </div>
                                <svg className="chevron-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                            <div className="accordion-content">
                                <ul className="insight-list">
                                    {note.insights.recommendations.map((rec, idx) => (
                                        <li key={idx} className="insight-item">
                                            <span className="bullet">•</span>
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <FloatingToolbar />
        </div>
    );
}
