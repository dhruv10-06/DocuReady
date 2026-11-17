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
  ExternalLink,
  Loader2,
  FileCheck2,
  Info
} from 'lucide-react';
import { 
  uploadDocuments, 
  deleteDocument, 
  getSampleDocUrl,
  getSampleDocDownloadUrl,
  getSampleDocPreviewUrl
} from '../../services/api';

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
  const [downloadingFile, setDownloadingFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDownload = async (e, filename) => {
    // Strictly prevent navigating the current DocuReady wizard tab
    e.preventDefault();
    e.stopPropagation();

    const downloadUrl = getSampleDocDownloadUrl(filename);
    try {
      setDownloadingFile(filename);
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.warn(`Direct blob download failed for ${filename}, using safe new-tab fallback:`, err);
      // Safe fallback that opens in a background/new tab and NEVER navigates the current tab
      const fallbackLink = document.createElement('a');
      fallbackLink.href = downloadUrl;
      fallbackLink.download = filename;
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
    } finally {
      setDownloadingFile(null);
    }
  };

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
        <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight">
          Step 2: Upload Supporting Documents
        </h2>
        <p className="text-sm text-muted-text mt-1">
          Upload PDF documents or scanned images (JPG/PNG). DocuReady will execute automated OCR and text parsing.
        </p>
      </div>

      {/* Synthetic Demo Case Shortcut */}
      <div className="bg-white border border-border-subtle rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-border-card transition">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl shrink-0 mt-0.5 border border-amber-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-navy">Evaluating without personal files?</p>
            <p className="text-xs text-muted-text mt-0.5">
              Pre-load the 3 synthetic demonstration documents (Aadhaar, Marksheet, Income Certificate) with 1 click.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLoadDemo}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition shrink-0 shadow-xs flex items-center gap-1.5 justify-center cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Synthetic Demo</span>
        </button>
      </div>

      {/* Category selector & Upload Box */}
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-navy mb-2">
            Target Document Category for Upload
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-80 px-4 py-2.5 text-sm rounded-xl border border-border-subtle bg-white font-medium text-navy focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
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
              ? 'border-navy bg-navy-50/50'
              : 'border-border-subtle hover:border-secondary-blue hover:bg-canvas'
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
            <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy flex items-center justify-center shadow-2xs">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-teal-accent" />
              ) : (
                <UploadCloud className="w-6 h-6 text-navy" />
              )}
            </div>

            <div>
              <p className="text-sm font-bold text-navy">
                {uploading ? 'Processing OCR & Text Extraction...' : 'Click to select or drag and drop files here'}
              </p>
              <p className="text-xs text-muted-text mt-1">
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

      {/* Download & Preview Synthetic Files for Manual Testing */}
      <div className="bg-canvas border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-teal-accent" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy">
                Want to test manual file upload? Preview or Download Synthetic Test Documents
              </h4>
            </div>
            <p className="text-xs text-muted-text">
              Preview documents in a new tab or download realistic benchmark files (PDF, PNG, JPG) to test manual drag-and-drop and OCR verification:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
          {/* Identity Proof (Aadhaar) */}
          <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-navy block">Identity Proof</span>
              <span className="text-[11px] text-muted-text block">Rahul Sharma (DOB: 12/05/2005)</span>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-border-subtle">
              {[
                { fmt: 'PDF', file: 'sample-aadhaar.pdf' },
                { fmt: 'PNG', file: 'sample-aadhaar.png' },
                { fmt: 'JPG', file: 'sample-aadhaar.jpg' },
              ].map(({ fmt, file }) => (
                <div key={fmt} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-canvas border border-border-subtle text-[11px]">
                  <div className="flex items-center justify-between w-full gap-1.5">
                    <a
                      href={getSampleDocPreviewUrl(file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-1 px-1.5 rounded-md font-semibold text-secondary-blue hover:text-navy hover:bg-navy-50 border border-border-subtle bg-white transition flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap text-center cursor-pointer"
                      title={`Preview ${fmt} in a new tab`}
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      <span>Preview {fmt}</span>
                    </a>
                    <span className="text-slate-300 font-medium select-none">|</span>
                    <a
                      href={getSampleDocDownloadUrl(file)}
                      download={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleDownload(e, file)}
                      className="flex-1 py-1 px-1.5 rounded-md font-semibold text-white bg-navy hover:bg-navy-dark transition flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap text-center cursor-pointer"
                      title={`Download ${file}`}
                    >
                      {downloadingFile === file ? (
                        <Loader2 className="w-2.5 h-2.5 shrink-0 animate-spin text-teal-accent" />
                      ) : (
                        <DownloadCloud className="w-2.5 h-2.5 shrink-0" />
                      )}
                      <span>Download {fmt}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Class XII Marksheet */}
          <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-navy block">Class XII Marksheet</span>
              <span className="text-[11px] text-muted-text block">Rahul S. Sharma (Initial variation)</span>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-border-subtle">
              {[
                { fmt: 'PDF', file: 'sample-marksheet.pdf' },
                { fmt: 'PNG', file: 'sample-marksheet.png' },
                { fmt: 'JPG', file: 'sample-marksheet.jpg' },
              ].map(({ fmt, file }) => (
                <div key={fmt} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-canvas border border-border-subtle text-[11px]">
                  <div className="flex items-center justify-between w-full gap-1.5">
                    <a
                      href={getSampleDocPreviewUrl(file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-1 px-1.5 rounded-md font-semibold text-secondary-blue hover:text-navy hover:bg-navy-50 border border-border-subtle bg-white transition flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap text-center cursor-pointer"
                      title={`Preview ${fmt} in a new tab`}
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      <span>Preview {fmt}</span>
                    </a>
                    <span className="text-slate-300 font-medium select-none">|</span>
                    <a
                      href={getSampleDocDownloadUrl(file)}
                      download={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleDownload(e, file)}
                      className="flex-1 py-1 px-1.5 rounded-md font-semibold text-white bg-navy hover:bg-navy-dark transition flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap text-center cursor-pointer"
                      title={`Download ${file}`}
                    >
                      {downloadingFile === file ? (
                        <Loader2 className="w-2.5 h-2.5 shrink-0 animate-spin text-teal-accent" />
                      ) : (
                        <DownloadCloud className="w-2.5 h-2.5 shrink-0" />
                      )}
                      <span>Download {fmt}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Income Certificate */}
          <div className="bg-white p-4 rounded-xl border border-border-subtle shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-navy block">Income Certificate</span>
              <span className="text-[11px] text-muted-text block">Rahul Sharma (DOB 2004, Expired)</span>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-border-subtle">
              {[
                { fmt: 'PDF', file: 'sample-income-certificate.pdf' },
                { fmt: 'PNG', file: 'sample-income-certificate.png' },
                { fmt: 'JPG', file: 'sample-income-certificate.jpg' },
              ].map(({ fmt, file }) => (
                <div key={fmt} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-canvas border border-border-subtle text-[11px]">
                  <div className="flex items-center justify-between w-full gap-1.5">
                    <a
                      href={getSampleDocPreviewUrl(file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-1 px-1.5 rounded-md font-semibold text-secondary-blue hover:text-navy hover:bg-navy-50 border border-border-subtle bg-white transition flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap text-center cursor-pointer"
                      title={`Preview ${fmt} in a new tab`}
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      <span>Preview {fmt}</span>
                    </a>
                    <span className="text-slate-300 font-medium select-none">|</span>
                    <a
                      href={getSampleDocDownloadUrl(file)}
                      download={file}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => handleDownload(e, file)}
                      className="flex-1 py-1 px-1.5 rounded-md font-semibold text-white bg-navy hover:bg-navy-dark transition flex items-center justify-center gap-1 shadow-2xs whitespace-nowrap text-center cursor-pointer"
                      title={`Download ${file}`}
                    >
                      {downloadingFile === file ? (
                        <Loader2 className="w-2.5 h-2.5 shrink-0 animate-spin text-teal-accent" />
                      ) : (
                        <DownloadCloud className="w-2.5 h-2.5 shrink-0" />
                      )}
                      <span>Download {fmt}</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-navy">
            Uploaded Documents ({documents.length})
          </h4>
          <span className="text-xs text-muted-text">
            {documents.length >= 1 ? 'Ready for Information Extraction Review' : 'No documents uploaded yet'}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border-subtle rounded-xl text-xs text-muted-text bg-canvas">
            Upload at least one document to proceed to information review.
          </div>
        ) : (
          <div className="space-y-2.5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-canvas border border-border-subtle text-xs hover:border-border-card transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-navy-50 text-navy flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-secondary-blue" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-navy truncate">{doc.filename}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-text mt-0.5">
                      <span className="px-2 py-0.5 rounded bg-white border border-border-subtle font-medium text-navy">
                        {doc.docCategory.replace(/_/g, ' ')}
                      </span>
                      <span>{(doc.size / 1024).toFixed(0)} KB</span>
                      {doc.extractedData?.isReadable === false ? (
                        <span className="text-rose-600 font-semibold">• Unreadable</span>
                      ) : (
                        <span className="text-teal-dark font-semibold">
                          • OCR Confidence: {doc.extractedData?.confidence || 90}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer"
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
          className="px-5 py-2.5 rounded-xl border border-border-subtle text-navy font-semibold hover:bg-navy-50 transition text-sm flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Category</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={documents.length === 0}
          className={`px-6 py-3 rounded-xl font-semibold transition text-sm flex items-center gap-2 cursor-pointer ${
            documents.length === 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-navy text-white hover:bg-navy-dark shadow-sm shadow-navy/20'
          }`}
        >
          <span>Review Extracted Information</span>
          <ArrowRight className="w-4 h-4 text-teal-accent" />
        </button>
      </div>
    </div>
  );
}
