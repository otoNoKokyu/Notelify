import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/db';
import { syncService } from '../services/syncService';
import { speechService } from '../services/speechService';
import { getUserId } from '../services/authService';
import SuggestedToday from '../components/SuggestedToday';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import './HomePage.css';

export default function HomePage() {
    const isOnline = useOnlineStatus();
    const [content, setContent] = useState('');
    const [partialText, setPartialText] = useState('');
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [isRecording, setIsRecording] = useState(false);

    // Echoes state
    const [echoes, setEchoes] = useState([]);
    const [isEchoesDismissed, setIsEchoesDismissed] = useState(false);
    const echoTimeoutRef = useRef(null);

    // Get current note sync status
    const activeNote = useLiveQuery(
        () => activeNoteId ? db.notes.get(activeNoteId) : null,
        [activeNoteId]
    );

    // Recall state
    const [recallNote, setRecallNote] = useState(null);
    const [isRecallDismissed, setIsRecallDismissed] = useState(false);

    const textareaRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    // Refs to avoid stale closures in speech callbacks
    const activeNoteIdRef = useRef(null);
    const debouncedSaveRef = useRef(null);
    const contentRef = useRef('');

    // Keep contentRef in sync
    useEffect(() => { contentRef.current = content; }, [content]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content, partialText]);

    // Keep ref in sync so debouncedSave always sees latest noteId
    useEffect(() => { activeNoteIdRef.current = activeNoteId; }, [activeNoteId]);

    // Debounced auto-save — uses ref to avoid stale activeNoteId
    const debouncedSave = useCallback((text) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            if (!text.trim()) return;

            let currentId = activeNoteIdRef.current;
            const isNew = !currentId;

            if (isNew) {
                currentId = uuidv4();
                setActiveNoteId(currentId);
                activeNoteIdRef.current = currentId;
                await db.notes.add({
                    id: currentId,
                    title: '',
                    content: text,
                    summary: '',
                    tags: [],
                    insights: null,
                    isProcessed: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    syncStatus: 'pending'
                });
                await syncService.queueAction(currentId, 'create');
            } else {
                await db.notes.update(currentId, {
                    content: text,
                    updatedAt: new Date().toISOString(),
                    isProcessed: false,
                    syncStatus: 'pending'
                });
                await syncService.queueAction(currentId, 'update');
            }
        }, 1000);
    }, []);

    // Keep debouncedSaveRef in sync
    useEffect(() => { debouncedSaveRef.current = debouncedSave; }, [debouncedSave]);

    const handleChange = (e) => {
        const val = e.target.value;
        setContent(val);
        debouncedSave(val);
    };

    const handleMicToggle = (e) => {
        e.preventDefault();
        if (isRecording) {
            speechService.stopTranscription();
            // Commit any remaining partial text as final
            if (partialText) {
                setContent(prev => {
                    const newText = prev + partialText;
                    if (debouncedSaveRef.current) debouncedSaveRef.current(newText);
                    return newText;
                });
                setPartialText('');
            }
            setIsRecording(false);
        } else {
            setIsRecording(true);
            speechService.startTranscription(
                // onPartial — show words in real-time as the user speaks
                (partialTxt) => {
                    setPartialText(
                        (contentRef.current.endsWith(' ') || contentRef.current.length === 0 ? '' : ' ')
                        + partialTxt
                    );
                },
                // onFinal — commit the transcript to the note content
                (finalTxt) => {
                    setPartialText(''); // Clear partial preview
                    setContent(prev => {
                        const newText = prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + finalTxt;
                        if (debouncedSaveRef.current) debouncedSaveRef.current(newText);
                        return newText;
                    });
                },
                // onError
                (err) => {
                    console.error('Speech error:', err);
                    setPartialText('');
                    setIsRecording(false);
                },
                // onComplete
                () => {
                    setPartialText('');
                    setIsRecording(false);
                }
            );
        }
    };


    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (echoTimeoutRef.current) clearTimeout(echoTimeoutRef.current);
        };
    }, []);

    // Echoes Effect - runs on 5 seconds pause
    useEffect(() => {
        if (isEchoesDismissed) return;

        const text = content;
        if (text.trim().length < 20 || isRecording) {
            setEchoes([]);
            return;
        }

        if (echoTimeoutRef.current) clearTimeout(echoTimeoutRef.current);

        echoTimeoutRef.current = setTimeout(async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || '/api';
                const response = await fetch(`${API_URL}/search/echoes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'ngrok-skip-browser-warning': 'true',
                        'x-user-id': getUserId()
                    },
                    body: JSON.stringify({
                        text: text.trim(),
                        excludeId: activeNoteIdRef.current
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    setEchoes(data.echoes || []);
                }
            } catch (err) {
                console.error('Failed to fetch echoes', err);
            }
        }, 5000);

        return () => {
            if (echoTimeoutRef.current) clearTimeout(echoTimeoutRef.current);
        };
    }, [content, isRecording, isEchoesDismissed, isOnline]);

    // Daily Recall Effect
    useEffect(() => {
        const fetchRecallNote = async () => {
            const todayStr = new Date().toDateString();

            const fetchedToday = localStorage.getItem('recallFetchedDate');
            if (fetchedToday === todayStr) {
                const storedRecallStr = localStorage.getItem('recallNoteData');
                if (storedRecallStr && localStorage.getItem('recallDismissedDate') !== todayStr) {
                    setRecallNote(JSON.parse(storedRecallStr));
                }
                return;
            }

            try {
                const API_URL = import.meta.env.VITE_API_URL || '/api';
                const response = await fetch(`${API_URL}/notes/recall`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                        'x-user-id': getUserId()
                    }
                });
                if (response.ok) {
                    const text = await response.text();
                    if (text && text.trim() !== '') {
                        const data = JSON.parse(text);
                        setRecallNote(data);
                        localStorage.setItem('recallFetchedDate', todayStr);
                        localStorage.setItem('recallNoteData', JSON.stringify(data));
                    } else {
                        localStorage.setItem('recallFetchedDate', todayStr);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch recall note', err);
            }
        };

        fetchRecallNote();
    }, []);

    const handleDismissRecall = () => {
        setIsRecallDismissed(true);
        localStorage.setItem('recallDismissedDate', new Date().toDateString());
    };

    // The displayed text includes both committed content and live partial transcript
    const displayText = content + partialText;

    return (
        <div className="home-container fade-in page-container">
            <div className="capture-header">
                <h1 className="capture-title">Reflect.</h1>
            </div>

            <div className="capture-area">
                <textarea
                    ref={textareaRef}
                    className={`capture-input ${isRecording ? 'recording-active' : ''}`}
                    placeholder="Start your thought..."
                    value={displayText}
                    onChange={handleChange}
                    autoFocus
                    readOnly={isRecording}
                />
                {isRecording && partialText && (
                    <div className="partial-indicator">Listening...</div>
                )}
                {activeNote?.syncStatus === 'pending' && isOnline && (
                    <div className="sync-indicator">
                        <div className="sync-spinner"></div>
                        Ensuring your thoughts are safe...
                    </div>
                )}
            </div>

            <div className="capture-actions">
                <button
                    className={`action-btn mic-btn ${isRecording ? 'recording' : ''}`}
                    onClick={handleMicToggle}
                    title={isRecording ? "Stop Recording" : "Voice Capture"}
                >
                    {isRecording ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" x2="12" y1="19" y2="22"></line>
                        </svg>
                    )}
                </button>
            </div>

            <div className="suggested-section">
                <hr className="suggested-divider" />
                <h2 className="suggested-heading">SUGGESTED TODAY</h2>

                {recallNote && !isRecallDismissed && (
                    <div className="recall-card fade-in" onClick={() => navigate(`/note/${recallNote.id}`)}>
                        <div className="recall-header">
                            <span className="recall-label">From the past</span>
                            <button className="recall-dismiss-btn" onClick={(e) => { e.stopPropagation(); handleDismissRecall(); }}>&times;</button>
                        </div>
                        <h3 className="recall-title">{recallNote.title || 'Untitled Thought'}</h3>
                        <p className="recall-preview">{recallNote.summary || (recallNote.content || '').substring(0, 100) + '...'}</p>
                        <span className="recall-date">{new Date(recallNote.createdAt).toLocaleDateString()}</span>
                    </div>
                )}

                <SuggestedToday />
            </div>

            {isOnline && echoes.length > 0 && !isEchoesDismissed && (
                <div className="echoes-container fade-in">
                    <div className="echoes-header">
                        <span className="echoes-label">Echoes from the past</span>
                        <button className="echoes-dismiss-btn" onClick={() => setIsEchoesDismissed(true)}>
                            &times;
                        </button>
                    </div>
                    <div className="echoes-list">
                        {echoes.map(echo => (
                            <div key={echo.id} className="echo-card">
                                <p className="echo-preview">{echo.contentPreview}</p>
                                <span className="echo-date">{new Date(echo.createdAt).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}










