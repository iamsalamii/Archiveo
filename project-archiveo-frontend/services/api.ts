import { apiClient, API_BASE_URL } from './api-client';
import { archives, correspondences, documents, loans, users, activityLog, workflows } from '@/mock/data';
import type {
  ActivityLog,
  AppSettings,
  ArchiveRecord,
  Correspondence,
  GedDocument,
  LoanRecord,
  OrganizationSettings,
  UserAccount,
  Workflow,
  AppNotification,
} from '@/types';
import type { DocumentApi } from './documents-api';
import type { ArchiveApi } from './archives-api';
import type { LoanApi, ConsultationApi } from './loans-api';
import type { UserApi } from './users-api';
import type { AuditLogApi } from './audit-api';

export interface ParameterGroupApi {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  isActive: boolean;
  items: ParameterItemApi[];
}

export interface ParameterItemApi {
  id: string;
  groupCode: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  parentId?: string | null;
}

export interface DashboardDocument {
  id: string;
  title: string;
  typeId: string;  
  categoryId: string; 
  statusId: string; 
  serviceId?: string;  
  size: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  validated: boolean;  
  expiresAt?: string;  
}

export interface DashboardArchive {
  id: string;
  reference: string;
  title: string;
  typeId: string;  
  retentionDate: string;
  status: string;
  location: string;
}

export interface ActivityLogEntry {
  id: string;
  user: string;  
  action: string;
  target: string;
  targetType: string;
  date: string;  
  ip: string; 
  browser: string;  
}

export interface DashboardUser {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  function: string;
  role: string;
  lastLogin: string;
  isActive: boolean;
}

export interface DashboardLoan {
  id: string;
  documentTitle: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'active' | 'overdue' | 'returned' | 'renewed';  
  reason: string;
  location: string;
}

export interface DashboardConsultation {
  id: string;
  documentTitle: string;
  userName: string;
  consultationDate: string;
  duration: string;
  type: 'PHYSICAL' | 'DIGITAL';
  location: string;
}

export interface UpdateParameterItemPayload {
  code: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order: number;
  parentId?: string | null;
}

// -------------------------------------------------------------
// Parameters API
// -------------------------------------------------------------
export async function getParameterGroups(): Promise<ParameterGroupApi[]> {
  return apiClient.get<ParameterGroupApi[]>('/api/parameters/groups');
}

export async function getParameterItems(groupCode: string): Promise<ParameterItemApi[]> {
  return apiClient.get<ParameterItemApi[]>(`/api/parameters/groups/${groupCode}/items`);
}

export async function saveParameterGroup(group: Partial<ParameterGroupApi>): Promise<ParameterGroupApi> {
  return apiClient.post<ParameterGroupApi>('/api/parameters/groups', group);
}

export async function saveParameterItem(
  groupCode: string,
  item: Partial<ParameterItemApi>
): Promise<ParameterItemApi> {
  return apiClient.post<ParameterItemApi>(`/api/parameters/groups/${groupCode}/items`, item);
}

export async function updateParameterItem(
  groupCode: string,
  itemId: string,
  data: UpdateParameterItemPayload
): Promise<ParameterItemApi> {
  return apiClient.put<ParameterItemApi>(
    `/api/parameters/groups/${groupCode}/items/${itemId}`,
    data
  );
}

export async function deleteParameterItem(groupCode: string, itemId: string): Promise<void> {
  await apiClient.delete(`/api/parameters/groups/${groupCode}/items/${itemId}`);
}

