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

// Dedicated sample document download endpoint: sets Content-Disposition: attachment for reliable cross-origin downloads
app.get('/sample-docs/download/:filename', (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(__dirname, 'public', 'sample-docs', safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Sample document not found' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.download(filePath, safeFilename);
});

// Dedicated sample document preview endpoint: sets Content-Disposition: inline to open in a new tab
app.get('/sample-docs/preview/:filename', (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(__dirname, 'public', 'sample-docs', safeFilename);
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
