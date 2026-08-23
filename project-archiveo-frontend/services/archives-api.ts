import { apiClient } from './api-client';

export interface ArchiveApi {
    id: string;
    reference: string;
    title: string;
    description?: string;
    documentId?: string;
    typeId: string;
    categoryId: string;
    serviceId?: string;
    departmentId?: string;
    status: string;
    archivedAt: string;
    retentionDate?: string;
    finalSort?: string;
    destructionReason?: string;
    destroyedAt?: string;
    siteId?: string;
    locationId?: string;
    boxReference?: string;
    shelfReference?: string;
    createdBy: string;
    createdAt: string;
    isActive: boolean;
}

export interface CreateArchivePayload {
    title: string;
    description?: string;
    documentId?: string;
    typeId: string;
    categoryId: string;
    serviceId?: string;
    departmentId?: string;
    retentionDate?: string;
    siteId?: string;
    locationId?: string;
    boxReference?: string;
    shelfReference?: string;
}

export interface UpdateArchivePayload {
    title: string;
    description?: string;
    typeId: string;
    categoryId: string;
    serviceId?: string;
    departmentId?: string;
    retentionDate?: string;
    siteId?: string;
    locationId?: string;
    boxReference?: string;
    shelfReference?: string;
}

export interface TransitionArchivePayload {
    newStatus: string;
    destructionReason?: string;
}

export async function fetchArchives(): Promise<ArchiveApi[]> {
    return apiClient.get<ArchiveApi[]>('/api/archives');
}

export async function fetchArchive(id: string): Promise<ArchiveApi> {
    return apiClient.get<ArchiveApi>(`/api/archives/${id}`);
}

export async function createArchive(data: CreateArchivePayload): Promise<ArchiveApi> {
    return apiClient.post<ArchiveApi>('/api/archives', data);
}

export async function updateArchive(id: string, data: UpdateArchivePayload): Promise<ArchiveApi> {
    return apiClient.put<ArchiveApi>(`/api/archives/${id}`, data);
}

export async function transitionArchive(id: string, data: TransitionArchivePayload): Promise<ArchiveApi> {
    return apiClient.post<ArchiveApi>(`/api/archives/${id}/transition`, data);
}

export async function deleteArchive(id: string): Promise<void> {
    await apiClient.delete(`/api/archives/${id}`);
}