// client/src/components/Navbar.jsx

import React from 'react';
import { ShieldCheck, FileCheck2, Sparkles, LayoutDashboard } from 'lucide-react';

export default function Navbar({ currentView, setView, onQuickDemo, activeAuditId, onResumeAudit }) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div 
            onClick={() => setView('landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900">DocuReady</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  MVP
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Pre-Submission Application Audit</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-3">
            <button
              onClick={() => setView('landing')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                currentView === 'landing'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setView('dashboard')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition flex items-center gap-1.5 ${
                currentView === 'dashboard'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            {/* Resume Active in-progress audit if navigating from Overview / Dashboard */}
            {activeAuditId && currentView !== 'new-audit' && (
              <button
                onClick={onResumeAudit}
                className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition flex items-center gap-1.5 shadow-2xs"
                title="Resume active in-progress audit"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden md:inline">Resume Active Audit</span>
                <span className="md:hidden">Resume</span>
              </button>
            )}

            {/* Quick Synthetic Demo trigger */}
            <button
              onClick={onQuickDemo}
              className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 transition flex items-center gap-1.5 shadow-xs"
              title="Test the synthetic benchmark scenario (Rahul Sharma)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">Run Demo Case</span>
              <span className="md:hidden">Demo</span>
            </button>

            {/* New Audit CTA */}
            <button
              onClick={() => setView('new-audit')}
              className="ml-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm shadow-blue-600/20 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>New Audit</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
