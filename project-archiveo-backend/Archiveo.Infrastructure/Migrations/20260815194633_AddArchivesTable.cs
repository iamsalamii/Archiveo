using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Archiveo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddArchivesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ArchiveRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Reference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: true),
                    TypeId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CategoryId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ServiceId = table.Column<string>(type: "text", nullable: true),
                    DepartmentId = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ArchivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RetentionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FinalSort = table.Column<string>(type: "text", nullable: true),
                    DestructionReason = table.Column<string>(type: "text", nullable: true),
                    DestroyedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DestroyedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    SiteId = table.Column<string>(type: "text", nullable: true),
                    LocationId = table.Column<string>(type: "text", nullable: true),
                    BoxReference = table.Column<string>(type: "text", nullable: true),
                    ShelfReference = table.Column<string>(type: "text", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArchiveRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ArchiveRecords_Documents_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "Documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ArchiveRecords_DocumentId",
                table: "ArchiveRecords",
                column: "DocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_ArchiveRecords_Reference",
                table: "ArchiveRecords",
                column: "Reference",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ArchiveRecords");
        }
    }
}
