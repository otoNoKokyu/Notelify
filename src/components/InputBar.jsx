import React from 'react';
import './InputBar.css';

export default function InputBar({ value, onChange, onSend, placeholder }) {
    return (
        <div className="input-bar-container">
            <div className="input-bar-wrapper">
                <button className="input-icon-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
                <input
                    type="text"
                    className="chat-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onSend()}
                    placeholder={placeholder || "Ask about your notes..."}
                />
            </div>
        </div>
    );
}
