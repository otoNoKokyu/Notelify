import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './SharedNotePage.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function SharedNotePage() {
    const { token } = useParams();
    const [note, setNote] = useState(null);
    const [expired, setExpired] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/shares/${token}`)
            .then(res => {
                if (res.status === 410) {
                    setExpired(true);
                    return null;
                }
                if (res.status === 404) {
                    setNotFound(true);
                    return null;
                }
                if (!res.ok) throw new Error('Failed to load');
                return res.json();
            })
            .then(data => {
                if (data) setNote(data);
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) {
        return (
            <div className="shared-page">
                <div className="shared-loading">Loading...</div>
            </div>
        );
    }

    if (expired) {
        return (
            <div className="shared-page shared-expired">
                <p className="expired-message">This thought has passed.</p>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="shared-page shared-expired">
                <p className="expired-message">This thought was not found.</p>
            </div>
        );
    }

    const formattedDate = note.createdAt
        ? new Date(note.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : '';

    return (
        <div className="shared-page">
            <article className="shared-article">
                {note.title && (
                    <h1 className="shared-title">{note.title}</h1>
                )}

                {formattedDate && (
                    <time className="shared-date">{formattedDate}</time>
                )}

                <hr className="shared-divider" />

                <div
                    className="shared-content"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                />

                {note.tags && note.tags.length > 0 && (
                    <div className="shared-tags">
                        {note.tags.map((tag, i) => (
                            <span key={i} className="shared-tag">{tag}</span>
                        ))}
                    </div>
                )}
            </article>

            <footer className="shared-footer">
                <span className="shared-branding">Captured with Reflect</span>
            </footer>
        </div>
    );
}
