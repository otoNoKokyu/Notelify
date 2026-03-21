import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserId } from '../services/authService';
import './ChatPage.css';

export default function ChatPage() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || '/api';

    const scrollToBottom = (behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    // 1. Fetch History on Mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(`${API_URL}/chat`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                        'x-user-id': getUserId()
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setMessages(data);
                    // Scroll to bottom after history loads
                    setTimeout(() => scrollToBottom('auto'), 100);
                }
            } catch (error) {
                console.error('Failed to fetch chat history:', error);
            }
        };
        fetchHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userQuery = inputValue.trim();
        const placeholderId = `temp-${Date.now()}`;
        const tempUserMsg = { id: placeholderId, role: 'user', content: userQuery };

        setMessages(prev => [...prev, tempUserMsg]);
        setInputValue('');
        setIsLoading(true);

        // Read expiration from local storage
        const storedHours = localStorage.getItem('chatExpirationHours');
        const storedEnabled = localStorage.getItem('chatExpirationEnabled');
        const isEnabled = storedEnabled !== null ? JSON.parse(storedEnabled) : true;
        const currentExpHours = isEnabled ? (storedHours !== null ? JSON.parse(storedHours) : 168) : null;

        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                    'x-user-id': getUserId()
                },
                body: JSON.stringify({
                    query: userQuery,
                    expirationHours: currentExpHours
                })
            });

            if (response.ok) {
                // Re-fetch history to get real IDs and both messages
                const historyRes = await fetch(`${API_URL}/chat`, {
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                        'x-user-id': getUserId()
                    }
                });
                if (historyRes.ok) {
                    const historyData = await historyRes.json();
                    setMessages(historyData);
                }
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error while searching your knowledge base.'
                }]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Network error. Please try again later.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!id || id.startsWith('temp-')) return;

        try {
            const response = await fetch(`${API_URL}/chat/${id}`, {
                method: 'DELETE',
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'x-user-id': getUserId()
                }
            });

            if (response.ok) {
                setMessages(prev => prev.filter(m => m.id !== id));
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-page page-container fade-in">
            <div className="chat-header">
                <button className="chat-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <h1>Converse</h1>
                <div className="synced-badge">Notes Synced</div>
            </div>


            <div className="chat-messages">
                {messages.length === 0 && !isLoading && (
                    <div className="chat-empty">
                        <h2 className="empty-tagline">How can I help you retrieve your thoughts?</h2>
                        <p className="empty-subtagline">AI-POWERED KNOWLEDGE RETRIEVAL</p>
                    </div>
                )}

                {messages.map((msg) => {
                    const msgTime = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                        <div key={msg.id || Math.random()} className={`message-wrapper ${msg.role}`}>
                            <div className="msg-meta-header">
                                {msg.role === 'user' ? `YOU • ${msgTime}` : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4568DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                        SCRIPTORA AI • {msgTime}
                                    </>
                                )}
                            </div>
                            <div className="message-bubble">
                                <button className="msg-delete-btn" onClick={() => handleDelete(msg.id)}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                                <div className="message-content">{msg.content}</div>
                            </div>
                            {msg.role === 'assistant' && msg.referencedNotes && msg.referencedNotes.length > 0 && (
                                <div className="message-references-cards">
                                    {msg.referencedNotes.map(ref => (
                                        <div
                                            key={ref.id}
                                            className="ref-card"
                                            onClick={() => navigate(`/note/${ref.id}`)}
                                        >
                                            <div className="ref-card-icon">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" /><path d="M14 3v5h5" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>
                                            </div>
                                            <div className="ref-card-body">
                                                <span className="ref-card-label">REFERENCE</span>
                                                <span className="ref-card-title">{ref.title || 'Untitled Note'}</span>
                                            </div>
                                            <div className="ref-card-arrow">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="message-wrapper assistant">
                        <div className="message-bubble loading-bubble">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <div className="chat-input-wrapper">
                    <div className="input-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <textarea
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your notes..."
                        rows={1}
                    />
                    <button
                        className={`send-btn ${inputValue.trim() ? 'active' : ''}`}
                        onClick={handleSend}
                        disabled={isLoading || !inputValue.trim()}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
