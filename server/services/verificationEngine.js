// server/services/verificationEngine.js

const { APPLICATION_CATEGORIES } = require('../data/categories');

/**
 * Clean and normalize a personal name for comparison
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  
  let cleaned = name.toLowerCase();
  
  // Strip common honorifics & titles
  const honorifics = [
    /\b(?:mr|ms|mrs|miss|shri|smt|dr|prof|master|kumari|er)\b\.?/gi,
  ];
  for (const h of honorifics) {
    cleaned = cleaned.replace(h, ' ');
  }

  // Remove punctuation, extra spaces
  cleaned = cleaned.replace(/[^a-z\s]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Compute Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],    // deletion
          dp[i][j - 1],    // insertion
          dp[i - 1][j - 1] // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Compare two names and determine if they match, have minor variation, or mismatch
 */
function compareNames(nameA, nameB) {
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);

  if (!normA || !normB) {
    return {
      status: 'UNKNOWN',
      severity: 'INFO',
      type: 'INSUFFICIENT_DATA',
      message: 'One or both documents do not contain an extracted candidate name.',
      recommendation: 'Review the document manually and enter the candidate name if visible.',
    };
  }

  // 1. Exact normalized match
  if (normA === normB) {
    return {
      status: 'MATCH',
      severity: 'PASS',
      type: 'EXACT_MATCH',
      message: 'Names match exactly across documents.',
    };
  }

  const tokensA = normA.split(' ').filter(Boolean);
  const tokensB = normB.split(' ').filter(Boolean);

  // 2. Transposed name (e.g. "Sharma Rahul" vs "Rahul Sharma")
  if (tokensA.length === tokensB.length && tokensA.length > 1) {
    const sortedA = [...tokensA].sort().join(' ');
    const sortedB = [...tokensB].sort().join(' ');
    if (sortedA === sortedB) {
      return {
        status: 'MINOR_VARIATION',
        severity: 'WARNING',
        type: 'TRANSPOSED_ORDER',
        message: `Name order differs: "${nameA}" vs "${nameB}".`,
        recommendation: 'Ensure your application portal specifies First Name / Last Name fields correctly according to official records.',
      };
    }
  }

  // 3. Middle Initial or Middle Name variation (e.g. "Rahul S. Sharma" vs "Rahul Sharma" or "Rahul Suresh Sharma")
  const firstA = tokensA[0];
  const lastA = tokensA[tokensA.length - 1];
  const firstB = tokensB[0];
  const lastB = tokensB[tokensB.length - 1];

  if (firstA === firstB && lastA === lastB) {
    const middleTokensA = tokensA.slice(1, -1);
    const middleTokensB = tokensB.slice(1, -1);

    // One has middle initial, one has no middle name (e.g. Rahul S. Sharma vs Rahul Sharma)
    if ((middleTokensA.length > 0 && middleTokensB.length === 0) ||
        (middleTokensB.length > 0 && middleTokensA.length === 0)) {
      const withMiddle = middleTokensA.length > 0 ? nameA : nameB;
      const withoutMiddle = middleTokensA.length > 0 ? nameB : nameA;
      const initial = (middleTokensA[0] || middleTokensB[0] || '').toUpperCase();

      return {
        status: 'MINOR_VARIATION',
        severity: 'WARNING',
        type: 'INITIAL_OR_MIDDLE_NAME',
        message: `Name variation detected: "${withMiddle}" contains middle component/initial "${initial}", while "${withoutMiddle}" omits it.`,
        recommendation: 'Most selection committees accept single-letter initials if the father\'s name matches. Verify if your portal requires expanding the full name as per 10th marksheet or identity card.',
      };
    }

    // Middle initial matches full middle name starting letter (e.g. Rahul S. Sharma vs Rahul Suresh Sharma)
    if (middleTokensA.length === 1 && middleTokensB.length === 1) {
      const midA = middleTokensA[0];
      const midB = middleTokensB[0];
      if (midA[0] === midB[0] && (midA.length === 1 || midB.length === 1)) {
        return {
          status: 'MINOR_VARIATION',
          severity: 'WARNING',
          type: 'INITIAL_EXPANSION',
          message: `Middle initial expansion detected: "${nameA}" vs "${nameB}".`,
          recommendation: 'Ensure consistency with the primary document required by the scheme guidelines.',
        };
      }
    }
  }

  // 4. Minor typo (Levenshtein distance <= 2 on longer names)
  const dist = levenshteinDistance(normA, normB);
  if (dist <= 2 && Math.min(normA.length, normB.length) >= 6) {
    return {
      status: 'MINOR_VARIATION',
      severity: 'WARNING',
      type: 'POTENTIAL_TYPO',
      message: `Minor spelling variation (${dist} character difference): "${nameA}" vs "${nameB}".`,
      recommendation: 'Double check for typographical errors in the portal application form compared to official certificates.',
    };
  }

  // 5. Significant mismatch
  return {
    status: 'MISMATCH',
    severity: 'CRITICAL',
    type: 'NAME_MISMATCH',
    message: `Significant name discrepancy: "${nameA}" does not match "${nameB}".`,
    recommendation: 'Application is at high risk of immediate rejection due to candidate identity discrepancy. Review documents and upload an official gazette notification or name rectification certificate if applicable.',
  };
}

/**
 * Format a Date object to DD/MM/YYYY string
 */
function formatDDMMYYYY(date) {
  if (!date || isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Standardize and parse dates supporting DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, D-M-YYYY, and YYYY-MM-DD.
 * Strictly validates that date values are real calendar dates (prevents rollover like 31/02/2025).
 */
function parseStandardDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const cleanStr = dateStr.trim();

  let day, month, year;

  // Format 1: DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, D-M-YYYY
  const dmyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  } else {
    // Format 2: YYYY-MM-DD, YYYY/MM/DD, YYYY-M-D
    const ymdMatch = cleanStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
      year = parseInt(ymdMatch[1], 10);
      month = parseInt(ymdMatch[2], 10);
      day = parseInt(ymdMatch[3], 10);
    } else {
      return null;
    }
  }

  // Range validation
  if (month < 1 || month > 12) return null;
  if (year < 1900 || year > 2100) return null;

  const d = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(d.getTime())) return null;

  // Verify no calendar rollover occurred (e.g. Feb 31 becoming Mar 3)
  if (d.getUTCDate() !== day || d.getUTCMonth() !== month - 1 || d.getUTCFullYear() !== year) {
    return null;
  }

  return d;
}

