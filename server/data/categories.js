// server/data/categories.js

const APPLICATION_CATEGORIES = {
  SCHOLARSHIP: {
    id: 'SCHOLARSHIP',
    title: 'Merit-cum-Means Scholarship',
    shortTitle: 'Scholarship',
    description: 'Pre-submission audit for central, state, and private merit-cum-means scholarship applications.',
    icon: 'GraduationCap',
    badge: 'High Verification Rigor',
    mandatoryDocuments: [
      {
        type: 'APPLICATION_FORM',
        name: 'Scholarship Application Form',
        description: 'Completed application summary with registration/application number',
      },
      {
        type: 'IDENTITY_PROOF',
        name: 'Identity Proof (Aadhaar / Voter ID / Passport)',
        description: 'Valid government-issued photo identity document',
      },
      {
        type: 'MARKSHEET',
        name: 'Qualifying Examination Marksheet',
        description: 'Marksheet or grade card showing academic performance and board roll number',
      },
      {
        type: 'INCOME_CERTIFICATE',
        name: 'Competent Authority Income Certificate',
        description: 'Issued by Tehsildar, Revenue Officer, or equivalent competent authority',
      },
    ],
    optionalDocuments: [
      {
        type: 'CASTE_CERTIFICATE',
        name: 'Caste / Community Certificate',
        description: 'Required only if claiming affirmative action / reserved category quota',
      },
    ],
    rules: {
      maxIncomeCertificateAgeYears: 1, // Income certificates older than 1 year are rejected by most scholarship boards
      identityMustBeUnexpired: true,
      strictDobMatch: true,
      allowMinorNameVariations: true,
      maxAllowedFileSizeMB: 10,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    },
  },
  COLLEGE_ADMISSION: {
    id: 'COLLEGE_ADMISSION',
    title: 'University / College Admission',
    shortTitle: 'College Admission',
    description: 'Undergraduate and postgraduate institutional admission document pre-check.',
    icon: 'Building2',
    badge: 'Academic Verification',
    mandatoryDocuments: [
      {
        type: 'APPLICATION_FORM',
        name: 'University Admission Form',
        description: 'Duly filled college or centralized counseling application form',
      },
      {
        type: 'IDENTITY_PROOF',
        name: 'Identity Proof (Aadhaar / Passport / Voter ID)',
        description: 'Valid national photo identity proof',
      },
      {
        type: 'MARKSHEET',
        name: 'Secondary / Higher Secondary Marksheet',
        description: 'Official marks card showing roll number, passing year, and marks',
      },
    ],
    optionalDocuments: [
      {
        type: 'INCOME_CERTIFICATE',
        name: 'Income Certificate (for Fee Waiver/EWS)',
        description: 'Required if applying for fee concession or economically weaker section quota',
      },
      {
        type: 'CASTE_CERTIFICATE',
        name: 'Caste / Category Certificate',
        description: 'Required for reserved category seats (SC/ST/OBC)',
      },
    ],
    rules: {
      maxIncomeCertificateAgeYears: 2,
      identityMustBeUnexpired: true,
      strictDobMatch: true,
      allowMinorNameVariations: true,
      maxAllowedFileSizeMB: 10,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    },
  },
  GOVERNMENT_SCHEME: {
    id: 'GOVERNMENT_SCHEME',
    title: 'Government Welfare & DBT Scheme',
    shortTitle: 'Government Scheme',
    description: 'Direct Benefit Transfer (DBT), skill grants, and social welfare scheme eligibility audit.',
    icon: 'Landmark',
    badge: 'Statutory Verification',
    mandatoryDocuments: [
      {
        type: 'APPLICATION_FORM',
        name: 'Scheme Beneficiary Application',
        description: 'Acknowledged application for the specific welfare scheme',
      },
      {
        type: 'IDENTITY_PROOF',
        name: 'Primary Identity Proof (Aadhaar / National ID)',
        description: 'Government photo identification document',
      },
      {
        type: 'INCOME_CERTIFICATE',
        name: 'Annual Family Income Certificate',
        description: 'Certified income certificate from local revenue authority',
      },
    ],
    optionalDocuments: [
      {
        type: 'MARKSHEET',
        name: 'Educational Qualification Proof',
        description: 'Required only if scheme has minimum educational criteria',
      },
      {
        type: 'CASTE_CERTIFICATE',
        name: 'Caste / Domicile Certificate',
        description: 'Required if scheme is targeted to specific demographic communities',
      },
    ],
    rules: {
      maxIncomeCertificateAgeYears: 1,
      identityMustBeUnexpired: true,
      strictDobMatch: true,
      allowMinorNameVariations: true,
      maxAllowedFileSizeMB: 10,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    },
  },
};

const DOCUMENT_CATEGORIES = [
  { type: 'APPLICATION_FORM', label: 'Application Form', icon: 'FileText' },
  { type: 'IDENTITY_PROOF', label: 'Identity Proof', icon: 'CreditCard' },
  { type: 'MARKSHEET', label: 'Marksheet / Academic Record', icon: 'Award' },
  { type: 'INCOME_CERTIFICATE', label: 'Income Certificate', icon: 'FileSpreadsheet' },
  { type: 'CASTE_CERTIFICATE', label: 'Caste / Community Certificate', icon: 'ShieldCheck' },
];

module.exports = {
  APPLICATION_CATEGORIES,
  DOCUMENT_CATEGORIES,
};

