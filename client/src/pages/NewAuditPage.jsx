// client/src/pages/NewAuditPage.jsx

import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  UploadCloud, 
  CheckCircle2, 
  Search, 
  FileText, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { 
  fetchCategories, 
  createAudit, 
  loadDemoCase, 
  verifyAudit, 
  fetchAuditDetails 
} from '../services/api';

import StepCategory from '../components/wizard/StepCategory';
import StepUpload from '../components/wizard/StepUpload';
import StepReview from '../components/wizard/StepReview';
import StepVerification from '../components/wizard/StepVerification';
import StepReport from '../components/wizard/StepReport';

export default function NewAuditPage({ 
  existingAuditId, 
  setView, 
  initialDemo = false 
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

  // Load Categories on mount
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
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
            setCurrentStep(5); // Show report
          } else if (auditData.documents?.length > 0) {
            setCurrentStep(3); // Show review
          }
        } else if (initialDemo) {
          await handleLoadDemoDirectly();
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
    try {
      setIsProcessing(true);
      // 1. Create audit
      const newAudit = await createAudit({
        category: 'SCHOLARSHIP',
        applicantName: 'Rahul Sharma',
        applicationNumber: 'NSP-DEMO-2026-99',
      });
      // 2. Load demo data & verify
      const populated = await loadDemoCase(newAudit.id);
      setAudit(populated);
      setSelectedCategory('SCHOLARSHIP');
      setApplicantName(populated.applicantName);
      setApplicationNumber(populated.applicationNumber);
      setDocuments(populated.documents);
      setReport(populated.report);
      setCurrentStep(4); // Jump directly to Verification step to show the discrepancies!
    } catch (err) {
      alert(`Failed to load demo scenario: ${err.message}`);
    } finally {
      setIsProcessing(false);
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
        setCurrentStep(2);
      } catch (err) {
        alert(`Failed to initialize audit session: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setCurrentStep(2);
    }
  };

  // Step 3 -> Step 4: Run Verification Engine
  const handleRunVerification = async () => {
    try {
      setIsProcessing(true);
      const res = await verifyAudit(audit.id);
      setReport(res.report);
      setCurrentStep(4);
    } catch (err) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset / Start fresh
  const handleReset = () => {
    setAudit(null);
    setDocuments([]);
    setReport(null);
    setApplicantName('');
    setApplicationNumber('');
    setCurrentStep(1);
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
                    setCurrentStep(s.num);
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
            setSelectedCategory={setSelectedCategory}
            applicantName={applicantName}
            setApplicantName={setApplicantName}
            applicationNumber={applicationNumber}
            setApplicationNumber={setApplicationNumber}
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
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
            onLoadDemo={handleLoadDemoDirectly}
          />
        )}

        {currentStep === 3 && audit && (
          <StepReview
            auditId={audit.id}
            documents={documents}
            setDocuments={setDocuments}
            onNext={handleRunVerification}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && report && (
          <StepVerification
            report={report}
            audit={audit}
            onNext={() => setCurrentStep(5)}
            onBack={() => setCurrentStep(3)}
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

