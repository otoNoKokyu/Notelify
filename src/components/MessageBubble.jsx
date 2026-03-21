import React from 'react';
import './MessageBubble.css';

export default function MessageBubble({ message }) {
    const { role, content, timestamp, senderName } = message;
    const isUser = role === 'user';

    return (
        <div className={`message-wrapper ${isUser ? 'user-wrapper' : 'assistant-wrapper'}`}>
            <div className="message-header">
                <span className="sender-name">{isUser ? 'YOU' : senderName || 'SCRIPTORA AI'}</span>
                <span className="header-dot">•</span>
                <span className="message-time">{timestamp}</span>
            </div>
            <div className="message-bubble">
                <p className="message-text">{content}</p>
            </div>
        </div>
    );
}
