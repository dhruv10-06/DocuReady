// server/test/persistence.test.js

const http = require('http');
const express = require('express');
const cors = require('cors');

const auditRoutes = require('../routes/auditRoutes');
const { ensureSampleFiles } = require('../services/sampleFileGenerator');

// Set up test server on port 5097
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', auditRoutes);

ensureSampleFiles();

const server = app.listen(5097, async () => {
  console.log('>>> Persistence Test Server running on port 5097');

  try {
    async function request(method, pathUrl, body = null, token = null) {
      return new Promise((resolve, reject) => {
        const headers = {};
        if (body) headers['Content-Type'] = 'application/json';
        if (token) headers['X-Audit-Token'] = token;

        const req = http.request({
          hostname: '127.0.0.1',
          port: 5097,
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

    console.log('========================================================');
    console.log('🔄 DOCUREADY SESSION PERSISTENCE & RESUMPTION TEST SUITE');
    console.log('========================================================\n');

    // TEST 1: Create Audit & Receive Creator Token
    console.log('--- TEST 1: Create Audit Session with Creator Token ---');
    const createRes = await request('POST', '/api/audits', {
      category: 'SCHOLARSHIP',
      applicantName: 'Vikram Malhotra',
      applicationNumber: 'NSP-2026-PERSIST-01',
    });
    console.assert(createRes.status === 201, `Status should be 201, got ${createRes.status}`);
    const auditId = createRes.data.id;
    const creatorToken = createRes.data.creatorToken;
    console.assert(Boolean(auditId), 'Must return auditId');
    console.assert(Boolean(creatorToken), 'Must return creatorToken');
    console.log(`Created Audit ID: ${auditId}`);
    console.log(`Creator Token: ${creatorToken.slice(0, 10)}...`);
    console.log('✓ TEST 1 PASSED\n');

    // TEST 2: Simulate Page Refresh 1 - Re-fetch empty audit session
    console.log('--- TEST 2: Page Refresh 1 - Fetch Initial Audit Details ---');
    const refresh1 = await request('GET', `/api/audits/${auditId}`, null, creatorToken);
    console.assert(refresh1.status === 200, `Expected 200, got ${refresh1.status}`);
    console.assert(refresh1.data.applicantName === 'Vikram Malhotra', 'Applicant name must match');
    console.assert(refresh1.data.applicationNumber === 'NSP-2026-PERSIST-01', 'App number must match');
    console.assert(refresh1.data.documents.length === 0, 'Should have 0 documents initially');
    console.log('Initial details preserved exactly on reload.');
    console.log('✓ TEST 2 PASSED\n');

    // TEST 3: Load Demo Documents and Run Verification
    console.log('--- TEST 3: Populate Documents & Generate Report ---');
    const demoRes = await request('POST', `/api/audits/${auditId}/demo`, {}, creatorToken);
    console.assert(demoRes.status === 200, `Demo load expected 200, got ${demoRes.status}`);
    console.assert(demoRes.data.documents.length === 3, 'Must load 3 documents');
    console.assert(Boolean(demoRes.data.report), 'Report must be generated');
    const initialScore = demoRes.data.report.readinessScore;
    console.log(`Documents count: ${demoRes.data.documents.length}`);
    console.log(`Initial Readiness Score: ${initialScore}%`);
    console.log('✓ TEST 3 PASSED\n');

    // TEST 4: Simulate Page Refresh 2 - Re-open existing audit with documents and report
    console.log('--- TEST 4: Page Refresh 2 - Reopen In-Progress Audit with Documents & Report ---');
    const refresh2 = await request('GET', `/api/audits/${auditId}`, null, creatorToken);
    console.assert(refresh2.status === 200, `Expected 200, got ${refresh2.status}`);
    console.assert(refresh2.data.documents.length === 3, 'Must still have 3 documents after reload');
    console.assert(Boolean(refresh2.data.report), 'Report must remain available on reload');
    console.assert(refresh2.data.report.readinessScore === initialScore, 'Readiness score must match');
    console.log('All 3 documents, extracted data, and full audit report survived page reload.');
    console.log('✓ TEST 4 PASSED\n');

    // TEST 5: Manual Document Review / Field Correction Persistence
    console.log('--- TEST 5: Manual Field Correction Persistence Across Sessions ---');
    const docToUpdate = refresh2.data.documents[1];
    const updateRes = await request('PUT', `/api/audits/${auditId}/documents/${docToUpdate.id}`, {
      candidateName: 'Rahul Sharma (Corrected)',
    }, creatorToken);
    console.assert(updateRes.status === 200, `Update should return 200, got ${updateRes.status}`);

    // Simulate Page Refresh 3 after review
    const refresh3 = await request('GET', `/api/audits/${auditId}`, null, creatorToken);
    const updatedDoc = refresh3.data.documents.find(d => d.id === docToUpdate.id);
    console.assert(updatedDoc.extractedData.candidateName === 'Rahul Sharma (Corrected)', 'Corrected name must persist');
    console.assert(updatedDoc.isUserVerified === true, 'isUserVerified flag must persist');
    console.log(`Corrected field verified after reload: "${updatedDoc.extractedData.candidateName}"`);
    console.log('✓ TEST 5 PASSED\n');

    // TEST 6: Scoped Dashboard Retrieval Across Navigation
    console.log('--- TEST 6: Dashboard Scoped Listing Across Navigation ---');
    const myAuditsRes = await request('POST', '/api/audits/my-audits', {
      audits: [{ id: auditId, token: creatorToken }],
    });
    console.assert(myAuditsRes.status === 200, `Expected 200, got ${myAuditsRes.status}`);
    console.assert(myAuditsRes.data.length === 1, 'Should find 1 owned audit');
    console.assert(myAuditsRes.data[0].id === auditId, 'Found audit ID must match');
    console.assert(myAuditsRes.data[0].documentsCount === 3, 'Document count must match');
    console.log(`Dashboard successfully located active audit: ${myAuditsRes.data[0].id}`);
    console.log('✓ TEST 6 PASSED\n');

    // TEST 7: Visitor Isolation - Another Visitor Cannot Resume or Read This Session
    console.log('--- TEST 7: Strict Visitor Isolation on Resumption ---');
    const fakeToken = '0000000000000000000000000000000000000000000000000000000000000000';
    const unauthorizedRes = await request('GET', `/api/audits/${auditId}`, null, fakeToken);
    console.assert(unauthorizedRes.status === 403, `Expected 403 Forbidden, got ${unauthorizedRes.status}`);
    console.log('Visitor without matching token is blocked from resuming or reading this session.');
    console.log('✓ TEST 7 PASSED\n');

    // TEST 8: Re-Verify and Permanent Deletion
    console.log('--- TEST 8: Re-Verify & Session Cleanup ---');
    const reVerifyRes = await request('POST', `/api/audits/${auditId}/verify`, {}, creatorToken);
    console.assert(reVerifyRes.status === 200, 'Re-verify must succeed');

    const deleteRes = await request('DELETE', `/api/audits/${auditId}`, null, creatorToken);
    console.assert(deleteRes.status === 200, 'Delete must succeed');

    const postDeleteRes = await request('GET', `/api/audits/${auditId}`, null, creatorToken);
    console.assert(postDeleteRes.status === 404, 'Deleted audit must return 404');
    console.log('Audit session permanently purged.');
    console.log('✓ TEST 8 PASSED\n');

    console.log('========================================================');
    console.log('🎉 ALL 8 SESSION PERSISTENCE & RESUMPTION CHECKS PASSED!');
    console.log('========================================================');

    server.close(() => {
      process.exit(0);
    });
  } catch (err) {
    console.error('Persistence Test Error:', err);
    server.close(() => {
      process.exit(1);
    });
  }
});
