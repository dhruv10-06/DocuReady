// client/src/components/wizard/StepUpload.jsx

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  DownloadCloud, 
  Loader2,
  FileCheck2,
  Info
} from 'lucide-react';
import { uploadDocuments, deleteDocument } from '../../services/api';

export default function StepUpload({
  auditId,
  documents,
  setDocuments,
  documentTypes,
  onNext,
  onBack,
  onLoadDemo,
}) {
  const [selectedCategory, setSelectedCategory] = useState('IDENTITY_PROOF');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    // Validate size & type
    const validFiles = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds maximum allowed size of 10MB.`);
        return;
      }
      const isAllowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(file.type) ||
                        /\.(pdf|jpg|jpeg|png)$/i.test(file.name);
      if (!isAllowed) {
        setErrorMessage(`File "${file.name}" is not a supported format. Please upload PDF, JPG, or PNG.`);
        return;
      }
      validFiles.push(file);
    }

    try {
      setUploading(true);
      const res = await uploadDocuments(auditId, validFiles, selectedCategory);
      setDocuments(res.documents);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload and parse documents.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docId) => {
    try {
      const res = await deleteDocument(auditId, docId);
      setDocuments(res.documents);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to remove document.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Step 2: Upload Supporting Documents
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload PDF documents or scanned images (JPG/PNG). DocuReady will execute automated OCR and text parsing.
        </p>
      </div>

      {/* Synthetic Demo Case Shortcut */}
      <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-900">Evaluating without personal files?</p>
            <p className="text-xs text-amber-700">Pre-load the 3 synthetic demonstration documents (Aadhaar, Marksheet, Income Certificate) with 1 click.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLoadDemo}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shrink-0 shadow-xs flex items-center gap-1.5 justify-center"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Synthetic Demo</span>
        </button>
      </div>

      {/* Category selector & Upload Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Target Document Category for Upload
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-80 px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
          >
            {documentTypes.map((dt) => (
              <option key={dt.type} value={dt.type}>
                {dt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Drag and drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
            isDragging
              ? 'border-blue-600 bg-blue-50/50'
              : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                {uploading ? 'Processing OCR & Text Extraction...' : 'Click to select or drag and drop files here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supported formats: PDF, JPG, PNG (Max 10MB per file)
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Download Synthetic Files for Manual Testing */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Want to test manual file upload? Download Synthetic Test PDFs
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              Download these generated benchmark PDF, PNG, and JPG files to test manual drag-and-drop and OCR processing:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
          <a
            href="/sample-docs/Synthetic_Aadhaar_Rahul_Sharma.pdf"
            download
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-between shadow-2xs"
          >
            <span className="truncate">Aadhaar (PDF)</span>
            <DownloadCloud className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </a>
          <a
            href="/sample-docs/Synthetic_Aadhaar_Rahul_Sharma.png"
            download
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-between shadow-2xs"
          >
            <span className="truncate">Aadhaar (PNG)</span>
            <DownloadCloud className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </a>
          <a
            href="/sample-docs/Synthetic_Class_XII_Marksheet_Rahul.pdf"
            download
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-between shadow-2xs"
          >
            <span className="truncate">Marksheet (PDF)</span>
            <DownloadCloud className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </a>
          <a
            href="/sample-docs/Synthetic_Income_Certificate_Rahul.pdf"
            download
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-between shadow-2xs"
          >
            <span className="truncate">Income (PDF)</span>
            <DownloadCloud className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </a>
          <a
            href="/sample-docs/Synthetic_Income_Certificate_Rahul.jpg"
            download
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-between shadow-2xs"
          >
            <span className="truncate">Income (JPG)</span>
            <DownloadCloud className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </a>
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Uploaded Documents ({documents.length})
          </h4>
          <span className="text-xs text-slate-400">
            {documents.length >= 1 ? 'Ready for Information Extraction Review' : 'No documents uploaded yet'}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
            Upload at least one document to proceed to information review.
          </div>
        ) : (
          <div className="space-y-2.5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs hover:border-slate-200 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{doc.filename}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="px-2 py-0.5 rounded bg-slate-200/80 font-medium text-slate-700">
                        {doc.docCategory.replace(/_/g, ' ')}
                      </span>
                      <span>{(doc.size / 1024).toFixed(0)} KB</span>
                      {doc.extractedData?.isReadable === false ? (
                        <span className="text-rose-600 font-semibold">• Unreadable</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">
                          • OCR Confidence: {doc.extractedData?.confidence || 90}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                  title="Remove document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Category</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={documents.length === 0}
          className={`px-6 py-3 rounded-xl font-semibold transition text-sm flex items-center gap-2 ${
            documents.length === 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20'
          }`}
        >
          <span>Review Extracted Information</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

