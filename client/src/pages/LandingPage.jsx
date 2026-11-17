// client/src/pages/LandingPage.jsx

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  FileSearch, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  GraduationCap, 
  Building2, 
  Landmark, 
  Clock, 
  FileText, 
  Lock,
  Eye,
  Check,
  XCircle,
  HelpCircle,
  FileCheck,
  Layers,
  ChevronRight,
  UserCheck
} from 'lucide-react';

const WORKFLOW_STEPS = [
  {
    num: 1,
    title: 'Select Category',
    description: 'Configure tailored criteria for Scholarships, College Admissions, or Welfare Schemes.',
    icon: GraduationCap,
  },
  {
    num: 2,
    title: 'Upload & OCR Extract',
    description: 'Tesseract.js OCR and PDF parsers extract names, dates of birth, cert numbers, and issue dates.',
    icon: FileSearch,
  },
  {
    num: 3,
    title: 'Review & Correct',
    description: 'Review OCR outputs with confidence scores. Edit fields inline to ensure 100% data integrity.',
    icon: UserCheck,
  },
  {
    num: 4,
    title: 'Audit Report & Fixes',
    description: 'Get readiness status (READY FOR REVIEW, NEEDS ATTENTION, INCOMPLETE) and actionable fix checklists.',
    icon: ShieldCheck,
  },
];

