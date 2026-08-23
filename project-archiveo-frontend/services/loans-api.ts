import { apiClient } from './api-client';

export interface LoanApi {
    id: string;
    reference: string;
    documentId: string;
    documentTitle?: string;
    borrowerName: string;
    borrowerEmail: string;
    loanTypeId?: string;
    reasonId?: string;
    borrowDate: string;
    dueDate: string;
    returnDate?: string;
    status: string;
    location?: string;
    createdAt: string;
    isActive: boolean;
    updatedBy?: string;
    updatedAt?: string;
}

export interface CreateLoanPayload {
    documentId: string;
    borrowerName: string;
    borrowerEmail: string;
    loanTypeId?: string;
    reasonId?: string;
    dueDate: string;
    location?: string;
}

export interface ConsultationApi {
    id: string;
    reference: string;
    documentId: string;
    documentTitle?: string;
    userName: string;
    consultationTypeId?: string;
    consultationDate: string;
    duration?: string;
    location?: string;
    isActive: boolean;
    updatedBy?: string;
    updatedAt?: string;
}

export interface CreateConsultationPayload {
    documentId: string;
    userName: string;
    consultationTypeId?: string;
    duration?: string;
    location?: string;
}

export async function fetchLoans(): Promise<LoanApi[]> {
    return apiClient.get<LoanApi[]>('/api/loans');
}

export async function createLoan(data: CreateLoanPayload): Promise<LoanApi> {
    return apiClient.post<LoanApi>('/api/loans', data);
}

export async function returnLoan(id: string): Promise<LoanApi> {
    return apiClient.post<LoanApi>(`/api/loans/${id}/return`);
}

export async function renewLoan(id: string, days = 7): Promise<LoanApi> {
    return apiClient.post<LoanApi>(`/api/loans/${id}/renew?days=${days}`);
}

export async function fetchConsultations(): Promise<ConsultationApi[]> {
    return apiClient.get<ConsultationApi[]>('/api/loans/consultations');
}

export async function createConsultation(data: CreateConsultationPayload): Promise<ConsultationApi> {
    return apiClient.post<ConsultationApi>('/api/loans/consultations', data);
}

export interface UpdateLoanPayload extends Omit<CreateLoanPayload, 'documentId'> {}

export interface UpdateConsultationPayload {
    userName: string;
    consultationTypeId?: string;
    consultationDate: string;
    duration?: string;
    location?: string;
}

export async function fetchLoan(id: string): Promise<LoanApi> {
    return apiClient.get<LoanApi>(`/api/loans/${id}`);
}

export async function updateLoan(id: string, data: UpdateLoanPayload): Promise<LoanApi> {
    return apiClient.put<LoanApi>(`/api/loans/${id}`, data);
}

export async function deleteLoan(id: string): Promise<void> {
    await apiClient.delete(`/api/loans/${id}`);
}

export async function fetchConsultation(id: string): Promise<ConsultationApi> {
    return apiClient.get<ConsultationApi>(`/api/loans/consultations/${id}`);
}

export async function updateConsultation(id: string, data: UpdateConsultationPayload): Promise<ConsultationApi> {
    return apiClient.put<ConsultationApi>(`/api/loans/consultations/${id}`, data);
}

export async function deleteConsultation(id: string): Promise<void> {
    await apiClient.delete(`/api/loans/consultations/${id}`);
}