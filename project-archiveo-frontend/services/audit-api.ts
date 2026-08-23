import { apiClient } from './api-client';

export interface AuditLogApi {
    id: string;
    userName: string;
    action: string;
    target: string;
    targetType: string;
    statusCode: number;
    ipAddress: string;
    timestamp: string;
}

export async function fetchAuditLogs(limit = 200): Promise<AuditLogApi[]> {
    return apiClient.get<AuditLogApi[]>(`/api/audit?limit=${limit}`);
}