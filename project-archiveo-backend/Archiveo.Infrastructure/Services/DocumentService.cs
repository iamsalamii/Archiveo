using Archiveo.Application.DTOs.Documents;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Services;

public class DocumentService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly string _uploadPath;

    public DocumentService(
        ApplicationDbContext dbContext,
        IHttpContextAccessor httpContextAccessor)
    {
        _dbContext = dbContext;
        _httpContextAccessor = httpContextAccessor;
        var storageRoot = Environment.GetEnvironmentVariable("ARCHIVEO_STORAGE_PATH")
            ?? Path.Combine(Directory.GetCurrentDirectory(), "storage");
        _uploadPath = Path.Combine(storageRoot, "documents");

        if (!Directory.Exists(_uploadPath))
        {
            Directory.CreateDirectory(_uploadPath);
        }
    }

    // GET /api/documents
    public async Task<List<DocumentDto>> GetAllAsync()
    {
        var docs = await _dbContext.Documents
            .Where(d => d.IsActive)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        return docs.Select(MapToDto).ToList();
    }

    // GET /api/documents/{id}
    public async Task<DocumentDto?> GetByIdAsync(Guid id)
    {
        var doc = await _dbContext.Documents
            .FirstOrDefaultAsync(d => d.Id == id && d.IsActive);

        return doc == null ? null : MapToDto(doc);
    }

    // POST /api/documents (avec fichier)
    public async Task<DocumentDto> CreateAsync(CreateDocumentRequest request, IFormFile? file, Guid userId)
    {
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Reference = await GenerateReferenceAsync(),
            Title = request.Title,
            Description = request.Description,
            TypeId = request.TypeId,
            CategoryId = request.CategoryId,
            SubCategoryId = request.SubCategoryId,
            ServiceId = request.ServiceId,
            StatusId = "BROUILLON",
            ConfidentialityId = request.ConfidentialityId,
            LanguageId = request.LanguageId,
            ExpiresAt = request.ExpiresAt,
            RetentionYears = request.RetentionYears,
            Tags = request.Tags,
            Keywords = request.Keywords,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        if (file != null)
        {
            await SaveFileAsync(doc, file);
        }

        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync();

        return MapToDto(doc);
    }

    // PUT /api/documents/{id}
    public async Task<DocumentDto?> UpdateAsync(Guid id, UpdateDocumentRequest request, Guid userId)
    {
        var doc = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == id && d.IsActive);
        if (doc == null) return null;

        var previousVersionId = await SaveVersionSnapshotAsync(doc, userId);
        doc.Version++;
        doc.ParentVersionId = previousVersionId;
        doc.Title = request.Title;
        doc.Description = request.Description;
        doc.TypeId = request.TypeId;
        doc.CategoryId = request.CategoryId;
        doc.SubCategoryId = request.SubCategoryId;
        doc.ServiceId = request.ServiceId;
        doc.StatusId = request.StatusId;
        doc.ConfidentialityId = request.ConfidentialityId;
        doc.LanguageId = request.LanguageId;
        doc.ExpiresAt = request.ExpiresAt;
        doc.RetentionYears = request.RetentionYears;
        doc.Tags = request.Tags;
        doc.Keywords = request.Keywords;
        doc.UpdatedBy = userId;
        doc.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return MapToDto(doc);
    }

    // DELETE /api/documents/{id}
    public async Task<bool> DeleteAsync(Guid id)
    {
        var doc = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == id);
        if (doc == null) return false;

        doc.IsActive = false;
        await _dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<List<DocumentVersionDto>> GetVersionsAsync(Guid id)
    {
        return await _dbContext.DocumentVersions
            .Where(version => version.DocumentId == id)
            .OrderByDescending(version => version.Version)
            .Select(version => new DocumentVersionDto
            {
                Id = version.Id,
                Version = version.Version,
                ParentVersionId = version.ParentVersionId,
                Title = version.Title,
                FileName = version.FileName,
                FileSize = version.FileSize,
                MimeType = version.MimeType,
                CreatedBy = version.CreatedBy,
                CreatedAt = version.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<DocumentDto?> SetArchivedAsync(Guid id, bool archived, Guid userId)
    {
        var doc = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == id && d.IsActive);
        if (doc == null) return null;

        doc.IsArchived = archived;
        if (archived) doc.StatusId = "ARCHIVE";
        doc.UpdatedBy = userId;
        doc.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return MapToDto(doc);
    }

    public async Task<DocumentDto?> CreateVersionAsync(Guid id, UpdateDocumentRequest request, IFormFile? file, Guid userId)
    {
        var doc = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == id && d.IsActive);
        if (doc == null) return null;

        var previousVersionId = await SaveVersionSnapshotAsync(doc, userId);
        doc.Version++;
        doc.ParentVersionId = previousVersionId;
        doc.Title = request.Title;
        doc.Description = request.Description;
        doc.TypeId = request.TypeId;
        doc.CategoryId = request.CategoryId;
        doc.SubCategoryId = request.SubCategoryId;
        doc.ServiceId = request.ServiceId;
        doc.StatusId = request.StatusId;
        doc.ConfidentialityId = request.ConfidentialityId;
        doc.LanguageId = request.LanguageId;
        doc.ExpiresAt = request.ExpiresAt;
        doc.RetentionYears = request.RetentionYears;
        doc.Tags = request.Tags;
        doc.Keywords = request.Keywords;
        doc.UpdatedBy = userId;
        doc.UpdatedAt = DateTime.UtcNow;
        if (file != null)
            await SaveFileAsync(doc, file);

        await _dbContext.SaveChangesAsync();
        return MapToDto(doc);
    }

    // POST /api/documents/{id}/validate
    public async Task<DocumentDto?> ValidateAsync(Guid id, Guid userId)
    {
        var doc = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == id && d.IsActive);
        if (doc == null) return null;

        doc.Validated = true;
        doc.ValidatedBy = userId;
        doc.ValidatedAt = DateTime.UtcNow;
        doc.StatusId = "VALIDE";
        doc.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return MapToDto(doc);
    }

    // GET /api/documents/{id}/download
    public async Task<(string FilePath, string FileName, string MimeType)?> GetFileAsync(Guid id)
    {
        var doc = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == id && d.IsActive);
        if (doc == null || doc.FilePath == null) return null;

        return (doc.FilePath, doc.FileName ?? "document", doc.MimeType ?? "application/octet-stream");
    }

    // Helpers priv�s

    private async Task<string> GenerateReferenceAsync()
    {
        var year = DateTime.UtcNow.Year;
        var count = await _dbContext.Documents.CountAsync();
        return $"DOC-{year}-{(count + 1):D5}";
    }

    private async Task SaveFileAsync(Document doc, IFormFile file)
    {
        var uniqueName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(_uploadPath, uniqueName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        doc.FileName = file.FileName;
        doc.FilePath = filePath;
        doc.FileSize = file.Length;
        doc.MimeType = file.ContentType;
    }

    private Task<Guid> SaveVersionSnapshotAsync(Document doc, Guid userId)
    {
        var versionId = Guid.NewGuid();
        _dbContext.DocumentVersions.Add(new DocumentVersionRecord
        {
            Id = versionId,
            DocumentId = doc.Id,
            Version = doc.Version,
            ParentVersionId = doc.ParentVersionId,
            Title = doc.Title,
            Description = doc.Description,
            TypeId = doc.TypeId,
            CategoryId = doc.CategoryId,
            SubCategoryId = doc.SubCategoryId,
            ServiceId = doc.ServiceId,
            StatusId = doc.StatusId,
            ConfidentialityId = doc.ConfidentialityId,
            LanguageId = doc.LanguageId,
            FileName = doc.FileName,
            FilePath = doc.FilePath,
            FileSize = doc.FileSize,
            MimeType = doc.MimeType,
            Tags = doc.Tags,
            Keywords = doc.Keywords,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        });
        return Task.FromResult(versionId);
    }

    private DocumentDto MapToDto(Document doc)
    {
        return new DocumentDto
        {
            Id = doc.Id,
            Reference = doc.Reference,
            Title = doc.Title,
            Description = doc.Description,
            TypeId = doc.TypeId,
            CategoryId = doc.CategoryId,
            SubCategoryId = doc.SubCategoryId,
            ServiceId = doc.ServiceId,
            StatusId = doc.StatusId,
            ConfidentialityId = doc.ConfidentialityId,
            LanguageId = doc.LanguageId,
            FileName = doc.FileName,
            FileSize = doc.FileSize,
            MimeType = doc.MimeType,
            Version = doc.Version,
            Validated = doc.Validated,
            ValidatedAt = doc.ValidatedAt,
            ExpiresAt = doc.ExpiresAt,
            RetentionYears = doc.RetentionYears,
            Tags = doc.Tags,
            Keywords = doc.Keywords,
            CreatedBy = doc.CreatedBy,
            CreatedByName = "Admin", // Sera rempli plus tard avec une jointure
            CreatedAt = doc.CreatedAt,
            UpdatedAt = doc.UpdatedAt,
            UpdatedBy = doc.UpdatedBy,
            IsActive = doc.IsActive,
            IsArchived = doc.IsArchived
        };
    }
}