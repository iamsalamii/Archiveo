using Archiveo.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Archiveo.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }
    public DbSet<ParameterGroup> ParameterGroups => Set<ParameterGroup>();
    public DbSet<ParameterItem> ParameterItems => Set<ParameterItem>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentVersionRecord> DocumentVersions => Set<DocumentVersionRecord>();
    public DbSet<ArchiveRecord> ArchiveRecords => Set<ArchiveRecord>();
    public DbSet<LoanRecord> LoanRecords => Set<LoanRecord>();
    public DbSet<ConsultationRecord> ConsultationRecords => Set<ConsultationRecord>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Correspondence> Correspondences => Set<Correspondence>();
    public DbSet<Workflow> Workflows => Set<Workflow>();
    public DbSet<WorkflowStep> WorkflowSteps => Set<WorkflowStep>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<DocumentSignature> DocumentSignatures => Set<DocumentSignature>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
        });

        builder.Entity<IdentityRole<Guid>>(entity =>
        {
            entity.ToTable("Roles");
        });

        builder.Entity<IdentityUserRole<Guid>>(entity =>
        {
            entity.ToTable("UserRoles");
        });

        builder.Entity<IdentityUserClaim<Guid>>(entity =>
        {
            entity.ToTable("UserClaims");
        });

        builder.Entity<IdentityUserLogin<Guid>>(entity =>
        {
            entity.ToTable("UserLogins");
        });

        builder.Entity<IdentityRoleClaim<Guid>>(entity =>
        {
            entity.ToTable("RoleClaims");
        });

        builder.Entity<IdentityUserToken<Guid>>(entity =>
        {
            entity.ToTable("UserTokens");
        });

        builder.Entity<ParameterGroup>(entity =>
        {
            entity.ToTable("ParameterGroups");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
        });

        builder.Entity<ParameterItem>(entity =>
        {
            entity.ToTable("ParameterItems");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.GroupCode, e.Code }).IsUnique();
            entity.Property(e => e.GroupCode).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);

            // Relation avec le groupe
            entity.HasOne(e => e.Group)
                  .WithMany(g => g.Items)
                  .HasForeignKey(e => e.GroupCode)
                  .HasPrincipalKey(g => g.Code)
                  .OnDelete(DeleteBehavior.Cascade);

            // Relation parent-enfant (self-reference)
            entity.HasOne(e => e.Parent)
                  .WithMany(e => e.Children)
                  .HasForeignKey(e => e.ParentId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Document>(entity =>
        {
            entity.ToTable("Documents");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Reference).IsUnique();
            entity.Property(e => e.Reference).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(255);
            entity.Property(e => e.TypeId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CategoryId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ServiceId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.StatusId).IsRequired().HasMaxLength(50);
        });

        builder.Entity<DocumentVersionRecord>(entity =>
        {
            entity.ToTable("DocumentVersions");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.DocumentId, e.Version }).IsUnique();
            entity.HasOne<Document>()
                .WithMany()
                .HasForeignKey(e => e.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ArchiveRecord>(entity =>
        {
            entity.ToTable("ArchiveRecords");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Reference).IsUnique();
            entity.Property(e => e.Reference).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(255);
            entity.Property(e => e.TypeId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CategoryId).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.Document)
                  .WithMany()
                  .HasForeignKey(e => e.DocumentId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<LoanRecord>(entity =>
        {
            entity.ToTable("LoanRecords");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Reference).IsUnique();
            entity.Property(e => e.Reference).IsRequired().HasMaxLength(50);
            entity.Property(e => e.BorrowerName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.Document)
                  .WithMany()
                  .HasForeignKey(e => e.DocumentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ConsultationRecord>(entity =>
        {
            entity.ToTable("ConsultationRecords");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Reference).IsUnique();
            entity.Property(e => e.Reference).IsRequired().HasMaxLength(50);
            entity.Property(e => e.UserName).IsRequired().HasMaxLength(200);

            entity.HasOne(e => e.Document)
                  .WithMany()
                  .HasForeignKey(e => e.DocumentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Correspondence>(entity =>
        {
            entity.ToTable("Correspondences");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Reference).IsUnique();
            entity.Property(e => e.Reference).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Subject).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(30);

            entity.HasOne(e => e.Document)
                  .WithMany()
                  .HasForeignKey(e => e.DocumentId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Workflow>(entity =>
        {
            entity.ToTable("Workflows");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);

            entity.HasOne(e => e.Document)
                  .WithMany()
                  .HasForeignKey(e => e.DocumentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Steps)
                  .WithOne(s => s.Workflow)
                  .HasForeignKey(s => s.WorkflowId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<WorkflowStep>(entity =>
        {
            entity.ToTable("WorkflowSteps");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(150);
            entity.Property(e => e.ValidatorRole).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
        });

        builder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notifications");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Message).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Category).HasMaxLength(100);
            entity.Property(e => e.Link).HasMaxLength(500);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
        });

        builder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLogs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.UserName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Action).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Target).HasMaxLength(500);
            entity.Property(e => e.TargetType).HasMaxLength(100);
            entity.HasIndex(e => e.Timestamp);
        });

        builder.Entity<Permission>(entity =>
        {
            entity.ToTable("Permissions");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Module).IsRequired().HasMaxLength(50);
        });

        builder.Entity<RolePermission>(entity =>
        {
            entity.ToTable("RolePermissions");
            entity.HasKey(e => new { e.RoleId, e.PermissionId });

            entity.HasOne(e => e.Permission)
                  .WithMany()
                  .HasForeignKey(e => e.PermissionId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<IdentityRole<Guid>>()
                .WithMany()
                .HasForeignKey(e => e.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<DocumentSignature>(entity =>
        {
            entity.ToTable("DocumentSignatures");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DocumentTitle).IsRequired().HasMaxLength(255);
            entity.Property(e => e.SignerName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.SignerEmail).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.HasIndex(e => e.DocumentId);
            entity.HasIndex(e => e.SignerUserId);
            entity.HasIndex(e => e.RequestedByUserId);
        });
    }
}