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
 * Standardize and parse DD/MM/YYYY dates
 */
function parseStandardDate(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  return new Date(Date.UTC(year, month - 1, day));
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

  const cleanA = dobA.trim();
  const cleanB = dobB.trim();

  if (cleanA === cleanB) {
    return {
      status: 'MATCH',
      severity: 'PASS',
      type: 'EXACT_MATCH',
      message: `Date of birth matches exactly (${cleanA}).`,
    };
  }

  const partsA = cleanA.split(/[\/\-\.]/);
  const partsB = cleanB.split(/[\/\-\.]/);

  if (partsA.length === 3 && partsB.length === 3) {
    const [dayA, monthA, yearA] = partsA;
    const [dayB, monthB, yearB] = partsB;

    // Check if month and day might be flipped (e.g. 05/12/2005 vs 12/05/2005)
    if (dayA === monthB && monthA === dayB && yearA === yearB) {
      return {
        status: 'AMBIGUOUS_FORMAT',
        severity: 'WARNING',
        type: 'DOB_FORMAT_FLIPPED',
        message: `Date of birth formatting ambiguity detected (${cleanA} vs ${cleanB}). Day and month appear transposed (DD/MM vs MM/DD).`,
        recommendation: 'Verify the intended date format in each certificate to avoid rejection caused by DD/MM/YYYY vs MM/DD/YYYY mismatch.',
      };
    }

    // Year mismatch
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
  const currentDate = new Date('2026-11-15T00:00:00Z');
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
          message: `Document expired on ${extractedData.expiryDate} (Current date: 15/11/2026).`,
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
 * Main cross-document verification and audit execution engine
 */
function performAuditVerification(audit) {
  const { category: categoryId, documents, applicantInfo } = audit;
  const categoryConfig = APPLICATION_CATEGORIES[categoryId] || APPLICATION_CATEGORIES.SCHOLARSHIP;
  const rules = categoryConfig.rules || {};

  const auditChecks = [];
  const crossDocDiscrepancies = [];
  const missingDocuments = [];
  const unreadableDocuments = [];
  const correctiveActions = [];

  // Group uploaded documents by category
  const uploadedCategoryMap = {};
  for (const doc of documents) {
    if (!uploadedCategoryMap[doc.docCategory]) {
      uploadedCategoryMap[doc.docCategory] = [];
    }
    uploadedCategoryMap[doc.docCategory].push(doc);
  }

  // 1. Mandatory Document Category Checks
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

      correctiveActions.push({
        priority: 'HIGH',
        category: 'Missing Document',
        action: `Upload your official ${reqDoc.name} before submitting to avoid immediate disqualification.`,
        targetDocument: reqDoc.name,
      });
    } else {
      auditChecks.push({
        id: `mand-${reqDoc.type}`,
        title: `Mandatory Document: ${reqDoc.name}`,
        status: 'PASSED',
        severity: 'PASS',
        category: 'COMPLIANCE',
        details: `Uploaded (${matchingDocs.length} file: ${matchingDocs.map(d => d.filename).join(', ')})`,
      });
    }
  }

  // Optional Documents status
  if (categoryConfig.optionalDocuments) {
    for (const optDoc of categoryConfig.optionalDocuments) {
      const matchingDocs = uploadedCategoryMap[optDoc.type] || [];
      if (matchingDocs.length > 0) {
        auditChecks.push({
          id: `opt-${optDoc.type}`,
          title: `Optional Document: ${optDoc.name}`,
          status: 'PASSED',
          severity: 'INFO',
          category: 'COMPLIANCE',
          details: `Provided (${matchingDocs.map(d => d.filename).join(', ')})`,
        });
      }
    }
  }

  // 2. Readability & Scan Quality Checks
  for (const doc of documents) {
    const isReadable = doc.extractedData?.isReadable !== false;
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

      correctiveActions.push({
        priority: 'HIGH',
        category: 'Scan Legibility',
        action: `Re-scan "${doc.filename}" at 300 DPI or higher contrast, ensuring all text and stamps are sharply focused.`,
        targetDocument: doc.filename,
      });
    } else {
      auditChecks.push({
        id: `read-${doc.id}`,
        title: `Readability Check: ${doc.filename}`,
        status: 'PASSED',
        severity: 'PASS',
        category: 'LEGIBILITY',
        details: `Readable text extracted with ${doc.extractedData?.confidence || 85}% confidence score.`,
      });
    }

    // 3. Document File Size and Format Validation
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
      correctiveActions.push({
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
        details: `Compliant format (${doc.mimeType}) and size (${(doc.size / 1024).toFixed(0)} KB).`,
      });
    }

    // 4. Validity & Expiry Checks
    const validityIssues = checkDocumentValidity(doc, rules);
    for (const vIssue of validityIssues) {
      crossDocDiscrepancies.push({
        field: 'DOCUMENT_VALIDITY',
        severity: vIssue.severity,
        type: vIssue.type,
        docCategory: vIssue.docCategory,
        sourceA: doc.filename,
        valueA: doc.extractedData?.issueDate ? `Issued: ${doc.extractedData.issueDate}` : `Expired: ${doc.extractedData?.expiryDate}`,
        sourceB: 'System Audit Date (15/11/2026)',
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

      correctiveActions.push({
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
          crossDocDiscrepancies.push({
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

          correctiveActions.push({
            priority: 'MEDIUM',
            category: 'Name Consistency',
            action: `${comparison.recommendation} (Observed: "${name1}" in ${doc1.filename} vs "${name2}" in ${doc2.filename}).`,
            targetDocument: `${doc1.filename} / ${doc2.filename}`,
          });
        } else if (comparison.severity === 'CRITICAL') {
          crossDocDiscrepancies.push({
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

          correctiveActions.push({
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
          crossDocDiscrepancies.push({
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

          correctiveActions.push({
            priority: 'HIGH',
            category: 'Date of Birth Mismatch',
            action: `${dobComparison.recommendation} (Conflicting values: ${dob1} in ${doc1.filename} vs ${dob2} in ${doc2.filename}).`,
            targetDocument: `${doc1.filename} / ${doc2.filename}`,
          });
        }
      }
    }
  }

  // 7. Calculate Overall Readiness Status and Score
  const totalChecks = auditChecks.length;
  const passedChecks = auditChecks.filter(c => c.status === 'PASSED').length;
  const warningChecks = auditChecks.filter(c => c.status === 'WARNING').length;
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

  if (hasMissingMandatory || hasUnreadableMandatory || hasCriticalMismatch) {
    overallStatus = 'INCOMPLETE';
    statusBadgeText = 'INCOMPLETE';
    statusColor = 'rose';
    summaryNotes = 'Application has blocking deficiencies (missing documents, unreadable scans, or critical cross-document mismatches) that will likely lead to portal rejection.';
  } else if (warningChecks > 0 || crossDocDiscrepancies.some(d => d.severity === 'WARNING')) {
    overallStatus = 'NEEDS_ATTENTION';
    statusBadgeText = 'NEEDS ATTENTION';
    statusColor = 'amber';
    summaryNotes = 'Application documents are complete, but minor name variations or expiring certificates were detected. Please review recommendations before final submission.';
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
  readinessScore -= (warningChecks * 7);
  readinessScore = Math.max(15, Math.min(100, readinessScore));

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
      failedChecks,
      missingDocumentsCount: missingDocuments.length,
      unreadableDocumentsCount: unreadableDocuments.length,
      crossDocDiscrepanciesCount: crossDocDiscrepancies.length,
    },
    missingDocuments,
    unreadableDocuments,
    crossDocDiscrepancies,
    auditChecks,
    correctiveActions,
    verifiedAt: new Date().toISOString(),
    disclaimer: 'DISCLAIMER: DocuReady is an automated advisory pre-submission auditing tool. It does not constitute official government or university approval. Users remain responsible for adherence to individual program criteria.',
  };
}

module.exports = {
  performAuditVerification,
  compareNames,
  compareDateOfBirth,
  checkDocumentValidity,
  normalizeName,
};
