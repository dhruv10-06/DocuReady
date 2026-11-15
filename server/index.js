// server/index.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const auditRoutes = require('./routes/auditRoutes');
const { ensureSampleFiles } = require('./services/sampleFileGenerator');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for client
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure public sample directory exists and generate demo files
ensureSampleFiles();

// Serve static demo sample files
app.use('/sample-docs', express.static(path.join(__dirname, 'public', 'sample-docs')));

// Mount API routes
app.use('/api', auditRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An internal server error occurred.',
  });
});

app.listen(PORT, () => {
  console.log(`DocuReady Backend Server running on http://localhost:${PORT}`);
});
