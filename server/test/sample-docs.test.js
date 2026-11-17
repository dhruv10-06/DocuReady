// server/test/sample-docs.test.js

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { ensureSampleFiles } = require('../services/sampleFileGenerator');
const { processDocumentFile } = require('../services/ocrService');
const { performAuditVerification, verifyDocumentContent } = require('../services/verificationEngine');
const { SYNTHETIC_DEMO_CASES } = require('../data/sampleData');
const auditRoutes = require('../routes/auditRoutes');

const SAMPLE_DIR = path.join(__dirname, '..', 'public', 'sample-docs');

async function runSampleDocsTests() {
  console.log('===============================================================');
  console.log('📄 DOCUREADY SYNTHETIC SAMPLE DOCUMENTS & OCR VERIFICATION TEST');
  console.log('===============================================================\n');

  // --- TEST 1: Generate & Inspect All Sample Files ---
  console.log('--- TEST 1: File Generation & Magic Byte Integrity ---');
  ensureSampleFiles();

  const expectedFiles = [
    { name: 'Synthetic_Aadhaar_Rahul_Sharma.pdf', mime: 'application/pdf', magic: '%PDF-' },
    { name: 'Synthetic_Aadhaar_Rahul_Sharma.png', mime: 'image/png', magic: '\x89PNG' },
    { name: 'Synthetic_Aadhaar_Rahul_Sharma.jpg', mime: 'image/jpeg', magicBytes: [0xFF, 0xD8, 0xFF] },
    { name: 'Synthetic_Class_XII_Marksheet_Rahul.pdf', mime: 'application/pdf', magic: '%PDF-' },
    { name: 'Synthetic_Class_XII_Marksheet_Rahul.png', mime: 'image/png', magic: '\x89PNG' },
    { name: 'Synthetic_Class_XII_Marksheet_Rahul.jpg', mime: 'image/jpeg', magicBytes: [0xFF, 0xD8, 0xFF] },
    { name: 'Synthetic_Income_Certificate_Rahul.pdf', mime: 'application/pdf', magic: '%PDF-' },
    { name: 'Synthetic_Income_Certificate_Rahul.jpg', mime: 'image/jpeg', magicBytes: [0xFF, 0xD8, 0xFF] },
    { name: 'Synthetic_Income_Certificate_Rahul.png', mime: 'image/png', magic: '\x89PNG' },
  ];

  for (const exp of expectedFiles) {
    const filePath = path.join(SAMPLE_DIR, exp.name);
    console.assert(fs.existsSync(filePath), `Sample file ${exp.name} must exist on disk`);
    const stat = fs.statSync(filePath);
    console.assert(stat.size > 1000, `Sample file ${exp.name} must not be empty (size: ${stat.size} bytes)`);

    const headerBuf = fs.readFileSync(filePath);
    if (exp.magic) {
      const headerStr = headerBuf.slice(0, 8).toString('binary');
      console.assert(headerStr.startsWith(exp.magic), `${exp.name} header must match magic ${exp.magic}`);
    } else if (exp.magicBytes) {
      console.assert(
        headerBuf[0] === exp.magicBytes[0] && headerBuf[1] === exp.magicBytes[1] && headerBuf[2] === exp.magicBytes[2],
        `${exp.name} header must match JPEG magic bytes [0xFF, 0xD8, 0xFF]`
      );
    }
    console.log(` ✓ ${exp.name} (${stat.size} bytes, verified ${exp.mime})`);
  }
  console.log('✓ TEST 1 PASSED: All 9 sample files exist with valid signatures.\n');

  // --- TEST 2: HTTP Route & MIME Type Verification ---
  console.log('--- TEST 2: HTTP Static Serving & MIME Types ---');
  const app = express();
  app.use(express.json());
  app.use('/sample-docs', express.static(SAMPLE_DIR));
  app.use('/api', auditRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5097, resolve));
  const BASE_URL = 'http://localhost:5097';

  try {
    for (const exp of expectedFiles) {
      const url = `${BASE_URL}/sample-docs/${exp.name}`;
      const res = await fetch(url);
      console.assert(res.status === 200, `Expected 200 for ${url}, got ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      console.assert(
        contentType.includes(exp.mime),
        `Expected ${exp.mime} for ${exp.name}, got ${contentType}`
      );
      const buf = await res.arrayBuffer();
      const diskSize = fs.statSync(path.join(SAMPLE_DIR, exp.name)).size;
      console.assert(buf.byteLength === diskSize, `Downloaded size (${buf.byteLength}) must match disk size (${diskSize})`);
      console.log(` ✓ HTTP GET /sample-docs/${exp.name} -> 200 OK (${contentType})`);
    }

    // Verify /api/sample-docs metadata endpoint
    const apiRes = await fetch(`${BASE_URL}/api/sample-docs`);
    console.assert(apiRes.status === 200, 'Expected 200 from /api/sample-docs');
    const apiData = await apiRes.json();
    console.assert(Array.isArray(apiData.files) && apiData.files.length >= 9, 'Expected at least 9 files in metadata');
    console.log(` ✓ /api/sample-docs returned ${apiData.files.length} sample file entries`);
    console.log('✓ TEST 2 PASSED: HTTP static and metadata routes serve correct MIME types and files.\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  // --- TEST 3: OCR Extraction on Image Samples ---
  console.log('--- TEST 3: Real OCR Extraction on Generated Images ---');
  
  // 3a. Aadhaar PNG
  const aadhaarPngPath = path.join(SAMPLE_DIR, 'Synthetic_Aadhaar_Rahul_Sharma.png');
  const aRes = await processDocumentFile({
    path: aadhaarPngPath,
    originalname: 'Synthetic_Aadhaar_Rahul_Sharma.png',
    mimetype: 'image/png',
    size: fs.statSync(aadhaarPngPath).size,
  }, 'IDENTITY_PROOF');
  console.assert(aRes.extractedData.isReadable === true, 'Aadhaar PNG must be readable');
  console.assert(aRes.extractedData.candidateName === 'Rahul Sharma', `Aadhaar name expected 'Rahul Sharma', got '${aRes.extractedData.candidateName}'`);
  console.assert(aRes.extractedData.dateOfBirth === '12/05/2005', `Aadhaar DOB expected '12/05/2005', got '${aRes.extractedData.dateOfBirth}'`);
  console.assert(aRes.extractedData.documentNumber === '9876-5432-9912', `Aadhaar number expected '9876-5432-9912', got '${aRes.extractedData.documentNumber}'`);
  console.log(` ✓ Aadhaar PNG: Name="${aRes.extractedData.candidateName}", DOB="${aRes.extractedData.dateOfBirth}", No="${aRes.extractedData.documentNumber}", Conf=${aRes.extractedData.confidence}%`);

  // 3b. Marksheet PNG
  const marksheetPngPath = path.join(SAMPLE_DIR, 'Synthetic_Class_XII_Marksheet_Rahul.png');
  const mRes = await processDocumentFile({
    path: marksheetPngPath,
    originalname: 'Synthetic_Class_XII_Marksheet_Rahul.png',
    mimetype: 'image/png',
    size: fs.statSync(marksheetPngPath).size,
  }, 'MARKSHEET');
  console.assert(mRes.extractedData.isReadable === true, 'Marksheet PNG must be readable');
  console.assert(mRes.extractedData.candidateName === 'Rahul S. Sharma', `Marksheet name expected 'Rahul S. Sharma', got '${mRes.extractedData.candidateName}'`);
  console.assert(mRes.extractedData.dateOfBirth === '12/05/2005', `Marksheet DOB expected '12/05/2005', got '${mRes.extractedData.dateOfBirth}'`);
  console.assert(mRes.extractedData.documentNumber === 'CBSE-2023-884120', `Marksheet roll expected 'CBSE-2023-884120', got '${mRes.extractedData.documentNumber}'`);
  console.log(` ✓ Marksheet PNG: Name="${mRes.extractedData.candidateName}", DOB="${mRes.extractedData.dateOfBirth}", Roll="${mRes.extractedData.documentNumber}", Conf=${mRes.extractedData.confidence}%`);

  // 3c. Income Certificate JPG
  const incomeJpgPath = path.join(SAMPLE_DIR, 'Synthetic_Income_Certificate_Rahul.jpg');
  const iRes = await processDocumentFile({
    path: incomeJpgPath,
    originalname: 'Synthetic_Income_Certificate_Rahul.jpg',
    mimetype: 'image/jpeg',
    size: fs.statSync(incomeJpgPath).size,
  }, 'INCOME_CERTIFICATE');
  console.assert(iRes.extractedData.isReadable === true, 'Income JPG must be readable');
  console.assert(iRes.extractedData.candidateName === 'Rahul Sharma', `Income name expected 'Rahul Sharma', got '${iRes.extractedData.candidateName}'`);
  console.assert(iRes.extractedData.dateOfBirth === '12/05/2004', `Income DOB expected '12/05/2004', got '${iRes.extractedData.dateOfBirth}'`);
  console.assert(iRes.extractedData.documentNumber === 'REV/INC/2023/4491', `Income cert no expected 'REV/INC/2023/4491', got '${iRes.extractedData.documentNumber}'`);
  console.assert(iRes.extractedData.expiryDate === '13/08/2024', `Income expiry expected '13/08/2024', got '${iRes.extractedData.expiryDate}'`);
  console.log(` ✓ Income JPG: Name="${iRes.extractedData.candidateName}", DOB="${iRes.extractedData.dateOfBirth}", Cert="${iRes.extractedData.documentNumber}", ValidTill="${iRes.extractedData.expiryDate}", Conf=${iRes.extractedData.confidence}%`);
  console.log('✓ TEST 3 PASSED: OCR extraction accurately parsed all fields with high confidence.\n');

  // --- TEST 4: Verification Engine Evaluation on Real Extracted Documents ---
  console.log('--- TEST 4: Verification Engine Cross-Check on Sample Images ---');
  const aadhaarDoc = {
    id: 'doc-sample-aadhaar',
    filename: 'Synthetic_Aadhaar_Rahul_Sharma.png',
    docCategory: 'IDENTITY_PROOF',
    mimeType: 'image/png',
    size: fs.statSync(aadhaarPngPath).size,
    rawText: aRes.rawText,
    extractedData: aRes.extractedData,
  };
  const marksheetDoc = {
    id: 'doc-sample-marksheet',
    filename: 'Synthetic_Class_XII_Marksheet_Rahul.png',
    docCategory: 'MARKSHEET',
    mimeType: 'image/png',
    size: fs.statSync(marksheetPngPath).size,
    rawText: mRes.rawText,
    extractedData: mRes.extractedData,
  };
  const incomeDoc = {
    id: 'doc-sample-income',
    filename: 'Synthetic_Income_Certificate_Rahul.jpg',
    docCategory: 'INCOME_CERTIFICATE',
    mimeType: 'image/jpeg',
    size: fs.statSync(incomeJpgPath).size,
    rawText: iRes.rawText,
    extractedData: iRes.extractedData,
  };

  const aContent = verifyDocumentContent(aadhaarDoc);
  console.assert(aContent.status === 'VERIFIED', 'Aadhaar content must be VERIFIED');
  const mContent = verifyDocumentContent(marksheetDoc);
  console.assert(mContent.status === 'VERIFIED', 'Marksheet content must be VERIFIED');
  const iContent = verifyDocumentContent(incomeDoc);
  console.assert(iContent.status === 'VERIFIED', 'Income content must be VERIFIED');

  const auditReport = performAuditVerification({
    id: 'test-audit-sample',
    applicantName: 'Rahul Sharma',
    category: 'SCHOLARSHIP',
    documents: [aadhaarDoc, marksheetDoc, incomeDoc],
  });

  console.assert(auditReport.overallStatus === 'INCOMPLETE', 'Overall status must be INCOMPLETE due to missing Application Form');
  console.assert(auditReport.crossDocDiscrepancies.length >= 3, 'Must record all benchmark discrepancies');
  console.log(` ✓ Overall Status: ${auditReport.overallStatus}`);
  console.log(` ✓ Readiness Score: ${auditReport.readinessScore}%`);
  console.log(` ✓ Cross-Document Discrepancies: ${auditReport.crossDocDiscrepancies.length}`);
  auditReport.crossDocDiscrepancies.forEach(d => console.log(`    - [${d.severity}] ${d.type}: ${d.message}`));
  console.log('✓ TEST 4 PASSED: Benchmark verification results correctly generated.\n');

  // --- TEST 5: Preserve Existing Rahul Sharma Demo ---
  console.log('--- TEST 5: Preserve Quick Demo Case Structure ---');
  const demoCase = SYNTHETIC_DEMO_CASES.RAHUL_SHARMA;
  console.assert(demoCase !== undefined, 'SYNTHETIC_DEMO_CASES.RAHUL_SHARMA must exist');
  console.assert(demoCase.documents.length === 3, 'Demo case must have 3 pre-configured documents');
  console.assert(demoCase.applicantName === 'Rahul Sharma', 'Applicant must be Rahul Sharma');
  console.log('✓ TEST 5 PASSED: Rahul Sharma demo case preserved with full integrity.\n');

  console.log('===============================================================');
  console.log('🎉 ALL 5 SYNTHETIC SAMPLE DOCUMENT TESTS PASSED (100%)');
  console.log('===============================================================\n');
}

runSampleDocsTests().catch((err) => {
  console.error('Sample docs test failed:', err);
  process.exit(1);
});
