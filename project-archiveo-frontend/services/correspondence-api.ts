import { apiClient } from './api-client';

export interface CorrespondenceApi {
  id: string;
  reference: string;
  type: 'incoming' | 'outgoing' | 'internal';
  subject: string;
  senderId: string;
  recipientId: string;
  date: string;
  documentId?: string;
  documentTitle?: string;
  signatureTypeId: string;
  notes?: string;
  createdAt: string;
  isActive: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface CreateCorrespondencePayload {
  type: 'incoming' | 'outgoing' | 'internal';
  subject: string;
  senderId: string;
  recipientId: string;
  date?: string;
  documentId?: string;
  signatureTypeId: string;
  notes?: string;
}

export interface UpdateCorrespondencePayload extends CreateCorrespondencePayload {}

export async function fetchCorrespondences(type?: string): Promise<CorrespondenceApi[]> {
  const url = type && type !== 'all' ? `/api/correspondences?type=${type}` : '/api/correspondences';
  return apiClient.get<CorrespondenceApi[]>(url);
}

export async function fetchCorrespondence(id: string): Promise<CorrespondenceApi> {
  return apiClient.get<CorrespondenceApi>(`/api/correspondences/${id}`);
}

export async function createCorrespondence(data: CreateCorrespondencePayload): Promise<CorrespondenceApi> {
  return apiClient.post<CorrespondenceApi>('/api/correspondences', data);
}

export async function updateCorrespondence(id: string, data: UpdateCorrespondencePayload): Promise<CorrespondenceApi> {
  return apiClient.put<CorrespondenceApi>(`/api/correspondences/${id}`, data);
}

export async function deleteCorrespondence(id: string): Promise<void> {
  await apiClient.delete(`/api/correspondences/${id}`);
}
