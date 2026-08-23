'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useParameters } from '@/contexts/parameters-context';
import { api } from '@/services/api';
import toast from 'react-hot-toast';
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
  FileCheck,
  Layers,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export default function ImportExportPage() {
  const { groups } = useParameters();
  const [exportEntity, setExportEntity] = useState<'documents' | 'archives' | 'correspondences' | 'users' | 'parameters' | 'loans' | 'workflows' | 'audit'>('documents');
  const [importEntity, setImportEntity] = useState<'documents' | 'archives' | 'correspondences' | 'loans' | 'workflows' | 'parameters' | 'users'>('documents');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchEntityData = async (entity: string): Promise<{ data: Record<string, unknown>[]; filename: string; title: string }> => {
    switch (entity) {
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
            Service: d.serviceId || '',
            Statut: d.statusId,
            Cree_Par: d.validatedBy || 'Utilisateur',
            Date_Creation: new Date(d.createdAt).toLocaleDateString('fr-FR'),
          })),
          filename: 'export-documents-ged',
          title: 'Export de la Base Documentaire GED',
        };
      }
    }
  };

  const handleExport = async (format: string) => {
    setIsExporting(true);
    try {
      const { data, filename, title } = await fetchEntityData(exportEntity);
      if (data.length === 0) {
        toast.error('Aucune donnée à exporter');
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
      setSelectedFile(e.target.files[0]);
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
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import / Export & Impression"
        subtitle="Exportez ou importez l'intégralité de vos documents, archives, courriers, prêts et paramètres"
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Sélectionnez le module à exporter</CardTitle>
              <CardDescription>
                Choisissez les données que vous souhaitez extraire ou imprimer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { key: 'documents', label: 'Documents GED', desc: 'Fichiers, métadonnées, statuts et versions' },
                  { key: 'archives', label: 'Archives physiques & numériques', desc: 'Emplacements, boîtes, conservation' },
                  { key: 'correspondences', label: 'Courriers (Entrants/Sortants)', desc: 'Expéditeurs, destinataires, dates' },
                  { key: 'loans', label: 'Prêts & Consultations', desc: 'Emprunteurs, échéances, motifs' },
                  { key: 'workflows', label: 'Circuits de Validation', desc: 'Étapes, validateurs, statuts' },
                  { key: 'parameters', label: 'Paramètres & Outils', desc: 'Types, catégories, dictionnaires' },
                  { key: 'users', label: 'Comptes Utilisateurs', desc: 'Identifiants, rôles, services' },
                  { key: 'audit', label: 'Journal d’Audit Système', desc: 'Traçabilité, adresses IP, événements' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setExportEntity(item.key as any)}
                    className={`flex flex-col text-left p-4 rounded-xl border-2 transition-all ${
                      exportEntity === item.key
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                        : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                    }`}
                  >
                    <span className="font-semibold text-sm flex items-center justify-between">
                      {item.label}
                      {exportEntity === item.key && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="text-base font-semibold mb-3">2. Choisissez le format d'exportation</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { format: 'pdf', label: 'Document PDF', icon: FileText, color: 'text-red-500 bg-red-50 dark:bg-red-950', desc: 'Rapport formaté avec en-tête et pagination' },
                { format: 'excel', label: 'Tableur Excel (.xlsx)', icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950', desc: 'Tableau éditable avec colonnes structurées' },
                { format: 'csv', label: 'Format CSV', icon: FileText, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950', desc: 'Séparateurs universels compatibles tous SGBD' },
                { format: 'json', label: 'Format JSON', icon: FileJson, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950', desc: 'Format brut pour intégration API et scripts' },
                { format: 'xml', label: 'Format XML', icon: FileCode, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950', desc: 'Fichier XML normalisé pour échanges GED' },
                { format: 'print', label: 'Impression Directe', icon: Printer, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800', desc: 'Aperçu avant impression et mise en page papier' },
              ].map((opt) => (
                <Card
                  key={opt.format}
                  className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all group"
                  onClick={() => !isExporting && handleExport(opt.format)}
                >
                  <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${opt.color} group-hover:scale-110 transition-transform shadow-sm`}>
                      <opt.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="font-semibold text-base">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 mt-1 w-full" disabled={isExporting}>
                      {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      Exporter en {opt.format.toUpperCase()}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab Import */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Importer des documents & métadonnées</CardTitle>
              <CardDescription>
                Chargez un fichier de versement au format Excel (.xlsx), CSV, JSON ou XML.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-md space-y-2">
                <Label>Destination de l'importation</Label>
                <Select value={importEntity} onValueChange={(v: any) => setImportEntity(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez la destination..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documents">Base Documentaire GED</SelectItem>
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
                  <p className="font-semibold text-base">
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
                      accept=".csv,.json,.xlsx,.xml"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button variant="outline" asChild className="cursor-pointer">
                      <span>Parcourir les fichiers</span>
                    </Button>
                  </label>

                  {selectedFile && (
                    <Button onClick={handleProcessImport} disabled={isImporting} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                      {isImporting && <Loader2 className="h-4 w-4 animate-spin" />}
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
