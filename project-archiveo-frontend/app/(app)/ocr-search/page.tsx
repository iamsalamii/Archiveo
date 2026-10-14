'use client';

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileSearch,
  ScanText,
  Search,
  FileText,
  Upload,
  Sparkles,
  Copy,
  Check,
  Eye,
  Trash2,
  Brain,
  PlusCircle,
} from 'lucide-react';
import { DocumentViewerDialog, type DocumentViewerItem } from '@/components/documents/document-viewer-dialog';
import { useI18n } from '@/contexts/i18n-context';
import { toast } from 'sonner';

export interface OcrIndexedDocument {
  id: string;
  reference: string;
  title: string;
  category: string;
  service: string;
  date: string;
  accuracy: number;
  extractedText: string;
  matchSnippet?: string;
  fileName: string;
  fileSize: string;
}

const STORAGE_KEY = 'archiveo_ocr_documents';

const DEFAULT_OCR_DOCS: OcrIndexedDocument[] = [
  {
    id: 'ocr-001',
    reference: 'DOC-2025-001',
    title: "Convention d'Audit Financier et Commissariat aux Comptes 2025-2027",
    category: 'Juridique',
    service: 'Direction Juridique',
    date: '15 Janvier 2025',
    accuracy: 99.4,
    fileName: 'convention_audit_deloitte_2025_2027.pdf',
    fileSize: '2.45 Mo',
    extractedText:
      "ARTICLE 1 - OBJET DE LA CONVENTION. La présente convention a pour objet de définir les conditions dans lesquelles le cabinet Deloitte & Associés assurera la mission de commissariat aux comptes et de certification des comptes annuels de la société Archivéo pour les exercices 2025, 2026 et 2027 conformément aux normes d'audit international ISA et aux dispositions du Code de commerce. ARTICLE 4 - HONORAIRES ET RÈGLEMENT. Le budget global annuel des honoraires de certification s'établit à un montant forfaitaire de 45 000 EUR HT.",
  },
  {
    id: 'ocr-002',
    reference: 'DOC-2025-002',
    title: "Politique de Sécurité des Systèmes d'Information (PSSI v3.2)",
    category: 'Technique',
    service: "Systèmes d'Information",
    date: '10 Janvier 2025',
    accuracy: 98.8,
    fileName: 'pssi_archiveo_v3_2_signed.pdf',
    fileSize: '1.85 Mo',
    extractedText:
      "SECTION 3 - CONTRÔLE DES ACCÈS ET GESTION DES IDENTITÉS. Tout accès aux référentiels d'archives numériques et aux coffres-forts électroniques requiert une authentification forte à double facteur (2FA / FIDO2). Les privilèges d'administration système sont accordés selon le principe du moindre privilège (PoLP) et font l'objet d'une révision trimestrielle. Chiffrement obligatoire au repos via l'algorithme AES-256 et en transit par TLS 1.3.",
  },
  {
    id: 'ocr-003',
    reference: 'DOC-2025-008',
    title: "Accord d'Entreprise Télétravail & Flexibilité Hybride 2025-2028",
    category: 'Ressources Humaines',
    service: 'Ressources Humaines',
    date: '12 Janvier 2025',
    accuracy: 99.1,
    fileName: 'accord_teletravail_signe_2025.pdf',
    fileSize: '780 Ko',
    extractedText:
      "ARTICLE 3 - RYTHME ET MODALITÉS DU TÉLÉTRAVAIL. Les salariés bénéficiant d'une autonomie suffisante dans l'exercice de leurs fonctions peuvent exercer jusqu'à 3 jours de travail à distance par semaine. Un équipement informatique portable sécurisé ainsi qu'une indemnité forfaitaire mensuelle de prise en charge des frais professionnels sont alloués par la direction.",
  },
  {
    id: 'ocr-004',
    reference: 'DOC-2025-004',
    title: "Contrat Cadre Hébergement Cloud Souverain & HDS (OVHcloud Enterprise)",
    category: 'Juridique',
    service: "Systèmes d'Information",
    date: '20 Janvier 2025',
    accuracy: 97.9,
    fileName: 'contrat_cadre_ovhcloud_hds_draft_v2.pdf',
    fileSize: '3.12 Mo',
    extractedText:
      "ANNEXE DE SÉCURITÉ ET HÉBERGEMENT DE DONNÉES DE SANTÉ (HDS). Le prestataire garantit la localisation exclusive des datacenters en France métropolitaine et la qualification SecNumCloud délivrée par l'ANSSI. Les engagements de disponibilité de service (SLA) sont contractuellement fixés à 99,99% mensuel avec garantie de temps de rétablissement (GTR) inférieure à 2 heures.",
  },
  {
    id: 'ocr-005',
    reference: 'DOC-2025-010',
    title: 'Bail Commercial Siège Social - Tour Horizon 2024-2033',
    category: 'Juridique',
    service: 'Direction Juridique',
    date: '02 Décembre 2024',
    accuracy: 99.7,
    fileName: 'bail_commercial_tour_horizon_signe.pdf',
    fileSize: '5.21 Mo',
    extractedText:
      "BAIL COMMERCIAL STATUTAIRE SOUMIS AUX ARTICLES L. 145-1 ET SUIVANTS DU CODE DE COMMERCE. Entre la Société Foncière Horizon (Bailleur) et la Société Archivéo SAS (Preneur). Désignation des locaux : 2500 mètres carrés comprenant les plateaux des 12e et 13e étages ainsi que 300 mètres carrés de sous-sol technique aménagé pour magasins d'archivage physique haute densité.",
  },
];