// -------------------------------------------------------------
// Entity Mappers
// -------------------------------------------------------------
export function mapDocumentApiToGedDocument(d: DocumentApi): GedDocument {
  return {
    id: d.id,
    reference: d.reference,
    title: d.title,
    description: d.description || '',
    typeId: d.typeId,
    categoryId: d.categoryId,
    subCategoryId: d.subCategoryId,
    serviceId: d.serviceId,
    languageId: d.languageId || 'FR',
    formatId: d.mimeType ? (d.mimeType.includes('pdf') ? 'PDF' : d.mimeType.includes('image') ? 'IMAGE' : 'AUTRE') : 'PDF',
    supportId: 'NUMERIQUE',
    confidentialityId: d.confidentialityId || 'INTERNE',
    securityLevelId: 'SEC_MED',
    statusId: d.statusId || (d.validated ? 'VALIDE' : 'BROUILLON'),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt || d.createdAt,
    expiresAt: d.expiresAt,
    tags: d.tags ? d.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
    keywords: d.keywords ? d.keywords.split(',').map((s) => s.trim()).filter(Boolean) : [],
    currentVersion: d.version || 1,
    versions: [
      {
        version: d.version || 1,
        date: d.createdAt,
        author: d.createdByName || d.createdBy || 'Utilisateur',
        comment: 'Version actuelle',
        size: d.fileSize || 0,
      },
    ],
    comments: [],
    relations: [],
    attachments: d.fileName
      ? [
          {
            id: `att-${d.id}`,
            name: d.fileName,
            size: d.fileSize || 0,
            format: d.mimeType || 'application/octet-stream',
            uploadedAt: d.createdAt,
          },
        ]
      : [],
    auditLog: [
      {
        id: `aud-${d.id}`,
        date: d.createdAt,
        user: d.createdByName || 'Utilisateur',
        action: 'Création',
        ip: '127.0.0.1',
        browser: 'Archivéo Web',
      },
    ],
    validated: d.validated,
    validatedAt: d.validatedAt,
    validatedBy: d.createdByName,
    workflowState: d.isArchived ? 'Archivé' : d.validated ? 'Validé' : 'Brouillon',
  };
}

export function mapArchiveApiToArchiveRecord(a: ArchiveApi): ArchiveRecord {
  const statusMap: Record<string, 'in' | 'out' | 'destroyed' | 'transferred'> = {
    DESTROYED: 'destroyed',
    FINAL: 'transferred',
    INTERMEDIATE: 'out',
    CURRENT: 'in',
  };

  return {
    id: a.id,
    reference: a.reference,
    documentId: a.documentId || '',
    documentTitle: a.title,
    archiveTypeId: a.typeId,
    locationId: a.locationId,
    boxReference: a.boxReference,
    enteredAt: a.archivedAt || a.createdAt,
    status: statusMap[a.status] || 'in',
    retentionId: a.retentionDate || 'RET_10',
    finalSortId: a.finalSort,
    destructionDate: a.destroyedAt,
    destructionReasonId: a.destructionReason,
    digitized: true,
  };
}

export function mapAuditLogApiToActivityLog(a: AuditLogApi): ActivityLog {
  return {
    id: a.id,
    date: a.timestamp,
    user: a.userName,
    action: a.action,
    target: a.target || a.targetType || 'Système',
    ip: a.ipAddress || '127.0.0.1',
    browser: a.targetType || 'Navigateur Web',
  };
}

export function mapUserApiToUserAccount(u: UserApi): UserAccount {
  return {
    id: u.id,
    matricule: u.matricule || u.userName,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    function: u.function || (u.roles?.[0] ?? 'Utilisateur'),
    serviceId: u.serviceId,
    profileId: u.roles?.[0] || 'USER',
    roleId: u.roles?.[0] || 'USER',
    active: u.isActive,
    mustChangePassword: u.mustChangePassword,
    twoFactorEnabled: false,
    createdAt: u.createdAt,
    permissions: [],
  };
}

export function mapLoanApiToLoanRecord(l: LoanApi): LoanRecord {
  const statusMap: Record<string, 'active' | 'returned' | 'overdue'> = {
    active: 'active',
    renewed: 'active',
    overdue: 'overdue',
    returned: 'returned',
  };

  return {
    id: l.id,
    documentId: l.documentId,
    documentTitle: l.documentTitle || 'Document',
    userId: l.borrowerEmail,
    userName: l.borrowerName,
    loanTypeId: l.loanTypeId || 'LOAN_CONSULTATION',
    reasonId: l.reasonId || 'REASON_PROJ',
    borrowedAt: l.borrowDate,
    dueAt: l.dueDate,
    returnedAt: l.returnDate,
    status: statusMap[l.status] || 'active',
  };
}

