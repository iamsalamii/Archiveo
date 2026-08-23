using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Archiveo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentSignatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WhatsAppNumber",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DocumentSignatures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentId = table.Column<Guid>(type: "uuid", nullable: false),
                    DocumentTitle = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    DocumentReference = table.Column<string>(type: "text", nullable: false),
                    RequestedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RequestedByUserName = table.Column<string>(type: "text", nullable: false),
                    SignerUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    SignerName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SignerEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SignerPhone = table.Column<string>(type: "text", nullable: true),
                    SignerRole = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SignatureType = table.Column<string>(type: "text", nullable: true),
                    SignatureDataUrl = table.Column<string>(type: "text", nullable: true),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SignedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Sha256Hash = table.Column<string>(type: "text", nullable: true),
                    CertificateNumber = table.Column<string>(type: "text", nullable: true),
                    SignerIpAddress = table.Column<string>(type: "text", nullable: true),
                    RejectReason = table.Column<string>(type: "text", nullable: true),
                    NotificationChannel = table.Column<string>(type: "text", nullable: false),
                    SecurityPin = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentSignatures", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DocumentSignatures_DocumentId",
                table: "DocumentSignatures",
                column: "DocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentSignatures_RequestedByUserId",
                table: "DocumentSignatures",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DocumentSignatures_SignerUserId",
                table: "DocumentSignatures",
                column: "SignerUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DocumentSignatures");

            migrationBuilder.DropColumn(
                name: "WhatsAppNumber",
                table: "Users");
        }
    }
}