/**
 * Compare two dates of birth
 */
function compareDateOfBirth(dobA, dobB) {
  if (!dobA || !dobB) {
    return {
      status: 'UNKNOWN',
      severity: 'INFO',
      type: 'INSUFFICIENT_DOB',
      message: 'Date of birth missing in one or both documents.',
      recommendation: 'Review document manually to ensure DOB is visible and legible.',
    };
  }

  const cleanA = String(dobA).trim();
  const cleanB = String(dobB).trim();

  if (cleanA === cleanB) {
    return {
      status: 'MATCH',
      severity: 'PASS',
      type: 'EXACT_MATCH',
      message: `Date of birth matches exactly (${cleanA}).`,
    };
  }

  const parsedA = parseStandardDate(cleanA);
  const parsedB = parseStandardDate(cleanB);

  // If both parse into valid dates and are identical timestamp
  if (parsedA && parsedB && parsedA.getTime() === parsedB.getTime()) {
    return {
      status: 'MATCH',
      severity: 'PASS',
      type: 'EXACT_MATCH',
      message: `Date of birth matches (${cleanA} and ${cleanB} represent the same date).`,
    };
  }

  // If both parsed but differ
  if (parsedA && parsedB) {
    const yearA = parsedA.getUTCFullYear();
    const yearB = parsedB.getUTCFullYear();

    if (yearA !== yearB) {
      return {
        status: 'MISMATCH',
        severity: 'CRITICAL',
        type: 'DOB_YEAR_MISMATCH',
        message: `Date of birth mismatch: Year of birth differs (${yearA} in one document vs ${yearB} in another; full dates: ${cleanA} vs ${cleanB}).`,
        recommendation: 'High rejection risk. Government and scholarship portals validate DOB strictly against 10th marksheet / Aadhaar database. Obtain a corrected certificate before submitting.',
      };
    }

    // Check if day and month are flipped (e.g. 05/12/2005 vs 12/05/2005)
    if (parsedA.getUTCDate() === parsedB.getUTCMonth() + 1 && parsedA.getUTCMonth() + 1 === parsedB.getUTCDate()) {
      return {
        status: 'AMBIGUOUS_FORMAT',
        severity: 'WARNING',
        type: 'DOB_FORMAT_FLIPPED',
        message: `Date of birth formatting ambiguity detected (${cleanA} vs ${cleanB}). Day and month appear transposed (DD/MM vs MM/DD).`,
        recommendation: 'Verify the intended date format in each certificate to avoid rejection caused by DD/MM/YYYY vs MM/DD/YYYY mismatch.',
      };
    }
  }

  // Fallback string-based component analysis if non-standard format
  const partsA = cleanA.split(/[\/\-\.]/);
  const partsB = cleanB.split(/[\/\-\.]/);

  if (partsA.length === 3 && partsB.length === 3) {
    const [dayA, monthA, yearA] = partsA;
    const [dayB, monthB, yearB] = partsB;

    if (dayA === monthB && monthA === dayB && yearA === yearB) {
      return {
        status: 'AMBIGUOUS_FORMAT',
        severity: 'WARNING',
        type: 'DOB_FORMAT_FLIPPED',
        message: `Date of birth formatting ambiguity detected (${cleanA} vs ${cleanB}). Day and month appear transposed (DD/MM vs MM/DD).`,
        recommendation: 'Verify the intended date format in each certificate to avoid rejection caused by DD/MM/YYYY vs MM/DD/YYYY mismatch.',
      };
    }

    if (yearA !== yearB) {
      return {
        status: 'MISMATCH',
        severity: 'CRITICAL',
        type: 'DOB_YEAR_MISMATCH',
        message: `Date of birth mismatch: Year of birth differs (${yearA} in one document vs ${yearB} in another; full dates: ${cleanA} vs ${cleanB}).`,
        recommendation: 'High rejection risk. Government and scholarship portals validate DOB strictly against 10th marksheet / Aadhaar database. Obtain a corrected certificate before submitting.',
      };
    }
  }

  return {
    status: 'MISMATCH',
    severity: 'CRITICAL',
    type: 'DOB_MISMATCH',
    message: `Date of birth mismatch: "${cleanA}" does not match "${cleanB}".`,
    recommendation: 'Strict DOB alignment is required by admission and scholarship bodies. Resolve the discrepancy with the issuing department.',
  };
}

/**
 * Check if a certificate is expired or older than permitted threshold
 */