export default function OcrSearchPage() {
  const { t } = useI18n();
  const [ocrDocs, setOcrDocs] = useState<OcrIndexedDocument[]>(DEFAULT_OCR_DOCS);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDocForViewer, setSelectedDocForViewer] = useState<DocumentViewerItem | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // État du numériseur OCR
  const [ocrFileName, setOcrFileName] = useState('');
  const [ocrFileSize, setOcrFileSize] = useState('');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [simulatedExtractedText, setSimulatedExtractedText] = useState('');
  const [copied, setCopied] = useState(false);

  // Charger les documents indexés avec fallback
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOcrDocs(parsed);
        } else {
          setOcrDocs(DEFAULT_OCR_DOCS);
        }
      } else {
        setOcrDocs(DEFAULT_OCR_DOCS);
      }
    } catch {
      setOcrDocs(DEFAULT_OCR_DOCS);
    }
  }, []);

  const saveOcrDocs = (newDocs: OcrIndexedDocument[]) => {
    setOcrDocs(newDocs);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocs));
    } catch {
      // ignore
    }
  };

  const categories = ['Juridique', 'Ressources Humaines', 'Finances', 'Technique', 'Direction', 'Général'];

  // Moteur de recherche plein texte avec extraction d'extraits contextuels
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return ocrDocs.filter((d) => selectedCategory === 'all' || d.category === selectedCategory);
    }

    const q = query.toLowerCase();

    return ocrDocs
      .filter((d) => {
        const matchText = d.extractedText.toLowerCase().includes(q);
        const matchMeta =
          d.title.toLowerCase().includes(q) ||
          d.reference.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.service.toLowerCase().includes(q);
        const matchCategory = selectedCategory === 'all' || d.category === selectedCategory;

        return (matchText || matchMeta) && matchCategory;
      })
      .map((d) => {
        const textLower = d.extractedText.toLowerCase();
        const index = textLower.indexOf(q);
        let snippet = '';

        if (index !== -1) {
          const start = Math.max(0, index - 60);
          const end = Math.min(d.extractedText.length, index + q.length + 90);
          snippet = (start > 0 ? '... ' : '') + d.extractedText.slice(start, end) + (end < d.extractedText.length ? ' ...' : '');
        } else {
          snippet = d.extractedText.slice(0, 140) + '...';
        }

        return {
          ...d,
          matchSnippet: snippet,
        };
      });
  }, [ocrDocs, query, selectedCategory]);

  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 font-bold px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleSimulateOcr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation type et taille
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Le fichier dépasse la taille maximale autorisée de 50 Mo');
      return;
    }

    setOcrFileName(file.name);
    setOcrFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} Mo`);
    setIsProcessingOcr(true);
    setSimulatedExtractedText('');

    setTimeout(() => {
      setIsProcessingOcr(false);
      const generated = `[EXTRACTION OCR RÉUSSIE — Moteur Archivéo DeepScan v2.4]
Fichier source : ${file.name}
Taille : ${(file.size / 1024).toFixed(1)} Ko • Format reconnu : ${file.type || 'Document PDF/Image'}
Date de numérisation : ${new Date().toLocaleString('fr-FR')}
Niveau de confiance global : 99.6%

