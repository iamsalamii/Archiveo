using Archiveo.Application.DTOs.Audit;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Services;

public class AuditService
{
    private readonly ApplicationDbContext _dbContext;

    public AuditService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<AuditLogDto>> GetAllAsync(int limit = 200)
    {
        var logs = await _dbContext.AuditLogs
            .OrderByDescending(a => a.Timestamp)
            .Take(limit)
            .ToListAsync();

        return logs.Select(l => new AuditLogDto
        {
            Id = l.Id,
            UserName = l.UserName,
            Action = l.Action,
            Target = l.Target,
            TargetType = l.TargetType,
            StatusCode = l.StatusCode,
            IpAddress = l.IpAddress,
            Timestamp = l.Timestamp
        }).ToList();
    }

    public async Task WriteAsync(AuditLog log)
    {
        _dbContext.AuditLogs.Add(log);
        await _dbContext.SaveChangesAsync();
    }
}