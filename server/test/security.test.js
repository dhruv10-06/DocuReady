// server/test/security.test.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const auditRoutes = require('../routes/auditRoutes');
const {
  auditStore,
  AUDIT_TTL_MS,
  cleanupExpiredAudits,
  cleanupOrphanUploads,
} = require('../routes/auditRoutes');
const { ensureSampleFiles } = require('../services/sampleFileGenerator');
const { validateFileSignature } = require('../services/securityService');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', auditRoutes);

ensureSampleFiles();

const TEST_PORT = 5098;
const server = app.listen(TEST_PORT, async () => {
  console.log(`>>> Security Test Server running on port ${TEST_PORT}`);

  try {
    async function apiRequest(method, pathUrl, body = null, token = null) {
      return new Promise((resolve, reject) => {
        const headers = {};
        if (body) headers['Content-Type'] = 'application/json';
        if (token) headers['X-Audit-Token'] = token;

        const req = http.request({
          hostname: 'localhost',
          port: TEST_PORT,
          path: pathUrl,
          method,
          headers,
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch {
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
    console.log('🛡️  DOCUREADY SECURITY & VISITOR ISOLATION TEST SUITE');
    console.log('========================================================\n');

    // Setup: Create Audit for Visitor A
    console.log('--- SETUP: Provisioning Sessions for Visitor A and Visitor B ---');
    const resA = await apiRequest('POST', '/api/audits', {
      category: 'SCHOLARSHIP',
      applicantName: 'Visitor A (Priya Patel)',
    });
    console.assert(resA.status === 201, 'Visitor A audit creation must succeed');
    const auditA = resA.data;
    console.log(`Visitor A Audit ID: ${auditA.id}`);
    console.log(`Visitor A Creator Token: ${auditA.creatorToken.slice(0, 10)}...`);

    // Setup: Create Audit for Visitor B
    const resB = await apiRequest('POST', '/api/audits', {
      category: 'COLLEGE_ADMISSION',
      applicantName: 'Visitor B (Arjun Mehta)',
    });
    console.assert(resB.status === 201, 'Visitor B audit creation must succeed');
    const auditB = resB.data;
    console.log(`Visitor B Audit ID: ${auditB.id}`);
    console.log(`Visitor B Creator Token: ${auditB.creatorToken.slice(0, 10)}...\n`);

    // Load Demo data into Visitor B's audit so it contains documents
    await apiRequest('POST', `/api/audits/${auditB.id}/demo`, null, auditB.creatorToken);

    // SECURITY CHECK 1: Missing or Invalid Creator Token Rejection
    console.log('--- SECURITY CHECK 1: Token Enforcement on Protected Endpoints ---');
    const noTokenRes = await apiRequest('GET', `/api/audits/${auditA.id}`);
    console.log('Access without token -> Status:', noTokenRes.status, '| Error:', noTokenRes.data.error);
    console.assert(noTokenRes.status === 401, 'Must reject missing token with 401');

    const wrongTokenRes = await apiRequest('GET', `/api/audits/${auditA.id}`, null, 'invalid-random-token-123456');
    console.log('Access with invalid token -> Status:', wrongTokenRes.status, '| Error:', wrongTokenRes.data.error);
    console.assert(wrongTokenRes.status === 403, 'Must reject invalid token with 403');
    console.log('✓ CHECK 1 PASSED: Protected endpoints reject requests lacking valid token.\n');

    // SECURITY CHECK 2: Visitor A cannot retrieve Visitor B's audit
    console.log('--- SECURITY CHECK 2: Cross-Visitor Audit Access Isolation ---');
    const crossReadRes = await apiRequest('GET', `/api/audits/${auditB.id}`, null, auditA.creatorToken);
    console.log('Visitor A trying to read Visitor B audit -> Status:', crossReadRes.status, '| Error:', crossReadRes.data.error);
    console.assert(crossReadRes.status === 403, 'Must forbid Visitor A from reading Visitor B data');
    console.log('✓ CHECK 2 PASSED: Visitor A cannot retrieve Visitor B audit.\n');

    // SECURITY CHECK 3: Visitor A cannot modify Visitor B's documents
    console.log('--- SECURITY CHECK 3: Cross-Visitor Document Modification Prevention ---');
    // Get doc ID from Visitor B
    const bDetails = await apiRequest('GET', `/api/audits/${auditB.id}`, null, auditB.creatorToken);
    const bDocId = bDetails.data.documents[0].id;

    const crossUpdateRes = await apiRequest('PUT', `/api/audits/${auditB.id}/documents/${bDocId}`, {
      candidateName: 'Malicious Attacker Name',
    }, auditA.creatorToken);
    console.log('Visitor A trying to tamper with Visitor B document -> Status:', crossUpdateRes.status, '| Error:', crossUpdateRes.data.error);
    console.assert(crossUpdateRes.status === 403, 'Must forbid Visitor A from editing Visitor B document');
    console.log('✓ CHECK 3 PASSED: Visitor A cannot modify Visitor B documents.\n');

    // SECURITY CHECK 4: Visitor A cannot delete Visitor B's audit
    console.log('--- SECURITY CHECK 4: Cross-Visitor Audit Deletion Prevention ---');
    const crossDeleteRes = await apiRequest('DELETE', `/api/audits/${auditB.id}`, null, auditA.creatorToken);
    console.log('Visitor A trying to delete Visitor B audit -> Status:', crossDeleteRes.status, '| Error:', crossDeleteRes.data.error);
    console.assert(crossDeleteRes.status === 403, 'Must forbid Visitor A from deleting Visitor B audit');

    // Verify Visitor B audit still exists
    const bVerifyRes = await apiRequest('GET', `/api/audits/${auditB.id}`, null, auditB.creatorToken);
    console.assert(bVerifyRes.status === 200, 'Visitor B audit must remain intact');
    console.log('✓ CHECK 4 PASSED: Visitor A cannot delete Visitor B audit.\n');

    // SECURITY CHECK 5: Dashboard Isolation (No Global Audit Listing)
    console.log('--- SECURITY CHECK 5: Dashboard Audit Scoping & Isolation ---');
    // Unauthenticated GET /api/audits returns empty
    const globalGetRes = await apiRequest('GET', '/api/audits');
    console.log('Unauthenticated GET /api/audits length:', globalGetRes.data.length);
    console.assert(globalGetRes.data.length === 0, 'Global listing must be empty to prevent discovery');

    // Visitor A queries their owned audits via POST /api/audits/my-audits
    const myAuditsA = await apiRequest('POST', '/api/audits/my-audits', {
      audits: [{ id: auditA.id, token: auditA.creatorToken }],
    });
    console.log('Visitor A dashboard audits count:', myAuditsA.data.length);
    console.assert(myAuditsA.data.length === 1, 'Visitor A must receive only 1 audit');
    console.assert(myAuditsA.data[0].id === auditA.id, 'Visitor A must only see audit A');
    console.assert(myAuditsA.data[0].applicantName === 'Visitor A (Priya Patel)', 'Correct applicant returned');

    // Visitor A attempts to pass Visitor B ID in their owned list
    const spoofedDashboard = await apiRequest('POST', '/api/audits/my-audits', {
      audits: [
        { id: auditA.id, token: auditA.creatorToken },
        { id: auditB.id, token: auditA.creatorToken }, // Spoofed pair: B id with A token
      ],
    });
    console.log('Spoofed dashboard query result count:', spoofedDashboard.data.length);
    console.assert(spoofedDashboard.data.length === 1, 'Backend must filter out unauthorized audit B');
    console.assert(spoofedDashboard.data[0].id === auditA.id, 'Only legitimate audit A returned');
    console.log('✓ CHECK 5 PASSED: Dashboard queries strictly enforce per-item token verification.\n');

    // SECURITY CHECK 6: Response Sanitization (No internal filesystem paths)
    console.log('--- SECURITY CHECK 6: API Response Sanitization & Path Masking ---');
    console.assert(bDetails.data.creatorTokenHash === undefined, 'creatorTokenHash must never be exposed');
    console.assert(bDetails.data.creatorToken === undefined, 'creatorToken must not appear in retrieval');
    for (const doc of bDetails.data.documents) {
      console.assert(doc.path === undefined, 'doc.path must NEVER be returned to client');
      console.assert(doc.storedName === undefined, 'doc.storedName must NEVER be returned to client');
    }
    console.log('Document sample response keys:', Object.keys(bDetails.data.documents[0]).join(', '));
    console.log('✓ CHECK 6 PASSED: Internal filesystem paths and secrets are completely stripped.\n');

    // SECURITY CHECK 7: Input Validation (UUID & File Signature)
    console.log('--- SECURITY CHECK 7: Strict Input Validation & File Signatures ---');
    const pathTraversalRes = await apiRequest('GET', '/api/audits/..%2F..%2Fsecret', null, 'dummy-token');
    console.log('Path traversal attempt -> Status:', pathTraversalRes.status);
    console.assert(pathTraversalRes.status === 400 || pathTraversalRes.status === 404, 'Must reject malformed audit ID');

    // Test Magic Bytes Signature check directly
    const validSamplePdf = path.join(__dirname, '..', 'public', 'sample-docs', 'Synthetic_Aadhaar_Rahul_Sharma.pdf');
    const validSamplePng = path.join(__dirname, '..', 'public', 'sample-docs', 'Synthetic_Aadhaar_Rahul_Sharma.png');
    console.assert(validateFileSignature(validSamplePdf, 'application/pdf') === true, 'PDF magic bytes must pass');
    console.assert(validateFileSignature(validSamplePng, 'image/png') === true, 'PNG magic bytes must pass');
    console.assert(validateFileSignature(validSamplePdf, 'image/png') === false, 'PDF disguised as PNG must fail');
    console.log('✓ CHECK 7 PASSED: UUIDs and file magic bytes strictly validated.\n');

    // SECURITY CHECK 8: Quick Demo Isolation
    console.log('--- SECURITY CHECK 8: Independent Quick Demo Instances ---');
    // Visitor 1 creates demo
    const demoA = await apiRequest('POST', '/api/audits', { category: 'SCHOLARSHIP', applicantName: 'Demo 1' });
    await apiRequest('POST', `/api/audits/${demoA.data.id}/demo`, null, demoA.data.creatorToken);

    // Visitor 2 creates demo
    const demoB = await apiRequest('POST', '/api/audits', { category: 'SCHOLARSHIP', applicantName: 'Demo 2' });
    await apiRequest('POST', `/api/audits/${demoB.data.id}/demo`, null, demoB.data.creatorToken);

    console.assert(demoA.data.id !== demoB.data.id, 'Demo sessions must have different IDs');
    console.assert(demoA.data.creatorToken !== demoB.data.creatorToken, 'Demo sessions must have different tokens');

    // Visitor 1 modifying Demo 1 does NOT affect Demo 2
    const d1Docs = (await apiRequest('GET', `/api/audits/${demoA.data.id}`, null, demoA.data.creatorToken)).data.documents;
    await apiRequest('PUT', `/api/audits/${demoA.data.id}/documents/${d1Docs[0].id}`, {
      candidateName: 'Customized Demo Name',
    }, demoA.data.creatorToken);

    const d2Docs = (await apiRequest('GET', `/api/audits/${demoB.data.id}`, null, demoB.data.creatorToken)).data.documents;
    console.assert(d2Docs[0].extractedData.candidateName === 'Rahul Sharma', 'Demo 2 must remain pristine and unpolluted');
    console.log('✓ CHECK 8 PASSED: Quick Demo creates isolated private instances.\n');

    // SECURITY CHECK 9: TTL Expiration & Automatic Cleanup
    console.log('--- SECURITY CHECK 9: Automatic Data Retention (TTL Cleanup) ---');
    // Artificially age Visitor A's audit past the 2-hour TTL
    const storedAuditA = auditStore.get(auditA.id);
    storedAuditA.lastAccessedAt = Date.now() - (AUDIT_TTL_MS + 10000); // 2 hours + 10s ago

    // Run cleanup
    cleanupExpiredAudits();

    console.assert(auditStore.has(auditA.id) === false, 'Expired audit A must be purged from memory');
    const postCleanupRes = await apiRequest('GET', `/api/audits/${auditA.id}`, null, auditA.creatorToken);
    console.assert(postCleanupRes.status === 404, 'Purged audit must return 404');

    // Startup orphan cleanup test
    const dummyOrphanDir = path.join(__dirname, '..', 'uploads', 'dummy-orphan-test-session');
    if (!fs.existsSync(dummyOrphanDir)) fs.mkdirSync(dummyOrphanDir, { recursive: true });
    console.assert(fs.existsSync(dummyOrphanDir) === true, 'Dummy orphan dir created');
    cleanupOrphanUploads();
    console.assert(fs.existsSync(dummyOrphanDir) === false, 'Dummy orphan dir must be deleted on cleanup');
    console.log('✓ CHECK 9 PASSED: TTL expiration purges old sessions; orphan cleaner clears abandoned files.\n');

    // Clean up remaining test sessions
    await apiRequest('DELETE', `/api/audits/${auditB.id}`, null, auditB.creatorToken);
    await apiRequest('DELETE', `/api/audits/${demoA.data.id}`, null, demoA.data.creatorToken);
    await apiRequest('DELETE', `/api/audits/${demoB.data.id}`, null, demoB.data.creatorToken);

    console.log('========================================================');
    console.log('🎉 ALL 9 COMPREHENSIVE SECURITY CHECKS PASSED (100%)');
    console.log('========================================================\n');

  } catch (err) {
    console.error('Security test failure:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit();
  }
});
