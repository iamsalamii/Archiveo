import { apiClient } from './api-client';

export interface PermissionApi {
    id: string;
    code: string;
    name: string;
    module: string;
    description?: string;
    order: number;
}

export interface RoleDetailApi {
    id: string;
    name: string;
    permissions: PermissionApi[];
}

export interface PermissionMatrixApi {
    allPermissions: PermissionApi[];
    roles: RoleDetailApi[];
}

export interface CreateRolePayload {
    name: string;
}

export interface AssignPermissionsPayload {
    permissionIds: string[];
}

export async function fetchPermissionMatrix(): Promise<PermissionMatrixApi> {
    return apiClient.get<PermissionMatrixApi>('/api/roles-management/matrix');
}

export async function createRole(data: CreateRolePayload): Promise<void> {
    await apiClient.post('/api/roles-management', data);
}

export async function deleteRole(roleId: string): Promise<void> {
    await apiClient.delete(`/api/roles-management/${roleId}`);
}

export async function assignPermissions(roleId: string, data: AssignPermissionsPayload): Promise<void> {
    await apiClient.put(`/api/roles-management/${roleId}/permissions`, data);
}