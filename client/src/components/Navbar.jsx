// client/src/components/Navbar.jsx

import React, { useEffect, useState } from 'react';
import { ShieldCheck, FileCheck2, Sparkles, LayoutDashboard } from 'lucide-react';

export default function Navbar({ currentView, setView, onQuickDemo, activeAuditId, onResumeAudit }) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (currentView !== 'landing') {
      setScrollProgress(0);
      return;
    }
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentView]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border-subtle transition-colors relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand */}
          <div 
            onClick={() => setView('landing')}
            className="flex items-center gap-3.5 cursor-pointer group select-none"
            title="DocuReady Home"
          >
            <div className="w-10 h-10 rounded-xl bg-navy flex items-center justify-center text-white shadow-md shadow-navy/20 group-hover:bg-navy-dark transition-all duration-200">
              <FileCheck2 className="w-5 h-5 text-teal-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-xl font-extrabold tracking-tight text-navy">
                  DocuReady
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-light text-teal-dark rounded-full border border-teal-accent/30">
                  Audit MVP
                </span>
              </div>
              <p className="text-xs text-muted-text font-medium hidden sm:block">
                Pre-Submission Application Audit
              </p>
            </div>
          </div>

          {/* Navigation Actions */}
          <nav className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              onClick={() => setView('landing')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
                currentView === 'landing'
                  ? 'text-navy bg-secondary-light font-bold shadow-2xs'
                  : 'text-muted-text hover:text-navy hover:bg-canvas'
              }`}
            >
              Overview
            </button>

            <button
              onClick={() => setView('dashboard')}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                currentView === 'dashboard'
                  ? 'text-navy bg-secondary-light font-bold shadow-2xs'
                  : 'text-muted-text hover:text-navy hover:bg-canvas'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-secondary-blue" />
              <span>Dashboard</span>
            </button>

            {/* Resume Active in-progress audit if navigating from Overview / Dashboard */}
            {activeAuditId && currentView !== 'new-audit' && (
              <button
                onClick={onResumeAudit}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-teal-light text-teal-dark border border-teal-accent/30 hover:bg-teal-100 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Resume active in-progress audit"
              >
                <span className="w-2 h-2 rounded-full bg-teal-accent animate-pulse" />
                <span className="hidden md:inline">Resume Active Audit</span>
                <span className="md:hidden">Resume</span>
              </button>
            )}

            {/* Quick Synthetic Demo trigger */}
            <button
              onClick={onQuickDemo}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border border-amber-200 bg-amber-50/90 text-amber-900 hover:bg-amber-100/90 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Test the synthetic benchmark scenario (Rahul Sharma)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="hidden md:inline">Run Demo Case</span>
              <span className="md:hidden">Demo</span>
            </button>

            {/* New Audit CTA */}
            <button
              onClick={() => setView('new-audit')}
              className="ml-1 sm:ml-2 px-4 py-2 sm:px-4.5 sm:py-2.2 text-xs sm:text-sm font-bold rounded-xl bg-navy text-white hover:bg-navy-dark active:scale-[0.98] transition-all duration-200 shadow-sm shadow-navy/20 flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-teal-accent" />
              <span>New Audit</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Subtle Scroll Progress Accent Line */}
      {currentView === 'landing' && (
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-transparent overflow-hidden pointer-events-none">
          <div 
            className="h-full bg-linear-to-r from-navy via-secondary-blue to-teal-accent transition-all duration-150 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, scrollProgress))}%` }}
          />
        </div>
      )}
    </header>
  );
}
