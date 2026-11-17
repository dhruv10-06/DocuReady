// server/services/securityService.js

const crypto = require('crypto');
const fs = require('fs');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generate a cryptographically secure random creator token (256-bit entropy)
 */
function generateCreatorToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a creator token with SHA-256 for secure in-memory storage
 */
function hashToken(token) {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Validate that an audit ID conforms to the standard UUID v4 format
 */
function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

/**
 * Inspect file header magic bytes to verify actual content type matches claimed extension/MIME
 */
function validateFileSignature(filePath, mimeType) {
  if (!fs.existsSync(filePath)) return false;

  const buffer = Buffer.alloc(8);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buffer, 0, 8, 0);
  } finally {
    fs.closeSync(fd);
  }

  // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
  if (mimeType === 'application/pdf') {
    return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  }

  // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }

  // JPEG / JPG magic bytes: 0xFF 0xD8 0xFF
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }

  return false;
}

/**
 * Strip server-side filesystem paths and storage names from document objects
 */
function sanitizeDocument(doc) {
  if (!doc) return null;
  const { path: diskPath, storedName, ...safeDoc } = doc;
  return safeDoc;
}

/**
 * Sanitize an audit session record for API output
 * Ensures creatorTokenHash and internal filesystem paths are never returned
 */
function sanitizeAudit(audit) {
  if (!audit) return null;
  const { creatorTokenHash, ...safeAudit } = audit;
  return {
    ...safeAudit,
    documents: (safeAudit.documents || []).map(sanitizeDocument),
  };
}

module.exports = {
  generateCreatorToken,
  hashToken,
  isValidUUID,
  validateFileSignature,
  sanitizeDocument,
  sanitizeAudit,
  UUID_REGEX,
};
