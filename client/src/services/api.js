// client/src/services/api.js

// Robust API and Backend URL normalization for Vercel/Railway deployments
const RAW_API = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

export const API_BASE = !RAW_API
  ? '/api'
  : (RAW_API.endsWith('/api') ? RAW_API : `${RAW_API}/api`);

export const BACKEND_BASE = !RAW_API
  ? ''
  : RAW_API.replace(/\/api$/, '');

/**
 * Resolve static sample document URL (points to deployed backend in production, or relative in local dev)
 */
export function getSampleDocUrl(relativePath) {
  const clean = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return BACKEND_BASE ? `${BACKEND_BASE}${clean}` : clean;
}

/**
 * Resolve explicit attachment download URL for cross-domain download without page navigation
 */
export function getSampleDocDownloadUrl(filename) {
  const clean = filename.startsWith('/') ? filename.slice(1) : filename;
  const fileOnly = clean.replace(/^(?:api\/)?sample-docs\/(?:download\/|preview\/)?/, '');
  return getSampleDocUrl(`/sample-docs/download/${fileOnly}`);
}

/**
 * Resolve inline preview URL to view in a separate tab without disturbing audit wizard
 */
export function getSampleDocPreviewUrl(filename) {
  const clean = filename.startsWith('/') ? filename.slice(1) : filename;
  const fileOnly = clean.replace(/^(?:api\/)?sample-docs\/(?:download\/|preview\/)?/, '');
  return getSampleDocUrl(`/sample-docs/preview/${fileOnly}`);
}
const STORAGE_KEY = 'docuready_owned_audits';
const ACTIVE_AUDIT_KEY = 'docuready_active_audit_id';
const STEP_KEY_PREFIX = 'docuready_audit_step_';
const STEP1_DRAFT_KEY = 'docuready_draft_step1';

/**
 * Retrieve the list of audits created and owned by this browser session
 */
export function getOwnedAudits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Store a newly created audit ID and its private creator token in this browser session
 */
export function saveOwnedAudit(id, token) {
  if (!id || !token) return;
  try {
    const existing = getOwnedAudits().filter(a => a.id !== id);
    existing.unshift({ id, token, savedAt: Date.now() });
    // Keep max 50 recent audits
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
  } catch {}
}

/**
 * Remove an audit from the local session index when deleted
 */