TEXTE RECONNU & PRÊT À L'INDEXATION :
------------------------------------------------------------
DOCUMENT OFFICIEL VERSÉ — Réf dossier : DOC-${Math.floor(10000 + Math.random() * 90000)}
Objet : Versement documentaire et enregistrement dans la GED Archivéo.
Contenu vérifié et intègre. Reconnaissance de caractères effectuée avec succès.
Tous les mots-clés de ce document peuvent désormais être recherchés en plein texte.`;

      setSimulatedExtractedText(generated);
      toast.success(`Reconnaissance OCR de « ${file.name} » terminée !`);
    }, 1000);
  };

  const handleIndexScannedDocument = () => {
    if (!simulatedExtractedText || !ocrFileName) return;

    const ref = `OCR-${new Date().getFullYear()}-${String(ocrDocs.length + 1).padStart(3, '0')}`;
    const newDoc: OcrIndexedDocument = {
      id: `ocr-${Date.now()}`,
      reference: ref,
      title: ocrFileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      category: 'Général',
      service: 'Archives & GED',
      date: new Date().toISOString().split('T')[0],
      accuracy: 99.6,
      extractedText: simulatedExtractedText,
      fileName: ocrFileName,
      fileSize: ocrFileSize || '1.2 Mo',
    };

    saveOcrDocs([newDoc, ...ocrDocs]);
    toast.success(`Document « ${newDoc.title} » indexé dans la recherche plein texte !`);
  };

  const handleDeleteOcrDoc = (id: string, title: string) => {
    if (!confirm(`Supprimer l'index OCR de « ${title} » ?`)) return;
    const updated = ocrDocs.filter((d) => d.id !== id);
    saveOcrDocs(updated);
    toast.success('Document retiré de l’index OCR');
  };

  const handleCopy = () => {
    if (!simulatedExtractedText) return;
    navigator.clipboard.writeText(simulatedExtractedText);
    setCopied(true);
    toast.success('Texte OCR copié dans le presse-papier');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenViewer = (doc: OcrIndexedDocument) => {
    setSelectedDocForViewer({
      id: doc.id,
      title: doc.title,
      reference: doc.reference,
      fileName: doc.fileName,
      category: doc.category,
      service: doc.service,
      createdAt: doc.date,
      validated: true,
      validatedBy: 'Direction',
      validatedAt: doc.date,
      tags: ['OCR', 'Indexé', 'Texte Intégral'],
    });
    setViewerOpen(true);
  };

  const exportTableData = searchResults.map((r, idx) => ({
    'N°': idx + 1,
    Référence: r.reference,
    Titre: r.title,
    Catégorie: r.category,
    Service: r.service,
    'Précision OCR': `${r.accuracy}%`,
    Fichier: r.fileName,
    Date: r.date,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('ocr.title', 'Recherche OCR & Moteur Plein Texte')}
        subtitle={t('ocr.subtitle', 'Recherche instantanée dans le texte intégral de tous les documents scannés et numérisés')}
        icon={<FileSearch className="h-6 w-6" />}
        exportData={exportTableData}
        exportFilename="recherche-ocr-resultats"
        exportTitle={t('ocr.title', 'Résultats de Recherche Plein Texte & OCR')}
        exportMetadata={{
          subtitle: `Requête : « ${query || 'Tous les documents'} » • ${searchResults.length} document(s) trouvé(s)`,
          category: 'Reconnaissance Optique de Caractères et Indexation',
        }}
      />

      {/* Cartes d'indicateurs du moteur OCR */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase">Documents Indexés OCR</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-primary flex items-center justify-between">
              <span>{ocrDocs.length} Docs</span>
              <ScanText className="h-5 w-5 text-primary/60" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mt-1">100% consultables en plein texte</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase">Précision Moyenne</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              99.6 %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mt-1">Reconnaissance multilingue optimisée</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase">Mots Indexés</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-foreground">
              {ocrDocs.reduce((acc, d) => acc + d.extractedText.split(/\s+/).length, 0)} mots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mt-1">Index inversé en mémoire</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase">Temps de réponse</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <span>&lt; 10 ms</span>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mt-1">Recherche instantanée</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="search" className="gap-2 text-xs font-semibold">
            <Search className="h-3.5 w-3.5" />
            {t('ocr.fullTextSearch', 'Recherche Plein Texte')} ({searchResults.length})
          </TabsTrigger>
          <TabsTrigger value="scanner" className="gap-2 text-xs font-semibold">
            <ScanText className="h-3.5 w-3.5" />
            {t('ocr.scanNew', 'Numériseur & Extracteur OCR')}
          </TabsTrigger>
        </TabsList>

        {/* Onglet 1 : Recherche Plein Texte */}
        <TabsContent value="search" className="space-y-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('ocr.searchPlaceholder', "Rechercher n'importe quel mot ou phrase dans le contenu des documents...")}
                    className="pl-10 h-11 text-sm font-medium"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="absolute right-3 top-3 text-xs text-muted-foreground hover:text-foreground bg-muted px-1.5 py-0.5 rounded"
                    >
                      {t('common.clear', 'Effacer')}
                    </button>
                  )}
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-56 h-11">
                    <SelectValue placeholder={t('common.allCategories', 'Toutes catégories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.allCategories', 'Toutes catégories')}</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Liste des résultats avec extraits surlignés */}
          <div className="space-y-3">
            {searchResults.length > 0 ? (
              searchResults.map((doc) => (
                <Card key={doc.id} className="hover:border-primary/40 transition-all shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => handleOpenViewer(doc)}>
                            {doc.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="font-mono font-semibold text-primary">{doc.reference}</span>
                            <span>•</span>
                            <span>{doc.category}</span>
                            <span>•</span>
                            <span>{doc.service}</span>
                            <span>•</span>
                            <span>{doc.fileName} ({doc.fileSize})</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs">
                          Précision {doc.accuracy}%
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenViewer(doc)}
                          className="gap-1.5 h-8 text-xs font-medium"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Consulter
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteOcrDoc(doc.id, doc.title)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          title="Supprimer de l'index OCR"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted/40 border rounded-lg p-3.5 text-xs text-foreground/90 font-mono leading-relaxed">
                      <div className="flex items-center gap-1.5 text-[11px] font-sans font-bold text-muted-foreground uppercase mb-1.5">
                        <ScanText className="h-3.5 w-3.5 text-primary" />
                        <span>Extrait de texte détecté par l'OCR :</span>
                      </div>
                      <p className="whitespace-pre-line">
                        {highlightKeyword(doc.matchSnippet || doc.extractedText.slice(0, 160) + '...', query)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                  <FileSearch className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-base font-medium">Aucun document dans l'index OCR pour le moment.</p>
                  <p className="text-xs max-w-sm mx-auto">
                    Utilisez l'onglet « Numériseur & Extracteur OCR » ci-dessus pour charger vos fichiers et indexer leur contenu texte automatiquement.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Onglet 2 : Numériseur OCR */}
        <TabsContent value="scanner" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Téléversement de Document ou Image Scannée
                </CardTitle>
                <CardDescription className="text-xs">
                  Glissez-déposez un fichier (PDF, PNG, JPG, TIFF) pour exécuter l'extraction OCR instantanée.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:border-primary/60 transition-colors bg-muted/20">
                  <ScanText className="h-12 w-12 mx-auto text-primary/70 mb-3" />
                  <p className="text-sm font-semibold text-foreground">
                    Cliquez ou déposez votre document scanné ici
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    PDF, JPG, PNG jusqu'à 50 Mo • Reconnaissance automatique du texte
                  </p>
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.tiff"
                      onChange={handleSimulateOcr}
                      className="hidden"
                    />
                    <Button asChild className="gap-2 cursor-pointer shadow-sm">
                      <span>Sélectionner un fichier</span>
                    </Button>
                  </label>
                </div>

                {isProcessingOcr && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3 text-xs text-primary font-semibold">
                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span>Analyse vectorielle et reconnaissance optique des caractères en cours...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base font-bold">Texte Extrait par l'OCR</CardTitle>
                  <CardDescription className="text-xs">
                    {ocrFileName ? `Résultat pour : ${ocrFileName}` : 'En attente d’un document à numériser'}
                  </CardDescription>
                </div>
                {simulatedExtractedText && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="gap-1.5 h-8 text-xs font-medium"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copié !' : 'Copier'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleIndexScannedDocument}
                      className="gap-1.5 h-8 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Indexer dans la recherche
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 p-4">
                {simulatedExtractedText ? (
                  <textarea
                    readOnly
                    value={simulatedExtractedText}
                    className="w-full h-80 p-3 bg-muted/40 font-mono text-xs text-foreground rounded-lg border focus:outline-none resize-none leading-relaxed"
                  />
                ) : (
                  <div className="h-80 flex flex-col items-center justify-center text-center text-muted-foreground p-6">
                    <Brain className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium">Aucun texte extrait pour le moment.</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      Sélectionnez un document à gauche pour voir la transcription OCR instantanée.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <DocumentViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        document={selectedDocForViewer}
      />
    </div>
  );
}
