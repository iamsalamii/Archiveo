using Archiveo.Application.DTOs.Correspondences;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Services;

public class CorrespondenceService
{
    private readonly ApplicationDbContext _dbContext;

    public CorrespondenceService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<CorrespondenceDto>> GetAllAsync(string? type = null)
    {
        var query = _dbContext.Correspondences
            .Include(c => c.Document)
            .Where(c => c.IsActive);

        if (!string.IsNullOrWhiteSpace(type) && type != "all")
        {
            query = query.Where(c => c.Type.ToLower() == type.ToLower());
        }

        var list = await query
            .OrderByDescending(c => c.Date)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<CorrespondenceDto?> GetByIdAsync(Guid id)
    {
        var correspondence = await _dbContext.Correspondences
            .Include(c => c.Document)
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

        return correspondence == null ? null : MapToDto(correspondence);
    }

    public async Task<CorrespondenceDto> CreateAsync(CreateCorrespondenceRequest request, Guid userId)
    {
        var correspondence = new Correspondence
        {
            Id = Guid.NewGuid(),
            Reference = await GenerateReferenceAsync(request.Type),
            Type = request.Type,
            Subject = request.Subject,
            SenderId = request.SenderId,
            RecipientId = request.RecipientId,
            Date = request.Date ?? DateTime.UtcNow,
            DocumentId = request.DocumentId,
            SignatureTypeId = request.SignatureTypeId,
            Notes = request.Notes,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        _dbContext.Correspondences.Add(correspondence);
        await _dbContext.SaveChangesAsync();

        if (correspondence.DocumentId.HasValue)
        {
            await _dbContext.Entry(correspondence).Reference(c => c.Document).LoadAsync();
        }

        return MapToDto(correspondence);
    }

    public async Task<CorrespondenceDto?> UpdateAsync(Guid id, UpdateCorrespondenceRequest request, Guid userId)
    {
        var correspondence = await _dbContext.Correspondences
            .Include(c => c.Document)
            .FirstOrDefaultAsync(c => c.Id == id && c.IsActive);

        if (correspondence == null) return null;

        correspondence.Type = request.Type;
        correspondence.Subject = request.Subject;
        correspondence.SenderId = request.SenderId;
        correspondence.RecipientId = request.RecipientId;
        if (request.Date.HasValue) correspondence.Date = request.Date.Value;
        correspondence.DocumentId = request.DocumentId;
        correspondence.SignatureTypeId = request.SignatureTypeId;
        correspondence.Notes = request.Notes;
        correspondence.UpdatedBy = userId;
        correspondence.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return MapToDto(correspondence);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var correspondence = await _dbContext.Correspondences.FirstOrDefaultAsync(c => c.Id == id);
        if (correspondence == null) return false;

        correspondence.IsActive = false;
        await _dbContext.SaveChangesAsync();
        return true;
    }

    private async Task<string> GenerateReferenceAsync(string type)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = type switch
        {
            "outgoing" => $"CR-OUT-{year}",
            "internal" => $"CR-INT-{year}",
            _ => $"CR-IN-{year}"
        };

        var count = await _dbContext.Correspondences.CountAsync(c => c.Reference.StartsWith(prefix)) + 1;
        return $"{prefix}-{count:D4}";
    }

    private static CorrespondenceDto MapToDto(Correspondence c) => new()
    {
        Id = c.Id,
        Reference = c.Reference,
        Type = c.Type,
        Subject = c.Subject,
        SenderId = c.SenderId,
        RecipientId = c.RecipientId,
        Date = c.Date,
        DocumentId = c.DocumentId,
        DocumentTitle = c.Document?.Title,
        SignatureTypeId = c.SignatureTypeId,
        Notes = c.Notes,
        CreatedAt = c.CreatedAt,
        IsActive = c.IsActive,
        UpdatedBy = c.UpdatedBy,
        UpdatedAt = c.UpdatedAt
    };
}
