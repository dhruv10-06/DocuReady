// server/services/extractorService.js

/**
 * Intelligent regex and heuristic extractor for Indian application documents
 * (Aadhaar, Marksheet, Income Certificate, Caste Certificate, Application Forms).
 */

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();

  // Pattern: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    // Swap if day/month seems flipped (e.g. month > 12)
    if (month > 12 && day <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    return `${dd}/${mm}/${year}`;
  }

  // Pattern: YYYY-MM-DD
  const ymdMatch = cleaned.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const mm = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
    const dd = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    return `${dd}/${mm}/${year}`;
  }

  // Pattern: 12 May 2005 or May 12, 2005
  const monthNames = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12
  };

  const textMonthMatch1 = cleaned.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)[,\s]+(\d{4})/i);
  if (textMonthMatch1) {
    const day = String(parseInt(textMonthMatch1[1], 10)).padStart(2, '0');
    const mName = textMonthMatch1[2].toLowerCase();
    const month = monthNames[mName];
    const year = textMonthMatch1[3];
    if (month) return `${day}/${String(month).padStart(2, '0')}/${year}`;
  }

  const textMonthMatch2 = cleaned.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})/i);
  if (textMonthMatch2) {
    const mName = textMonthMatch2[1].toLowerCase();
    const day = String(parseInt(textMonthMatch2[2], 10)).padStart(2, '0');
    const month = monthNames[mName];
    const year = textMonthMatch2[3];
    if (month) return `${day}/${String(month).padStart(2, '0')}/${year}`;
  }

  return cleaned;
}

function extractCandidateName(text, docCategory) {
  // Ordered regex strategies for candidate name
  const namePatterns = [
    /(?:Candidate|Student|Applicant|Beneficiary)\s*(?:'s)?\s*Name\s*[:\-\—]\s*([A-Za-z\.\s]{2,40})/i,
    /(?:certify that|certifies that|certified that)\s*[:\-\—]?\s*(?:Mr\.|Ms\.|Shri|Kumari)?\s*([A-Za-z\.\s]{2,40})/i,
    /Name\s*[:\-\—]\s*([A-Za-z\.\s]{2,40})/i,
    /Full\s*Name\s*[:\-\—]\s*([A-Za-z\.\s]{2,40})/i,
    /Name\s+of\s+(?:Student|Candidate|Applicant|Holder)\s*[:\-\—]\s*([A-Za-z\.\s]{2,40})/i,
  ];

  for (const regex of namePatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      let rawName = match[1].split('\n')[0].trim();
      // Remove trailing labels that might have been captured
      rawName = rawName.replace(/(?:Father|Mother|DOB|Date|Gender|Roll|Address|Reg|Exam|Result).*/i, '').trim();
      rawName = rawName.replace(/[^A-Za-z\.\s]/g, '').trim();
      if (rawName.length >= 3 && !/^(the|board|delhi|india|government|school|office)$/i.test(rawName)) {
        return rawName;
      }
    }
  }

  return null;
}

function extractDateOfBirth(text) {
  const dobPatterns = [
    /(?:Date\s*of\s*Birth|DOB|Birth\s*Date|D\.O\.B)\s*[:\-\—]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:Date\s*of\s*Birth|DOB|Birth\s*Date)\s*[:\-\—]\s*(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})/i,
    /(?:Date\s*of\s*Birth|DOB|Birth\s*Date)\s*[:\-\—]\s*([A-Za-z]+\s+\d{1,2}[,\s]+\d{4})/i,
    /(?:DOB|Date\s*of\s*Birth)[\s\:\-]+([0-9]{2}\/[0-9]{2}\/[0-9]{4})/i,
  ];

  for (const regex of dobPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = parseDate(match[1]);
      if (parsed) return parsed;
    }
  }

  return null;
}

function extractDocumentNumber(text, docCategory) {
  const patterns = [
    /(?:Certificate|Cert)\s*(?:No|Number|\#)\s*[:\-\—]\s*([A-Za-z0-9\/\-\_]{4,30})/i,
    /(?:Roll|Registration|Enrollment|Ack)\s*(?:No|Number|\#)\s*[:\-\—]\s*([A-Za-z0-9\/\-\_]{4,30})/i,
    /(?:Aadhaar|UID|Voter ID|Passport)\s*(?:No|Number|\#)?\s*[:\-\—]?\s*([X0-9]{4}[\s\-][X0-9]{4}[\s\-][0-9]{4}|[A-Za-z0-9\/\-\_]{8,20})/i,
    /(?:Application|Ref)\s*(?:No|Number|\#)\s*[:\-\—]\s*([A-Za-z0-9\/\-\_]{4,30})/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractIssueDate(text) {
  const patterns = [
    /(?:Date\s*of\s*Issue|Issue\s*Date|Issued\s*on|Date\s*of\s*Issuance)\s*[:\-\—]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:Date|Dated)\s*[:\-\—]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = parseDate(match[1]);
      if (parsed) return parsed;
    }
  }

  return null;
}

function extractExpiryDate(text) {
  const patterns = [
    /(?:Valid\s*Till|Valid\s*Upto|Valid\s*Up\s*To|Expiry\s*Date|Expires\s*on)\s*[:\-\—]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:Validity)\s*[:\-\—]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = parseDate(match[1]);
      if (parsed) return parsed;
    }
  }

  return null;
}

function extractAuthority(text) {
  const knownAuthorities = [
    { pattern: /CENTRAL BOARD OF SECONDARY EDUCATION|CBSE/i, name: 'Central Board of Secondary Education (CBSE)' },
    { pattern: /UNIQUE IDENTIFICATION AUTHORITY OF INDIA|UIDAI/i, name: 'Unique Identification Authority of India (UIDAI)' },
    { pattern: /TAHSILDAR|TEHSILDAR|REVENUE DEPARTMENT/i, name: 'Office of the Tahsildar / Revenue Department' },
    { pattern: /ELECTION COMMISSION OF INDIA/i, name: 'Election Commission of India' },
    { pattern: /MINISTRY OF EXTERNAL AFFAIRS/i, name: 'Ministry of External Affairs, Passport Division' },
    { pattern: /DELHI PUBLIC SCHOOL/i, name: 'Delhi Public School' },
  ];

  for (const auth of knownAuthorities) {
    if (auth.pattern.test(text)) {
      return auth.name;
    }
  }

  const genericMatch = text.match(/(?:Issuing\s*Authority|Authority|Issued\s*by)\s*[:\-\—]\s*([^\n\r]{3,60})/i);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1].trim();
  }

  return null;
}

