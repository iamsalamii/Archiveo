using Archiveo.Application.DTOs.Notifications;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Services;

public class NotificationService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(ApplicationDbContext dbContext, IHubContext<NotificationHub> hubContext)
    {
        _dbContext = dbContext;
        _hubContext = hubContext;
    }

    /// <summary>Récupère les notifications d'un utilisateur (non lues en premier)</summary>
    public async Task<List<NotificationDto>> GetForUserAsync(Guid userId, int limit = 50)
    {
        var list = await _dbContext.Notifications
            .Where(n => n.UserId == null || n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    /// <summary>Crée une notification et la pousse en temps réel via SignalR</summary>
    public async Task<NotificationDto> CreateAndPushAsync(CreateNotificationRequest request)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            Type = request.Type,
            Title = request.Title,
            Message = request.Message,
            Category = request.Category,
            Link = request.Link,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Notifications.Add(notification);
        await _dbContext.SaveChangesAsync();

        var dto = MapToDto(notification);

        // Push SignalR (si le hub est actif)
        if (_hubContext != null)
        {
            if (request.UserId.HasValue)
            {
                await _hubContext.Clients
                    .Group(request.UserId.Value.ToString())
                    .SendAsync("ReceiveNotification", dto);
            }
            else
            {
                await _hubContext.Clients.All.SendAsync("ReceiveNotification", dto);
            }
        }


        return dto;
    }

    /// <summary>Marque une notification comme lue</summary>
    public async Task<bool> MarkAsReadAsync(Guid id, Guid userId)
    {
        var notification = await _dbContext.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && (n.UserId == null || n.UserId == userId));

        if (notification == null) return false;

        notification.IsRead = true;
        notification.ReadAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return true;
    }

    /// <summary>Marque toutes les notifications d'un utilisateur comme lues</summary>
    public async Task MarkAllAsReadAsync(Guid userId)
    {
        var notifications = await _dbContext.Notifications
            .Where(n => !n.IsRead && (n.UserId == null || n.UserId == userId))
            .ToListAsync();

        foreach (var n in notifications)
        {
            n.IsRead = true;
            n.ReadAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();
    }

    private static NotificationDto MapToDto(Notification n) => new()
    {
        Id = n.Id,
        UserId = n.UserId,
        Type = n.Type,
        Title = n.Title,
        Message = n.Message,
        Category = n.Category,
        Link = n.Link,
        IsRead = n.IsRead,
        CreatedAt = n.CreatedAt,
        ReadAt = n.ReadAt
    };
}
