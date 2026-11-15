// client/src/App.jsx

import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import NewAuditPage from './pages/NewAuditPage';

export default function App() {
  const [currentView, setView] = useState('landing'); // 'landing' | 'dashboard' | 'new-audit'
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [isDemoTriggered, setIsDemoTriggered] = useState(false);

  const handleQuickDemo = () => {
    setSelectedAuditId(null);
    setIsDemoTriggered(true);
    setView('new-audit');
  };

  const handleSelectAudit = (auditId) => {
    setSelectedAuditId(auditId);
    setIsDemoTriggered(false);
    setView('new-audit');
  };

  const handleStartNewAudit = () => {
    setSelectedAuditId(null);
    setIsDemoTriggered(false);
    setView('new-audit');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        setView={(v) => {
          if (v === 'new-audit') {
            handleStartNewAudit();
          } else {
            setView(v);
          }
        }}
        onQuickDemo={handleQuickDemo}
      />

      {/* Main Content View */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            setView={(v) => {
              if (v === 'new-audit') {
                handleStartNewAudit();
              } else {
                setView(v);
              }
            }}
            onQuickDemo={handleQuickDemo}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardPage
            setView={(v) => {
              if (v === 'new-audit') {
                handleStartNewAudit();
              } else {
                setView(v);
              }
            }}
            onSelectAudit={handleSelectAudit}
            onQuickDemo={handleQuickDemo}
          />
        )}

        {currentView === 'new-audit' && (
          <NewAuditPage
            key={selectedAuditId || (isDemoTriggered ? 'demo' : 'new')}
            existingAuditId={selectedAuditId}
            initialDemo={isDemoTriggered}
            setView={setView}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
