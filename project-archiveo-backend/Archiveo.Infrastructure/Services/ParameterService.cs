using Archiveo.Application.DTOs.Parameters;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Services;

public class ParameterService
{
    private readonly ApplicationDbContext _dbContext;

    public ParameterService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    // GET /api/parameters/groups
    public async Task<List<ParameterGroupDto>> GetAllGroupsAsync()
    {
        var groups = await _dbContext.ParameterGroups
            .AsNoTracking()
            .Include(g => g.Items.Where(i => i.IsActive))
            .Where(g => g.IsActive)
            .OrderBy(g => g.Order)
            .ToListAsync();

        return groups.Select(g => new ParameterGroupDto
        {
            Id = g.Id,
            Code = g.Code,
            Name = g.Name,
            Description = g.Description,
            Icon = g.Icon,
            Color = g.Color,
            Order = g.Order,
            IsActive = g.IsActive,
            Items = g.Items.OrderBy(i => i.Order).Select(i => new ParameterItemDto
            {
                Id = i.Id,
                GroupCode = i.GroupCode,
                Code = i.Code,
                Name = i.Name,
                Description = i.Description,
                Color = i.Color,
                Icon = i.Icon,
                Order = i.Order,
                IsActive = i.IsActive,
                ParentId = i.ParentId
            }).ToList()
        }).ToList();
    }

    // GET /api/parameters/groups/{groupCode}/items
    public async Task<List<ParameterItemDto>> GetItemsByGroupAsync(string groupCode)
    {
        var items = await _dbContext.ParameterItems
            .AsNoTracking()
            .Where(i => i.GroupCode == groupCode && i.IsActive)
            .OrderBy(i => i.Order)
            .ToListAsync();

        return items.Select(i => new ParameterItemDto
        {
            Id = i.Id,
            GroupCode = i.GroupCode,
            Code = i.Code,
            Name = i.Name,
            Description = i.Description,
            Color = i.Color,
            Icon = i.Icon,
            Order = i.Order,
            IsActive = i.IsActive,
            ParentId = i.ParentId
        }).ToList();
    }

    // POST /api/parameters/groups
    public async Task<ParameterGroupDto> CreateGroupAsync(CreateParameterGroupRequest request)
    {
        // Validation
        if (string.IsNullOrWhiteSpace(request.Code))
            throw new Exception("Le code est obligatoire");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new Exception("Le nom est obligatoire");

        var normalizedCode = request.Code.ToUpperInvariant().Trim();

        // Verifier l'unicite du code
        var exists = await _dbContext.ParameterGroups.AnyAsync(g => g.Code == normalizedCode);
        if (exists)
            throw new Exception($"Le groupe '{normalizedCode}' existe deja");

        var group = new ParameterGroup
        {
            Id = Guid.NewGuid(),
            Code = normalizedCode,
            Name = request.Name,
            Description = request.Description,
            Icon = request.Icon,
            Color = request.Color,
            Order = request.Order,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ParameterGroups.Add(group);

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            var innerMessage = ex.InnerException?.Message ?? ex.Message;
            if (innerMessage.Contains("duplicate") || innerMessage.Contains("dupliquee") || innerMessage.Contains("23505"))
            {
                throw new Exception($"Le groupe '{normalizedCode}' existe deja");
            }
            throw new Exception($"Erreur base de donnees : {innerMessage}");
        }

        return new ParameterGroupDto
        {
            Id = group.Id,
            Code = group.Code,
            Name = group.Name,
            Description = group.Description,
            Icon = group.Icon,
            Color = group.Color,
            Order = group.Order,
            IsActive = group.IsActive,
            Items = new List<ParameterItemDto>()
        };
    }

