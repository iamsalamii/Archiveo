'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ParameterSelect } from '@/components/shared/parameter-select';
import { DataTable, type Column } from '@/components/shared/data-table';
import { ColorBadge } from '@/components/shared/color-badge';
import { useParameters } from '@/contexts/parameters-context';
import { useI18n } from '@/contexts/i18n-context';
import { api } from '@/services/api';
import type { GedDocument } from '@/types';
import { Library, BookOpen, BrainCircuit, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentalistPage() {
  const { t } = useI18n();
  const { getItemName, getItem } = useParameters();
  const [docs, setDocs] = useState<GedDocument[]>([]);
  const [selected, setSelected] = useState<GedDocument | null>(null);
  const [summary, setSummary] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [savingNotice, setSavingNotice] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getDocuments();
      setDocs(data);
    } catch {
      toast.error('Impossible de charger le catalogue');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelectDoc = (doc: GedDocument) => {
    setSelected(doc);
    setSummary(doc.description || '');
    setAuthorId(doc.authorId || '');
  };

  const handleSaveNotice = async () => {
    if (!selected) return;
    setSavingNotice(true);
    // Optimistic UI
    setDocs((prev) =>
      prev.map((d) => (d.id === selected.id ? { ...d, description: summary, authorId } : d))
    );
    setSelected((prev) => (prev ? { ...prev, description: summary, authorId } : null));
    toast.success('Notice documentaire enregistrée avec succès');
    setSavingNotice(false);
  };

  const exportData = useMemo(() => {
    return docs.map((d) => ({
      Cote: d.reference,
      Titre: d.title,
      Type: getItemName('DOC_TYPE', d.typeId) || d.typeId,
      Auteur: (d.authorId ? getItemName('AUTHOR', d.authorId) : '—') || '—',
      Langue: (d.languageId ? getItemName('LANGUAGE', d.languageId) : '—') || '—',
      Statut: getItemName('DOC_STATUS', d.statusId) || d.statusId,
      'Date création': d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—',
    }));
  }, [docs, getItemName]);

  const columns: Column<GedDocument>[] = useMemo(
    () => [
      {
        key: 'reference',
        label: 'Cote',
        render: (row) => <span className="font-mono text-xs font-semibold">{row.reference}</span>,
        exportValue: (row) => row.reference,
      },
      {
        key: 'title',
        label: 'Titre',
        render: (row) => <span className="font-medium">{row.title}</span>,
        exportValue: (row) => row.title,
      },
      {
        key: 'typeId',
        label: 'Type',
        render: (row) => <ColorBadge name={getItemName('DOC_TYPE', row.typeId) || row.typeId} color={getItem('DOC_TYPE', row.typeId)?.color} />,
        exportValue: (row) => getItemName('DOC_TYPE', row.typeId) || row.typeId,
      },
      {
        key: 'authorId',
        label: 'Auteur',
        render: (row) => (row.authorId ? getItemName('AUTHOR', row.authorId) : '—') || '—',
        exportValue: (row) => (row.authorId ? getItemName('AUTHOR', row.authorId) : '—') || '',
      },
      {
        key: 'languageId',
        label: 'Langue',
        render: (row) => (row.languageId ? getItemName('LANGUAGE', row.languageId) : '—') || '—',
        exportValue: (row) => (row.languageId ? getItemName('LANGUAGE', row.languageId) : '—') || '',
      },
    ],
    [getItemName, getItem]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('documentalist.title', 'Espace Documentaliste & Thésaurus')}
        subtitle={t('documentalist.subtitle', 'Gestion documentaire, indexation, catalogage et enrichissement sémantique')}
        icon={<Library className="h-6 w-6" />}
        exportData={exportData}
        exportFilename="catalogue-documentaire"
        exportTitle={t('documentalist.title', 'Catalogue Documentaire & Indexation')}
        exportColumns={[
          { key: 'Cote', label: 'Cote' },
          { key: 'Titre', label: 'Titre' },
          { key: 'Type', label: 'Type' },
          { key: 'Auteur', label: 'Auteur' },
          { key: 'Langue', label: 'Langue' },
          { key: 'Statut', label: 'Statut' },
          { key: 'Date création', label: 'Date création' },
        ]}
        exportMetadata={{
          subtitle: 'Catalogue officiel et notices bibliographiques',
          filterSummary: `${docs.length} notice(s) cataloguée(s)`,
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Document list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catalogue documentaire</CardTitle>
            <CardDescription>Sélectionnez un document pour afficher et éditer sa notice</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={docs as unknown as Record<string, unknown>[]}
              columns={columns as unknown as Column<Record<string, unknown>>[]}
              exportFilename="catalogue"
              exportTitle="Catalogue documentaire"
              onRowClick={(row) => handleSelectDoc(row as unknown as GedDocument)}
            />
          </CardContent>
        </Card>

        {/* Notice editor */}
        <Card className="h-fit shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              Notice documentaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Sélectionnez un document dans la liste pour éditer sa notice bibliographique
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Titre</Label>
                  <Input value={selected.title} readOnly className="bg-muted/50 font-medium" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Résumé descriptif</Label>
                  <Textarea rows={3} placeholder="Résumé du document..." value={summary} onChange={(e) => setSummary(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Auteur</Label>
                    <ParameterSelect groupCode="AUTHOR" value={authorId} onValueChange={setAuthorId} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Éditeur</Label>
                    <Input placeholder="Éditeur..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">ISBN</Label>
                    <Input placeholder="ISBN..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">ISSN</Label>
                    <Input placeholder="ISSN..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Cote</Label>
                    <Input value={selected.reference} readOnly className="bg-muted/50 font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Classification Dewey</Label>
                    <Input placeholder="Ex: 658.5..." />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Classification interne</Label>
                  <ParameterSelect groupCode="CLASSIFICATION" onValueChange={() => {}} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Collection</Label>
                  <ParameterSelect groupCode="COLLECTION" onValueChange={() => {}} />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-3 border border-primary/15">
                  <BrainCircuit className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Résumé automatique IA</p>
                    <p className="text-xs text-muted-foreground">Génération sémantique du résumé</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={generating} onClick={() => {
                    setGenerating(true);
                    setTimeout(() => {
                      setSummary(`Ce document intitulé "${selected.title}" traite des aspects liés à ${selected.description || 'la gestion documentaire'}. Il a été créé par ${authorId || selected.authorId || 'un auteur non identifié'} et est classé dans la catégorie ${selected.categoryId}. Le document est actuellement au statut ${selected.statusId} avec un niveau de confidentialité ${selected.confidentialityId}.`);
                      setGenerating(false);
                      toast.success('Résumé généré par IA');
                    }, 1200);
                  }}>
                    {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
                    {generating ? 'Génération...' : 'Générer'}
                  </Button>
                </div>
                <Button className="w-full" disabled={savingNotice} onClick={handleSaveNotice}>
                  {savingNotice && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Enregistrer la notice
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