export default function LandingPage({ setView, onQuickDemo, activeAuditId, onResumeAudit }) {
  const [activePreviewTab, setActivePreviewTab] = useState('matrix');
  const [activeWorkflowStage, setActiveWorkflowStage] = useState(1);

  // Progressive Section Reveals with Safe Progressive Enhancement
  useEffect(() => {
    // If user prefers reduced motion or if IntersectionObserver is unsupported, keep all content visible
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches || typeof IntersectionObserver === 'undefined') {
      return;
    }

    // Mark body as supporting scroll reveals only after confirming support
    document.body.classList.add('has-scroll-anim');

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -20px 0px',
      }
    );

    const elements = document.querySelectorAll('.reveal-init, .reveal-fade');
    elements.forEach((el) => revealObserver.observe(el));

    return () => {
      document.body.classList.remove('has-scroll-anim');
      revealObserver.disconnect();
    };
  }, []);

  return (
    <div className="space-y-24 sm:space-y-32 pb-24 relative">

      {/* 1. HERO SECTION (Split-Screen Hero with Indian Student Library Photography) */}
      <section id="hero" className="pt-8 sm:pt-14 pb-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Value Proposition, Action CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="reveal-init inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-50 border border-navy-100 text-navy font-semibold text-xs uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-teal-accent animate-pulse" />
              <span>Intelligent Pre-Submission Verification</span>
            </div>

            <h1 className="reveal-init reveal-delay-75 text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold text-navy tracking-tight leading-[1.12]">
              Catch application-ending errors <br className="hidden sm:inline" />
              <span className="text-secondary-blue">before you click submit.</span>
            </h1>

            <p className="reveal-init reveal-delay-150 text-lg sm:text-xl text-muted-text max-w-2xl leading-relaxed">
              Every year, thousands of qualified applicants are disqualified from scholarships, university admissions, and government schemes due to preventable cross-document discrepancies and missing paperwork.
            </p>

            {/* Active In-Progress Audit Resume Banner */}
            {activeAuditId && (
              <div className="reveal-init reveal-delay-225 p-4 bg-teal-50 border border-teal-200/80 rounded-2xl flex items-center justify-between gap-4 text-xs shadow-xs">
                <div className="flex items-center gap-3 text-teal-dark font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-accent animate-pulse shrink-0" />
                  <span>You have an active in-progress audit session.</span>
                </div>
                <button
                  onClick={onResumeAudit}
                  className="px-4 py-2 font-bold text-teal-dark hover:text-navy bg-white border border-teal-200 rounded-xl transition shadow-2xs shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Resume Audit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="reveal-init reveal-delay-225 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <button
                onClick={() => setView('new-audit')}
                className="px-7 py-4 rounded-xl bg-navy text-white font-semibold hover:bg-navy-dark transition shadow-md shadow-navy/20 flex items-center justify-center gap-2.5 text-base cursor-pointer card-hover-lift"
              >
                <ShieldCheck className="w-5 h-5 text-teal-accent" />
                <span>Start New Application Audit</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>

              <button
                onClick={onQuickDemo}
                className="px-6 py-4 rounded-xl bg-white text-navy font-semibold border border-border-subtle hover:bg-navy-50/60 hover:border-secondary-blue/40 transition shadow-xs flex items-center justify-center gap-2.5 text-base cursor-pointer card-hover-lift"
              >
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Run Synthetic Demo Case</span>
              </button>
            </div>

            {/* Trust & Capability Metrics */}
            <div className="reveal-init reveal-delay-300 grid grid-cols-3 gap-3 pt-6 border-t border-border-subtle">
              <div className="space-y-0.5">
                <div className="font-extrabold text-navy text-base flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-accent" />
                  <span>100% Client-Side</span>
                </div>
                <p className="text-xs text-muted-text">Zero third-party data retention</p>
              </div>
              <div className="space-y-0.5">
                <div className="font-extrabold text-navy text-base flex items-center gap-1.5">
                  <FileSearch className="w-4 h-4 text-secondary-blue" />
                  <span>OCR & PDF</span>
                </div>
                <p className="text-xs text-muted-text">Scanned images and digital PDFs</p>
              </div>
              <div className="space-y-0.5">
                <div className="font-extrabold text-navy text-base flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-navy" />
                  <span>Cross-Check</span>
                </div>
                <p className="text-xs text-muted-text">Matrix comparison across all docs</p>
              </div>
            </div>
          </div>

          {/* Right Column: Split-Screen Hero Visual with Floating Verification Badges */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Main Photo Frame */}
              <div className="reveal-fade relative rounded-3xl overflow-hidden border border-border-subtle shadow-xl bg-white img-reveal-box">
                <img 
                  src="/images/hero.jpg" 
                  alt="Indian student preparing documents for pre-submission verification audit" 
                  className="w-full h-[420px] sm:h-[460px] object-cover object-center"
                />
                
                {/* Subtle gradient vignette to anchor floating badges */}
                <div className="absolute inset-0 bg-linear-to-t from-navy/60 via-transparent to-transparent pointer-events-none" />

                {/* Bottom Photo Overlay Tag */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-white/60 shadow-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-teal-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy">Rahul Sharma • Central Scholarship</p>
                      <p className="text-[11px] text-muted-text">3 Documents Analysed • 1 Discrepancy Found</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                    Action Required
                  </span>
                </div>
              </div>

              {/* Floating Badge 1: Top Right - Aadhaar Match */}
              <div className="reveal-init reveal-delay-300 absolute -top-4 -right-2 sm:-right-4 bg-white rounded-2xl p-3.5 border border-border-subtle shadow-lg flex items-center gap-3 card-hover-lift">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div className="text-left pr-2">
                  <p className="text-[11px] font-semibold text-muted-text">Aadhaar Identity</p>
                  <p className="text-xs font-bold text-navy">DOB 12/05/2005 Verified</p>
                </div>
              </div>

              {/* Floating Badge 2: Left Middle - Real-Time Discrepancy Alert */}
              <div className="reveal-init reveal-delay-450 absolute top-1/3 -left-3 sm:-left-6 bg-white rounded-2xl p-3.5 border border-border-subtle shadow-xl flex items-center gap-3 max-w-[240px] card-hover-lift">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-semibold text-muted-text">Discrepancy Detected</p>
                  <p className="text-xs font-bold text-navy">Income Cert DOB: 2004</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Synthetic Demo Banner Callout */}
        <div id="demo-scenario" className="reveal-init reveal-delay-225 mt-12 bg-white border border-border-subtle rounded-2xl p-5 text-left shadow-xs hover:border-border-card transition card-hover-lift">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 shrink-0 mt-0.5 border border-amber-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="font-bold text-navy text-sm">Synthetic Benchmark Scenario:</span>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-xs font-semibold rounded-md border border-amber-200">
                  Rahul Sharma (Scholarship)
                </span>
                <span className="text-xs text-muted-text font-medium hidden sm:inline">• 1-click end-to-end verification walkthrough</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-3">
                Evaluates a realistic scenario: <strong>Identity Proof</strong> (Rahul Sharma, DOB 12/05/2005) vs <strong>Marksheet</strong> (Rahul S. Sharma, DOB 12/05/2005) vs <strong>Income Certificate</strong> (Rahul Sharma, DOB 12/05/2004) with a missing Application Form. Identifies the initial variation, DOB mismatch, and missing mandatory document.
              </p>
              <button
                onClick={onQuickDemo}
                className="inline-flex items-center gap-2 text-xs font-bold text-secondary-blue hover:text-navy transition cursor-pointer"
              >
                <span>Launch Benchmark Audit Case</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE PRODUCT PREVIEW SECTION */}
      <section id="engine-preview" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-border-subtle p-6 sm:p-10 shadow-xs">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div className="reveal-init">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-accent">Interactive Engine Walkthrough</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-navy mt-1 mb-3">Inside the Pre-Submission Audit Engine</h2>
              <p className="text-sm text-muted-text">
                DocuReady analyzes multi-format files, extracts critical statutory tokens, and builds an exhaustive cross-document consistency matrix before submission.
              </p>
            </div>

            {/* Interactive Tab Selector */}
            <div className="reveal-init reveal-delay-150 flex flex-wrap items-center justify-center gap-2 mt-6 p-1.5 bg-canvas rounded-2xl border border-border-subtle max-w-xl mx-auto">
              <button
                onClick={() => setActivePreviewTab('ocr')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  activePreviewTab === 'ocr' 
                    ? 'bg-navy text-white shadow-xs scale-102 font-bold' 
                    : 'text-muted-text hover:text-navy hover:bg-white/60'
                }`}
              >
                1. OCR Extraction
              </button>
              <button
                onClick={() => setActivePreviewTab('matrix')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  activePreviewTab === 'matrix' 
                    ? 'bg-navy text-white shadow-xs scale-102 font-bold' 
                    : 'text-muted-text hover:text-navy hover:bg-white/60'
                }`}
              >
                2. Discrepancy Matrix
              </button>
              <button
                onClick={() => setActivePreviewTab('rules')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  activePreviewTab === 'rules' 
                    ? 'bg-navy text-white shadow-xs scale-102 font-bold' 
                    : 'text-muted-text hover:text-navy hover:bg-white/60'
                }`}
              >
                3. Category Rules
              </button>
              <button
                onClick={() => setActivePreviewTab('verdict')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  activePreviewTab === 'verdict' 
                    ? 'bg-navy text-white shadow-xs scale-102 font-bold' 
                    : 'text-muted-text hover:text-navy hover:bg-white/60'
                }`}
              >
                4. Actionable Verdict
              </button>
            </div>
          </div>

          {/* Interactive Screen Preview Container with Smooth Transition */}
          <div className="reveal-fade border border-border-subtle rounded-2xl bg-canvas p-5 sm:p-7 overflow-hidden transition-all duration-300 min-h-[220px]">
            
            {activePreviewTab === 'ocr' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-secondary-blue" />
                    <span className="font-bold text-navy text-sm">Optical Character Recognition & Parsing</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    High Confidence (94%)
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-border-subtle space-y-2 card-hover-lift">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy">Identity Proof (Aadhaar)</span>
                      <span className="text-[10px] bg-navy-50 text-navy font-semibold px-2 py-0.5 rounded">PNG Image</span>
                    </div>
                    <div className="text-xs space-y-1 text-slate-600">
                      <p><span className="text-muted-text">Extracted Name:</span> <span className="font-semibold text-navy">Rahul Sharma</span></p>
                      <p><span className="text-muted-text">Extracted DOB:</span> <span className="font-semibold text-navy">12/05/2005</span></p>
                      <p><span className="text-muted-text">Identifier:</span> <span className="font-mono text-[11px]">XXXX-XXXX-9012</span></p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-border-subtle space-y-2 card-hover-lift">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy">Marksheet (Class XII)</span>
                      <span className="text-[10px] bg-navy-50 text-navy font-semibold px-2 py-0.5 rounded">PDF Scan</span>
                    </div>
                    <div className="text-xs space-y-1 text-slate-600">
                      <p><span className="text-muted-text">Extracted Name:</span> <span className="font-semibold text-navy">Rahul S. Sharma</span></p>
                      <p><span className="text-muted-text">Extracted DOB:</span> <span className="font-semibold text-navy">12/05/2005</span></p>
                      <p><span className="text-muted-text">Roll / Seat No:</span> <span className="font-mono text-[11px]">CBSE-2023-8841</span></p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-border-subtle space-y-2 card-hover-lift">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy">Income Certificate</span>
                      <span className="text-[10px] bg-navy-50 text-navy font-semibold px-2 py-0.5 rounded">JPEG Scan</span>
                    </div>
                    <div className="text-xs space-y-1 text-slate-600">
                      <p><span className="text-muted-text">Extracted Name:</span> <span className="font-semibold text-navy">Rahul Sharma</span></p>
                      <p><span className="text-muted-text">Extracted DOB:</span> <span className="font-semibold text-rose-600">12/05/2004</span></p>
                      <p><span className="text-muted-text">Issue Date:</span> <span className="font-semibold text-navy">10/06/2025</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'matrix' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-accent" />
                    <span className="font-bold text-navy text-sm">Cross-Document Discrepancy Matrix</span>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    2 Field Variations Detected
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs bg-white rounded-xl border border-border-subtle overflow-hidden">
                    <thead className="bg-navy-50 text-navy font-bold border-b border-border-subtle">
                      <tr>
                        <th className="py-2.5 px-4">Field Attribute</th>
                        <th className="py-2.5 px-4">Identity Proof</th>
                        <th className="py-2.5 px-4">Marksheet</th>
                        <th className="py-2.5 px-4">Income Cert</th>
                        <th className="py-2.5 px-4 text-right">Matrix Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-navy">Full Name</td>
                        <td className="py-2.5 px-4 text-slate-600">Rahul Sharma</td>
                        <td className="py-2.5 px-4 text-slate-600">Rahul S. Sharma</td>
                        <td className="py-2.5 px-4 text-slate-600">Rahul Sharma</td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-secondary-blue font-semibold text-[11px]">
                            Initial Variation
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-semibold text-navy">Date of Birth</td>
                        <td className="py-2.5 px-4 text-emerald-700 font-medium">12/05/2005</td>
                        <td className="py-2.5 px-4 text-emerald-700 font-medium">12/05/2005</td>
                        <td className="py-2.5 px-4 text-rose-600 font-bold">12/05/2004</td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[11px]">
                            DOB Mismatch
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activePreviewTab === 'rules' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-secondary-blue" />
                    <span className="font-bold text-navy text-sm">Category Compliance Check (Scholarship Rules)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-navy bg-navy-50 px-2.5 py-1 rounded-md border border-navy-100">
                    Statutory Criteria
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="bg-white p-3.5 rounded-xl border border-border-subtle flex items-center justify-between card-hover-lift">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-teal-accent shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-navy">Income Certificate Validity Period</p>
                        <p className="text-[11px] text-muted-text">Issued within current financial year (≤ 1 year old rule)</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">Compliant</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-border-subtle flex items-center justify-between card-hover-lift">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-navy">Mandatory Application Summary Form</p>
                        <p className="text-[11px] text-muted-text">Signed portal acknowledgement form is required for scrutiny</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md">Missing File</span>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'verdict' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-navy" />
                    <span className="font-bold text-navy text-sm">Pre-Submission Readiness Status</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-md border border-amber-200">
                    NEEDS ATTENTION
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-border-subtle space-y-3 card-hover-lift">
                  <p className="text-xs text-navy font-bold">Recommended Rectification Steps Before Portal Submission:</p>
                  <ul className="text-xs text-slate-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Correct Income Certificate birth year from 2004 to 2005 at Tehsil/e-District office.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Attach an affidavit or name clarification letter for initial variation (Rahul S. Sharma).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-navy text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Upload the signed scholarship application form before final deadline.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* 3. PROBLEM SECTION: The Hidden Rejection Traps (with confusion.jpg) */}
      <section id="traps" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="reveal-init text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600">The Problem</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy mt-1 mb-3">The Hidden Rejection Traps</h2>
          <p className="text-sm sm:text-base text-muted-text max-w-xl mx-auto">
            Portals employ strict automated verification filters. A single misaligned field results in silent rejection.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Photo of Frustrated Indian Student Examining Conflicting Documents */}
          <div className="lg:col-span-5 relative">
            <div className="reveal-fade rounded-3xl overflow-hidden border border-border-subtle shadow-md bg-white img-reveal-box">
              <img 
                src="/images/confusion.jpg" 
                alt="Indian student stressed over conflicting printed paperwork" 
                className="w-full h-[380px] object-cover object-center"
              />
              <div className="p-4 bg-white border-t border-border-subtle">
                <p className="text-xs font-bold text-navy">The Silent Disqualification</p>
                <p className="text-xs text-muted-text mt-1 leading-relaxed">
                  Applicants rarely learn why they were disqualified. Strict automated filters reject applications for minor clerical typos before an officer ever reviews them.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: The 4 Common Rejection Traps Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="reveal-init reveal-delay-75 bg-white p-5 rounded-2xl border border-border-subtle shadow-xs card-hover-lift">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-navy mb-1.5 text-base">Inconsistent Names & Dates</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Middle initials (Rahul S. Sharma vs Rahul Sharma) or different birth years across Aadhaar and Income certificates trigger automatic portal rejection.
              </p>
            </div>

            <div className="reveal-init reveal-delay-150 bg-white p-5 rounded-2xl border border-border-subtle shadow-xs card-hover-lift">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-navy mb-1.5 text-base">Missing Mandatory Files</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Forgetting the signed application summary or specific category quota certificates causes immediate ineligibility during scrutiny.
              </p>
            </div>

            <div className="reveal-init reveal-delay-225 bg-white p-5 rounded-2xl border border-border-subtle shadow-xs card-hover-lift">
              <div className="w-10 h-10 rounded-xl bg-secondary-light text-secondary-blue flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-navy mb-1.5 text-base">Expired Certificates</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Income and domicile certificates must be from the active financial year. Submitting certificates older than 1 year leads to rejection.
              </p>
            </div>

            <div className="reveal-init reveal-delay-300 bg-white p-5 rounded-2xl border border-border-subtle shadow-xs card-hover-lift">
              <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy flex items-center justify-center mb-3">
                <FileSearch className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-navy mb-1.5 text-base">Unreadable Scan Quality</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Blurry photos, inverted colors, or corrupted PDF text streams prevent verification officers from confirming authenticity.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. SOLUTION SECTION: The DocuReady Difference (with solution.jpg) */}
      <section id="solution" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-border-subtle p-6 sm:p-12 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Solution Capabilities */}
            <div className="lg:col-span-7 space-y-6">
              <div className="reveal-init">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-accent">The Solution</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-navy mt-1 mb-3">
                  Pre-Submission Precision Before Scrutiny
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  DocuReady executes a rigorous simulation of institutional verification rules, giving applicants actionable clarity before submission deadlines.
                </p>
              </div>

              <div className="space-y-4">
                <div className="reveal-init reveal-delay-75 flex items-start gap-3.5 p-3 rounded-2xl border border-transparent hover:border-border-subtle hover:bg-canvas transition">
                  <div className="w-8 h-8 rounded-xl bg-teal-light text-teal-dark flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-navy">Multi-Format OCR Engine</h4>
                    <p className="text-xs text-muted-text mt-0.5">
                      Extracts names, dates of birth, issue dates, and certificate numbers directly from PDF documents and image scans.
                    </p>
                  </div>
                </div>

                <div className="reveal-init reveal-delay-150 flex items-start gap-3.5 p-3 rounded-2xl border border-transparent hover:border-border-subtle hover:bg-canvas transition">
                  <div className="w-8 h-8 rounded-xl bg-secondary-light text-secondary-blue flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-4 h-4 text-secondary-blue" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-navy">Comprehensive Discrepancy Matrix</h4>
                    <p className="text-xs text-muted-text mt-0.5">
                      Cross-checks fields across Aadhaar, marksheets, and income records, flagging exact mismatches and initial variations.
                    </p>
                  </div>
                </div>

                <div className="reveal-init reveal-delay-225 flex items-start gap-3.5 p-3 rounded-2xl border border-transparent hover:border-border-subtle hover:bg-canvas transition">
                  <div className="w-8 h-8 rounded-xl bg-navy-50 text-navy flex items-center justify-center shrink-0 mt-0.5">
                    <UserCheck className="w-4 h-4 text-navy" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-navy">Human-in-the-Loop Review</h4>
                    <p className="text-xs text-muted-text mt-0.5">
                      Inspect confidence scores, review extracted values, and correct misread characters inline before finalizing your audit report.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Confident Student Giving Thumbs Up */}
            <div className="lg:col-span-5 relative">
              <div className="reveal-fade rounded-2xl overflow-hidden border border-border-subtle shadow-md bg-canvas img-reveal-box">
                <img 
                  src="/images/solution.jpg" 
                  alt="Confident Indian student holding laptop with verified documents on campus" 
                  className="w-full h-[360px] object-cover object-center"
                />
                <div className="p-4 bg-white border-t border-border-subtle flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-navy">Pre-Submission Status</p>
                    <p className="text-[11px] text-teal-accent font-semibold">Ready for Official Portal Submission</p>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-teal-light text-teal-accent flex items-center justify-center shadow-2xs">
                    <Check className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS: Fully Visible Desktop & Mobile Workflow Pipeline */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="reveal-fade bg-white rounded-3xl border border-border-subtle p-6 sm:p-10 lg:p-12 shadow-xs">
          
          {/* Section Heading */}
          <div className="text-center mb-10 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary-blue">Step-by-Step</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy mt-1 mb-2">The Complete Pre-Submission Workflow</h2>
            <p className="text-sm text-muted-text">Every audit runs through an actual verification engine</p>
          </div>

          {/* DESKTOP PRESENTATION (md and above): Connected Line with Numbers and Cards Aligned Directly Beneath */}
          <div className="hidden md:block">
            {/* Horizontal Connecting Track with Numbered Indicators */}
            <div className="relative mb-8">
              {/* Connecting Horizontal Line */}
              <div className="absolute top-5 left-16 right-16 h-1 bg-border-subtle rounded-full z-0 overflow-hidden">
                <div 
                  className="h-full bg-linear-to-r from-navy via-secondary-blue to-teal-accent transition-all duration-500"
                  style={{ width: `${((activeWorkflowStage - 1) / 3) * 100}%` }}
                />
              </div>

              {/* Numbered Indicators Row */}
              <div className="grid grid-cols-4 gap-6 relative z-10">
                {WORKFLOW_STEPS.map((step) => {
                  const isCurrent = activeWorkflowStage === step.num;
                  const isPassed = activeWorkflowStage >= step.num;
                  return (
                    <div key={step.num} className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setActiveWorkflowStage(step.num)}
                        aria-label={`Step ${step.num}: ${step.title}`}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 cursor-pointer ${
                          isCurrent
                            ? 'bg-navy text-white ring-4 ring-navy-100 shadow-md scale-110'
                            : isPassed
                              ? 'bg-teal-accent text-white shadow-xs'
                              : 'bg-white border-2 border-border-subtle text-muted-text hover:border-navy'
                        }`}
                      >
                        {step.num}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop Stage Content Cards Beneath Numbered Indicators */}
            <div className="grid grid-cols-4 gap-6">
              {WORKFLOW_STEPS.map((step) => {
                const IconComponent = step.icon;
                const isCurrent = activeWorkflowStage === step.num;
                return (
                  <div
                    key={step.num}
                    onClick={() => setActiveWorkflowStage(step.num)}
                    onMouseEnter={() => setActiveWorkflowStage(step.num)}
                    className={`p-5 rounded-2xl border transition-all duration-300 text-left space-y-3 cursor-pointer card-hover-lift ${
                      isCurrent
                        ? 'bg-white border-navy ring-2 ring-navy/10 shadow-sm'
                        : 'bg-canvas border-border-subtle hover:border-border-card hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                        isCurrent ? 'bg-navy text-white' : 'bg-navy-50 text-navy'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isCurrent 
                          ? 'bg-teal-light text-teal-dark border border-teal-accent/30' 
                          : 'bg-white border border-border-subtle text-muted-text'
                      }`}>
                        Stage 0{step.num}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-navy text-base">{step.title}</h4>
                      <p className="text-xs text-muted-text leading-relaxed mt-1.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MOBILE PRESENTATION (< md): Clean Vertical Timeline */}
          <div className="block md:hidden relative pl-6 space-y-5">
            {/* Continuous Vertical Timeline Line */}
            <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-border-subtle">
              <div 
                className="w-full bg-linear-to-b from-navy via-secondary-blue to-teal-accent transition-all duration-500"
                style={{ height: `${(activeWorkflowStage / 4) * 100}%` }}
              />
            </div>

            {WORKFLOW_STEPS.map((step) => {
              const IconComponent = step.icon;
              const isCurrent = activeWorkflowStage === step.num;
              const isPassed = activeWorkflowStage >= step.num;
              return (
                <div 
                  key={step.num}
                  onClick={() => setActiveWorkflowStage(step.num)}
                  className="relative flex items-start gap-3.5 group cursor-pointer"
                >
                  {/* Timeline Node Circle */}
                  <div className={`-ml-6 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all z-10 ${
                    isCurrent
                      ? 'bg-navy text-white ring-4 ring-navy-100 shadow-xs'
                      : isPassed
                        ? 'bg-teal-accent text-white'
                        : 'bg-white border-2 border-border-subtle text-muted-text'
                  }`}>
                    {step.num}
                  </div>

                  {/* Timeline Card Content */}
                  <div className={`flex-1 p-4 rounded-2xl border transition-all text-left ${
                    isCurrent 
                      ? 'bg-white border-navy ring-2 ring-navy/10 shadow-xs' 
                      : 'bg-canvas border-border-subtle'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isCurrent ? 'bg-navy text-white' : 'bg-navy-50 text-navy'
                        }`}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="font-bold text-navy text-sm">{step.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-text">
                        0{step.num}
                      </span>
                    </div>
                    <p className="text-xs text-muted-text leading-relaxed pl-9">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 6. HUMAN IMPACT & STUDENT EMPOWERMENT SECTION (with human.png) */}
      <section id="impact" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="reveal-fade bg-navy rounded-3xl overflow-hidden border border-navy-light text-white shadow-xl img-reveal-box">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            
            {/* Left Photo Showcase */}
            <div className="lg:col-span-5 h-full min-h-[320px]">
              <img 
                src="/images/human.png" 
                alt="Group of jubilant Indian college students celebrating verified application admission" 
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* Right Content */}
            <div className="lg:col-span-7 p-8 sm:p-12 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-teal-light text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-teal-accent" />
                <span>Human-Centred Mission</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                Empowering Students to Submit with Absolute Confidence
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                DocuReady was created with a single objective: to ensure no hardworking applicant loses a scholarship, admission seat, or welfare grant because of clerical discrepancies that could have been resolved before clicking submit.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-accent/20 text-teal-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Full Privacy Guarantee</h5>
                    <p className="text-[11px] text-slate-400">Zero persistent retention of Aadhaar or income numbers</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-accent/20 text-teal-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Actionable Rectifications</h5>
                    <p className="text-[11px] text-slate-400">Exact guidance on which office to visit or affidavit to draft</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. SUPPORTED CATEGORIES */}
      <section id="categories" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="reveal-init text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-secondary-blue">Compliance Rules</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy mt-1 mb-2">Supported Application Categories</h2>
          <p className="text-sm text-muted-text">Configurable compliance rules for distinct government and academic bodies</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Scholarships */}
          <div className="reveal-init reveal-delay-75 bg-white p-6 rounded-2xl border border-border-subtle shadow-xs flex flex-col justify-between hover:border-border-card transition card-hover-lift">
            <div>
              <div className="w-12 h-12 rounded-xl bg-secondary-light text-secondary-blue flex items-center justify-center mb-4 shadow-2xs">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-navy text-lg mb-2">Scholarship Applications</h3>
              <p className="text-xs text-muted-text mb-4 leading-relaxed">
                Central Sector, Merit-cum-Means, and State Higher Education scholarships.
              </p>
              <ul className="text-xs text-slate-600 space-y-2.5 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-accent shrink-0" />
                  <span>Mandates Income Certificate ≤ 1 year old</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-accent shrink-0" />
                  <span>Marksheet score and roll number verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-accent shrink-0" />
                  <span>Cross-checks Name & DOB across all documents</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setView('new-audit')}
              className="w-full py-2.5 rounded-xl border border-border-subtle text-navy text-xs font-bold hover:bg-navy-50 transition cursor-pointer"
            >
              Start Scholarship Audit
            </button>
          </div>

          {/* Card 2: Admissions */}
          <div className="reveal-init reveal-delay-150 bg-white p-6 rounded-2xl border border-border-subtle shadow-xs flex flex-col justify-between hover:border-border-card transition card-hover-lift">
            <div>
              <div className="w-12 h-12 rounded-xl bg-navy-50 text-navy flex items-center justify-center mb-4 shadow-2xs">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-navy text-lg mb-2">College & University Admissions</h3>
              <p className="text-xs text-muted-text mb-4 leading-relaxed">
                Central counseling, undergraduate, and postgraduate institutional enrollments.
              </p>
              <ul className="text-xs text-slate-600 space-y-2.5 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-accent shrink-0" />
                  <span>Aadhaar / Passport identity cross-verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-accent shrink-0" />
                  <span>Passing marks card consistency check</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-accent shrink-0" />
                  <span>Initial & middle name variation detection</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setView('new-audit')}
              className="w-full py-2.5 rounded-xl border border-border-subtle text-navy text-xs font-bold hover:bg-navy-50 transition cursor-pointer"
            >
              Start Admission Audit
            </button>
          </div>

          {/* Card 3: Government Schemes */}
          <div className="reveal-init reveal-delay-225 bg-white p-6 rounded-2xl border border-border-subtle shadow-xs flex flex-col justify-between hover:border-border-card transition card-hover-lift">
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-light text-teal-dark flex items-center justify-center mb-4 shadow-2xs">
                <Landmark className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-navy text-lg mb-2">Government Schemes & DBT</h3>
              <p className="text-xs text-muted-text mb-4 leading-relaxed">
                Direct Benefit Transfer, youth skill allowances, and domicile welfare grants.
              </p>
              <ul className="text-xs text-slate-600 space-y-2.5 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-accent shrink-0" />
                  <span>Statutory revenue authority verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-accent shrink-0" />
                  <span>Strict DOB alignment to prevent DBT bounce</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-accent shrink-0" />
                  <span>Income threshold ceiling detection</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setView('new-audit')}
              className="w-full py-2.5 rounded-xl border border-border-subtle text-navy text-xs font-bold hover:bg-navy-50 transition cursor-pointer"
            >
              Start Scheme Audit
            </button>
          </div>
        </div>
      </section>

      {/* 8. GRAND FINALE CLOSING CTA BANNER */}
      <section id="get-started" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="reveal-fade bg-linear-to-br from-navy via-navy to-secondary-dark rounded-3xl p-8 sm:p-14 text-center text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-teal-light text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-accent" />
              <span>Zero Submission Regret</span>
            </span>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to audit your application documents?
            </h2>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl mx-auto">
              Avoid preventable disqualifications. Run a pre-submission verification audit in under 2 minutes and submit your scholarship or college admission with 100% confidence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <button
                onClick={() => setView('new-audit')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-teal-accent text-white font-bold hover:bg-teal-dark transition shadow-lg flex items-center justify-center gap-2 text-base cursor-pointer card-hover-lift"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Start Application Audit</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>

              <button
                onClick={onQuickDemo}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 transition flex items-center justify-center gap-2 text-base cursor-pointer card-hover-lift"
              >
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>Run Synthetic Demo Case</span>
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