// -------------------------------------------------------------
// Documents API
// -------------------------------------------------------------
export async function getDocuments(): Promise<GedDocument[]> {
  try {
    const data = await apiClient.get<DocumentApi[]>('/api/documents');
    return data.map(mapDocumentApiToGedDocument);
  } catch (error) {
    console.error('getDocuments error, using fallback:', error);
    return documents;
  }
}

export async function getDocument(id: string): Promise<GedDocument | undefined> {
  try {
    const doc = await apiClient.get<DocumentApi>(`/api/documents/${id}`);
    const versions = await apiClient
      .get<Array<{ id: string; version: number; title: string; fileName?: string; fileSize: number; mimeType?: string; createdBy: string; createdAt: string }>>(`/api/documents/${id}/versions`)
      .catch(() => []);

    const mapped = mapDocumentApiToGedDocument(doc);
    if (versions && versions.length > 0) {
      mapped.versions = versions.map((v) => ({
        version: v.version,
        date: v.createdAt,
        author: v.createdBy,
        comment: v.title || `Version ${v.version}`,
        size: v.fileSize || 0,
      }));
      mapped.currentVersion = Math.max(...versions.map((v) => v.version));
    }
    return mapped;
  } catch (error) {
    console.error(`getDocument(${id}) error, using fallback:`, error);
    return documents.find((document) => document.id === id);
  }
}

export async function saveDocument(document: GedDocument): Promise<GedDocument> {
  try {
    if (document.id && document.id.trim() !== '') {
      const updated = await apiClient.put<DocumentApi>(`/api/documents/${document.id}`, {
        title: document.title,
        description: document.description,
        typeId: document.typeId,
        categoryId: document.categoryId,
        subCategoryId: document.subCategoryId,
        serviceId: document.serviceId || 'DG',
        confidentialityId: document.confidentialityId,
        languageId: document.languageId,
        statusId: document.statusId,
        tags: Array.isArray(document.tags) ? document.tags.join(',') : document.tags,
        keywords: Array.isArray(document.keywords) ? document.keywords.join(',') : document.keywords,
      });
      return mapDocumentApiToGedDocument(updated);
    } else {
      const created = await apiClient.post<DocumentApi>('/api/documents', {
        title: document.title,
        description: document.description,
        typeId: document.typeId,
        categoryId: document.categoryId,
        subCategoryId: document.subCategoryId,
        serviceId: document.serviceId || 'DG',
        confidentialityId: document.confidentialityId,
        languageId: document.languageId,
        tags: Array.isArray(document.tags) ? document.tags.join(',') : document.tags,
        keywords: Array.isArray(document.keywords) ? document.keywords.join(',') : document.keywords,
      });
      return mapDocumentApiToGedDocument(created);
    }
  } catch (error) {
    console.error('saveDocument error, returning local doc:', error);
    return document;
  }
}

// -------------------------------------------------------------
// Archives API
// -------------------------------------------------------------
export async function getArchives(): Promise<ArchiveRecord[]> {
  try {
    const data = await apiClient.get<ArchiveApi[]>('/api/archives');
    return data.map(mapArchiveApiToArchiveRecord);
  } catch (error) {
    console.error('getArchives error, using fallback:', error);
    return archives;
  }
}

// -------------------------------------------------------------
// Audit / Activity API
// -------------------------------------------------------------
export async function getActivityLog(): Promise<ActivityLog[]> {
  try {
    const data = await apiClient.get<AuditLogApi[]>('/api/audit?limit=200');
    return data.map(mapAuditLogApiToActivityLog);
  } catch (error) {
    console.error('getActivityLog error, using fallback:', error);
    return activityLog;
  }
}

// -------------------------------------------------------------
// Users API
// -------------------------------------------------------------
export async function getUsers(): Promise<UserAccount[]> {
  try {
    const data = await apiClient.get<UserApi[]>('/api/users');
    return data.map(mapUserApiToUserAccount);
  } catch (error) {
    console.error('getUsers error, using fallback:', error);
    return users;
  }
}

// -------------------------------------------------------------
// Loans API
// -------------------------------------------------------------
export async function getLoans(): Promise<LoanRecord[]> {
  try {
    const data = await apiClient.get<LoanApi[]>('/api/loans');
    return data.map(mapLoanApiToLoanRecord);
  } catch (error) {
    console.error('getLoans error, using fallback:', error);
    return loans;
  }
}

