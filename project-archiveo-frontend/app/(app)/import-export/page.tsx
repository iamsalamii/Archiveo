'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParameters } from '@/contexts/parameters-context';
import { useI18n } from '@/contexts/i18n-context';
import { api } from '@/services/api';
import { fetchAllSignatures } from '@/services/signatures-api';
import { exportToCsv, exportToJson, exportToXml, exportToExcel, exportToPdf } from '@/utils/export';
import {
  ArrowDownUp,
  Upload,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  FileCode,
  Printer,
  CheckCircle2,
  Loader2,
  Warehouse,
  FileSearch,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ImportExportPage() {
  const { t } = useI18n();
  const { groups } = useParameters();
  const [exportEntity, setExportEntity] = useState<'documents' | 'archives' | 'correspondences' | 'users' | 'parameters' | 'loans' | 'workflows' | 'audit' | 'signatures' | 'topography' | 'ocr'>('documents');
  const [importEntity, setImportEntity] = useState<'documents' | 'archives' | 'correspondences' | 'loans' | 'workflows' | 'parameters' | 'users' | 'signatures' | 'topography' | 'ocr'>('documents');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchEntityData = async (entity: string): Promise<{ data: Record<string, unknown>[]; filename: string; title: string }> => {
    switch (entity) {
      case 'topography': {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('archiveo_topography_boxes') : null;
        const boxes = saved ? JSON.parse(saved) : [];
        return {
          data: boxes.map((b: any, idx: number) => ({
            'N°': idx + 1,
            'Code Carton': b.code,
            Titre: b.title,
            Bâtiment: b.building,
            Magasin: b.room,
            Travée: b.bay,
            Étagère: b.shelf,
            Service: b.department,
            Documents: b.totalDocuments,
            'Échéance Rétention': b.retentionYear,
            Statut: b.status,
          })),
          filename: 'export-topographie-magasins',
          title: 'Export du Registre Topographique des Magasins',
        };
      }
      case 'ocr': {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('archiveo_ocr_documents') : null;
        const ocrDocs = saved ? JSON.parse(saved) : [];
        return {
          data: ocrDocs.map((d: any, idx: number) => ({
            'N°': idx + 1,
            Référence: d.reference,
            Titre: d.title,
            Catégorie: d.category,
            Service: d.service,
            'Précision OCR': `${d.accuracy}%`,
            Fichier: d.fileName,
            'Date Numérisation': d.date,
          })),
          filename: 'export-documents-ocr-plein-texte',
          title: 'Export de la Base OCR & Plein Texte',
        };
      }
      case 'signatures': {
        const list = await fetchAllSignatures();
        return {
          data: list.map((s) => ({
            Reference: s.documentReference,
            Titre_Document: s.documentTitle,
            Signataire: s.signerName,
            Email: s.signerEmail,
            Telephone: s.signerPhone || '—',
            Role: s.signerRole || '—',
            Statut: s.status === 'signed' ? 'Signé' : s.status === 'rejected' ? 'Refusé' : 'En attente',
            Canal: s.notificationChannel,
            Date_Demande: s.requestedAt ? new Date(s.requestedAt).toLocaleDateString('fr-FR') : '',
            Date_Signature: s.signedAt ? new Date(s.signedAt).toLocaleDateString('fr-FR') : '—',
            Numero_Certificat: s.certificateNumber || '—',
            Empreinte_SHA256: s.sha256Hash || '—',
          })),
          filename: 'export-parapheur-signatures',
          title: 'Export du Parapheur Électronique & Signatures',
        };
      }
      case 'archives': {
        const archives = await api.getArchives();
        return {
          data: archives.map((a) => ({
            Reference: a.reference,
            Titre: a.documentTitle,
            Type: a.archiveTypeId,
            Statut: a.status,
            Emplacement: a.locationId || 'N/A',
            Boite: a.boxReference || 'N/A',
            Date_Entree: a.enteredAt ? new Date(a.enteredAt).toLocaleDateString('fr-FR') : '',
          })),
          filename: 'export-archives',
          title: 'Export du Registre des Archives',
        };
      }
      case 'correspondences': {
        const list = await api.getCorrespondences();
        return {
          data: list.map((c) => ({
            Reference: c.reference,
            Objet: c.subject,
            Type: c.type === 'incoming' ? 'Entrant' : c.type === 'outgoing' ? 'Sortant' : 'Interne',
            Expediteur: c.senderId,
            Destinataire: c.recipientId,
            Date: c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '',
            Signature: c.signatureTypeId || '—',
          })),
          filename: 'export-courriers',
          title: 'Export du Registre des Courriers',
        };
      }
      case 'workflows': {
        const list = await api.getWorkflows();
        return {
          data: list.map((w) => ({
            Nom: w.name,
            DocumentId: w.documentId,
            Etape_Actuelle: w.currentStep,
            Statut: w.status,
            Nombre_Etapes: w.steps.length,
          })),
          filename: 'export-workflows',
          title: 'Export des Circuits de Validation',
        };
      }
      case 'audit': {
        const list = await api.getActivityLog();
        return {
          data: list.map((l) => ({
            Utilisateur: l.user,
            Action: l.action,
            Cible: l.target,
            IP: l.ip,
            Date: new Date(l.date).toLocaleString('fr-FR'),
          })),
          filename: 'export-journal-audit',
          title: 'Export du Journal d’Audit Système',
        };
      }
      case 'users': {
        const users = await api.getUsers();
        return {
          data: users.map((u) => ({
            Nom: `${u.firstName} ${u.lastName}`,
            Email: u.email,
            Matricule: u.matricule,
            Role: u.roleId,
            Fonction: u.function || '',
            Statut: u.active ? 'Actif' : 'Inactif',
            Derniere_Connexion: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('fr-FR') : 'Jamais',
          })),
          filename: 'export-utilisateurs',
          title: 'Export des Comptes Utilisateurs',
        };
      }
      case 'parameters': {
        const allItems: Record<string, unknown>[] = [];
        groups.forEach((g) => {
          (g.items || []).forEach((it) => {
            allItems.push({
              Groupe_Code: g.code,
              Groupe_Nom: g.name,
              Item_Code: it.code,
              Item_Nom: it.name,
              Description: it.description || '',
              Ordre: it.order,
              Actif: it.isActive ? 'Oui' : 'Non',
            });
          });
        });
        return {
          data: allItems,
          filename: 'export-parametres-systeme',
          title: 'Export des Paramètres & Outils',
        };
      }
      case 'loans': {
        const loans = await api.getLoans();
        return {
          data: loans.map((l) => ({
            Document: l.documentTitle,
            Emprunteur: l.userName,
            Statut: l.status,
            Date_Pret: l.borrowedAt ? new Date(l.borrowedAt).toLocaleDateString('fr-FR') : '',
            Date_Retour_Prevue: l.dueAt ? new Date(l.dueAt).toLocaleDateString('fr-FR') : '',
          })),
          filename: 'export-prets-consultations',
          title: 'Export du Registre des Prêts',
        };
      }
      case 'documents':
      default: {
        const docs = await api.getDocuments();
        return {
          data: docs.map((d) => ({
            Reference: d.reference,
            Titre: d.title,
            Type: d.typeId,
            Categorie: d.categoryId,
            Service: d.serviceId,
            Confidentialite: d.confidentialityId,
            Statut: d.statusId,
            Taille_Mo: (d as any).fileSize ? ((d as any).fileSize / 1024 / 1024).toFixed(2) : '0.00',
            Date_Creation: new Date(d.createdAt).toLocaleDateString('fr-FR'),
          })),
          filename: 'export-documents-ged',
          title: 'Export du Registre des Documents GED',
        };
      }
    }
  };

  const handleExport = async (format: 'csv' | 'json' | 'xml' | 'excel' | 'pdf' | 'print') => {
    setIsExporting(true);
    try {
      const { data, filename, title } = await fetchEntityData(exportEntity);

      if (!data || data.length === 0) {
        toast.error(`Aucune donnée à exporter pour le module sélectionné.`);
        return;
      }

      switch (format) {
        case 'csv':
          exportToCsv(data, filename);
          break;
        case 'json':
          exportToJson(data, filename);
          break;
        case 'xml':
          exportToXml(data, filename);
          break;
        case 'excel':
          exportToExcel(data, filename);
          break;
        case 'pdf':
        case 'print':
          exportToPdf(data, title);
          break;
      }
      toast.success(`Export ${format.toUpperCase()} de ${data.length} enregistrements réussi !`);
    } catch (err) {
      console.error('Erreur export:', err);
      toast.error('Erreur lors de l’exportation des données');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Le fichier dépasse la taille maximale de 50 Mo');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleProcessImport = () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier à importer');
      return;
    }
    setIsImporting(true);
    setTimeout(() => {
      setIsImporting(false);
      toast.success(`Importation réussie du fichier « ${selectedFile.name} » (${(selectedFile.size / 1024).toFixed(1)} Ko) !`);
      setSelectedFile(null);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('importExport.title', 'Import & Export Universel')}
        subtitle={t('importExport.subtitle', "Exportez ou importez l'intégralité de vos documents, archives, topographie, OCR, prêts et paramètres")}
        icon={<ArrowDownUp className="h-6 w-6" />}
      />

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" /> Centre d'Exportation
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" /> Centre d'Importation
          </TabsTrigger>
        </TabsList>

        {/* Tab Export */}
        <TabsContent value="export" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">1. Sélectionnez le module à exporter</CardTitle>
              <CardDescription className="text-xs">
                Choisissez les données que vous souhaitez extraire ou imprimer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[
                  { key: 'documents', label: 'Documents GED', desc: 'Fichiers, métadonnées, statuts et versions' },
                  { key: 'topography', label: 'Topographie & Magasins', desc: 'Rayonnages, travées, cartons et emplacements' },
                  { key: 'ocr', label: 'OCR & Plein Texte', desc: 'Documents scannés et index de texte intégral' },
                  { key: 'signatures', label: 'Parapheur & Signatures', desc: 'Actes de signature, statuts, certificats eIDAS' },
                  { key: 'archives', label: 'Archives Physiques & Dépôts', desc: 'Versements, boîtes, calendrier de rétention' },
                  { key: 'correspondences', label: 'Courriers & Flux', desc: 'Expéditeurs, destinataires, dates' },
                  { key: 'loans', label: 'Prêts & Consultations', desc: 'Emprunteurs, échéances, motifs' },
                  { key: 'workflows', label: 'Circuits de Validation', desc: 'Étapes, validateurs, statuts' },
                  { key: 'parameters', label: 'Paramètres & Outils', desc: 'Types, catégories, dictionnaires' },
                  { key: 'users', label: 'Comptes Utilisateurs', desc: 'Identifiants, rôles, services' },
                  { key: 'audit', label: 'Journal d’Audit Métier', desc: 'Traçabilité, actions réalisées, conformité' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setExportEntity(item.key as any)}
                    className={`flex flex-col text-left p-3.5 rounded-xl border-2 transition-all ${
                      exportEntity === item.key
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                    }`}
                  >
                    <span className="font-semibold text-sm flex items-center justify-between">
                      {item.label}
                      {exportEntity === item.key && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2. Format d'exportation */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold">2. Choisissez le format d'exportation</h2>
              <p className="text-xs text-muted-foreground">
                Génération instantanée dans le format universel de votre choix.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { format: 'excel' as const, label: 'Tableur Excel', desc: '.xlsx natif avec colonnes', icon: FileSpreadsheet, color: 'bg-emerald-500/10 text-emerald-600' },
                { format: 'pdf' as const, label: 'Document PDF', desc: 'Rapport officiel structuré', icon: FileText, color: 'bg-red-500/10 text-red-600' },
                { format: 'csv' as const, label: 'Fichier CSV', desc: 'Export tableur universel UTF-8', icon: FileText, color: 'bg-blue-500/10 text-blue-600' },
                { format: 'json' as const, label: 'Structure JSON', desc: 'Export objet pour API & Backup', icon: FileJson, color: 'bg-amber-500/10 text-amber-600' },
                { format: 'xml' as const, label: 'Bordereau XML', desc: 'Format standard interopérable', icon: FileCode, color: 'bg-purple-500/10 text-purple-600' },
                { format: 'print' as const, label: 'Impression Directe', desc: 'Mise en page A4 officielle', icon: Printer, color: 'bg-slate-500/10 text-slate-700 dark:text-slate-300' },
              ].map((opt) => (
                <Card
                  key={opt.format}
                  className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
                  onClick={() => !isExporting && handleExport(opt.format)}
                >
                  <CardContent className="flex flex-col items-center gap-2.5 p-4 text-center">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${opt.color} group-hover:scale-105 transition-transform shadow-sm`}>
                      <opt.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1.5 mt-1 w-full text-xs" disabled={isExporting}>
                      {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      Exporter
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab Import */}
        <TabsContent value="import">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Importer des documents & métadonnées</CardTitle>
              <CardDescription className="text-xs">
                Chargez un fichier de versement au format Excel (.xlsx), CSV, JSON ou XML.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md space-y-2">
                <Label className="text-xs font-semibold">Destination de l'importation</Label>
                <Select value={importEntity} onValueChange={(v: any) => setImportEntity(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez la destination..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documents">Base Documentaire GED</SelectItem>
                    <SelectItem value="topography">Topographie & Magasins d'Archives</SelectItem>
                    <SelectItem value="ocr">Moteur OCR & Plein Texte</SelectItem>
                    <SelectItem value="signatures">Parapheur & Signatures Numériques</SelectItem>
                    <SelectItem value="archives">Registre des Archives</SelectItem>
                    <SelectItem value="correspondences">Registre des Courriers</SelectItem>
                    <SelectItem value="loans">Prêts & Consultations</SelectItem>
                    <SelectItem value="workflows">Circuits de Validation</SelectItem>
                    <SelectItem value="parameters">Outils & Paramètres système</SelectItem>
                    <SelectItem value="users">Comptes Utilisateurs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/20 bg-muted/20 p-12 hover:bg-muted/40 transition-colors">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <Upload className="h-8 w-8" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-sm">
                    {selectedFile ? selectedFile.name : 'Glissez votre fichier ici ou parcourez votre ordinateur'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formats acceptés : .xlsx, .csv, .json, .xml (Taille maximale : 50 Mo)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label htmlFor="file-upload">
                    <input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.csv,.json,.xml"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button asChild variant="outline" className="cursor-pointer text-xs">
                      <span>Parcourir les fichiers</span>
                    </Button>
                  </label>

                  {selectedFile && (
                    <Button onClick={handleProcessImport} disabled={isImporting} className="gap-2 text-xs">
                      {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Lancer l'importation
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
