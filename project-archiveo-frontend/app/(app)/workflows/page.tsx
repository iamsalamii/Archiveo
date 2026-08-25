'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchWorkflows,
  deleteWorkflow,
  WorkflowApi,
  WorkflowStepApi,
} from '@/services/workflows-api';
import { fetchDocuments, updateDocument, DocumentApi } from '@/services/documents-api';
import { useAuth } from '@/contexts/auth-context';
import { useParameters } from '@/contexts/parameters-context';
import {
  WorkflowFormDialog,
  WorkflowTemplate,
  DEFAULT_WORKFLOW_TEMPLATES,
} from '@/components/workflows/workflow-form-dialog';
import { WorkflowProcessDialog } from '@/components/workflows/workflow-process-dialog';
import {
  Workflow as WorkflowIcon,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Trash2,
  Check,
  X,
  FileText,
  Layers,
  Sparkles,
  Pencil,
  ArrowRight,
  Bell,
  CheckSquare,
  Square,
  Filter,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export default function WorkflowsPage() {
  const { user } = useAuth();
  const { getItems, getItemName } = useParameters();

  const [workflows, setWorkflows] = useState<WorkflowApi[]>([]);
  const [documents, setDocuments] = useState<DocumentApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTemplateForLaunch, setSelectedTemplateForLaunch] = useState<WorkflowTemplate | null>(null);

  // Type-based bulk validation state
  const [selectedDocType, setSelectedDocType] = useState<string>('all');
  const [selectedBulkDocIds, setSelectedBulkDocIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(DEFAULT_WORKFLOW_TEMPLATES);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [tplForm, setTplForm] = useState<Partial<WorkflowTemplate>>({});

  // Process dialog state
  const [processOpen, setProcessOpen] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowApi | null>(null);
  const [activeStep, setActiveStep] = useState<WorkflowStepApi | null>(null);
  const [processAction, setProcessAction] = useState<'approved' | 'rejected'>('approved');

  // Load templates from storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('archiveo_workflow_templates');
      if (saved) {
        try {
          setTemplates(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const saveTemplates = (newTemplates: WorkflowTemplate[]) => {
    setTemplates(newTemplates);
    if (typeof window !== 'undefined') {
      localStorage.setItem('archiveo_workflow_templates', JSON.stringify(newTemplates));
    }
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [wfData, docData] = await Promise.all([
        fetchWorkflows(),
        fetchDocuments(),
      ]);
      setWorkflows(wfData);
      setDocuments(docData);
    } catch {
      if (!silent) toast.error('Impossible de charger les workflows et documents');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Documents en attente de validation
  const pendingDocuments = useMemo(() => {
    return documents.filter((d) => !d.validated || d.statusId?.toLowerCase() === 'en_revision' || d.statusId?.toLowerCase() === 'brouillon');
  }, [documents]);

  const filteredPendingDocuments = useMemo(() => {
    if (selectedDocType === 'all') return pendingDocuments;
    return pendingDocuments.filter((d) => d.typeId === selectedDocType || getItemName('DOC_TYPE', d.typeId) === selectedDocType);
  }, [pendingDocuments, selectedDocType, getItemName]);

  // Approbations en attente spécifiquement pour le rôle de l'utilisateur
  const myPendingApprovalsCount = useMemo(() => {
    let count = 0;
    const userRole = user?.roles?.[0] || 'User';

    // Workflows actifs où l'étape courante correspond au rôle
    workflows.forEach((wf) => {
      if (wf.status === 'in_progress') {
        const current = wf.steps?.find((s) => s.order === wf.currentStep);
        if (current && (current.validatorRole === userRole || userRole === 'Admin')) {
          count++;
        }
      }
    });

    return count;
  }, [workflows, user]);

  const handleOpenProcess = (wf: WorkflowApi, step: WorkflowStepApi, action: 'approved' | 'rejected') => {
    setActiveWorkflow(wf);
    setActiveStep(step);
    setProcessAction(action);
    setProcessOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce circuit de validation ?')) return;
    try {
      await deleteWorkflow(id);
      toast.success('Circuit supprimé');
      load(true);
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Bulk validation handler
  const handleToggleSelectDoc = (id: string) => {
    setSelectedBulkDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllDocs = () => {
    if (selectedBulkDocIds.size === filteredPendingDocuments.length) {
      setSelectedBulkDocIds(new Set());
    } else {
      setSelectedBulkDocIds(new Set(filteredPendingDocuments.map((d) => d.id)));
    }
  };

  const handleBulkValidate = async (approved: boolean) => {
    if (selectedBulkDocIds.size === 0) {
      toast.error('Veuillez sélectionner au moins un document à valider.');
      return;
    }

    setBulkProcessing(true);
    const approverName = user ? `${user.firstName} ${user.lastName}` : 'Direction / Approbateur';
    const targetIds = Array.from(selectedBulkDocIds);

    // Optimistic UI update
    setDocuments((prev) =>
      prev.map((d) => {
        if (targetIds.includes(d.id)) {
          return {
            ...d,
            validated: approved,
            validatedBy: approved ? approverName : undefined,
            validatedAt: approved ? new Date().toISOString() : undefined,
            statusId: approved ? 'VALIDE' : 'REJETE',
          };
        }
        return d;
      })
    );

    setSelectedBulkDocIds(new Set());
    toast.success(
      approved
        ? `Validation réussie : ${targetIds.length} document(s) validé(s) au titre de votre niveau d'approbation.`
        : `Rejet enregistré pour ${targetIds.length} document(s).`
    );

    try {
      await Promise.all(
        targetIds.map((id) =>
          updateDocument(id, {
            statusId: approved ? 'VALIDE' : 'REJETE',
          })
        )
      );
      load(true);
    } catch {
      // ignore
    } finally {
      setBulkProcessing(false);
    }
  };

  // Template Management handlers
  const handleOpenNewTemplate = () => {
    setEditingTemplate(null);
    setTplForm({
      name: '',
      description: '',
      steps: [
        { name: 'Contrôle & Visa Hiérarchique', validatorRole: 'RecordsManager' },
        { name: 'Approbation Finale Direction', validatorRole: 'Admin' },
      ],
    });
    setTemplateDialogOpen(true);
  };

  const handleOpenEditTemplate = (tpl: WorkflowTemplate) => {
    setEditingTemplate(tpl);
    setTplForm({
      ...tpl,
      steps: tpl.steps.map((s) => ({ ...s })),
    });
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!tplForm.name?.trim()) {
      toast.error('Le nom du modèle est obligatoire');
      return;
    }
    if (!tplForm.steps || tplForm.steps.length === 0) {
      toast.error('Le modèle doit comporter au moins une étape');
      return;
    }

    const tplData: WorkflowTemplate = {
      id: editingTemplate ? editingTemplate.id : `tpl_${Date.now()}`,
      name: tplForm.name.trim(),
      description: tplForm.description?.trim() || '',
      targetScope: tplForm.targetScope || 'documents',
      steps: tplForm.steps.map((s, idx) => ({
        name: s.name.trim() || `Étape ${idx + 1}`,
        validatorRole: s.validatorRole || 'User',
      })),
    };

    if (editingTemplate) {
      const updated = templates.map((t) => (t.id === editingTemplate.id ? tplData : t));
      saveTemplates(updated);
      toast.success(`Modèle « ${tplData.name} » mis à jour`);
    } else {
      saveTemplates([...templates, tplData]);
      toast.success(`Modèle « ${tplData.name} » créé avec succès`);
    }
    setTemplateDialogOpen(false);
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (templates.length <= 1) {
      toast.error('Vous devez conserver au moins un modèle de circuit.');
      return;
    }
    if (!confirm(`Supprimer le modèle « ${name} » ?`)) return;
    saveTemplates(templates.filter((t) => t.id !== id));
    toast.success('Modèle de circuit supprimé');
  };

  const exportData = useMemo(() => {
    return workflows.map((wf) => ({
      Workflow: wf.name,
      Document: wf.documentTitle || '—',
      Statut: wf.status === 'completed' ? 'Validé' : wf.status === 'rejected' ? 'Rejeté' : 'En cours',
      'Nombre d’étapes': wf.steps?.length || 0,
      'Étape actuelle': wf.currentStep,
      'Date de création': wf.createdAt ? new Date(wf.createdAt).toLocaleDateString('fr-FR') : '—',
    }));
  }, [workflows]);

  const docTypes = getItems('DOC_TYPE');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Circuits de Validation (Workflows)"
        subtitle="Pilotez les circuits de validation séquentiels, la validation en masse par type de document et vos modèles types"
        icon={<WorkflowIcon className="h-6 w-6" />}
        exportData={exportData}
        exportFilename="workflows-circuits-validation"
        exportTitle="Circuits de Validation & Workflows"
      />

      {/* Notification Rôle / Visas en attente */}
      {myPendingApprovalsCount > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 font-bold">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Visas en attente sur votre profil ({user?.roles?.[0] || 'Utilisateur'})</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Vous avez <strong>{myPendingApprovalsCount} étape(s) de circuit</strong> en attente immédiate de votre validation formelle.
              </p>
            </div>
          </div>
          <Badge className="bg-amber-600 text-white text-xs px-2.5 py-1">
            Action requise
          </Badge>
        </div>
      )}

      <Tabs defaultValue="type-validation" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="type-validation" className="gap-2 text-xs font-semibold">
              <Layers className="h-3.5 w-3.5" /> Validation par Type ({pendingDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2 text-xs">
              <Clock className="h-3.5 w-3.5" /> Circuits Individuels ({workflows.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Modèles Types ({templates.length})
            </TabsTrigger>
          </TabsList>

          <Button
            size="sm"
            onClick={() => {
              setSelectedTemplateForLaunch(null);
              setCreateOpen(true);
            }}
            className="gap-2 text-xs self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Lancer un Circuit Dédié
          </Button>
        </div>

        {/* TAB 1 : VALIDATION PAR TYPE DE DOCUMENT (NOUVELLE ANALYSE SOLIDE) */}
        <TabsContent value="type-validation" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-card pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Validation Groupée par Type Documentaire
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Le circuit s'applique automatiquement à tous les documents d'un même type. Sélectionnez 1 ou plusieurs documents et validez en 1 clic.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                    <SelectTrigger className="w-[200px] text-xs h-8">
                      <Filter className="h-3 w-3 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types ({pendingDocuments.length})</SelectItem>
                      {docTypes.map((t) => (
                        <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedBulkDocIds.size > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleBulkValidate(true)}
                        disabled={bulkProcessing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-8"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Valider la sélection ({selectedBulkDocIds.size})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkValidate(false)}
                        disabled={bulkProcessing}
                        className="text-destructive hover:bg-destructive/10 gap-1.5 text-xs h-8"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Rejeter
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full">
                  <thead className="bg-muted/60">
                    <tr className="border-b">
                      <th className="w-10 px-3 py-2.5 text-left">
                        <button
                          type="button"
                          onClick={handleToggleSelectAllDocs}
                          className="flex items-center justify-center text-muted-foreground hover:text-foreground"
                          title="Tout sélectionner / désélectionner"
                        >
                          {selectedBulkDocIds.size === filteredPendingDocuments.length && filteredPendingDocuments.length > 0 ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">Document & Réf</th>
                      <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">Type Documentaire</th>
                      <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">Service</th>
                      <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">Auteur</th>
                      <th className="px-3.5 py-2.5 text-left text-xs font-bold text-muted-foreground">Date de dépôt</th>
                      <th className="px-3.5 py-2.5 text-right text-xs font-bold text-muted-foreground">Action Rapide</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingDocuments.length > 0 ? (
                      filteredPendingDocuments.map((doc) => {
                        const isSelected = selectedBulkDocIds.has(doc.id);
                        return (
                          <tr key={doc.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                            <td className="w-10 px-3 py-3" onClick={() => handleToggleSelectDoc(doc.id)}>
                              <button type="button" className="flex items-center justify-center">
                                {isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground/60" />
                                )}
                              </button>
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                                <div>
                                  <p className="font-medium text-xs text-foreground truncate max-w-xs">{doc.title}</p>
                                  <code className="font-mono text-[10px] text-muted-foreground">{doc.reference}</code>
                                </div>
                              </div>
                            </td>
                            <td className="px-3.5 py-3">
                              <Badge variant="outline" className="text-xs bg-muted/40">
                                {getItemName('DOC_TYPE', doc.typeId) || 'Document'}
                              </Badge>
                            </td>
                            <td className="px-3.5 py-3 text-xs text-muted-foreground">
                              {getItemName('SERVICE', doc.serviceId) || 'Direction'}
                            </td>
                            <td className="px-3.5 py-3 text-xs text-foreground font-medium">
                              {doc.createdByName || 'Collaborateur'}
                            </td>
                            <td className="px-3.5 py-3 text-xs text-muted-foreground font-mono">
                              {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR') : '—'}
                            </td>
                            <td className="px-3.5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBulkDocIds(new Set([doc.id]));
                                    handleBulkValidate(true);
                                  }}
                                  className="h-7 text-xs text-emerald-600 hover:bg-emerald-500/10 gap-1"
                                >
                                  <Check className="h-3 w-3" /> Valider
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500/50 mb-2" />
                          <p className="text-sm font-medium text-foreground">Tous les documents sont validés et conformes !</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Aucun document en attente de visa pour le filtre sélectionné.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CIRCUITS INDIVIDUELS EN COURS */}
        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Chargement des circuits...</div>
          ) : workflows.length === 0 ? (
            <Card className="p-12 text-center shadow-sm">
              <WorkflowIcon className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-base font-bold">Aucun circuit actif pour le moment</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Démarrez une validation en 1 clic à partir de vos modèles types de circuits.
              </p>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 text-xs">
                <Plus className="h-4 w-4" /> Lancer un circuit maintenant
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {workflows.map((wf) => {
                const totalSteps = wf.steps?.length || 0;
                const currentStepObj = wf.steps?.find((s) => s.order === wf.currentStep);
                const isCompleted = wf.status === 'completed';
                const isRejected = wf.status === 'rejected';

                return (
                  <Card key={wf.id} className="shadow-sm overflow-hidden flex flex-col justify-between">
                    <CardHeader className="border-b bg-muted/20 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <span>{wf.name}</span>
                            {isCompleted && (
                              <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Validé
                              </Badge>
                            )}
                            {isRejected && (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <XCircle className="h-3 w-3" /> Rejeté
                              </Badge>
                            )}
                            {!isCompleted && !isRejected && (
                              <Badge variant="outline" className="text-blue-600 dark:text-blue-400 text-[10px] gap-1">
                                <Clock className="h-3 w-3" /> En cours ({wf.currentStep}/{totalSteps})
                              </Badge>
                            )}
                          </CardTitle>
                          {wf.documentTitle && (
                            <CardDescription className="text-xs flex items-center gap-1.5 mt-1 font-medium text-foreground">
                              <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="truncate">{wf.documentTitle}</span>
                            </CardDescription>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(wf.id)}
                          title="Supprimer ce workflow"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4 text-xs">
                      {/* Fil d'étapes visuel */}
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Circuit d'approbation séquentiel :
                        </p>
                        <div className="space-y-1.5">
                          {wf.steps?.map((step) => {
                            const isCurrent = wf.status === 'in_progress' && wf.currentStep === step.order;
                            const isStepPassed = step.status === 'approved';
                            const isStepFailed = step.status === 'rejected';

                            return (
                              <div
                                key={step.id}
                                className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                  isCurrent
                                    ? 'border-primary bg-primary/5 font-semibold'
                                    : isStepPassed
                                    ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                                    : isStepFailed
                                    ? 'border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300'
                                    : 'border-muted bg-muted/20 text-muted-foreground'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                      isStepPassed
                                        ? 'bg-emerald-600 text-white'
                                        : isStepFailed
                                        ? 'bg-rose-600 text-white'
                                        : isCurrent
                                        ? 'bg-primary text-white'
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {step.order}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-xs">{step.name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      Rôle : <strong>{step.validatorRole || 'User'}</strong>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {isStepPassed && (
                                    <Badge className="bg-emerald-600 text-white text-[10px]">Approuvé</Badge>
                                  )}
                                  {isStepFailed && (
                                    <Badge variant="destructive" className="text-[10px]">Rejeté</Badge>
                                  )}
                                  {isCurrent && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        size="sm"
                                        className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                        onClick={() => handleOpenProcess(wf, step, 'approved')}
                                      >
                                        <Check className="h-3 w-3" /> Valider
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10 gap-1"
                                        onClick={() => handleOpenProcess(wf, step, 'rejected')}
                                      >
                                        <X className="h-3 w-3" /> Rejeter
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: MODÈLES & CIRCUITS TYPES */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Bibliothèque des Modèles de Validation</h3>
              <p className="text-xs text-muted-foreground">
                Gérez vos circuits types réutilisables en 1 clic pour toutes les équipes.
              </p>
            </div>
            <Button size="sm" onClick={handleOpenNewTemplate} className="gap-2 text-xs">
              <Plus className="h-4 w-4" /> Nouveau Modèle Type
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((tpl) => (
              <Card key={tpl.id} className="shadow-sm flex flex-col justify-between border-slate-200 dark:border-slate-800">
                <CardHeader className="border-b bg-card pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>{tpl.name}</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {tpl.description || 'Modèle standard d’approbation des documents.'}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEditTemplate(tpl)}
                        title="Modifier le modèle"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                        title="Supprimer le modèle"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4 text-xs">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Étapes prédéfinies ({tpl.steps.length}) :
                    </p>
                    <div className="space-y-1.5">
                      {tpl.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg border bg-muted/20"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {idx + 1}
                            </span>
                            <span className="font-medium truncate">{st.name}</span>
                          </div>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {st.validatorRole}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => {
                      setSelectedTemplateForLaunch(tpl);
                      setCreateOpen(true);
                    }}
                  >
                    Appliquer ce modèle et lancer un circuit <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Lancer un Workflow */}
      <WorkflowFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialTemplate={selectedTemplateForLaunch}
        onSaved={() => {
          load(true);
        }}
      />

      {/* Dialog Validation / Rejet d'une étape */}
      {activeWorkflow && activeStep && (
        <WorkflowProcessDialog
          open={processOpen}
          onOpenChange={setProcessOpen}
          workflow={activeWorkflow}
          step={activeStep}
          action={processAction}
          onProcessed={() => {
            load(true);
          }}
        />
      )}

      {/* Dialog Création / Édition de Modèle Type */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {editingTemplate ? 'Modifier le Modèle de Circuit' : 'Nouveau Modèle Type Réutilisable'}
            </DialogTitle>
            <DialogDescription>
              Définissez les étapes types que les documents ou archives suivront une fois pour toutes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label>Nom du modèle *</Label>
              <Input
                value={tplForm.name || ''}
                onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })}
                placeholder="Ex: Circuit Approbation Contrats Cadres"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description / Usage</Label>
              <Input
                value={tplForm.description || ''}
                onChange={(e) => setTplForm({ ...tplForm, description: e.target.value })}
                placeholder="Ex: Circuit pour les contrats fournisseurs"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="font-bold">Étapes types ({tplForm.steps?.length || 0})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTplForm({
                      ...tplForm,
                      steps: [
                        ...(tplForm.steps || []),
                        { name: `Étape ${(tplForm.steps?.length || 0) + 1}`, validatorRole: 'User' },
                      ],
                    })
                  }
                  className="gap-1 text-[11px] h-7"
                >
                  <Plus className="h-3 w-3" /> Ajouter une étape
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(tplForm.steps || []).map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <Input
                      className="flex-1 text-xs h-8"
                      value={step.name}
                      onChange={(e) => {
                        const nextSteps = [...(tplForm.steps || [])];
                        nextSteps[idx].name = e.target.value;
                        setTplForm({ ...tplForm, steps: nextSteps });
                      }}
                      placeholder="Nom de l'étape"
                    />
                    <Select
                      value={step.validatorRole}
                      onValueChange={(v) => {
                        const nextSteps = [...(tplForm.steps || [])];
                        nextSteps[idx].validatorRole = v;
                        setTplForm({ ...tplForm, steps: nextSteps });
                      }}
                    >
                      <SelectTrigger className="w-[150px] text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Administrateur</SelectItem>
                        <SelectItem value="RecordsManager">Records Manager</SelectItem>
                        <SelectItem value="User">Utilisateur</SelectItem>
                        <SelectItem value="Direction">Direction</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => {
                        const nextSteps = (tplForm.steps || []).filter((_, i) => i !== idx);
                        setTplForm({ ...tplForm, steps: nextSteps });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveTemplate}>Enregistrer le Modèle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
