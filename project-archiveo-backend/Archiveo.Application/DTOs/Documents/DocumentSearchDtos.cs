using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Archiveo.Application.DTOs.Documents;

public class DocumentSearchRequest
{
    [MaxLength(200, ErrorMessage = "Le terme de recherche ne doit pas dépasser 200 caractères.")]
    public string? Query { get; set; }

    [MaxLength(100, ErrorMessage = "L'identifiant de type ne doit pas dépasser 100 caractères.")]
    public string? TypeId { get; set; }

    [MaxLength(100, ErrorMessage = "L'identifiant de catégorie ne doit pas dépasser 100 caractères.")]
    public string? CategoryId { get; set; }

    [MaxLength(100, ErrorMessage = "L'identifiant de sous-catégorie ne doit pas dépasser 100 caractères.")]
    public string? SubCategoryId { get; set; }

    [MaxLength(100, ErrorMessage = "L'identifiant de statut ne doit pas dépasser 100 caractères.")]
    public string? StatusId { get; set; }

    [MaxLength(100, ErrorMessage = "L'identifiant de confidentialité ne doit pas dépasser 100 caractères.")]
    public string? ConfidentialityId { get; set; }

    [MaxLength(100, ErrorMessage = "L'identifiant de service ne doit pas dépasser 100 caractères.")]
    public string? ServiceId { get; set; }

    [MaxLength(100, ErrorMessage = "L'identifiant de langue ne doit pas dépasser 100 caractères.")]
    public string? LanguageId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Le numéro de page doit être supérieur ou égal à 1.")]
    public int Page { get; set; } = 1;

    [Range(1, 100, ErrorMessage = "La taille de page doit être comprise entre 1 et 100.")]
    public int PageSize { get; set; } = 20;

    [MaxLength(50, ErrorMessage = "Le champ de tri ne doit pas dépasser 50 caractères.")]
    public string? SortBy { get; set; }

    [RegularExpression("^(?i)(asc|desc)$", ErrorMessage = "La direction du tri doit être 'asc' ou 'desc'.")]
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
