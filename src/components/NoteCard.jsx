import React, { useRef } from 'react';
import './NoteCard.css';

export default function NoteCard({ note, onClick, onShare }) {
    const { title, summary, content, tags, updatedAt, isSynthesis, insights } = note;
    const longPressTimer = useRef(null);
    const isLongPress = useRef(false);

    const getDateBadge = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'TODAY';
        if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    };

    const getTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const getReadingTime = (text) => {
        const wordsPerMinute = 200;
        const noOfWords = text ? text.split(/\s+/).length : 0;
        const minutes = Math.ceil(noOfWords / wordsPerMinute);
        return `${minutes} MIN`;
    };

    const displayTitle = title || 'Untitled';

    let displayContent;
    if (isSynthesis && insights?.summary) {
        displayContent = <p className="note-card-text">{insights.summary}</p>;
    } else if (summary) {
        displayContent = <p className="note-card-text">{summary}</p>;
    } else if (content) {
        const truncated = content.length > 150 ? content.substring(0, 150) + '...' : content;
        displayContent = <p className="note-card-text">{truncated}</p>;
    }

    // Long-press handlers (500ms hold = share)
    const handlePointerDown = (e) => {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            if (onShare) onShare(note);
        }, 500);
    };

    const handlePointerUp = () => {
        clearTimeout(longPressTimer.current);
    };

    const handleClick = () => {
        // Only navigate if it wasn't a long-press
        if (!isLongPress.current && onClick) {
            onClick();
        }
    };

    return (
        <div
            className={`note-card ${isSynthesis ? 'synthesis-card' : ''}`}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            <div className="note-card-header">
                <div className="header-main">
                    <h3 className="note-card-title">{displayTitle}</h3>
                    <div className="note-metadata">
                        <span className="metadata-item">{getTime(updatedAt)}</span>
                        <span className="metadata-separator">•</span>
                        <span className="metadata-item">{getReadingTime(content || summary)}</span>
                    </div>
                </div>
                <button className="more-btn" onClick={(e) => { e.stopPropagation(); /* More menu logic later */ }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                </button>
            </div>

            <div className="note-card-body">
                {displayContent}
            </div>

            {tags && tags.length > 0 && (
                <div className="note-tags">
                    {tags.map((tag, i) => (
                        <span key={i} className="tag-badge">{tag}</span>
                    ))}
                </div>
            )}
        </div>
    );
}
