// server/index.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const auditRoutes = require('./routes/auditRoutes');
const { cleanupOrphanUploads } = require('./routes/auditRoutes');
const { ensureSampleFiles } = require('./services/sampleFileGenerator');

const app = express();
const PORT = process.env.PORT || 5000;

// Configurable CORS protection
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim().replace(/\/+$/, ''))
  : [
      'http://localhost:5173',
      'http://localhost:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5000',
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Permit local scripts, curl, same-origin, or whitelisted frontend origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Automatically permit Vercel preview subdomains if a vercel.app domain is configured in allowedOrigins
    const isVercelOrigin = origin.endsWith('.vercel.app') && allowedOrigins.some(o => o.includes('vercel.app'));
    if (isVercelOrigin) {
      return callback(null, true);
    }
    return callback(new Error('Cross-Origin Request Blocked: Origin not permitted by DocuReady CORS policy.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Audit-Token'],
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure public sample directory exists and generate demo files
ensureSampleFiles();

// Startup cleanup: Purge any orphaned upload directories left from previous process crashes
cleanupOrphanUploads();

const SAMPLE_ALIASES = {
  'sample-aadhaar.pdf': 'Synthetic_Aadhaar_Rahul_Sharma.pdf',
  'sample-aadhaar.png': 'Synthetic_Aadhaar_Rahul_Sharma.png',
  'sample-aadhaar.jpg': 'Synthetic_Aadhaar_Rahul_Sharma.jpg',
  'sample-marksheet.pdf': 'Synthetic_Class_XII_Marksheet_Rahul.pdf',
  'sample-marksheet.png': 'Synthetic_Class_XII_Marksheet_Rahul.png',
  'sample-marksheet.jpg': 'Synthetic_Class_XII_Marksheet_Rahul.jpg',
  'sample-income-certificate.pdf': 'Synthetic_Income_Certificate_Rahul.pdf',
  'sample-income-certificate.png': 'Synthetic_Income_Certificate_Rahul.png',
  'sample-income-certificate.jpg': 'Synthetic_Income_Certificate_Rahul.jpg',
  'Synthetic_Aadhaar_Rahul_Sharma.pdf': 'sample-aadhaar.pdf',
  'Synthetic_Aadhaar_Rahul_Sharma.png': 'sample-aadhaar.png',
  'Synthetic_Aadhaar_Rahul_Sharma.jpg': 'sample-aadhaar.jpg',
  'Synthetic_Class_XII_Marksheet_Rahul.pdf': 'sample-marksheet.pdf',
  'Synthetic_Class_XII_Marksheet_Rahul.png': 'sample-marksheet.png',
  'Synthetic_Class_XII_Marksheet_Rahul.jpg': 'sample-marksheet.jpg',
  'Synthetic_Income_Certificate_Rahul.pdf': 'sample-income-certificate.pdf',
  'Synthetic_Income_Certificate_Rahul.png': 'sample-income-certificate.png',
  'Synthetic_Income_Certificate_Rahul.jpg': 'sample-income-certificate.jpg',
};

function resolveSampleDoc(filename, baseDir) {
  const safeFilename = path.basename(filename);
  const directPath = path.join(baseDir, safeFilename);
  if (fs.existsSync(directPath)) {
    return { filePath: directPath, clientFilename: safeFilename };
  }
  const aliasName = SAMPLE_ALIASES[safeFilename];
  if (aliasName) {
    const aliasPath = path.join(baseDir, aliasName);
    if (fs.existsSync(aliasPath)) {
      return { filePath: aliasPath, clientFilename: safeFilename };
    }
  }
  return null;
}

function getSampleMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

// Dedicated sample document download endpoint: sets Content-Disposition: attachment for reliable cross-origin downloads
app.get('/sample-docs/download/:filename', (req, res) => {
  const sampleDir = path.join(__dirname, 'public', 'sample-docs');
  const resolved = resolveSampleDoc(req.params.filename, sampleDir);
  if (!resolved) {
    return res.status(404).json({ error: 'Sample document not found' });
  }
  const contentType = getSampleMimeType(resolved.clientFilename);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${resolved.clientFilename}"`);
  return fs.createReadStream(resolved.filePath).pipe(res);
});

// Dedicated sample document preview endpoint: sets Content-Disposition: inline to open in a new tab
app.get('/sample-docs/preview/:filename', (req, res) => {
  const sampleDir = path.join(__dirname, 'public', 'sample-docs');
  const resolved = resolveSampleDoc(req.params.filename, sampleDir);
  if (!resolved) {
    return res.status(404).json({ error: 'Sample document not found' });
  }
  const contentType = getSampleMimeType(resolved.clientFilename);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${resolved.clientFilename}"`);
  return fs.createReadStream(resolved.filePath).pipe(res);
});

// Serve static demo sample files
app.use('/sample-docs', express.static(path.join(__dirname, 'public', 'sample-docs')));

// Mount API routes
app.use('/api', auditRoutes);

// Health check endpoints (supports both /health and /api/health for Railway / cloud probes)
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'OK',
    service: 'DocuReady Pre-Submission Auditing API',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend build if client/dist exists
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/sample-docs')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Error handling middleware (sanitizes internal file paths and stack traces)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.message || err);
  const safeMessage = typeof err.message === 'string'
    ? err.message.replace(/([a-zA-Z]:\\[^"'\n\r]+|\/[a-zA-Z0-9_\-\/]+)/g, '[internal path]')
    : 'An internal server error occurred.';
  res.status(err.status || 500).json({
    error: safeMessage,
  });
});

// Bind to 0.0.0.0 for containerized platforms like Railway
app.listen(PORT, '0.0.0.0', () => {
  console.log(`DocuReady Backend Server running on port ${PORT}`);
});
