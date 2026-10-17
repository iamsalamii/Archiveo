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

    // =========================================================================
    // CONTRÔLE D'ACCÈS AU PÉRIMÈTRE DE SERVICE
    // =========================================================================

    public async Task<(bool NotFound, bool IsAuthorized, Document? Document)> CheckDocumentAccessAsync(
        Guid documentId,
        Guid currentUserId,
        bool isAdmin)
    {
        var doc = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == documentId && d.IsActive);
        if (doc == null)
        {
            return (NotFound: true, IsAuthorized: false, Document: null);
        }

        if (isAdmin)
        {
            return (NotFound: false, IsAuthorized: true, Document: doc);
        }

        // Récupération de l'identité et du ServiceId faisant autorité depuis la base PostgreSQL
        var user = await _dbContext.Users.AsNoTracking()
            .Where(u => u.Id == currentUserId && u.IsActive)
            .Select(u => new { u.ServiceId })
            .FirstOrDefaultAsync();

        if (user == null || string.IsNullOrWhiteSpace(user.ServiceId))
        {
            return (NotFound: false, IsAuthorized: false, Document: null);
        }

        // Règle d'or : le document doit obligatoirement avoir un ServiceId et correspondre exactement à celui de l'utilisateur
        if (string.IsNullOrWhiteSpace(doc.ServiceId) ||
            !string.Equals(doc.ServiceId, user.ServiceId, StringComparison.OrdinalIgnoreCase))
        {
            return (NotFound: false, IsAuthorized: false, Document: null);
        }

        return (NotFound: false, IsAuthorized: true, Document: doc);
    }

    // GET /api/documents
    public Task<List<DocumentDto>> GetAllAsync()
        => GetAllAsync(Guid.Empty, isAdmin: true);

    public async Task<List<DocumentDto>> GetAllAsync(Guid currentUserId, bool isAdmin)
    {
        if (isAdmin)
        {
            var adminDocs = await _dbContext.Documents
                .AsNoTracking()
                .Where(d => d.IsActive)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            return adminDocs.Select(MapToDto).ToList();
        }

        var user = await _dbContext.Users.AsNoTracking()
            .Where(u => u.Id == currentUserId && u.IsActive)
            .Select(u => new { u.ServiceId })
            .FirstOrDefaultAsync();

        if (user == null || string.IsNullOrWhiteSpace(user.ServiceId))
        {
            return new List<DocumentDto>();
        }

        // Exclusion stricte des documents hors périmètre directement en SQL
        var docs = await _dbContext.Documents
            .AsNoTracking()
            .Where(d => d.IsActive && d.ServiceId == user.ServiceId)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        return docs.Select(MapToDto).ToList();
    }

    // GET /api/documents/{id}
    public async Task<DocumentDto?> GetByIdAsync(Guid id)
    {
        var doc = await _dbContext.Documents
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id && d.IsActive);

        return doc == null ? null : MapToDto(doc);
    }

    public async Task<(bool NotFound, bool IsAuthorized, DocumentDto? Document)> GetByIdSecuredAsync(
        Guid id,
        Guid currentUserId,
        bool isAdmin)
    {
        var (notFound, isAuthorized, doc) = await CheckDocumentAccessAsync(id, currentUserId, isAdmin);
        if (notFound) return (NotFound: true, IsAuthorized: false, Document: null);
        if (!isAuthorized) return (NotFound: false, IsAuthorized: false, Document: null);

        return (NotFound: false, IsAuthorized: true, Document: MapToDto(doc!));
    }

    // POST /api/documents (avec fichier)
    public Task<DocumentDto> CreateAsync(CreateDocumentRequest request, IFormFile? file, Guid userId)
        => CreateAsync(request, file, userId, isAdmin: false);

    public async Task<DocumentDto> CreateAsync(CreateDocumentRequest request, IFormFile? file, Guid userId, bool isAdmin)
    {
        string targetServiceId;

        if (isAdmin)
        {
            targetServiceId = !string.IsNullOrWhiteSpace(request.ServiceId) ? request.ServiceId : "GENERAL";
        }
        else
        {
            var user = await _dbContext.Users.AsNoTracking()
                .Where(u => u.Id == userId && u.IsActive)
                .Select(u => new { u.ServiceId })
                .FirstOrDefaultAsync();

            if (user == null || string.IsNullOrWhiteSpace(user.ServiceId))
            {
                throw new UnauthorizedAccessException("Votre compte n'est rattaché à aucun service actif.");
            }

            if (!string.IsNullOrWhiteSpace(request.ServiceId) &&
                !string.Equals(request.ServiceId, user.ServiceId, StringComparison.OrdinalIgnoreCase))
            {
                throw new UnauthorizedAccessException("Vous ne pouvez pas créer de document pour un autre service que le vôtre.");
            }

            targetServiceId = user.ServiceId;
        }

        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Reference = await GenerateReferenceAsync(),
            Title = request.Title,
            Description = request.Description,
            TypeId = request.TypeId,
            CategoryId = request.CategoryId,
            SubCategoryId = request.SubCategoryId,
            ServiceId = targetServiceId,
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
        var (notFound, isAuthorized, doc) = await UpdateSecuredAsync(id, request, userId, isAdmin: false);
        return isAuthorized ? doc : null;
    }

    public async Task<(bool NotFound, bool IsAuthorized, DocumentDto? Document)> UpdateSecuredAsync(
        Guid id,
        UpdateDocumentRequest request,
        Guid currentUserId,
        bool isAdmin)
    {
        var (notFound, isAuthorized, doc) = await CheckDocumentAccessAsync(id, currentUserId, isAdmin);
        if (notFound) return (NotFound: true, IsAuthorized: false, Document: null);
        if (!isAuthorized) return (NotFound: false, IsAuthorized: false, Document: null);

        // Seul l'administrateur peut éventuellement transférer un document vers un autre service
        if (!isAdmin && !string.IsNullOrWhiteSpace(request.ServiceId) &&
            !string.Equals(request.ServiceId, doc!.ServiceId, StringComparison.OrdinalIgnoreCase))
        {
            return (NotFound: false, IsAuthorized: false, Document: null);
        }

        var previousVersionId = await SaveVersionSnapshotAsync(doc!, currentUserId);
        doc!.Version++;
        doc.ParentVersionId = previousVersionId;
        doc.Title = request.Title;
        doc.Description = request.Description;
        doc.TypeId = request.TypeId;
        doc.CategoryId = request.CategoryId;
        doc.SubCategoryId = request.SubCategoryId;
        if (isAdmin && !string.IsNullOrWhiteSpace(request.ServiceId))
        {
            doc.ServiceId = request.ServiceId;
        }
        doc.StatusId = request.StatusId;
        doc.ConfidentialityId = request.ConfidentialityId;
        doc.LanguageId = request.LanguageId;
        doc.ExpiresAt = request.ExpiresAt;
        doc.RetentionYears = request.RetentionYears;
        doc.Tags = request.Tags;
        doc.Keywords = request.Keywords;
        doc.UpdatedBy = currentUserId;
        doc.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return (NotFound: false, IsAuthorized: true, Document: MapToDto(doc));
    }

    // DELETE /api/documents/{id}
    public async Task<bool> DeleteAsync(Guid id)
    {
        var (notFound, isAuthorized) = await DeleteSecuredAsync(id, Guid.Empty, isAdmin: true);
        return isAuthorized;
    }

    public async Task<(bool NotFound, bool IsAuthorized)> DeleteSecuredAsync(
        Guid id,
        Guid currentUserId,
        bool isAdmin)
    {
        var (notFound, isAuthorized, doc) = await CheckDocumentAccessAsync(id, currentUserId, isAdmin);
        if (notFound) return (NotFound: true, IsAuthorized: false);
        if (!isAuthorized) return (NotFound: false, IsAuthorized: false);

        doc!.IsActive = false;
        doc.UpdatedBy = currentUserId;
        doc.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return (NotFound: false, IsAuthorized: true);
    }

    public async Task<List<DocumentVersionDto>> GetVersionsAsync(Guid id)
    {
        var (_, _, versions) = await GetVersionsSecuredAsync(id, Guid.Empty, isAdmin: true);
        return versions ?? new List<DocumentVersionDto>();
    }

    public async Task<(bool NotFound, bool IsAuthorized, List<DocumentVersionDto>? Versions)> GetVersionsSecuredAsync(
        Guid id,
        Guid currentUserId,
        bool isAdmin)
    {
        var (notFound, isAuthorized, doc) = await CheckDocumentAccessAsync(id, currentUserId, isAdmin);
        if (notFound) return (NotFound: true, IsAuthorized: false, Versions: null);
        if (!isAuthorized) return (NotFound: false, IsAuthorized: false, Versions: null);

        var list = await _dbContext.DocumentVersions
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

        return (NotFound: false, IsAuthorized: true, Versions: list);
    }

    public async Task<DocumentDto?> SetArchivedAsync(Guid id, bool archived, Guid userId)
    {
        var (_, isAuthorized, doc) = await SetArchivedSecuredAsync(id, archived, userId, isAdmin: false);
        return isAuthorized ? doc : null;
    }

    public async Task<(bool NotFound, bool IsAuthorized, DocumentDto? Document)> SetArchivedSecuredAsync(
        Guid id,
        bool archived,
        Guid currentUserId,
        bool isAdmin)
    {
        var (notFound, isAuthorized, doc) = await CheckDocumentAccessAsync(id, currentUserId, isAdmin);
        if (notFound) return (NotFound: true, IsAuthorized: false, Document: null);
        if (!isAuthorized) return (NotFound: false, IsAuthorized: false, Document: null);

        doc!.IsArchived = archived;
        if (archived) doc.StatusId = "ARCHIVE";
        else if (doc.StatusId == "ARCHIVE") doc.StatusId = "VALIDE";
        doc.UpdatedBy = currentUserId;
        doc.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return (NotFound: false, IsAuthorized: true, Document: MapToDto(doc));
    }

    public async Task<DocumentDto?> CreateVersionAsync(Guid id, UpdateDocumentRequest request, IFormFile? file, Guid userId)
    {
        var (_, isAuthorized, doc) = await CreateVersionSecuredAsync(id, request, file, userId, isAdmin: false);
        return isAuthorized ? doc : null;
    }

    public async Task<(bool NotFound, bool IsAuthorized, DocumentDto? Document)> CreateVersionSecuredAsync(
        Guid id,
        UpdateDocumentRequest request,
        IFormFile? file,
        Guid currentUserId,
        bool isAdmin)
    {
        var (notFound, isAuthorized, doc) = await CheckDocumentAccessAsync(id, currentUserId, isAdmin);
        if (notFound) return (NotFound: true, IsAuthorized: false, Document: null);
        if (!isAuthorized) return (NotFound: false, IsAuthorized: false, Document: null);

        if (!isAdmin && !string.IsNullOrWhiteSpace(request.ServiceId) &&
            !string.Equals(request.ServiceId, doc!.ServiceId, StringComparison.OrdinalIgnoreCase))
        {
            return (NotFound: false, IsAuthorized: false, Document: null);
        }

        var previousVersionId = await SaveVersionSnapshotAsync(doc!, currentUserId);
        doc!.Version++;
        doc.ParentVersionId = previousVersionId;
        doc.Title = request.Title;
        doc.Description = request.Description;
        doc.TypeId = request.TypeId;
        doc.CategoryId = request.CategoryId;
        doc.SubCategoryId = request.SubCategoryId;
        doc.StatusId = request.StatusId;
        doc.ConfidentialityId = request.ConfidentialityId;
        doc.LanguageId = request.LanguageId;
        doc.ExpiresAt = request.ExpiresAt;
        doc.RetentionYears = request.RetentionYears;
        doc.Tags = request.Tags;
        doc.Keywords = request.Keywords;
        doc.UpdatedBy = currentUserId;
        doc.UpdatedAt = DateTime.UtcNow;
        if (file != null)
            await SaveFileAsync(doc, file);

        await _dbContext.SaveChangesAsync();
        return (NotFound: false, IsAuthorized: true, Document: MapToDto(doc));
    }

    // POST /api/documents/{id}/validate
    public async Task<DocumentDto?> ValidateAsync(Guid id, Guid userId)
    {
        var (_, isAuthorized, doc) = await ValidateSecuredAsync(id, userId, isAdmin: false);
        return isAuthorized ? doc : null;
    }

    public async Task<(bool NotFound, bool IsAuthorized, DocumentDto? Document)> ValidateSecuredAsync(
        Guid id,
        Guid currentUserId,
        bool isAdmin)
    {
        var (notFound, isAuthorized, doc) = await CheckDocumentAccessAsync(id, currentUserId, isAdmin);
        if (notFound) return (NotFound: true, IsAuthorized: false, Document: null);
        if (!isAuthorized) return (NotFound: false, IsAuthorized: false, Document: null);

        doc!.Validated = true;
        doc.ValidatedBy = currentUserId;
        doc.ValidatedAt = DateTime.UtcNow;
        doc.StatusId = "VALIDE";
        doc.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();
        return (NotFound: false, IsAuthorized: true, Document: MapToDto(doc));
    }

    // GET /api/documents/{id}/download
    public async Task<(string FilePath, string FileName, string MimeType)?> GetFileAsync(Guid id)
    {
        var (notFound, isAuthorized, filePath, fileName, mimeType) = await GetFileSecuredAsync(id, Guid.Empty, isAdmin: true);
        if (notFound || !isAuthorized || filePath == null) return null;
        return (filePath, fileName ?? "document", mimeType ?? "application/octet-stream");
    }

    public async Task<(bool NotFound, bool IsAuthorized, string? FilePath, string? FileName, string? MimeType)> GetFileSecuredAsync(
        Guid id,
        Guid currentUserId,
        bool isAdmin)
    {
        var (notFound, isAuthorized, doc) = await CheckDocumentAccessAsync(id, currentUserId, isAdmin);
        if (notFound) return (NotFound: true, IsAuthorized: false, null, null, null);
        if (!isAuthorized) return (NotFound: false, IsAuthorized: false, null, null, null);

        if (doc!.FilePath == null)
            return (NotFound: true, IsAuthorized: true, null, null, null);

        return (NotFound: false, IsAuthorized: true, doc.FilePath, doc.FileName ?? "document", doc.MimeType ?? "application/octet-stream");
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