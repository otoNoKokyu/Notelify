import React, { useState } from 'react';
import { getUserId } from '../services/authService';
import './ShareModal.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ShareModal({ note, onClose }) {
    const [ephemeral, setEphemeral] = useState(false);
    const [shareUrl, setShareUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const createLink = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/shares`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                    'x-user-id': getUserId()
                },
                body: JSON.stringify({ noteId: note.id, ephemeral }),
            });

            if (!res.ok) throw new Error('Failed to create share link');

            const data = await res.json();
            const url = `${window.location.origin}/s/${data.token}`;
            setShareUrl(url);
        } catch (err) {
            console.error('Share error:', err);
        } finally {
            setLoading(false);
        }
    };

    const copyUrl = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for mobile
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const nativeShare = async () => {
        if (navigator.share && shareUrl) {
            try {
                await navigator.share({
                    title: note.title || 'Shared thought',
                    url: shareUrl,
                });
            } catch { }
        }
    };

    return (
        <div className="share-overlay" onClick={onClose}>
            <div className="share-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="share-title">Share this thought</h2>
                <p className="share-subtitle">
                    {note.title || note.content?.substring(0, 60) + '...'}
                </p>

                {!shareUrl ? (
                    <>
                        <label className="share-toggle">
                            <input
                                type="checkbox"
                                checked={ephemeral}
                                onChange={(e) => setEphemeral(e.target.checked)}
                            />
                            <span className="toggle-label">Expire in 24 hours</span>
                        </label>

                        <button
                            className="share-create-btn"
                            onClick={createLink}
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Link'}
                        </button>
                    </>
                ) : (
                    <div className="share-result">
                        <div className="share-url-box">
                            <span className="share-url">{shareUrl}</span>
                        </div>
                        <div className="share-actions">
                            <button className="share-copy-btn" onClick={copyUrl}>
                                {copied ? '✓ Copied' : 'Copy Link'}
                            </button>
                            {navigator.share && (
                                <button className="share-native-btn" onClick={nativeShare}>
                                    Share
                                </button>
                            )}
                        </div>
                        {ephemeral && (
                            <p className="share-expiry-note">This link expires in 24 hours.</p>
                        )}
                    </div>
                )}

                <button className="share-close-btn" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}
