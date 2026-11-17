// client/src/components/wizard/StepReport.jsx

import React, { useState } from 'react';
import { 
  Printer, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ShieldAlert, 
  FileCheck2, 
  ArrowLeft, 
  RotateCcw, 
  Sparkles,
  Download,
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { deleteAudit } from '../../services/api';

export default function StepReport({
  report,
  audit,
  onReset,
  setView,
}) {
  const [completedActions, setCompletedActions] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);

  if (!report) {
    return <div className="p-8 text-center text-slate-500">Audit report not found.</div>;
  }

  const {
    overallStatus,
    statusBadgeText,
    statusColor,
    readinessScore,
    summaryNotes,
    metrics,
    crossDocDiscrepancies,
    missingDocuments,
    unreadableDocuments,
    correctiveActions,
    verifiedAt,
  } = report;

  const toggleAction = (index) => {
    setCompletedActions(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteAudit = async () => {
    if (window.confirm('Are you sure you want to permanently delete this audit and wipe all uploaded documents from temporary storage? This cannot be undone.')) {
      try {
        setIsDeleting(true);
        await deleteAudit(audit.id);
        alert('All uploaded files and audit data have been permanently wiped.');
        setView('dashboard');
      } catch (err) {
        alert(`Failed to delete audit: ${err.message}`);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getStatusTheme = () => {
    if (statusColor === 'emerald' || overallStatus === 'READY_FOR_REVIEW') {
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        text: 'text-emerald-900',
        badge: 'bg-emerald-600 text-white',
        bar: 'bg-emerald-600',
      };
    }
    if (statusColor === 'amber' || overallStatus === 'NEEDS_ATTENTION') {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-900',
        badge: 'bg-amber-600 text-white',
        bar: 'bg-amber-500',
      };
    }
    return {
      bg: 'bg-rose-50',
      border: 'border-rose-300',
      text: 'text-rose-900',
      badge: 'bg-rose-600 text-white',
      bar: 'bg-rose-600',
    };
  };

  const theme = getStatusTheme();

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Top Action Bar (no-print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('dashboard')}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <span className="text-xs text-slate-400">|</span>
          <span className="text-xs font-mono text-slate-500">Audit ID: {audit.id.slice(0, 12)}</span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>

          <button
            onClick={onReset}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Audit</span>
          </button>

          <button
            onClick={handleDeleteAudit}
            disabled={isDeleting}
            className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition flex items-center gap-1.5 shadow-2xs"
            title="Permanently wipe uploaded files from storage"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>{isDeleting ? 'Wiping...' : 'Delete & Wipe Files'}</span>
          </button>
        </div>
      </div>

      {/* Main Printable Audit Report Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 print:border-none print:shadow-none print:p-0">
        
        {/* Report Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">DocuReady</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                Official Pre-Submission Audit
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Cross-Document Verification & Application Readiness Audit
            </p>
          </div>

          <div className="text-right text-xs text-slate-500 space-y-0.5">
            <div><strong>Audit Reference:</strong> <span className="font-mono">{audit.id}</span></div>
            <div><strong>Generated At:</strong> {new Date(verifiedAt).toLocaleString()}</div>
            <div><strong>Applicant:</strong> {audit.applicantName || 'Anonymous'}</div>
            <div><strong>Category:</strong> {report.category?.title}</div>
          </div>
        </div>

        {/* Readiness Status Banner */}
        <div className={`p-6 rounded-2xl border ${theme.bg} ${theme.border} space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${theme.badge}`}>
                  {statusBadgeText}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  Readiness Score: {readinessScore}%
                </span>
              </div>
              <p className={`text-sm font-semibold ${theme.text}`}>
                {summaryNotes}
              </p>
            </div>

            {/* Score Radial / Progress */}
            <div className="sm:text-right shrink-0">
              <div className="text-3xl font-extrabold text-slate-900">{readinessScore}/100</div>
              <div className="text-[11px] font-medium text-slate-500 uppercase">Application Health Index</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
            <div 
              className={`h-full ${theme.bar} transition-all duration-500`}
              style={{ width: `${readinessScore}%` }}
            />
          </div>
        </div>

        {/* Summary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-2xl font-bold text-slate-900">{metrics.totalChecks}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Total Checks</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-2xl font-bold text-emerald-600">{metrics.passedChecks}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Passed Checks</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-2xl font-bold text-amber-600">{metrics.warningChecks}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Warnings</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <div className="text-2xl font-bold text-rose-600">{metrics.failedChecks}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Discrepancies</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center col-span-2 sm:col-span-1">
            <div className="text-2xl font-bold text-slate-900">{missingDocuments.length}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Missing Docs</div>
          </div>
        </div>

        {/* Prioritized Actionable Checklist */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span>Prioritized Corrective Action Checklist</span>
            </h3>
            <span className="text-xs text-slate-400">
              {Object.values(completedActions).filter(Boolean).length} of {correctiveActions.length} completed
            </span>
          </div>

          {correctiveActions.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>No corrective actions needed. Your application passes all cross-document rules!</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {correctiveActions.map((item, idx) => {
                const isDone = completedActions[idx];
                const isHigh = item.priority === 'HIGH';
                return (
                  <div
                    key={idx}
                    onClick={() => toggleAction(idx)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex items-start gap-3 ${
                      isDone
                        ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                        : isHigh
                          ? 'bg-white border-rose-200 hover:border-rose-300 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <button type="button" className="shrink-0 mt-0.5 text-blue-600">
                      {isDone ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isHigh ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.priority} PRIORITY
                        </span>
                        <span className="font-semibold text-slate-800">{item.category}</span>
                        {item.targetDocument && (
                          <span className="text-[11px] text-slate-400">({item.targetDocument})</span>
                        )}
                      </div>
                      <p className="text-slate-600 leading-relaxed">{item.action}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cross-Document Discrepancies Table */}
        {crossDocDiscrepancies.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Identified Discrepancies Breakdown
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="p-3">Field</th>
                    <th className="p-3">Source Document A</th>
                    <th className="p-3">Source Document B</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {crossDocDiscrepancies.map((disc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">
                        {disc.field.replace(/_/g, ' ')}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{disc.valueA}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{disc.sourceA}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{disc.valueB}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{disc.sourceB}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          disc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {disc.severity}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-600">
                        {disc.recommendation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Mandatory Documents Status */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Document Categories Compliance
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {report.category?.mandatoryDocuments?.map((mDoc, idx) => {
              const isMissing = missingDocuments.some(m => m.type === mDoc.type);
              const isUnreadable = unreadableDocuments.some(u => u.docCategory === mDoc.type);
              const isUnverified = (report.unverifiedDocuments || []).some(u => u.type === mDoc.type);

              let statusText = 'VERIFIED';
              let badgeClasses = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
              let cardClasses = 'bg-slate-50 border-slate-200 text-slate-800';

              if (isMissing) {
                statusText = 'MISSING';
                badgeClasses = 'bg-rose-100 text-rose-800 border border-rose-200';
                cardClasses = 'bg-rose-50/50 border-rose-200 text-rose-900';
              } else if (isUnreadable) {
                statusText = 'UNREADABLE';
                badgeClasses = 'bg-rose-100 text-rose-800 border border-rose-200';
                cardClasses = 'bg-rose-50/50 border-rose-200 text-rose-900';
              } else if (isUnverified) {
                statusText = 'UNVERIFIED';
                badgeClasses = 'bg-amber-100 text-amber-800 border border-amber-200';
                cardClasses = 'bg-amber-50/50 border-amber-200 text-amber-900';
              }

              return (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border flex items-center justify-between ${cardClasses}`}
                >
                  <div>
                    <span className="font-bold block">{mDoc.name}</span>
                    <span className="text-[11px] text-slate-500">{mDoc.description}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${badgeClasses}`}>
                    {statusText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Advisory Disclaimer Notice (Mandated by Section 2 and 6) */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-wider text-[11px]">Official Disclaimer & Scope of Audit</p>
            <p className="text-amber-800 leading-relaxed text-[11px]">
              DocuReady is an advisory pre-submission auditing system. <strong>Never assume that passing an audit guarantees institutional admission, scholarship disbursement, or government approval.</strong> Official authorities retain final discretionary verification powers. Applicants must cross-reference their specific guidelines.
            </p>
          </div>
        </div>

        {/* Audit Metadata & Privacy Signoff */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <span>Processed via DocuReady Engine v1.0 • Privacy Zero-Retention</span>
          <span className="font-mono">Audit Fingerprint: {audit.id}</span>
        </div>
      </div>
    </div>
  );
}

