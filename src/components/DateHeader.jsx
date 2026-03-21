import React from 'react';
import './DateHeader.css';

export default function DateHeader({ date }) {
    return (
        <div className="date-header-container">
            <div className="timeline-trail"></div>
            <div className="date-marker"></div>
            <h2 className="date-text">{date}</h2>
        </div>
    );
}
