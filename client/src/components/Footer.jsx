// client/src/components/Footer.jsx

import React from 'react';
import { ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[#E7EDF3] bg-white no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Three Advisory & Trust Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 pb-8 border-b border-[#E7EDF3]">
          <div className="bg-[#F8FAFC] p-4.5 rounded-2xl border border-[#E7EDF3] flex items-start gap-3.5 shadow-2xs">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="font-heading font-bold text-xs uppercase tracking-wider text-[#142B4A] mb-1">
                Advisory Pre-Submission Scope
              </p>
              <p className="text-xs text-[#64748B] leading-relaxed">
                DocuReady audits document compliance against known portal standards. It is not an official government or college admissions authority and does not guarantee acceptance.
              </p>
            </div>
          </div>

          <div className="bg-[#F8FAFC] p-4.5 rounded-2xl border border-[#E7EDF3] flex items-start gap-3.5 shadow-2xs">
            <div className="p-2 rounded-xl bg-[#EBF2FA] text-[#3567A8] border border-[#3567A8]/20 shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-heading font-bold text-xs uppercase tracking-wider text-[#142B4A] mb-1">
                Privacy & Ephemeral Storage
              </p>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Uploaded documents are processed locally in temporary memory. Files can be permanently wiped with one click using the "Delete Audit" feature.
              </p>
            </div>
          </div>

          <div className="bg-[#F8FAFC] p-4.5 rounded-2xl border border-[#E7EDF3] flex items-start gap-3.5 shadow-2xs">
            <div className="p-2 rounded-xl bg-[#E6F7F5] text-[#159C91] border border-[#159C91]/30 shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-heading font-bold text-xs uppercase tracking-wider text-[#142B4A] mb-1">
                Transparent Verification
              </p>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Every identified variation shows source document names and extracted values so applicants can verify and explain discrepancies before submission.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Metadata & System Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-4">
          <p>© 2026 DocuReady. Built for Hackathon demonstration & high-rigor application verification.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F7F5] text-[#0E6B63] border border-[#159C91]/30 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-[#159C91] animate-pulse"></span>
              Local Engine Online
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
