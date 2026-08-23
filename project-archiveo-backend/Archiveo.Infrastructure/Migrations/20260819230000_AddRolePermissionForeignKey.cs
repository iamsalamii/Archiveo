using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Archiveo.Infrastructure.Migrations;

public partial class AddRolePermissionForeignKey : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DELETE FROM "RolePermissions" rp
            WHERE NOT EXISTS (
                SELECT 1 FROM "Roles" r WHERE r."Id" = rp."RoleId"
            );
            """);

        migrationBuilder.AddForeignKey(
            name: "FK_RolePermissions_Roles_RoleId",
            table: "RolePermissions",
            column: "RoleId",
            principalTable: "Roles",
            principalColumn: "Id",
            onDelete: ReferentialAction.Cascade);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_RolePermissions_Roles_RoleId",
            table: "RolePermissions");
    }
}