import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

export default function BottomNav({ isOnline }) {
    const navigate = useNavigate();
    const location = useLocation();

    const isFeed = location.pathname === '/feed' || location.pathname === '/home';
    const isTimeline = location.pathname === '/timeline';
    const isChat = location.pathname === '/chat';
    const isPrivacy = location.pathname === '/privacy';

    return (
        <nav className="bottom-nav slide-up">
            <div className="nav-container">
                <button
                    className={`nav-btn ${isFeed ? 'active' : ''}`}
                    onClick={() => navigate('/home')}
                    aria-label="Feed"
                >
                    <div className="nav-btn-content">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        <span className="nav-label">Feed</span>
                    </div>
                </button>
                <button
                    className={`nav-btn ${isTimeline ? 'active' : ''}`}
                    onClick={() => navigate('/timeline')}
                    aria-label="Timeline"
                >
                    <div className="nav-btn-content">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        <span className="nav-label">Timeline</span>
                    </div>
                </button>

                <button
                    className={`nav-btn ${isChat ? 'active' : ''} ${!isOnline ? 'offline' : ''}`}
                    onClick={() => isOnline && navigate('/chat')}
                    disabled={!isOnline}
                    aria-label="Chat"
                    title={!isOnline ? "AI Chat requires internet" : "Chat"}
                >
                    <div className="nav-btn-content">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span className="nav-label">Chat</span>
                    </div>
                </button>

                <button
                    className={`nav-btn ${isPrivacy ? 'active' : ''}`}
                    onClick={() => navigate('/privacy')}
                    aria-label="Privacy"
                >
                    <div className="nav-btn-content">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        <span className="nav-label">Privacy</span>
                    </div>
                </button>
            </div>
        </nav>
    );
}