function extractExtraDetails(text, docCategory) {
  const details = {};

  // Father's Name
  const fatherMatch = text.match(/(?:Father|Father[\'’]s\s*Name|S\/O|D\/O)\s*[:\-\—]\s*([A-Za-z\.\s]{3,35})/i);
  if (fatherMatch && fatherMatch[1]) {
    details.fatherName = fatherMatch[1].split('\n')[0].replace(/(?:Mother|DOB|Address|Roll).*/i, '').trim();
  }

  // Mother's Name
  const motherMatch = text.match(/(?:Mother|Mother[\'’]s\s*Name)\s*[:\-\—]\s*([A-Za-z\.\s]{3,35})/i);
  if (motherMatch && motherMatch[1]) {
    details.motherName = motherMatch[1].split('\n')[0].trim();
  }

  // Score / Percentage
  const scoreMatch = text.match(/(?:Percentage|Total\s*Marks|Score|CGPA|Grade)\s*[:\-\—]?\s*([0-9]+(?:\.[0-9]+)?\s*\%|[0-9]+(?:\.[0-9]+)?(?:\s*\/\s*[0-9]+)?)/i);
  if (scoreMatch && scoreMatch[1]) {
    details.score = scoreMatch[1].trim();
  }

  // Income Amount
  const incomeMatch = text.match(/(?:Annual\s*Family\s*Income|Total\s*Income|Family\s*Income|Income)\s*[:\-\—]\s*(?:INR|Rs\.?|₹)?\s*([0-9\,]+(?:\/\-)?|\d+)/i);
  if (incomeMatch && incomeMatch[1]) {
    details.incomeAmount = `INR ${incomeMatch[1].replace(/[\/\-]/g, '').trim()}`;
  }

  // Passing Year
  const yearMatch = text.match(/(?:Passing\s*Year|Year\s*of\s*Passing|Exam\s*Year|Examination)\s*[:\-\—]?\s*(20\d{2}|19\d{2})/i);
  if (yearMatch && yearMatch[1]) {
    details.passingYear = yearMatch[1];
  }

  return details;
}

/**
 * Main information extraction function
 */
function extractDocumentInformation(rawText, docCategory) {
  const text = cleanText(rawText);

  // Check readability
  const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
  if (!text || alphanumericCount < 15) {
    return {
      candidateName: null,
      dateOfBirth: null,
      documentNumber: null,
      issueDate: null,
      expiryDate: null,
      authority: null,
      extraDetails: {},
      confidence: 10,
      isReadable: false,
      unreadableReason: 'Extracted text is empty or contains fewer than 15 readable characters. The image or PDF scan may be blurry, corrupt, or inverted.',
      rawSnippet: text.slice(0, 200),
    };
  }

  const candidateName = extractCandidateName(text, docCategory);
  const dateOfBirth = extractDateOfBirth(text);
  const documentNumber = extractDocumentNumber(text, docCategory);
  const issueDate = extractIssueDate(text);
  const expiryDate = extractExpiryDate(text);
  const authority = extractAuthority(text);
  const extraDetails = extractExtraDetails(text, docCategory);

  // Confidence calculation
  let foundFields = 0;
  if (candidateName) foundFields++;
  if (dateOfBirth) foundFields++;
  if (documentNumber) foundFields++;
  if (issueDate) foundFields++;
  if (authority) foundFields++;

  let confidence = Math.min(95, 45 + foundFields * 10);
  if (!candidateName) confidence = Math.min(confidence, 55);

  return {
    candidateName,
    dateOfBirth,
    documentNumber,
    issueDate,
    expiryDate,
    authority,
    extraDetails,
    confidence,
    isReadable: true,
    unreadableReason: null,
    rawSnippet: text.slice(0, 300),
  };
}

module.exports = {
  extractDocumentInformation,
  cleanText,
  parseDate,
};
