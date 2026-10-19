using Archiveo.Api.Authorization;
using Archiveo.Api.Controllers;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace Archiveo.Tests;

/// <summary>
/// Tests unitaires et d'intégration en mémoire pour l'optimisation N+1 de UserService.GetAllAsync()
/// et le respect des règles d'autorisation associées.
/// </summary>
public class UserServiceOptimizationTests : IDisposable
{
    private readonly ApplicationDbContext _dbContext;
    private readonly UserService _userService;
    private readonly PermissionAuthorizationHandler _permissionHandler;

    public UserServiceOptimizationTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"UserOptimization_Test_{Guid.NewGuid():N}")
            .Options;

        _dbContext = new ApplicationDbContext(options);
        var userManager = CreateUserManager(_dbContext);
        _userService = new UserService(userManager, _dbContext);
        _permissionHandler = new PermissionAuthorizationHandler(_dbContext);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    private static UserManager<User> CreateUserManager(ApplicationDbContext dbContext)
    {
        var store = new UserStore<User, IdentityRole<Guid>, ApplicationDbContext, Guid>(dbContext);
        return new UserManager<User>(
            store,
            Options.Create(new IdentityOptions()),
            new PasswordHasher<User>(),
            Array.Empty<IUserValidator<User>>(),
            Array.Empty<IPasswordValidator<User>>(),
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(),
            null!,
            null!
        );
    }

    [Fact]
    public async Task GetAllAsync_ReturnsUsersSortedByLastName()
    {
        // Arrange : 3 utilisateurs dans un ordre non alphabétique
        _dbContext.Users.AddRange(
            new User { Id = Guid.NewGuid(), UserName = "u1", Email = "u1@test.local", FirstName = "Alice", LastName = "Zeta" },
            new User { Id = Guid.NewGuid(), UserName = "u2", Email = "u2@test.local", FirstName = "Bob", LastName = "Alpha" },
            new User { Id = Guid.NewGuid(), UserName = "u3", Email = "u3@test.local", FirstName = "Charlie", LastName = "Mid" }
        );
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _userService.GetAllAsync();

        // Assert
        Assert.Equal(3, result.Count);
        Assert.Equal("Alpha", result[0].LastName);
        Assert.Equal("Mid", result[1].LastName);
        Assert.Equal("Zeta", result[2].LastName);
    }

    [Fact]
    public async Task GetAllAsync_CorrectlyAssociatesSingleRole_MultipleRoles_AndNoRole()
    {
        // Arrange : rôles
        var roleAdmin = new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = "Admin", NormalizedName = "ADMIN" };
        var roleUser = new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = "User", NormalizedName = "USER" };
        var roleArchivist = new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = "Archiviste", NormalizedName = "ARCHIVISTE" };
        _dbContext.Roles.AddRange(roleAdmin, roleUser, roleArchivist);

        // Utilisateur avec rôles multiples (Admin + Archiviste)
        var userMulti = new User { Id = Guid.NewGuid(), UserName = "multi", Email = "multi@test.local", FirstName = "Multi", LastName = "A_Multi" };
        // Utilisateur avec rôle unique (User)
        var userSingle = new User { Id = Guid.NewGuid(), UserName = "single", Email = "single@test.local", FirstName = "Single", LastName = "B_Single" };
        // Utilisateur sans rôle
        var userNone = new User { Id = Guid.NewGuid(), UserName = "none", Email = "none@test.local", FirstName = "None", LastName = "C_None" };

        _dbContext.Users.AddRange(userMulti, userSingle, userNone);

        _dbContext.UserRoles.AddRange(
            new IdentityUserRole<Guid> { UserId = userMulti.Id, RoleId = roleAdmin.Id },
            new IdentityUserRole<Guid> { UserId = userMulti.Id, RoleId = roleArchivist.Id },
            new IdentityUserRole<Guid> { UserId = userSingle.Id, RoleId = roleUser.Id }
        );

        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _userService.GetAllAsync();

        // Assert
        Assert.Equal(3, result.Count);

        var dtoMulti = result.First(u => u.Id == userMulti.Id);
        Assert.Equal(2, dtoMulti.Roles.Count);
        Assert.Contains("Admin", dtoMulti.Roles);
        Assert.Contains("Archiviste", dtoMulti.Roles);

        var dtoSingle = result.First(u => u.Id == userSingle.Id);
        Assert.Single(dtoSingle.Roles);
        Assert.Equal("User", dtoSingle.Roles[0]);

        var dtoNone = result.First(u => u.Id == userNone.Id);
        Assert.NotNull(dtoNone.Roles);
        Assert.Empty(dtoNone.Roles);
    }

    [Fact]
    public async Task GetAllAsync_MapsAllEntityPropertiesFaithfully()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = "agent.test",
            Email = "agent.test@archiveo.local",
            FirstName = "Jean",
            LastName = "Dupont",
            Function = "Directeur Administratif",
            Matricule = "MAT-9988",
            ServiceId = "DIRECTION",
            PhoneNumber = "+22990001122",
            WhatsAppNumber = "+22990001122",
            MustChangePassword = true,
            IsActive = true,
            CreatedAt = new DateTime(2026, 1, 15, 10, 30, 0, DateTimeKind.Utc)
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _userService.GetAllAsync();

        // Assert
        var dto = Assert.Single(result);
        Assert.Equal(user.Id, dto.Id);
        Assert.Equal("agent.test", dto.UserName);
        Assert.Equal("agent.test@archiveo.local", dto.Email);
        Assert.Equal("Jean", dto.FirstName);
        Assert.Equal("Dupont", dto.LastName);
        Assert.Equal("Directeur Administratif", dto.Function);
        Assert.Equal("MAT-9988", dto.Matricule);
        Assert.Equal("DIRECTION", dto.ServiceId);
        Assert.Equal("+22990001122", dto.Phone);
        Assert.Equal("+22990001122", dto.WhatsAppNumber);
        Assert.True(dto.MustChangePassword);
        Assert.True(dto.IsActive);
        Assert.Equal(user.CreatedAt, dto.CreatedAt);
    }

    [Fact]
    public async Task UsersController_GetAll_AdminWithPermission_ReturnsOkResult()
    {
        // Arrange
        _dbContext.Users.Add(new User { Id = Guid.NewGuid(), UserName = "u1", Email = "u1@test.local", LastName = "User1" });
        await _dbContext.SaveChangesAsync();

        var controller = new UsersController(_userService);

        // Act
        var actionResult = await controller.GetAll();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var users = Assert.IsAssignableFrom<List<Archiveo.Application.DTOs.Users.UserDto>>(okResult.Value);
        Assert.Single(users);
    }

    [Fact]
    public async Task PermissionAuthorizationHandler_DeniesAccess_WhenUserLacksReadPermission()
    {
        // Arrange
        var role = new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = "User", NormalizedName = "USER" };
        var user = new User { Id = Guid.NewGuid(), UserName = "std.user", Email = "std@test.local", LastName = "Standard" };
        _dbContext.Roles.Add(role);
        _dbContext.Users.Add(user);
        _dbContext.UserRoles.Add(new IdentityUserRole<Guid> { UserId = user.Id, RoleId = role.Id });
        await _dbContext.SaveChangesAsync();

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, "User")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
        var requirement = new PermissionRequirement("users.read");
        var context = new AuthorizationHandlerContext(new[] { requirement }, principal, null);

        // Act
        await _permissionHandler.HandleAsync(context);

        // Assert
        Assert.False(context.HasSucceeded);
    }

    [Fact]
    public async Task PermissionAuthorizationHandler_GrantsAccess_ForAdminRole()
    {
        // Arrange : Utilisateur avec rôle Admin
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, "Admin")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Bearer"));
        var requirement = new PermissionRequirement("users.read");
        var context = new AuthorizationHandlerContext(new[] { requirement }, principal, null);

        // Act
        await _permissionHandler.HandleAsync(context);

        // Assert
        Assert.True(context.HasSucceeded);
    }
}
