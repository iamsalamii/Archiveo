'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ParameterSelect } from '@/components/shared/parameter-select';
import { ColorBadge } from '@/components/shared/color-badge';
import { useParameters } from '@/contexts/parameters-context';
import { useI18n } from '@/contexts/i18n-context';
import { api, type DocumentSearchRequest, type PagedResult } from '@/services/api';
import { isSessionAbortedError } from '@/services/api-client';
import type { GedDocument, SavedSearch } from '@/types';
import {
  Search,
  Save,
  Star,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_PAGE_SIZE = 20;

export default function SearchPage() {
  const { t } = useI18n();
  const { getItemName, getItem } = useParameters();
  const router = useRouter();

  // État des critères
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // État de pagination et restitution serveur
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagedData, setPagedData] = useState<PagedResult<GedDocument>>({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  // États d'exécution
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Garde-fous contre les collisions asynchrones et requêtes obsolètes
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const executeSearch = useCallback(
    async (currentPage: number, currentPageSize: number, currentSearch: string, currentFilters: Record<string, string>) => {
      // 1. Annulation de toute requête HTTP en vol pour éviter l'écrasement par une réponse plus lente
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const currentRequestId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const requestPayload: DocumentSearchRequest = {
          query: currentSearch.trim() || undefined,
          typeId: currentFilters.typeId,
          categoryId: currentFilters.categoryId,
          subCategoryId: currentFilters.subCategoryId,
          serviceId: currentFilters.serviceId,
          statusId: currentFilters.statusId,
          confidentialityId: currentFilters.confidentialityId,
          languageId: currentFilters.languageId,
          page: currentPage,
          pageSize: currentPageSize,
          sortBy: 'createdAt',
          sortDirection: 'desc',
        };

        const result = await api.searchDocuments(requestPayload, controller.signal);

        // Si une recherche plus récente a été émise entre-temps, ignorer ce résultat
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        setPagedData(result);
      } catch (err: unknown) {
        // Ignorer les annulations volontaires et les ruptures de session
        if (
          isSessionAbortedError(err) ||
          (err instanceof Error && (err.name === 'AbortError' || err.message?.includes('aborted')))
        ) {
          return;
        }

        if (currentRequestId === requestIdRef.current) {
          const message = err instanceof Error ? err.message : 'Erreur lors de la recherche.';
          setError(message);
        }
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Déclenchement de la recherche serveur avec debounce sur la saisie textuelle
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(page, pageSize, search, filters);
    }, 250);

    return () => clearTimeout(timer);
  }, [page, pageSize, search, filters, executeSearch]);

  const setFilter = (key: string, value: string) => {
    setPage(1); // Réinitialisation de la page lors d'un changement de filtre
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({});
    setSearch('');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagedData.totalPages && newPage !== page) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const saveSearch = () => {
    const name = `Recherche ${savedSearches.length + 1}`;
    setSavedSearches((prev) => [
      ...prev,
      {
        id: `s-${Date.now()}`,
        name,
        criteria: { search, ...filters },
        createdAt: new Date().toISOString(),
        favorite: false,
      },
    ]);
    toast.success(`Recherche « ${name} » enregistrée`);
  };

  const applySearch = (s: SavedSearch) => {
    setPage(1);
    setSearch(((s.criteria as Record<string, unknown>).search as string) ?? '');
    const { search: _omit, ...filterCriteria } = s.criteria as Record<string, unknown>;
    setFilters(filterCriteria as Record<string, string>);
    toast.success(`Recherche « ${s.name} » appliquée`);
  };

  const toggleFavorite = (id: string) => {
    setSavedSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s))
    );
  };

  const startRecord = pagedData.totalCount === 0 ? 0 : (pagedData.page - 1) * pagedData.pageSize + 1;
  const endRecord = Math.min(pagedData.page * pagedData.pageSize, pagedData.totalCount);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.search', 'Recherche multicritère')}
        subtitle={t('ocr.subtitle', 'Recherche simple, avancée et multicritère sécurisée')}
        icon={<Search className="h-6 w-6" />}
        actions={
          <Button variant="outline" className="gap-2" onClick={saveSearch}>
            <Save className="h-4 w-4" /> {t('common.save', 'Sauvegarder')}
          </Button>
        }
      />

      {/* Barre de recherche et options */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              {loading ? (
                <Loader2 className="absolute left-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              )}
              <Input
                placeholder="Rechercher par titre, référence, description..."
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" /> Filtres
            </Button>
            {(Object.keys(filters).length > 0 || search) && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" /> Effacer
              </Button>
            )}
          </div>

          {showAdvanced && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <ParameterSelect
                  groupCode="DOC_TYPE"
                  value={filters.typeId}
                  onValueChange={(v) => setFilter('typeId', v)}
                  showAll
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Catégorie</Label>
                <ParameterSelect
                  groupCode="CATEGORY"
                  value={filters.categoryId}
                  onValueChange={(v) => setFilter('categoryId', v)}
                  showAll
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Statut</Label>
                <ParameterSelect
                  groupCode="DOC_STATUS"
                  value={filters.statusId}
                  onValueChange={(v) => setFilter('statusId', v)}
                  showAll
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confidentialité</Label>
                <ParameterSelect
                  groupCode="CONFIDENTIALITY"
                  value={filters.confidentialityId}
                  onValueChange={(v) => setFilter('confidentialityId', v)}
                  showAll
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Service</Label>
                <ParameterSelect
                  groupCode="SERVICE"
                  value={filters.serviceId}
                  onValueChange={(v) => setFilter('serviceId', v)}
                  showAll
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Langue</Label>
                <ParameterSelect
                  groupCode="LANGUAGE"
                  value={filters.languageId}
                  onValueChange={(v) => setFilter('languageId', v)}
                  showAll
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Format</Label>
                <ParameterSelect
                  groupCode="FORMAT"
                  value={filters.formatId}
                  onValueChange={(v) => setFilter('formatId', v)}
                  showAll
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priorité</Label>
                <ParameterSelect
                  groupCode="PRIORITY"
                  value={filters.priorityId}
                  onValueChange={(v) => setFilter('priorityId', v)}
                  showAll
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recherches sauvegardées */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recherches sauvegardées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((s) => (
                <div key={s.id} className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className="cursor-pointer gap-1.5 py-1.5 hover:bg-primary/5"
                    onClick={() => applySearch(s)}
                  >
                    {s.favorite ? (
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ) : (
                      <Star className="h-3 w-3" />
                    )}
                    {s.name}
                  </Badge>
                  <button
                    onClick={() => toggleFavorite(s.id)}
                    className="text-muted-foreground hover:text-amber-400"
                    title={s.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        s.favorite ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erreur éventuelle */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeSearch(page, pageSize, search, filters)}
            className="gap-1 border-destructive/30 hover:bg-destructive/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Réessayer
          </Button>
        </div>
      )}

      {/* Résultats paginés */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">
              Résultats ({pagedData.totalCount})
            </CardTitle>
            {pagedData.totalCount > 0 && (
              <span className="text-xs text-muted-foreground">
                Affichage {startRecord}–{endRecord} sur {pagedData.totalCount} documents
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && pagedData.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm">Recherche des documents en cours...</p>
            </div>
          ) : pagedData.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun résultat trouvé pour vos critères.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {pagedData.items.map((doc) => {
                  const statusItem = getItem('DOC_STATUS', doc.statusId);
                  const typeItem = getItem('DOC_TYPE', doc.typeId);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => router.push(`/documents/${doc.id}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Search className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {doc.reference} — {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ColorBadge
                          name={getItemName('DOC_TYPE', doc.typeId)}
                          color={typeItem?.color}
                          icon={typeItem?.icon}
                        />
                        <ColorBadge
                          name={getItemName('DOC_STATUS', doc.statusId)}
                          color={statusItem?.color}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Barre de pagination */}
              {pagedData.totalPages > 1 && (
                <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between border-t">
                  <div className="text-xs text-muted-foreground">
                    Page {pagedData.page} sur {pagedData.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagedData.page - 1)}
                      disabled={!pagedData.hasPreviousPage || loading}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagedData.page + 1)}
                      disabled={!pagedData.hasNextPage || loading}
                      className="gap-1"
                    >
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