export async function getConsultations(): Promise<ConsultationApi[]> {
  try {
    return await apiClient.get<ConsultationApi[]>('/api/loans/consultations');
  } catch (error) {
    console.error('getConsultations error:', error);
    return [];
  }
}

// -------------------------------------------------------------
// Correspondence / Workflows / Notifications / Settings
// -------------------------------------------------------------
export async function getCorrespondences(): Promise<Correspondence[]> {
  try {
    const list = await apiClient.get<Array<{
      id: string;
      reference: string;
      type: 'incoming' | 'outgoing' | 'internal';
      subject: string;
      senderId: string;
      recipientId: string;
      date: string;
      documentId?: string;
      signatureTypeId: string;
      notes?: string;
    }>>('/api/correspondences');

    return list.map((c) => ({
      id: c.id,
      reference: c.reference,
      type: c.type,
      subject: c.subject,
      senderId: c.senderId,
      recipientId: c.recipientId,
      date: c.date,
      documentId: c.documentId,
      signatureTypeId: c.signatureTypeId,
      notes: c.notes,
    }));
  } catch (error) {
    console.error('getCorrespondences error, using fallback:', error);
    return correspondences;
  }
}

export async function getWorkflows(): Promise<Workflow[]> {
  try {
    const list = await apiClient.get<Array<{
      id: string;
      name: string;
      documentId: string;
      currentStep: number;
      status: 'in_progress' | 'completed' | 'rejected';
      steps: Array<{
        id: string;
        order: number;
        name: string;
        validatorRole: string;
        status: 'pending' | 'approved' | 'rejected';
        actionDate?: string;
        comment?: string;
      }>;
    }>>('/api/workflows');

    return list.map((w) => ({
      id: w.id,
      name: w.name,
      documentId: w.documentId,
      currentStep: w.currentStep,
      status: w.status,
      steps: w.steps.map((s) => ({
        id: s.id,
        order: s.order,
        name: s.name,
        validatorRole: s.validatorRole,
        status: s.status,
        date: s.actionDate,
        comment: s.comment,
      })),
    }));
  } catch (error) {
    console.error('getWorkflows error, using fallback:', error);
    return workflows;
  }
}

export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('archiveo_org_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
  }
  return {
    name: 'Archivéo SA',
    address: '10 Avenue de la République, 75011 Paris',
    phone: '+33 1 23 45 67 89',
    email: 'contact@archiveo.fr',
    website: 'https://archiveo.fr',
    timezone: 'Europe/Paris',
    country: 'FR',
    currency: 'EUR',
    defaultLanguage: 'fr',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
  };
}

export async function saveOrganizationSettings(settings: OrganizationSettings): Promise<OrganizationSettings> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('archiveo_org_settings', JSON.stringify(settings));
  }
  return settings;
}

export async function getAppSettings(): Promise<AppSettings> {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('archiveo_app_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
  }
  return {
    appName: 'Archivéo',
    version: '1.0.0',
    primaryColor: '#3b82f6',
    typography: 'Inter',
    animationsEnabled: true,
    compactMode: false,
    expandedSidebar: true,
  };
}

export async function saveAppSettings(settings: AppSettings): Promise<AppSettings> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('archiveo_app_settings', JSON.stringify(settings));
  }
  return settings;
}

export async function getNotifications(): Promise<AppNotification[]> {
  // Récupère les notifications de l'utilisateur courant (limite 50)
  const data = await apiClient.get<AppNotification[]>('/api/notifications?limit=50');
  // Le backend renvoie les dates au format ISO, on les conserve comme string
  return data;
}

export const api = {
  getParameterGroups,
  getParameterItems,
  saveParameterGroup,
  saveParameterItem,
  updateParameterItem,
  deleteParameterItem,
  getDocuments,
  getDocument,
  saveDocument,
  getArchives,
  getActivityLog,
  getUsers,
  getLoans,
  getCorrespondences,
  getWorkflows,
  getOrganizationSettings,
  saveOrganizationSettings,
  getAppSettings,
  saveAppSettings,
  getConsultations,
  getNotifications,
  getSettings: async () => ({}),
  saveSettings: async () => {},
};