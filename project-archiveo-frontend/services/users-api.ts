import { apiClient } from './api-client';

export interface UserApi {
    id: string;
    userName: string;
    email: string;
    firstName: string;
    lastName: string;
    function?: string;
    matricule?: string;
    serviceId?: string;
    phone?: string;
    mustChangePassword: boolean;
    roles: string[];
    createdAt: string;
    isActive: boolean;
    temporaryPassword?: string;
}

export interface CreateUserPayload {
    userName: string;
    email: string;
    firstName: string;
    lastName: string;
    function?: string;
    matricule?: string;
    serviceId?: string;
    phone?: string;
    password?: string;
    roles: string[];
}

export interface UpdateUserPayload {
    userName: string;
    email: string;
    firstName: string;
    lastName: string;
    function?: string;
    matricule?: string;
    serviceId?: string;
    phone?: string;
}

export interface RoleApi {
    name: string;
}

export async function fetchUsers(): Promise<UserApi[]> {
    return apiClient.get<UserApi[]>('/api/users');
}

export async function fetchUser(id: string): Promise<UserApi> {
    return apiClient.get<UserApi>(`/api/users/${id}`);
}

export async function createUser(data: CreateUserPayload): Promise<UserApi> {
    return apiClient.post<UserApi>('/api/users', data);
}

export async function updateUser(id: string, data: UpdateUserPayload): Promise<UserApi> {
    return apiClient.put<UserApi>(`/api/users/${id}`, data);
}

export async function deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/api/users/${id}`);
}

export async function assignRoles(id: string, roles: string[]): Promise<UserApi> {
    return apiClient.put<UserApi>(`/api/users/${id}/roles`, { roles });
}

export async function resetPassword(id: string, newPassword: string): Promise<void> {
    await apiClient.post(`/api/users/${id}/reset-password`, { newPassword });
}

export async function fetchRoles(): Promise<RoleApi[]> {
    return apiClient.get<RoleApi[]>('/api/roles');
}