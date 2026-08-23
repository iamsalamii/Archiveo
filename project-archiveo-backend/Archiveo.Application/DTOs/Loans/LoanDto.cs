using System;

namespace Archiveo.Application.DTOs.Loans;

public class LoanDto
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public string? DocumentTitle { get; set; }
    public string BorrowerName { get; set; } = string.Empty;
    public string BorrowerEmail { get; set; } = string.Empty;
    public string? LoanTypeId { get; set; }
    public string? ReasonId { get; set; }
    public DateTime BorrowDate { get; set; }
    public DateTime DueDate { get; set; }
    public DateTime? ReturnDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Location { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateLoanRequest
{
    public Guid DocumentId { get; set; }
    public string BorrowerName { get; set; } = string.Empty;
    public string BorrowerEmail { get; set; } = string.Empty;
    public string? LoanTypeId { get; set; }
    public string? ReasonId { get; set; }
    public DateTime DueDate { get; set; }
    public string? Location { get; set; }
}

public class ConsultationDto
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public string? DocumentTitle { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? ConsultationTypeId { get; set; }
    public DateTime ConsultationDate { get; set; }
    public string? Duration { get; set; }
    public string? Location { get; set; }
    public bool IsActive { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateConsultationRequest
{
    public Guid DocumentId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? ConsultationTypeId { get; set; }
    public string? Duration { get; set; }
    public string? Location { get; set; }
}

public class UpdateLoanRequest
{
    public string BorrowerName { get; set; } = string.Empty;
    public string BorrowerEmail { get; set; } = string.Empty;
    public string? LoanTypeId { get; set; }
    public string? ReasonId { get; set; }
    public DateTime DueDate { get; set; }
    public string? Location { get; set; }
}

public class UpdateConsultationRequest
{
    public string UserName { get; set; } = string.Empty;
    public string? ConsultationTypeId { get; set; }
    public DateTime ConsultationDate { get; set; }
    public string? Duration { get; set; }
    public string? Location { get; set; }
}