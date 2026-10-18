import {
  apiClient,
  tokenService,
  API_BASE_URL,
  downloadBinary,
  getDownloadErrorMessage,
  ApiDownloadError,
  isApiDownloadError,
  SessionAbortedError,
} from './api-client';

export { getDownloadErrorMessage, ApiDownloadError, isApiDownloadError, SessionAbortedError };

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

export interface DocumentSearchRequest {
  query?: string;
  typeId?: string;
  categoryId?: string;
  subCategoryId?: string;
  serviceId?: string;
  statusId?: string;
  confidentialityId?: string;
  languageId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export async function searchDocuments(
  params: DocumentSearchRequest = {},
  signal?: AbortSignal
): Promise<PagedResult<DocumentApi>> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.set('query', params.query);
  if (params.typeId && params.typeId !== '__all__') queryParams.set('typeId', params.typeId);
  if (params.categoryId && params.categoryId !== '__all__') queryParams.set('categoryId', params.categoryId);
  if (params.subCategoryId && params.subCategoryId !== '__all__') queryParams.set('subCategoryId', params.subCategoryId);
  if (params.serviceId && params.serviceId !== '__all__') queryParams.set('serviceId', params.serviceId);
  if (params.statusId && params.statusId !== '__all__') queryParams.set('statusId', params.statusId);
  if (params.confidentialityId && params.confidentialityId !== '__all__') queryParams.set('confidentialityId', params.confidentialityId);
  if (params.languageId && params.languageId !== '__all__') queryParams.set('languageId', params.languageId);
  if (params.page !== undefined && params.page !== null) queryParams.set('page', String(params.page));
  if (params.pageSize !== undefined && params.pageSize !== null) queryParams.set('pageSize', String(params.pageSize));
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.sortDirection) queryParams.set('sortDirection', params.sortDirection);

  const qs = queryParams.toString();
  const endpoint = qs ? `/api/documents/search?${qs}` : '/api/documents/search';
  return apiClient.get<PagedResult<DocumentApi>>(endpoint, { signal });
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
  if (!token) {
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  const response = await fetch(`${API_BASE_URL}/api/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      tokenService.remove(true);
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${response.status}`);
  }

  // Protection stricte contre réinjection par réponse tardive si déconnexion pendant l'envoi
  if (tokenService.get() !== token) {
    throw new SessionAbortedError();
  }

  apiClient.invalidateCache('/api/documents');
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

export async function downloadDocument(
  id: string,
  fallbackName = 'document',
  signal?: AbortSignal
): Promise<void> {
  const { blob, filename } = await downloadBinary(`/api/documents/${id}/download`, {
    fallbackFilename: fallbackName,
    signal,
  });

  if (typeof window !== 'undefined') {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
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
  if (!token) {
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  const response = await fetch(`${API_BASE_URL}/api/documents/${id}/versions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    if (response.status === 401) {
      tokenService.remove(true);
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Création de version impossible');
  }

  // Protection contre réponse tardive
  if (tokenService.get() !== token) {
    throw new SessionAbortedError();
  }

  apiClient.invalidateCache('/api/documents');
  return response.json();
}