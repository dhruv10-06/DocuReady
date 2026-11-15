// client/src/services/api.js

const API_BASE = '/api';

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error('Failed to load categories');
  return res.json();
}

export async function fetchSampleDocs() {
  const res = await fetch(`${API_BASE}/sample-docs`);
  if (!res.ok) throw new Error('Failed to load sample docs');
  return res.json();
}

export async function fetchAudits() {
  const res = await fetch(`${API_BASE}/audits`);
  if (!res.ok) throw new Error('Failed to load audits');
  return res.json();
}

export async function createAudit(payload) {
  const res = await fetch(`${API_BASE}/audits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create audit session');
  return res.json();
}

export async function loadDemoCase(auditId) {
  const res = await fetch(`${API_BASE}/audits/${auditId}/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to load demo scenario');
  return res.json();
}

export async function uploadDocuments(auditId, files, docCategory) {
  const formData = new FormData();
  formData.append('docCategory', docCategory);
  for (const file of files) {
    formData.append('documents', file);
  }

  const res = await fetch(`${API_BASE}/audits/${auditId}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload document');
  }
  return res.json();
}

export async function updateDocumentDetails(auditId, docId, updatedFields) {
  const res = await fetch(`${API_BASE}/audits/${auditId}/documents/${docId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedFields),
  });
  if (!res.ok) throw new Error('Failed to update document details');
  return res.json();
}

export async function deleteDocument(auditId, docId) {
  const res = await fetch(`${API_BASE}/audits/${auditId}/documents/${docId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}

export async function verifyAudit(auditId) {
  const res = await fetch(`${API_BASE}/audits/${auditId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to run verification engine');
  return res.json();
}

export async function fetchAuditDetails(auditId) {
  const res = await fetch(`${API_BASE}/audits/${auditId}`);
  if (!res.ok) throw new Error('Failed to fetch audit details');
  return res.json();
}

export async function deleteAudit(auditId) {
  const res = await fetch(`${API_BASE}/audits/${auditId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to wipe audit files');
  return res.json();
}

