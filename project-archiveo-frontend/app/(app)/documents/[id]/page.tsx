'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ColorBadge } from '@/components/shared/color-badge';
import { ExportMenu } from '@/components/shared/export-menu';
import { DocumentPreview } from '@/components/shared/document-preview';
import { Timeline } from '@/components/shared/timeline';
import { ActivityLog } from '@/components/shared/activity-log';
import { useParameters } from '@/contexts/parameters-context';
import { api } from '@/services/api';
import { getIcon } from '@/utils/icons';
import { toast } from 'sonner';
import type { GedDocument } from '@/types';
import {
  FileText,
  ArrowLeft,
  Download,
  Pencil,
  History,
  MessageSquare,
  Paperclip,
  Tag,
  Link2,
  Workflow,
  MapPin,
  Shield,
  Clock,
  GitBranch,
  CheckCircle2,
  User,
  Calendar,
  Archive,
  Trash2,
  XCircle,
  ScanLine,
  FileSignature,
  Eye,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import {
  fetchDocument,
  validateDocument,
  archiveDocument,
  unarchiveDocument,
  deleteDocument,
  downloadDocument,
  fetchDocumentVersions,
} from '@/services/documents-api';
import { DocumentFormDialog } from '@/components/documents/document-form-dialog';
import { mapDocumentApiToGedDocument } from '@/services/api';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value ?? '—'}</span>
    </div>
  );
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getItemName, getItems, getItem } = useParameters();
  const [doc, setDoc] = useState<GedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const loadData = async () => {
    try {
      const [d, versions] = await Promise.all([
        fetchDocument(id),
        fetchDocumentVersions(id).catch(() => []),
      ]);
      const mapped = mapDocumentApiToGedDocument(d);
      if (versions && versions.length > 0) {
        mapped.versions = versions.map((v) => ({
          version: v.version,
          date: v.createdAt,
          author: v.createdBy,
          comment: v.title || `Version ${v.version}`,
          size: v.fileSize || 0,
        }));
        mapped.currentVersion = Math.max(...versions.map((v) => v.version));
      }
      setDoc(mapped);
    } catch {
      const fallback = await api.getDocument(id);
      setDoc(fallback ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDownload = async () => {
    if (!doc) return;
    try {
      await downloadDocument(doc.id, doc.title);
    } catch {
      toast.error('Téléchargement impossible ou aucun fichier disponible');
    }
  };

  const handleAction = async (action: string) => {
    if (!doc) return;
    try {
      switch (action) {
        case 'validate':
          await validateDocument(doc.id);
          toast.success('Document validé avec succès');
          await loadData();
          break;
        case 'publish':
          await api.saveDocument({ ...doc, statusId: 'PUBLIE', workflowState: 'Publié' });
          toast.success('Document publié');
          await loadData();
          break;
        case 'archive':
          await archiveDocument(doc.id);
          toast.success('Document archivé avec succès');
          await loadData();
          break;
        case 'declassify':
          await unarchiveDocument(doc.id);
          toast.success('Document désarchivé avec succès');
          await loadData();
          break;
        case 'destroy':
          if (confirm('Voulez-vous vraiment supprimer ce document définitivement ?')) {
            await deleteDocument(doc.id);
            toast.success('Document supprimé');
            router.push('/documents');
          }
          break;
        case 'scan':
          toast.info('Module de numérisation prêt');
          break;
        case 'ocr':
          toast.info('Indexation OCR déclenchée');
          break;
        case 'sign':
          toast.info('Module de signature électronique prêt');
          break;
      }
    } catch (error) {
      toast.error((error as Error).message || 'Erreur lors de l’opération');
    }
  };

  if (loading) {
    return <div className="h-96 animate-pulse rounded-lg bg-muted" />;
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Document introuvable</p>
        <Button onClick={() => router.push('/documents')}>Retour à la liste</Button>
      </div>
    );
  }

  const statusItem = getItem('DOC_STATUS', doc.statusId);
  const typeItem = getItem('DOC_TYPE', doc.typeId);
  const confItem = getItem('CONFIDENTIALITY', doc.confidentialityId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/documents')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{doc.title}</h1>
            {statusItem && <ColorBadge name={statusItem.name} color={statusItem.color} />}
          </div>
          <p className="text-sm text-muted-foreground">{doc.reference} — v{doc.currentVersion}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4" /> Aperçu
        </Button>
        <ExportMenu
          data={[doc] as unknown as Record<string, unknown>[]}
          filename={doc.reference}
          title={`Fiche document — ${doc.title}`}
        />
        <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
          <Download className="h-4 w-4" /> Télécharger
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Modifier
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <MoreVertical className="h-4 w-4" /> Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions document</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!doc.validated && (
              <DropdownMenuItem onClick={() => handleAction('validate')} className="gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Valider
              </DropdownMenuItem>
            )}
            {doc.statusId === 'VALIDE' && (
              <DropdownMenuItem onClick={() => handleAction('publish')} className="gap-2">
                <FileText className="h-4 w-4 text-blue-500" /> Publier
              </DropdownMenuItem>
            )}
            {doc.statusId !== 'ARCHIVE' && (
              <DropdownMenuItem onClick={() => handleAction('archive')} className="gap-2">
                <Archive className="h-4 w-4 text-violet-500" /> Archiver
              </DropdownMenuItem>
            )}
            {doc.statusId === 'ARCHIVE' && (
              <DropdownMenuItem onClick={() => handleAction('declassify')} className="gap-2">
                <XCircle className="h-4 w-4 text-amber-500" /> Déclasser
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleAction('destroy')} className="gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Détruire
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction('scan')} className="gap-2">
              <ScanLine className="h-4 w-4" /> Scanner
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('ocr')} className="gap-2">
              <ScanLine className="h-4 w-4" /> OCR
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction('sign')} className="gap-2">
              <FileSignature className="h-4 w-4" /> Signer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex w-full flex-wrap gap-1">
          <TabsTrigger value="general" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Général</TabsTrigger>
          <TabsTrigger value="metadata" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Métadonnées</TabsTrigger>
          <TabsTrigger value="classification" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Classification</TabsTrigger>
          <TabsTrigger value="lifecycle" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Cycle de vie</TabsTrigger>
          <TabsTrigger value="versions" className="gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Versions</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" /> Historique</TabsTrigger>
          <TabsTrigger value="comments" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Commentaires</TabsTrigger>
          <TabsTrigger value="attachments" className="gap-1.5"><Paperclip className="h-3.5 w-3.5" /> Pièces jointes</TabsTrigger>
          <TabsTrigger value="relations" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Relations</TabsTrigger>
          <TabsTrigger value="workflow" className="gap-1.5"><Workflow className="h-3.5 w-3.5" /> Workflow</TabsTrigger>
          <TabsTrigger value="location" className="gap-1.5"><MapPin className="h-3.5 w-3.5" /> Emplacement</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><History className="h-3.5 w-3.5" /> Journal</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Référence" value={doc.reference} />
                <InfoRow label="Titre" value={doc.title} />
                <InfoRow label="Description" value={doc.description} />
                <InfoRow label="Type" value={<ColorBadge name={getItemName('DOC_TYPE', doc.typeId)} color={typeItem?.color} icon={typeItem?.icon} />} />
                <InfoRow label="Catégorie" value={getItemName('CATEGORY', doc.categoryId)} />
                <InfoRow label="Sous-catégorie" value={doc.subCategoryId ? getItemName('SUB_CATEGORY', doc.subCategoryId) : '—'} />
                <InfoRow label="Service" value={getItemName('SERVICE', doc.serviceId ?? '')} />
                <InfoRow label="Direction" value={getItemName('DIRECTION', doc.directionId ?? '')} />
                <InfoRow label="Département" value={doc.departmentId ? getItemName('DEPARTMENT', doc.departmentId) : '—'} />
                <InfoRow label="Auteur" value={getItemName('AUTHOR', doc.authorId ?? '')} />
                <InfoRow label="Producteur" value={getItemName('PRODUCER', doc.producerId ?? '')} />
                <InfoRow label="Propriétaire" value={doc.ownerId ?? '—'} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata */}
        <TabsContent value="metadata">
          <Card>
            <CardHeader><CardTitle>Métadonnées</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Langue" value={getItemName('LANGUAGE', doc.languageId)} />
                <InfoRow label="Format" value={getItemName('FORMAT', doc.formatId)} />
                <InfoRow label="Support" value={getItemName('SUPPORT_TYPE', doc.supportId)} />
                <InfoRow label="État physique" value={doc.physicalStateId ? getItemName('PHYSICAL_STATE', doc.physicalStateId) : '—'} />
                <InfoRow label="Mots clés" value={
                  <div className="flex flex-wrap gap-1">
                    {doc.keywords.map((k) => (
                      <Badge key={k} variant="outline" className="text-xs">{getItemName('KEYWORD', k)}</Badge>
                    ))}
                  </div>
                } />
                <InfoRow label="Etiquettes" value={
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.map((tag) => {
                      const item = getItem('TAG', tag);
                      return <ColorBadge key={tag} name={getItemName('TAG', tag)} color={item?.color} />;
                    })}
                  </div>
                } />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Classification */}
        <TabsContent value="classification">
          <Card>
            <CardHeader><CardTitle>Classification & Confidentialité</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Niveau de confidentialité" value={<ColorBadge name={getItemName('CONFIDENTIALITY', doc.confidentialityId)} color={confItem?.color} />} />
                <InfoRow label="Niveau de sécurité" value={getItemName('SECURITY_LEVEL', doc.securityLevelId)} />
                <InfoRow label="Type de classement" value={doc.classificationId ? getItemName('CLASSIFICATION', doc.classificationId) : '—'} />
                <InfoRow label="Priorité" value={doc.priorityId ? getItemName('PRIORITY', doc.priorityId) : '—'} />
                <InfoRow label="Collection" value={doc.categoryId ? '—' : '—'} />
                <InfoRow label="Fonds" value="—" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lifecycle */}
        <TabsContent value="lifecycle">
          <Card>
            <CardHeader><CardTitle>Cycle de vie</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Type d'archives" value={doc.archiveTypeId ? getItemName('ARCHIVE_TYPE', doc.archiveTypeId) : '—'} />
                <InfoRow label="Durée de conservation" value={doc.retentionId ? getItemName('RETENTION', doc.retentionId) : '—'} />
                <InfoRow label="Sort final" value={doc.finalSortId ? getItemName('FINAL_SORT', doc.finalSortId) : '—'} />
                <InfoRow label="Date de création" value={new Date(doc.createdAt).toLocaleDateString('fr-FR')} />
                <InfoRow label="Date de modification" value={new Date(doc.updatedAt).toLocaleDateString('fr-FR')} />
                <InfoRow label="Date d'archivage" value={doc.archivedAt ? new Date(doc.archivedAt).toLocaleDateString('fr-FR') : '—'} />
                <InfoRow label="Date d'expiration" value={doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString('fr-FR') : '—'} />
                <InfoRow label="Validé" value={doc.validated ? 'Oui' : 'Non'} />
                <InfoRow label="Validé par" value={doc.validatedBy ?? '—'} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Versions */}
        <TabsContent value="versions">
          <Card>
            <CardHeader><CardTitle>Historique des versions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {doc.versions.map((v, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                      v{v.version}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{v.comment}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.author} — {new Date(v.date).toLocaleString('fr-FR')} — {(v.size / 1024).toFixed(0)} Ko
                      </p>
                    </div>
                    {v.version === doc.currentVersion && <Badge>Actuelle</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Historique des actions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {doc.auditLog.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <History className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm"><span className="font-medium">{entry.user}</span> — {entry.action}</p>
                      {entry.before && entry.after && (
                        <p className="text-xs text-muted-foreground">{entry.before} → {entry.after}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleString('fr-FR')} • {entry.ip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments">
          <Card>
            <CardHeader><CardTitle>Commentaires ({doc.comments.length})</CardTitle></CardHeader>
            <CardContent>
              {doc.comments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucun commentaire</p>
              ) : (
                <div className="space-y-3">
                  {doc.comments.map((c) => (
                    <div key={c.id} className="flex gap-3 rounded-lg border p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {c.author.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm">{c.content}</p>
                        <p className="text-xs text-muted-foreground">{c.author} — {new Date(c.date).toLocaleString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments */}
        <TabsContent value="attachments">
          <Card>
            <CardHeader><CardTitle>Pièces jointes ({doc.attachments.length})</CardTitle></CardHeader>
            <CardContent>
              {doc.attachments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucune pièce jointe</p>
              ) : (
                <div className="space-y-2">
                  {doc.attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                      <Paperclip className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{(a.size / 1024).toFixed(0)} Ko — {a.format}</p>
                      </div>
                      <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relations */}
        <TabsContent value="relations">
          <Card>
            <CardHeader><CardTitle>Documents liés ({doc.relations.length})</CardTitle></CardHeader>
            <CardContent>
              {doc.relations.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucune relation</p>
              ) : (
                <div className="space-y-2">
                  {doc.relations.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/documents/${r.documentId}`)}>
                      <Link2 className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{r.documentTitle}</p>
                        <p className="text-xs text-muted-foreground">{r.relationType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow */}
        <TabsContent value="workflow">
          <Card>
            <CardHeader><CardTitle>Workflow & Validation</CardTitle></CardHeader>
            <CardContent>
              <Timeline
                steps={[
                  { id: 's1', title: 'Création du document', status: 'completed', date: new Date(doc.createdAt).toLocaleString('fr-FR'), subtitle: doc.authorId ?? '' },
                  { id: 's2', title: 'Validation', status: doc.validated ? 'completed' : 'current', date: doc.validatedAt ? new Date(doc.validatedAt).toLocaleString('fr-FR') : 'En attente', subtitle: doc.validatedBy ?? 'En attente de validation' },
                  { id: 's3', title: 'Publication', status: doc.statusId === 'PUBLIE' || doc.statusId === 'ARCHIVE' ? 'completed' : 'pending', subtitle: doc.statusId === 'PUBLIE' ? 'Publié' : 'En attente' },
                  { id: 's4', title: 'Archivage', status: doc.statusId === 'ARCHIVE' ? 'completed' : 'pending', subtitle: doc.archivedAt ? new Date(doc.archivedAt).toLocaleDateString('fr-FR') : 'En attente' },
                ]}
              />
              {!doc.validated && (
                <Button className="mt-4 gap-2" onClick={() => handleAction('validate')}>
                  <CheckCircle2 className="h-4 w-4" /> Valider le document
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location */}
        <TabsContent value="location">
          <Card>
            <CardHeader><CardTitle>Emplacement physique & numérique</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoRow label="Site" value={doc.siteId ? getItemName('SITE', doc.siteId) : '—'} />
                <InfoRow label="Agence" value={doc.agencyId ? getItemName('AGENCY', doc.agencyId) : '—'} />
                <InfoRow label="Localisation" value={doc.locationId ? getItemName('LOCATION', doc.locationId) : '—'} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit log */}
        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>Journal des actions</CardTitle></CardHeader>
            <CardContent>
              <ActivityLog entries={doc.auditLog as unknown as { id: string; date: string; user: string; action: string; target: string; ip?: string; browser?: string; before?: string; after?: string }[]} showBeforeAfter />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={doc.title}
        format={doc.formatId}
      />

      <DocumentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        document={{
          id: doc.id,
          reference: doc.reference,
          title: doc.title,
          description: doc.description,
          typeId: doc.typeId,
          categoryId: doc.categoryId,
          subCategoryId: doc.subCategoryId,
          serviceId: doc.serviceId || 'DG',
          statusId: doc.statusId,
          confidentialityId: doc.confidentialityId,
          languageId: doc.languageId,
          fileSize: doc.attachments[0]?.size || 0,
          fileName: doc.attachments[0]?.name,
          version: doc.currentVersion,
          validated: !!doc.validated,
          retentionYears: 10,
          tags: doc.tags.join(','),
          keywords: doc.keywords.join(','),
          createdBy: doc.ownerId || '',
          createdByName: doc.authorId || '',
          createdAt: doc.createdAt,
          isActive: true,
          isArchived: doc.statusId === 'ARCHIVE',
        }}
        onSaved={loadData}
      />
    </div>
  );
}
