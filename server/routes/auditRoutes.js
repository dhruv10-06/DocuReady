// server/routes/auditRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { APPLICATION_CATEGORIES, DOCUMENT_CATEGORIES } = require('../data/categories');
const { SYNTHETIC_DEMO_CASES } = require('../data/sampleData');
const { processDocumentFile } = require('../services/ocrService');
const { performAuditVerification } = require('../services/verificationEngine');
const {
  generateCreatorToken,
  hashToken,
  isValidUUID,
  validateFileSignature,
  sanitizeDocument,
  sanitizeAudit,
} = require('../services/securityService');

// In-memory audit storage (privacy-preserving transient store with TTL)
const auditStore = new Map();

// 2-hour Time-To-Live (TTL) for audit sessions
const AUDIT_TTL_MS = 2 * 60 * 60 * 1000;

// Multer storage configuration for temporary files
const uploadsBaseDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const auditId = req.params.id;
    if (!isValidUUID(auditId)) {
      return cb(new Error('Invalid audit identifier format.'));
    }
    const auditDir = path.join(uploadsBaseDir, auditId);
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    cb(null, auditDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const hasAllowedExt = /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname);
    const hasAllowedMime = allowedMimes.includes(file.mimetype);

    // Require both allowed extension and allowed MIME type
    if (hasAllowedExt && hasAllowedMime) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload PDF, JPG, or PNG files only.'));
    }
  },
});

/**
 * Authorization Middleware: Enforce creator-token ownership on audit operations
 */
function requireAuditOwnership(req, res, next) {
  const auditId = req.params.id;
  if (!isValidUUID(auditId)) {
    return res.status(400).json({ error: 'Invalid audit identifier format.' });
  }

  const audit = auditStore.get(auditId);
  if (!audit) {
    return res.status(404).json({ error: 'Audit session not found.' });
  }

  const token = req.headers['x-audit-token'] || (req.headers['authorization']?.replace(/^Bearer\s+/i, ''));
  if (!token) {
    return res.status(401).json({ error: 'Authorization required. Missing X-Audit-Token header.' });
  }

  const tokenHash = hashToken(token);
  if (audit.creatorTokenHash !== tokenHash) {
    return res.status(403).json({ error: 'Access denied. You do not have permission to access or modify this audit session.' });
  }

  // Update activity timestamp for TTL renewal
  audit.lastAccessedAt = Date.now();
  req.audit = audit;
  next();
}

/**
 * Clean up expired audit sessions and their uploaded files (2-hour TTL)
 */
function cleanupExpiredAudits() {
  const now = Date.now();
  for (const [auditId, audit] of auditStore.entries()) {
    const lastActive = audit.lastAccessedAt || audit.createdAtTimestamp || 0;
    if (now - lastActive > AUDIT_TTL_MS) {
      const auditDir = path.join(uploadsBaseDir, auditId);
      if (fs.existsSync(auditDir)) {
        try {
          fs.rmSync(auditDir, { recursive: true, force: true });
        } catch (e) {
          console.error(`[Cleanup] Error removing expired upload dir for ${auditId}:`, e.message);
        }
      }
      auditStore.delete(auditId);
      console.log(`[Cleanup] Purged expired audit session: ${auditId}`);
    }
  }
}

// Background cleanup interval (runs every 5 minutes, unrefed to avoid holding test process)
const cleanerInterval = setInterval(cleanupExpiredAudits, 5 * 60 * 1000);
if (cleanerInterval.unref) cleanerInterval.unref();

/**
 * Startup cleaner: Remove orphaned directories in uploadsBaseDir left from prior server runs
 */
