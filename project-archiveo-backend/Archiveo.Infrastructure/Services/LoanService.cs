using Archiveo.Application.DTOs.Loans;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Services;

public class LoanService
{
    private readonly ApplicationDbContext _dbContext;

    public LoanService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<LoanDto>> GetAllLoansAsync()
    {
        var loans = await _dbContext.LoanRecords
            .AsNoTracking()
            .Include(l => l.Document)
            .Where(l => l.IsActive)
            .OrderByDescending(l => l.BorrowDate)
            .ToListAsync();

        return loans.Select(MapLoanToDto).ToList();
    }

    public async Task<LoanDto?> GetLoanByIdAsync(Guid id)
    {
        var loan = await _dbContext.LoanRecords
            .AsNoTracking()
            .Include(l => l.Document)
            .FirstOrDefaultAsync(l => l.Id == id && l.IsActive);
        return loan == null ? null : MapLoanToDto(loan);
    }

    public async Task<LoanDto> CreateLoanAsync(CreateLoanRequest request, Guid userId)
    {
        if (request.DueDate <= DateTime.UtcNow)
            throw new ArgumentException("La date de retour doit être dans le futur.");

        var document = await _dbContext.Documents
            .FirstOrDefaultAsync(d => d.Id == request.DocumentId && d.IsActive && !d.IsArchived);
        if (document == null)
            throw new KeyNotFoundException("Le document est introuvable ou indisponible.");

        var hasActiveLoan = await _dbContext.LoanRecords.AnyAsync(l =>
            l.DocumentId == request.DocumentId && l.IsActive && l.ReturnDate == null &&
            (l.Status == "active" || l.Status == "renewed" || l.Status == "overdue"));
        if (hasActiveLoan)
            throw new InvalidOperationException("Ce document possède déjà un prêt actif.");

        var loan = new LoanRecord
        {
            Id = Guid.NewGuid(),
            Reference = await GenerateReferenceAsync("LOAN"),
            DocumentId = request.DocumentId,
            BorrowerName = request.BorrowerName,
            BorrowerEmail = request.BorrowerEmail,
            LoanTypeId = request.LoanTypeId,
            ReasonId = request.ReasonId,
            BorrowDate = DateTime.UtcNow,
            DueDate = request.DueDate,
            Status = "active",
            Location = request.Location,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.LoanRecords.Add(loan);
        await _dbContext.SaveChangesAsync();

        return MapLoanToDto(loan);
    }

    public async Task<LoanDto?> ReturnLoanAsync(Guid id)
    {
        var loan = await _dbContext.LoanRecords
            .Include(l => l.Document)
            .FirstOrDefaultAsync(l => l.Id == id && l.IsActive);

        if (loan == null) return null;
        if (loan.ReturnDate.HasValue || loan.Status == "returned")
            throw new InvalidOperationException("Ce prêt est déjà retourné.");

        loan.Status = "returned";
        loan.ReturnDate = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return MapLoanToDto(loan);
    }

    public async Task<LoanDto?> RenewLoanAsync(Guid id, int additionalDays)
    {
        var loan = await _dbContext.LoanRecords
            .Include(l => l.Document)
            .FirstOrDefaultAsync(l => l.Id == id && l.IsActive);

        if (loan == null) return null;
        if (additionalDays < 1 || additionalDays > 90)
            throw new ArgumentOutOfRangeException(nameof(additionalDays), "Le renouvellement doit être compris entre 1 et 90 jours.");
        if (loan.ReturnDate.HasValue || loan.Status == "returned")
            throw new InvalidOperationException("Un prêt retourné ne peut pas être renouvelé.");

        loan.Status = "renewed";
        loan.DueDate = loan.DueDate.AddDays(additionalDays);

        await _dbContext.SaveChangesAsync();
        return MapLoanToDto(loan);
    }

    public async Task<LoanDto?> UpdateLoanAsync(Guid id, UpdateLoanRequest request, Guid userId)
    {
        var loan = await _dbContext.LoanRecords.Include(l => l.Document)
            .FirstOrDefaultAsync(l => l.Id == id && l.IsActive);
        if (loan == null) return null;
        if (loan.ReturnDate.HasValue || loan.Status == "returned")
            throw new InvalidOperationException("Un prêt retourné ne peut pas être modifié.");
        if (request.DueDate <= loan.BorrowDate)
            throw new ArgumentException("La date de retour doit être postérieure à la date de prêt.");

        loan.BorrowerName = request.BorrowerName;
        loan.BorrowerEmail = request.BorrowerEmail;
        loan.LoanTypeId = request.LoanTypeId;
        loan.ReasonId = request.ReasonId;
        loan.DueDate = request.DueDate;
        loan.Location = request.Location;
        loan.UpdatedBy = userId;
        loan.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return MapLoanToDto(loan);
    }

    public async Task<bool> DeleteLoanAsync(Guid id, Guid userId)
    {
        var loan = await _dbContext.LoanRecords.FirstOrDefaultAsync(l => l.Id == id && l.IsActive);
        if (loan == null) return false;
        if (loan.ReturnDate == null && loan.Status != "returned")
            throw new InvalidOperationException("Un prêt actif doit être retourné avant sa désactivation.");
        loan.IsActive = false;
        loan.UpdatedBy = userId;
        loan.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<List<ConsultationDto>> GetAllConsultationsAsync()
    {
        var consultations = await _dbContext.ConsultationRecords
            .Include(c => c.Document)
            .Where(c => c.IsActive)
            .OrderByDescending(c => c.ConsultationDate)
            .ToListAsync();

        return consultations.Select(MapConsultationToDto).ToList();
    }

    public async Task<ConsultationDto> CreateConsultationAsync(CreateConsultationRequest request, Guid userId)
    {
        var documentExists = await _dbContext.Documents.AnyAsync(d => d.Id == request.DocumentId && d.IsActive);
        if (!documentExists) throw new KeyNotFoundException("Le document est introuvable.");
        var consultation = new ConsultationRecord
        {
            Id = Guid.NewGuid(),
            Reference = await GenerateReferenceAsync("CONS"),
            DocumentId = request.DocumentId,
            UserName = request.UserName,
            ConsultationTypeId = request.ConsultationTypeId,
            ConsultationDate = DateTime.UtcNow,
            Duration = request.Duration,
            Location = request.Location,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ConsultationRecords.Add(consultation);
        await _dbContext.SaveChangesAsync();

        return MapConsultationToDto(consultation);
    }

    public async Task<ConsultationDto?> GetConsultationByIdAsync(Guid id)
    {
        var consultation = await _dbContext.ConsultationRecords.Include(c => c.Document)
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
        return consultation == null ? null : MapConsultationToDto(consultation);
    }

    public async Task<ConsultationDto?> UpdateConsultationAsync(Guid id, UpdateConsultationRequest request, Guid userId)
    {
        var consultation = await _dbContext.ConsultationRecords.Include(c => c.Document)
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
        if (consultation == null) return null;
        consultation.UserName = request.UserName;
        consultation.ConsultationTypeId = request.ConsultationTypeId;
        consultation.ConsultationDate = request.ConsultationDate;
        consultation.Duration = request.Duration;
        consultation.Location = request.Location;
        consultation.UpdatedBy = userId;
        consultation.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return MapConsultationToDto(consultation);
    }

    public async Task<bool> DeleteConsultationAsync(Guid id, Guid userId)
    {
        var consultation = await _dbContext.ConsultationRecords.FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
        if (consultation == null) return false;
        consultation.IsActive = false;
        consultation.UpdatedBy = userId;
        consultation.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return true;
    }

    private async Task<string> GenerateReferenceAsync(string prefix)
    {
        var year = DateTime.UtcNow.Year;
        var count = await _dbContext.LoanRecords.CountAsync() +
                      await _dbContext.ConsultationRecords.CountAsync();
        return $"{prefix}-{year}-{(count + 1):D5}";
    }

    private LoanDto MapLoanToDto(LoanRecord loan)
    {
        return new LoanDto
        {
            Id = loan.Id,
            Reference = loan.Reference,
            DocumentId = loan.DocumentId,
            DocumentTitle = loan.Document?.Title,
            BorrowerName = loan.BorrowerName,
            BorrowerEmail = loan.BorrowerEmail,
            LoanTypeId = loan.LoanTypeId,
            ReasonId = loan.ReasonId,
            BorrowDate = loan.BorrowDate,
            DueDate = loan.DueDate,
            ReturnDate = loan.ReturnDate,
            Status = loan.Status,
            Location = loan.Location,
            CreatedAt = loan.CreatedAt
            ,IsActive = loan.IsActive,
            UpdatedBy = loan.UpdatedBy,
            UpdatedAt = loan.UpdatedAt
        };
    }

    private ConsultationDto MapConsultationToDto(ConsultationRecord c)
    {
        return new ConsultationDto
        {
            Id = c.Id,
            Reference = c.Reference,
            DocumentId = c.DocumentId,
            DocumentTitle = c.Document?.Title,
            UserName = c.UserName,
            ConsultationTypeId = c.ConsultationTypeId,
            ConsultationDate = c.ConsultationDate,
            Duration = c.Duration,
            Location = c.Location
            ,IsActive = c.IsActive,
            UpdatedBy = c.UpdatedBy,
            UpdatedAt = c.UpdatedAt
        };
    }
}