function checkDocumentValidity(doc, categoryRules) {
  const currentDate = new Date();
  const currentDateFormatted = formatDDMMYYYY(currentDate);
  const issues = [];
  const { extractedData, docCategory, filename } = doc;

  if (!extractedData) return issues;

  // 1. Explicit Expiry Date Check
  if (extractedData.expiryDate) {
    const expDate = parseStandardDate(extractedData.expiryDate);
    if (expDate) {
      if (expDate < currentDate) {
        issues.push({
          severity: 'CRITICAL',
          type: 'EXPIRED_DOCUMENT',
          docCategory,
          filename,
          message: `Document expired on ${extractedData.expiryDate} (Current date: ${currentDateFormatted}).`,
          recommendation: 'Obtain an updated, non-expired certificate prior to submission.',
        });
      } else {
        // Expiring within 30 days
        const diffDays = Math.ceil((expDate - currentDate) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) {
          issues.push({
            severity: 'WARNING',
            type: 'EXPIRING_SOON',
            docCategory,
            filename,
            message: `Document validity will expire soon in ${diffDays} days (${extractedData.expiryDate}).`,
            recommendation: 'Consider renewing certificate early to prevent ineligibility during mid-term verification.',
          });
        }
      }
    }
  }

  // 2. Income Certificate Freshness Check
  if (docCategory === 'INCOME_CERTIFICATE' && extractedData.issueDate) {
    const issueDate = parseStandardDate(extractedData.issueDate);
    if (issueDate) {
      const maxYears = categoryRules?.maxIncomeCertificateAgeYears || 1;
      const ageInMs = currentDate - issueDate;
      const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25);

      if (ageInYears > maxYears) {
        issues.push({
          severity: 'CRITICAL',
          type: 'STALE_INCOME_CERTIFICATE',
          docCategory,
          filename,
          message: `Income certificate was issued on ${extractedData.issueDate} (> ${maxYears} year(s) old). Most scholarship and government portals mandate an income certificate from the current financial year.`,
          recommendation: `Apply for an updated Income Certificate for the current assessment cycle from your local Tehsildar / Sub-Divisional Magistrate office.`,
        });
      }
    }
  }

  return issues;
}

/**
 * Conservative content-based validation of document type
 */
function verifyDocumentContent(doc) {
  const data = doc.extractedData || {};
  const rawText = (doc.rawText || '').toLowerCase();
  const quality = data.quality || {};
  const hasRawDocumentEvidence = Boolean(
    quality.hasLegibleVocabulary ||
    quality.keywordMatches >= 1 ||
    quality.hasDocumentPatterns ||
    rawText.match(/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/) ||
    rawText.match(/\b\d{4}[\s\-]\d{4}[\s\-]\d{4}\b/) ||
    (rawText.match(/[a-z]{3,}/g) || []).length >= 5
  );

  // If applicant manually reviewed/edited fields:
  if (doc.isUserVerified) {
    // If the physical file was an unreadable scan or had zero document evidence
    if (!hasRawDocumentEvidence || data.scanWasReadable === false || data.isReadable === false) {
      return {
        status: 'UNVERIFIED',
        severity: 'WARNING',
        message: 'Applicant manually supplied field details, but the uploaded file contains no verifiable document text or indicators. An official document scan is required.',
        isUserConfirmed: true,
        unverifiableFile: true,
      };
    }

    // Genuine document scan where applicant confirmed or corrected OCR fields
    return {
      status: 'VERIFIED',
      severity: 'PASS',
      message: 'Document details manually reviewed and confirmed by applicant against document scan.',
      isUserConfirmed: true,
    };
  }

  // Not user verified: check if scan is unreadable
  const isReadable = data.isReadable !== false;
  if (!isReadable) {
    return {
      status: 'UNREADABLE',
      severity: 'CRITICAL',
      message: data.unreadableReason || 'Document text is unreadable or contains no legible document content.',
    };
  }

  const category = doc.docCategory;

  // Identity Proof category markers
  const identityKeywords = [
    'aadhaar', 'uidai', 'unique identification', 'identity card', 'voter', 'election commission',
    'passport', 'pan card', 'driving licence', 'driving license', 'national identity',
    'government of india', 'republic of india', 'vid', 'uid'
  ];
  const hasIdentityKeyword = identityKeywords.some(kw => rawText.includes(kw));

  // Marksheet category markers
  const marksheetKeywords = [
    'marksheet', 'marks card', 'statement of marks', 'board of secondary', 'central board',
    'cbse', 'icse', 'examination result', 'roll no', 'subject', 'total marks', 'cgpa', 'percentage'
  ];
  const hasMarksheetKeyword = marksheetKeywords.some(kw => rawText.includes(kw));

  // Income Certificate category markers
  const incomeKeywords = [
    'income certificate', 'annual income', 'family income', 'revenue department',
    'tahsildar', 'tehsildar', 'sub-divisional magistrate', 'sdm'
  ];
  const hasIncomeKeyword = incomeKeywords.some(kw => rawText.includes(kw));

  // Application Form category markers
  const applicationKeywords = [
    'application form', 'scholarship application', 'admission form', 'scheme application',
    'registration form', 'acknowledgement slip', 'summary of application'
  ];
  const hasApplicationKeyword = applicationKeywords.some(kw => rawText.includes(kw));

  // Caste Certificate category markers
  const casteKeywords = [
    'caste certificate', 'community certificate', 'scheduled caste', 'scheduled tribe',
    'other backward class', 'obc certificate', 'sc certificate', 'st certificate'
  ];
  const hasCasteKeyword = casteKeywords.some(kw => rawText.includes(kw));

  switch (category) {
    case 'IDENTITY_PROOF': {
      if (hasMarksheetKeyword && !hasIdentityKeyword) {
        return {
          status: 'CATEGORY_MISMATCH',
          severity: 'CRITICAL',
          message: 'Document appears to be an Academic Marksheet rather than Identity Proof.',
          detectedCategory: 'MARKSHEET',
        };
      }
      if (hasIncomeKeyword && !hasIdentityKeyword) {
        return {
          status: 'CATEGORY_MISMATCH',
          severity: 'CRITICAL',
          message: 'Document appears to be an Income Certificate rather than Identity Proof.',
          detectedCategory: 'INCOME_CERTIFICATE',
        };
      }

      const hasIdentityData = Boolean(
        data.candidateName && (data.dateOfBirth || data.documentNumber || hasIdentityKeyword || rawText.includes('male') || rawText.includes('female'))
      );

      if (hasIdentityKeyword || hasIdentityData) {
        return {
          status: 'VERIFIED',
          severity: 'PASS',
          message: 'Document content verified as Identity Proof with matching government identity indicators and candidate details.',
        };
      }

      return {
        status: 'UNVERIFIED',
        severity: 'WARNING',
        message: 'Document content could not be established conclusively as Identity Proof. Standard identity headers, photo ID markers, or candidate details were not detected.',
      };
    }

    case 'MARKSHEET': {
      if (hasIdentityKeyword && !hasMarksheetKeyword) {
        return {
          status: 'CATEGORY_MISMATCH',
          severity: 'CRITICAL',
          message: 'Document appears to be Identity Proof rather than an Academic Marksheet.',
          detectedCategory: 'IDENTITY_PROOF',
        };
      }
      if (hasIncomeKeyword && !hasMarksheetKeyword) {
        return {
          status: 'CATEGORY_MISMATCH',
          severity: 'CRITICAL',
          message: 'Document appears to be an Income Certificate rather than an Academic Marksheet.',
          detectedCategory: 'INCOME_CERTIFICATE',
        };
      }

      const hasMarksheetData = Boolean(
        data.candidateName && (data.documentNumber || data.extraDetails?.score || data.extraDetails?.passingYear || hasMarksheetKeyword)
      );

      if (hasMarksheetKeyword || hasMarksheetData) {
        return {
          status: 'VERIFIED',
          severity: 'PASS',
          message: 'Document content verified as Academic Marksheet / Grade Record.',
        };
      }

      return {
        status: 'UNVERIFIED',
        severity: 'WARNING',
        message: 'Document content could not be established conclusively as an Academic Marksheet. Board headers, roll number, or score breakdown were not detected.',
      };
    }

    case 'INCOME_CERTIFICATE': {
      if (hasMarksheetKeyword && !hasIncomeKeyword) {
        return {
          status: 'CATEGORY_MISMATCH',
          severity: 'CRITICAL',
          message: 'Document appears to be an Academic Marksheet rather than an Income Certificate.',
          detectedCategory: 'MARKSHEET',
        };
      }
      if (hasIdentityKeyword && !hasIncomeKeyword) {
        return {
          status: 'CATEGORY_MISMATCH',
          severity: 'CRITICAL',
          message: 'Document appears to be Identity Proof rather than an Income Certificate.',
          detectedCategory: 'IDENTITY_PROOF',
        };
      }

      const hasIncomeData = Boolean(
        (data.candidateName || data.extraDetails?.fatherName) && (data.extraDetails?.incomeAmount || hasIncomeKeyword)
      );

      if (hasIncomeKeyword || hasIncomeData) {
        return {
          status: 'VERIFIED',
          severity: 'PASS',
          message: 'Document content verified as Competent Authority Income Certificate.',
        };
      }

      return {
        status: 'UNVERIFIED',
        severity: 'WARNING',
        message: 'Document content could not be established conclusively as an Income Certificate. Competent revenue authority certification or income figures were not detected.',
      };
    }

    case 'APPLICATION_FORM': {
      if (hasApplicationKeyword || (data.candidateName && data.documentNumber)) {
        return {
          status: 'VERIFIED',
          severity: 'PASS',
          message: 'Document content verified as Application Form.',
        };
      }
      return {
        status: 'UNVERIFIED',
        severity: 'WARNING',
        message: 'Document could not be verified as an official Application Form.',
      };
    }

    case 'CASTE_CERTIFICATE': {
      if (hasCasteKeyword || (data.candidateName && rawText.includes('certif'))) {
        return {
          status: 'VERIFIED',
          severity: 'PASS',
          message: 'Document content verified as Caste / Community Certificate.',
        };
      }
      return {
        status: 'UNVERIFIED',
        severity: 'WARNING',
        message: 'Document could not be verified as a Caste / Community Certificate.',
      };
    }

    default: {
      return {
        status: 'VERIFIED',
        severity: 'PASS',
        message: 'Document format accepted.',
      };
    }
  }
}

