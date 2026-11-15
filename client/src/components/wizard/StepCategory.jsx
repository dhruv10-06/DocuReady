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
        return <GraduationCap className="w-6 h-6 text-blue-600" />;
      case 'COLLEGE_ADMISSION':
        return <Building2 className="w-6 h-6 text-purple-600" />;
      case 'GOVERNMENT_SCHEME':
        return <Landmark className="w-6 h-6 text-emerald-600" />;
      default:
        return <GraduationCap className="w-6 h-6 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Step 1: Application Category & Applicant Info
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Select the program type to apply the appropriate regulatory audit criteria and document requirements.
        </p>
      </div>

      {/* Synthetic Demo Case Shortcut */}
      <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-900">Want to test the full audit workflow right now?</p>
            <p className="text-xs text-amber-700">Load the Rahul Sharma synthetic benchmark (Scholarship, Name variation, DOB mismatch, Missing form).</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLoadDemo}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shrink-0 shadow-xs flex items-center gap-1.5 justify-center"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Synthetic Benchmark</span>
        </button>
      </div>

      {/* Category Selection Cards */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs">
                    {getCategoryIcon(cat.id)}
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                      ✓
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-base mb-1">{cat.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                  {cat.description}
                </p>

                <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {cat.mandatoryDocuments?.length} Mandatory Documents
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Category Requirements Preview */}
      {currentCat && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Mandatory Documents Checklist for {currentCat.title}
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {currentCat.mandatoryDocuments?.map((doc, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">{doc.name}</p>
                  <p className="text-slate-500 text-[11px]">{doc.description}</p>
                </div>
              </div>
            ))}
          </div>

          {currentCat.rules && (
            <div className="text-[11px] text-slate-500 pt-2 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>
                Rule Criteria: Income certificate validity ≤ {currentCat.rules.maxIncomeCertificateAgeYears} year(s) • Strict DOB match • File size ≤ {currentCat.rules.maxAllowedFileSizeMB}MB.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Applicant Basics Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Applicant Identification
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Applicant Legal Name <span className="text-slate-400 font-normal">(as on Aadhaar / 10th Marksheet)</span>
            </label>
            <input
              type="text"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Application / Registration Number <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={applicationNumber}
              onChange={(e) => setApplicationNumber(e.target.value)}
              placeholder="e.g. NSP-2026-88120"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
            />
          </div>
        </div>
      </div>

      {/* Next Step Action */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-sm shadow-blue-600/20 flex items-center gap-2 text-sm"
        >
          <span>Continue to Document Upload</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

