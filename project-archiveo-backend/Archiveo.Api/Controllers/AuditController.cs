using Archiveo.Api.Authorization;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize]
public class AuditController : ControllerBase
{
    private readonly AuditService _auditService;

    public AuditController(AuditService auditService)
    {
        _auditService = auditService;
    }

    [HttpGet]
    [Permission("audit.read")]
    public async Task<IActionResult> GetAll([FromQuery] int limit = 200)
    {
        var logs = await _auditService.GetAllAsync(limit);
        return Ok(logs);
    }
}