/**
 * Main cross-document verification and audit execution engine
 */
function performAuditVerification(audit) {
  const { category: categoryId, documents, applicantInfo } = audit;
  const categoryConfig = APPLICATION_CATEGORIES[categoryId] || APPLICATION_CATEGORIES.SCHOLARSHIP;
  const rules = categoryConfig.rules || {};

  const auditChecks = [];
  const rawDiscrepancies = [];
  const missingDocuments = [];
  const unreadableDocuments = [];
  const unverifiedDocuments = [];
  const rawCorrectiveActions = [];

  // 1. First Pass: Evaluate Content and Readability for each document
  for (const doc of documents) {
    doc.contentVerification = verifyDocumentContent(doc);
  }

  // Group uploaded documents by category
  const uploadedCategoryMap = {};
  for (const doc of documents) {
    if (!uploadedCategoryMap[doc.docCategory]) {
      uploadedCategoryMap[doc.docCategory] = [];
    }
    uploadedCategoryMap[doc.docCategory].push(doc);
  }

  // 2. Mandatory Document Category Compliance Checks
  for (const reqDoc of categoryConfig.mandatoryDocuments) {
    const matchingDocs = uploadedCategoryMap[reqDoc.type] || [];
    if (matchingDocs.length === 0) {
      missingDocuments.push({
        type: reqDoc.type,
        name: reqDoc.name,
        description: reqDoc.description,
        isMandatory: true,
      });

      auditChecks.push({
        id: `mand-${reqDoc.type}`,
        title: `Mandatory Document: ${reqDoc.name}`,
        status: 'FAILED',
        severity: 'CRITICAL',
        category: 'COMPLIANCE',
        details: `Missing mandatory document category: ${reqDoc.name}.`,
      });

      rawCorrectiveActions.push({
        priority: 'HIGH',
        category: 'Missing Document',
        action: `Upload your official ${reqDoc.name} before submitting to avoid immediate disqualification.`,
        targetDocument: reqDoc.name,
      });
    } else {
      // Check verification quality of the uploaded documents for this mandatory requirement
      const verifiedDoc = matchingDocs.find(d => 
        (d.contentVerification?.status === 'VERIFIED') && !d.contentVerification?.unverifiableFile
      );
      const manualUnverifiedDoc = matchingDocs.find(d => 
        d.isUserVerified && d.contentVerification?.unverifiableFile
      );
      const mismatchDoc = matchingDocs.find(d => d.contentVerification?.status === 'CATEGORY_MISMATCH');
      const unreadableDoc = matchingDocs.find(d => !d.extractedData?.isReadable);

      if (verifiedDoc) {
        auditChecks.push({
          id: `mand-${reqDoc.type}`,
          title: `Mandatory Document: ${reqDoc.name}`,
          status: 'PASSED',
          severity: 'PASS',
          category: 'COMPLIANCE',
          details: `Provided and verified (${verifiedDoc.filename})`,
        });
      } else if (manualUnverifiedDoc) {
        auditChecks.push({
          id: `mand-${reqDoc.type}`,
          title: `Mandatory Document: ${reqDoc.name}`,
          status: 'UNVERIFIED',
          severity: 'WARNING',
          category: 'COMPLIANCE',
          details: `Uploaded file "${manualUnverifiedDoc.filename}" has applicant-supplied fields, but file content cannot be verified as an official ${reqDoc.name}.`,
        });

        unverifiedDocuments.push({
          type: reqDoc.type,
          name: reqDoc.name,
          filename: manualUnverifiedDoc.filename,
          reason: 'Manual field entry cannot substitute for a verifiable document scan.',
        });

        rawCorrectiveActions.push({
          priority: 'HIGH',
          category: 'Document Verification',
          action: `Upload an official, legible scan of your ${reqDoc.name}. Manually entering details on an unreadable image does not satisfy document verification requirements.`,
          targetDocument: manualUnverifiedDoc.filename,
        });
      } else if (mismatchDoc) {
        auditChecks.push({
          id: `mand-${reqDoc.type}`,
          title: `Mandatory Document: ${reqDoc.name}`,
          status: 'FAILED',
          severity: 'CRITICAL',
          category: 'COMPLIANCE',
          details: `Uploaded file "${mismatchDoc.filename}" does not match required category ${reqDoc.name} (${mismatchDoc.contentVerification?.message}).`,
        });

        rawCorrectiveActions.push({
          priority: 'HIGH',
          category: 'Document Category Mismatch',
          action: `The file uploaded for ${reqDoc.name} appears to be a ${mismatchDoc.contentVerification?.detectedCategory || 'different document'}. Upload your official ${reqDoc.name}.`,
          targetDocument: mismatchDoc.filename,
        });
      } else if (unreadableDoc) {
        auditChecks.push({
          id: `mand-${reqDoc.type}`,
          title: `Mandatory Document: ${reqDoc.name}`,
          status: 'FAILED',
          severity: 'CRITICAL',
          category: 'COMPLIANCE',
          details: `Uploaded file "${unreadableDoc.filename}" for ${reqDoc.name} is unreadable and cannot be verified.`,
        });

        rawCorrectiveActions.push({
          priority: 'HIGH',
          category: 'Unreadable Mandatory Document',
          action: `The file uploaded for ${reqDoc.name} contains no legible document text. Upload a clear, high-contrast scan of your official ${reqDoc.name}.`,
          targetDocument: unreadableDoc.filename,
        });
      } else {
        // Uploaded and readable, but contents could not be established conclusively
        auditChecks.push({
          id: `mand-${reqDoc.type}`,
          title: `Mandatory Document: ${reqDoc.name}`,
          status: 'UNVERIFIED',
          severity: 'WARNING',
          category: 'COMPLIANCE',
          details: `Uploaded file "${matchingDocs[0].filename}" was submitted under ${reqDoc.name}, but standard document indicators were not conclusively detected.`,
        });

        unverifiedDocuments.push({
          type: reqDoc.type,
          name: reqDoc.name,
          filename: matchingDocs[0].filename,
          reason: matchingDocs[0].contentVerification?.message,
        });

        rawCorrectiveActions.push({
          priority: 'MEDIUM',
          category: 'Document Verification',
          action: `Confirm that "${matchingDocs[0].filename}" is your official ${reqDoc.name} and review extracted fields in Step 3 before submitting.`,
          targetDocument: matchingDocs[0].filename,
        });
      }
    }
  }

  // Optional Documents status
  if (categoryConfig.optionalDocuments) {
    for (const optDoc of categoryConfig.optionalDocuments) {
      const matchingDocs = uploadedCategoryMap[optDoc.type] || [];
      if (matchingDocs.length > 0) {
        const isVerified = matchingDocs.some(d => d.contentVerification?.status === 'VERIFIED' || d.isUserVerified);
        auditChecks.push({
          id: `opt-${optDoc.type}`,
          title: `Optional Document: ${optDoc.name}`,
          status: isVerified ? 'PASSED' : 'UNVERIFIED',
          severity: isVerified ? 'INFO' : 'WARNING',
          category: 'COMPLIANCE',
          details: isVerified
            ? `Provided and verified (${matchingDocs.map(d => d.filename).join(', ')})`
            : `Provided (${matchingDocs[0].filename}), but content is not conclusively verified.`,
        });
      }
    }
  }

  // 3. Document-by-Document Quality, Readability, and Content Verification Checks
  for (const doc of documents) {
    // 3A. File Format and Size Validation
    const isAllowedMime = rules.allowedMimeTypes.includes(doc.mimeType);
    const sizeInMB = (doc.size || 0) / (1024 * 1024);
    const isAllowedSize = sizeInMB <= rules.maxAllowedFileSizeMB;

    if (!isAllowedMime || !isAllowedSize) {
      auditChecks.push({
        id: `fmt-${doc.id}`,
        title: `Format & Size: ${doc.filename}`,
        status: 'FAILED',
        severity: 'WARNING',
        category: 'FORMAT',
        details: !isAllowedMime
          ? `File format "${doc.mimeType}" is not recommended. Use PDF, JPG, or PNG.`
          : `File size (${sizeInMB.toFixed(1)} MB) exceeds maximum portal limit of ${rules.maxAllowedFileSizeMB} MB.`,
      });
      rawCorrectiveActions.push({
        priority: 'MEDIUM',
        category: 'File Specifications',
        action: `Compress or convert "${doc.filename}" to meet standard portal constraints (PDF/JPG under 10MB).`,
        targetDocument: doc.filename,
      });
    } else {
      auditChecks.push({
        id: `fmt-${doc.id}`,
        title: `Format & Size: ${doc.filename}`,
        status: 'PASSED',
        severity: 'PASS',
        category: 'FORMAT',
        details: `File format (${doc.mimeType}) and size (${sizeInMB.toFixed(2)} MB) meet standard portal requirements.`,
      });
    }

    // 3B. Readability & Scan Quality Checks
    const isReadable = doc.extractedData?.isReadable !== false;
    const confidence = doc.extractedData?.confidence || 0;

    if (!isReadable) {
      unreadableDocuments.push({
        id: doc.id,
        filename: doc.filename,
        docCategory: doc.docCategory,
        reason: doc.extractedData?.unreadableReason || 'Low scan clarity or unreadable text',
      });

      auditChecks.push({
        id: `read-${doc.id}`,
        title: `Readability Check: ${doc.filename}`,
        status: 'FAILED',
        severity: 'CRITICAL',
        category: 'LEGIBILITY',
        details: `Document text could not be reliably extracted. Reason: ${doc.extractedData?.unreadableReason || 'Unreadable scan'}.`,
      });

      rawCorrectiveActions.push({
        priority: 'HIGH',
        category: 'Scan Legibility',
        action: `Re-scan "${doc.filename}" at 300 DPI with good lighting and high contrast, ensuring all text and stamps are sharply focused.`,
        targetDocument: doc.filename,
      });
    } else if (confidence < 60) {
      // Borderline low-confidence extraction
      auditChecks.push({
        id: `read-${doc.id}`,
        title: `Readability Check: ${doc.filename}`,
        status: 'WARNING',
        severity: 'WARNING',
        category: 'LEGIBILITY',
        details: `Low-confidence OCR text extraction (${confidence}%). Some characters may be misread or degraded. Please verify extracted fields in Step 3.`,
      });

      rawCorrectiveActions.push({
        priority: 'MEDIUM',
        category: 'Scan Legibility',
        action: `Review and verify the extracted fields for "${doc.filename}" in Step 3, or re-upload a cleaner scan if misreadings occur.`,
        targetDocument: doc.filename,
      });
    } else {
      auditChecks.push({
        id: `read-${doc.id}`,
        title: `Readability Check: ${doc.filename}`,
        status: 'PASSED',
        severity: 'PASS',
        category: 'LEGIBILITY',
        details: `Readable text extracted with ${confidence}% confidence score.`,
      });
    }

    // 3C. Document Content & Type Verification
    const contentRes = doc.contentVerification || verifyDocumentContent(doc);
    if (contentRes.status === 'VERIFIED') {
      auditChecks.push({
        id: `content-${doc.id}`,
        title: `Content Verification: ${doc.filename}`,
        status: 'PASSED',
        severity: 'PASS',
        category: 'DOCUMENT_TYPE',
        details: contentRes.message,
      });
    } else if (contentRes.status === 'CATEGORY_MISMATCH') {
      auditChecks.push({
        id: `content-${doc.id}`,
        title: `Content Verification: ${doc.filename}`,
        status: 'FAILED',
        severity: 'CRITICAL',
        category: 'DOCUMENT_TYPE',
        details: contentRes.message,
      });

      rawCorrectiveActions.push({
        priority: 'HIGH',
        category: 'Category Mismatch',
        action: `Document "${doc.filename}" does not match declared category "${doc.docCategory}". Upload the correct document.`,
        targetDocument: doc.filename,
      });
    } else if (contentRes.status === 'UNVERIFIED') {
      auditChecks.push({
        id: `content-${doc.id}`,
        title: `Content Verification: ${doc.filename}`,
        status: 'UNVERIFIED',
        severity: 'WARNING',
        category: 'DOCUMENT_TYPE',
        details: contentRes.message,
      });

      rawCorrectiveActions.push({
        priority: 'MEDIUM',
        category: 'Content Verification',
        action: `Verify that "${doc.filename}" is an official ${doc.docCategory} and confirm details manually in Step 3.`,
        targetDocument: doc.filename,
      });
    } else {
      // UNREADABLE
      auditChecks.push({
        id: `content-${doc.id}`,
        title: `Content Verification: ${doc.filename}`,
        status: 'FAILED',
        severity: 'CRITICAL',
        category: 'DOCUMENT_TYPE',
        details: `Document text is unreadable. Content cannot be verified as ${doc.docCategory}.`,
      });
    }

    // 4. Validity & Expiry Checks
    const validityIssues = checkDocumentValidity(doc, rules);
    for (const vIssue of validityIssues) {
      rawDiscrepancies.push({
        field: 'DOCUMENT_VALIDITY',
        severity: vIssue.severity,
        type: vIssue.type,
        docCategory: vIssue.docCategory,
        sourceA: doc.filename,
        valueA: doc.extractedData?.issueDate ? `Issued: ${doc.extractedData.issueDate}` : `Expired: ${doc.extractedData?.expiryDate}`,
        sourceB: `System Audit Date (${formatDDMMYYYY(new Date())})`,
        valueB: 'Current Active Requirement',
        message: vIssue.message,
        recommendation: vIssue.recommendation,
      });

      auditChecks.push({
        id: `val-${doc.id}-${vIssue.type}`,
        title: `Certificate Validity: ${doc.filename}`,
        status: vIssue.severity === 'CRITICAL' ? 'FAILED' : 'WARNING',
        severity: vIssue.severity,
        category: 'VALIDITY',
        details: vIssue.message,
      });

      rawCorrectiveActions.push({
        priority: vIssue.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        category: 'Certificate Validity',
        action: vIssue.recommendation,
        targetDocument: doc.filename,
      });
    }
  }

  // 5. Cross-Document Candidate Name Comparisons
  const docsWithNames = documents.filter(d => d.extractedData?.candidateName && d.extractedData?.isReadable !== false);

  if (docsWithNames.length >= 2) {
    for (let i = 0; i < docsWithNames.length; i++) {
      for (let j = i + 1; j < docsWithNames.length; j++) {
        const doc1 = docsWithNames[i];
        const doc2 = docsWithNames[j];
        const name1 = doc1.extractedData.candidateName;
        const name2 = doc2.extractedData.candidateName;

        const comparison = compareNames(name1, name2);

        if (comparison.severity === 'PASS') {
          auditChecks.push({
            id: `name-cmp-${doc1.id}-${doc2.id}`,
            title: `Name Cross-Check: ${doc1.filename} ⟷ ${doc2.filename}`,
            status: 'PASSED',
            severity: 'PASS',
            category: 'IDENTITY_CROSS_MATCH',
            details: `Name consistent: "${name1}" matches "${name2}".`,
          });
        } else if (comparison.severity === 'WARNING') {
          rawDiscrepancies.push({
            field: 'CANDIDATE_NAME',
            severity: 'WARNING',
            docCategoryA: doc1.docCategory,
            sourceA: doc1.filename,
            valueA: name1,
            docCategoryB: doc2.docCategory,
            sourceB: doc2.filename,
            valueB: name2,
            type: comparison.type,
            message: comparison.message,
            recommendation: comparison.recommendation,
          });

          auditChecks.push({
            id: `name-cmp-${doc1.id}-${doc2.id}`,
            title: `Name Variation: ${doc1.filename} ⟷ ${doc2.filename}`,
            status: 'WARNING',
            severity: 'WARNING',
            category: 'IDENTITY_CROSS_MATCH',
            details: comparison.message,
          });

          rawCorrectiveActions.push({
            priority: 'MEDIUM',
            category: 'Name Consistency',
            action: `${comparison.recommendation} (Observed: "${name1}" in ${doc1.filename} vs "${name2}" in ${doc2.filename}).`,
            targetDocument: `${doc1.filename} / ${doc2.filename}`,
          });
        } else if (comparison.severity === 'CRITICAL') {
          rawDiscrepancies.push({
            field: 'CANDIDATE_NAME',
            severity: 'CRITICAL',
            docCategoryA: doc1.docCategory,
            sourceA: doc1.filename,
            valueA: name1,
            docCategoryB: doc2.docCategory,
            sourceB: doc2.filename,
            valueB: name2,
            type: comparison.type,
            message: comparison.message,
            recommendation: comparison.recommendation,
          });

          auditChecks.push({
            id: `name-cmp-${doc1.id}-${doc2.id}`,
            title: `Name Discrepancy: ${doc1.filename} ⟷ ${doc2.filename}`,
            status: 'FAILED',
            severity: 'CRITICAL',
            category: 'IDENTITY_CROSS_MATCH',
            details: comparison.message,
          });

          rawCorrectiveActions.push({
            priority: 'HIGH',
            category: 'Identity Mismatch',
            action: `${comparison.recommendation} (Conflicting names: "${name1}" vs "${name2}").`,
            targetDocument: `${doc1.filename} / ${doc2.filename}`,
          });
        }
      }
    }
  }

  // 6. Cross-Document Date of Birth (DOB) Comparisons
  const docsWithDob = documents.filter(d => d.extractedData?.dateOfBirth && d.extractedData?.isReadable !== false);

  if (docsWithDob.length >= 2) {
    for (let i = 0; i < docsWithDob.length; i++) {
      for (let j = i + 1; j < docsWithDob.length; j++) {
        const doc1 = docsWithDob[i];
        const doc2 = docsWithDob[j];
        const dob1 = doc1.extractedData.dateOfBirth;
        const dob2 = doc2.extractedData.dateOfBirth;

        const dobComparison = compareDateOfBirth(dob1, dob2);

        if (dobComparison.severity === 'PASS') {
          auditChecks.push({
            id: `dob-cmp-${doc1.id}-${doc2.id}`,
            title: `DOB Cross-Check: ${doc1.filename} ⟷ ${doc2.filename}`,
            status: 'PASSED',
            severity: 'PASS',
            category: 'DOB_CROSS_MATCH',
            details: `DOB matches: ${dob1}.`,
          });
        } else {
          rawDiscrepancies.push({
            field: 'DATE_OF_BIRTH',
            severity: dobComparison.severity,
            docCategoryA: doc1.docCategory,
            sourceA: doc1.filename,
            valueA: dob1,
            docCategoryB: doc2.docCategory,
            sourceB: doc2.filename,
            valueB: dob2,
            type: dobComparison.type,
            message: dobComparison.message,
            recommendation: dobComparison.recommendation,
          });

          auditChecks.push({
            id: `dob-cmp-${doc1.id}-${doc2.id}`,
            title: `DOB Conflict: ${doc1.filename} ⟷ ${doc2.filename}`,
            status: dobComparison.severity === 'CRITICAL' ? 'FAILED' : 'WARNING',
            severity: dobComparison.severity,
            category: 'DOB_CROSS_MATCH',
            details: dobComparison.message,
          });

          rawCorrectiveActions.push({
            priority: 'HIGH',
            category: 'Date of Birth Mismatch',
            action: `${dobComparison.recommendation} (Conflicting values: ${dob1} in ${doc1.filename} vs ${dob2} in ${doc2.filename}).`,
            targetDocument: `${doc1.filename} / ${doc2.filename}`,
          });
        }
      }
    }
  }

  // Deduplicate cross-document discrepancies
  const seenDiscKeys = new Set();
  const crossDocDiscrepancies = [];
  for (const disc of rawDiscrepancies) {
    const normValA = String(disc.valueA || '').trim().toLowerCase();
    const normValB = String(disc.valueB || '').trim().toLowerCase();
    const sortedVals = [normValA, normValB].sort().join(':::');
    const discKey = `${disc.field}:::${disc.type || ''}:::${sortedVals}`;
    if (!seenDiscKeys.has(discKey)) {
      seenDiscKeys.add(discKey);
      crossDocDiscrepancies.push({ ...disc });
    } else {
      // Append secondary source document name if not already listed
      const existing = crossDocDiscrepancies.find(d => {
        const eA = String(d.valueA || '').trim().toLowerCase();
        const eB = String(d.valueB || '').trim().toLowerCase();
        return d.field === disc.field && (d.type || '') === (disc.type || '') && [eA, eB].sort().join(':::') === sortedVals;
      });
      if (existing && disc.sourceB && !existing.sourceB.includes(disc.sourceB)) {
        existing.sourceB = `${existing.sourceB}, ${disc.sourceB}`;
      }
    }
  }

  // Deduplicate corrective actions
  const seenActionKeys = new Set();
  const correctiveActions = [];
  for (const action of rawCorrectiveActions) {
    // Deduplicate by category, priority, and normalized core action advice (omitting variable parenthetical details)
    const coreText = (action.action || '').split('(')[0].trim().toLowerCase();
    const actionKey = `${action.category}:::${action.priority}:::${coreText}`;
    if (!seenActionKeys.has(actionKey)) {
      seenActionKeys.add(actionKey);
      correctiveActions.push({ ...action });
    } else {
      // Merge target document labels
      const existing = correctiveActions.find(a => {
        const existingCore = (a.action || '').split('(')[0].trim().toLowerCase();
        return a.category === action.category && a.priority === action.priority && existingCore === coreText;
      });
      if (existing && action.targetDocument && !existing.targetDocument.includes(action.targetDocument)) {
        const existingTargets = existing.targetDocument.split(' / ');
        const newTargets = action.targetDocument.split(' / ');
        existing.targetDocument = Array.from(new Set([...existingTargets, ...newTargets])).join(' / ');
      }
    }
  }

  // 7. Calculate Overall Readiness Status and Score
  const totalChecks = auditChecks.length;
  const passedChecks = auditChecks.filter(c => c.status === 'PASSED').length;
  const warningChecks = auditChecks.filter(c => c.status === 'WARNING').length;
  const unverifiedChecks = auditChecks.filter(c => c.status === 'UNVERIFIED').length;
  const failedChecks = auditChecks.filter(c => c.status === 'FAILED').length;

  let overallStatus = 'READY_FOR_REVIEW';
  let statusBadgeText = 'READY FOR REVIEW';
  let statusColor = 'emerald';
  let summaryNotes = '';

  const hasCriticalMismatch = crossDocDiscrepancies.some(d => d.severity === 'CRITICAL');
  const hasMissingMandatory = missingDocuments.length > 0;
  const hasUnreadableMandatory = unreadableDocuments.some(u => {
    return categoryConfig.mandatoryDocuments.some(m => m.type === u.docCategory);
  });
  const hasUnverifiedMandatory = unverifiedDocuments.length > 0;

  if (hasMissingMandatory || hasUnreadableMandatory || hasCriticalMismatch) {
    overallStatus = 'INCOMPLETE';
    statusBadgeText = 'INCOMPLETE';
    statusColor = 'rose';
    summaryNotes = 'Application has blocking deficiencies (missing documents, unreadable scans, or critical cross-document mismatches) that will likely lead to portal rejection.';
  } else if (hasUnverifiedMandatory) {
    overallStatus = 'NEEDS_ATTENTION';
    statusBadgeText = 'NEEDS ATTENTION';
    statusColor = 'amber';
    summaryNotes = 'Mandatory documents were uploaded, but one or more could not be conclusively verified against standard document indicators. Please confirm details in Step 3 before submitting.';
  } else if (warningChecks > 0 || unverifiedChecks > 0 || crossDocDiscrepancies.some(d => d.severity === 'WARNING')) {
    overallStatus = 'NEEDS_ATTENTION';
    statusBadgeText = 'NEEDS ATTENTION';
    statusColor = 'amber';
    summaryNotes = 'Application documents are complete, but minor variations or unverified fields were detected. Please review recommendations before final submission.';
  } else {
    overallStatus = 'READY_FOR_REVIEW';
    statusBadgeText = 'READY FOR REVIEW';
    statusColor = 'emerald';
    summaryNotes = 'All mandatory documents are present and consistent. Ready for applicant self-review prior to portal submission.';
  }

  // Calculate percentage readiness score
  let readinessScore = 100;
  readinessScore -= (missingDocuments.length * 25);
  readinessScore -= (failedChecks * 15);
  readinessScore -= (unverifiedDocuments.length * 12);
  readinessScore -= (warningChecks * 5);
  readinessScore -= (unverifiedChecks * 5);
  readinessScore = Math.max(10, Math.min(100, Math.round(readinessScore)));

  return {
    category: categoryConfig,
    overallStatus,
    statusBadgeText,
    statusColor,
    readinessScore,
    summaryNotes,
    metrics: {
      totalChecks,
      passedChecks,
      warningChecks,
      unverifiedChecks,
      failedChecks,
      missingDocumentsCount: missingDocuments.length,
      unreadableDocumentsCount: unreadableDocuments.length,
      unverifiedDocumentsCount: unverifiedDocuments.length,
      crossDocDiscrepanciesCount: crossDocDiscrepancies.length,
    },
    missingDocuments,
    unreadableDocuments,
    unverifiedDocuments,
    crossDocDiscrepancies,
    auditChecks,
    correctiveActions,
    verifiedAt: new Date().toISOString(),
    disclaimer: 'DISCLAIMER: DocuReady is an automated advisory pre-submission auditing tool. It does not constitute official government or university approval. Users remain responsible for adherence to individual program criteria.',
  };
}

module.exports = {
  performAuditVerification,
  verifyDocumentContent,
  compareNames,
  compareDateOfBirth,
  checkDocumentValidity,
  normalizeName,
  parseStandardDate,
  formatDDMMYYYY,
};
