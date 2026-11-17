// client/src/components/wizard/StepCategory.jsx

import React from 'react';
import { 
  GraduationCap, 
  Building2, 
  Landmark, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Info, 
  ShieldCheck 
} from 'lucide-react';

export default function StepCategory({
  categories,
  selectedCategory,
  setSelectedCategory,
  applicantName,
  setApplicantName,
  applicationNumber,
  setApplicationNumber,
  onNext,
  onLoadDemo,
}) {
  const currentCat = categories.find(c => c.id === selectedCategory) || categories[0];

  const getCategoryIcon = (id) => {
    switch (id) {
      case 'SCHOLARSHIP':
        return <GraduationCap className="w-6 h-6 text-secondary-blue" />;
      case 'COLLEGE_ADMISSION':
        return <Building2 className="w-6 h-6 text-navy" />;
      case 'GOVERNMENT_SCHEME':
        return <Landmark className="w-6 h-6 text-teal-accent" />;
      default:
        return <GraduationCap className="w-6 h-6 text-secondary-blue" />;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight">
          Step 1: Application Category & Applicant Info
        </h2>
        <p className="text-sm text-muted-text mt-1">
          Select the program type to apply the appropriate regulatory audit criteria and document requirements.
        </p>
      </div>

      {/* Synthetic Demo Case Shortcut */}
      <div className="bg-white border border-border-subtle rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-border-card transition">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl shrink-0 mt-0.5 border border-amber-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-navy">Want to test the full audit workflow right now?</p>
            <p className="text-xs text-muted-text mt-0.5">
              Load the Rahul Sharma synthetic benchmark (Scholarship, Name variation, DOB mismatch, Missing form).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLoadDemo}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition shrink-0 shadow-xs flex items-center gap-1.5 justify-center cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Synthetic Benchmark</span>
        </button>
      </div>

      {/* Category Selection Cards */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-navy">
          Application Category
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const isSelected = cat.id === selectedCategory;
            return (
              <div
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition relative ${
                  isSelected
                    ? 'border-navy bg-navy-50/50 ring-2 ring-navy/10 shadow-xs'
                    : 'border-border-subtle bg-white hover:border-border-card hover:bg-canvas'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-white border border-border-subtle shadow-2xs">
                    {getCategoryIcon(cat.id)}
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-navy text-white flex items-center justify-center text-xs">
                      ✓
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-navy text-base mb-1">{cat.title}</h3>
                <p className="text-xs text-muted-text line-clamp-2 leading-relaxed mb-3">
                  {cat.description}
                </p>

                <div className="text-[11px] font-semibold text-secondary-blue flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-accent"></span>
                  {cat.mandatoryDocuments?.length} Mandatory Documents
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Category Requirements Preview */}
      {currentCat && (
        <div className="bg-white border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border-subtle">
            <ShieldCheck className="w-4 h-4 text-teal-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-navy">
              Mandatory Documents Checklist for {currentCat.title}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {currentCat.mandatoryDocuments?.map((doc, idx) => (
              <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-canvas border border-border-subtle">
                <CheckCircle2 className="w-4 h-4 text-teal-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-navy">{doc.name}</p>
                  <p className="text-muted-text text-[11px] mt-0.5">{doc.description}</p>
                </div>
              </div>
            ))}
          </div>

          {currentCat.rules && (
            <div className="text-[11px] text-muted-text pt-2 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-secondary-blue shrink-0" />
              <span>
                Rule Criteria: Income certificate validity ≤ {currentCat.rules.maxIncomeCertificateAgeYears} year(s) • Strict DOB match • File size ≤ {currentCat.rules.maxAllowedFileSizeMB}MB.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Applicant Basics Form */}
      <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-navy">
          Applicant Identification
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Applicant Legal Name <span className="text-muted-text font-normal">(as on Aadhaar / 10th Marksheet)</span>
            </label>
            <input
              type="text"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Application / Registration Number <span className="text-muted-text font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={applicationNumber}
              onChange={(e) => setApplicationNumber(e.target.value)}
              placeholder="e.g. NSP-2026-88120"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-border-subtle bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition"
            />
          </div>
        </div>
      </div>

      {/* Next Step Action */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-dark transition shadow-sm shadow-navy/20 flex items-center gap-2 text-sm cursor-pointer"
        >
          <span>Continue to Document Upload</span>
          <ArrowRight className="w-4 h-4 text-teal-accent" />
        </button>
      </div>
    </div>
  );
}
