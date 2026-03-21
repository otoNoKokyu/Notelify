import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { authService } from './services/authService';
import OfflineBanner from './components/OfflineBanner';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import './App.css';

// Lazy load pages for better performance
const WelcomePage = React.lazy(() => import('./pages/WelcomePage'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ArchivePage = React.lazy(() => import('./pages/ArchivePage'));
const EditorPage = React.lazy(() => import('./pages/EditorPage'));
const SharedNotePage = React.lazy(() => import('./pages/SharedNotePage'));
const TimelinePage = React.lazy(() => import('./pages/TimelinePage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage'));

// We will implement BottomNav soon
const BottomNav = React.lazy(() => import('./components/BottomNav'));

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    // Initialize unique identity
    authService.initialize();

    // Initial routing logic based on first visit
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited && location.pathname === '/') {
      // Stay on Welcome
    } else if (hasVisited && location.pathname === '/') {
      navigate('/home', { replace: true });
    }
  }, [location, navigate]);

  // Hide BottomNav on Welcome and Editor pages
  const showBottomNav = ['/home', '/archive', '/timeline', '/chat', '/privacy'].includes(location.pathname);

  return (
    <div className="app-shell">
      <OfflineBanner isOnline={isOnline} />
      <React.Suspense fallback={<div className="page-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/note/:id" element={<EditorPage />} />
          <Route path="/s/:token" element={<SharedNotePage />} />
        </Routes>

        {showBottomNav && <BottomNav isOnline={isOnline} />}
      </React.Suspense>
    </div>
  );
}

export default App;
