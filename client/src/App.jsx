// client/src/App.jsx

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import NewAuditPage from './pages/NewAuditPage';
import { 
  getAuditToken, 
  getActiveAuditId, 
  setActiveAuditId, 
  clearActiveAuditId 
} from './services/api';

/**
 * Parse route state from URL hash
 */
function parseHashRoute() {
  const hash = window.location.hash || '';
  if (hash.startsWith('#/audit/')) {
    const rawId = hash.replace('#/audit/', '').trim().split('/')[0].split('?')[0];
    return { view: 'new-audit', auditId: rawId };
  }
  if (hash === '#/dashboard') {
    return { view: 'dashboard', auditId: null };
  }
  if (hash === '#/new-audit') {
    return { view: 'new-audit', auditId: null };
  }
  if (hash === '#/overview' || hash === '#/landing' || hash === '#/' || hash === '') {
    return { view: 'landing', auditId: null };
  }
  return { view: 'landing', auditId: null };
}

export default function App() {
  // Initialize state from URL hash and active session
  const [currentView, setCurrentView] = useState(() => {
    const route = parseHashRoute();
    if (route.auditId && (getAuditToken(route.auditId) || getActiveAuditId() === route.auditId)) {
      return 'new-audit';
    }
    return route.view;
  });

  const [selectedAuditId, setSelectedAuditId] = useState(() => {
    const route = parseHashRoute();
    if (route.auditId && (getAuditToken(route.auditId) || getActiveAuditId() === route.auditId)) {
      return route.auditId;
    }
    return null;
  });

  const [activeAuditId, setActiveAuditIdState] = useState(() => {
    const route = parseHashRoute();
    if (route.auditId && (getAuditToken(route.auditId) || getActiveAuditId() === route.auditId)) {
      return route.auditId;
    }
    return getActiveAuditId();
  });

  const [sessionKey, setSessionKey] = useState(() => {
    const route = parseHashRoute();
    if (route.auditId) {
      return `audit-${route.auditId}`;
    }
    return 'new-init';
  });

  const [demoKey, setDemoKey] = useState(null);

  // Sync window.location.hash with current application state
  const syncHash = useCallback((view, auditId) => {
    let targetHash = '#/overview';
    if (view === 'dashboard') {
      targetHash = '#/dashboard';
    } else if (view === 'new-audit') {
      if (auditId) {
        targetHash = `#/audit/${auditId}`;
      } else {
        targetHash = '#/new-audit';
      }
    } else {
      targetHash = '#/overview';
    }

    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
  }, []);

  // Listen to browser Back / Forward navigation (hashchange)
  useEffect(() => {
    const handleHashChange = () => {
      const route = parseHashRoute();
      if (route.view === 'new-audit' && route.auditId) {
        if (route.auditId === selectedAuditId || getAuditToken(route.auditId) || getActiveAuditId() === route.auditId) {
          setSelectedAuditId(route.auditId);
          setActiveAuditIdState(route.auditId);
          setActiveAuditId(route.auditId);
          setCurrentView('new-audit');
          setDemoKey(null);
        } else {
          // Unowned or invalid audit ID: gracefully redirect to dashboard
          window.location.hash = '#/dashboard';
          setCurrentView('dashboard');
          setSelectedAuditId(null);
        }
      } else if (route.view === 'new-audit') {
        setCurrentView('new-audit');
      } else {
        setCurrentView(route.view);
        setSelectedAuditId(route.auditId);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [selectedAuditId]);

  // Update hash whenever view or selectedAuditId changes
  useEffect(() => {
    syncHash(currentView, selectedAuditId);
  }, [currentView, selectedAuditId, syncHash]);

  // Keep activeAuditId in sync with storage
  const updateActiveAudit = (id) => {
    if (id) {
      setActiveAuditId(id);
      setActiveAuditIdState(id);
    } else {
      clearActiveAuditId();
      setActiveAuditIdState(null);
    }
  };

  const handleQuickDemo = () => {
    setSelectedAuditId(null);
    const key = Date.now();
    setDemoKey(key);
    setSessionKey(`demo-${key}`);
    setCurrentView('new-audit');
    syncHash('new-audit', null);
  };

  const handleSelectAudit = (auditId) => {
    setSelectedAuditId(auditId);
    updateActiveAudit(auditId);
    setDemoKey(null);
    setSessionKey(`audit-${auditId}`);
    setCurrentView('new-audit');
    syncHash('new-audit', auditId);
  };

  const handleResumeActiveAudit = () => {
    const activeId = activeAuditId || getActiveAuditId();
    if (activeId) {
      handleSelectAudit(activeId);
    } else {
      handleStartNewAudit();
    }
  };

  const handleStartNewAudit = () => {
    setSelectedAuditId(null);
    setDemoKey(null);
    updateActiveAudit(null);
    setSessionKey(`new-${Date.now()}`);
    setCurrentView('new-audit');
    syncHash('new-audit', null);
  };

  const handleAuditCreated = (newId) => {
    setSelectedAuditId(newId);
    updateActiveAudit(newId);
    syncHash('new-audit', newId);
    // Preserves sessionKey so NewAuditPage smoothly progresses to Step 2 without unmounting
  };

  const handleViewChange = (v) => {
    if (v === 'new-audit') {
      handleStartNewAudit();
    } else {
      setCurrentView(v);
      syncHash(v, null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-main-text font-sans selection:bg-teal-light selection:text-teal-dark">
      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        setView={handleViewChange}
        onQuickDemo={handleQuickDemo}
        activeAuditId={activeAuditId}
        onResumeAudit={handleResumeActiveAudit}
      />

      {/* Main Content View */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            setView={handleViewChange}
            onQuickDemo={handleQuickDemo}
            activeAuditId={activeAuditId}
            onResumeAudit={handleResumeActiveAudit}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardPage
            setView={handleViewChange}
            onSelectAudit={handleSelectAudit}
            onQuickDemo={handleQuickDemo}
            activeAuditId={activeAuditId}
            onAuditDeleted={(deletedId) => {
              if (activeAuditId === deletedId) {
                updateActiveAudit(null);
              }
            }}
          />
        )}

        {currentView === 'new-audit' && (
          <NewAuditPage
            key={sessionKey}
            existingAuditId={selectedAuditId}
            initialDemo={Boolean(demoKey)}
            setView={handleViewChange}
            onAuditCreated={handleAuditCreated}
            onStartNew={handleStartNewAudit}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
