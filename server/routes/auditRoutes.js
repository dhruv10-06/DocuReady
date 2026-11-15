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

// In-memory audit storage (for hackathon demo / privacy-preserving transient store)
const auditStore = new Map();

// Multer storage configuration for temporary files
const uploadsBaseDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsBaseDir)) {
  fs.mkdirSync(uploadsBaseDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const auditId = req.params.id || 'default';
    const auditDir = path.join(uploadsBaseDir, auditId);
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    cb(null, auditDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype) || /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload PDF, JPG, or PNG files only.'));
    }
  },
});

/**
 * GET /api/categories
 * List application categories & document types
 */
router.get('/categories', (req, res) => {
  res.json({
    categories: Object.values(APPLICATION_CATEGORIES),
    documentTypes: DOCUMENT_CATEGORIES,
  });
});

/**
 * GET /api/sample-docs
 * List pre-generated synthetic files
 */
router.get('/sample-docs', (req, res) => {
  const sampleDir = path.join(__dirname, '..', 'public', 'sample-docs');
  let files = [];
  if (fs.existsSync(sampleDir)) {
    files = fs.readdirSync(sampleDir).map(filename => ({
      filename,
      url: `/sample-docs/${filename}`,
    }));
  }
  res.json({
    scenario: 'Rahul Sharma Synthetic Benchmark',
    description: 'Pre-configured documents demonstrating name variation (Rahul S. Sharma vs Rahul Sharma), DOB mismatch (2004 vs 2005), and missing Application Form.',
    files,
  });
});

/**
 * GET /api/audits
 * List all current audits (Dashboard)
 */
router.get('/audits', (req, res) => {
  const list = Array.from(auditStore.values()).map(a => ({
    id: a.id,
    applicantName: a.applicantName,
    category: a.category,
    createdAt: a.createdAt,
    documentsCount: a.documents.length,
    status: a.report?.overallStatus || 'IN_PROGRESS',
    statusBadgeText: a.report?.statusBadgeText || 'IN PROGRESS',
    statusColor: a.report?.statusColor || 'blue',
    readinessScore: a.report?.readinessScore ?? null,
  }));
  res.json(list);
});

/**
 * POST /api/audits
 * Create new audit session
 */
router.post('/audits', (req, res) => {
  try {
    const { category, applicantName, applicationNumber } = req.body;
    const catConfig = APPLICATION_CATEGORIES[category] || APPLICATION_CATEGORIES.SCHOLARSHIP;

    const auditId = uuidv4();
    const newAudit = {
      id: auditId,
      category: catConfig.id,
      applicantName: applicantName?.trim() || 'Applicant',
      applicationNumber: applicationNumber?.trim() || '',
      createdAt: new Date().toISOString(),
      documents: [],
      report: null,
    };

    auditStore.set(auditId, newAudit);
    res.status(201).json(newAudit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audits/:id/demo
 * Load synthetic demo case into audit session
 */
router.post('/audits/:id/demo', (req, res) => {
  try {
    const audit = auditStore.get(req.params.id);
    if (!audit) {
      return res.status(404).json({ error: 'Audit session not found.' });
    }

    const demoData = SYNTHETIC_DEMO_CASES.RAHUL_SHARMA;
    audit.applicantName = demoData.applicantName;
    audit.category = demoData.category;
    // Deep clone documents
    audit.documents = JSON.parse(JSON.stringify(demoData.documents));

    // Automatically perform audit verification
    audit.report = performAuditVerification(audit);

    auditStore.set(audit.id, audit);
    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audits/:id/upload
 * Upload document(s) and run extraction
 */
router.post('/audits/:id/upload', upload.array('documents', 10), async (req, res) => {
  try {
    const audit = auditStore.get(req.params.id);
    if (!audit) {
      return res.status(404).json({ error: 'Audit session not found.' });
    }

    const docCategory = req.body.docCategory || 'IDENTITY_PROOF';
    const uploadedFiles = req.files || [];

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No files provided.' });
    }

    const processedDocs = [];

    for (const file of uploadedFiles) {
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
    auditStore.set(audit.id, audit);

    res.json({
      message: `${processedDocs.length} document(s) uploaded and parsed.`,
      documents: audit.documents,
      newDocuments: processedDocs,
    });
  } catch (err) {
    console.error('Upload handling error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/audits/:id/documents/:docId
 * User review and manual correction of extracted details
 */
router.put('/audits/:id/documents/:docId', (req, res) => {
  try {
    const audit = auditStore.get(req.params.id);
    if (!audit) {
      return res.status(404).json({ error: 'Audit session not found.' });
    }

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

    doc.extractedData = {
      ...doc.extractedData,
      candidateName: candidateName !== undefined ? candidateName : doc.extractedData.candidateName,
      dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : doc.extractedData.dateOfBirth,
      documentNumber: documentNumber !== undefined ? documentNumber : doc.extractedData.documentNumber,
      issueDate: issueDate !== undefined ? issueDate : doc.extractedData.issueDate,
      expiryDate: expiryDate !== undefined ? expiryDate : doc.extractedData.expiryDate,
      authority: authority !== undefined ? authority : doc.extractedData.authority,
      isReadable: true, // User manual intervention makes it readable
    };

    doc.isUserVerified = true;

    // Reset report since data changed
    audit.report = null;
    auditStore.set(audit.id, audit);

    res.json({
      message: 'Document details updated and verified by user.',
      document: doc,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/audits/:id/documents/:docId
 * Remove a specific document
 */
router.delete('/api/audits/:id/documents/:docId', (req, res) => {
  try {
    const audit = auditStore.get(req.params.id);
    if (!audit) {
      return res.status(404).json({ error: 'Audit session not found.' });
    }

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
    auditStore.set(audit.id, audit);

    res.json({ message: 'Document removed.', documents: audit.documents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/audits/:id/verify
 * Execute cross-document verification and generate audit report
 */
router.post('/audits/:id/verify', (req, res) => {
  try {
    const audit = auditStore.get(req.params.id);
    if (!audit) {
      return res.status(404).json({ error: 'Audit session not found.' });
    }

    const report = performAuditVerification(audit);
    audit.report = report;
    auditStore.set(audit.id, audit);

    res.json({
      auditId: audit.id,
      report,
    });
  } catch (err) {
    console.error('Audit verification execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audits/:id
 * Retrieve full audit details
 */
router.get('/audits/:id', (req, res) => {
  const audit = auditStore.get(req.params.id);
  if (!audit) {
    return res.status(404).json({ error: 'Audit session not found.' });
  }
  res.json(audit);
});

/**
 * DELETE /api/audits/:id
 * Delete audit session and permanently remove all uploaded files
 */
router.delete('/audits/:id', (req, res) => {
  try {
    const auditId = req.params.id;
    const audit = auditStore.get(auditId);

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
    console.error('Delete audit error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

