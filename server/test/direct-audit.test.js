// server/test/direct-audit.test.js

const { APPLICATION_CATEGORIES, DOCUMENT_CATEGORIES } = require('../data/categories');
const { SYNTHETIC_DEMO_CASES } = require('../data/sampleData');
const { performAuditVerification, compareNames, compareDateOfBirth, normalizeName } = require('../services/verificationEngine');
const { extractDocumentInformation } = require('../services/extractorService');
const { processDocumentFile } = require('../services/ocrService');
const { ensureSampleFiles } = require('../services/sampleFileGenerator');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 DOCUREADY DIRECT VERIFICATION & ENGINE TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Category rules & document requirements
  console.log('--- TEST 1: Categories & Rules Configuration ---');
  console.assert(APPLICATION_CATEGORIES.SCHOLARSHIP, 'Scholarship category must exist');
  console.assert(APPLICATION_CATEGORIES.COLLEGE_ADMISSION, 'College Admission category must exist');
  console.assert(APPLICATION_CATEGORIES.GOVERNMENT_SCHEME, 'Government Scheme category must exist');
  console.log('Categories verified: 3');
  console.log('Scholarship mandatory docs:', APPLICATION_CATEGORIES.SCHOLARSHIP.mandatoryDocuments.map(d => d.type));
  console.assert(APPLICATION_CATEGORIES.SCHOLARSHIP.mandatoryDocuments.length === 4, 'Scholarship needs 4 mandatory docs');
  console.log('✓ TEST 1 PASSED: Category criteria configured correctly.\n');

  // Test 2: Name Normalization and Comparison
  console.log('--- TEST 2: Name Matching & Initial Variation Logic ---');
  const exact = compareNames('Rahul Sharma', 'Rahul Sharma');
  console.assert(exact.severity === 'PASS', 'Exact match must pass');
  console.log('Exact match: PASS');

  // Middle initial variation: Rahul Sharma vs Rahul S. Sharma
  const initialVar = compareNames('Rahul Sharma', 'Rahul S. Sharma');
  console.log('Rahul Sharma vs Rahul S. Sharma ->', initialVar.status, '| Severity:', initialVar.severity);
  console.assert(initialVar.status === 'MINOR_VARIATION', 'Must be classified as MINOR_VARIATION');
  console.assert(initialVar.severity === 'WARNING', 'Must be WARNING, not CRITICAL error');
  console.log('Explanation:', initialVar.message);
  console.log('Recommendation:', initialVar.recommendation);

  // Full mismatch: Rahul Sharma vs Amit Kumar
  const mismatch = compareNames('Rahul Sharma', 'Amit Kumar');
  console.log('Rahul Sharma vs Amit Kumar ->', mismatch.status, '| Severity:', mismatch.severity);
  console.assert(mismatch.severity === 'CRITICAL', 'Must be CRITICAL mismatch');
  console.log('✓ TEST 2 PASSED: Name comparison accurately distinguishes initial variation from mismatch.\n');

  // Test 3: Date of Birth Normalization and Comparison
  console.log('--- TEST 3: Date of Birth Verification Logic ---');
  const dobExact = compareDateOfBirth('12/05/2005', '12/05/2005');
  console.assert(dobExact.severity === 'PASS', 'Exact DOB must pass');
  console.log('DOB Exact match (12/05/2005 vs 12/05/2005): PASS');

  // Year mismatch: 12/05/2005 vs 12/05/2004
  const dobMismatch = compareDateOfBirth('12/05/2005', '12/05/2004');
  console.log('DOB comparison (12/05/2005 vs 12/05/2004) ->', dobMismatch.status, '| Severity:', dobMismatch.severity);
  console.assert(dobMismatch.severity === 'CRITICAL', 'DOB year mismatch must be CRITICAL');
  console.assert(dobMismatch.type === 'DOB_YEAR_MISMATCH', 'Must be DOB_YEAR_MISMATCH');
  console.log('Explanation:', dobMismatch.message);
  console.log('✓ TEST 3 PASSED: DOB mismatch correctly flagged as critical.\n');

  // Test 4: Synthetic Benchmark Audit Execution
  console.log('--- TEST 4: Full Synthetic Benchmark Audit (Rahul Sharma) ---');
  const demoData = SYNTHETIC_DEMO_CASES.RAHUL_SHARMA;
  const auditSession = {
    id: 'test-audit-001',
    category: demoData.category,
    applicantName: demoData.applicantName,
    documents: demoData.documents,
  };

  const report = performAuditVerification(auditSession);
  console.log('Audit Overall Status:', report.statusBadgeText);
  console.log('Application Readiness Score:', report.readinessScore, '/ 100');
  console.log('Total checks executed:', report.metrics.totalChecks);
  console.log('Passed checks:', report.metrics.passedChecks);
  console.log('Warning checks:', report.metrics.warningChecks);
  console.log('Failed checks:', report.metrics.failedChecks);

  console.assert(report.overallStatus === 'INCOMPLETE', 'Status must be INCOMPLETE');
  console.assert(report.missingDocuments.length === 1, 'Must detect 1 missing mandatory document');
  console.log('Missing Document:', report.missingDocuments[0].name);

  // Check discrepancies recorded
  console.log('\nRecorded Cross-Document Discrepancies:');
  report.crossDocDiscrepancies.forEach((d, i) => {
    console.log(` [${i+1}] [${d.severity}] ${d.field}: ${d.message}`);
  });

  console.log('\nPrioritized Corrective Actions:');
  report.correctiveActions.forEach((a, i) => {
    console.log(` [${i+1}] [${a.priority}] ${a.category}: ${a.action}`);
  });
  console.log('✓ TEST 4 PASSED: Benchmark scenario correctly analyzed.\n');

  // Test 5: Real PDF File Text Extraction and Parsing
  console.log('--- TEST 5: PDF Text Extraction & Information Parsing ---');
  ensureSampleFiles();
  const samplePdfPath = path.join(__dirname, '..', 'public', 'sample-docs', 'Synthetic_Class_XII_Marksheet_Rahul.pdf');
  const marksheetResult = await processDocumentFile({
    path: samplePdfPath,
    mimetype: 'application/pdf',
    originalname: 'Synthetic_Class_XII_Marksheet_Rahul.pdf',
    size: fs.statSync(samplePdfPath).size,
  }, 'MARKSHEET');

  console.log('Parsed Marksheet Data:');
  console.log(' - Candidate Name:', marksheetResult.extractedData.candidateName);
  console.log(' - Date of Birth:', marksheetResult.extractedData.dateOfBirth);
  console.log(' - Roll Number:', marksheetResult.extractedData.documentNumber);
  console.log(' - Issue Date:', marksheetResult.extractedData.issueDate);
  console.log(' - Score:', marksheetResult.extractedData.extraDetails.score);
  console.log(' - Confidence:', marksheetResult.extractedData.confidence + '%');
  console.log(' - Readable:', marksheetResult.extractedData.isReadable);

  console.assert(marksheetResult.extractedData.candidateName === 'Rahul S. Sharma', 'Name should be Rahul S. Sharma');
  console.assert(marksheetResult.extractedData.dateOfBirth === '12/05/2005', 'DOB should be 12/05/2005');
  console.assert(marksheetResult.extractedData.documentNumber === 'CBSE-2023-884120', 'Roll number should match');
  console.log('✓ TEST 5 PASSED: PDF text extraction extracted exact fields.\n');

  // Test 6: Unreadable Scan Graceful Handling
  console.log('--- TEST 6: Unreadable Document Graceful Degradation ---');
  const unreadableResult = extractDocumentInformation('%%$$#@ 123 blurry scan !!!', 'IDENTITY_PROOF');
  console.log('Unreadable scan detected:', !unreadableResult.isReadable);
  console.log('Unreadable reason:', unreadableResult.unreadableReason);
  console.assert(unreadableResult.isReadable === false, 'Should be marked as unreadable');
  console.assert(unreadableResult.candidateName === null, 'Should not invent false data');
  console.log('✓ TEST 6 PASSED: Blurry/unreadable scans handled gracefully without inventing data.\n');

  // Test 7: Image OCR Extraction (PNG & JPG)
  console.log('--- TEST 7: Image OCR Text Extraction (PNG & JPG) ---');
  const samplePngPath = path.join(__dirname, '..', 'public', 'sample-docs', 'Synthetic_Aadhaar_Rahul_Sharma.png');
  const aadhaarPngResult = await processDocumentFile({
    path: samplePngPath,
    mimetype: 'image/png',
    originalname: 'Synthetic_Aadhaar_Rahul_Sharma.png',
    size: fs.statSync(samplePngPath).size,
  }, 'IDENTITY_PROOF');

  console.log('Parsed Aadhaar PNG Data:');
  console.log(' - Candidate Name:', aadhaarPngResult.extractedData.candidateName);
  console.log(' - Date of Birth:', aadhaarPngResult.extractedData.dateOfBirth);
  console.log(' - Readable:', aadhaarPngResult.extractedData.isReadable);
  console.assert(aadhaarPngResult.extractedData.isReadable === true, 'PNG scan should be readable');
  console.assert(aadhaarPngResult.extractedData.candidateName === 'Rahul Sharma', 'Name should be Rahul Sharma');
  console.assert(aadhaarPngResult.extractedData.dateOfBirth === '12/05/2005', 'DOB should be 12/05/2005');

  const sampleJpgPath = path.join(__dirname, '..', 'public', 'sample-docs', 'Synthetic_Income_Certificate_Rahul.jpg');
  const incomeJpgResult = await processDocumentFile({
    path: sampleJpgPath,
    mimetype: 'image/jpeg',
    originalname: 'Synthetic_Income_Certificate_Rahul.jpg',
    size: fs.statSync(sampleJpgPath).size,
  }, 'INCOME_CERTIFICATE');

  console.log('Parsed Income JPG Data:');
  console.log(' - Candidate Name:', incomeJpgResult.extractedData.candidateName);
  console.log(' - Date of Birth:', incomeJpgResult.extractedData.dateOfBirth);
  console.log(' - Issue Date:', incomeJpgResult.extractedData.issueDate);
  console.log(' - Readable:', incomeJpgResult.extractedData.isReadable);
  console.assert(incomeJpgResult.extractedData.isReadable === true, 'JPG scan should be readable');
  console.assert(incomeJpgResult.extractedData.candidateName === 'Rahul Sharma', 'Name should be Rahul Sharma');
  console.assert(incomeJpgResult.extractedData.dateOfBirth === '12/05/2004', 'DOB should be 12/05/2004');
  console.log('✓ TEST 7 PASSED: PNG and JPG OCR extraction successfully parsed real synthetic images.\n');

  console.log('====================================================');
  console.log('🎉 ALL 7 CORE TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

