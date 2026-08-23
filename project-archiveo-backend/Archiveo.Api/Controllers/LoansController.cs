using Archiveo.Api.Authorization;
using Archiveo.Application.DTOs.Loans;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/loans")]
[Authorize]
public class LoansController : ControllerBase
{
    private readonly LoanService _loanService;

    public LoansController(LoanService loanService)
    {
        _loanService = loanService;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    [Permission("loans.read")]
    public async Task<IActionResult> GetAllLoans()
    {
        var loans = await _loanService.GetAllLoansAsync();
        return Ok(loans);
    }

    [HttpGet("{id:guid}")]
    [Permission("loans.read")]
    public async Task<IActionResult> GetLoan(Guid id)
    {
        var loan = await _loanService.GetLoanByIdAsync(id);
        return loan == null ? NotFound() : Ok(loan);
    }

    [HttpPost]
    [Permission("loans.create")]
    public async Task<IActionResult> CreateLoan([FromBody] CreateLoanRequest request)
    {
        try
        {
            var loan = await _loanService.CreateLoanAsync(request, GetUserId());
            return Ok(loan);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/return")]
    [Permission("loans.return")]
    public async Task<IActionResult> ReturnLoan(Guid id)
    {
        try
        {
            var loan = await _loanService.ReturnLoanAsync(id);
            if (loan == null) return NotFound();
            return Ok(loan);
        }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/renew")]
    [Permission("loans.renew")]
    public async Task<IActionResult> RenewLoan(Guid id, [FromQuery] int days = 7)
    {
        try
        {
            var loan = await _loanService.RenewLoanAsync(id, days);
            if (loan == null) return NotFound();
            return Ok(loan);
        }
        catch (ArgumentOutOfRangeException ex) { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    [Permission("loans.update")]
    public async Task<IActionResult> UpdateLoan(Guid id, [FromBody] UpdateLoanRequest request)
    {
        try
        {
            var loan = await _loanService.UpdateLoanAsync(id, request, GetUserId());
            return loan == null ? NotFound() : Ok(loan);
        }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("{id:guid}")]
    [Permission("loans.delete")]
    public async Task<IActionResult> DeleteLoan(Guid id)
    {
        try
        {
            var deleted = await _loanService.DeleteLoanAsync(id, GetUserId());
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpGet("consultations")]
    [Permission("consultations.read")]
    public async Task<IActionResult> GetAllConsultations()
    {
        var consultations = await _loanService.GetAllConsultationsAsync();
        return Ok(consultations);
    }

    [HttpGet("consultations/{id:guid}")]
    [Permission("consultations.read")]
    public async Task<IActionResult> GetConsultation(Guid id)
    {
        var consultation = await _loanService.GetConsultationByIdAsync(id);
        return consultation == null ? NotFound() : Ok(consultation);
    }

    [HttpPost("consultations")]
    [Permission("consultations.create")]
    public async Task<IActionResult> CreateConsultation([FromBody] CreateConsultationRequest request)
    {
        try
        {
            var consultation = await _loanService.CreateConsultationAsync(request, GetUserId());
            return Ok(consultation);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("consultations/{id:guid}")]
    [Permission("consultations.update")]
    public async Task<IActionResult> UpdateConsultation(Guid id, [FromBody] UpdateConsultationRequest request)
    {
        var consultation = await _loanService.UpdateConsultationAsync(id, request, GetUserId());
        return consultation == null ? NotFound() : Ok(consultation);
    }

    [HttpDelete("consultations/{id:guid}")]
    [Permission("consultations.delete")]
    public async Task<IActionResult> DeleteConsultation(Guid id)
    {
        var deleted = await _loanService.DeleteConsultationAsync(id, GetUserId());
        return deleted ? NoContent() : NotFound();
    }
}