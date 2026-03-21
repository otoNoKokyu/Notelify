import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './WelcomePage.css';

export default function WelcomePage() {
    const navigate = useNavigate();

    const handleEnter = () => {
        authService.initialize();
        localStorage.setItem('hasVisited', 'true');
        navigate('/home');
    };

    return (
        <div className="welcome-container fade-in">
            <div className="cursor-line"></div>

            <div className="welcome-content slide-up">
                <h1 className="welcome-title">Hello.</h1>
                <p className="welcome-subtitle">This is a calm space for<br />your thoughts.</p>
                <p className="welcome-tagline">LET'S MAKE A QUIET START.</p>

                <button className="enter-btn" onClick={handleEnter}>
                    Enter
                </button>
            </div>
        </div>
    );
}
