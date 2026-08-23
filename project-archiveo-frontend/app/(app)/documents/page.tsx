'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useParameters } from '@/contexts/parameters-context';
import {
  fetchDocuments, deleteDocument, validateDocument, downloadDocument, DocumentApi,
} from '@/services/documents-api';
import { DocumentFormDialog } from '@/components/documents/document-form-dialog';
import { FileText, Plus, Search, Download, CheckCircle2, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function statusVariant(status: string) {
  switch (status) {
    case 'VALIDE': return 'default' as const;
    case 'BROUILLON': return 'secondary' as const;
    case 'EN_REVISION': return 'outline' as const;
    case 'ARCHIVE': return 'secondary' as const;
    default: return 'outline' as const;
  }
}

export default function DocumentsPage() {
  const { getItemName, getItems } = useParameters();
  const [docs, setDocs] = useState<DocumentApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentApi | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchDocuments();
      setDocs(data);
    } catch {
      if (!silent) toast.error('Impossible de charger les documents');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.reference.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || d.typeId === typeFilter;
      const matchStatus = statusFilter === 'all' || d.statusId === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [docs, search, typeFilter, statusFilter]);

  const exportData = useMemo(() => {
    return filtered.map((d) => ({
      Référence: d.reference,
      Titre: d.title,
      Type: getItemName('DOC_TYPE', d.typeId) || d.typeId,
      Catégorie: getItemName('DOC_CATEGORY', d.categoryId) || d.categoryId,
      Service: getItemName('SERVICE', d.serviceId) || d.serviceId,
      Statut: getItemName('DOC_STATUS', d.statusId) || d.statusId,
      Taille: formatSize(d.fileSize),
      'Date création': d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—',
    }));
  }, [filtered, getItemName]);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;
    const previousDocs = [...docs];
    // Optimistic UI
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.success('Document supprimé');
    try {
      await deleteDocument(id);
      load(true);
    } catch {
      setDocs(previousDocs);
      toast.error('Erreur lors de la suppression du document');
    }
  };

  const handleValidate = async (id: string) => {
    const previousDocs = [...docs];
    // Optimistic UI
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, validated: true, statusId: 'VALIDE' } : d))
    );
    toast.success('Document validé');
    try {
      await validateDocument(id);
      load(true);
    } catch {
      setDocs(previousDocs);
      toast.error('Erreur lors de la validation du document');
    }
  };

  const handleDownload = async (d: DocumentApi) => {
    try {
      await downloadDocument(d.id, d.fileName || d.title);
    } catch {
      toast.error('Aucun fichier associé');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Gestion électronique des documents et cycle de vie"
        icon={<FileText className="h-6 w-6" />}
        exportData={exportData}
        exportFilename="registre-documents-ged"
        exportTitle="Registre des Documents GED"
        exportColumns={[
          { key: 'Référence', label: 'Référence' },
          { key: 'Titre', label: 'Titre du document' },
          { key: 'Type', label: 'Type' },
          { key: 'Catégorie', label: 'Catégorie' },
          { key: 'Service', label: 'Service' },
          { key: 'Statut', label: 'Statut' },
          { key: 'Taille', label: 'Taille' },
          { key: 'Date création', label: 'Date création' },
        ]}
        exportMetadata={{
          subtitle: 'Inventaire officiel des documents GED archivés et actifs',
          filterSummary: `${filtered.length} document(s) sélectionné(s)`,
        }}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau document
          </Button>
        }
      />

      {/* Filtres */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {getItems('DOC_TYPE').map((i) => (
                <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {getItems('DOC_STATUS').map((i) => (
                <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center text-sm font-medium text-muted-foreground">
            {filtered.length} document(s)
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Aucun document trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((d) => (
                    <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold">{d.reference}</TableCell>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell>{getItemName('DOC_TYPE', d.typeId)}</TableCell>
                      <TableCell>{getItemName('SERVICE', d.serviceId)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(d.statusId)}>
                          {getItemName('DOC_STATUS', d.statusId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatSize(d.fileSize)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {d.fileName && (
                            <Button variant="ghost" size="icon" onClick={() => handleDownload(d)} title="Télécharger">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {!d.validated && (
                            <Button variant="ghost" size="icon" onClick={() => handleValidate(d.id)} title="Valider">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(d); setFormOpen(true); }} title="Modifier">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)} title="Supprimer">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        document={editing}
        onSaved={() => load(true)}
      />
    </div>
  );
}