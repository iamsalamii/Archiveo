using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Archiveo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Documents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Reference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    TypeId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CategoryId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SubCategoryId = table.Column<string>(type: "text", nullable: true),
                    ServiceId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    StatusId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ConfidentialityId = table.Column<string>(type: "text", nullable: true),
                    LanguageId = table.Column<string>(type: "text", nullable: true),
                    FileName = table.Column<string>(type: "text", nullable: true),
                    FilePath = table.Column<string>(type: "text", nullable: true),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    MimeType = table.Column<string>(type: "text", nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    ParentVersionId = table.Column<Guid>(type: "uuid", nullable: true),
                    Validated = table.Column<bool>(type: "boolean", nullable: false),
                    ValidatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    ValidatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RetentionYears = table.Column<int>(type: "integer", nullable: false),
                    Tags = table.Column<string>(type: "text", nullable: true),
                    Keywords = table.Column<string>(type: "text", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Documents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Documents_Reference",
                table: "Documents",
                column: "Reference",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Documents");
        }
    }
}
