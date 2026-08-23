// ============================================================
// Domain Types - GED Application
// Designed to map 1:1 with a future ASP.NET Core C# API.
// ============================================================

// ---------- Parameters (the heart of the system) ----------
export interface ParameterItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  order: number;
  active?: boolean;
  parentId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ParameterGroup {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  items: ParameterItem[];
}

// ---------- Documents ----------
export interface DocumentVersion {
  version: number;
  date: string;
  author: string;
  comment: string;
  size: number;
}

export interface DocumentComment {
  id: string;
  author: string;
  date: string;
  content: string;
}

export interface DocumentRelation {
  id: string;
  documentId: string;
  documentTitle: string;
  relationType: string;
}

export interface DocumentAttachment {
  id: string;
  name: string;
  size: number;
  format: string;
  uploadedAt: string;
}

export interface AuditEntry {
  id: string;
  date: string;
  user: string;
  action: string;
  before?: string;
  after?: string;
  ip: string;
  browser: string;
}

export interface GedDocument {
  id: string;
  reference: string;
  title: string;
  description: string;
  // Classification (all from parameters)
  typeId: string;
  categoryId: string;
  subCategoryId?: string;
  serviceId?: string;
  directionId?: string;
  departmentId?: string;
  // Metadata
  languageId: string;
  formatId: string;
  supportId: string;
  confidentialityId: string;
  securityLevelId: string;
  statusId: string;
  physicalStateId?: string;
  // Lifecycle
  archiveTypeId?: string;
  retentionId?: string;
  finalSortId?: string;
  classificationId?: string;
  priorityId?: string;
  // Location
  locationId?: string;
  siteId?: string;
  agencyId?: string;
  // Dates
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  expiresAt?: string;
  // People
  authorId?: string;
  producerId?: string;
  ownerId?: string;
  // Tags & keywords
  tags: string[];
  keywords: string[];
  // Versioning
  currentVersion: number;
  versions: DocumentVersion[];
  // Rich data
  comments: DocumentComment[];
  relations: DocumentRelation[];
  attachments: DocumentAttachment[];
  auditLog: AuditEntry[];
  // Workflow
  workflowState?: string;
  validated?: boolean;
  validatedBy?: string;
  validatedAt?: string;
}

// ---------- Archives ----------
export interface ArchiveRecord {
  id: string;
  reference: string;
  documentId: string;
  documentTitle: string;
  archiveTypeId: string;
  locationId?: string;
  boxReference?: string;
  enteredAt: string;
  exitedAt?: string;
  status: 'in' | 'out' | 'destroyed' | 'transferred';
  retentionId: string;
  finalSortId?: string;
  destructionDate?: string;
  destructionReasonId?: string;
  digitized?: boolean;
}

// ---------- Users ----------
export interface UserAccount {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  signature?: string;
  function: string;
  serviceId?: string;
  directionId?: string;
  profileId: string;
  roleId: string;
  active: boolean;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  permissions: string[];
}

// ---------- Workflow ----------
export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  validatorRole: string;
  status: 'pending' | 'approved' | 'rejected';
  date?: string;
  comment?: string;
}

export interface Workflow {
  id: string;
  name: string;
  documentId: string;
  steps: WorkflowStep[];
  currentStep: number;
  status: 'in_progress' | 'completed' | 'rejected';
}

// ---------- Notifications ----------
export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  date: string;
  read: boolean;
  category: string;
}

// ---------- Activity / Audit ----------
export interface ActivityLog {
  id: string;
  date: string;
  user: string;
  action: string;
  target: string;
  ip: string;
  browser: string;
  details?: string;
  before?: string;
  after?: string;
}

// ---------- Saved searches ----------
export interface SavedSearch {
  id: string;
  name: string;
  criteria: Record<string, unknown>;
  createdAt: string;
  favorite: boolean;
}

// ---------- Loans ----------
export interface LoanRecord {
  id: string;
  documentId: string;
  documentTitle: string;
  userId: string;
  userName: string;
  loanTypeId: string;
  reasonId: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string;
  status: 'active' | 'returned' | 'overdue';
}

// ---------- Correspondence ----------
export interface Correspondence {
  id: string;
  reference: string;
  type: 'incoming' | 'outgoing' | 'internal';
  subject: string;
  senderId: string;
  recipientId: string;
  date: string;
  documentId?: string;
  signatureTypeId: string;
}

// ---------- Organization settings ----------
export interface OrganizationSettings {
  logo?: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  timezone: string;
  country: string;
  currency: string;
  defaultLanguage: string;
  dateFormat: string;
  timeFormat: string;
}

// ---------- App settings ----------
export interface AppSettings {
  appName: string;
  version: string;
  logo?: string;
  favicon?: string;
  primaryColor: string;
  typography: string;
  animationsEnabled: boolean;
  compactMode: boolean;
  expandedSidebar: boolean;
}

// ---------- Generic table helpers ----------
export type SortDirection = 'asc' | 'desc';
export interface ColumnConfig<T> {
  key: keyof T;
  label: string;
  visible: boolean;
  sortable: boolean;
  width?: string;
}
