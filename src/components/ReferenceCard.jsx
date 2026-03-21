import React from 'react';
import './ReferenceCard.css';

export default function ReferenceCard({ title, onClick }) {
    return (
        <div className="reference-card" onClick={onClick}>
            <div className="reference-header">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                    <polyline points="14.5 2 14.5 8 20 8"></polyline>
                </svg>
                <span className="reference-label">REFERENCE</span>
            </div>
            <div className="reference-body">
                <span className="reference-title">{title}</span>
                <svg className="reference-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            </div>
        </div>
    );
}
