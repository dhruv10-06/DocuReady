// client/src/pages/LandingPage.jsx

import React from 'react';
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
  DownloadCloud
} from 'lucide-react';

export default function LandingPage({ setView, onQuickDemo, activeAuditId, onResumeAudit }) {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="pt-12 pb-6 text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Intelligent Pre-Submission Verification
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
          Catch application-ending errors <br className="hidden sm:inline" />
          <span className="text-blue-600">before you click submit.</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
          Every year, thousands of qualified applicants are disqualified from scholarships, university admissions, and government schemes due to preventable cross-document discrepancies and missing paperwork.
        </p>

        {/* Active In-Progress Audit Resume Banner */}
        {activeAuditId && (
          <div className="max-w-md mx-auto mb-8 p-3.5 bg-blue-50/90 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-xs">
            <div className="flex items-center gap-2.5 text-blue-900 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>You have an active in-progress audit session.</span>
            </div>
            <button
              onClick={onResumeAudit}
              className="px-3.5 py-1.5 font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 rounded-xl transition shadow-2xs shrink-0"
            >
              Resume Audit →
            </button>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setView('new-audit')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 text-base"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Start New Application Audit</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={onQuickDemo}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 font-semibold hover:bg-amber-100 transition shadow-xs flex items-center justify-center gap-2 text-base"
          >
            <Sparkles className="w-5 h-5 text-amber-600" />
            <span>Run Synthetic Demo Case</span>
          </button>
        </div>

        {/* Synthetic Demo Banner Callout */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 text-left max-w-3xl mx-auto shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-bold text-slate-900 text-sm">Synthetic Benchmark Scenario:</span>
                <span className="px-2 py-0.5 bg-amber-200/60 text-amber-900 text-xs font-semibold rounded-md">
                  Rahul Sharma (Scholarship)
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluates a realistic scenario: <strong>Identity Proof</strong> (Rahul Sharma, DOB 12/05/2005) vs <strong>Marksheet</strong> (Rahul S. Sharma, DOB 12/05/2005) vs <strong>Income Certificate</strong> (Rahul Sharma, DOB 12/05/2004) with a missing Application Form. Identifies the initial variation, DOB mismatch, and missing mandatory document.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The 4 Common Rejection Traps */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">The Hidden Rejection Traps</h2>
          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
            Portals employ strict automated verification filters. A single misaligned field results in silent rejection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1.5 text-base">Inconsistent Names & Dates</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Middle initials (Rahul S. Sharma vs Rahul Sharma) or different birth years across Aadhaar and Income certificates trigger automatic portal rejection.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1.5 text-base">Missing Mandatory Files</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Forgetting the signed application summary or specific category quota certificates causes immediate ineligibility during scrutiny.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1.5 text-base">Expired Certificates</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Income and domicile certificates must be from the active financial year. Submitting certificates older than 1 year leads to rejection.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <FileSearch className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1.5 text-base">Unreadable Scan Quality</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Blurry photos, inverted colors, or corrupted PDF text streams prevent verification officers from confirming authenticity.
            </p>
          </div>
        </div>
      </section>

      {/* How DocuReady Works - 4 Steps */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xs">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">The Complete Pre-Submission Workflow</h2>
            <p className="text-sm text-slate-500">Every audit runs through an actual verification engine</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="text-left space-y-2">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm mb-3">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Select Category</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Configure tailored criteria for Scholarships, College Admissions, or Welfare Schemes.
              </p>
            </div>

            <div className="text-left space-y-2">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm mb-3">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Upload & OCR Extract</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tesseract.js OCR and PDF parsers extract names, dates of birth, cert numbers, and issue dates.
              </p>
            </div>

            <div className="text-left space-y-2">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm mb-3">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Review & Correct</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Review OCR outputs with confidence scores. Edit fields inline to ensure 100% data integrity.
              </p>
            </div>

            <div className="text-left space-y-2">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm mb-3">
                4
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Audit Report & Fixes</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Get readiness status (READY FOR REVIEW, NEEDS ATTENTION, INCOMPLETE) and actionable fix checklists.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Categories */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Supported Application Categories</h2>
          <p className="text-sm text-slate-500">Configurable compliance rules for distinct government and academic bodies</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Scholarship Applications</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Central Sector, Merit-cum-Means, and State Higher Education scholarships.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Mandates Income Certificate ≤ 1 year old</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Marksheet score and roll number verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Cross-checks Name & DOB across all 4 documents</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setView('new-audit')}
              className="w-full py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Start Scholarship Audit
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">College & University Admissions</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Central counseling, undergraduate, and postgraduate institutional enrollments.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Aadhaar / Passport identity cross-verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Passing marks card consistency check</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Initial & middle name variation detection</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setView('new-audit')}
              className="w-full py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Start Admission Audit
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <Landmark className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Government Schemes & DBT</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Direct Benefit Transfer, youth skill allowances, and domicile welfare grants.
              </p>
              <ul className="text-xs text-slate-600 space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Statutory revenue authority verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Strict DOB alignment to prevent DBT bounce</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Income threshold ceiling detection</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => setView('new-audit')}
              className="w-full py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
            >
              Start Scheme Audit
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

