using Archiveo.Application.DTOs.Archives;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Services;

public class ArchiveService
{
    private readonly ApplicationDbContext _dbContext;

    public ArchiveService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<ArchiveDto>> GetAllAsync()
    {
        var archives = await _dbContext.ArchiveRecords
            .Where(a => a.IsActive)
            .OrderByDescending(a => a.ArchivedAt)
            .ToListAsync();

        return archives.Select(MapToDto).ToList();
    }

    public async Task<ArchiveDto?> GetByIdAsync(Guid id)
    {
        var archive = await _dbContext.ArchiveRecords
            .FirstOrDefaultAsync(a => a.Id == id && a.IsActive);

        return archive == null ? null : MapToDto(archive);
    }

    public async Task<ArchiveDto> CreateAsync(CreateArchiveRequest request, Guid userId)
    {
        var archive = new ArchiveRecord
        {
            Id = Guid.NewGuid(),
            Reference = await GenerateReferenceAsync(),
            Title = request.Title,
            Description = request.Description,
            DocumentId = request.DocumentId,
            TypeId = request.TypeId,
            CategoryId = request.CategoryId,
            ServiceId = request.ServiceId,
            DepartmentId = request.DepartmentId,
            Status = "CURRENT",
            ArchivedAt = DateTime.UtcNow,
            RetentionDate = request.RetentionDate,
            SiteId = request.SiteId,
            LocationId = request.LocationId,
            BoxReference = request.BoxReference,
            ShelfReference = request.ShelfReference,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ArchiveRecords.Add(archive);
        await _dbContext.SaveChangesAsync();

        return MapToDto(archive);
    }

    public async Task<ArchiveDto?> UpdateAsync(Guid id, UpdateArchiveRequest request, Guid userId)
    {
        var archive = await _dbContext.ArchiveRecords.FirstOrDefaultAsync(a => a.Id == id && a.IsActive);
        if (archive == null) return null;

        archive.Title = request.Title;
        archive.Description = request.Description;
        archive.TypeId = request.TypeId;
        archive.CategoryId = request.CategoryId;
        archive.ServiceId = request.ServiceId;
        archive.DepartmentId = request.DepartmentId;
        archive.RetentionDate = request.RetentionDate;
        archive.SiteId = request.SiteId;
        archive.LocationId = request.LocationId;
        archive.BoxReference = request.BoxReference;
        archive.ShelfReference = request.ShelfReference;
        archive.UpdatedBy = userId;
        archive.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return MapToDto(archive);
    }

    public async Task<ArchiveDto?> TransitionAsync(Guid id, TransitionArchiveRequest request, Guid userId)
    {
        var archive = await _dbContext.ArchiveRecords.FirstOrDefaultAsync(a => a.Id == id && a.IsActive);
        if (archive == null) return null;

        var validTransitions = new Dictionary<string, string[]>
        {
            { "CURRENT", new[] { "INTERMEDIATE" } },
            { "INTERMEDIATE", new[] { "FINAL", "DESTROYED" } },
            { "FINAL", new[] { "DESTROYED" } }
        };

        if (!validTransitions.ContainsKey(archive.Status) ||
            !validTransitions[archive.Status].Contains(request.NewStatus))
        {
            throw new Exception($"Transition de '{archive.Status}' vers '{request.NewStatus}' non autorisee");
        }

        archive.Status = request.NewStatus;
        archive.UpdatedBy = userId;
        archive.UpdatedAt = DateTime.UtcNow;

        if (request.NewStatus == "DESTROYED")
        {
            if (string.IsNullOrWhiteSpace(request.DestructionReason))
                throw new ArgumentException("Le motif de destruction est obligatoire.");

            archive.DestroyedAt = DateTime.UtcNow;
            archive.DestroyedBy = userId;
            archive.DestructionReason = request.DestructionReason;
        }

        await _dbContext.SaveChangesAsync();
        return MapToDto(archive);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var archive = await _dbContext.ArchiveRecords.FirstOrDefaultAsync(a => a.Id == id);
        if (archive == null) return false;

        archive.IsActive = false;
        await _dbContext.SaveChangesAsync();
        return true;
    }

    private async Task<string> GenerateReferenceAsync()
    {
        var year = DateTime.UtcNow.Year;
        var count = await _dbContext.ArchiveRecords.CountAsync();
        return $"ARC-{year}-{(count + 1):D5}";
    }

    private ArchiveDto MapToDto(ArchiveRecord archive)
    {
        return new ArchiveDto
        {
            Id = archive.Id,
            Reference = archive.Reference,
            Title = archive.Title,
            Description = archive.Description,
            DocumentId = archive.DocumentId,
            TypeId = archive.TypeId,
            CategoryId = archive.CategoryId,
            ServiceId = archive.ServiceId,
            DepartmentId = archive.DepartmentId,
            Status = archive.Status,
            ArchivedAt = archive.ArchivedAt,
            RetentionDate = archive.RetentionDate,
            FinalSort = archive.FinalSort,
            DestructionReason = archive.DestructionReason,
            DestroyedAt = archive.DestroyedAt,
            SiteId = archive.SiteId,
            LocationId = archive.LocationId,
            BoxReference = archive.BoxReference,
            ShelfReference = archive.ShelfReference,
            CreatedBy = archive.CreatedBy,
            CreatedAt = archive.CreatedAt,
            IsActive = archive.IsActive,
            UpdatedBy = archive.UpdatedBy,
            UpdatedAt = archive.UpdatedAt,
            DestroyedBy = archive.DestroyedBy
        };
    }
}