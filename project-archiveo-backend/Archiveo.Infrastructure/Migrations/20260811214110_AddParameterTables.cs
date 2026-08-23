using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Archiveo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddParameterTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ParameterGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Icon = table.Column<string>(type: "text", nullable: true),
                    Color = table.Column<string>(type: "text", nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParameterGroups", x => x.Id);
                    table.UniqueConstraint("AK_ParameterGroups_Code", x => x.Code);
                });

            migrationBuilder.CreateTable(
                name: "ParameterItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GroupCode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Color = table.Column<string>(type: "text", nullable: true),
                    Icon = table.Column<string>(type: "text", nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ParentId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParameterItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParameterItems_ParameterGroups_GroupCode",
                        column: x => x.GroupCode,
                        principalTable: "ParameterGroups",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ParameterItems_ParameterItems_ParentId",
                        column: x => x.ParentId,
                        principalTable: "ParameterItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ParameterGroups_Code",
                table: "ParameterGroups",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParameterItems_GroupCode_Code",
                table: "ParameterItems",
                columns: new[] { "GroupCode", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParameterItems_ParentId",
                table: "ParameterItems",
                column: "ParentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ParameterItems");

            migrationBuilder.DropTable(
                name: "ParameterGroups");
        }
    }
}
