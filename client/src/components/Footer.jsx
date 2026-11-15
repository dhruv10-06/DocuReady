// client/src/components/Footer.jsx

import React from 'react';
import { ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pb-6 border-b border-slate-100 text-xs text-slate-500">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">Advisory Pre-Submission Scope</p>
              <p>DocuReady audits document compliance against known portal standards. It is not an official government or college admissions authority and does not guarantee acceptance.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">Privacy & Ephemeral Storage</p>
              <p>Uploaded documents are processed locally in temporary memory. Files can be permanently wiped with one click using the "Delete Audit" feature.</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800 mb-0.5">Transparent Verification</p>
              <p>Every identified variation shows source document names and extracted values so applicants can verify and explain discrepancies before submission.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© 2026 DocuReady. Built for Hackathon demonstration & high-rigor application verification.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Local Engine Online
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

