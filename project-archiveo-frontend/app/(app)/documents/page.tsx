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
import { useI18n } from '@/contexts/i18n-context';
import {
  fetchDocuments,
  deleteDocument,
  validateDocument,
  downloadDocument,
  getDownloadErrorMessage,
  type DocumentApi,
} from '@/services/documents-api';
import { DocumentFormDialog } from '@/components/documents/document-form-dialog';
import { DocumentViewerDialog, type DocumentViewerItem } from '@/components/documents/document-viewer-dialog';
import { FileText, Plus, Search, Download, CheckCircle2, Trash2, Pencil, Eye } from 'lucide-react';
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
  const { t } = useI18n();
  const { getItemName, getItems } = useParameters();
  const [docs, setDocs] = useState<DocumentApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentApi | null>(null);

  // Visionneuse Documentaire In-App
  const [viewerDoc, setViewerDoc] = useState<DocumentViewerItem | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

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
    return filtered.map((d, idx) => ({
      'N°': idx + 1,
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
    // Optimistic UI : suppression instantanée du tableau
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
    // Optimistic UI : validation instantanée
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
      toast.success(`Téléchargement de « ${d.fileName || d.title} » démarré`);
    } catch (err: unknown) {
      const errorMsg = getDownloadErrorMessage(err);
      if (errorMsg) {
        toast.error(errorMsg);
      }
    }
  };

  const handleOpenViewer = (d: DocumentApi) => {
    setViewerDoc({
      id: d.id,
      title: d.title,
      reference: d.reference,
      fileName: d.fileName,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      category: getItemName('DOC_CATEGORY', d.categoryId) || d.categoryId,
      type: getItemName('DOC_TYPE', d.typeId) || d.typeId,
      confidentiality: d.confidentialityId ? (getItemName('CONFIDENTIALITY', d.confidentialityId) || d.confidentialityId) : 'Standard',
      service: getItemName('SERVICE', d.serviceId) || d.serviceId,
      createdAt: d.createdAt,
      validated: d.validated,
      validatedBy: d.validated ? 'Direction' : undefined,
      validatedAt: d.createdAt,
      version: d.version,
      tags: typeof d.tags === 'string' ? [d.tags] : Array.isArray(d.tags) ? d.tags : [],
    });
    setViewerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('docs.title', 'Documents GED')}
        subtitle={t('docs.subtitle', 'Gestion électronique des documents et cycle de vie')}
        icon={<FileText className="h-6 w-6" />}
        exportData={exportData}
        exportFilename="registre-documents-ged"
        exportTitle={t('docs.title', 'Registre des Documents GED')}
        exportColumns={[
          { key: 'Référence', label: t('common.reference', 'Référence') },
          { key: 'Titre', label: t('common.title', 'Titre') },
          { key: 'Type', label: t('common.type', 'Type') },
          { key: 'Catégorie', label: t('common.category', 'Catégorie') },
          { key: 'Service', label: t('common.service', 'Service') },
          { key: 'Statut', label: t('common.status', 'Statut') },
          { key: 'Taille', label: t('common.size', 'Taille') },
          { key: 'Date création', label: t('common.createdAt', 'Date création') },
        ]}
        exportMetadata={{
          subtitle: 'Inventaire officiel des documents GED archivés et actifs',
          filterSummary: `${filtered.length} document(s) sélectionné(s)`,
        }}
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2 shadow-sm font-medium">
            <Plus className="h-4 w-4" /> {t('docs.new', 'Nouveau document')}
          </Button>
        }
      />

      {/* Filtres */}
      <Card className="shadow-sm">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('docs.searchPlaceholder', 'Rechercher...')} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder={t('common.type', 'Type')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('docs.filterCategory', 'Tous les types')}</SelectItem>
              {getItems('DOC_TYPE').map((i) => (
                <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder={t('common.status', 'Statut')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('docs.filterStatus', 'Tous les statuts')}</SelectItem>
              {getItems('DOC_STATUS').map((i) => (
                <SelectItem key={i.id} value={i.code}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center text-sm font-medium text-muted-foreground">
            {filtered.length} {t('dashboard.totalDocuments', 'Documents')}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
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
                      <TableCell className="font-medium cursor-pointer hover:text-primary transition-colors" onClick={() => handleOpenViewer(d)}>
                        {d.title}
                      </TableCell>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenViewer(d)}
                            className="text-primary hover:bg-primary/10"
                            title="Consulter dans la visionneuse in-app"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* Formulaire Dialog */}
      <DocumentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        document={editing}
        onSaved={() => load(true)}
      />

      {/* Visionneuse Documentaire In-App */}
      <DocumentViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        document={viewerDoc}
      />
    </div>
  );
}