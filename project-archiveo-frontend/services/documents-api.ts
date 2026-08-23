import { apiClient, tokenService, API_BASE_URL } from './api-client';

export interface DocumentApi {
  id: string;
  reference: string;
  title: string;
  description?: string;
  typeId: string;
  categoryId: string;
  subCategoryId?: string;
  serviceId: string;
  statusId: string;
  confidentialityId?: string;
  languageId?: string;
  fileName?: string;
  fileSize: number;
  mimeType?: string;
  version: number;
  validated: boolean;
  validatedAt?: string;
  expiresAt?: string;
  retentionYears: number;
  tags?: string;
  keywords?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  isArchived: boolean;
}

export interface CreateDocumentPayload {
  title: string;
  description?: string;
  typeId: string;
  categoryId: string;
  subCategoryId?: string;
  serviceId: string;
  confidentialityId?: string;
  languageId?: string;
  expiresAt?: string;
  retentionYears: number;
  tags?: string;
  keywords?: string;
}

export async function fetchDocuments(): Promise<DocumentApi[]> {
  return apiClient.get<DocumentApi[]>('/api/documents');
}

export async function fetchDocument(id: string): Promise<DocumentApi> {
  return apiClient.get<DocumentApi>(`/api/documents/${id}`);
}

export async function createDocument(data: CreateDocumentPayload, file?: File): Promise<DocumentApi> {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, String(value));
    }
  });
  if (file) formData.append('file', file);

  const token = tokenService.get();
  const response = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${response.status}`);
  }
  return response.json();
}

export async function updateDocument(id: string, data: Partial<CreateDocumentPayload> & { statusId?: string }): Promise<DocumentApi> {
  return apiClient.put<DocumentApi>(`/api/documents/${id}`, data);
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/api/documents/${id}`);
}

export async function validateDocument(id: string): Promise<DocumentApi> {
  return apiClient.post<DocumentApi>(`/api/documents/${id}/validate`);
}

export async function downloadDocument(id: string, fallbackName = 'document') {
  const token = tokenService.get();
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Téléchargement impossible');

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const disposition = response.headers.get('content-disposition');
  let filename = fallbackName;
  if (disposition) {
    const m = disposition.match(/filename="?([^"]+)"?/);
    if (m) filename = m[1];
  }
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchDocumentVersions(id: string) {
  return apiClient.get<Array<{
    id: string;
    version: number;
    parentVersionId?: string;
    title: string;
    fileName?: string;
    fileSize: number;
    mimeType?: string;
    createdBy: string;
    createdAt: string;
  }>>(`/api/documents/${id}/versions`);
}

export async function archiveDocument(id: string): Promise<DocumentApi> {
  return apiClient.post<DocumentApi>(`/api/documents/${id}/archive`);
}

export async function unarchiveDocument(id: string): Promise<DocumentApi> {
  return apiClient.post<DocumentApi>(`/api/documents/${id}/unarchive`);
}

export async function createDocumentVersion(
  id: string,
  data: CreateDocumentPayload,
  file?: File
): Promise<DocumentApi> {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') formData.append(key, String(value));
  });
  if (file) formData.append('file', file);

  const token = tokenService.get();
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}/versions`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!response.ok) throw new Error('Création de version impossible');
  return response.json();
}