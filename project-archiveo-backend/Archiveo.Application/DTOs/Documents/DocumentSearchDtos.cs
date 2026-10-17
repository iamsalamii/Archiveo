using System;
using System.Collections.Generic;

namespace Archiveo.Application.DTOs.Documents;

public class DocumentSearchRequest
{
    public string? Query { get; set; }
    public string? TypeId { get; set; }
    public string? CategoryId { get; set; }
    public string? SubCategoryId { get; set; }
    public string? StatusId { get; set; }
    public string? ConfidentialityId { get; set; }
    public string? ServiceId { get; set; }
    public string? LanguageId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; }
    public string? SortDirection { get; set; }
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}
