// client/src/components/wizard/StepVerification.jsx

import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  FileText, 
  FileX, 
  EyeOff, 
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export default function StepVerification({
  report,
  audit,
  onNext,
  onBack,
}) {
  if (!report) {
    return (
      <div className="p-12 text-center text-slate-500 max-w-xl mx-auto">
        <p>No verification report generated yet. Please run the verification engine.</p>
      </div>
    );
  }

  const {
    overallStatus,
    statusBadgeText,
    statusColor,
    metrics,
    crossDocDiscrepancies,
    missingDocuments,
    unreadableDocuments,
    auditChecks,
  } = report;

  const getStatusColorClasses = () => {
    if (statusColor === 'emerald' || overallStatus === 'READY_FOR_REVIEW') {
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-800',
        badge: 'bg-emerald-600 text-white',
      };
    }
    if (statusColor === 'amber' || overallStatus === 'NEEDS_ATTENTION') {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        badge: 'bg-amber-600 text-white',
      };
    }
    return {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-800',
      badge: 'bg-rose-600 text-white',
    };
  };

  const colors = getStatusColorClasses();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Step 4: Cross-Document Verification Results
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          The verification engine cross-checked extracted fields across documents against {report.category?.title} requirements.
        </p>
      </div>

      {/* Primary Verification Status Banner */}
      <div className={`p-6 rounded-2xl border ${colors.bg} ${colors.border} shadow-xs`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${colors.badge}`}>
                {statusBadgeText}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Application Category: {report.category?.title}
              </span>
            </div>
            <p className={`text-sm font-semibold ${colors.text} pt-1`}>
              {report.summaryNotes}
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 shrink-0 bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-slate-200/60 text-xs">
            <div className="text-center px-2">
              <div className="font-bold text-slate-900 text-sm">{metrics.totalChecks}</div>
              <div className="text-[10px] text-slate-500 uppercase">Checks</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-center px-2">
              <div className="font-bold text-emerald-600 text-sm">{metrics.passedChecks}</div>
              <div className="text-[10px] text-slate-500 uppercase">Passed</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-center px-2">
              <div className="font-bold text-amber-600 text-sm">{metrics.warningChecks}</div>
              <div className="text-[10px] text-slate-500 uppercase">Warnings</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-center px-2">
              <div className="font-bold text-rose-600 text-sm">{metrics.failedChecks}</div>
              <div className="text-[10px] text-slate-500 uppercase">Discrepancies</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Document Discrepancy Matrix (Side-by-Side Comparison) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Cross-Document Discrepancies & Variations</h3>
            <p className="text-xs text-slate-500">
              Identified field-by-field differences showing exact source documents and extracted values.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {crossDocDiscrepancies.length} Item(s)
          </span>
        </div>

        {crossDocDiscrepancies.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p className="font-semibold text-slate-800">No cross-document discrepancies detected!</p>
            <p className="text-slate-400">Candidate names, dates of birth, and validity are consistent across all files.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {crossDocDiscrepancies.map((disc, idx) => {
              const isCritical = disc.severity === 'CRITICAL';
              return (
                <div 
                  key={idx}
                  className={`p-4 rounded-xl border text-xs transition ${
                    isCritical 
                      ? 'bg-rose-50/40 border-rose-200 ring-1 ring-rose-200/50' 
                      : 'bg-amber-50/40 border-amber-200'
                  }`}
                >
                  {/* Discrepancy Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        isCritical ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {disc.severity} {disc.field.replace(/_/g, ' ')}
                      </span>
                      {disc.type && (
                        <span className="text-[11px] font-mono text-slate-500">
                          [{disc.type}]
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Item #{idx + 1}</span>
                  </div>

                  {/* Side-by-side values */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Source A: {disc.sourceA}
                      </span>
                      <p className="font-bold text-slate-900 text-sm">{disc.valueA}</p>
                      {disc.docCategoryA && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {disc.docCategoryA.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Source B: {disc.sourceB}
                      </span>
                      <p className="font-bold text-slate-900 text-sm">{disc.valueB}</p>
                      {disc.docCategoryB && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {disc.docCategoryB.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Explanation & Actionable Recommendation */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                    <p className="font-medium text-slate-800">{disc.message}</p>
                    <p className="text-slate-600 flex items-start gap-1.5">
                      <strong className="text-slate-900 shrink-0">Recommendation:</strong>
                      <span>{disc.recommendation}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Missing, Unreadable, and Unverified Mandatory Documents */}
      <div className={`grid grid-cols-1 ${(report.unverifiedDocuments?.length > 0) ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-5`}>
        {/* Missing Documents Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileX className="w-5 h-5 text-rose-600" />
            <h4 className="font-bold text-slate-900 text-sm">
              Missing Mandatory Docs ({missingDocuments.length})
            </h4>
          </div>

          {missingDocuments.length === 0 ? (
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 py-2">
              <CheckCircle2 className="w-4 h-4" />
              All required mandatory document categories are uploaded.
            </p>
          ) : (
            <div className="space-y-2">
              {missingDocuments.map((mDoc, i) => (
                <div key={i} className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-rose-900">
                    <span>{mDoc.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-bold">
                      REQUIRED
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700 mt-1">{mDoc.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unreadable Documents Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <EyeOff className="w-5 h-5 text-amber-600" />
            <h4 className="font-bold text-slate-900 text-sm">
              Unreadable Scans ({unreadableDocuments.length})
            </h4>
          </div>

          {unreadableDocuments.length === 0 ? (
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 py-2">
              <CheckCircle2 className="w-4 h-4" />
              All uploaded document scans are readable.
            </p>
          ) : (
            <div className="space-y-2">
              {unreadableDocuments.map((uDoc, i) => (
                <div key={i} className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-xs">
                  <div className="font-bold text-amber-900">{uDoc.filename}</div>
                  <p className="text-[11px] text-amber-700 mt-1">{uDoc.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unverified Documents Card (Displayed when present) */}
        {report.unverifiedDocuments?.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-slate-900 text-sm">
                Unverified Content ({report.unverifiedDocuments.length})
              </h4>
            </div>

            <div className="space-y-2">
              {report.unverifiedDocuments.map((uDoc, i) => (
                <div key={i} className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 text-xs">
                  <div className="font-bold text-blue-900">{uDoc.filename}</div>
                  <p className="text-[11px] text-blue-700 mt-1">{uDoc.reason || 'Document indicators could not be confirmed.'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Rule Checks Log */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Evaluated Rule Checks ({auditChecks.length})
        </h4>

        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
          {auditChecks.map((check) => {
            const isPassed = check.status === 'PASSED';
            const isWarning = check.status === 'WARNING';
            const isUnverified = check.status === 'UNVERIFIED';
            return (
              <div key={check.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  {isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : isUnverified ? (
                    <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-900">{check.title}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{check.details}</p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  isPassed
                    ? 'bg-emerald-50 text-emerald-700'
                    : isWarning || isUnverified
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {check.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Review</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm flex items-center gap-2 shadow-sm shadow-blue-600/20"
        >
          <span>View Final Audit Report</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

