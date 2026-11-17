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
  FolderOpen
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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          READY FOR REVIEW
        </span>
      );
    }
    if (color === 'amber' || statusBadgeText === 'NEEDS ATTENTION') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5" />
          NEEDS ATTENTION
        </span>
      );
    }
    if (color === 'rose' || statusBadgeText === 'INCOMPLETE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5" />
          INCOMPLETE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <Clock className="w-3.5 h-3.5" />
        IN PROGRESS
      </span>
    );
  };

  const activeAudit = audits.find(a => a.id === activeAuditId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Application Audits</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage pre-submission audits, review cross-document discrepancies, and check application readiness.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onQuickDemo}
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition shadow-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Run Synthetic Demo</span>
          </button>

          <button
            onClick={() => setView('new-audit')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm shadow-blue-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Audit</span>
          </button>
        </div>
      </div>

      {/* In-Progress Active Audit Banner */}
      {activeAudit && (
        <div className="bg-gradient-to-r from-blue-50 via-blue-50/60 to-white border border-blue-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">In-Progress Audit Session</h3>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
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
              className="shrink-0 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs flex items-center gap-1.5"
            >
              <span>Resume This Audit →</span>
            </button>
          </div>
        </div>
      )}

      {/* Synthetic Benchmark Callout Card */}
      <div className="bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-white border border-amber-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Quick Evaluation Scenario: Rahul Sharma</h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded">
                  Synthetic Dataset
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                Instantly load and audit 3 synthetic documents: <strong>Identity Card</strong> (Rahul Sharma, DOB 12/05/2005), <strong>Class XII Marksheet</strong> (Rahul S. Sharma, DOB 12/05/2005), and <strong>Income Certificate</strong> (Rahul Sharma, DOB 12/05/2004) with missing Application Form. Demonstrates actual cross-matching and validation.
              </p>
            </div>
          </div>
          <button
            onClick={onQuickDemo}
            className="shrink-0 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shadow-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch Demo Case</span>
          </button>
        </div>
      </div>

      {/* Audits Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Recent Audit Sessions</h2>
          <span className="text-xs text-slate-500">{audits.length} total audits</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading audits...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">
            Error loading audits: {error}
          </div>
        ) : audits.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No audits conducted yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Start a new audit to upload documents and run OCR verification, or test the synthetic demo scenario.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setView('new-audit')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Start New Audit
              </button>
              <button
                onClick={onQuickDemo}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition"
              >
                Run Demo Case
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
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
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {audits.map(audit => {
                  const isActive = audit.id === activeAuditId;
                  return (
                    <tr 
                      key={audit.id} 
                      onClick={() => onSelectAudit(audit.id)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition ${isActive ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{audit.applicantName || 'Anonymous Applicant'}</span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{audit.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600">
                        {audit.category?.replace(/_/g, ' ') || 'SCHOLARSHIP'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800">{audit.documentsCount}</span> file(s)
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(audit.statusBadgeText, audit.statusColor)}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {audit.readinessScore !== null ? `${audit.readinessScore}%` : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-[11px]">
                        {new Date(audit.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAudit(audit.id);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          >
                            View Report
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, audit.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
