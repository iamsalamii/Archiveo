import { apiClient } from './api-client';

export interface DocumentSignatureApi {
  id: string;
  documentId: string;
  documentTitle: string;
  documentReference: string;
  requestedByUserId?: string;
  requestedByUserName: string;
  signerUserId?: string;
  signerName: string;
  signerEmail: string;
  signerPhone?: string;
  signerRole?: string;
  status: 'pending' | 'signed' | 'rejected';
  signatureType?: 'drawing' | 'text' | 'image';
  signatureDataUrl?: string;
  requestedAt: string;
  signedAt?: string;
  dueDate?: string;
  sha256Hash?: string;
  certificateNumber?: string;
  signerIpAddress?: string;
  rejectReason?: string;
  notificationChannel: 'email' | 'whatsapp' | 'both';
  whatsAppDirectLink?: string;
}

export interface CreateSignaturePayload {
  documentId: string;
  documentTitle: string;
  documentReference?: string;
  signerUserId?: string;
  signerName: string;
  signerEmail: string;
  signerPhone?: string;
  signerRole?: string;
  dueDate?: string;
  notificationChannel?: 'email' | 'whatsapp' | 'both';
  note?: string;
}

export interface SignDocumentPayload {
  signatureType: 'drawing' | 'text' | 'image';
  signatureDataUrl: string;
  securityPin?: string;
}

export interface SignatureCertificateApi {
  signatureId: string;
  certificateNumber: string;
  documentTitle: string;
  documentReference: string;
  signerName: string;
  signerEmail: string;
  signerPhone?: string;
  signedAt: string;
  sha256Hash: string;
  ipAddress: string;
  algorithm: string;
  status: string;
  issuer: string;
}

export async function fetchPendingSignatures(): Promise<DocumentSignatureApi[]> {
  try {
    return await apiClient.get<DocumentSignatureApi[]>('/api/signatures/pending');
  } catch (err) {
    console.warn('fetchPendingSignatures fallback', err);
    return [];
  }
}

export async function fetchRequestedSignatures(): Promise<DocumentSignatureApi[]> {
  try {
    return await apiClient.get<DocumentSignatureApi[]>('/api/signatures/requested');
  } catch (err) {
    console.warn('fetchRequestedSignatures fallback', err);
    return [];
  }
}

export async function fetchAllSignatures(): Promise<DocumentSignatureApi[]> {
  try {
    return await apiClient.get<DocumentSignatureApi[]>('/api/signatures');
  } catch (err) {
    console.warn('fetchAllSignatures fallback', err);
    return [];
  }
}

export async function fetchDocumentSignatures(documentId: string): Promise<DocumentSignatureApi[]> {
  try {
    return await apiClient.get<DocumentSignatureApi[]>(`/api/signatures/document/${documentId}`);
  } catch (err) {
    console.warn('fetchDocumentSignatures fallback', err);
    return [];
  }
}

export async function requestSignature(payload: CreateSignaturePayload): Promise<DocumentSignatureApi> {
  const body: Record<string, unknown> = {
    documentId: payload.documentId,
    documentTitle: payload.documentTitle,
    documentReference: payload.documentReference,
    signerName: payload.signerName,
    signerEmail: payload.signerEmail,
    signerPhone: payload.signerPhone || null,
    signerRole: payload.signerRole || null,
    notificationChannel: payload.notificationChannel || 'both',
    note: payload.note || null,
  };

  if (payload.signerUserId && payload.signerUserId.trim() !== '') {
    body.signerUserId = payload.signerUserId;
  }
  if (payload.dueDate && payload.dueDate.trim() !== '') {
    body.dueDate = new Date(payload.dueDate).toISOString();
  }

  return apiClient.post<DocumentSignatureApi>('/api/signatures/request', body);
}

export async function signDocument(id: string, payload: SignDocumentPayload): Promise<DocumentSignatureApi> {
  return apiClient.post<DocumentSignatureApi>(`/api/signatures/${id}/sign`, payload);
}

export async function rejectSignature(id: string, reason: string): Promise<DocumentSignatureApi> {
  return apiClient.post<DocumentSignatureApi>(`/api/signatures/${id}/reject`, { reason });
}

export async function fetchSignatureCertificate(id: string): Promise<SignatureCertificateApi> {
  return apiClient.get<SignatureCertificateApi>(`/api/signatures/${id}/certificate`);
}