export function removeOwnedAudit(id) {
  try {
    const existing = getOwnedAudits().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {}
}

/**
 * Get the creator token for a specific audit from browser session storage
 */
export function getAuditToken(id) {
  const match = getOwnedAudits().find(a => a.id === id);
  return match ? match.token : null;
}

/**
 * Active in-progress audit session tracking across page refreshes and navigation
 */
export function getActiveAuditId() {
  try {
    const activeId = sessionStorage.getItem(ACTIVE_AUDIT_KEY);
    if (activeId && getAuditToken(activeId)) {
      return activeId;
    }
    return null;
  } catch {
    return null;
  }
}

export function setActiveAuditId(id) {
  if (!id) return;
  try {
    sessionStorage.setItem(ACTIVE_AUDIT_KEY, id);
  } catch {}
}

export function clearActiveAuditId() {
  try {
    sessionStorage.removeItem(ACTIVE_AUDIT_KEY);
  } catch {}
}

/**
 * Audit wizard step persistence per audit session
 */
export function saveAuditStep(auditId, step) {
  if (!auditId || !step) return;
  try {
    sessionStorage.setItem(`${STEP_KEY_PREFIX}${auditId}`, String(step));
  } catch {}
}

export function getAuditStep(auditId) {
  if (!auditId) return null;
  try {
    const val = sessionStorage.getItem(`${STEP_KEY_PREFIX}${auditId}`);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

export function clearAuditStep(auditId) {
  if (!auditId) return;
  try {
    sessionStorage.removeItem(`${STEP_KEY_PREFIX}${auditId}`);
  } catch {}
}

/**
 * Step 1 unsubmitted draft persistence
 */
export function saveStep1Draft(draft) {
  if (!draft) return;
  try {
    sessionStorage.setItem(STEP1_DRAFT_KEY, JSON.stringify(draft));
  } catch {}
}

export function getStep1Draft() {
  try {
    const raw = sessionStorage.getItem(STEP1_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStep1Draft() {
  try {
    sessionStorage.removeItem(STEP1_DRAFT_KEY);
  } catch {}
}

/**
 * Inject the X-Audit-Token header for authenticated requests
 */
function getAuthHeaders(auditId, extraHeaders = {}) {
  const token = getAuditToken(auditId);
  const headers = { ...extraHeaders };
  if (token) {
    headers['X-Audit-Token'] = token;
  }
  return headers;
}

/**
 * Helper to process JSON response and extract clean server error message
 */
async function handleResponse(res, fallbackMessage) {
  if (res.ok) {
    return res.json();
  }

  let errorMessage = fallbackMessage;
  try {
    const errorData = await res.json();
    if (errorData && typeof errorData.error === 'string' && errorData.error.trim()) {
      errorMessage = errorData.error.trim();
    }
  } catch {
    if (res.status === 401) {
      errorMessage = 'Authorization required: You must be the creator of this audit session.';
    } else if (res.status === 403) {
      errorMessage = 'Access denied: You do not have permission to view or modify this audit.';
    } else if (res.status === 404) {
      errorMessage = 'Requested audit session was not found on the server.';
    } else if (res.status >= 500) {
      errorMessage = 'Server error encountered. Please ensure the DocuReady backend is online.';
    }
  }

  throw new Error(errorMessage);
}

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  return handleResponse(res, 'Failed to load application categories.');
}

export async function fetchSampleDocs() {
  const res = await fetch(`${API_BASE}/sample-docs`);
  return handleResponse(res, 'Failed to load sample demonstration documents.');
}

/**
 * Retrieve only audits owned by this visitor
 */
export async function fetchAudits() {
  const owned = getOwnedAudits();
  if (!owned.length) return [];

  const res = await fetch(`${API_BASE}/audits/my-audits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audits: owned }),
  });
  const validAudits = await handleResponse(res, 'Failed to load audit records.');

  // Synchronize localStorage: prune entries that have expired or been deleted from server
  if (Array.isArray(validAudits)) {
    const validIdSet = new Set(validAudits.map(a => a.id));
    const pruned = owned.filter(a => validIdSet.has(a.id));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    } catch {}
  }

  return validAudits;
}

/**
 * Create a new audit session and record its creator token locally
 */
export async function createAudit(payload) {
  const res = await fetch(`${API_BASE}/audits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res, 'Failed to create audit session.');
  if (data && data.id) {
    const token = data.creatorToken || `session-${data.id}-${Date.now()}`;
    saveOwnedAudit(data.id, token);
    setActiveAuditId(data.id);
  }
  return data;
}

export async function loadDemoCase(auditId) {
  const res = await fetch(`${API_BASE}/audits/${auditId}/demo`, {
    method: 'POST',
    headers: getAuthHeaders(auditId, { 'Content-Type': 'application/json' }),
  });
  return handleResponse(res, 'Failed to load demo scenario.');
}

export async function uploadDocuments(auditId, files, docCategory) {
  const formData = new FormData();
  formData.append('docCategory', docCategory);
  for (const file of files) {
    formData.append('documents', file);
  }

  const res = await fetch(`${API_BASE}/audits/${auditId}/upload`, {
    method: 'POST',
    headers: getAuthHeaders(auditId),
    body: formData,
  });
  return handleResponse(res, 'Failed to upload document.');
}

export async function updateDocumentDetails(auditId, docId, updatedFields) {
  const res = await fetch(`${API_BASE}/audits/${auditId}/documents/${docId}`, {
    method: 'PUT',
    headers: getAuthHeaders(auditId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(updatedFields),
  });
  return handleResponse(res, 'Failed to update document details.');
}

export async function deleteDocument(auditId, docId) {
  const res = await fetch(`${API_BASE}/audits/${auditId}/documents/${docId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(auditId),
  });
  return handleResponse(res, 'Failed to delete document.');
}

export async function verifyAudit(auditId) {
  const res = await fetch(`${API_BASE}/audits/${auditId}/verify`, {
    method: 'POST',
    headers: getAuthHeaders(auditId, { 'Content-Type': 'application/json' }),
  });
  return handleResponse(res, 'Failed to run verification engine.');
}

export async function fetchAuditDetails(auditId) {
  const res = await fetch(`${API_BASE}/audits/${auditId}`, {
    headers: getAuthHeaders(auditId),
  });
  return handleResponse(res, 'Failed to fetch audit details.');
}

export async function deleteAudit(auditId) {
  const res = await fetch(`${API_BASE}/audits/${auditId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(auditId),
  });
  const data = await handleResponse(res, 'Failed to wipe audit files.');
  removeOwnedAudit(auditId);
  clearAuditStep(auditId);
  if (getActiveAuditId() === auditId) {
    clearActiveAuditId();
  }
  return data;
}
