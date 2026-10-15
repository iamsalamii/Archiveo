using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Archiveo.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCompositeIndexesForPerformance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ""IX_LoanRecords_IsActive_BorrowDate"" 
                ON ""LoanRecords"" (""IsActive"", ""BorrowDate"");
            ");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ""IX_Documents_IsActive_CreatedAt"" 
                ON ""Documents"" (""IsActive"", ""CreatedAt"");
            ");

            migrationBuilder.Sql(@"
                CREATE INDEX IF NOT EXISTS ""IX_ArchiveRecords_IsActive_ArchivedAt"" 
                ON ""ArchiveRecords"" (""IsActive"", ""ArchivedAt"");
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_LoanRecords_IsActive_BorrowDate"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Documents_IsActive_CreatedAt"";");
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_ArchiveRecords_IsActive_ArchivedAt"";");
        }
    }
}
