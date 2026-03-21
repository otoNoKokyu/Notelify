import React, { useEffect, useState } from 'react';
import './FloatingToolbar.css';

export default function FloatingToolbar() {
    const [position, setPosition] = useState(null);

    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();

            if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
                setPosition(null);
                return;
            }

            // Check if selection is within editor content
            let node = selection.anchorNode;
            let inEditor = false;
            while (node && node !== document.body) {
                if (node.classList && node.classList.contains('editor-content')) {
                    inEditor = true;
                    break;
                }
                node = node.parentNode;
            }

            if (!inEditor) {
                setPosition(null);
                return;
            }

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            setPosition({
                top: rect.top - 48, // slightly above
                left: rect.left + rect.width / 2
            });
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    const format = (command) => {
        document.execCommand(command, false, null);
    };

    if (!position) return null;

    return (
        <div
            className="floating-toolbar fade-in"
            style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
        >
            <button onMouseDown={(e) => { e.preventDefault(); format('bold'); }}>B</button>
            <button onMouseDown={(e) => { e.preventDefault(); format('italic'); }}>I</button>
            <div className="toolbar-divider" />
            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('formatBlock', false, 'H2'); }}>H2</button>
        </div>
    );
}
