// client/src/pages/NewAuditPage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileCheck2, 
  UploadCloud, 
  CheckCircle2, 
  Search, 
  FileText, 
  Sparkles,
  Loader2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { 
  fetchCategories, 
  createAudit, 
  loadDemoCase, 
  verifyAudit, 
  fetchAuditDetails,
  saveAuditStep,
  getAuditStep,
  clearAuditStep,
  setActiveAuditId,
  clearActiveAuditId,
  saveStep1Draft,
  getStep1Draft,
  clearStep1Draft
} from '../services/api';

import StepCategory from '../components/wizard/StepCategory';
import StepUpload from '../components/wizard/StepUpload';
import StepReview from '../components/wizard/StepReview';
import StepVerification from '../components/wizard/StepVerification';
import StepReport from '../components/wizard/StepReport';

export default function NewAuditPage({ 
  existingAuditId, 
  setView, 
  initialDemo = false,
  onAuditCreated,
  onStartNew
}) {
  const [categories, setCategories] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('SCHOLARSHIP');
  const [applicantName, setApplicantName] = useState('');
  const [applicationNumber, setApplicationNumber] = useState('');
  
  // Audit Session State
  const [audit, setAudit] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [report, setReport] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Guard against React StrictMode concurrent double-mount
  const demoMountedRef = useRef(false);
  const isDemoRunningRef = useRef(false);

  // Step navigation helper with step persistence
  const goToStep = (step) => {
    setCurrentStep(step);
    if (audit?.id) {
      saveAuditStep(audit.id, step);
    }
  };

  // Step 1 Draft Handlers
  const handleUpdateCategory = (cat) => {
    setSelectedCategory(cat);
    if (!audit) {
      saveStep1Draft({ selectedCategory: cat, applicantName, applicationNumber });
    }
  };

  const handleUpdateApplicantName = (name) => {
    setApplicantName(name);
    if (!audit) {
      saveStep1Draft({ selectedCategory, applicantName: name, applicationNumber });
    }
  };

  const handleUpdateApplicationNumber = (num) => {
    setApplicationNumber(num);
    if (!audit) {
      saveStep1Draft({ selectedCategory, applicantName, applicationNumber: num });
    }
  };

  // Load Categories & Audit Details on mount
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);
        const catData = await fetchCategories();
        setCategories(catData.categories || []);
        setDocumentTypes(catData.documentTypes || []);

        if (existingAuditId) {
          const auditData = await fetchAuditDetails(existingAuditId);
          setAudit(auditData);
          setSelectedCategory(auditData.category);
          setApplicantName(auditData.applicantName);
          setApplicationNumber(auditData.applicationNumber || '');
          setDocuments(auditData.documents || []);
          if (auditData.report) {
            setReport(auditData.report);
          }
          setActiveAuditId(auditData.id);

          // Resolve step: respect saved step if valid, otherwise compute best step
          const savedStep = getAuditStep(existingAuditId);
          if (savedStep && savedStep >= 1 && savedStep <= 5) {
            if ((savedStep === 4 || savedStep === 5) && !auditData.report) {
              setCurrentStep(auditData.documents?.length > 0 ? 3 : 2);
            } else if (savedStep === 3 && (!auditData.documents || auditData.documents.length === 0)) {
              setCurrentStep(2);
            } else {
              setCurrentStep(savedStep);
            }
          } else {
            if (auditData.report) {
              setCurrentStep(5);
            } else if (auditData.documents?.length > 0) {
              setCurrentStep(3);
            } else {
              setCurrentStep(2);
            }
          }
        } else if (initialDemo && !demoMountedRef.current) {
          demoMountedRef.current = true;
          await handleLoadDemoDirectly();
        } else {
          // Restore unsubmitted Step 1 draft if present
          const draft = getStep1Draft();
          if (draft) {
            if (draft.selectedCategory) setSelectedCategory(draft.selectedCategory);
            if (draft.applicantName) setApplicantName(draft.applicantName);
            if (draft.applicationNumber) setApplicationNumber(draft.applicationNumber);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [existingAuditId, initialDemo]);

  // Load Synthetic Demo Scenario Direct handler
  const handleLoadDemoDirectly = async () => {
    if (isDemoRunningRef.current) return;
    isDemoRunningRef.current = true;
    try {
      setIsProcessing(true);
      // 1. Create audit
      const newAudit = await createAudit({
        category: 'SCHOLARSHIP',
        applicantName: 'Rahul Sharma',
        applicationNumber: 'NSP-DEMO-2026-99',
      });
      setActiveAuditId(newAudit.id);
      if (onAuditCreated) {
        onAuditCreated(newAudit.id);
      }

      // 2. Load demo data & verify
      const populated = await loadDemoCase(newAudit.id);
      setAudit(populated);
      setSelectedCategory('SCHOLARSHIP');
      setApplicantName(populated.applicantName);
      setApplicationNumber(populated.applicationNumber);
      setDocuments(populated.documents);
      setReport(populated.report);
      clearStep1Draft();
      saveAuditStep(newAudit.id, 4);
      setCurrentStep(4); // Jump directly to Verification step to show discrepancies
    } catch (err) {
      alert(`Failed to load demo scenario: ${err.message}`);
    } finally {
      setIsProcessing(false);
      isDemoRunningRef.current = false;
    }
  };

  // Step 1 -> Step 2: Ensure audit session exists on server
  const handleProceedToUpload = async () => {
    if (!audit) {
      try {
        setIsProcessing(true);
        const newAudit = await createAudit({
          category: selectedCategory,
          applicantName: applicantName || 'Applicant',
          applicationNumber,
        });
        setAudit(newAudit);
        setDocuments(newAudit.documents || []);
        clearStep1Draft();
        setActiveAuditId(newAudit.id);
        saveAuditStep(newAudit.id, 2);
        setCurrentStep(2);
        if (onAuditCreated) {
          onAuditCreated(newAudit.id);
        }
      } catch (err) {
        alert(`Failed to initialize audit session: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    } else {
      goToStep(2);
    }
  };

  // Step 3 -> Step 4: Run Verification Engine
  const handleRunVerification = async () => {
    try {
      setIsProcessing(true);
      const res = await verifyAudit(audit.id);
      setReport(res.report);
      goToStep(4);
    } catch (err) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset / Start fresh
  const handleReset = () => {
    if (audit?.id) {
      clearAuditStep(audit.id);
    }
    clearActiveAuditId();
    clearStep1Draft();
    setAudit(null);
    setDocuments([]);
    setReport(null);
    setApplicantName('');
    setApplicationNumber('');
    setCurrentStep(1);
    if (onStartNew) {
      onStartNew();
    }
  };

  const steps = [
    { num: 1, label: 'Category' },
    { num: 2, label: 'Upload' },
    { num: 3, label: 'Review OCR' },
    { num: 4, label: 'Verify' },
    { num: 5, label: 'Audit Report' },
  ];

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Initializing DocuReady Audit Environment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-2xl shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Audit Session Unavailable</h3>
        <p className="text-sm text-slate-600">{error}</p>
        <p className="text-xs text-slate-500">
          Audit sessions expire after 2 hours of inactivity or when the server restarts for applicant privacy.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => {
              clearActiveAuditId();
              if (existingAuditId) clearAuditStep(existingAuditId);
              if (onStartNew) onStartNew();
              else setView('new-audit');
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Start Fresh Audit
          </button>
          <button
            onClick={() => setView('dashboard')}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Wizard Progress Bar */}
      <div className="no-print max-w-3xl mx-auto">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 z-0" />
          {steps.map((s) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div 
                key={s.num} 
                className="relative z-10 flex flex-col items-center group cursor-pointer"
                onClick={() => {
                  // Only allow jumping back to earlier steps or if audit exists
                  if (audit && s.num < currentStep) {
                    goToStep(s.num);
                  }
                }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition shadow-xs ${
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-white border border-slate-300 text-slate-400'
                }`}>
                  {isCompleted ? '✓' : s.num}
                </div>
                <span className={`text-[11px] font-semibold mt-1.5 transition ${
                  isCurrent ? 'text-blue-600' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Step Container */}
      <div className="pt-2">
        {isProcessing && (
          <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-xs flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 text-center space-y-3 max-w-sm mx-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-800">Processing Audit Execution...</p>
              <p className="text-xs text-slate-500">Cross-checking document details, running OCR normalization, and compiling compliance results.</p>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <StepCategory
            categories={categories}
            selectedCategory={selectedCategory}
            setSelectedCategory={handleUpdateCategory}
            applicantName={applicantName}
            setApplicantName={handleUpdateApplicantName}
            applicationNumber={applicationNumber}
            setApplicationNumber={handleUpdateApplicationNumber}
            onNext={handleProceedToUpload}
            onLoadDemo={handleLoadDemoDirectly}
          />
        )}

        {currentStep === 2 && audit && (
          <StepUpload
            auditId={audit.id}
            documents={documents}
            setDocuments={setDocuments}
            documentTypes={documentTypes}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
            onLoadDemo={handleLoadDemoDirectly}
          />
        )}

        {currentStep === 3 && audit && (
          <StepReview
            auditId={audit.id}
            documents={documents}
            setDocuments={setDocuments}
            onNext={handleRunVerification}
            onBack={() => goToStep(2)}
          />
        )}

        {currentStep === 4 && report && (
          <StepVerification
            report={report}
            audit={audit}
            onNext={() => goToStep(5)}
            onBack={() => goToStep(3)}
          />
        )}

        {currentStep === 5 && report && (
          <StepReport
            report={report}
            audit={audit}
            onReset={handleReset}
            setView={setView}
          />
        )}
      </div>
    </div>
  );
}
