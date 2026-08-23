import { apiClient } from './api-client';

export interface WorkflowStepApi {
  id: string;
  order: number;
  name: string;
  validatorRole: string;
  status: 'pending' | 'approved' | 'rejected';
  actionDate?: string;
  comment?: string;
  validatedByUserId?: string;
  validatedByUserName?: string;
}

export interface WorkflowApi {
  id: string;
  name: string;
  documentId: string;
  documentTitle?: string;
  currentStep: number;
  status: 'in_progress' | 'completed' | 'rejected';
  steps: WorkflowStepApi[];
  createdAt: string;
  completedAt?: string;
  isActive: boolean;
}

export interface CreateWorkflowStepPayload {
  order: number;
  name: string;
  validatorRole: string;
}

export interface CreateWorkflowPayload {
  name: string;
  documentId: string;
  steps: CreateWorkflowStepPayload[];
}

export interface ProcessWorkflowStepPayload {
  action: 'approved' | 'rejected';
  comment?: string;
}

export async function fetchWorkflows(): Promise<WorkflowApi[]> {
  return apiClient.get<WorkflowApi[]>('/api/workflows');
}

export async function fetchWorkflow(id: string): Promise<WorkflowApi> {
  return apiClient.get<WorkflowApi>(`/api/workflows/${id}`);
}

export async function fetchWorkflowByDocument(documentId: string): Promise<WorkflowApi> {
  return apiClient.get<WorkflowApi>(`/api/workflows/document/${documentId}`);
}

export async function createWorkflow(data: CreateWorkflowPayload): Promise<WorkflowApi> {
  return apiClient.post<WorkflowApi>('/api/workflows', data);
}

export async function processWorkflowStep(
  workflowId: string,
  stepId: string,
  data: ProcessWorkflowStepPayload
): Promise<WorkflowApi> {
  return apiClient.post<WorkflowApi>(`/api/workflows/${workflowId}/steps/${stepId}/process`, data);
}

export async function deleteWorkflow(id: string): Promise<void> {
  await apiClient.delete(`/api/workflows/${id}`);
}
