using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Archiveo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLoansAndConsultations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ConsultationRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Reference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ConsultationTypeId = table.Column<string>(type: "text", nullable: true),
                    ConsultationDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Duration = table.Column<string>(type: "text", nullable: true),
                    Location = table.Column<string>(type: "text", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConsultationRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ConsultationRecords_Documents_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "Documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LoanRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Reference = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    BorrowerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BorrowerEmail = table.Column<string>(type: "text", nullable: false),
                    LoanTypeId = table.Column<string>(type: "text", nullable: true),
                    ReasonId = table.Column<string>(type: "text", nullable: true),
                    BorrowDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReturnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Location = table.Column<string>(type: "text", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoanRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoanRecords_Documents_DocumentId",
                        column: x => x.DocumentId,
                        principalTable: "Documents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConsultationRecords_DocumentId",
                table: "ConsultationRecords",
                column: "DocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_ConsultationRecords_Reference",
                table: "ConsultationRecords",
                column: "Reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LoanRecords_DocumentId",
                table: "LoanRecords",
                column: "DocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_LoanRecords_Reference",
                table: "LoanRecords",
                column: "Reference",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConsultationRecords");

            migrationBuilder.DropTable(
                name: "LoanRecords");
        }
    }
}
