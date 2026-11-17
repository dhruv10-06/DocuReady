// client/src/components/wizard/StepReview.jsx

import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  Edit3, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';
import { updateDocumentDetails } from '../../services/api';

export default function StepReview({
  auditId,
  documents,
  setDocuments,
  onNext,
  onBack,
}) {
  const [editingDocId, setEditingDocId] = useState(null);
  const [formData, setFormData] = useState({});
  const [savingDocId, setSavingDocId] = useState(null);
  const [showRawText, setShowRawText] = useState({});
  const [savedSuccessDocId, setSavedSuccessDocId] = useState(null);

  const startEditing = (doc) => {
    setEditingDocId(doc.id);
    setFormData({
      candidateName: doc.extractedData?.candidateName || '',
      dateOfBirth: doc.extractedData?.dateOfBirth || '',
      documentNumber: doc.extractedData?.documentNumber || '',
      issueDate: doc.extractedData?.issueDate || '',
      expiryDate: doc.extractedData?.expiryDate || '',
      authority: doc.extractedData?.authority || '',
      docCategory: doc.docCategory,
    });
  };

  const handleSave = async (docId) => {
    try {
      setSavingDocId(docId);
      const res = await updateDocumentDetails(auditId, docId, formData);
      setDocuments(prev => prev.map(d => d.id === docId ? res.document : d));
      setEditingDocId(null);
      setSavedSuccessDocId(docId);
      setTimeout(() => setSavedSuccessDocId(null), 3000);
    } catch (err) {
      alert(`Failed to save document updates: ${err.message}`);
    } finally {
      setSavingDocId(false);
    }
  };

  const toggleRaw = (id) => {
    setShowRawText(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Step 3: Review Extracted Information
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Review OCR & PDF extracted fields. If any value was misread or absent in low-contrast scans, correct it manually below.
        </p>
      </div>

      {/* Verification Notice */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-800 flex items-start gap-3 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-900">Human-in-the-Loop Safeguard</p>
          <p className="text-blue-700/90 mt-0.5 leading-relaxed">
            DocuReady never blindly assumes raw OCR text is 100% verified. You can edit any field before cross-document comparison runs.
          </p>
        </div>
      </div>

      {/* Document Review Cards */}
      <div className="space-y-6">
        {documents.map((doc) => {
          const isEditing = editingDocId === doc.id;
          const isReadable = doc.extractedData?.isReadable !== false;
          const data = isEditing ? formData : (doc.extractedData || {});

          return (
            <div 
              key={doc.id}
              className={`bg-white border rounded-2xl p-6 shadow-xs transition ${
                !isReadable 
                  ? 'border-rose-200 ring-1 ring-rose-300' 
                  : doc.isUserVerified 
                    ? 'border-emerald-200' 
                    : 'border-slate-200'
              }`}
            >
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                      <span>{doc.filename}</span>
                      {doc.isSynthetic && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          Synthetic Sample
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {doc.docCategory.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        • {(doc.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badges & Edit Button */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  {!isReadable ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Unreadable Scan
                    </span>
                  ) : doc.isUserVerified ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      User Verified
                    </span>
                  ) : (doc.extractedData?.confidence || 0) < 60 ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Low OCR Confidence: {doc.extractedData?.confidence || 0}%
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      OCR Confidence: {doc.extractedData?.confidence || 90}%
                    </span>
                  )}

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => startEditing(doc)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Edit Fields</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSave(doc.id)}
                      disabled={savingDocId === doc.id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingDocId === doc.id ? 'Saving...' : 'Save & Verify'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Unreadable Banner if flagged */}
              {!isReadable && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Document Requires Manual Entry or Re-upload</p>
                    <p className="mt-0.5 text-rose-700">
                      {doc.extractedData?.unreadableReason || 'Low scan clarity or unreadable text'}. Click "Edit Fields" to enter details manually if legible.
                    </p>
                  </div>
                </div>
              )}

              {/* Success update pill */}
              {savedSuccessDocId === doc.id && (
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Document details successfully updated and confirmed!</span>
                </div>
              )}

              {/* Fields Grid */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Candidate Name */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">Candidate Name</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.candidateName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, candidateName: e.target.value }))}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="font-bold text-slate-900 text-sm">
                      {doc.extractedData?.candidateName || <span className="text-slate-400 font-normal">Not detected</span>}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">Date of Birth (DOB)</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="font-bold text-slate-900 text-sm">
                      {doc.extractedData?.dateOfBirth || <span className="text-slate-400 font-normal">Not detected</span>}
                    </p>
                  )}
                </div>

                {/* Document Number */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">Document / Certificate No.</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.documentNumber || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                      placeholder="e.g. XXXX-9912 or CBSE-8841"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="font-bold font-mono text-slate-900 text-sm">
                      {doc.extractedData?.documentNumber || <span className="text-slate-400 font-normal">Not detected</span>}
                    </p>
                  )}
                </div>

                {/* Issue Date */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">Issue Date</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.issueDate || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                      placeholder="DD/MM/YYYY"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="font-semibold text-slate-800">
                      {doc.extractedData?.issueDate || <span className="text-slate-400 font-normal">—</span>}
                    </p>
                  )}
                </div>

                {/* Expiry Date */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">Expiry Date / Validity</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.expiryDate || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                      placeholder="DD/MM/YYYY (or leave blank if permanent)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="font-semibold text-slate-800">
                      {doc.extractedData?.expiryDate || <span className="text-slate-400 font-normal">Permanent / N.A.</span>}
                    </p>
                  )}
                </div>

                {/* Issuing Authority */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="block text-[11px] font-semibold text-slate-500 mb-1">Issuing Authority / Board</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.authority || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, authority: e.target.value }))}
                      placeholder="e.g. CBSE or Tahsildar"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  ) : (
                    <p className="font-semibold text-slate-800 truncate" title={doc.extractedData?.authority}>
                      {doc.extractedData?.authority || <span className="text-slate-400 font-normal">—</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Extra Details (Score, Father's Name, Income) */}
              {doc.extractedData?.extraDetails && Object.keys(doc.extractedData.extraDetails).length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                  {doc.extractedData.extraDetails.fatherName && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      Father: <strong>{doc.extractedData.extraDetails.fatherName}</strong>
                    </span>
                  )}
                  {doc.extractedData.extraDetails.score && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Score: <strong>{doc.extractedData.extraDetails.score}</strong>
                    </span>
                  )}
                  {doc.extractedData.extraDetails.incomeAmount && (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                      Income: <strong>{doc.extractedData.extraDetails.incomeAmount}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Collapsible Raw Text Snippet */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleRaw(doc.id)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition"
                >
                  <span>{showRawText[doc.id] ? 'Hide Raw OCR Text Stream' : 'View Raw OCR Text Stream'}</span>
                  {showRawText[doc.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showRawText[doc.id] && (
                  <div className="mt-2 p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto max-h-48 whitespace-pre-wrap">
                    {doc.rawText || doc.extractedData?.rawSnippet || 'No raw text available.'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Upload</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition text-sm flex items-center gap-2 shadow-sm shadow-blue-600/20"
        >
          <span>Run Cross-Document Verification</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

