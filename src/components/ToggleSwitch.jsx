import React from 'react';
import './ToggleSwitch.css';

export default function ToggleSwitch({ isOn, onToggle }) {
    return (
        <button
            className={`toggle-switch ${isOn ? 'on' : 'off'}`}
            onClick={onToggle}
            role="switch"
            aria-checked={isOn}
        >
            <div className="toggle-handle"></div>
        </button>
    );
}
