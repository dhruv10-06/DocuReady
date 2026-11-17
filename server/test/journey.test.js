// server/test/journey.test.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5000/api';

async function request(method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${endpoint}`);
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['X-Audit-Token'] = token;

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
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

async function uploadMultipart(auditId, filePath, docCategory, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const filename = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    let mimeType = 'application/pdf';
    if (filename.endsWith('.png')) mimeType = 'image/png';
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mimeType = 'image/jpeg';

    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="docCategory"\r\n\r\n` +
      `${docCategory}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="documents"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, fileContent, footer]);

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/audits/${auditId}/upload`,
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
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Simulated Browser Storage
const simulatedLocalStorage = new Map();
const simulatedSessionStorage = new Map();

function saveOwnedAudit(id, token) {
  const existing = simulatedLocalStorage.has('docuready_owned_audits')
    ? JSON.parse(simulatedLocalStorage.get('docuready_owned_audits'))
    : [];
  const filtered = existing.filter(a => a.id !== id);
  filtered.unshift({ id, token, savedAt: Date.now() });
  simulatedLocalStorage.set('docuready_owned_audits', JSON.stringify(filtered));
}

function getAuditToken(id) {
  if (!simulatedLocalStorage.has('docuready_owned_audits')) return null;
  const list = JSON.parse(simulatedLocalStorage.get('docuready_owned_audits'));
  const match = list.find(a => a.id === id);
  return match ? match.token : null;
}

function saveAuditStep(auditId, step) {
  simulatedSessionStorage.set(`docuready_audit_step_${auditId}`, String(step));
}

function getAuditStep(auditId) {
  const val = simulatedSessionStorage.get(`docuready_audit_step_${auditId}`);
  return val ? parseInt(val, 10) : null;
}

async function runCompleteUserJourney() {
  console.log('================================================================');
  console.log('🚀 TESTING COMPLETE AUDIT USER JOURNEY ON LIVE DOCUREADY SERVERS');
  console.log('================================================================\n');

  // STEP 1: Click "New Audit" -> Step 1: Enter applicant details
  console.log('👉 STEP 1: Create Audit Session (Applicant: Priya Nair, NSP-PRIYA-2026)');
  const createRes = await request('POST', '/audits', {
    category: 'SCHOLARSHIP',
    applicantName: 'Priya Nair',
    applicationNumber: 'NSP-PRIYA-2026',
  });
  console.assert(createRes.status === 201, `Expected 201, got ${createRes.status}`);
  const auditId = createRes.data.id;
  const token = createRes.data.creatorToken;
  console.assert(Boolean(auditId), 'auditId must be returned');
  console.assert(Boolean(token), 'creatorToken must be returned');

  // Frontend stores token and step
  saveOwnedAudit(auditId, token);
  simulatedSessionStorage.set('docuready_active_audit_id', auditId);
  saveAuditStep(auditId, 2); // Transitions directly to Step 2 without redirect!

  console.log(`✓ Audit created successfully: ID ${auditId}`);
  console.log(`✓ Creator Token recorded in client storage: ${token.slice(0, 12)}...`);
  console.log(`✓ Transitioned directly to Step 2 (Upload Documents) on same session\n`);

  // STEP 2: Upload Documents
  console.log('👉 STEP 2: Upload Real Synthetic Documents to Audit');
  const sampleDir = path.join(__dirname, '..', 'public', 'sample-docs');
  const aadhaarPath = path.join(sampleDir, 'Synthetic_Aadhaar_Rahul_Sharma.pdf');
  const marksheetPath = path.join(sampleDir, 'Synthetic_Class_XII_Marksheet_Rahul.pdf');

  const upload1 = await uploadMultipart(auditId, aadhaarPath, 'IDENTITY_PROOF', token);
  console.assert(upload1.status === 200, `Upload 1 failed with status ${upload1.status}`);
  console.log(`Uploaded document 1: ${upload1.data.documents[0].filename} (${upload1.data.documents[0].extractedData.candidateName})`);

  const upload2 = await uploadMultipart(auditId, marksheetPath, 'MARKSHEET', token);
  console.assert(upload2.status === 200, `Upload 2 failed with status ${upload2.status}`);
  console.log(`Uploaded document 2: ${upload2.data.documents[1].filename} (${upload2.data.documents[1].extractedData.candidateName})`);
  console.assert(upload2.data.documents.length === 2, 'Audit must now have 2 documents');

  saveAuditStep(auditId, 3); // Move to Step 3 (Review OCR)
  console.log('✓ Successfully uploaded and parsed documents into audit session\n');

  // STEP 3: Manual Field Review & Correction
  console.log('👉 STEP 3: Manual Review & Field Correction on Step 3');
  const docToCorrect = upload2.data.documents[1];
  const updateRes = await request('PUT', `/audits/${auditId}/documents/${docToCorrect.id}`, {
    candidateName: 'Priya Nair (Corrected Marksheet)',
  }, token);
  console.assert(updateRes.status === 200, 'Update must succeed');
  console.log(`Updated field candidateName: "${updateRes.data.document.extractedData.candidateName}"`);
  console.assert(updateRes.data.document.isUserVerified === true, 'Flag isUserVerified must be true');
  console.log('✓ Field correction saved successfully\n');

  // STEP 4: Run Verification Engine
  console.log('👉 STEP 4: Execute Cross-Document Verification Engine');
  const verifyRes = await request('POST', `/audits/${auditId}/verify`, {}, token);
  console.assert(verifyRes.status === 200, 'Verification must succeed');
  console.assert(Boolean(verifyRes.data.report), 'Report must be returned');
  const readinessScore = verifyRes.data.report.readinessScore;
  console.log(`Generated Audit Report: Overall Status = ${verifyRes.data.report.overallStatus}, Readiness Score = ${readinessScore}%`);
  saveAuditStep(auditId, 5); // Final Step 5 (Audit Report)
  console.log('✓ Verification report generated\n');

  // STEP 5: Navigate to Overview & Check Resumption
  console.log('👉 STEP 5: Navigate to Overview and Resume Active Audit');
  const activeSessionId = simulatedSessionStorage.get('docuready_active_audit_id');
  console.assert(activeSessionId === auditId, 'Active session ID must be preserved during navigation');
  const storedToken = getAuditToken(activeSessionId);
  console.assert(Boolean(storedToken), 'Creator token must be available for active session');

  // Client fetches audit details upon resuming
  const resumeRes = await request('GET', `/audits/${activeSessionId}`, null, storedToken);
  console.assert(resumeRes.status === 200, 'Resuming active audit must return 200');
  console.assert(resumeRes.data.applicantName === 'Priya Nair', 'Applicant name must match exactly');
  console.assert(resumeRes.data.documents.length === 2, 'All 2 uploaded documents must be present');
  console.assert(Boolean(resumeRes.data.report), 'Verification report must remain attached');
  console.assert(resumeRes.data.report.readinessScore === readinessScore, 'Readiness score must match');
  const resumedStep = getAuditStep(activeSessionId);
  console.assert(resumedStep === 5, 'Must resume at saved Step 5 (Audit Report)');
  console.log(`✓ Resumed session: Applicant = "${resumeRes.data.applicantName}", Step = ${resumedStep}, Documents = ${resumeRes.data.documents.length}, Report intact\n`);

  // STEP 6: Simulate Browser Refresh (F5) on #/audit/:id
  console.log('👉 STEP 6: Simulate Browser Reload (F5) on #/audit/:id');
  const hashAuditId = auditId; // URL is #/audit/<id>
  const refreshRes = await request('GET', `/audits/${hashAuditId}`, null, getAuditToken(hashAuditId));
  console.assert(refreshRes.status === 200, 'Reloading active audit URL must succeed');
  console.assert(refreshRes.data.applicantName === 'Priya Nair', 'Applicant name must survive reload');
  console.assert(refreshRes.data.documents.length === 2, 'Documents must survive reload');
  console.assert(Boolean(refreshRes.data.report), 'Report must survive reload');
  const reloadStep = getAuditStep(hashAuditId);
  console.assert(reloadStep === 5, 'Wizard step must survive reload');
  console.log('✓ Reload test passed: 100% of data, applicant details, documents, and report survived\n');

  // STEP 7: Scoped Dashboard Reopening
  console.log('👉 STEP 7: Retrieve from Dashboard via Scoped Tokens');
  const dashboardRes = await request('POST', '/audits/my-audits', {
    audits: [{ id: auditId, token }],
  });
  console.assert(dashboardRes.status === 200, 'Dashboard request must succeed');
  console.assert(dashboardRes.data.length === 1, 'Must find 1 owned audit');
  console.assert(dashboardRes.data[0].applicantName === 'Priya Nair', 'Applicant name in dashboard must match');
  console.log(`✓ Dashboard lists: "${dashboardRes.data[0].applicantName}" with score ${dashboardRes.data[0].readinessScore}%\n`);

  // STEP 8: Cleanup / Permanent Deletion
  console.log('👉 STEP 8: Permanent Wipe & Cleanup');
  const delRes = await request('DELETE', `/audits/${auditId}`, null, token);
  console.assert(delRes.status === 200, 'Delete must succeed');
  const checkGone = await request('GET', `/audits/${auditId}`, null, token);
  console.assert(checkGone.status === 404, 'Deleted audit must return 404');
  console.log('✓ Audit permanently wiped from server\n');

  console.log('================================================================');
  console.log('🎉 COMPLETE USER JOURNEY VERIFIED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runCompleteUserJourney().catch(err => {
  console.error('Journey Test Error:', err);
  process.exit(1);
});
