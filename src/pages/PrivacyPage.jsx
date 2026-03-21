import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PrivacyPage.css';

export default function PrivacyPage() {
    const navigate = useNavigate();

    // Load from local storage or default
    const [isAutoExpEnabled, setIsAutoExpEnabled] = useState(() => {
        const stored = localStorage.getItem('chatExpirationEnabled');
        return stored !== null ? JSON.parse(stored) : true;
    });

    const [expirationHours, setExpirationHours] = useState(() => {
        const stored = localStorage.getItem('chatExpirationHours');
        return stored !== null ? JSON.parse(stored) : 168; // Default 7 days
    });

    useEffect(() => {
        localStorage.setItem('chatExpirationEnabled', JSON.stringify(isAutoExpEnabled));
    }, [isAutoExpEnabled]);

    useEffect(() => {
        localStorage.setItem('chatExpirationHours', JSON.stringify(expirationHours));
    }, [expirationHours]);

    const retentionOptions = [
        { label: 'Never', description: 'Conversations are stored permanently in your local vault.', value: null },
        { label: '24 Hours', description: 'Messages vanish exactly one day after they are sent.', value: 24 },
        { label: '7 Days', description: 'A weekly cycle of privacy. Ideal for temporary research.', value: 168 },
        { label: '30 Days', description: 'Monthly cleanup to keep your database lean and focused.', value: 720 },
    ];

    return (
        <div className="privacy-page page-container fade-in">
            <div className="privacy-header">
                <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <h1>Chat expiration</h1>
            </div>

            <div className="privacy-content">
                <div className="setting-block toggle-block">
                    <div className="setting-info">
                        <h2>Auto-expiration</h2>
                        <p>When enabled, the AI will automatically remove conversation history based on your chosen duration below.</p>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={isAutoExpEnabled}
                            onChange={(e) => setIsAutoExpEnabled(e.target.checked)}
                        />
                        <span className="slider round"></span>
                    </label>
                </div>

                <div className="setting-group-label">RETENTION DURATION</div>

                <div className={`retention-options ${!isAutoExpEnabled ? 'disabled' : ''}`}>
                    {retentionOptions.map((opt) => (
                        <div
                            key={opt.label}
                            className="retention-option"
                            onClick={() => isAutoExpEnabled && setExpirationHours(opt.value)}
                        >
                            <div className="option-info">
                                <h3>{opt.label}</h3>
                                <p>{opt.description}</p>
                            </div>
                            {expirationHours === opt.value && (
                                <div className="option-check">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D9CDF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="privacy-footer-note">
                    <p>
                        Scriptora utilizes end-to-end encryption for all AI interactions. Expired chats are cryptographically purged and cannot be recovered by our systems or local backups.
                    </p>
                </div>
            </div>
        </div>
    );
}
