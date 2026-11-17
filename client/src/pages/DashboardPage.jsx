// client/src/pages/DashboardPage.jsx

import React, { useEffect, useState } from 'react';
import { 
  FileCheck2, 
  Plus, 
  Sparkles, 
  Trash2, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { fetchAudits, deleteAudit } from '../services/api';

export default function DashboardPage({ 
  setView, 
  onSelectAudit, 
  onQuickDemo,
  activeAuditId,
  onAuditDeleted
}) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAudits = async () => {
    try {
      setLoading(true);
      const data = await fetchAudits();
      setAudits(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this audit session? All uploaded files will be permanently wiped.')) {
      try {
        await deleteAudit(id);
        setAudits(prev => prev.filter(a => a.id !== id));
        if (onAuditDeleted) {
          onAuditDeleted(id);
        }
      } catch (err) {
        alert(`Failed to delete audit: ${err.message}`);
      }
    }
  };

  const getStatusBadge = (statusBadgeText, color) => {
    if (color === 'emerald' || statusBadgeText === 'READY FOR REVIEW') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          READY FOR REVIEW
        </span>
      );
    }
    if (color === 'amber' || statusBadgeText === 'NEEDS ATTENTION') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5" />
          NEEDS ATTENTION
        </span>
      );
    }
    if (color === 'rose' || statusBadgeText === 'INCOMPLETE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5" />
          INCOMPLETE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-navy-50 text-navy border border-navy-100">
        <Clock className="w-3.5 h-3.5 text-secondary-blue" />
        IN PROGRESS
      </span>
    );
  };

  const activeAudit = audits.find(a => a.id === activeAuditId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">Application Audits</h1>
          <p className="text-sm text-muted-text mt-1">
            Manage pre-submission audits, review cross-document discrepancies, and check application readiness.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onQuickDemo}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Run Synthetic Demo</span>
          </button>

          <button
            onClick={() => setView('new-audit')}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-navy text-white hover:bg-navy-dark transition shadow-sm shadow-navy/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-teal-accent" />
            <span>New Audit</span>
          </button>
        </div>
      </div>

      {/* In-Progress Active Audit Banner */}
      {activeAudit && (
        <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-teal-accent text-white rounded-xl shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-navy text-sm sm:text-base">In-Progress Audit Session</h3>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-teal-accent/20 text-teal-dark rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-accent animate-pulse" />
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Applicant: <strong>{activeAudit.applicantName || 'Applicant'}</strong> &bull; Category: <strong>{activeAudit.category?.replace(/_/g, ' ')}</strong> &bull; {activeAudit.documentsCount} document(s) uploaded.
                </p>
              </div>
            </div>
            <button
              onClick={() => onSelectAudit(activeAudit.id)}
              className="shrink-0 px-4 py-2.5 text-xs font-bold rounded-xl bg-navy text-white hover:bg-navy-dark transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>Resume This Audit</span>
              <ArrowRight className="w-3.5 h-3.5 text-teal-accent" />
            </button>
          </div>
        </div>
      )}

      {/* Synthetic Benchmark Callout Card */}
      <div className="bg-white border border-border-subtle rounded-2xl p-5 shadow-xs hover:border-border-card transition">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl shrink-0 mt-0.5 border border-amber-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-bold text-navy text-sm sm:text-base">Quick Evaluation Scenario: Rahul Sharma</h3>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded-md border border-amber-200">
                  Synthetic Dataset
                </span>
              </div>
              <p className="text-xs text-muted-text leading-relaxed max-w-3xl">
                Instantly load and audit 3 synthetic documents: <strong>Identity Card</strong> (Rahul Sharma, DOB 12/05/2005), <strong>Class XII Marksheet</strong> (Rahul S. Sharma, DOB 12/05/2005), and <strong>Income Certificate</strong> (Rahul Sharma, DOB 12/05/2004) with missing Application Form. Demonstrates actual cross-matching and validation.
              </p>
            </div>
          </div>
          <button
            onClick={onQuickDemo}
            className="shrink-0 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch Demo Case</span>
          </button>
        </div>
      </div>

      {/* Audits Table / List */}
      <div className="bg-white rounded-2xl border border-border-subtle overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-canvas">
          <h2 className="text-sm font-bold text-navy uppercase tracking-wider">Recent Audit Sessions</h2>
          <span className="text-xs text-muted-text font-medium">{audits.length} total audits</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-text text-sm">
            Loading audits...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            Error loading audits: {error}
          </div>
        ) : audits.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-navy-50 text-navy mx-auto flex items-center justify-center">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-navy text-sm">No audits conducted yet</h3>
            <p className="text-xs text-muted-text max-w-sm mx-auto">
              Start a new audit to upload documents and run OCR verification, or test the synthetic demo scenario.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setView('new-audit')}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-navy text-white hover:bg-navy-dark transition cursor-pointer"
              >
                Start New Audit
              </button>
              <button
                onClick={onQuickDemo}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition cursor-pointer"
              >
                Run Demo Case
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-50 text-navy uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="px-6 py-3">Applicant & ID</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Documents</th>
                  <th className="px-6 py-3">Readiness Status</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-slate-700">
                {audits.map(audit => {
                  const isActive = audit.id === activeAuditId;
                  return (
                    <tr 
                      key={audit.id} 
                      onClick={() => onSelectAudit(audit.id)}
                      className={`hover:bg-navy-50/40 cursor-pointer transition ${isActive ? 'bg-teal-50/40' : ''}`}
                    >
                      <td className="px-6 py-4 font-semibold text-navy">
                        <div className="flex items-center gap-2">
                          <span>{audit.applicantName || 'Anonymous Applicant'}</span>
                          {isActive && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-accent text-white rounded-md">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-muted-text">{audit.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600">
                        {audit.category?.replace(/_/g, ' ') || 'SCHOLARSHIP'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-navy">{audit.documentsCount}</span> file(s)
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(audit.statusBadgeText, audit.statusColor)}
                      </td>
                      <td className="px-6 py-4 font-bold text-navy">
                        {audit.readinessScore !== null ? `${audit.readinessScore}%` : '—'}
                      </td>
                      <td className="px-6 py-4 text-muted-text text-[11px]">
                        {new Date(audit.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAudit(audit.id);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-navy-50 text-navy hover:bg-navy-100 transition cursor-pointer"
                          >
                            View Report
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, audit.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Permanently wipe files and delete audit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