function cleanupOrphanUploads() {
  if (!fs.existsSync(uploadsBaseDir)) return;
  try {
    const entries = fs.readdirSync(uploadsBaseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderName = entry.name;
        if (!auditStore.has(folderName)) {
          const orphanDir = path.join(uploadsBaseDir, folderName);
          try {
            fs.rmSync(orphanDir, { recursive: true, force: true });
            console.log(`[Startup Cleanup] Removed orphan upload directory: ${folderName}`);
          } catch (e) {
            console.error(`[Startup Cleanup] Failed to remove ${folderName}:`, e.message);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Startup Cleanup] Error reading uploads base dir:', err.message);
  }
}

/**
 * GET /api/categories
 * List application categories & document types (public)
 */
router.get('/categories', (req, res) => {
  res.json({
    categories: Object.values(APPLICATION_CATEGORIES),
    documentTypes: DOCUMENT_CATEGORIES,
  });
});

/**
 * GET /api/sample-docs
 * List pre-generated synthetic files (public metadata)
 */
router.get('/sample-docs', (req, res) => {
  const sampleDir = path.join(__dirname, '..', 'public', 'sample-docs');
  let files = [];
  if (fs.existsSync(sampleDir)) {
    files = fs.readdirSync(sampleDir).map(filename => {
      const ext = path.extname(filename).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

      let docCategory = 'OTHER';
      if (filename.includes('Aadhaar')) docCategory = 'IDENTITY_PROOF';
      else if (filename.includes('Marksheet')) docCategory = 'MARKSHEET';
      else if (filename.includes('Income')) docCategory = 'INCOME_CERTIFICATE';

      return {
        filename,
        mimeType,
        docCategory,
        url: `/sample-docs/${filename}`,
        previewUrl: `/sample-docs/preview/${filename}`,
        downloadUrl: `/sample-docs/download/${filename}`,
      };
    });
  }
  res.json({
    scenario: 'Rahul Sharma Synthetic Benchmark',
    description: 'Pre-configured documents demonstrating name variation (Rahul S. Sharma vs Rahul Sharma), DOB mismatch (2004 vs 2005), and missing Application Form.',
    files,
  });
});

/**
 * GET /api/sample-docs/download/:filename
 * Explicit attachment download route for cross-domain downloads
 */
router.get('/sample-docs/download/:filename', (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(__dirname, '..', 'public', 'sample-docs', safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Sample document not found' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.download(filePath, safeFilename);
});

/**
 * GET /api/sample-docs/preview/:filename
 * Explicit inline preview route to open in new tab
 */
router.get('/sample-docs/preview/:filename', (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(__dirname, '..', 'public', 'sample-docs', safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Sample document not found' });
  }
  const ext = path.extname(safeFilename).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.pdf') contentType = 'application/pdf';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  return fs.createReadStream(filePath).pipe(res);
});

/**
 * GET /api/audits
 * Global audit listing is disabled to prevent visitor enumeration
 */
router.get('/audits', (req, res) => {
  res.json([]);
});

/**
 * POST /api/audits/my-audits
 * Retrieve only the audits owned by the requesting client session
 */
router.post('/audits/my-audits', (req, res) => {
  try {
    const requested = req.body.audits || [];
    if (!Array.isArray(requested)) {
      return res.status(400).json({ error: 'Invalid payload: audits array expected.' });
    }

    const ownedList = [];
    for (const item of requested) {
      if (!item || !isValidUUID(item.id) || !item.token) continue;
      const audit = auditStore.get(item.id);
      if (audit && audit.creatorTokenHash === hashToken(item.token)) {
        audit.lastAccessedAt = Date.now();
        ownedList.push({
          id: audit.id,
          applicantName: audit.applicantName,
          category: audit.category,
          createdAt: audit.createdAt,
          documentsCount: (audit.documents || []).length,
          status: audit.report?.overallStatus || 'IN_PROGRESS',
          statusBadgeText: audit.report?.statusBadgeText || 'IN PROGRESS',
          statusColor: audit.report?.statusColor || 'blue',
          readinessScore: audit.report?.readinessScore ?? null,
        });
      }
    }

    res.json(ownedList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audits
 * Create a new audit session with a unique creator token
 */
router.post('/audits', (req, res) => {
  try {
    const { category, applicantName, applicationNumber } = req.body;
    const catConfig = APPLICATION_CATEGORIES[category] || APPLICATION_CATEGORIES.SCHOLARSHIP;

    const auditId = uuidv4();
    const creatorToken = generateCreatorToken();
    const creatorTokenHash = hashToken(creatorToken);
    const now = Date.now();

    const newAudit = {
      id: auditId,
      creatorTokenHash,
      category: catConfig.id,
      applicantName: applicantName?.trim() || 'Applicant',
      applicationNumber: applicationNumber?.trim() || '',
      createdAt: new Date().toISOString(),
      createdAtTimestamp: now,
      lastAccessedAt: now,
      documents: [],
      report: null,
    };

    auditStore.set(auditId, newAudit);

    // Return sanitized audit plus the single-issue creatorToken for the creator's browser storage
    res.status(201).json({
      ...sanitizeAudit(newAudit),
      creatorToken,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audits/:id/demo
 * Load synthetic demo benchmark into this visitor's isolated session
 */
router.post('/audits/:id/demo', requireAuditOwnership, (req, res) => {
  try {
    const audit = req.audit;
    const demoData = SYNTHETIC_DEMO_CASES.RAHUL_SHARMA;

    audit.applicantName = demoData.applicantName;
    audit.category = demoData.category;
    // Deep clone documents so each visitor has an isolated instance
    audit.documents = JSON.parse(JSON.stringify(demoData.documents));

    // Automatically perform audit verification
    audit.report = performAuditVerification(audit);
    audit.lastAccessedAt = Date.now();

    auditStore.set(audit.id, audit);
    res.json(sanitizeAudit(audit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audits/:id/upload
 * Upload document(s) with strict MIME, extension, and magic byte validation
 */
router.post('/audits/:id/upload', requireAuditOwnership, upload.array('documents', 10), async (req, res) => {
  try {
    const audit = req.audit;
    const docCategory = req.body.docCategory || 'IDENTITY_PROOF';
    const uploadedFiles = req.files || [];

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No files provided.' });
    }

    const processedDocs = [];

    for (const file of uploadedFiles) {
      // Validate magic bytes to prevent forged extensions / MIME spoofing
      const isSignatureValid = validateFileSignature(file.path, file.mimetype);
      if (!isSignatureValid) {
        // Immediately unlink the rejected file
        try { fs.unlinkSync(file.path); } catch (e) {}
        return res.status(400).json({
          error: `File signature verification failed for "${file.originalname}". The actual file content does not match its claimed format (${file.mimetype}).`,
        });
      }

      const docId = uuidv4();
      
      // Process file through OCR / PDF extraction
      const { rawText, extractedData } = await processDocumentFile(file, docCategory);

      const docRecord = {
        id: docId,
        filename: file.originalname,
        storedName: file.filename,
        path: file.path,
        mimeType: file.mimetype,
        size: file.size,
        docCategory,
        uploadedAt: new Date().toISOString(),
        rawText,
        extractedData,
        isUserVerified: false,
      };

      audit.documents.push(docRecord);
      processedDocs.push(docRecord);
    }

    // Invalidate report until re-verification
    audit.report = null;
    audit.lastAccessedAt = Date.now();
    auditStore.set(audit.id, audit);

    res.json({
      message: `${processedDocs.length} document(s) uploaded and parsed.`,
      documents: audit.documents.map(sanitizeDocument),
      newDocuments: processedDocs.map(sanitizeDocument),
    });
  } catch (err) {
    console.error('Upload handling error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/audits/:id/documents/:docId
 * User review and manual correction of extracted details
 */
router.put('/audits/:id/documents/:docId', requireAuditOwnership, (req, res) => {
  try {
    const audit = req.audit;
    const doc = audit.documents.find(d => d.id === req.params.docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found in audit.' });
    }

    const {
      candidateName,
      dateOfBirth,
      documentNumber,
      issueDate,
      expiryDate,
      authority,
      docCategory,
    } = req.body;

    if (docCategory) {
      doc.docCategory = docCategory;
    }

    const wasOriginallyReadable = doc.extractedData?.isReadable !== false;
    doc.extractedData = {
      ...doc.extractedData,
      candidateName: candidateName !== undefined ? candidateName : doc.extractedData?.candidateName,
      dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : doc.extractedData?.dateOfBirth,
      documentNumber: documentNumber !== undefined ? documentNumber : doc.extractedData?.documentNumber,
      issueDate: issueDate !== undefined ? issueDate : doc.extractedData?.issueDate,
      expiryDate: expiryDate !== undefined ? expiryDate : doc.extractedData?.expiryDate,
      authority: authority !== undefined ? authority : doc.extractedData?.authority,
      // Record manual user intervention without falsifying whether the physical scan itself was readable
      isReadable: wasOriginallyReadable,
      isUserSupplied: true,
      scanWasReadable: wasOriginallyReadable,
    };

    doc.isUserVerified = true;
    audit.report = null;
    audit.lastAccessedAt = Date.now();
    auditStore.set(audit.id, audit);

    res.json({
      message: 'Document details updated and verified by user.',
      document: sanitizeDocument(doc),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/audits/:id/documents/:docId
 * Remove a specific document and its physical disk file
 */
router.delete('/audits/:id/documents/:docId', requireAuditOwnership, (req, res) => {
  try {
    const audit = req.audit;
    const docIndex = audit.documents.findIndex(d => d.id === req.params.docId);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const doc = audit.documents[docIndex];
    if (doc.path && fs.existsSync(doc.path)) {
      try {
        fs.unlinkSync(doc.path);
      } catch (e) {
        console.error('Failed to unlink file:', e.message);
      }
    }

    audit.documents.splice(docIndex, 1);
    audit.report = null;
    audit.lastAccessedAt = Date.now();
    auditStore.set(audit.id, audit);

    res.json({
      message: 'Document removed.',
      documents: audit.documents.map(sanitizeDocument),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audits/:id/verify
 * Execute cross-document verification engine
 */
router.post('/audits/:id/verify', requireAuditOwnership, (req, res) => {
  try {
    const audit = req.audit;
    const report = performAuditVerification(audit);
    audit.report = report;
    audit.lastAccessedAt = Date.now();
    auditStore.set(audit.id, audit);

    res.json({
      auditId: audit.id,
      report,
    });
  } catch (err) {
    console.error('Audit verification execution error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audits/:id
 * Retrieve full audit details (sanitized, requires creator token)
 */
router.get('/audits/:id', requireAuditOwnership, (req, res) => {
  res.json(sanitizeAudit(req.audit));
});

/**
 * DELETE /api/audits/:id
 * Delete audit session and permanently remove all uploaded files
 */
router.delete('/audits/:id', requireAuditOwnership, (req, res) => {
  try {
    const auditId = req.params.id;
    const audit = req.audit;

    // Remove upload folder
    const auditDir = path.join(uploadsBaseDir, auditId);
    if (fs.existsSync(auditDir)) {
      fs.rmSync(auditDir, { recursive: true, force: true });
    }

    // Also remove any individually stored paths
    if (audit?.documents) {
      for (const doc of audit.documents) {
        if (doc.path && fs.existsSync(doc.path)) {
          try {
            fs.unlinkSync(doc.path);
          } catch (e) {}
        }
      }
    }

    auditStore.delete(auditId);

    res.json({
      success: true,
      message: `Audit session ${auditId} and all associated temporary files have been permanently wiped.`,
    });
  } catch (err) {
    console.error('Delete audit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.auditStore = auditStore;
module.exports.AUDIT_TTL_MS = AUDIT_TTL_MS;
module.exports.cleanupExpiredAudits = cleanupExpiredAudits;
module.exports.cleanupOrphanUploads = cleanupOrphanUploads;
