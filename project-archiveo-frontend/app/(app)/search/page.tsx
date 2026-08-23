'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { api } from '@/services/api';
import type { GedDocument, SavedSearch } from '@/types';
import { Search, Save, Star, Filter, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SearchPage() {
  const { getItemName, getItems, getItem } = useParameters();
  const router = useRouter();
  const [docs, setDocs] = useState<GedDocument[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    api.getDocuments().then(setDocs);
  }, []);

  const results = useMemo(() => {
    return docs.filter((d) => {
      if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.reference.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      for (const [key, value] of Object.entries(filters)) {
        if (value && value !== '__all__' && d[key as keyof GedDocument] !== value) {
          return false;
        }
      }
      return true;
    });
  }, [docs, search, filters]);

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearch('');
  };

  const saveSearch = () => {
    const name = `Recherche ${savedSearches.length + 1}`;
    setSavedSearches((prev) => [
      ...prev,
      { id: `s-${Date.now()}`, name, criteria: { search, ...filters }, createdAt: new Date().toISOString(), favorite: false },
    ]);
  };

  const applySearch = (s: SavedSearch) => {
    setSearch((s.criteria as Record<string, unknown>).search as string ?? '');
    const { search: _omit, ...filterCriteria } = s.criteria as Record<string, unknown>;
    setFilters(filterCriteria as Record<string, string>);
    toast.success(`Recherche « ${s.name} » appliquée`);
  };

  const toggleFavorite = (id: string) => {
    setSavedSearches((prev) => prev.map((s) => s.id === id ? { ...s, favorite: !s.favorite } : s));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recherche"
        subtitle="Recherche simple, avancée et multicritère"
        icon={<Search className="h-6 w-6" />}
        actions={
          <Button variant="outline" className="gap-2" onClick={saveSearch}>
            <Save className="h-4 w-4" /> Sauvegarder
          </Button>
        }
      />

      {/* Simple search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, référence, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)} className="gap-2">
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
                <ParameterSelect groupCode="DOC_TYPE" value={filters.typeId} onValueChange={(v) => setFilter('typeId', v)} showAll />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Catégorie</Label>
                <ParameterSelect groupCode="CATEGORY" value={filters.categoryId} onValueChange={(v) => setFilter('categoryId', v)} showAll />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Statut</Label>
                <ParameterSelect groupCode="DOC_STATUS" value={filters.statusId} onValueChange={(v) => setFilter('statusId', v)} showAll />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confidentialité</Label>
                <ParameterSelect groupCode="CONFIDENTIALITY" value={filters.confidentialityId} onValueChange={(v) => setFilter('confidentialityId', v)} showAll />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Service</Label>
                <ParameterSelect groupCode="SERVICE" value={filters.serviceId} onValueChange={(v) => setFilter('serviceId', v)} showAll />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Langue</Label>
                <ParameterSelect groupCode="LANGUAGE" value={filters.languageId} onValueChange={(v) => setFilter('languageId', v)} showAll />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Format</Label>
                <ParameterSelect groupCode="FORMAT" value={filters.formatId} onValueChange={(v) => setFilter('formatId', v)} showAll />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priorité</Label>
                <ParameterSelect groupCode="PRIORITY" value={filters.priorityId} onValueChange={(v) => setFilter('priorityId', v)} showAll />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved searches */}
      {savedSearches.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recherches sauvegardées</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((s) => (
                <div key={s.id} className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className="cursor-pointer gap-1.5 py-1.5 hover:bg-primary/5"
                    onClick={() => applySearch(s)}
                  >
                    {s.favorite ? <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> : <Star className="h-3 w-3" />}
                    {s.name}
                  </Badge>
                  <button
                    onClick={() => toggleFavorite(s.id)}
                    className="text-muted-foreground hover:text-amber-400"
                    title={s.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    <Star className={`h-3.5 w-3.5 ${s.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Résultats ({results.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun résultat</p>
          ) : (
            <div className="space-y-2">
              {results.map((doc) => {
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
                    <div className="flex-1">
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.reference} — {new Date(doc.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <ColorBadge name={getItemName('DOC_TYPE', doc.typeId)} color={typeItem?.color} icon={typeItem?.icon} />
                    <ColorBadge name={getItemName('DOC_STATUS', doc.statusId)} color={statusItem?.color} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