    // POST /api/parameters/groups/{groupCode}/items
    public async Task<ParameterItemDto> CreateItemAsync(string groupCode, CreateParameterItemRequest request)
    {
        // 1. Verifier que le groupe existe
        var group = await _dbContext.ParameterGroups
            .FirstOrDefaultAsync(g => g.Code == groupCode);

        if (group == null)
            throw new Exception($"Groupe '{groupCode}' introuvable");

        // 2. Valider les donnees
        if (string.IsNullOrWhiteSpace(request.Code))
            throw new Exception("Le code est obligatoire");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new Exception("Le nom est obligatoire");

        if (request.Code.Length > 50)
            throw new Exception("Le code ne peut pas depasser 50 caracteres");

        // 3. Normaliser le code (majuscules + trim)
        var normalizedCode = request.Code.ToUpperInvariant().Trim();

        // 4. [IMPORTANT] VERIFIER L'UNICITE AVANT L'INSERT
        var exists = await _dbContext.ParameterItems
            .AnyAsync(i => i.GroupCode == groupCode && i.Code == normalizedCode);

        if (exists)
            throw new Exception($"Le code '{normalizedCode}' existe deja dans le groupe '{groupCode}'. Choisissez un autre code.");

        // 5. Creer l'item
        var item = new ParameterItem
        {
            Id = Guid.NewGuid(),
            GroupCode = groupCode,
            Code = normalizedCode,
            Name = request.Name,
            Description = request.Description,
            Color = request.Color,
            Icon = request.Icon,
            Order = request.Order > 0 ? request.Order : 999,
            ParentId = request.ParentId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ParameterItems.Add(item);

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            // Capturer l'erreur EF Core et la rendre lisible
            var innerMessage = ex.InnerException?.Message ?? ex.Message;

            // Detecter specifiquement l'erreur de contrainte unique
            if (innerMessage.Contains("duplicate") || innerMessage.Contains("dupliquee") || innerMessage.Contains("23505"))
            {
                throw new Exception($"Le code '{normalizedCode}' existe deja dans le groupe '{groupCode}'");
            }

            throw new Exception($"Erreur base de donnees : {innerMessage}");
        }

        return new ParameterItemDto
        {
            Id = item.Id,
            GroupCode = item.GroupCode,
            Code = item.Code,
            Name = item.Name,
            Description = item.Description,
            Color = item.Color,
            Icon = item.Icon,
            Order = item.Order,
            IsActive = item.IsActive,
            ParentId = item.ParentId
        };
    }

    // PUT /api/parameters/groups/{groupCode}/items/{itemId}
    public async Task<ParameterItemDto?> UpdateItemAsync(string groupCode, string itemId, UpdateParameterItemRequest request)
    {
        Console.WriteLine($"[DEBUG UpdateItemAsync] groupCode={groupCode}, itemId={itemId}, code={request.Code}");

        Guid parsedGuid = Guid.Empty;
        bool isGuid = Guid.TryParse(itemId, out parsedGuid);

        var item = await _dbContext.ParameterItems
            .FirstOrDefaultAsync(i => i.GroupCode == groupCode && (
                (isGuid && i.Id == parsedGuid) ||
                i.Code == itemId ||
                i.Code == request.Code
            ));

        if (item == null)
        {
            // Si l'élément n'existe pas encore en DB (ex: issu du seeder mock), on le crée proprement (upsert)
            Console.WriteLine($"[DEBUG UpdateItemAsync] Item inexistant, création automatique...");
            var createRequest = new CreateParameterItemRequest
            {
                Code = !string.IsNullOrWhiteSpace(request.Code) ? request.Code : itemId,
                Name = request.Name,
                Description = request.Description,
                Color = request.Color,
                Icon = request.Icon,
                Order = request.Order,
                ParentId = request.ParentId,
            };
            return await CreateItemAsync(groupCode, createRequest);
        }

        Console.WriteLine($"[DEBUG UpdateItemAsync] Item trouve: {item.Code}");

        // Validation
        if (string.IsNullOrWhiteSpace(request.Code))
            throw new Exception("Le code est obligatoire");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new Exception("Le nom est obligatoire");

        var normalizedCode = request.Code.ToUpperInvariant().Trim();

        // Verifier l'unicite (sauf pour l'item lui-meme)
        var exists = await _dbContext.ParameterItems
            .AnyAsync(i => i.GroupCode == groupCode && i.Code == normalizedCode && i.Id != item.Id);

        if (exists)
            throw new Exception($"Le code '{normalizedCode}' existe deja dans le groupe '{groupCode}'");

        // Mise a jour
        item.Code = normalizedCode;
        item.Name = request.Name;
        item.Description = request.Description;
        item.Color = request.Color;
        item.Icon = request.Icon;
        item.Order = request.Order;
        item.ParentId = request.ParentId;
        item.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            var innerMessage = ex.InnerException?.Message ?? ex.Message;
            throw new Exception($"Erreur base de donnees : {innerMessage}");
        }

        return new ParameterItemDto
        {
            Id = item.Id,
            GroupCode = item.GroupCode,
            Code = item.Code,
            Name = item.Name,
            Description = item.Description,
            Color = item.Color,
            Icon = item.Icon,
            Order = item.Order,
            IsActive = item.IsActive,
            ParentId = item.ParentId
        };
    }

    // DELETE /api/parameters/groups/{groupCode}/items/{itemId}
    public async Task<bool> DeleteItemAsync(string groupCode, string itemId)
    {
        Guid parsedGuid = Guid.Empty;
        bool isGuid = Guid.TryParse(itemId, out parsedGuid);

        var item = await _dbContext.ParameterItems
            .FirstOrDefaultAsync(i => i.GroupCode == groupCode && (
                (isGuid && i.Id == parsedGuid) ||
                i.Code == itemId
            ));

        if (item == null)
            return false;

        _dbContext.ParameterItems.Remove(item);
        await _dbContext.SaveChangesAsync();
        return true;
    }
}