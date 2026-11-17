// server/test/content-validation.test.js

const path = require('path');
const fs = require('fs');
const { createCanvas } = require('@napi-rs/canvas');
const { extractDocumentInformation, evaluateTextQuality } = require('../services/extractorService');
const { processDocumentFile } = require('../services/ocrService');
const { performAuditVerification, verifyDocumentContent } = require('../services/verificationEngine');

const FIXTURES_DIR = path.join(__dirname, 'test-fixtures');
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

/**
 * Helper to generate a minimal standard PDF with arbitrary text lines
 */
function createTestPdf(lines, filename) {
  let contentStream = 'BT\n/F1 12 Tf\n20 TL\n50 740 Td\n';
  for (const line of lines) {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    contentStream += `(${escaped}) Tj T*\n`;
  }
  contentStream += 'ET\n';

  const streamLength = Buffer.byteLength(contentStream, 'utf8');
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
  const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}endstream\nendobj\n`;
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  const header = '%PDF-1.4\n';
  const offset1 = Buffer.byteLength(header, 'utf8');
  const offset2 = offset1 + Buffer.byteLength(obj1, 'utf8');
  const offset3 = offset2 + Buffer.byteLength(obj2, 'utf8');
  const offset4 = offset3 + Buffer.byteLength(obj3, 'utf8');
  const offset5 = offset4 + Buffer.byteLength(obj4, 'utf8');
  const xrefOffset = offset5 + Buffer.byteLength(obj5, 'utf8');

  function padOffset(num) {
    return String(num).padStart(10, '0');
  }

  const xref = `xref\n0 6\n0000000000 65535 f \n${padOffset(offset1)} 00000 n \n${padOffset(offset2)} 00000 n \n${padOffset(offset3)} 00000 n \n${padOffset(offset4)} 00000 n \n${padOffset(offset5)} 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  const pdfBuffer = Buffer.concat([
    Buffer.from(header, 'utf8'),
    Buffer.from(obj1, 'utf8'),
    Buffer.from(obj2, 'utf8'),
    Buffer.from(obj3, 'utf8'),
    Buffer.from(obj4, 'utf8'),
    Buffer.from(obj5, 'utf8'),
    Buffer.from(xref, 'utf8'),
  ]);

  const filePath = path.join(FIXTURES_DIR, filename);
  fs.writeFileSync(filePath, pdfBuffer);
  return filePath;
}

/**
 * Helper to generate a test image
 */
