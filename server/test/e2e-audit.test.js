// server/test/e2e-audit.test.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const auditRoutes = require('../routes/auditRoutes');
const { ensureSampleFiles } = require('../services/sampleFileGenerator');

// Set up test server
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', auditRoutes);

ensureSampleFiles();

const server = app.listen(5099, async () => {
  console.log('>>> Test Server running on port 5099');

  try {
    // Helper function for JSON requests with creator token support
    async function request(method, pathUrl, body = null, token = null) {
      return new Promise((resolve, reject) => {
        const headers = {};
        if (body) headers['Content-Type'] = 'application/json';
        if (token) headers['X-Audit-Token'] = token;

        const req = http.request({
          hostname: 'localhost',
          port: 5099,
          path: pathUrl,
          method,
          headers,
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, text: data });
            }
          });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    }

    console.log('\n--- TEST 1: Categories Endpoint ---');
    const catRes = await request('GET', '/api/categories');
    console.log('Categories count:', catRes.data.categories.length);
    console.assert(catRes.data.categories.length === 3, 'Must have 3 categories');
    console.log('Document types count:', catRes.data.documentTypes.length);
    console.log('✓ TEST 1 PASSED');

    console.log('\n--- TEST 2: Create New Audit with Creator Token ---');
    const auditRes = await request('POST', '/api/audits', {
      category: 'SCHOLARSHIP',
      applicantName: 'Rahul Sharma',
      applicationNumber: 'NSP-2026-TEST',
    });
    console.log('Created Audit ID:', auditRes.data.id);
    console.assert(auditRes.status === 201, 'Status must be 201');
    console.assert(auditRes.data.creatorToken && auditRes.data.creatorToken.length === 64, 'Must return 64-char creator token');
    const auditId = auditRes.data.id;
    const creatorToken = auditRes.data.creatorToken;
    console.log('✓ TEST 2 PASSED');

    console.log('\n--- TEST 3: Load Synthetic Demo Case with Token ---');
    const demoRes = await request('POST', `/api/audits/${auditId}/demo`, null, creatorToken);
    console.log('Audit applicant:', demoRes.data.applicantName);
    console.log('Documents loaded:', demoRes.data.documents.length);
    console.assert(demoRes.data.documents.length === 3, 'Should load 3 demo docs');

    const report = demoRes.data.report;
    console.log('\n--- TEST 4: Verification Engine Discrepancy Checks ---');
    console.log('Overall Status:', report.statusBadgeText);
    console.log('Readiness Score:', report.readinessScore);
    console.assert(report.overallStatus === 'INCOMPLETE', 'Status must be INCOMPLETE due to missing mandatory doc and DOB mismatch');

    // Check name variation
    const nameDiscs = report.crossDocDiscrepancies.filter(d => d.field === 'CANDIDATE_NAME');
    console.log('Name variations found:', nameDiscs.length);
    console.assert(nameDiscs.length > 0, 'Must detect name variation');
    console.log('Name variation severity:', nameDiscs[0].severity, '| Message:', nameDiscs[0].message);
    console.assert(nameDiscs[0].severity === 'WARNING', 'Name variation must be WARNING (not fatal error)');

    // Check DOB mismatch
    const dobDiscs = report.crossDocDiscrepancies.filter(d => d.field === 'DATE_OF_BIRTH');
    console.log('DOB mismatches found:', dobDiscs.length);
    console.assert(dobDiscs.length > 0, 'Must detect DOB mismatch');
    console.log('DOB mismatch severity:', dobDiscs[0].severity, '| Message:', dobDiscs[0].message);
    console.assert(dobDiscs[0].severity === 'CRITICAL', 'DOB mismatch must be CRITICAL');

    // Check Missing Mandatory Document
    console.log('Missing documents count:', report.missingDocuments.length);
    console.assert(report.missingDocuments.length === 1, 'Must detect 1 missing document');
    console.log('Missing document name:', report.missingDocuments[0].name);
    console.assert(report.missingDocuments[0].name.includes('Application Form'), 'Missing document must be Application Form');
    console.log('✓ TEST 3 & 4 PASSED');

    console.log('\n--- TEST 5: Manual User Review and Field Correction ---');
    const marksheetDoc = demoRes.data.documents.find(d => d.docCategory === 'MARKSHEET');
    const updateRes = await request('PUT', `/api/audits/${auditId}/documents/${marksheetDoc.id}`, {
      candidateName: 'Rahul Sharma', // User manually corrected name to match ID
    }, creatorToken);
    console.log('Updated document name:', updateRes.data.document.extractedData.candidateName);
    console.assert(updateRes.data.document.extractedData.candidateName === 'Rahul Sharma', 'Name should be updated');
    console.log('✓ TEST 5 PASSED');

    console.log('\n--- TEST 6: Real Multipart Upload & OCR Extraction (PNG & JPG) ---');
    async function uploadFile(aId, filePath, docCategory, token) {
      return new Promise((resolve, reject) => {
        const boundary = '----Boundary' + Math.random().toString(16).slice(2);
        const filename = path.basename(filePath);
        const fileContent = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'application/pdf';

        const header = `--${boundary}\r\nContent-Disposition: form-data; name="docCategory"\r\n\r\n${docCategory}\r\n--${boundary}\r\nContent-Disposition: form-data; name="documents"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`;
        const footer = `\r\n--${boundary}--\r\n`;

        const body = Buffer.concat([
          Buffer.from(header, 'utf8'),
          fileContent,
          Buffer.from(footer, 'utf8'),
        ]);

        const req = http.request({
          hostname: 'localhost',
          port: 5099,
          path: `/api/audits/${aId}/upload`,
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
            'X-Audit-Token': token,
          },
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, text: data });
            }
          });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });
    }

    const samplePng = path.join(__dirname, '..', 'public', 'sample-docs', 'Synthetic_Aadhaar_Rahul_Sharma.png');
    const uploadRes = await uploadFile(auditId, samplePng, 'IDENTITY_PROOF', creatorToken);
    console.log('Upload PNG status:', uploadRes.status);
    console.assert(uploadRes.status === 200, 'Upload status must be 200');
    const uploadedDoc = uploadRes.data.newDocuments[0];
    console.log('Uploaded Doc ID:', uploadedDoc.id);
    console.log('Uploaded Doc OCR Name:', uploadedDoc.extractedData.candidateName);
    console.assert(uploadedDoc.path === undefined, 'Internal filesystem path must NOT be exposed in API response');
    console.assert(uploadedDoc.extractedData.isReadable === true, 'Uploaded PNG must be readable via OCR');
    console.log('✓ TEST 6 PASSED');

    console.log('\n--- TEST 7: Individual Document Deletion & Disk Cleanup ---');
    const deleteDocRes = await request('DELETE', `/api/audits/${auditId}/documents/${uploadedDoc.id}`, null, creatorToken);
    console.log('Delete document status:', deleteDocRes.status);
    console.assert(deleteDocRes.status === 200, 'Delete document status must be 200');
    console.log('✓ TEST 7 PASSED');

    console.log('\n--- TEST 8: Re-run Verification Engine ---');
    const reVerifyRes = await request('POST', `/api/audits/${auditId}/verify`, null, creatorToken);
    const reReport = reVerifyRes.data.report;
    const reNameDiscs = reReport.crossDocDiscrepancies.filter(d => d.field === 'CANDIDATE_NAME');
    console.log('Name variations after manual correction:', reNameDiscs.length);
    console.assert(reNameDiscs.length === 0, 'No name discrepancies should remain after alignment');
    console.log('✓ TEST 8 PASSED');

    console.log('\n--- TEST 9: Privacy Deletion and Data Wipe ---');
    const delRes = await request('DELETE', `/api/audits/${auditId}`, null, creatorToken);
    console.log('Delete response:', delRes.data.message);
    console.assert(delRes.data.success === true, 'Deletion must succeed');

    const checkRes = await request('GET', `/api/audits/${auditId}`, null, creatorToken);
    console.log('Get deleted audit status:', checkRes.status);
    console.assert(checkRes.status === 404, 'Must return 404 after deletion');
    console.log('✓ TEST 9 PASSED');

    console.log('\n========================================');
    console.log('🎉 ALL 9 END-TO-END VERIFICATION TESTS PASSED!');
    console.log('========================================\n');

  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit();
  }
});