function createTestImage(filename, drawFn) {
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');
  drawFn(ctx, canvas);
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(FIXTURES_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function runRegressionTests() {
  console.log('===============================================================');
  console.log('🛡️  DOCUREADY OCR READABILITY & CONTENT VALIDATION REGRESSION SUITE');
  console.log('===============================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Ordinary Photograph with No Meaningful Document Text
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Ordinary Scene Photograph (No Document Text) ---');
    const photoPath = createTestImage('scene_photo.png', (ctx) => {
      // Draw scenic background with gradients and natural shapes (no letters or text)
      const grad = ctx.createLinearGradient(0, 0, 800, 600);
      grad.addColorStop(0, '#3a7bd5');
      grad.addColorStop(1, '#3a6073');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 600);

      // Sun and hills
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.arc(650, 120, 60, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.moveTo(0, 600);
      ctx.lineTo(250, 350);
      ctx.lineTo(550, 600);
      ctx.fill();
    });

    const photoResult = await processDocumentFile({
      path: photoPath,
      mimetype: 'image/png',
      originalname: 'scene_photo.png',
      size: fs.statSync(photoPath).size,
    }, 'IDENTITY_PROOF');

    console.log('Photo Result:');
    console.log(' - isReadable:', photoResult.extractedData.isReadable);
    console.log(' - confidence:', photoResult.extractedData.confidence);
    console.log(' - unreadableReason:', photoResult.extractedData.unreadableReason);
    console.log(' - candidateName:', photoResult.extractedData.candidateName);

    console.assert(photoResult.extractedData.isReadable === false, 'Ordinary photo must be classified as unreadable');
    console.assert(photoResult.extractedData.confidence <= 40, 'Photo confidence must remain low (<= 40)');
    console.assert(photoResult.extractedData.candidateName === null, 'No candidate name should be invented');

    // Verify audit impact
    const auditPhoto = {
      category: 'SCHOLARSHIP',
      documents: [{
        id: 'doc-photo',
        filename: 'scene_photo.png',
        mimeType: 'image/png',
        size: 50000,
        docCategory: 'IDENTITY_PROOF',
        rawText: photoResult.rawText,
        extractedData: photoResult.extractedData,
      }],
      applicantInfo: { candidateName: 'Test Applicant' },
    };

    const auditReportPhoto = performAuditVerification(auditPhoto);
    const idCheck = auditReportPhoto.auditChecks.find(c => c.id === 'mand-IDENTITY_PROOF');
    console.log('Mandatory Identity Check for Scene Photo:', idCheck.status, '|', idCheck.details);

    console.assert(idCheck.status === 'FAILED', 'Mandatory Identity check must FAIL when photo is uploaded');
    console.assert(auditReportPhoto.overallStatus === 'INCOMPLETE', 'Overall status must be INCOMPLETE');
    console.log('✓ TEST 1 PASSED: Ordinary photograph rejected from passing readability and mandatory identity requirements.\n');

    // -------------------------------------------------------------------------
    // TEST 2: Image Containing Random OCR Noise
    // -------------------------------------------------------------------------
    console.log('--- TEST 2: Image Containing Random OCR Noise & Scattered Symbols ---');
    const noiseExtracted = extractDocumentInformation('.. ; : ~ ^ | / \\ . ~ ` _ - - = + ! @ # % ^ & *', 'IDENTITY_PROOF');
    console.log('Noise Extracted:');
    console.log(' - isReadable:', noiseExtracted.isReadable);
    console.log(' - confidence:', noiseExtracted.confidence);
    console.log(' - unreadableReason:', noiseExtracted.unreadableReason);

    console.assert(noiseExtracted.isReadable === false, 'Random noise must be unreadable');
    console.assert(noiseExtracted.confidence <= 30, 'Noise confidence must be <= 30');

    const noiseAudit = {
      category: 'COLLEGE_ADMISSION',
      documents: [{
        id: 'doc-noise',
        filename: 'noisy_scan.jpg',
        mimeType: 'image/jpeg',
        size: 20000,
        docCategory: 'IDENTITY_PROOF',
        rawText: '.. ; : ~ ^ | / \\ . ~ ` _ - - = + ! @ # % ^ & *',
        extractedData: noiseExtracted,
      }],
      applicantInfo: { candidateName: 'Test Applicant' },
    };
    const noiseReport = performAuditVerification(noiseAudit);
    const noiseReadCheck = noiseReport.auditChecks.find(c => c.id === 'read-doc-noise');
    console.assert(noiseReadCheck.status === 'FAILED', 'Readability check must fail for noise scan');
    console.log('✓ TEST 2 PASSED: Random OCR noise correctly identified as unreadable scan.\n');

    // -------------------------------------------------------------------------
    // TEST 3: Genuine-Looking Identity Document with Readable Text
    // -------------------------------------------------------------------------
    console.log('--- TEST 3: Genuine-Looking Identity Document (Aadhaar/National ID) ---');
    const genuineIdPath = createTestImage('genuine_aadhaar.png', (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 600);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('GOVERNMENT OF INDIA', 220, 60);

      ctx.font = '18px sans-serif';
      ctx.fillText('Unique Identification Authority of India', 210, 95);

      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('Candidate Name: Priya Sharma', 60, 200);
      ctx.fillText('Date of Birth: 15/07/2004', 60, 250);
      ctx.fillText('Gender: Female', 60, 300);
      ctx.fillText('Aadhaar No: 9182 4819 4567', 60, 360);
      ctx.fillText('Issued by: Unique Identification Authority of India', 60, 420);
    });

    const genuineResult = await processDocumentFile({
      path: genuineIdPath,
      mimetype: 'image/png',
      originalname: 'genuine_aadhaar.png',
      size: fs.statSync(genuineIdPath).size,
    }, 'IDENTITY_PROOF');

    console.log('Genuine Identity Document:');
    console.log(' - isReadable:', genuineResult.extractedData.isReadable);
    console.log(' - candidateName:', genuineResult.extractedData.candidateName);
    console.log(' - dateOfBirth:', genuineResult.extractedData.dateOfBirth);
    console.log(' - confidence:', genuineResult.extractedData.confidence);

    console.assert(genuineResult.extractedData.isReadable === true, 'Genuine identity document must be readable');
    console.assert(genuineResult.extractedData.candidateName === 'Priya Sharma', 'Candidate name should be Priya Sharma');
    console.assert(genuineResult.extractedData.dateOfBirth === '15/07/2004', 'Date of birth should be 15/07/2004');
    console.assert(genuineResult.extractedData.confidence >= 75, 'Confidence must be >= 75%');

    const contentCheckGenuine = verifyDocumentContent({
      docCategory: 'IDENTITY_PROOF',
      rawText: genuineResult.rawText,
      extractedData: genuineResult.extractedData,
    });
    console.assert(contentCheckGenuine.status === 'VERIFIED', 'Genuine Aadhaar must pass content verification');
    console.log('✓ TEST 3 PASSED: Genuine identity document parsed and content verified with high confidence.\n');

    // -------------------------------------------------------------------------
    // TEST 4: Low-Quality Scan of a Document
    // -------------------------------------------------------------------------
    console.log('--- TEST 4: Low-Quality Scan (Degraded / Sparse Legibility) ---');
    const lowQualityText = 'Gov.. ind.. cer... 2023.. no signature';
    const lowQualityExtracted = extractDocumentInformation(lowQualityText, 'IDENTITY_PROOF');
    console.log('Low-Quality Extracted:');
    console.log(' - isReadable:', lowQualityExtracted.isReadable);
    console.log(' - confidence:', lowQualityExtracted.confidence);
    console.log(' - unreadableReason:', lowQualityExtracted.unreadableReason);

    console.assert(lowQualityExtracted.isReadable === false, 'Low quality scan without candidate name should flag unreadable');
    console.assert(lowQualityExtracted.confidence <= 40, 'Low quality scan confidence should be <= 40');

    const lowQualityAudit = {
      category: 'SCHOLARSHIP',
      documents: [{
        id: 'doc-low-q',
        filename: 'blurry_scan.png',
        mimeType: 'image/png',
        size: 80000,
        docCategory: 'IDENTITY_PROOF',
        rawText: lowQualityText,
        extractedData: lowQualityExtracted,
      }],
      applicantInfo: { candidateName: 'Test Applicant' },
    };
    const lowQReport = performAuditVerification(lowQualityAudit);
    const readCheckLowQ = lowQReport.auditChecks.find(c => c.id === 'read-doc-low-q');
    console.assert(readCheckLowQ.status === 'FAILED', 'Readability check must be FAILED for blurry scan');
    console.log('✓ TEST 4 PASSED: Low quality scan safely flagged for re-scanning.\n');

    // -------------------------------------------------------------------------
    // TEST 5: Supported File with No Extractable Text (Empty PDF)
    // -------------------------------------------------------------------------
    console.log('--- TEST 5: Supported File with No Extractable Text (Blank PDF) ---');
    const blankPdfPath = createTestPdf([], 'blank_test.pdf');
    const blankResult = await processDocumentFile({
      path: blankPdfPath,
      mimetype: 'application/pdf',
      originalname: 'blank_test.pdf',
      size: fs.statSync(blankPdfPath).size,
    }, 'MARKSHEET');

    console.log('Blank PDF Result:');
    console.log(' - isReadable:', blankResult.extractedData.isReadable);
    console.log(' - unreadableReason:', blankResult.extractedData.unreadableReason);
    console.log(' - confidence:', blankResult.extractedData.confidence);

    console.assert(blankResult.extractedData.isReadable === false, 'Blank PDF must be unreadable');
    console.assert(blankResult.extractedData.confidence === 10, 'Blank PDF confidence must be 10');

    const blankAudit = {
      category: 'SCHOLARSHIP',
      documents: [{
        id: 'doc-blank',
        filename: 'blank_test.pdf',
        mimeType: 'application/pdf',
        size: 500,
        docCategory: 'MARKSHEET',
        rawText: blankResult.rawText,
        extractedData: blankResult.extractedData,
      }],
      applicantInfo: { candidateName: 'Test Applicant' },
    };
    const blankReport = performAuditVerification(blankAudit);
    const blankMandCheck = blankReport.auditChecks.find(c => c.id === 'mand-MARKSHEET');
    console.assert(blankMandCheck.status === 'FAILED', 'Mandatory Marksheet check must fail when blank PDF is uploaded');
    console.log('✓ TEST 5 PASSED: Blank supported PDF detected as unreadable text.\n');

    // -------------------------------------------------------------------------
    // TEST 6: File Uploaded Under the Wrong Document Category (Category Mismatch)
    // -------------------------------------------------------------------------
    console.log('--- TEST 6: File Uploaded Under Wrong Category (Marksheet uploaded as Identity Proof) ---');
    const marksheetText = `
      CENTRAL BOARD OF SECONDARY EDUCATION
      Senior School Certificate Examination (Class XII) Marksheet
      Candidate Name: Ananya Rao
      Roll Number: 8492019
      Date of Birth: 18/09/2005
      Subject Marks: English 92, Mathematics 95, Physics 91, Chemistry 94
      Total Marks: 462 / 500 (92.4%)
      Passing Year: 2023
    `;

    const marksheetExtracted = extractDocumentInformation(marksheetText, 'MARKSHEET');
    console.assert(marksheetExtracted.isReadable === true, 'Marksheet should be readable');

    // Simulate uploading this Marksheet under IDENTITY_PROOF category
    const mismatchDoc = {
      id: 'doc-mismatch',
      filename: 'Class_XII_Marksheet.pdf',
      mimeType: 'application/pdf',
      size: 45000,
      docCategory: 'IDENTITY_PROOF', // Mistakenly uploaded as Identity Proof!
      rawText: marksheetText,
      extractedData: marksheetExtracted,
    };

    const mismatchContentResult = verifyDocumentContent(mismatchDoc);
    console.log('Content Verification for Mismatch Doc:');
    console.log(' - status:', mismatchContentResult.status);
    console.log(' - severity:', mismatchContentResult.severity);
    console.log(' - detectedCategory:', mismatchContentResult.detectedCategory);
    console.log(' - message:', mismatchContentResult.message);

    console.assert(mismatchContentResult.status === 'CATEGORY_MISMATCH', 'Must be detected as CATEGORY_MISMATCH');
    console.assert(mismatchContentResult.detectedCategory === 'MARKSHEET', 'Detected category must be MARKSHEET');

    // Run in full audit verification
    const mismatchAudit = {
      category: 'SCHOLARSHIP',
      documents: [mismatchDoc],
      applicantInfo: { candidateName: 'Ananya Rao' },
    };
    const mismatchReport = performAuditVerification(mismatchAudit);
    const mandIdMismatchCheck = mismatchReport.auditChecks.find(c => c.id === 'mand-IDENTITY_PROOF');
    console.log('Mandatory Identity Check for Mismatched Document:');
    console.log(' - status:', mandIdMismatchCheck.status);
    console.log(' - details:', mandIdMismatchCheck.details);

    console.assert(mandIdMismatchCheck.status === 'FAILED', 'Mandatory Identity Proof requirement must FAIL when wrong document is uploaded');
    console.assert(mismatchReport.overallStatus === 'INCOMPLETE', 'Overall status must be INCOMPLETE');
    console.log('✓ TEST 6 PASSED: Category mismatch detected; wrong document prevented from passing mandatory identity requirement.\n');

    // -------------------------------------------------------------------------
    // TEST 7: Manual field correction on unreadable photo must NOT make it VERIFIED
    // -------------------------------------------------------------------------
    console.log('--- TEST 7: Manual Field Correction on Unreadable Photo (Loophole Prevention) ---');
    const photoWithManualCorrection = {
      id: 'doc-photo-manual',
      filename: 'scenery_photo.jpg',
      mimeType: 'image/jpeg',
      size: 60000,
      docCategory: 'IDENTITY_PROOF',
      rawText: '.. ; : ~ ^', // No document keywords, no dates
      extractedData: {
        candidateName: 'Rahul Sharma', // User manually typed this in Step 3!
        dateOfBirth: '12/05/2005',     // User manually typed this in Step 3!
        isReadable: false,             // Original scan was unreadable
        scanWasReadable: false,
        isUserSupplied: true,
        quality: { hasLegibleVocabulary: false, keywordMatches: 0, hasDocumentPatterns: false },
      },
      isUserVerified: true, // User clicked save
    };

    const manualContentRes = verifyDocumentContent(photoWithManualCorrection);
    console.log('Content Verification for Photo with Manual Field Entry:');
    console.log(' - status:', manualContentRes.status);
    console.log(' - unverifiableFile:', manualContentRes.unverifiableFile);
    console.log(' - message:', manualContentRes.message);

    console.assert(manualContentRes.status === 'UNVERIFIED', 'Unreadable photo must remain UNVERIFIED even with manual field entry');
    console.assert(manualContentRes.unverifiableFile === true, 'unverifiableFile flag must be true');

    const auditManualPhoto = {
      category: 'SCHOLARSHIP',
      documents: [photoWithManualCorrection],
      applicantInfo: { candidateName: 'Rahul Sharma' },
    };
    const reportManualPhoto = performAuditVerification(auditManualPhoto);
    const mandIdManualCheck = reportManualPhoto.auditChecks.find(c => c.id === 'mand-IDENTITY_PROOF');
    console.log('Mandatory Identity Check for Photo with Manual Entry:');
    console.log(' - status:', mandIdManualCheck.status);
    console.log(' - details:', mandIdManualCheck.details);

    console.assert(mandIdManualCheck.status === 'UNVERIFIED', 'Mandatory identity check must remain UNVERIFIED, NOT PASSED');
    console.assert(reportManualPhoto.overallStatus === 'INCOMPLETE', 'Overall status must remain INCOMPLETE');
    console.log('✓ TEST 7 PASSED: Manual field entry on unreadable photograph prevented from falsely verifying document.\n');

    // -------------------------------------------------------------------------
    // TEST 8: Genuine Document with Limited English / Bilingual Layout
    // -------------------------------------------------------------------------
    console.log('--- TEST 8: Genuine Document with Limited English / Bilingual Layout ---');
    // Simulating a regional government certificate where Hindi/regional script dominates,
    // and English is limited to name, DOB, and 12-digit UID
    const bilingualText = `
      DOB: 24/11/2002
      Name: Suresh K. Patel
      UID: 8912 3410 7821
      Govt. of Gujarat
    `;

    const bilingualExtracted = extractDocumentInformation(bilingualText, 'IDENTITY_PROOF');
    console.log('Bilingual Document Extraction:');
    console.log(' - isReadable:', bilingualExtracted.isReadable);
    console.log(' - candidateName:', bilingualExtracted.candidateName);
    console.log(' - dateOfBirth:', bilingualExtracted.dateOfBirth);
    console.log(' - confidence:', bilingualExtracted.confidence);

    console.assert(bilingualExtracted.isReadable === true, 'Bilingual document must be accepted as readable');
    console.assert(bilingualExtracted.candidateName === 'Suresh K. Patel', 'Candidate name should be extracted');
    console.assert(bilingualExtracted.dateOfBirth === '24/11/2002', 'DOB should be extracted');

    const bilingualContentRes = verifyDocumentContent({
      docCategory: 'IDENTITY_PROOF',
      rawText: bilingualText,
      extractedData: bilingualExtracted,
    });
    console.assert(bilingualContentRes.status === 'VERIFIED', 'Bilingual identity document must be VERIFIED');
    console.log('✓ TEST 8 PASSED: Bilingual / limited English document accepted and verified without rejection.\n');

    // -------------------------------------------------------------------------
    // TEST 9: Low-Contrast Genuine Document Successfully Confirmed via User Review
    // -------------------------------------------------------------------------
    console.log('--- TEST 9: Low-Contrast Document with Legitimate User Confirmation ---');
    // File has actual document indicators (certificate number, date, government header),
    // but candidate name was smudged in scan.
    const smudgedDocText = `
      GOVERNMENT OF MAHARASHTRA
      Office of the Tahsildar
      Income Certificate No: REV/2023/88912
      Date of Issue: 18/06/2023
      Annual Income: Rs. 1,40,000
    `;
    const smudgedExtracted = extractDocumentInformation(smudgedDocText, 'INCOME_CERTIFICATE');

    // User reviews the document scan in Step 3 and supplies the smudged name
    const confirmedDoc = {
      id: 'doc-income-confirmed',
      filename: 'Income_Certificate_Smudged.pdf',
      mimeType: 'application/pdf',
      size: 40000,
      docCategory: 'INCOME_CERTIFICATE',
      rawText: smudgedDocText,
      extractedData: {
        ...smudgedExtracted,
        candidateName: 'Amit Verma', // Confirmed by user in Step 3!
        scanWasReadable: true,
      },
      isUserVerified: true,
    };

    const confirmedContentRes = verifyDocumentContent(confirmedDoc);
    console.log('Confirmed Genuine Document Result:');
    console.log(' - status:', confirmedContentRes.status);
    console.log(' - message:', confirmedContentRes.message);

    console.assert(confirmedContentRes.status === 'VERIFIED', 'Legitimate document with user confirmation must be VERIFIED');
    console.log('✓ TEST 9 PASSED: Legitimate low-contrast document verified after user review in Step 3.\n');

    console.log('===============================================================');
    console.log('🎉 ALL 9 COMPREHENSIVE CONTENT & READABILITY TESTS PASSED (100%)');
    console.log('===============================================================\n');
  } finally {
    // Cleanup fixtures
    if (fs.existsSync(FIXTURES_DIR)) {
      try {
        fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
      } catch (e) {}
    }
  }
}

runRegressionTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
